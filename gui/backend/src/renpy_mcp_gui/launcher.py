"""RPBuilder Launcher — terminal-only.

Walks a novice through picking the Ren'Py SDK and a project, then hands
off to the existing `renpy-mcp-gui` server. Narrates what it's doing so
nothing happens off-screen.

Flow:

  1. Load remembered choices from `~/.config/renpy-mcp/launcher.json`
     (or `%APPDATA%/renpy-mcp/launcher.json` on Windows). If the saved
     SDK still validates, use it without asking.

  2. If no saved SDK (or it's gone), scan obvious filesystem paths for
     a Ren'Py SDK directory. Found → ask which to use; not found → offer
     to download from renpy.org or paste a path.

  3. Project: pick a recent one, browse, or create a new empty folder.
     The selection is saved before launch so the next run is one prompt.

The launcher is intentionally a single Python file with stdlib-only
deps so it works in a freshly-cloned repo without a separate install.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

CONFIG_VERSION = 1
RECENT_LIMIT = 10
RENPY_LATEST_URL = "https://www.renpy.org/latest.html"
RENPY_DL_TEMPLATE = "https://www.renpy.org/dl/{version}/renpy-{version}-sdk.{ext}"


# ---------- config persistence ------------------------------------------------


def config_dir() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming")))
        return base / "renpy-mcp"
    base = Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config")))
    return base / "renpy-mcp"


def config_path() -> Path:
    return config_dir() / "launcher.json"


@dataclass
class LauncherConfig:
    sdk_path: str | None = None
    recent_projects: list[str] = field(default_factory=list)
    version: int = CONFIG_VERSION

    @classmethod
    def load(cls) -> "LauncherConfig":
        p = config_path()
        if not p.is_file():
            return cls()
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return cls()
        return cls(
            sdk_path=data.get("sdk_path") or None,
            recent_projects=[str(x) for x in (data.get("recent_projects") or []) if x],
            version=int(data.get("version", CONFIG_VERSION)),
        )

    def save(self) -> None:
        p = config_path()
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "sdk_path": self.sdk_path,
            "recent_projects": self.recent_projects,
            "version": CONFIG_VERSION,
        }
        p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    def remember_project(self, path: str) -> None:
        path = str(Path(path).resolve())
        self.recent_projects = [path] + [p for p in self.recent_projects if p != path]
        del self.recent_projects[RECENT_LIMIT:]


# ---------- platform helpers --------------------------------------------------


def sdk_launcher_filename() -> str:
    return "renpy.exe" if sys.platform == "win32" else "renpy.sh"


def validate_sdk(path: str | None) -> bool:
    if not path:
        return False
    p = Path(path).expanduser()
    return p.is_dir() and (p / sdk_launcher_filename()).is_file()


def validate_project(path: str | None) -> bool:
    if not path:
        return False
    p = Path(path).expanduser()
    return p.is_dir() and (p / "game").is_dir()


def scaffold_empty_project(path: Path) -> None:
    """Minimum the editor needs to bind. Idempotent."""
    (path / "game").mkdir(parents=True, exist_ok=True)
    script = path / "game" / "script.rpy"
    if not script.is_file():
        script.write_text(
            "# Empty starter — call the `new_project` MCP tool from\n"
            "# inside the editor to populate this with the SDK template.\n"
            "label start:\n"
            "    \"Welcome to your new project.\"\n"
            "    return\n",
            encoding="utf-8",
        )


# ---------- SDK auto-detection ------------------------------------------------


_SDK_DIR_RE = re.compile(r"^renpy[-_]?(\d+\.\d+(?:\.\d+)?)?[-_]?sdk", re.IGNORECASE)


def _likely_sdk_parents() -> list[Path]:
    """Folders we expect users to drop a Ren'Py SDK into."""
    home = Path.home()
    parents: list[Path] = [
        home,
        home / "Downloads",
        home / "Desktop",
        home / "Documents",
        home / "renpy",
        home / "Apps",
    ]
    if sys.platform == "win32":
        for env in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
            v = os.environ.get(env)
            if v:
                parents.append(Path(v))
    elif sys.platform == "darwin":
        parents += [Path("/Applications"), home / "Applications"]
    else:  # linux / *bsd
        parents += [
            Path("/opt"),
            Path("/usr/local"),
            home / ".local" / "share",
            home / ".local" / "share" / "renpy",
        ]
    seen: set[Path] = set()
    out: list[Path] = []
    for p in parents:
        try:
            resolved = p.resolve()
        except OSError:
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_dir():
            out.append(resolved)
    return out


def _parse_version_for_sort(name: str) -> tuple[int, int, int]:
    """Sort key — newer versions float up. Unversioned dirs sort low."""
    m = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", name)
    if not m:
        return (0, 0, 0)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3) or 0))


def discover_sdks() -> list[Path]:
    """Return every Ren'Py SDK directory we can find, newest-versioned first."""
    found: list[Path] = []
    seen_paths: set[Path] = set()
    for parent in _likely_sdk_parents():
        try:
            children = list(parent.iterdir())
        except OSError:
            continue
        for child in children:
            try:
                if not child.is_dir():
                    continue
            except OSError:
                continue
            if not _SDK_DIR_RE.match(child.name):
                continue
            launcher = child / sdk_launcher_filename()
            if not launcher.is_file():
                continue
            try:
                resolved = child.resolve()
            except OSError:
                continue
            if resolved in seen_paths:
                continue
            seen_paths.add(resolved)
            found.append(resolved)
    found.sort(key=lambda p: _parse_version_for_sort(p.name), reverse=True)
    return found


# ---------- SDK download ------------------------------------------------------


def fetch_latest_sdk_version(*, timeout: float = 10.0) -> str:
    """Scrape the latest SDK version off https://www.renpy.org/latest.html."""
    req = urllib.request.Request(
        RENPY_LATEST_URL,
        headers={"User-Agent": "renpy-mcp-launcher/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    m = re.search(r"renpy[-_](\d+\.\d+\.\d+)[-_]sdk", body)
    if not m:
        raise RuntimeError(
            "could not find a Ren'Py SDK version on renpy.org/latest.html — "
            "try pasting your own path instead"
        )
    return m.group(1)


def sdk_download_url(version: str) -> str:
    ext = "zip" if sys.platform == "win32" else "tar.bz2"
    return RENPY_DL_TEMPLATE.format(version=version, ext=ext)


def download_with_progress(url: str, dest: Path, *, label: str) -> None:
    """Stream `url` to `dest`, printing a single-line progress meter."""
    req = urllib.request.Request(url, headers={"User-Agent": "renpy-mcp-launcher/1.0"})
    started = time.monotonic()
    with urllib.request.urlopen(req, timeout=30) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        chunk = 64 * 1024
        done = 0
        with dest.open("wb") as f:
            while True:
                buf = resp.read(chunk)
                if not buf:
                    break
                f.write(buf)
                done += len(buf)
                _print_progress(label, done, total, started)
    sys.stdout.write("\n")
    sys.stdout.flush()


def _print_progress(label: str, done: int, total: int, started: float) -> None:
    mb = done / 1_000_000
    total_mb = total / 1_000_000 if total else 0
    elapsed = max(0.001, time.monotonic() - started)
    rate = mb / elapsed
    if total:
        pct = 100 * done / total
        bar_w = 24
        filled = int(bar_w * done / total)
        bar = "█" * filled + "·" * (bar_w - filled)
        sys.stdout.write(
            f"\r  {label} [{bar}] {pct:5.1f}%  {mb:6.1f}/{total_mb:.1f} MB  {rate:.1f} MB/s   "
        )
    else:
        sys.stdout.write(f"\r  {label} {mb:6.1f} MB  {rate:.1f} MB/s   ")
    sys.stdout.flush()


def extract_sdk_archive(archive: Path, into: Path) -> Path:
    """Extract archive into `into/`, return the SDK root directory inside it."""
    into.mkdir(parents=True, exist_ok=True)
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as z:
            z.extractall(into)
    else:
        # tarfile auto-detects bz2/gzip from the file's extension or magic.
        with tarfile.open(archive) as t:
            # Python 3.12+ supports `filter=` for safe extraction. Older
            # interpreters would have warned.
            try:
                t.extractall(into, filter="data")
            except TypeError:
                t.extractall(into)
    # The archive contains a single directory like `renpy-8.4.2-sdk`.
    candidates = [
        d for d in into.iterdir()
        if d.is_dir() and (d / sdk_launcher_filename()).is_file()
    ]
    if not candidates:
        raise RuntimeError(
            f"extracted archive {archive.name} did not contain a Ren'Py SDK "
            f"(no {sdk_launcher_filename()} found)"
        )
    candidates.sort(key=lambda p: _parse_version_for_sort(p.name), reverse=True)
    return candidates[0]


def download_sdk_interactively(*, default_target: Path | None = None) -> str | None:
    """Talk the user through fetching + extracting the latest Ren'Py SDK.

    Returns the path to the extracted SDK on success, or None if the
    user declined or the operation failed. Errors are surfaced to
    stdout — the caller decides whether to retry or fall back.
    """
    print()
    print("Looking up the latest Ren'Py release…")
    try:
        version = fetch_latest_sdk_version()
    except (urllib.error.URLError, RuntimeError, OSError) as exc:
        print(f"  ✗ couldn't reach renpy.org ({exc})")
        return None

    url = sdk_download_url(version)
    print(f"  ✓ latest is {version}")
    print(f"  download URL: {url}")

    if default_target is None:
        default_target = Path.home() / "renpy-sdk"
    while True:
        answer = input(
            f"\nInstall into [{default_target}]? "
            "(press Enter to accept, type a different path, or 'q' to cancel): "
        ).strip()
        if answer.lower() in ("q", "quit", "cancel"):
            return None
        if not answer:
            target = default_target
        else:
            target = Path(answer).expanduser().resolve()
        if target.is_dir() and any(target.iterdir()):
            ow = input(
                f"  ⚠  {target} already exists and isn't empty. "
                "Use a different folder? (Y/n): "
            ).strip().lower()
            if ow in ("", "y", "yes"):
                continue
        break

    target.mkdir(parents=True, exist_ok=True)

    archive_name = url.rsplit("/", 1)[-1]
    with tempfile.TemporaryDirectory(prefix="renpy_dl_") as tmp:
        archive = Path(tmp) / archive_name
        try:
            download_with_progress(url, archive, label=f"downloading {archive_name}")
        except (urllib.error.URLError, OSError) as exc:
            print(f"\n  ✗ download failed: {exc}")
            return None

        print(f"  extracting {archive_name}…")
        try:
            sdk_root = extract_sdk_archive(archive, target)
        except (tarfile.TarError, zipfile.BadZipFile, RuntimeError, OSError) as exc:
            print(f"  ✗ extraction failed: {exc}")
            return None

    print(f"  ✓ SDK installed at {sdk_root}")
    return str(sdk_root)


# ---------- handoff to the GUI server ----------------------------------------


def find_frontend_dist() -> Path | None:
    """Locate the built editor frontend, if any.

    The built SPA lives at `gui/frontend/dist/` in a repo checkout. We
    walk up from this module's path because the launcher ships inside
    the same repo. When no `dist/index.html` exists the editor server
    runs API-only and any browser visit returns JSON instead of the
    editor — which is what the original "I see JSON" bug looked like.
    """
    # launcher.py path: gui/backend/src/renpy_mcp_gui/launcher.py
    # parents[3]                                      ↑   ↑   ↑
    #                                              gui/
    candidate = Path(__file__).resolve().parents[3] / "frontend" / "dist"
    if (candidate / "index.html").is_file():
        return candidate
    return None


def spawn_gui(sdk: str, project: str) -> int:
    """Replace the launcher process with the GUI server."""
    args = ["--project", project, "--sdk", sdk]
    dist = find_frontend_dist()
    if dist is not None:
        args.extend(["--static-dir", str(dist)])
    else:
        # Without --static-dir the FastAPI app only serves /api/* and
        # /ws — the browser sees raw JSON. Tell the user how to fix
        # it; we still spawn the server so they can verify their MCP
        # tooling works, but the editor UI won't render until they
        # build the frontend.
        print(
            "\n  ⚠  no built frontend found at gui/frontend/dist —",
            file=sys.stderr,
        )
        print(
            "     the server will run but the browser will see JSON, not the editor.",
            file=sys.stderr,
        )
        print(
            "     fix: cd gui/frontend && npm install && npm run build",
            file=sys.stderr,
        )

    candidates = [
        ["renpy-mcp-gui", *args],
        [sys.executable, "-m", "renpy_mcp_gui", *args],
    ]
    last_err: Exception | None = None
    for cmd in candidates:
        try:
            os.execvp(cmd[0], cmd)
        except FileNotFoundError as exc:
            last_err = exc
            continue
    print(f"\n  ✗ failed to launch the GUI server: {last_err}", file=sys.stderr)
    return 2


# ---------- terminal flow -----------------------------------------------------


def _bullet(ok: bool) -> str:
    return "✓" if ok else "✗"


def _section(title: str) -> None:
    print()
    print(title)
    print("─" * len(title))


def _resolve_sdk_with_user(cfg: LauncherConfig) -> str:
    """Drive the user through getting a valid SDK path. Mutates cfg.sdk_path."""
    if validate_sdk(cfg.sdk_path):
        print(f"  {_bullet(True)} using saved SDK at {cfg.sdk_path}")
        return cfg.sdk_path  # type: ignore[return-value]

    if cfg.sdk_path:
        print(f"  {_bullet(False)} saved SDK at {cfg.sdk_path} no longer valid; "
              "looking for another…")

    print("  scanning common folders for a Ren'Py SDK…")
    found = discover_sdks()
    if found:
        print(f"  {_bullet(True)} found {len(found)} SDK(s) on disk:")
        for i, p in enumerate(found, start=1):
            print(f"    {i}. {p}")

    while True:
        if found:
            choices = (
                "Choose an SDK number, or "
                "(d)ownload latest from renpy.org, "
                "(p)aste a path, "
                "(q)uit"
            )
        else:
            print("  (none found in the obvious places)")
            choices = (
                "(d)ownload latest from renpy.org, "
                "(p)aste a path, "
                "(q)uit"
            )
        ans = input(f"  {choices}: ").strip()
        if not ans:
            continue
        if ans.lower() in ("q", "quit"):
            print("  cancelled.")
            sys.exit(0)
        if found and ans.isdigit():
            idx = int(ans)
            if 1 <= idx <= len(found):
                cfg.sdk_path = str(found[idx - 1])
                return cfg.sdk_path
            print(f"  {_bullet(False)} out of range")
            continue
        if ans.lower() in ("d", "download"):
            sdk_path = download_sdk_interactively()
            if sdk_path:
                cfg.sdk_path = sdk_path
                return cfg.sdk_path
            print("  (download did not complete — pick another option)")
            continue
        if ans.lower() in ("p", "paste"):
            entry = input("    paste the SDK path: ").strip()
            if not entry:
                continue
            resolved = str(Path(entry).expanduser().resolve())
            if validate_sdk(resolved):
                cfg.sdk_path = resolved
                print(f"  {_bullet(True)} {resolved}")
                return cfg.sdk_path
            print(
                f"  {_bullet(False)} no {sdk_launcher_filename()} at {resolved}"
            )
            continue
        print(f"  {_bullet(False)} didn't recognise '{ans}'")


def _resolve_project_with_user(cfg: LauncherConfig) -> str:
    annotated: list[tuple[str, bool]] = [
        (p, validate_project(p)) for p in cfg.recent_projects
    ]
    for i, (p, ok) in enumerate(annotated, start=1):
        suffix = "" if ok else "  (path missing)"
        print(f"    {i}. {p}{suffix}")
    browse_n = len(annotated) + 1
    new_n = len(annotated) + 2
    print(f"    {browse_n}. <browse for an existing project>")
    print(f"    {new_n}. <start a new project here>")

    while True:
        default_choice = "1" if annotated else str(new_n)
        ans = input(f"  Select [1-{new_n}, default {default_choice}]: ").strip() or default_choice
        try:
            n = int(ans)
        except ValueError:
            print(f"  {_bullet(False)} enter a number")
            continue
        if 1 <= n <= len(annotated):
            cand, ok = annotated[n - 1]
            if not ok:
                print(f"  {_bullet(False)} that project no longer exists")
                continue
            return cand
        if n == browse_n:
            entry = input("    path to existing project: ").strip()
            if not entry:
                continue
            resolved = str(Path(entry).expanduser().resolve())
            if validate_project(resolved):
                return resolved
            print(f"  {_bullet(False)} no game/ directory at {resolved}")
            continue
        if n == new_n:
            entry = input("    path for the new project (will be created): ").strip()
            if not entry:
                continue
            resolved = Path(entry).expanduser().resolve()
            scaffold_empty_project(resolved)
            return str(resolved)
        print(f"  {_bullet(False)} out of range")


def run(cfg: LauncherConfig) -> int:
    print()
    print("RPBuilder Launcher")
    print("==================")
    print(f"(config: {config_path()})")

    _section("1. Ren'Py SDK")
    sdk = _resolve_sdk_with_user(cfg)

    _section("2. Project")
    project = _resolve_project_with_user(cfg)

    cfg.remember_project(project)
    cfg.save()

    _section("3. Launching")
    print(f"  SDK:     {sdk}")
    print(f"  project: {project}")
    print()
    print("  starting renpy-mcp-gui — open http://127.0.0.1:8765/ when it's ready.")
    print("  close that browser tab and press Ctrl-C here to stop the server.")
    print()
    return spawn_gui(sdk, project)


# ---------- entry point -------------------------------------------------------


def _force_unicode_stdout() -> None:
    """Make the interactive UI's box-drawing glyphs survive a legacy console.

    This launcher prints ✓ / ✗ / ─ / █ to stdout. On Windows the console default
    is the ANSI code page (cp936, cp1252, …), which can't encode them, and every
    prompt that shows a bullet dies with
    `UnicodeEncodeError: 'gbk' codec can't encode character '\\u2717'`.
    Reconfiguring the stream to UTF-8 fixes it where the console understands
    UTF-8; where it doesn't, `errors="replace"` degrades the glyph instead of
    crashing the whole launcher. No-op on POSIX (already UTF-8).
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            # Detached/closed stream, or a wrapper that refuses reconfiguration.
            pass


def main() -> int:
    _force_unicode_stdout()
    cfg = LauncherConfig.load()
    try:
        return run(cfg)
    except KeyboardInterrupt:
        print("\n  cancelled.")
        return 130


if __name__ == "__main__":
    sys.exit(main())

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

from .config import DEFAULT_GAMES_SUBDIR, DEFAULT_PROJECT_SLUG, DEFAULT_TIERS, ServerConfig
from .project import sdk_fetch
from .project.scaffold import scaffold_project
from .server import run_stdio


def _configure_logging(verbose: bool) -> None:
    """Send all logging to stderr — stdout is reserved for the MCP wire."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        stream=sys.stderr,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )


def _parse_tiers(raw: str) -> frozenset[int]:
    tiers = {int(x) for x in raw.split(",") if x.strip()}
    bad = tiers - {1, 2, 3, 4}
    if bad:
        raise argparse.ArgumentTypeError(f"unknown tiers: {sorted(bad)}; pick from 1-4")
    return frozenset(tiers)


def _default_sdk() -> Path | None:
    """Return the SDK path from $RENPY_SDK, the local cache, or None.

    Lookup order:
        1. $RENPY_SDK (explicit user choice).
        2. The most-recent SDK previously placed in the cache by
           `renpy-mcp --fetch-sdk`. Lets users run `--fetch-sdk` once
           and never need to set the env var.
    """
    env = os.environ.get("RENPY_SDK")
    if env:
        return Path(env).resolve()
    cached = sdk_fetch.cached_sdk()
    return cached.resolve() if cached else None


def main() -> int:
    parser = argparse.ArgumentParser(prog="renpy-mcp")
    parser.add_argument(
        "--project",
        type=Path,
        default=None,
        help=(
            "Path to a Ren'Py project root (the dir containing game/). "
            "Optional: if omitted, defaults to "
            f"`<cwd>/{DEFAULT_GAMES_SUBDIR}/{DEFAULT_PROJECT_SLUG}/` and is "
            "auto-scaffolded when missing."
        ),
    )
    parser.add_argument(
        "--games-root",
        type=Path,
        default=None,
        help=(
            "Directory under which `new_project` drops new projects. "
            f"Defaults to `<cwd>/{DEFAULT_GAMES_SUBDIR}/`."
        ),
    )
    parser.add_argument(
        "--sdk",
        type=Path,
        default=None,
        help=(
            "Path to the Ren'Py SDK (the dir containing renpy.sh). "
            "Optional: falls back to $RENPY_SDK when unset."
        ),
    )
    parser.add_argument(
        "--tiers",
        type=_parse_tiers,
        default=DEFAULT_TIERS,
        help="comma-separated tier list to load (default: 1,2,3)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="DEBUG-level stderr logging")
    parser.add_argument(
        "--print-config",
        choices=["claude-code", "hermes"],
        default=None,
        help=(
            "Print a ready-to-paste MCP-server config snippet for the named "
            "harness, using the current --sdk / --project / --games-root "
            "values, then exit. `claude-code` emits .mcp.json; `hermes` "
            "emits the YAML block to merge into ~/.hermes/config.yaml."
        ),
    )
    parser.add_argument(
        "--fetch-sdk",
        action="store_true",
        help=(
            "Download a Ren'Py SDK into ~/.cache/renpy-mcp/sdk-<version> "
            "(or $RENPY_MCP_SDK_CACHE) and exit. Subsequent `renpy-mcp` "
            "invocations pick the cached SDK up automatically when --sdk "
            "and $RENPY_SDK are unset. Combine with --sdk-version to pin."
        ),
    )
    parser.add_argument(
        "--sdk-version",
        default=None,
        help=(
            "Version string for --fetch-sdk (e.g. `8.6.0`). Default: probe "
            "renpy.org for the highest 8.x release."
        ),
    )
    args = parser.parse_args()

    if args.print_config:
        return _print_harness_config(args)
    if args.fetch_sdk:
        _configure_logging(args.verbose)
        return _fetch_sdk_cli(args)

    _configure_logging(args.verbose)
    log = logging.getLogger("renpy_mcp")

    cwd = Path.cwd()
    games_root = (args.games_root or (cwd / DEFAULT_GAMES_SUBDIR)).resolve()
    sdk_root = (args.sdk or _default_sdk())
    if sdk_root is None:
        log.error(
            "startup: --sdk is required (or set $RENPY_SDK); point it at the Ren'Py SDK directory"
        )
        return 2

    project_root = (args.project or (games_root / DEFAULT_PROJECT_SLUG)).resolve()
    if not (project_root / "game").is_dir():
        games_root.mkdir(parents=True, exist_ok=True)
        summary = scaffold_project(project_root, sdk_root=sdk_root.resolve())
        log.info("startup: %s", summary)

    config = ServerConfig(
        project_root=project_root,
        sdk_root=sdk_root.resolve(),
        tiers=args.tiers,
        games_root=games_root,
    )
    try:
        config.validate()
    except ValueError as exc:
        log.error("startup: %s", exc)
        return 2

    log.info(
        "starting stdio server | project=%s games_root=%s sdk=%s tiers=%s",
        config.project_root,
        config.games_root,
        config.sdk_root,
        sorted(config.tiers),
    )
    asyncio.run(run_stdio(config))
    return 0


def _yaml_scalar(value: str) -> str:
    """Render `value` as a YAML scalar that parses back to the same string.

    We hand-write the hermes YAML block rather than pulling in PyYAML, so this
    does the small amount of quoting YAML actually needs: plain style when the
    value is unambiguous, single-quoted (with `'` doubled, per YAML) otherwise.
    Single quotes keep backslashes literal, so Windows paths survive intact —
    unlike `shlex.quote`, whose POSIX single-quoting is not YAML.
    """
    # `-`, `?` and `:` only start an indicator when followed by a space (or at
    # end of the scalar), so `-m` and `--sdk` stay plain.
    leading_indicator = (
        len(value) == 1 and value in "-?:"
    ) or (len(value) > 1 and value[0] in "-?:" and value[1] in " \t")
    other_indicator = value[0] in ",[]{}#&*!|>'\"%@`"
    plain_unsafe = (
        not value
        or leading_indicator
        or other_indicator
        or value[-1] in " \t"
        or ": " in value
        or " #" in value
        or "\n" in value
        or "\t" in value
        or value.lower() in {"true", "false", "yes", "no", "null", "~", "on", "off"}
    )
    if not plain_unsafe:
        return value
    return "'" + value.replace("'", "''") + "'"


def _print_harness_config(args: argparse.Namespace) -> int:
    """Emit a ready-to-paste MCP-server config snippet for `args.print_config`.

    Resolves the same default values the server itself would resolve so the
    snippet works without further user editing. Goes to stdout (not stderr —
    this output is meant to be piped into a config file). Never spawns the
    server; just prints and returns 0.
    """
    cwd = Path.cwd()
    # Use sys.executable as-is — resolving the symlink chain on a venv
    # python lands at the system python, which doesn't have renpy_mcp
    # installed. The venv's `bin/python` is the path we want the harness
    # to launch.
    python = Path(sys.executable)
    sdk = args.sdk or _default_sdk()
    games_root = (args.games_root or (cwd / DEFAULT_GAMES_SUBDIR)).resolve()
    project = args.project.resolve() if args.project else None

    extra_args: list[str] = ["-m", "renpy_mcp"]
    if sdk is not None:
        extra_args += ["--sdk", str(sdk.resolve())]
    extra_args += ["--games-root", str(games_root)]
    if project is not None:
        extra_args += ["--project", str(project)]
    if args.tiers != DEFAULT_TIERS:
        extra_args += ["--tiers", ",".join(str(t) for t in sorted(args.tiers))]

    if args.print_config == "claude-code":
        snippet = {
            "mcpServers": {
                "renpy": {
                    "type": "stdio",
                    "command": str(python),
                    "args": extra_args,
                }
            }
        }
        print("// Drop this in .mcp.json next to the directory you open Claude Code in.")
        print("// Auto-loaded on session start; tools register as mcp__renpy__<tool>.")
        print(json.dumps(snippet, indent=2))
        if sdk is None:
            print(
                "// NOTE: --sdk was omitted; set $RENPY_SDK, run "
                "`renpy-mcp --fetch-sdk` once to populate the cache, "
                "or rerun --print-config with --sdk PATH.",
                file=sys.stderr,
            )
        return 0

    # hermes-agent: YAML block to merge into ~/.hermes/config.yaml.
    yaml_args = "\n      ".join(f"- {_yaml_scalar(a)}" for a in extra_args)
    print("# Merge into ~/.hermes/config.yaml under `mcp_servers:`. After")
    print("# editing, run `hermes mcp test renpy` to verify the connection.")
    print("mcp_servers:")
    print("  renpy:")
    print(f"    command: {_yaml_scalar(str(python))}")
    print(f"    args:")
    print(f"      {yaml_args}")
    print("    timeout: 180")
    print("    connect_timeout: 60")
    if sdk is None:
        print(
            "# NOTE: --sdk was omitted; set $RENPY_SDK in hermes' .env, run "
            "`renpy-mcp --fetch-sdk` once to populate the cache, or re-run "
            "print-config with --sdk PATH.",
            file=sys.stderr,
        )
    return 0


def _fetch_sdk_cli(args: argparse.Namespace) -> int:
    """Run `--fetch-sdk` end-to-end and print the resolved SDK path."""
    log = logging.getLogger("renpy_mcp")
    try:
        result = sdk_fetch.fetch_sdk(version=args.sdk_version)
    except sdk_fetch.SDKFetchError as exc:
        log.error("fetch-sdk failed: %s", exc)
        return 2
    if result.cached:
        log.info("Ren'Py SDK %s already cached at %s", result.version, result.sdk_path)
    else:
        log.info("Ren'Py SDK %s installed at %s", result.version, result.sdk_path)
    # stdout receives the path so shell pipelines can capture it.
    print(result.sdk_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())

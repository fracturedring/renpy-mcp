"""Tests for the subprocess shim in `renpy_mcp.sdk`.

The interesting behavior here is what we *don't* hand the child. The Ren'Py
launcher inherits every stdio handle it isn't given explicitly, and under the
MCP stdio transport the parent's stdin is a live pipe — a child that inherits
it blocks forever waiting for input that will never arrive. That made
`get_lint_report` hang for the full 120 s timeout on Windows, so the DEVNULL
stdin is load-bearing rather than tidiness.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from renpy_mcp import sdk as renpy_sdk


class _FakeProc:
    returncode = 0

    async def communicate(self) -> tuple[bytes, bytes]:
        return b"lint ok", b""

    async def wait(self) -> int:
        return 0

    def kill(self) -> None:  # pragma: no cover - only on timeout
        pass


@pytest.fixture
def captured_spawn(monkeypatch):
    """Record the kwargs `run()` hands to `create_subprocess_exec`."""
    captured: dict[str, object] = {}

    async def fake_spawn(*cmd: str, **kwargs: object) -> _FakeProc:
        captured["cmd"] = cmd
        captured["kwargs"] = kwargs
        return _FakeProc()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_spawn)
    return captured


async def test_run_detaches_child_stdin(tmp_path: Path, captured_spawn):
    """stdin must be DEVNULL — an inherited pipe wedges the Ren'Py launcher."""
    await renpy_sdk.run(tmp_path, tmp_path / "project", "lint")

    kwargs = captured_spawn["kwargs"]
    assert kwargs["stdin"] == asyncio.subprocess.DEVNULL
    assert kwargs["stdout"] == asyncio.subprocess.PIPE
    assert kwargs["stderr"] == asyncio.subprocess.PIPE


async def test_run_builds_argv_without_a_shell(tmp_path: Path, captured_spawn):
    """Argv goes through as a list so user-controlled paths never hit a shell."""
    project = tmp_path / "project"
    await renpy_sdk.run(tmp_path, project, "lint", timeout=5.0)

    cmd = captured_spawn["cmd"]
    assert isinstance(cmd, tuple)
    assert cmd[0] == str(tmp_path / renpy_sdk.sdk_launcher_name())
    assert cmd[1] == str(project)
    assert cmd[2] == "lint"


async def test_run_decodes_output_as_utf8(tmp_path: Path, captured_spawn):
    result = await renpy_sdk.run(tmp_path, tmp_path / "project", "lint")
    assert result.returncode == 0
    assert result.stdout == "lint ok"


async def test_run_raises_timeout_and_kills_child(tmp_path: Path, monkeypatch):
    """A wedged engine should still surface as a clean TimeoutError."""
    killed: list[bool] = []

    class _WedgedProc(_FakeProc):
        async def communicate(self):  # type: ignore[override]
            await asyncio.sleep(10)
            return b"", b""

        def kill(self) -> None:
            killed.append(True)

    async def fake_spawn(*cmd: str, **kwargs: object) -> _WedgedProc:
        return _WedgedProc()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_spawn)
    with pytest.raises(asyncio.TimeoutError):
        await renpy_sdk.run(tmp_path, tmp_path / "project", "lint", timeout=0.05)
    assert killed == [True]

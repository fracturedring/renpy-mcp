"""Subprocess shim around the Ren'Py SDK launcher.

We invoke `renpy.sh <project> <command>` for engine operations the scanner
cannot do itself: lint, force-recompile, build, generate-translations.

Implementation note: uses ``asyncio.create_subprocess_exec`` (argv list, no
shell interpretation) so user-controlled values never reach a shell parser.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path

from .config import sdk_launcher_name


@dataclass(frozen=True)
class SDKResult:
    returncode: int
    stdout: str
    stderr: str


async def run(sdk_root: Path, project_root: Path, *args: str, timeout: float = 120.0) -> SDKResult:
    """Spawn the Ren'Py SDK launcher with the given subcommand argv and capture its output."""
    cmd = [str(sdk_root / sdk_launcher_name()), str(project_root), *args]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        # Detach the child's stdin: under the MCP stdio transport our own stdin
        # is a live pipe, and the Ren'Py launcher blocks forever on the
        # inherited handle (lint then hangs until the timeout). DEVNULL keeps
        # the engine off the transport's stdin entirely.
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise
    return SDKResult(
        returncode=proc.returncode if proc.returncode is not None else -1,
        stdout=stdout.decode("utf-8", errors="replace"),
        stderr=stderr.decode("utf-8", errors="replace"),
    )


async def run_lint(sdk_root: Path, project_root: Path) -> SDKResult:
    """Invoke Ren'Py's built-in lint over the project."""
    return await run(sdk_root, project_root, "lint")

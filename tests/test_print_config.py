"""Test the `--print-config {hermes,claude-code}` CLI shortcut.

The flag is the project's answer to "every harness wants the MCP config
in a slightly different shape." We exercise both supported harnesses end
to end (running `python -m renpy_mcp` as a subprocess so argparse runs
for real) and assert the printed snippet uses the absolute paths the
calling user would expect.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


def _run(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "renpy_mcp", *args],
        capture_output=True,
        text=True,
        cwd=cwd,
        check=False,
    )


def test_print_config_claude_code_emits_valid_json(tmp_path: Path):
    fake_sdk = tmp_path / "sdk"
    fake_sdk.mkdir()
    (fake_sdk / "renpy.sh").touch()
    proc = _run("--print-config", "claude-code", "--sdk", str(fake_sdk))
    assert proc.returncode == 0, proc.stderr
    # Strip the leading `//` comment lines to get to the JSON body.
    json_lines = [ln for ln in proc.stdout.splitlines() if not ln.startswith("//")]
    payload = json.loads("\n".join(json_lines))
    assert "mcpServers" in payload and "renpy" in payload["mcpServers"]
    server = payload["mcpServers"]["renpy"]
    assert server["type"] == "stdio"
    assert server["command"] == sys.executable
    assert "-m" in server["args"] and "renpy_mcp" in server["args"]
    assert str(fake_sdk) in server["args"]


def test_print_config_hermes_yaml_has_required_keys(tmp_path: Path):
    fake_sdk = tmp_path / "sdk"
    fake_sdk.mkdir()
    (fake_sdk / "renpy.sh").touch()
    proc = _run("--print-config", "hermes", "--sdk", str(fake_sdk))
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    assert "mcp_servers:" in out
    assert "renpy:" in out
    assert f"command: {sys.executable}" in out
    assert "- -m" in out
    assert "- renpy_mcp" in out
    assert f"- {fake_sdk}" in out
    assert "timeout: 180" in out


def test_print_config_hermes_yaml_is_parseable(tmp_path: Path):
    """The block is hand-rendered, so prove it's real YAML and round-trips.

    `shlex.quote` used to render this, which produced POSIX shell quoting
    rather than YAML — legal-looking output that a YAML parser reads
    differently from what we meant.
    """
    yaml = pytest.importorskip("yaml")

    fake_sdk = tmp_path / "sdk with space"
    fake_sdk.mkdir()
    (fake_sdk / "renpy.sh").touch()
    proc = _run("--print-config", "hermes", "--sdk", str(fake_sdk))
    assert proc.returncode == 0, proc.stderr

    body = "\n".join(
        ln for ln in proc.stdout.splitlines() if not ln.startswith("#")
    )
    payload = yaml.safe_load(body)
    server = payload["mcp_servers"]["renpy"]
    assert server["command"] == sys.executable
    assert server["args"][0] == "-m"
    assert server["args"][1] == "renpy_mcp"
    assert str(fake_sdk) in server["args"]
    assert server["timeout"] == 180


def test_print_config_includes_explicit_project_when_given(tmp_path: Path):
    fake_sdk = tmp_path / "sdk"
    fake_sdk.mkdir()
    (fake_sdk / "renpy.sh").touch()
    project = tmp_path / "myvn"
    (project / "game").mkdir(parents=True)
    proc = _run(
        "--print-config",
        "claude-code",
        "--sdk",
        str(fake_sdk),
        "--project",
        str(project),
    )
    assert proc.returncode == 0, proc.stderr
    json_lines = [ln for ln in proc.stdout.splitlines() if not ln.startswith("//")]
    payload = json.loads("\n".join(json_lines))
    args = payload["mcpServers"]["renpy"]["args"]
    assert "--project" in args
    assert str(project) in args


def test_print_config_warns_when_sdk_missing(tmp_path: Path):
    """No --sdk and no $RENPY_SDK -> the snippet still prints (so users
    can fix it up) but the warning lands on stderr and points at
    `--fetch-sdk` so the agent has a clear next step."""
    # Strip RENPY_SDK and override the cache dir explicitly — the
    # subprocess inherits whatever the test runner has set, and on a
    # warm developer machine that's a real SDK path that would suppress
    # the warning we're trying to assert.
    env = {k: v for k, v in os.environ.items() if k != "RENPY_SDK"}
    env["RENPY_MCP_SDK_CACHE"] = str(tmp_path / "no_cache")
    proc = subprocess.run(
        [sys.executable, "-m", "renpy_mcp", "--print-config", "hermes"],
        capture_output=True,
        text=True,
        cwd=tmp_path,
        env=env,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    assert "mcp_servers:" in proc.stdout
    assert "--sdk" not in proc.stdout
    assert "--fetch-sdk" in proc.stderr

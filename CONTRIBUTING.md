# Contributing to renpy-mcp

Thanks for considering a contribution. This file is a quick map of how
the codebase wants to grow — what goes where, how to test it, and
which invariants the writer pipeline enforces.

For the architectural deep-dive, [DESIGN.md](DESIGN.md) is the source
of truth. For the LLM-driven authoring playbook, see
[AGENTS.md](AGENTS.md). This file is the contributor's quickstart.

---

## Setup

```bash
git clone https://github.com/fracturedring/renpy-mcp.git
cd renpy-mcp
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev,gui]"
```

Run the test suite:

```bash
pytest -q
```

The full suite runs in ~16 s with the SDK present (`RENPY_SDK=...`),
~10 s without (SDK-gated tests skip). 386 tests at time of writing.

For frontend work:

```bash
cd gui/frontend
npm install
npm run build       # one-shot production build
npm run dev         # Vite dev server (also need gui/dev.sh for the backend)
```

---

## Where new code lives

The repository's layout is intentional — adding a tool, a panel, or a
guardrail has one obvious destination. Don't invent new top-level
directories; if your change doesn't fit, the design probably needs
discussion before code.

```
src/renpy_mcp/
├── tools/
│   ├── tier1_read.py       # reads + diagnostics + lifecycle dispatcher
│   ├── tier2_write.py      # one-Ren'Py-construct-per-tool primitives
│   ├── tier3_intents.py    # high-level intents (compose multiple writes)
│   ├── tier4_escape.py     # escape hatches (opt-in, off by default)
│   ├── lifecycle.py        # process + SDK invocations (preview, warp, distribute)
│   └── _shared.py          # helpers reused across tiers
├── project/
│   ├── scanner.py          # ProjectIndex — labels, characters, etc.
│   ├── label_tree.py       # typed body parser + iter_statements
│   ├── asset_refs.py       # missing-image detection (shared by diagnostics + drafting)
│   ├── canvas.py           # `.renpy-mcp/canvas.json` sidecar I/O
│   ├── diagnostics.py      # `.renpy-mcp/ignored_diagnostics.json` + filter
│   ├── composers.py        # pure code generators (Screen Layout, Stage, ImageMap)
│   ├── translations.py     # `game/tl/<lang>/` parser
│   ├── writer.py           # apply_write — the single guarded write pipeline
│   └── scaffold.py         # SDK-template-aware project bootstrap
├── guardrails/             # pure defensive helpers (indent, label uniqueness, ...)
├── server.py               # MCP server + tier registration
└── config.py               # ServerConfig + DEFAULT_TIERS

gui/
├── backend/                # FastAPI process — REST + WebSocket fan-out
└── frontend/               # Vite + React + Tailwind + CSS variables

tests/                      # pytest, async, copy-fixture-per-test for mutations
scripts/
├── smoke_test.py           # MCP wire smoke probe
├── integration_drive.py    # 40-step in-process drive against a fresh project
└── real_vn_drive.py        # drives a project with real fal-generated assets
```

---

## Adding a new MCP tool

Detailed walkthrough is in [DESIGN.md §6](DESIGN.md#6-adding-a-new-tool-step-by-step).
The shortest safe path:

1. **Pick a tier.** Reads + diagnostics → Tier 1. Writes that emit
   exactly one Ren'Py construct → Tier 2. Composing several writes
   into one creator action → Tier 3. Escape-hatch operations that
   need arbitrary file access → Tier 4. If you can't decide between
   2 and 3: would an author describe the action as one thing in
   conversation? If yes, Tier 3.
2. **Add a `_my_tool(config, index) -> ToolDef` factory** to the
   matching tier file. The JSON schema must use
   `additionalProperties: False` and an explicit `required` list —
   small models are dramatically more accurate when the schema is
   tight.
3. **Build new content in the handler, then call `apply_write` via
   `write_response`** from `_shared.py`. Catch `WriteRejected` and
   return `err(...)`.
4. **Register the tool** in the tier's `register()` function.
5. **Add tests** under `tests/test_tierN.py` (or a new
   `test_phaseX.py` if it's part of a larger feature). Use the
   `workspace` fixture pattern — it copies `tests/fixtures/tiny_project`
   into `tmp_path` so writes don't leak. Cover both happy path and
   at least one rejection.
6. **Expose it on the GUI** (optional). Add a thin REST wrapper in
   `gui/backend/.../app.py` (module-scope Pydantic body model) and
   wire it into the right panel.

---

## The non-negotiable invariants

These come up in code review every time. Internalizing them up front
saves a round-trip:

- **Every `.rpy` mutation goes through `apply_write`.** Three
  exceptions, all documented in [DESIGN.md §3](DESIGN.md#3-the-writer-pipeline-projectwriterpy):
  `new_project` (creates files before the project exists), the
  editor-metadata sidecars (`set_canvas_positions`,
  `set_ignored_diagnostics`), and SDK-driven translation scaffolding.
  Don't add a fourth without architectural discussion.
- **Tool descriptions are read by small models.** Keep them
  imperative, concrete, and short. Mention non-obvious constraints
  (e.g. `replace_terminator`) in the description so the model sees
  the flag during tool-list scans, not only on rejection.
- **Dialogue text is single-line.** Tools that accept character /
  narration text already reject literal `\n` / `\r` via
  `reject_multiline`. Don't loosen that without a reason.
- **Pydantic models in the GUI backend are module-scope.** Closure-
  scoped models break Pydantic v2's forward-reference resolution.
- **Frontend panels use TanStack Query** for server state. The file
  watcher invalidates query keys on filesystem events; new panels
  should follow the same query-key naming so the watcher's coarse
  invalidate hits them.

---

## Testing patterns

- **Async tests.** `pytest-asyncio` with `asyncio_mode = "auto"` is
  configured in `pyproject.toml`. All tool handlers are async.
- **Per-test fixture copies.** Mutation tests copy
  `tests/fixtures/tiny_project/` into `tmp_path` via
  `shutil.copytree`. The canonical fixture stays clean between tests.
- **SDK-gated tests** (`test_gui_backend.py`, anything calling
  `get_lint_report` or `launch_preview`) are module-skipped when
  `RENPY_SDK` is not set. CI without an SDK still works.
- **`parse()` helper** in `tests/conftest.py` decodes the
  `list[TextContent]` response into a JSON dict. Every tier test
  uses it.
- **Writer assertions.** After a mutation, most tests read the
  resulting `.rpy` and assert on the bytes (not the diff), then
  re-snapshot the index to confirm parse-back cleanliness.

---

## End-to-end smoke probes

Two scripts in `scripts/` that exercise the whole stack — useful when
making cross-cutting changes (writer pipeline, scaffold,
distribute argv shape):

```bash
# 40-step in-process drive against a fresh project. ~30 s with SDK.
python scripts/integration_drive.py

# Drives a project that ships real assets (you supply them).
# Verifies auto-detect + lint clean + distribute artifact contents.
python scripts/real_vn_drive.py /path/to/project_with_assets
```

If your change passes these and the unit suite, you've covered the
behavior we care about.

---

## Frontend conventions

- **Tailwind for layout, CSS variables for theming.** `theme.css`
  defines the cream/light/dark surface tokens; Tailwind's color
  config maps `bg-canvas`, `bg-card`, etc. through those variables.
  When adding a panel, prefer the named color tokens (`bg-card`,
  `text-ink`) over hex literals so theme switching keeps working.
- **One panel = one file under `gui/frontend/src/panels/`.**
- **Layout primitives** (Header, Sidebar, PrefsModal, CommandPalette)
  live in `gui/frontend/src/layout/`. The Sidebar's PanelId union is
  the canonical list; CommandPalette mirrors it.
- **Native pointer events on drag-heavy surfaces.** The Story Map
  uses `onMouseDown`/`onMouseMove` on bare `<div>` elements; React's
  synthetic event system kills drag perf on big graphs. New
  drag-y surfaces should follow the same pattern.

---

## Filing issues + PRs

- **Issues** are welcome — a quick repro plus your environment
  (Python version, OS, Ren'Py SDK version) is plenty.
- **PRs** should target `main`. Run `pytest -q` and `npm run build`
  locally before pushing; CI runs both.
- **Tool surface changes** (new tool, removed tool, schema breaking
  change) should mention the count update in the PR description so
  README's "80 MCP tools" stays accurate.
- **Documentation-only changes** are great — README, AGENTS, MEDIA,
  this file — they're under the same review bar as code (typos
  count).

By contributing you agree your changes are released under
**AGPL-3.0-or-later** (see [LICENSE](LICENSE)). The §13 network clause
applies to the GUI: anyone running the GUI as a hosted service for
users beyond themselves must offer the corresponding source. MCP
clients (Claude Code, hermes-agent, Cursor) are separate processes
talking to the server over stdio — they aren't derivative works
merely by calling its tools.

---

## When you're stuck

- Run `pytest -q -k <test_name>` to iterate on one test.
- Read the closest neighbor file. Most patterns repeat — adding a new
  Tier 2 tool? Read three existing Tier 2 tools first.
- The integration drive is your friend — if a unit test passes but
  things feel wrong end-to-end, run `scripts/integration_drive.py`
  and read its output.
- Open a discussion or issue on GitHub. We'd rather answer a question
  than receive a PR built on a mistaken assumption.

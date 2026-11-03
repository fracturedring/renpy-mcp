# Design

This document is the architecture reference — the "why" and the shape of the
codebase, written so a fresh contributor (human or LLM agent) can grow it
safely without first reading every file.

The [llms.txt](llms.txt) file is a shorter index over the source tree; read
that first if you only need to locate something. This document is for when
you're about to change something and want to understand the invariants first.

---

## 1. The big picture

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Any MCP-speaking agent (Claude Code, hermes-agent, Cursor, …)       │
  │  OR the RPBuilder GUI's FastAPI backend                              │
  └───────────────────────────────┬──────────────────────────────────────┘
                                  │ MCP over stdio
                                  ▼
              ┌──────────────────────────────────────┐
              │            renpy-mcp server          │
              │  ┌────────────────────────────────┐  │
              │  │   ToolRegistry (dispatch)      │  │
              │  └──────────────┬─────────────────┘  │
              │                 │                    │
              │   Tier 1 reads / lifecycle / lint    │
              │   Tier 2 guarded write primitives    │
              │   Tier 3 high-level intents          │
              │   Tier 4 escape hatches (opt-in)     │
              │                 │                    │
              │                 ▼                    │
              │  ┌────────────────────────────────┐  │
              │  │   apply_write (writer.py)      │  │
              │  │   — the ONE write pipeline     │  │
              │  └──────────────┬─────────────────┘  │
              │                 │                    │
              │                 ▼                    │
              │  ┌────────────────────────────────┐  │
              │  │   project_root/game/*.rpy      │  │
              │  └────────────────────────────────┘  │
              └───────────────────┬──────────────────┘
                                  │
                                  ▼
                        renpy.sh / renpy.exe
                        (spawned for lint + preview only)
```

**Non-negotiable invariants:**

1. **Every mutation goes through `apply_write`.** No tool writes bytes
   directly. This is how path containment, label uniqueness, indent
   normalization, atomic writes, `.rpyc` cleanup, and the returned unified
   diff stay uniform across every tier. Three exceptions, all intentional:
   - `new_project` (§1a) — creates files before the project exists, so
     there is no prior index to collide with and no `.rpy` to diff against.
   - `set_canvas_positions` (`project/canvas.py`) and
     `set_ignored_diagnostics` (`project/diagnostics.py`) — both write
     editor-metadata sidecars under `.renpy-mcp/`. Neither sidecar is
     Ren'Py syntax: Ren'Py never reads them, `ProjectIndex` does not
     index them, and `apply_write`'s guarantees (label uniqueness, indent
     normalization, `.rpyc` cleanup, unified-diff generation, index
     refresh) are either irrelevant or counterproductive. The modules
     mirror the bits we still want — path containment, atomic write,
     no-op detection.
   - `generate_translation_scaffolding` (`tools/lifecycle.py`) — Ren'Py
     itself writes the new `game/tl/<language>/*.rpy` files via the
     `translate` SDK command. Same shape as `new_project`: the SDK is
     authoritative, our writer is bypassed, and we refresh the index
     after the fact so subsequent reads pick up the new files.
2. **The file system is the integration point.** The GUI and LLM harnesses
   each spawn their own `renpy-mcp` subprocess; they don't talk to each
   other. Coordination is implicit through the project files plus the
   watchdog-driven WebSocket fan-out.
3. **No chat panel in the GUI.** Authoring happens in your LLM harness;
   the GUI is a visual client of the same MCP server. Any work to add
   "ask the LLM from the browser" is explicitly rejected — it would
   create a second dependency axis that breaks the single-integration-
   point model.
4. **The server never calls an LLM itself.** Story generation, image
   generation, and asset prompting all happen in the harness (Claude
   Code, hermes-agent, Cursor). The server only stamps structured
   changes into `.rpy` files and manages lifecycle (preview, lint). The
   scaffold path is filesystem-only: `new_project` copies template bytes,
   it does not invent content.

### 1a. The default-folder convention

Games live at `<cwd>/games/<slug>/` by default. The CWD is whichever
directory the harness launched `renpy-mcp` from; that gives each
conversation an obvious, non-shared scratch space.

- `--project <path>` still wins when set — the server binds to that path.
- With no `--project`, the server defaults `project_root` to
  `<cwd>/games/default/` and auto-scaffolds it on first run so
  `validate()` succeeds and Tier 1/2/3 tools work immediately.
- `--games-root <path>` overrides where `new_project` drops fresh
  projects (defaults to `<cwd>/games/`).
- `new_project` creates a new project under the games root and rebinds
  the session's `project_root` in place — the running server keeps its
  tiers, its lifecycle state, and its index, but subsequent calls
  operate against the new directory. This keeps the server a single
  long-lived process per conversation.

The `ServerConfig.project_root` field is therefore *mutable by design*:
the dataclass dropped `frozen=True` when the scaffold flow landed.
`bind_project(new_root)` is the only sanctioned way to mutate it.

---

## 2. The tiered tool model

Tools are stratified by how much the caller has to know to use them
correctly. Each tier is opt-in at server launch (`--tiers 1,2,3`,
defaults to those three; Tier 4 is opt-in-only).

### Tier 1 — read + lifecycle (always safe)

29 read tools + 7 lifecycle tools: project overview,
label/character/image/audio/variable/screen listing, per-entity read,
reference search, raw file read, structured label-tree, choice graph,
translation coverage, the in-process `find_*` diagnostics,
`get_recent_edits`, `get_media_invariants`, `get_scaffold_status`,
`get_lint_report`, plus lifecycle: `launch_preview`, `stop_preview`,
`get_preview_status`, `warp_to`, `set_drafting_mode`,
`generate_translation_scaffolding`, `build_distribution`. The reads
never write bytes; the lifecycle tools spawn the Ren'Py SDK but never
mutate `.rpy` content.

### Tier 2 — guarded write primitives (one statement per tool)

27 tools (incl. the two sidecar setters): `add_label`, `add_say`,
`add_jump`, `add_call`, `add_menu`, `update_menu_choice`,
`add_condition_branch`, `set_variable_default`, `rename_label`,
`add_audio_play`, `add_image_alias`, `add_character`, `update_character`,
`add_layered_image`, `add_transform`, `add_screen`,
`update_options_field`, `add_menu_branch`, `redirect_jump`,
`delete_label`, `add_pause`, `add_setvar`, `add_show`, `add_with_effect`,
`add_flash`, plus the two sidecar setters `set_canvas_positions` and
`set_ignored_diagnostics` (atomic-write metadata, not Ren'Py syntax —
exception list in §3). Each Ren'Py-emitting tool produces a single
construct; composition is the caller's responsibility. Tier 2 is the
right layer for precise diffs.

### Tier 3 — high-level intents (one creator action per tool)

15 tools: `new_project`, `create_scene`, `create_choice_node`,
`create_route`, `add_dialogue_block`, `swap_background`,
`add_character_to_scene`, `set_scene_music`,
`add_inventory_item_scaffold`, `add_minigame_screen_scaffold`,
`add_screen_layout`, `add_stage`, `add_imagemap`, `repair_scaffold`.
These compose multiple Tier 2 writes in a single call (or, in
`new_project`'s case, copy a template and rebind the session — the only
tool that predates the `apply_write` pipeline because it creates the
project those writes target). `set_scene_music` is the canonical example
of a non-passthrough intent: it rewrites an existing `play music` line
in place, otherwise inserts after the first `scene` line, otherwise
appends — three insert paths the Tier 2 primitives don't carry. This is
the *primary* surface for agents — Tier 2 exists for fine adjustment
after an intent has landed.

### Tier 4 — escape hatches (opt-in, touch arbitrary content)

2 tools: `apply_unified_diff` (strict-context unified-diff applier;
supports creation via `--- /dev/null`, refuses deletion) and
`exec_python_in_init` (ast-validated `init python:` block appender).
These exist specifically for the cases the structured intents can't
express. They still route through `apply_write`, so the guardrails still
hold — but by design they can touch arbitrary file content, which is why
the tier is OFF by default.

### Choosing a tier when adding a tool

- Does it write anything? → Tier 1.
- Does it emit exactly one Ren'Py construct? → Tier 2.
- Is it a recognized authoring intent (a whole scene, a whole route)?
  → Tier 3.
- Is it a sharp-edged escape hatch that only makes sense when the
  structured tools can't express what the caller wants? → Tier 4.

If you can't decide between Tier 2 and Tier 3, the test is: "would an
author describe this as one action when talking to a collaborator?"
If yes, Tier 3.

---

## 3. The writer pipeline (`project/writer.py`)

`apply_write(config, index, rel_path, new_content)` is the one place that
touches disk. It runs, in order:

1. **Path containment** — `_resolve_inside` rejects paths that escape
   `project_root` after resolution. Defends against `../` traversal and
   symlink escape.
2. **Reserved filename rejection** — `guardrails/reserved.py` refuses
   writes to filenames that Ren'Py treats specially.
3. **Tab → 4-space normalization** — `guardrails/indent.normalize_tabs`
   rewrites tabs as 4 spaces and surfaces a warning. Ren'Py is
   indent-sensitive and mixing tabs/spaces has bitten every VN author
   at least once.
4. **Label uniqueness check** — compares the incoming file's labels
   against the current `ProjectIndex` snapshot for cross-file collisions.
   Refuses the write rather than silently shadowing.
5. **No-op detection** — reads current content; if `original ==
   normalized`, returns `WriteResult(no_op=True)` without touching disk.
6. **Atomic write** — writes to `<path>.renpy-mcp-tmp` in the same
   directory, then `os.replace` into place. Survives crashes mid-write.
7. **`.rpyc` cleanup** — removes the `.rpyc` and `.rpyc.bak` siblings so
   the engine recompiles from source on next run.
8. **Unified diff generation** — `difflib.unified_diff` against the
   pre-write content, returned in every tool's response.
9. **Index refresh** — the `ProjectIndex` re-scans so subsequent reads
   see the change.
10. **Recent-edits ring buffer** — every successful (non-no-op) write
    is recorded into `project/recent.py`'s process-local deque (max 50)
    with timestamp, file, summary, and diff. Powers the
    `get_recent_edits` Tier 1 tool. The GUI maintains its own richer
    buffer (`gui/backend/.../recent.py`) that distinguishes its own
    writes from external ones the watcher saw.

Every tool that mutates bytes — whether Tier 2, Tier 3, or Tier 4 —
must end with an `apply_write` call. Usually via the `write_response`
helper in [tools/_shared.py](src/renpy_mcp/tools/_shared.py), which also
shapes the standard JSON response.

Rejections bubble out as `WriteRejected` exceptions; tool handlers catch
them and return an `err(...)` response.

---

## 4. The project index (`project/scanner.py`)

`ProjectIndex` is a lazily-built, cached view of the project: labels,
characters, images, audio, screens, variables, transforms. It is *not*
an authoritative Ren'Py parse — it's a pragmatic regex/indent-aware
scanner tuned for the MCP tool surface.

Every write through `apply_write` calls `index.refresh()` so subsequent
`snapshot()` calls reflect the new state.

`snapshot()` is cheap; call it inside a tool handler rather than holding
the snapshot across handler calls, because concurrent writes (from
another MCP client) could make a stale snapshot mislead your logic.

---

## 5. Guardrails (`guardrails/`)

Small, composable defensive helpers reused across tiers:

- **`indent.normalize_tabs`** — tab → 4-space conversion with warnings.
- **`labels.find_collisions`** — cross-file label uniqueness check.
- **`reserved.reject_reserved_filename`** — refuses writes to protected
  names.
- **`reserved.reject_reserved_identifier`** — refuses identifiers that
  collide with Ren'Py or Python keywords.
- **`dialogue.escape_dialogue`** — double-quote + backslash escaping for
  user-supplied dialogue text.

Everything here is a pure function. Adding a new guardrail is a matter of
dropping a module into this directory and importing it from the tier
module (or `_shared.py`) that needs it.

---

## 6. Adding a new tool (step by step)

The shortest safe path:

1. Decide the tier (see §2). Edit the matching `tools/tierN_*.py`.
2. Write a `_my_tool(config, index) -> ToolDef` factory. Define the
   JSON-schema `input_schema` with `additionalProperties: False` and
   explicit `required` list. Small-model-friendly descriptions.
3. In the handler, validate arguments → build new content → call
   `apply_write` via `write_response`. Catch `WriteRejected` and return
   `err(...)`.
4. Add the tool to the tier's `register()` function.
5. Add at least one happy-path test + one rejection test in
   `tests/test_tierN.py`. Use the `workspace` fixture — it copies the
   fixture project into `tmp_path` so your writes don't leak.
6. If the tool belongs on the GUI, expose a thin FastAPI endpoint in
   `gui/backend/src/renpy_mcp_gui/app.py` that delegates to
   `state.client.call(tool_name, args)`. Pydantic model is module-scope.
7. If the GUI needs it, add a panel or extend an existing one.

If the tool is truly new and doesn't fit any existing tier, see §7.

---

## 7. Adding a new tier

Rare. If you're adding one:

1. Create `src/renpy_mcp/tools/tierN_<intent>.py` with a `register()`
   function matching the existing tier signature.
2. Add the tier number to `--tiers` parsing in
   [src/renpy_mcp/__main__.py](src/renpy_mcp/__main__.py) (`_parse_tiers`
   accepts `{1, 2, 3, 4}` — widen this set).
3. Add the conditional `register` call in
   [server.py](src/renpy_mcp/server.py).
4. Decide whether the tier belongs in `DEFAULT_TIERS` in
   [config.py](src/renpy_mcp/config.py). Defaults should stay minimal;
   sharp-edged tiers stay opt-in.
5. Document the new tier in [README.md](README.md) and update the tool
   count in llms.txt.

---

## 8. GUI architecture

The GUI is a single FastAPI process (`uvicorn`) that:

1. Spawns its own `renpy-mcp` subprocess over stdio (`mcp_client.py`).
2. Starts a watchdog observer (`watcher.py`) on `project_root` and
   forwards `FileEvent`s to every connected WebSocket client via
   `_fanout_file_events`.
3. Exposes REST endpoints per panel (`app.py`). Every endpoint is a thin
   wrapper around a single MCP tool call, with Pydantic models for
   request bodies. Module-scope models only.
4. Optionally serves the production frontend build (`vite build` →
   `gui/frontend/dist/`) under `/` with SPA fallback.

Frontend panels are React components using TanStack Query for server
state. The file watcher WebSocket invalidates relevant query keys, so a
change triggered by an LLM harness in another process shows up in the
GUI within the watcher's debounce window without a refresh.

When a panel needs a new endpoint, the convention is:

- REST endpoint in `app.py`: `@app.post("/api/<resource>")` with a
  module-scope Pydantic body model; handler calls
  `state.client.call("<tool_name>", body.model_dump(exclude_none=True))`.
- Frontend types in `api/types.ts`; fetch via `api<T>("/api/<path>",
  {json, method})` from `api/client.ts`.
- `useMutation` with `onSuccess` invalidating every affected query key
  so every panel showing related data refreshes.

The architecture deliberately contains *no* chat panel. Agents connect
via their own harness pointed at the same `renpy-mcp` server; the GUI is
one MCP client among many. This is the single most load-bearing design
decision in the repo — see the root README for the rationale.

### Interface localization

The SPA ships English and Simplified Chinese from `frontend/src/i18n/`,
hand-rolled rather than built on `react-i18next`. With two locales and no
plural rules beyond English's `one`/`other`, a ~60-line runtime (context,
`t(key, vars)`, locale detection) is cheaper to review and to keep correct
than a dependency plus a loader that would have to work against the static
`dist/` build the backend serves.

Two properties are enforced by the compiler instead of by review:

- **A missing translation cannot be committed.** Each catalog's
  `zh-Hans` object is typed `Record<keyof typeof en, string>`, so adding
  an `en` key without its Chinese counterpart fails `tsc -b`. An
  untranslated string is the mistake most likely to reach production, so
  it is made uncommittable.
- **A key that does not exist cannot be passed to `t()`.** `MessageKey`
  is derived from the merged catalog, so a typo is a type error rather
  than the raw key rendering at runtime.

The runtime falls back `locale table → en table → the key itself`, and
leaves an unsupplied `{placeholder}` intact rather than rendering an empty
string: a visible `{count}` is a loud, harmless bug report, whereas a
blank hides the typo.

Translation is display-only by construction. Anything that identifies
project data or mirrors an external interface — `.rpy` content, label and
character names, paths, MCP tool names and arguments, Ren'Py's own lint
and distribute output — is rendered verbatim in every locale. A translated
diagnostic would stop matching search results, upstream docs, and the
strings the tools accept back.

`frontend/scripts/audit-i18n.mjs` covers what the type system cannot:
catalog key parity across files, keys that are defined but never
referenced, and English literals left in JSX text or in
`title`/`placeholder`/`aria-label`/`alt` attributes. It is a plain Node
script with no dependencies, so it runs in any checkout:

```bash
cd gui/frontend && node scripts/audit-i18n.mjs
```

---

## 9. Testing patterns

- **Async tests** — `pytest-asyncio` with `asyncio_mode = "auto"`
  (configured in pyproject). All tool handlers are async, so tests are
  too.
- **Per-test fixture copies** — any mutation test copies
  `tests/fixtures/tiny_project/` into `tmp_path` via `shutil.copytree`
  so the canonical fixture stays clean between tests.
- **SDK-gated tests** — `tests/test_gui_backend.py` and anything that
  calls `get_lint_report` or launches a preview are module-skipped when
  `RENPY_SDK` is not set. CI/local-without-SDK still works; full
  coverage requires the SDK.
- **`parse()` helper** — decodes a tool's `list[TextContent]` response
  into the JSON payload; lives in `tests/conftest.py`. Every tier test
  imports it.
- **Writer assertions** — after a mutation, most tests read the
  resulting `.rpy` and assert on the bytes (not the diff), plus
  re-snapshot the index to confirm the new content parses back cleanly.

The suite runs in ~10 seconds (378 tests at time of writing). Keep it
that way: avoid fixtures that spawn real subprocesses when a mock will
do. The lifecycle tests monkey-patch `asyncio.create_subprocess_exec` to
spawn `sleep 30` instead of the real SDK, for example.

---

## 10. Non-goals (what this repo explicitly does NOT do)

- **Animations panel in the GUI.** Ren'Py's ATL is procedural enough
  that a multi-track timeline misrepresents how animations are actually
  authored. The stub panel that previously held a "deliberate stub"
  placeholder was removed in the Phase 2 panel collapse — it is gone,
  not hidden behind a feature flag. ATL authoring stays in the source
  files until someone proposes a UI shape that actually fits ATL.
- **Chat panel inside the GUI.** See §1 and §8 — the integration point
  is the file system; adding in-GUI chat creates a second axis and
  breaks the single-integration-point model.
- **Authoritative Ren'Py parse.** `ProjectIndex` is a pragmatic scanner,
  not a parser. If a write operation needs true syntactic reasoning, it
  should call Ren'Py itself via `get_lint_report` rather than pretending
  to know what Ren'Py knows.
- **File deletion via `apply_unified_diff`.** Deletion is a separate
  concern — the Tier 4 diff applier refuses `+++ /dev/null` hunks. When
  a delete tool ships, it will be Tier 2 or its own tier, with its own
  confirmation shape.
- **LLM calls from inside the server.** The server stamps structured
  `.rpy` changes; it does not generate stories, prompts, or images.
  Asset generation belongs to the harness driving this server — hermes
  has a fal image tool built in, other harnesses plug in their own. The
  filesystem is the handoff: the harness writes an image into
  `<project>/game/images/`, then calls `add_image_alias` to register it.

---

## 11. Extension ideas (for a future session or contributor)

These are recorded in approximate priority order. None are blocked on
anything but capacity. For larger directional bets (IDE-shaped features
informed by Vangard / Ren'IDE), see [ROADMAP.md](ROADMAP.md).

- **Delete-file tool** — once present, `apply_unified_diff` can drop
  its `+++ /dev/null` refusal.
- **Rename-label follow-through** — existing `rename_label` tool
  handles same-file; a cross-file variant would enable larger
  refactors.
- **Image upload / asset pipeline tooling** — the GUI currently has a
  narrow asset-upload endpoint; a Tier 2 tool for registering assets
  with Ren'Py would be more agent-friendly.

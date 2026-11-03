# Roadmap

Forward-looking notes for renpy-mcp's evolution from "MCP server with a
GUI client" toward a Ren'Py IDE with an MCP server inside. In-flight,
non-directional items live in [DESIGN.md §11](DESIGN.md). This file is
for the larger directional bets and the GUI-integration sequencing.

## Status as of 2026-04-24

| Phase | What | Status |
|---|---|---|
| 0  | `read_label_tree` + canvas-positions sidecar | **shipped** |
| 1a | Diagnostic foundation (invalid jumps, undefined/unused chars, refresh_project) | **shipped** |
| 1b | Asset/screen/reachability diagnostics + ignored-diagnostics suppression | **shipped** |
| 1c | Watcher self-write suppression (mark_self_write + response observer) | **shipped** |
| 2  | Themed shell (theme tokens, sidebar variants, Prefs modal, ⌘K palette) | **shipped** |
| 3a | View-only Story Map port (drop react-flow, native pointer events) | **shipped** |
| 3b | Editable Story Map (drag-to-rearrange, port-drag connect, toolbar + delete) | **shipped** |
| 4  | Inspector tree migration + 5 event tools (pause, setvar, show, with-effect, flash) | **shipped** |
| 5  | `warp_to` + `set_drafting_mode` (closes the iteration loop) | **shipped** |
| 6  | Choice View derived filter (`get_choice_graph` + panel) | **shipped** |
| 7  | Composers — Screen Layout, Stage, ImageMap, Menu | **shipped** |
| 8  | Translation surface + `build_distribution` | **shipped** |
| 9  | Monaco editor + semantic tokens | **tabled** (only worth it if the GUI becomes someone's primary surface) |

End-to-end validation lives at `scripts/integration_drive.py` (40-step
in-process drive) and `scripts/real_vn_drive.py` (drives a project that
ships real fal-generated assets all the way to a `<name>-<version>-pc.zip`
artifact with the assets baked in). 80 tools, 386 tests, no FAILs.

The integration point is still the file system; the GUI grows from a
panel set into a visual development environment, but every IDE feature
that touches `.rpy` bytes still routes through `apply_write` (DESIGN.md
§3) and every reading feature still derives from `ProjectIndex`
(DESIGN.md §4). No invariant moves.

This project is **agent-driven first**. Surfaces, panels, and tool names
are sequenced and named so a model forms one coherent mental model of
the system without disambiguating overlapping concepts. When two tools
or two views would cover the same data, default to one canonical
surface plus a derived filter — not parallel views.

---

## Reference: Vangard / Ren'IDE

[bluemoonfoundry/bmf-vangard-renpy-ide](https://github.com/bluemoonfoundry/bmf-vangard-renpy-ide)
is an Electron + React/TS Ren'Py IDE at v0.8.0 Public Beta 4, licensed
AGPL-3.0. It treats AI as an afterthought (encrypted API key storage and
nothing else), but its analysis pipeline, editable graph, visual
composers, warp flow, and watcher discipline are exactly what an IDE
*with* a first-class MCP server wants under the hood.

**License note:** This project relicensed from MIT to AGPL-3.0-or-later
to make code-level adaptation from Vangard legally clean. Phase 1
onward can borrow translated implementations directly without a
separate license grant; attribution to upstream files in commit
messages is still expected.

What we're learning from it, filtered through our invariants:

- The same `ProjectIndex`-shaped data feeds the editable graph (label
  nodes with kind badges) and a player-facing menu walkthrough; we
  already index that data, we just need to render it two ways.
- Their validator (`lib/renpyValidator.ts`) enumerates the diagnostics
  agents trip over. Each one is a Phase 1 read for us.
- Warp + drafting mode + run-as-child-process is the AI-native iteration
  loop. We have lifecycle (`launch_preview`); warp closes the rest.
- Composer panels (Scene, ImageMap, Screen Layout, Menu) are typed-tree
  → code generators. They map onto Tier 3 intents that consume the tree
  and emit one Ren'Py construct.
- Their file watcher suppresses self-writes for 3 seconds; ours
  (`watcher.py`) should do the same so agent writes don't echo as
  external changes.

**Vangard has three canvases (project / flow / choices). We collapse to
two surfaces:** Story Map (one node per label, kind badges, editable,
positions persist) and Choice View (derived filter walked from `menu`
nodes outward, player perspective). One agent-facing concept for the
graph, one specialized derivation. A file-level zoom-out can land later
as a rendering mode of Story Map if anyone asks; it is not load-bearing.

---

## Outstanding bets

Phases 0–8 shipped; their per-phase rationale lives in commit history
and the architectural pieces they touched are documented in
[DESIGN.md](DESIGN.md). The remaining directional bet:

### Phase 9 (tabled) — Monaco + semantic tokens

Only worth it if the GUI becomes someone's primary authoring surface.
Tabled until a user explicitly asks for it.

---

## Explicitly NOT copying from Vangard

Recording these here so the question doesn't get re-litigated:

- **API key storage / encrypted credentials in the IDE.** The server
  doesn't call LLMs (DESIGN.md §1, non-goal #5). The harness owns
  credentials.
- **In-GUI chat panel.** Already a non-goal (DESIGN.md §1, §8). Vangard
  doesn't have one either, but agents-meet-IDE products often grow one;
  we're committed to keeping the harness as the only authoring surface.
- **Authoritative Ren'Py parser.** Vangard's analysis is also a
  pragmatic scanner, not a true parse — we're aligned. If a feature
  needs real syntactic reasoning, route it through `get_lint_report`.
- **Three parallel canvases (project / flow / choices).** Collapsed to
  Story Map + Choice View per the consistent-understanding rule above.
- **Cosmetic surface area** — 11 themes, custom audio player with EQ
  visualization, first-run tutorial with SVG spotlights, sticky notes
  in 6 colors. Pick up as time allows; don't sequence work around them.


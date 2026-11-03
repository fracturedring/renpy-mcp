# Quick Start

You want to make a visual novel and you've heard "AI" or "MCP" somewhere
but it's all a fog. This page walks you from a blank computer to "I'm
playing my own VN" in about 15 minutes.

If you already know what an MCP server is and just want install
instructions, [README.md](README.md) is shorter.

---

## What this thing actually is

Three pieces, all working together:

1. **[Ren'Py](https://www.renpy.org)** — the actual game engine. You
   download it like any other program. It runs your finished visual
   novel in a window.
2. **renpy-mcp** — a small program that *speaks to other programs* on
   your behalf. It edits Ren'Py's text-based source files for you,
   correctly, so you don't have to learn the syntax.
3. **The RPBuilder GUI** — a browser-based editor that uses renpy-mcp
   under the hood. You see a Story Map, click nodes, type dialogue.
   No code visible.

You only ever interact with the GUI (or with an AI assistant — more on
that below). The GUI talks to renpy-mcp; renpy-mcp talks to Ren'Py.

---

## What you need before starting

Three downloads. Total disk space: about 1 GB.

| Tool | What it is | Where |
|---|---|---|
| **Ren'Py SDK** | The game engine + project template. | <https://www.renpy.org/latest.html> — pick the SDK for your operating system. |
| **Python 3.10+** | Programming language. renpy-mcp is written in it. | <https://www.python.org/downloads/> — installer for your OS. |
| **Node.js 18+** | Needed to build the GUI's frontend (a one-time step). | <https://nodejs.org/> — pick the LTS version. |

You don't need to learn any of these. You just need them installed.

If you're on macOS or Linux, you might already have Python 3 and Node
— check by running `python3 --version` and `node --version` in a
terminal. If both print numbers, skip the installs.

---

## Path A: Just the editor (no AI)

This gets you a working visual novel editor running in your browser.
You'll be able to make a small VN by clicking and typing.

### Step 1 — Get renpy-mcp

```bash
git clone https://github.com/fracturedring/renpy-mcp.git
cd renpy-mcp
```

If you don't have `git`, download the [zip from
GitHub](https://github.com/fracturedring/renpy-mcp/archive/refs/heads/main.zip),
unzip it, and `cd` into the unzipped folder.

### Step 2 — Install Python dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .\.venv\Scripts\activate          # Windows PowerShell
pip install -e ".[gui]"
```

The `.venv` is an isolated Python environment — like a workspace just
for this project. `pip install -e ".[gui]"` pulls in everything
renpy-mcp needs, plus the GUI server.

On Windows, run the `gui/*.sh` scripts from **Git Bash** (it ships with
Git for Windows), not `cmd` or PowerShell. The scripts find the Windows
venv layout on their own, so the only thing that changes from the
macOS/Linux steps below is which terminal you type them into.

### Step 3 — Run the launcher

```bash
gui/launch.sh
```

That script:

1. Creates the Python virtualenv if it's missing.
2. Installs `renpy-mcp[gui]` if it's missing.
3. Builds the editor's frontend if it's missing (one-time, needs `npm`).
4. **Runs the launcher in your terminal.** It narrates each step so
   nothing happens off-screen.

The launcher does this:

```
1. Ren'Py SDK
─────────────
  scanning common folders for a Ren'Py SDK…
  ✓ found 1 SDK(s) on disk:
    1. /home/you/renpy-sdk
  Choose an SDK number, or (d)ownload latest from renpy.org,
  (p)aste a path, (q)uit:
```

If a Ren'Py SDK is sitting in any obvious place — `~/renpy-sdk`,
`~/Downloads/renpy-8.4.2-sdk`, `~/Desktop/`, `/opt/`, etc. — the
launcher finds it for you. If nothing's there:

- **`d` — download.** The launcher reaches out to renpy.org, finds the
  current version, asks you where to install (default
  `~/renpy-sdk/`), then streams + extracts the archive with a progress
  bar. The downloaded SDK is saved to your config so you only do this
  once.
- **`p` — paste.** Type or paste the full path to an existing SDK
  folder (the one with `renpy.sh` or `renpy.exe` inside).
- **`q` — quit.** Cancel the launcher.

Then the project picker:

```
2. Project
──────────
    1. /home/you/games/lighthouse_keeper
    2. /home/you/games/coffee_shop
    3. <browse for an existing project>
    4. <start a new project here>
```

Recent projects show first; press a number to jump straight in.
Choosing *new* creates a minimum runnable skeleton at the path you
specify.

After both choices, the launcher saves them and hands off to the editor
server. The terminal stays open showing log lines — close it (or hit
Ctrl-C) to stop the server.

You can also run `rpbuilder` directly from the activated venv after
`pip install -e ".[gui]"` — same flow.

#### Where the launcher remembers your choices

- Linux/macOS: `~/.config/renpy-mcp/launcher.json`
- Windows: `%APPDATA%\renpy-mcp\launcher.json`

Plain JSON — edit it by hand if you ever need to.

### Step 4 — Make something

You'll see the RPBuilder editor. The left rail has Story Map, Choice
View, Characters, Assets, and a few others. Click around; everything
updates in real time. The header has a **Preview** button — when you
click it, Ren'Py will open in a separate window playing your VN.

Try this in order:

1. **Characters** → add a character (give them a name and a color).
2. **Story Map** → click "+ Scene" in the toolbar to make your first
   scene label. Click on the new node to open it in the right-side
   Inspector.
3. **Inspector** → type some dialogue using the "Add a dialogue line"
   form. Pick the character you just made.
4. **Story Map** → click "+ Choice" to make a choice node. Drag a port
   (the small "+" on the right edge of a node) from the choice node
   to a target scene to wire up a branch.
5. **Header** → hit Preview. Ren'Py opens. Play through your scene.

That's the loop. Keep adding scenes, characters, and branches. The
**Composers** panel has visual editors for screens, stages (multiple
sprites at once), and image-map menus when you want them.

### Stuck?

- The browser shows nothing? Make sure `gui/launch.sh` is still running
  in your terminal. Closing the terminal closes the editor.
- "Preview" button does nothing? Check the terminal where `gui/launch.sh`
  is running for errors. Usually the SDK path is wrong.
- The lint button under **Build** shows red errors? Click on each
  error — it'll tell you what's wrong. Usually it's a typo in a label
  name.

---

## Path B: Editor + AI assistant

Same setup as Path A, **plus** you point an AI assistant at the same
project. The AI does the typing; you supervise.

The AI assistant needs to be one that speaks **MCP** (Model Context
Protocol). Currently working ones:

- [Claude Code](https://docs.claude.com/claude-code) — Anthropic's
  CLI, works on macOS / Linux / Windows.
- [Cursor](https://cursor.sh) — code editor with a built-in AI
  panel that supports MCP.
- hermes-agent — a CLI orchestrator from NousResearch.

### Step 1 — Set up Path A first

Get the GUI running through Path A above. Don't close that terminal.

### Step 2 — Tell the AI assistant about renpy-mcp

For Claude Code, in the project directory create a file called
`.mcp.json` with this content:

```json
{
  "mcpServers": {
    "renpy": {
      "type": "stdio",
      "command": "/path/to/renpy-mcp/.venv/bin/python",
      "args": [
        "-m", "renpy_mcp",
        "--project", "/path/to/your/project",
        "--sdk", "/path/to/your/renpy-sdk"
      ]
    }
  }
}
```

Replace the three paths with real ones. Claude Code will detect this
file when it starts and your AI session will have access to all 80
renpy-mcp tools (named `mcp__renpy__add_say`, `mcp__renpy__create_scene`,
and so on).

### Step 3 — Talk to the AI

Open Claude Code in the same directory and tell it what you want. Try:

> "Make a short visual novel about a lighthouse keeper meeting a selkie.
> Three scenes, one choice that branches into two endings."

Watch the GUI in your browser. You'll see scenes appear on the Story
Map as the AI creates them. The file watcher updates the editor
without needing a refresh.

When the AI finishes, click **Preview** in the GUI. The VN runs.

### What the AI is reading

Two things tell the AI how to do this well:

- [AGENTS.md](AGENTS.md) — the playbook. AI assistants read this on
  startup so they know the right tool order.
- [MEDIA.md](MEDIA.md) — what makes a media file Ren'Py-compatible
  (formats, naming, dimensions, style direction). The AI consults
  this before generating images or audio.

You don't have to read those — but if the AI does something weird,
peek at AGENTS.md to see what it was supposed to do.

---

## Path C: Pure AI, no GUI

Same as Path B but skip step 1. The AI does everything in the
terminal. You only see the finished game when you tell it to launch
the preview.

Best for "I want a VN to exist and I don't care to watch it being
made." Slowest part is the AI's own thinking; the actual editing is
instant.

---

## Where to keep things

renpy-mcp expects this directory layout:

```
~/where-you-keep-projects/
├── games/
│   ├── lighthouse_keeper/      # one Ren'Py project per folder
│   │   └── game/
│   │       ├── script.rpy      # Ren'Py source — do NOT edit by hand
│   │       ├── images/         # PNG/JPG backgrounds + sprites
│   │       └── audio/          # OGG music + SFX
│   └── another_project/
└── renpy-sdk/                  # the engine, downloaded earlier
```

The `games/` folder is the convention. Each subfolder is one VN. The
GUI and AI both create new ones via the **`new_project`** action.

---

## Going further

- Want to make your own art? **[MEDIA.md](MEDIA.md)** covers the four
  invariants (format / dimensions / filename / directory) plus
  VN-shaped style direction. Provider-agnostic — works whether you're
  using fal-ai, Stable Diffusion, hand-painting, or commissioning.
- Want to understand what the AI is doing under the hood? Pop open
  **[AGENTS.md](AGENTS.md)** for the tool playbook and
  **[DESIGN.md](DESIGN.md)** for the architecture.
- Want to peek at the production status? **[ROADMAP.md](ROADMAP.md)**
  shows everything that's shipped (Phases 0–8) and the one tabled
  feature (Monaco editor) waiting on demand.

---

## Licensing note

Ren'Py is BSD-licensed; the VNs you produce with it are yours to
license however you want. renpy-mcp itself is AGPL-3.0 — that only
constrains you if you fork the server or run it as a hosted service
for other people.

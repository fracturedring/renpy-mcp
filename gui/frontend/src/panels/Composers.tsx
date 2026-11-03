/**
 * Composer components — typed-tree visual generators.
 *
 * Each composer takes a typed JSON tree and emits a single Ren'Py
 * construct via its matching MCP tool. The components used to live in
 * a single "Composers" left-rail panel; Phase 2 split them across
 * their natural homes:
 *
 *   - ScreenLayoutComposer  → Library > Screens tab
 *   - ImageMapComposer      → Library > Screens tab
 *   - StageComposer         → Inspector > Insert event > Stage
 *   - MenuComposer          → Inspector > Insert event > Menu
 *
 * They're exported individually so the new homes can render them
 * directly. Internal helpers (ComposerSection / FieldLabel /
 * ComposerActions / ComposerOutcome) stay file-local.
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layers, FileText, ImageIcon, GitBranch, Plus, X } from "lucide-react";
import { api } from "@/api/client";
import type { LabelInfo } from "@/api/types";
import { useI18n } from "@/i18n";

// Starter trees are project content: they land in the user's .rpy files
// verbatim, so they are never translated.
const SCREEN_LAYOUT_STARTER = `{
  "kind": "vbox",
  "props": { "xalign": 0.5, "spacing": 10 },
  "children": [
    { "kind": "text", "text": "Hello from the composer" },
    { "kind": "textbutton", "text": "Continue", "action": "Return()" }
  ]
}`;

export function ScreenLayoutComposer() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [file, setFile] = useState("");
  const [tree, setTree] = useState(SCREEN_LAYOUT_STARTER);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary?: string;
    file?: string;
    diff?: string;
  } | null>(null);

  const compose = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      let parsed: unknown;
      try {
        parsed = JSON.parse(tree);
      } catch (exc) {
        throw new Error(
          t("inspector.treeJsonInvalid", { message: (exc as Error).message }),
        );
      }
      const body: Record<string, unknown> = { name, root: parsed };
      if (file.trim()) body.file = file.trim();
      const data = await api<{
        summary?: string;
        file?: string;
        diff?: string;
        error?: string;
      }>("/api/composers/screen-layout", { method: "POST", json: body });
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setReport(data),
    onError: (err) => setError(String(err)),
  });

  const ready = name.trim().length > 0 && tree.trim().length > 0;

  return (
    <section className="bg-card border border-line rounded-lg overflow-hidden">
      <header className="px-4 py-3 border-b border-line bg-cardAlt/40 flex items-baseline gap-2">
        <FileText className="w-4 h-4 text-ink3" />
        <h2 className="font-serif text-base text-ink">
          {t("inspector.screenLayoutComposer")}
        </h2>
        <span className="text-[10px] font-mono text-ink3 ml-auto">
          add_screen_layout
        </span>
      </header>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-ink3 mb-1 inline-block">
              {t("inspector.screenName")}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="title_card"
              className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink3 mb-1 inline-block">
              {t("inspector.targetFileOptional")}
            </span>
            <input
              value={file}
              onChange={(e) => setFile(e.target.value)}
              placeholder="game/screens.rpy"
              className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-ink3 mb-1 inline-block">
            {t("inspector.widgetTree")}
          </span>
          <textarea
            value={tree}
            onChange={(e) => setTree(e.target.value)}
            spellCheck={false}
            rows={14}
            className="w-full px-2 py-1.5 border border-line rounded text-xs font-mono bg-card text-ink leading-relaxed"
          />
          <p className="text-[10px] font-mono text-ink3 mt-1">
            {t("inspector.containerKinds")} <code>vbox</code> · <code>hbox</code> ·{" "}
            <code>frame</code> · <code>button</code>
            {t("inspector.hintGroupSeparator")}
            {t("inspector.leaves")} <code>text</code> · <code>textbutton</code> ·{" "}
            <code>spacer</code>
            {t("inspector.hintEnd")}
          </p>
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={() => compose.mutate()}
            disabled={!ready || compose.isPending}
            className="px-3 py-1.5 rounded text-sm text-white disabled:opacity-50"
            style={{ background: "var(--rp-accent)" }}
          >
            {compose.isPending ? t("inspector.composing") : t("inspector.composeScreen")}
          </button>
          <button
            onClick={() => setTree(SCREEN_LAYOUT_STARTER)}
            className="px-3 py-1.5 rounded text-sm border border-line text-ink2 hover:bg-cardAlt"
          >
            {t("inspector.resetTemplate")}
          </button>
        </div>

        {error && (
          <div className="border border-rose-200 bg-rose-50 rounded p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {report && (
          <div className="border border-line rounded overflow-hidden">
            <header className="px-3 py-1.5 bg-cardAlt/40 border-b border-line flex items-center justify-between text-xs">
              <span className="font-medium text-ink">{report.summary}</span>
              {report.file && (
                <span className="font-mono text-ink3">{report.file}</span>
              )}
            </header>
            {report.diff && (
              <pre className="bg-ink text-card font-mono p-3 text-[11px] overflow-auto max-h-64 leading-relaxed">
                {report.diff}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Stage Composer ----------------------------------------------------

interface SpriteRow {
  tag: string;
  expression: string;
  position: string;
}

const EMPTY_SPRITE: SpriteRow = { tag: "", expression: "", position: "" };

export function StageComposer() {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [background, setBackground] = useState("");
  const [transition, setTransition] = useState("");
  const [sprites, setSprites] = useState<SpriteRow[]>([{ ...EMPTY_SPRITE }]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary?: string;
    file?: string;
    diff?: string;
  } | null>(null);

  const labelsQ = useQuery({
    queryKey: ["labels"],
    queryFn: () => api<{ labels: LabelInfo[] }>("/api/labels"),
  });

  const updateSprite = (idx: number, patch: Partial<SpriteRow>) =>
    setSprites((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addSprite = () => setSprites((rows) => [...rows, { ...EMPTY_SPRITE }]);
  const removeSprite = (idx: number) =>
    setSprites((rows) => rows.filter((_, i) => i !== idx));

  const compose = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      const filteredSprites = sprites
        .filter((s) => s.tag.trim())
        .map((s) => {
          const sprite: Record<string, string> = { tag: s.tag.trim() };
          if (s.expression.trim()) sprite.expression = s.expression.trim();
          if (s.position.trim()) sprite.position = s.position.trim();
          return sprite;
        });
      const body: Record<string, unknown> = { label };
      if (background.trim()) body.background = background.trim();
      if (filteredSprites.length) body.sprites = filteredSprites;
      if (transition.trim()) body.transition = transition.trim();
      const data = await api<{
        summary?: string;
        file?: string;
        diff?: string;
        error?: string;
      }>("/api/composers/stage", { method: "POST", json: body });
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setReport(data),
    onError: (err) => setError(String(err)),
  });

  const ready = label.trim().length > 0;
  return (
    <ComposerSection
      icon={<Layers className="w-4 h-4 text-ink3" />}
      title={t("inspector.stageComposer")}
      toolName="add_stage"
    >
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel text={t("inspector.targetLabel")}>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          >
            <option value="">{t("inspector.selectLabel")}</option>
            {(labelsQ.data?.labels ?? []).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel text={t("inspector.background")}>
          <input
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="bg park"
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          />
        </FieldLabel>
      </div>

      <FieldLabel text={t("inspector.sprites")}>
        <div className="space-y-1.5">
          {sprites.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
              <input
                value={s.tag}
                onChange={(e) => updateSprite(i, { tag: e.target.value })}
                placeholder={t("inspector.spriteTagPlaceholder")}
                className="px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
              />
              <input
                value={s.expression}
                onChange={(e) => updateSprite(i, { expression: e.target.value })}
                placeholder={t("inspector.spriteExpressionPlaceholder")}
                className="px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
              />
              <input
                value={s.position}
                onChange={(e) => updateSprite(i, { position: e.target.value })}
                placeholder={t("inspector.spritePositionPlaceholder")}
                className="px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
              />
              <button
                onClick={() => removeSprite(i)}
                disabled={sprites.length === 1}
                className="p-1 text-ink3 hover:text-rose-600 disabled:opacity-30"
                title={t("inspector.removeSprite")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addSprite}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line text-xs text-ink3 hover:text-ink"
          >
            <Plus className="w-3 h-3" />
            {t("inspector.addSprite")}
          </button>
        </div>
      </FieldLabel>

      <FieldLabel text={t("inspector.transitionOptional")}>
        <input
          value={transition}
          onChange={(e) => setTransition(e.target.value)}
          placeholder="dissolve"
          className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
        />
      </FieldLabel>

      <ComposerActions
        ready={ready}
        pending={compose.isPending}
        onCompose={() => compose.mutate()}
        onReset={() => {
          setLabel("");
          setBackground("");
          setTransition("");
          setSprites([{ ...EMPTY_SPRITE }]);
        }}
        composeLabel={t("inspector.composeStage")}
      />

      <ComposerOutcome error={error} report={report} />
    </ComposerSection>
  );
}

// ---------- ImageMap Composer -------------------------------------------------

interface HotspotRow {
  x: string;
  y: string;
  w: string;
  h: string;
  action: string;
}

const EMPTY_HOTSPOT: HotspotRow = { x: "0", y: "0", w: "100", h: "50", action: "" };

export function ImageMapComposer() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [ground, setGround] = useState("");
  const [hover, setHover] = useState("");
  const [file, setFile] = useState("");
  const [hotspots, setHotspots] = useState<HotspotRow[]>([{ ...EMPTY_HOTSPOT }]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary?: string;
    file?: string;
    diff?: string;
  } | null>(null);

  const updateHs = (idx: number, patch: Partial<HotspotRow>) =>
    setHotspots((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addHs = () => setHotspots((rows) => [...rows, { ...EMPTY_HOTSPOT }]);
  const removeHs = (idx: number) =>
    setHotspots((rows) => rows.filter((_, i) => i !== idx));

  const compose = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      const cleaned = hotspots
        .filter((h) => h.action.trim())
        .map((h) => ({
          x: parseFloat(h.x) || 0,
          y: parseFloat(h.y) || 0,
          w: parseFloat(h.w) || 0,
          h: parseFloat(h.h) || 0,
          action: h.action.trim(),
        }));
      if (cleaned.length === 0)
        throw new Error(t("inspector.hotspotActionRequired"));
      const body: Record<string, unknown> = {
        name,
        ground: ground.trim(),
        hover: hover.trim(),
        hotspots: cleaned,
      };
      if (file.trim()) body.file = file.trim();
      const data = await api<{
        summary?: string;
        file?: string;
        diff?: string;
        error?: string;
      }>("/api/composers/imagemap", { method: "POST", json: body });
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setReport(data),
    onError: (err) => setError(String(err)),
  });

  const ready = name.trim() && ground.trim() && hover.trim();
  return (
    <ComposerSection
      icon={<ImageIcon className="w-4 h-4 text-ink3" />}
      title={t("inspector.imagemapComposer")}
      toolName="add_imagemap"
    >
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel text={t("inspector.screenName")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="title_pick"
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          />
        </FieldLabel>
        <FieldLabel text={t("inspector.targetFileOptional")}>
          <input
            value={file}
            onChange={(e) => setFile(e.target.value)}
            placeholder="game/screens.rpy"
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          />
        </FieldLabel>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldLabel text={t("inspector.groundImage")}>
          <input
            value={ground}
            onChange={(e) => setGround(e.target.value)}
            placeholder="gui/title_idle.png"
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          />
        </FieldLabel>
        <FieldLabel text={t("inspector.hoverImage")}>
          <input
            value={hover}
            onChange={(e) => setHover(e.target.value)}
            placeholder="gui/title_hover.png"
            className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
          />
        </FieldLabel>
      </div>

      <FieldLabel text={t("inspector.hotspots")}>
        <div className="space-y-1.5">
          {hotspots.map((h, i) => (
            <div
              key={i}
              className="grid grid-cols-[3rem_3rem_3rem_3rem_1fr_auto] gap-1.5"
            >
              {(["x", "y", "w", "h"] as const).map((coord) => (
                <input
                  key={coord}
                  value={h[coord]}
                  onChange={(e) => updateHs(i, { [coord]: e.target.value })}
                  placeholder={coord}
                  className="px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
                />
              ))}
              <input
                value={h.action}
                onChange={(e) => updateHs(i, { action: e.target.value })}
                placeholder='Jump("scene")'
                className="px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
              />
              <button
                onClick={() => removeHs(i)}
                disabled={hotspots.length === 1}
                className="p-1 text-ink3 hover:text-rose-600 disabled:opacity-30"
                title={t("inspector.removeHotspot")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addHs}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line text-xs text-ink3 hover:text-ink"
          >
            <Plus className="w-3 h-3" />
            {t("inspector.addHotspot")}
          </button>
        </div>
      </FieldLabel>

      <ComposerActions
        ready={!!ready}
        pending={compose.isPending}
        onCompose={() => compose.mutate()}
        onReset={() => {
          setName("");
          setGround("");
          setHover("");
          setFile("");
          setHotspots([{ ...EMPTY_HOTSPOT }]);
        }}
        composeLabel={t("inspector.composeImagemap")}
      />

      <ComposerOutcome error={error} report={report} />
    </ComposerSection>
  );
}

// ---------- Menu Composer -----------------------------------------------------
//
// No new tool — this section just calls the existing `/api/labels/{name}/menu`
// endpoint (which forwards to `add_menu`). The composer panel exists to keep
// the four ROADMAP composers visually together in one place.

interface ChoiceRow {
  text: string;
  condition: string;
  body: string;
}

const EMPTY_CHOICE: ChoiceRow = { text: "", condition: "", body: "pass" };

export function MenuComposer() {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [choices, setChoices] = useState<ChoiceRow[]>([{ ...EMPTY_CHOICE }]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary?: string;
    file?: string;
    diff?: string;
  } | null>(null);

  const labelsQ = useQuery({
    queryKey: ["labels"],
    queryFn: () => api<{ labels: LabelInfo[] }>("/api/labels"),
  });

  const updateChoice = (idx: number, patch: Partial<ChoiceRow>) =>
    setChoices((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addChoice = () => setChoices((rows) => [...rows, { ...EMPTY_CHOICE }]);
  const removeChoice = (idx: number) =>
    setChoices((rows) => rows.filter((_, i) => i !== idx));

  const compose = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      const cleaned = choices
        .filter((c) => c.text.trim())
        .map((c) => {
          const ch: Record<string, unknown> = { text: c.text.trim() };
          if (c.condition.trim()) ch.condition = c.condition.trim();
          // body is a multi-line string; split on newlines, trim each.
          const lines = c.body
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          ch.body = lines.length ? lines : ["pass"];
          return ch;
        });
      if (cleaned.length === 0) throw new Error(t("inspector.choiceTextRequired"));
      const data = await api<{
        summary?: string;
        file?: string;
        diff?: string;
        error?: string;
      }>(`/api/labels/${encodeURIComponent(label)}/menu`, {
        method: "POST",
        json: { choices: cleaned },
      });
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setReport(data),
    onError: (err) => setError(String(err)),
  });

  const ready = label.trim().length > 0;
  return (
    <ComposerSection
      icon={<GitBranch className="w-4 h-4 text-ink3" />}
      title={t("inspector.menuComposer")}
      toolName="add_menu"
    >
      <FieldLabel text={t("inspector.targetLabel")}>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-2 py-1.5 border border-line rounded text-sm font-mono bg-card text-ink"
        >
          <option value="">{t("inspector.selectLabel")}</option>
          {(labelsQ.data?.labels ?? []).map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel text={t("inspector.choices")}>
        <div className="space-y-2">
          {choices.map((c, i) => (
            <div
              key={i}
              className="border border-line rounded p-2 grid grid-cols-[1fr_auto] gap-2"
            >
              <div className="space-y-1">
                <input
                  value={c.text}
                  onChange={(e) => updateChoice(i, { text: e.target.value })}
                  placeholder={t("inspector.choiceTextPlaceholder")}
                  className="w-full px-2 py-1 border border-line rounded text-xs bg-card text-ink"
                />
                <input
                  value={c.condition}
                  onChange={(e) => updateChoice(i, { condition: e.target.value })}
                  placeholder={t("inspector.choiceConditionPlaceholder")}
                  className="w-full px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
                />
                <textarea
                  value={c.body}
                  onChange={(e) => updateChoice(i, { body: e.target.value })}
                  placeholder={t("inspector.choiceBodyPlaceholder")}
                  rows={2}
                  className="w-full px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
                />
              </div>
              <button
                onClick={() => removeChoice(i)}
                disabled={choices.length === 1}
                className="p-1 text-ink3 hover:text-rose-600 disabled:opacity-30 self-start"
                title={t("inspector.removeChoice")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addChoice}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-line text-xs text-ink3 hover:text-ink"
          >
            <Plus className="w-3 h-3" />
            {t("inspector.addChoice")}
          </button>
        </div>
      </FieldLabel>

      <ComposerActions
        ready={ready}
        pending={compose.isPending}
        onCompose={() => compose.mutate()}
        onReset={() => {
          setLabel("");
          setChoices([{ ...EMPTY_CHOICE }]);
        }}
        composeLabel={t("inspector.composeMenu")}
      />

      <ComposerOutcome error={error} report={report} />
    </ComposerSection>
  );
}

// ---------- shared section/action/outcome primitives -------------------------

function ComposerSection({
  icon,
  title,
  toolName,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  toolName: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-line rounded-lg overflow-hidden">
      <header className="px-4 py-3 border-b border-line bg-cardAlt/40 flex items-baseline gap-2">
        {icon}
        <h2 className="font-serif text-base text-ink">{title}</h2>
        <span className="text-[10px] font-mono text-ink3 ml-auto">{toolName}</span>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink3 mb-1 inline-block">{text}</span>
      {children}
    </label>
  );
}

function ComposerActions({
  ready,
  pending,
  onCompose,
  onReset,
  composeLabel,
}: {
  ready: boolean;
  pending: boolean;
  onCompose: () => void;
  onReset: () => void;
  composeLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCompose}
        disabled={!ready || pending}
        className="px-3 py-1.5 rounded text-sm text-white disabled:opacity-50"
        style={{ background: "var(--rp-accent)" }}
      >
        {pending ? t("inspector.composing") : composeLabel}
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1.5 rounded text-sm border border-line text-ink2 hover:bg-cardAlt"
      >
        {t("inspector.reset")}
      </button>
    </div>
  );
}

function ComposerOutcome({
  error,
  report,
}: {
  error: string | null;
  report: { summary?: string; file?: string; diff?: string } | null;
}) {
  if (!error && !report) return null;
  if (error) {
    return (
      <div className="border border-rose-200 bg-rose-50 rounded p-3 text-xs text-rose-700">
        {error}
      </div>
    );
  }
  return (
    <div className="border border-line rounded overflow-hidden">
      <header className="px-3 py-1.5 bg-cardAlt/40 border-b border-line flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{report?.summary}</span>
        {report?.file && <span className="font-mono text-ink3">{report.file}</span>}
      </header>
      {report?.diff && (
        <pre className="bg-ink text-card font-mono p-3 text-[11px] overflow-auto max-h-64 leading-relaxed">
          {report.diff}
        </pre>
      )}
    </div>
  );
}

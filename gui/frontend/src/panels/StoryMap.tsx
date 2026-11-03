/**
 * Story Map — editable canvas (Phase 3b).
 *
 * Built on the Phase 3a view-only port. New surface area:
 *
 *   - Drag a node card to rearrange it; positions persist via a
 *     debounced `set_canvas_positions` (400ms idle).
 *   - Toolbar adds new labels: Scene (`add_label`), Choice (`add_label`
 *     + `add_menu`), Ending (`add_label` with body=`["return"]`).
 *   - Delete button + Backspace key remove the selected node via
 *     `delete_label`. Incoming-reference rejections surface as a banner
 *     so the agent or user can rewire first.
 *   - Port handle on the right edge of every non-ending node;
 *     drag-to-connect creates either a `jump` (scene/start sources)
 *     or a `menu_branch` (choice sources) on drop.
 *
 * Selection still opens the existing Scene Inspector. Native pointer
 * events for all drag paths so the surface stays responsive on big
 * graphs (Vangard's perf note).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MinusCircle, GitBranch, FlagOff, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { usePrefs } from "@/lib/usePrefs";
import { useI18n, type I18n } from "@/i18n";
import type {
  BranchGraph,
  BranchGraphEdge,
  BranchGraphNode,
  CanvasPositions,
  LabelKind,
} from "@/api/types";

interface NodeRender extends BranchGraphNode {
  x: number;
  y: number;
}

interface Dims {
  nodeW: number;
  nodeH: number;
  fontHead: number;
  fontMeta: number;
}

const DENSITY: Record<string, Dims> = {
  compact: { nodeW: 156, nodeH: 64, fontHead: 13, fontMeta: 10 },
  regular: { nodeW: 188, nodeH: 80, fontHead: 14, fontMeta: 11 },
  roomy: { nodeW: 220, nodeH: 96, fontHead: 16, fontMeta: 11 },
};

// ms of idle drag before positions are saved.
const POSITION_SAVE_DEBOUNCE = 400;

export function StoryMap({
  selectedLabel,
  onSelectLabel,
}: {
  selectedLabel: string | null;
  onSelectLabel: (name: string | null) => void;
}) {
  const { t } = useI18n();
  const { prefs } = usePrefs();
  const dims = DENSITY[prefs.density] ?? DENSITY.regular;
  const qc = useQueryClient();

  const graph = useQuery({
    queryKey: ["graph"],
    queryFn: () => api<BranchGraph>("/api/graph"),
  });
  const positionsQ = useQuery({
    queryKey: ["canvas-positions"],
    queryFn: () => api<CanvasPositions>("/api/canvas-positions"),
  });

  // Local node state — seeded from graph + positions, then mutated during
  // drags. The initial seed re-runs whenever the upstream queries change
  // (a watcher event invalidates `graph`), so external edits flow in.
  const [nodes, setNodes] = useState<NodeRender[]>([]);
  useEffect(() => {
    if (!graph.data) return;
    setNodes(layoutNodes(graph.data.nodes, positionsQ.data?.labels ?? {}, dims));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.data, positionsQ.data]);

  const bounds = useMemo(() => computeBounds(nodes), [nodes]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panDragRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const nodeDragRef = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fit-on-first-render once we have data.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || !containerRef.current || nodes.length === 0) return;
    const r = containerRef.current.getBoundingClientRect();
    const fit = Math.min(r.width / bounds.W, r.height / bounds.H, 1) * 0.92;
    setZoom(fit);
    setPan({
      x: (r.width - bounds.W * fit) / 2 - bounds.minX * fit,
      y: (r.height - bounds.H * fit) / 2 - bounds.minY * fit,
    });
    didFitRef.current = true;
  }, [nodes, bounds]);

  // Re-fit when density changes — node rectangle sizes shift.
  useEffect(() => {
    didFitRef.current = false;
  }, [prefs.density]);

  // ---------- mutations ----------

  const savePositions = useMutation({
    mutationFn: (positions: Record<string, { x: number; y: number }>) =>
      api("/api/canvas-positions", {
        method: "POST",
        json: { positions },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canvas-positions"] }),
  });

  const debounceTimer = useRef<number | null>(null);
  const queuePositionSave = (next: NodeRender[]) => {
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const n of next) positions[n.id] = { x: n.x, y: n.y };
      savePositions.mutate(positions);
      debounceTimer.current = null;
    }, POSITION_SAVE_DEBOUNCE);
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["graph"] });
    qc.invalidateQueries({ queryKey: ["labels"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const handleApiResult = (data: { error?: string; references?: unknown }) => {
    if (data?.error) {
      const refs = Array.isArray(data.references)
        ? data.references.length === 1
          ? t("story.map.referencesOne", { count: data.references.length })
          : t("story.map.referencesMany", { count: data.references.length })
        : "";
      setError(data.error + refs);
      return false;
    }
    setError(null);
    refreshAll();
    return true;
  };

  const addScene = useMutation({
    mutationFn: () =>
      api<{ error?: string; summary?: string }>(
        `/api/labels/${encodeURIComponent(uniqueName("scene", nodes))}`,
        { method: "POST", json: { body: ["pass"] } },
      ),
    onSuccess: handleApiResult,
  });

  const addChoice = useMutation({
    mutationFn: async () => {
      // Label ids and the starter .rpy menu text are project data, so the
      // prefixes and the placeholder choice text stay untranslated.
      const name = uniqueName("choice", nodes);
      const created = await api<{ error?: string }>(
        `/api/labels/${encodeURIComponent(name)}`,
        { method: "POST", json: { body: ["pass"] } },
      );
      if (created.error) return created;
      // Compose a starter menu so the new label reads as a `choice` kind.
      return await api<{ error?: string }>(
        `/api/labels/${encodeURIComponent(name)}/menu`,
        { method: "POST", json: { choices: [{ text: "first option", body: ["pass"] }] } },
      );
    },
    onSuccess: handleApiResult,
  });

  const addEnding = useMutation({
    mutationFn: () =>
      api<{ error?: string }>(
        `/api/labels/${encodeURIComponent(uniqueName("ending", nodes))}`,
        { method: "POST", json: { body: ["return"] } },
      ),
    onSuccess: handleApiResult,
  });

  const deleteSelected = useMutation({
    mutationFn: async () => {
      if (!selectedLabel) return { error: t("story.map.nothingSelected") } as const;
      return await api<{ error?: string; references?: unknown }>(
        `/api/labels/${encodeURIComponent(selectedLabel)}`,
        { method: "DELETE" },
      );
    },
    onSuccess: (data) => {
      if (handleApiResult(data)) onSelectLabel(null);
    },
  });

  const connectNodes = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      const fromNode = nodes.find((n) => n.id === fromId);
      const isChoiceSource = (fromNode?.kind ?? "scene") === "choice";
      if (isChoiceSource) {
        return await api<{ error?: string }>(
          `/api/labels/${encodeURIComponent(fromId)}/menu-branches`,
          {
            method: "POST",
            json: { text: `to ${toId}`, body: [`jump ${toId}`] },
          },
        );
      }
      // Scene / start / ending → append a plain `jump <target>` to the
      // source label. Existing `add_jump` tool covers this.
      return await api<{ error?: string }>(
        `/api/labels/${encodeURIComponent(fromId)}/jumps`,
        { method: "POST", json: { target: toId } },
      );
    },
    onSuccess: handleApiResult,
  });

  // ---------- pointer handlers ----------

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-node]") || target.closest("[data-port]")) return;
    onSelectLabel(null);
    panDragRef.current = { x: e.clientX, y: e.clientY, pan };
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  };

  const clientToWorld = (clientX: number, clientY: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - r.left - pan.x) / zoom,
      y: (clientY - r.top - pan.y) / zoom,
    };
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (nodeDragRef.current) {
      const w = clientToWorld(e.clientX, e.clientY);
      const { id, ox, oy } = nodeDragRef.current;
      nodeDragRef.current.moved = true;
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, x: w.x - ox, y: w.y - oy } : n)),
      );
      return;
    }
    if (connecting) {
      const w = clientToWorld(e.clientX, e.clientY);
      setConnecting((c) => (c ? { ...c, x: w.x, y: w.y } : c));
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = el && (el as HTMLElement).closest("[data-node]");
      const id = nodeEl ? (nodeEl as HTMLElement).dataset.nodeid ?? null : null;
      setHoverTargetId(id && id !== connecting.fromId ? id : null);
      return;
    }
    if (panDragRef.current) {
      const dx = e.clientX - panDragRef.current.x;
      const dy = e.clientY - panDragRef.current.y;
      setPan({
        x: panDragRef.current.pan.x + dx,
        y: panDragRef.current.pan.y + dy,
      });
    }
  };

  const stopAllDrag = () => {
    if (nodeDragRef.current) {
      const moved = nodeDragRef.current.moved;
      nodeDragRef.current = null;
      if (moved) queuePositionSave(nodes);
    }
    if (connecting) {
      if (hoverTargetId) {
        connectNodes.mutate({ fromId: connecting.fromId, toId: hoverTargetId });
      }
      setConnecting(null);
      setHoverTargetId(null);
    }
    panDragRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const next = Math.max(0.3, Math.min(2.2, zoom * (1 + delta)));
    const r = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const k = next / zoom;
    setPan({ x: cx - (cx - pan.x) * k, y: cy - (cy - pan.y) * k });
    setZoom(next);
  };

  const startNodeDrag = (e: React.MouseEvent, node: NodeRender) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const w = clientToWorld(e.clientX, e.clientY);
    nodeDragRef.current = { id: node.id, ox: w.x - node.x, oy: w.y - node.y, moved: false };
    onSelectLabel(node.id);
  };

  const startConnect = (e: React.MouseEvent, node: NodeRender) => {
    e.stopPropagation();
    setConnecting({ fromId: node.id, x: node.x + dims.nodeW / 2, y: node.y });
  };

  // Backspace deletes the selected label when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (!selectedLabel) return;
      e.preventDefault();
      deleteSelected.mutate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLabel, deleteSelected]);

  if (graph.isLoading || positionsQ.isLoading) {
    return <div className="p-8 text-sm text-ink3">{t("story.map.loading")}</div>;
  }
  if (graph.error) {
    return (
      <div className="p-8 text-sm text-rose-600">
        {t("common.error")}: {String(graph.error)}
      </div>
    );
  }
  if (nodes.length === 0) {
    return <EmptyShell onAddScene={() => addScene.mutate()} error={error} setError={setError} />;
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-canvas"
      style={{ cursor: "grab" }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={stopAllDrag}
      onMouseLeave={stopAllDrag}
      onWheel={onWheel}
    >
      <GridBackground />
      <div
        className="absolute"
        style={{
          left: bounds.minX,
          top: bounds.minY,
          width: bounds.W,
          height: bounds.H,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <Edges
          edges={graph.data!.edges}
          nodeById={nodeById}
          dims={dims}
          bounds={bounds}
          connecting={connecting}
        />
        {nodes.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            dims={dims}
            bounds={bounds}
            selected={selectedLabel === n.id}
            isHoverTarget={hoverTargetId === n.id}
            onMouseDown={(e) => startNodeDrag(e, n)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLabel(n.id);
            }}
            onStartConnect={(e) => startConnect(e, n)}
          />
        ))}
      </div>
      <Toolbar
        onAddScene={() => addScene.mutate()}
        onAddChoice={() => addChoice.mutate()}
        onAddEnding={() => addEnding.mutate()}
        onDelete={() => deleteSelected.mutate()}
        canDelete={!!selectedLabel}
        busy={
          addScene.isPending ||
          addChoice.isPending ||
          addEnding.isPending ||
          deleteSelected.isPending
        }
      />
      <Chrome
        zoom={zoom}
        bounds={bounds}
        setZoom={setZoom}
        setPan={setPan}
        containerRef={containerRef}
      />
      <Legend />
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <Hint connecting={!!connecting} />
    </div>
  );
}

// ---------- positioning --------------------------------------------------------

function layoutNodes(
  apiNodes: BranchGraphNode[],
  saved: Record<string, { x: number; y: number }>,
  dims: Dims,
): NodeRender[] {
  const colGap = 72;
  const rowGap = 56;
  const pad = 80;
  const perRow = 4;

  return apiNodes.map((n, i): NodeRender => {
    const stored = saved[n.id];
    if (stored) return { ...n, x: stored.x, y: stored.y };
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    return {
      ...n,
      x: pad + col * (dims.nodeW + colGap) + dims.nodeW / 2,
      y: pad + row * (dims.nodeH + rowGap) + dims.nodeH / 2,
    };
  });
}

function computeBounds(nodes: NodeRender[]) {
  if (nodes.length === 0) return { W: 1200, H: 800, minX: 0, minY: 0 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const pad = 240;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { W: maxX - minX, H: maxY - minY, minX, minY };
}

// Label ids are project data: the `scene_1` / `choice_2` / `ending_3`
// prefixes stay untranslated so generated labels stay readable in .rpy.
function uniqueName(prefix: string, nodes: NodeRender[]): string {
  let i = 1;
  const existing = new Set(nodes.map((n) => n.id));
  while (existing.has(`${prefix}_${i}`)) i++;
  return `${prefix}_${i}`;
}

// ---------- nodes --------------------------------------------------------------

function NodeCard({
  node,
  dims,
  bounds,
  selected,
  isHoverTarget,
  onMouseDown,
  onClick,
  onStartConnect,
}: {
  node: NodeRender;
  dims: Dims;
  bounds: { minX: number; minY: number };
  selected: boolean;
  isHoverTarget: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartConnect: (e: React.MouseEvent) => void;
}) {
  const { t } = useI18n();
  const left = node.x - bounds.minX - dims.nodeW / 2;
  const top = node.y - bounds.minY - dims.nodeH / 2;
  const kind = (node.kind ?? "scene") as LabelKind;
  const filename = (node.file || "").split("/").pop();

  const ringClass = selected
    ? "ring-2 ring-offset-1"
    : isHoverTarget
      ? "ring-2 ring-offset-1 ring-recent"
      : "";

  return (
    <div
      data-node
      data-nodeid={node.id}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={[
        "absolute flex flex-col items-start text-left rounded-md transition-shadow select-none cursor-grab",
        "border bg-card text-ink shadow-sm hover:shadow-md",
        "border-l-4",
        ringClass,
      ].join(" ")}
      style={{
        left,
        top,
        width: dims.nodeW,
        height: dims.nodeH,
        padding: "8px 12px",
        gap: 4,
        borderLeftColor: kindBorderColor(kind),
      }}
    >
      <span className="text-[10px] uppercase tracking-wide font-mono text-ink3">
        {kindLabel(kind, t)}
      </span>
      <span
        className="font-serif leading-tight truncate w-full"
        style={{ fontSize: dims.fontHead }}
      >
        {node.id}
      </span>
      <span
        className="flex justify-between w-full text-ink3 font-mono"
        style={{ fontSize: dims.fontMeta }}
      >
        <span>{t("story.map.lines", { count: node.say_count })}</span>
        <span className="truncate ml-2">{filename}</span>
      </span>

      {kind !== "ending" && (
        <button
          data-port
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onStartConnect(e);
          }}
          title={t("story.map.portTitle")}
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-line bg-card hover:scale-110 transition-transform flex items-center justify-center text-[10px] text-ink3 hover:text-ink"
          style={{
            color: "var(--rp-accent)",
          }}
        >
          ＋
        </button>
      )}
    </div>
  );
}

function kindLabel(kind: LabelKind, t: I18n["t"]): string {
  if (kind === "start") return t("story.kind.start");
  if (kind === "ending") return t("story.kind.ending");
  if (kind === "choice") return t("story.kind.choice");
  return t("story.kind.scene");
}

function kindBorderColor(kind: LabelKind): string {
  if (kind === "start") return "var(--rp-accent)";
  if (kind === "ending") return "var(--rp-ink-3)";
  if (kind === "choice") return "var(--rp-recent)";
  return "var(--rp-line)";
}

// ---------- edges --------------------------------------------------------------

function Edges({
  edges,
  nodeById,
  dims,
  bounds,
  connecting,
}: {
  edges: BranchGraphEdge[];
  nodeById: Map<string, NodeRender>;
  dims: Dims;
  bounds: { W: number; H: number; minX: number; minY: number };
  connecting: { fromId: string; x: number; y: number } | null;
}) {
  return (
    <svg
      width={bounds.W}
      height={bounds.H}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.W} ${bounds.H}`}
      className="absolute pointer-events-none"
      style={{
        left: bounds.minX,
        top: bounds.minY,
        transform: `translate(${-bounds.minX}px, ${-bounds.minY}px)`,
      }}
    >
      <defs>
        <marker id="arrow-jump" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rp-edge)" />
        </marker>
        <marker id="arrow-call" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rp-accent)" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = nodeById.get(e.from);
        const b = nodeById.get(e.to);
        if (!a || !b) return null;
        const path = curvedPath(a, b, dims);
        const isCall = e.kind === "call";
        return (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={isCall ? "var(--rp-accent)" : "var(--rp-edge)"}
            strokeWidth={isCall ? 1.75 : 1.5}
            strokeDasharray={isCall ? "4 4" : undefined}
            markerEnd={isCall ? "url(#arrow-call)" : "url(#arrow-jump)"}
          />
        );
      })}

      {connecting && (() => {
        const a = nodeById.get(connecting.fromId);
        if (!a) return null;
        const ax = a.x + dims.nodeW / 2;
        const ay = a.y;
        const bx = connecting.x;
        const by = connecting.y;
        const dx = Math.max(40, Math.abs(bx - ax) * 0.5);
        const d = `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
        return (
          <path
            d={d}
            fill="none"
            stroke="var(--rp-accent)"
            strokeWidth="2"
            strokeDasharray="3 5"
            opacity="0.85"
          />
        );
      })()}
    </svg>
  );
}

function curvedPath(a: NodeRender, b: NodeRender, dims: Dims): string {
  const ax = a.x + dims.nodeW / 2;
  const ay = a.y;
  const bx = b.x - dims.nodeW / 2;
  const by = b.y;
  const dx = Math.max(40, Math.abs(bx - ax) * 0.5);
  return `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
}

// ---------- chrome -------------------------------------------------------------

function GridBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--rp-line) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

function Toolbar({
  onAddScene,
  onAddChoice,
  onAddEnding,
  onDelete,
  canDelete,
  busy,
}: {
  onAddScene: () => void;
  onAddChoice: () => void;
  onAddEnding: () => void;
  onDelete: () => void;
  canDelete: boolean;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line text-ink2 text-xs shadow-sm">
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-cardAlt text-ink2 hover:text-ink disabled:opacity-50"
        onClick={onAddScene}
        disabled={busy}
        title={t("story.map.addSceneTitle")}
      >
        <Plus className="w-3.5 h-3.5" /> {t("story.map.addScene")}
      </button>
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-cardAlt text-ink2 hover:text-ink disabled:opacity-50"
        onClick={onAddChoice}
        disabled={busy}
        title={t("story.map.addChoiceTitle")}
      >
        <GitBranch className="w-3.5 h-3.5" /> {t("story.map.addChoice")}
      </button>
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-cardAlt text-ink2 hover:text-ink disabled:opacity-50"
        onClick={onAddEnding}
        disabled={busy}
        title={t("story.map.addEndingTitle")}
      >
        <FlagOff className="w-3.5 h-3.5" /> {t("story.map.addEnding")}
      </button>
      <span className="w-px h-4 bg-line mx-1" />
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onDelete}
        disabled={!canDelete || busy}
        title={t("story.map.deleteTitle")}
      >
        <Trash2 className="w-3.5 h-3.5" /> {t("story.map.delete")}
      </button>
    </div>
  );
}

function Chrome({
  zoom,
  bounds,
  setZoom,
  setPan,
  containerRef,
}: {
  zoom: number;
  bounds: { W: number; H: number; minX: number; minY: number };
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const { t } = useI18n();
  const fit = () => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const z = Math.min(r.width / bounds.W, r.height / bounds.H, 1) * 0.92;
    setZoom(z);
    setPan({
      x: (r.width - bounds.W * z) / 2 - bounds.minX * z,
      y: (r.height - bounds.H * z) / 2 - bounds.minY * z,
    });
  };
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line text-ink2 text-xs font-mono shadow-sm">
      <button className="px-1.5 hover:text-ink" onClick={() => setZoom(Math.min(2.2, zoom * 1.15))} title={t("story.map.zoomIn")}>+</button>
      <button className="px-1.5 hover:text-ink" onClick={() => setZoom(Math.max(0.3, zoom / 1.15))} title={t("story.map.zoomOut")}>−</button>
      <button className="px-1.5 hover:text-ink" onClick={fit} title={t("story.map.fit")}>⊡</button>
      <span className="ml-1 text-ink3">{Math.round(zoom * 100)}%</span>
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3 py-1.5 rounded-md bg-card border border-line text-ink3 text-[11px] font-mono shadow-sm">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: "var(--rp-accent)" }} />
        {t("story.legend.start")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: "var(--rp-line)" }} />
        {t("story.legend.scene")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: "var(--rp-recent)" }} />
        {t("story.legend.choice")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm bg-cardAlt" />
        {t("story.legend.ending")}
      </span>
      <span className="text-ink3/60">·</span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-px bg-ink3" />
        {t("story.legend.jump")}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="w-3 h-px"
          style={{
            background:
              "repeating-linear-gradient(to right, var(--rp-accent) 0 4px, transparent 4px 8px)",
          }}
        />
        {t("story.legend.call")}
      </span>
    </div>
  );
}

function Hint({ connecting }: { connecting: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={[
        "absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-line text-[11px] font-mono text-ink3 shadow-sm transition-opacity",
        connecting ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      {t("story.map.connectHint")}
    </div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-rose-600 text-white text-xs shadow-lg flex items-center gap-2 max-w-xl">
      <MinusCircle className="w-4 h-4 shrink-0" />
      <span className="truncate">{message}</span>
      <button onClick={onDismiss} className="ml-2 underline opacity-80 hover:opacity-100 shrink-0">
        {t("story.map.dismiss")}
      </button>
    </div>
  );
}

function EmptyShell({
  onAddScene,
  error,
  setError,
}: {
  onAddScene: () => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-canvas text-ink3 text-sm">
      <p className="mb-3">{t("story.map.empty")}</p>
      <button
        onClick={onAddScene}
        className="px-3 py-1.5 rounded-md text-white text-sm"
        style={{ background: "var(--rp-accent)" }}
      >
        {t("story.map.addStartingScene")}
      </button>
      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
    </div>
  );
}

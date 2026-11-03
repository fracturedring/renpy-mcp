import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, History, User, Bot } from "lucide-react";
import { api } from "@/api/client";
import { useWatcherEvent } from "@/api/ws";
import type { LabelInfo } from "@/api/types";
import { useI18n } from "@/i18n";
import { relativeFromTimestamp } from "@/lib/relativeTime";

interface RecentEdit {
  timestamp: number;
  file: string;
  origin: "gui" | "agent";
  summary: string;
  diff: string;
}

interface RecentEditsResponse {
  count: number;
  entries: RecentEdit[];
}

/**
 * "Recent" disclosure in the header.
 *
 * Lists the GUI backend's ring buffer of recent edits — both writes the
 * GUI initiated (origin="gui", with diff) and external writes the
 * watcher saw (origin="agent", path-only). Click a `.rpy` entry to
 * open its first label in the Inspector.
 *
 * Refresh strategy: invalidate on every watcher event the frontend
 * receives, so an external write shows up within the watcher's
 * debounce window. No dumb polling.
 */
export function RecentDisclosure({
  onSelectLabel,
}: {
  onSelectLabel: (name: string) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const recentQ = useQuery({
    queryKey: ["recent-edits"],
    queryFn: () => api<RecentEditsResponse>("/api/recent-edits?limit=15"),
  });

  const labelsQ = useQuery({
    queryKey: ["labels"],
    queryFn: () => api<{ labels: LabelInfo[] }>("/api/labels"),
  });

  // Re-fetch on every watcher event so external writes surface fast.
  const watcherEvt = useWatcherEvent();
  useEffect(() => {
    if (watcherEvt) qc.invalidateQueries({ queryKey: ["recent-edits"] });
  }, [watcherEvt, qc]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // First-open: refetch eagerly so a stale cached value doesn't lead
  // with old entries.
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ["recent-edits"] });
  }, [open, qc]);

  const entries = recentQ.data?.entries ?? [];
  const count = recentQ.data?.count ?? 0;

  const onEntryClick = (entry: RecentEdit) => {
    if (!entry.file.endsWith(".rpy")) return;
    const labels = labelsQ.data?.labels ?? [];
    // Navigate to the first label in this file as a stable, predictable
    // landing — line-precise jumps are deferred until the Inspector
    // exposes per-event anchors.
    const candidates = labels.filter((l) => l.file === entry.file);
    if (candidates.length === 0) return;
    candidates.sort((a, b) => a.start_line - b.start_line);
    onSelectLabel(candidates[0].name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded-md border border-line text-[11px] font-mono inline-flex items-center gap-1.5 text-ink3 hover:text-ink hover:bg-cardAlt"
        title={t(count === 1 ? "recent.title" : "recent.titlePlural", { count })}
      >
        <History className="w-3.5 h-3.5" />
        <span>{t("recent.button", { count })}</span>
      </button>
      {open && (
        <div
          ref={popRef}
          className="absolute right-0 mt-1 bg-card border border-line rounded shadow-lg z-50 w-[420px] max-h-[60vh] overflow-auto"
        >
          <div className="px-3 py-2 border-b border-line bg-cardAlt/40 text-[10px] font-mono text-ink3 uppercase tracking-wide">
            {t("recent.heading", { count })}
          </div>
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-xs text-ink3">{t("recent.empty")}</div>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry, i) => (
                <li
                  key={`${entry.timestamp}:${i}`}
                  className="px-3 py-2 hover:bg-cardAlt/40 cursor-pointer"
                  onClick={() => onEntryClick(entry)}
                  title={
                    entry.file.endsWith(".rpy")
                      ? t("recent.openInInspector")
                      : undefined
                  }
                >
                  <RecentRow entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RecentRow({ entry }: { entry: RecentEdit }) {
  const { t } = useI18n();
  const Icon = entry.origin === "gui" ? User : Bot;
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon
        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${entry.origin === "gui" ? "text-ink2" : "text-amber-700"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] text-ink truncate">{entry.file}</span>
          <span className="font-mono text-[10px] text-ink3 shrink-0 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {relativeFromTimestamp(t, entry.timestamp)}
          </span>
        </div>
        {entry.summary && (
          <div className="text-ink2 truncate">{entry.summary}</div>
        )}
      </div>
    </div>
  );
}

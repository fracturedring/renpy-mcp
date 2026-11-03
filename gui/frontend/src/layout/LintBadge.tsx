import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/api/client";
import { useWatcherEvent } from "@/api/ws";
import { parseFindings, type LintReport, type ParsedFinding, type Severity } from "@/lib/lint";
import { useI18n } from "@/i18n";

/**
 * Ambient lint badge — count + popover with the findings list.
 *
 * Deliberately *not* auto-polling lint every 2s: a real Ren'Py lint run
 * takes 3–10s, so a 2s refetchInterval just spawns overlapping runs and
 * burns the SDK process. Instead the badge:
 *   - runs lint once on demand (button or first popover open),
 *   - tracks "stale" relative to file-watcher events,
 *   - exposes a manual refresh icon in the popover.
 *
 * Findings render with the same parse rules the Build panel used (now in
 * `lib/lint.ts`).
 */
export function LintBadge() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<LintReport | null>(null);
  const [stale, setStale] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const run = useMutation({
    mutationFn: () => api<LintReport>("/api/lint"),
    onSuccess: (data) => {
      setReport(data);
      setStale(false);
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // First-open trigger: if no report yet, kick off a run so the popover
  // doesn't show an empty state.
  useEffect(() => {
    if (open && !report && !run.isPending) run.mutate();
  }, [open, report, run]);

  // Watcher events flip the badge to "stale" so the user knows the count
  // doesn't reflect their latest edit.
  const watcherEvt = useWatcherEvent();
  useEffect(() => {
    if (report && watcherEvt) setStale(true);
  }, [watcherEvt, report]);

  const findings = useMemo(() => (report ? parseFindings(report.stdout) : []), [report]);
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { error: 0, warning: 0, notice: 0 };
    for (const f of findings) c[f.severity] += 1;
    return c;
  }, [findings]);

  const total = counts.error + counts.warning + counts.notice;
  const tone =
    counts.error > 0
      ? "text-rose-600 border-rose-200 bg-rose-50"
      : counts.warning > 0
        ? "text-amber-700 border-amber-200 bg-amber-50"
        : report
          ? "text-emerald-700 border-emerald-200 bg-emerald-50"
          : "text-ink3 border-line bg-card";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 ${tone} ${stale ? "opacity-60" : ""}`}
        title={
          report
            ? t(stale ? "lint.summaryStale" : "lint.summary", {
                errors: counts.error,
                warnings: counts.warning,
                notices: counts.notice,
              })
            : t("lint.notRun")
        }
      >
        {run.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : counts.error > 0 ? (
          <AlertOctagon className="w-3.5 h-3.5" />
        ) : counts.warning > 0 ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : report ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <Info className="w-3.5 h-3.5" />
        )}
        <span>
          {report ? `${total}` : t("lint.lintLabel")}
          {stale ? "*" : ""}
        </span>
      </button>
      {open && (
        <div
          ref={popRef}
          className="absolute right-0 mt-1 bg-card border border-line rounded shadow-lg z-50 w-[420px] max-h-[60vh] overflow-auto"
        >
          <div className="px-3 py-2 border-b border-line flex items-center justify-between bg-cardAlt/40">
            <span className="text-[10px] font-mono text-ink3 uppercase tracking-wide">
              {t("lint.findings")}
            </span>
            <button
              type="button"
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="text-[10px] font-mono text-ink3 hover:text-ink inline-flex items-center gap-1 disabled:opacity-50"
              title={t("lint.rerun")}
            >
              <RefreshCw className={run.isPending ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
              {t("lint.refresh")}
            </button>
          </div>
          {!report && run.isPending && (
            <div className="px-4 py-6 text-xs text-ink3">{t("lint.running")}</div>
          )}
          {report && findings.length === 0 && (
            <div className="px-4 py-6 text-xs text-emerald-700 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t("lint.clean")}
            </div>
          )}
          {findings.length > 0 && (
            <ul className="divide-y divide-line">
              {findings.map((f, i) => (
                <li key={i} className="px-3 py-2">
                  <Finding finding={f} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Finding({ finding }: { finding: ParsedFinding }) {
  const palette = {
    error: { icon: AlertOctagon, cls: "text-rose-600" },
    warning: { icon: AlertTriangle, cls: "text-amber-700" },
    notice: { icon: Info, cls: "text-sky-600" },
  }[finding.severity];
  const Icon = palette.icon;
  return (
    <div className="flex gap-2 text-xs">
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${palette.cls}`} />
      <div className="min-w-0">
        <div className="font-mono text-ink3 text-[10px] truncate">
          {finding.file}
          {finding.line !== null && `:${finding.line}`}
        </div>
        <div className="text-ink">{finding.message}</div>
      </div>
    </div>
  );
}

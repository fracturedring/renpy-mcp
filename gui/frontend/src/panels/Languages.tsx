/**
 * Languages — translation coverage dashboard (Phase 8).
 *
 * Reads `/api/translations/coverage` for per-language progress bars and
 * `/api/translations/stale?language=…` for the stale-string list.
 * `/api/translations/scaffolding/{language}` regenerates the scaffolding
 * via Ren'Py's own translate command.
 *
 * SDK-gated tools surface their stdout/stderr in the response so the
 * panel can show what Ren'Py reported.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages as LanguagesIcon, Plus, RefreshCw } from "lucide-react";
import { api } from "@/api/client";
import type {
  StaleTranslations,
  TranslationCoverage,
  TranslationCoverageRow,
} from "@/api/types";
import { useI18n } from "@/i18n";

export function Languages() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [scaffoldName, setScaffoldName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const coverageQ = useQuery({
    queryKey: ["translation-coverage"],
    queryFn: () => api<TranslationCoverage>("/api/translations/coverage"),
  });

  // Auto-select the first language once coverage loads.
  useEffect(() => {
    if (selected) return;
    const first = coverageQ.data?.languages[0]?.language;
    if (first) setSelected(first);
  }, [coverageQ.data, selected]);

  const staleQ = useQuery({
    queryKey: ["stale-translations", selected],
    queryFn: () =>
      api<StaleTranslations>(
        `/api/translations/stale${selected ? `?language=${encodeURIComponent(selected)}` : ""}`,
      ),
    enabled: !!selected,
  });

  const scaffold = useMutation({
    mutationFn: async (language: string) => {
      setError(null);
      return api<{ language?: string; returncode?: number; stderr?: string; error?: string }>(
        `/api/translations/scaffolding/${encodeURIComponent(language)}`,
        { method: "POST" },
      );
    },
    onSuccess: (data, lang) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      if (typeof data.returncode === "number" && data.returncode !== 0) {
        setError(data.stderr || t("ship.languages.exited", { code: data.returncode }));
        return;
      }
      qc.invalidateQueries({ queryKey: ["translation-coverage"] });
      qc.invalidateQueries({ queryKey: ["stale-translations"] });
      setSelected(lang);
      setScaffoldName("");
    },
    onError: (err) => setError(String(err)),
  });

  return (
    <div className="w-full h-full overflow-auto bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <header className="border-b border-line pb-3">
          <span className="text-[10px] uppercase tracking-wide text-ink3 font-mono">
            {t("ship.languages.eyebrow")}
          </span>
          <h1 className="font-serif text-2xl text-ink mt-1 flex items-center gap-2">
            <LanguagesIcon className="w-5 h-5" />
            {t("ship.languages.heading")}
          </h1>
          <p className="text-xs text-ink3 mt-1">
            {t("ship.languages.subtitlePre")}{" "}
            <code className="font-mono">game/tl/&lt;lang&gt;/</code>
            {t("ship.languages.subtitlePost")}
          </p>
        </header>

        {coverageQ.isLoading && (
          <p className="text-ink3 text-sm">{t("ship.languages.loadingCoverage")}</p>
        )}
        {coverageQ.error && (
          <p className="text-rose-600 text-sm">
            {t("ship.errorLabel")} {String(coverageQ.error)}
          </p>
        )}

        {coverageQ.data && coverageQ.data.languages.length === 0 && (
          <div className="bg-card border border-line rounded p-4 text-sm text-ink2">
            <p>
              {t("ship.languages.emptyPre")}{" "}
              <code className="font-mono">translate</code> {t("ship.languages.emptyPost")}
            </p>
          </div>
        )}

        {coverageQ.data && coverageQ.data.languages.length > 0 && (
          <ul className="space-y-2">
            {coverageQ.data.languages.map((row) => (
              <CoverageRow
                key={row.language}
                row={row}
                selected={selected === row.language}
                onSelect={() => setSelected(row.language)}
                onRefresh={() => scaffold.mutate(row.language)}
                refreshing={scaffold.isPending && scaffold.variables === row.language}
              />
            ))}
          </ul>
        )}

        <section className="bg-card border border-line rounded p-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-ink3" />
          <input
            value={scaffoldName}
            onChange={(e) => setScaffoldName(e.target.value)}
            placeholder={t("ship.languages.addPlaceholder")}
            className="flex-1 px-2 py-1 border border-line rounded text-xs font-mono bg-card text-ink"
          />
          <button
            onClick={() => scaffoldName.trim() && scaffold.mutate(scaffoldName.trim())}
            disabled={!scaffoldName.trim() || scaffold.isPending}
            className="px-3 py-1.5 rounded text-xs text-white disabled:opacity-50"
            style={{ background: "var(--rp-accent)" }}
          >
            {scaffold.isPending
              ? t("ship.languages.scaffolding")
              : t("ship.languages.scaffold")}
          </button>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {selected && (
          <section>
            <header className="flex items-baseline justify-between mb-2">
              <h2 className="font-serif text-base text-ink">
                {t("ship.languages.staleHeading", { language: selected })}
              </h2>
              <span className="text-[10px] font-mono text-ink3">
                {t(
                  (staleQ.data?.count ?? 0) === 1
                    ? "ship.languages.entry"
                    : "ship.languages.entries",
                  { count: staleQ.data?.count ?? 0 },
                )}
              </span>
            </header>
            {staleQ.isLoading && <p className="text-ink3 text-sm">{t("common.loading")}</p>}
            {staleQ.data && staleQ.data.count === 0 && (
              <p className="text-ink3 text-sm">{t("ship.languages.staleEmpty")}</p>
            )}
            {staleQ.data && staleQ.data.count > 0 && (
              <ul className="bg-card border border-line rounded divide-y divide-line">
                {staleQ.data.stale.map((entry, i) => (
                  <li key={i} className="px-3 py-2 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-[10px] font-mono uppercase tracking-wide rounded px-1.5 py-0.5 bg-cardAlt text-ink2"
                      >
                        {entry.kind}
                      </span>
                      <span className="font-mono text-[10px] text-ink3">
                        {entry.file}:{entry.line}
                      </span>
                    </div>
                    {entry.source && (
                      <div className="font-serif text-ink mt-1">"{entry.source}"</div>
                    )}
                    <div className="font-mono text-ink3 mt-0.5">
                      {entry.target
                        ? t("ship.languages.matchesSource", { text: entry.target })
                        : t("ship.languages.targetEmpty")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function CoverageRow({
  row,
  selected,
  onSelect,
  onRefresh,
  refreshing,
}: {
  row: TranslationCoverageRow;
  selected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { t } = useI18n();
  return (
    <li>
      <div
        className={[
          "flex items-center gap-3 px-3 py-2 rounded border bg-card transition-colors cursor-pointer",
          selected ? "border-ink" : "border-line hover:border-ink2",
        ].join(" ")}
        onClick={onSelect}
      >
        <span className="font-mono text-sm text-ink min-w-24">{row.language}</span>
        <div className="flex-1 h-2 bg-cardAlt rounded overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${row.percent}%`,
              background: "var(--rp-accent)",
            }}
          />
        </div>
        <span className="text-[11px] font-mono text-ink2 min-w-16 text-right">
          {row.translated}/{row.total}
        </span>
        <span className="text-[11px] font-mono text-ink2 min-w-12 text-right">
          {row.percent}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={refreshing}
          className="ml-1 p-1 text-ink3 hover:text-ink rounded disabled:opacity-50"
          title={t("ship.languages.rerunTitle")}
        >
          <RefreshCw className={refreshing ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
        </button>
      </div>
    </li>
  );
}

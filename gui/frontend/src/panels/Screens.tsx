import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ImageIcon, Plus } from "lucide-react";
import { api } from "@/api/client";
import type { ScreenInfo } from "@/api/types";
import { ScreenLayoutComposer, ImageMapComposer } from "@/panels/Composers";
import { useI18n } from "@/i18n";

type Mode = "list" | "screen" | "imagemap";

export function Screens() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("list");
  const screensQ = useQuery({
    queryKey: ["screens"],
    queryFn: () => api<{ screens: ScreenInfo[]; count: number }>("/api/screens"),
  });

  return (
    <div className="w-full h-full overflow-auto bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <header className="border-b border-line pb-3">
          <span className="text-[10px] uppercase tracking-wide text-ink3 font-mono">
            {t("inspector.screensEyebrow")}
          </span>
          <h1 className="font-serif text-2xl text-ink mt-1">{t("inspector.screensTitle")}</h1>
          <p className="text-xs text-ink3 mt-1">
            {t("inspector.screensIntroPre")}
            <code className="font-mono">screen</code>
            {t("inspector.screensIntroPost")}
          </p>
        </header>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "screen" ? "list" : "screen")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-line text-ink2 hover:text-ink hover:bg-cardAlt"
          >
            <Plus className="w-3.5 h-3.5" />
            <FileText className="w-3.5 h-3.5" />
            {t("inspector.addScreen")}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "imagemap" ? "list" : "imagemap")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-line text-ink2 hover:text-ink hover:bg-cardAlt"
          >
            <Plus className="w-3.5 h-3.5" />
            <ImageIcon className="w-3.5 h-3.5" />
            {t("inspector.addImagemap")}
          </button>
        </div>

        {mode === "screen" && <ScreenLayoutComposer />}
        {mode === "imagemap" && <ImageMapComposer />}

        {mode === "list" && (
          <section className="bg-card border border-line rounded-lg overflow-hidden">
            <header className="px-4 py-2 border-b border-line bg-cardAlt/40 text-xs text-ink3 font-mono">
              {t(
                (screensQ.data?.count ?? 0) === 1
                  ? "inspector.screenCountOne"
                  : "inspector.screenCountMany",
                { count: screensQ.data?.count ?? 0 },
              )}
            </header>
            {screensQ.isLoading && (
              <div className="px-4 py-6 text-sm text-ink3">{t("common.loading")}</div>
            )}
            {screensQ.data && screensQ.data.count === 0 && (
              <div className="px-4 py-6 text-sm text-ink3">{t("inspector.screensEmpty")}</div>
            )}
            {screensQ.data && screensQ.data.count > 0 && (
              <ul className="divide-y divide-line">
                {screensQ.data.screens.map((s) => (
                  <li key={s.name} className="px-4 py-2 flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-sm text-ink">{s.name}</span>
                      <span className="text-[10px] font-mono text-ink3 ml-2">
                        {s.file}:{s.start_line}
                      </span>
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

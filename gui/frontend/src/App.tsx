import { useCallback, useEffect, useState } from "react";
import { Header } from "@/layout/Header";
import { Sidebar, type PanelId } from "@/layout/Sidebar";
import { PrefsModal } from "@/layout/PrefsModal";
import { CommandPalette } from "@/layout/CommandPalette";
import { useFileWatcher } from "@/api/ws";
import { usePrefs } from "@/lib/usePrefs";
import { I18nProvider } from "@/i18n/provider";
import type { Locale } from "@/i18n";
import { Story } from "@/panels/Story";
import { Library } from "@/panels/Library";
import { Languages } from "@/panels/Languages";
import { Build } from "@/panels/Build";
import { SceneInspector } from "@/panels/SceneInspector";

export default function App() {
  const [active, setActive] = useState<PanelId>("story");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { prefs, setPref } = usePrefs();
  useFileWatcher();

  const setLocale = useCallback(
    (locale: Locale) => setPref("locale", locale),
    [setPref],
  );

  // Inspector only opens from the Story panel; leaving Story drops the
  // selection so we don't leak label state across surfaces.
  const setActivePanel = (id: PanelId) => {
    if (id !== "story") setSelectedLabel(null);
    setActive(id);
  };

  // Global ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <I18nProvider locale={prefs.locale} setLocale={setLocale}>
      <div className="flex h-full">
        <Sidebar active={active} onSelect={setActivePanel} rail={prefs.rail} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onOpenPrefs={() => setPrefsOpen(true)}
            onSelectLabel={(name) => {
              setActive("story");
              setSelectedLabel(name);
            }}
          />
          <main className="flex-1 min-h-0 bg-canvas flex">
            <div className="flex-1 min-w-0">
              {active === "story" && (
                <Story selectedLabel={selectedLabel} onSelectLabel={setSelectedLabel} />
              )}
              {active === "library" && <Library />}
              {active === "localization" && <Languages />}
              {active === "ship" && <Build />}
            </div>
            {active === "story" && selectedLabel && (
              <SceneInspector
                key={selectedLabel}
                name={selectedLabel}
                onClose={() => setSelectedLabel(null)}
              />
            )}
          </main>
        </div>

        {prefsOpen && (
          <PrefsModal
            prefs={prefs}
            setPref={setPref}
            onClose={() => setPrefsOpen(false)}
          />
        )}
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onSelectPanel={(id) => {
              setActivePanel(id);
              setPaletteOpen(false);
            }}
            onSelectLabel={(name) => {
              setActivePanel("story");
              setSelectedLabel(name);
              setPaletteOpen(false);
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}

import { clsx } from "clsx";
import {
  GitBranch,
  BookOpen,
  Languages as LanguagesIcon,
  Ship as ShipIcon,
} from "lucide-react";
import type { Rail } from "@/lib/usePrefs";
import { useI18n, type MessageKey } from "@/i18n";

export type PanelId = "story" | "library" | "localization" | "ship";

interface PanelMeta {
  id: PanelId;
  label: MessageKey;
  hint: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * The single source of panel identity. The command palette labels the
 * same four panels, so both read this list and the translation keys stay
 * in one place.
 */
export const PANEL_ITEMS: PanelMeta[] = [
  { id: "story", label: "nav.story", hint: "nav.storyHint", icon: GitBranch },
  { id: "library", label: "nav.library", hint: "nav.libraryHint", icon: BookOpen },
  {
    id: "localization",
    label: "nav.localization",
    hint: "nav.localizationHint",
    icon: LanguagesIcon,
  },
  { id: "ship", label: "nav.ship", hint: "nav.shipHint", icon: ShipIcon },
];

export function Sidebar({
  active,
  onSelect,
  rail,
}: {
  active: PanelId;
  onSelect: (id: PanelId) => void;
  rail: Rail;
}) {
  if (rail === "palette") {
    return <PaletteRail active={active} onSelect={onSelect} />;
  }
  const showLabels = rail === "labeled";
  return (
    <nav
      className={clsx(
        "bg-rail text-railText shrink-0 flex flex-col border-r border-railLine",
        showLabels ? "w-56" : "w-14",
      )}
    >
      <Brand showLabels={showLabels} />
      <ul className="flex-1 py-2">
        {PANEL_ITEMS.map(({ id, label, hint, icon: Icon }) => (
          <PanelButton
            key={id}
            id={id}
            label={label}
            hint={hint}
            icon={Icon}
            active={active === id}
            showLabels={showLabels}
            onSelect={onSelect}
          />
        ))}
      </ul>
      <Foot showLabels={showLabels} />
    </nav>
  );
}

function PanelButton({
  id,
  label,
  hint,
  icon: Icon,
  active,
  showLabels,
  onSelect,
}: {
  id: PanelId;
  label: MessageKey;
  hint: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  showLabels: boolean;
  onSelect: (id: PanelId) => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        title={!showLabels ? t(label) : undefined}
        className={clsx(
          "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
          showLabels ? "px-4" : "justify-center",
          active
            ? "bg-white/5 text-railText border-l-2 pl-[10px]"
            : "text-railTextDim hover:text-railText hover:bg-white/5",
        )}
        style={active ? { borderLeftColor: "var(--rp-accent)" } : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {showLabels && (
          <span className="flex flex-col items-start min-w-0">
            <span className="leading-tight">{t(label)}</span>
            <span className="text-[10px] text-railTextDim font-mono leading-tight">
              {t(hint)}
            </span>
          </span>
        )}
      </button>
    </li>
  );
}

function PaletteRail({
  active,
  onSelect,
}: {
  active: PanelId;
  onSelect: (id: PanelId) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="bg-rail text-railText w-72 shrink-0 flex flex-col border-r border-railLine">
      <div className="px-3 pt-3">
        <div className="rounded-md border border-railLine bg-white/5 px-3 py-2 flex items-center gap-2">
          <span className="font-mono text-base" style={{ color: "var(--rp-accent)" }}>
            ›
          </span>
          <span className="text-sm text-railTextDim flex-1 truncate">
            {t("nav.goToPanel")}
          </span>
          <kbd className="text-[10px] font-mono text-railTextDim border border-railLine rounded px-1 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>
      <ul className="flex-1 py-2 space-y-0.5">
        {PANEL_ITEMS.map(({ id, label, hint, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className={clsx(
                "w-full grid grid-cols-[20px_1fr_auto] gap-2 items-center px-3 py-1.5 text-left text-sm transition-colors",
                active === id
                  ? "bg-white/[0.07] text-railText"
                  : "text-railTextDim hover:bg-white/[0.04] hover:text-railText",
              )}
            >
              <Icon className="w-4 h-4 row-span-2" />
              <span className="leading-tight font-medium">{t(label)}</span>
              <span className="text-[10px] font-mono text-railTextDim col-start-2 leading-tight">
                {t(hint)}
              </span>
              {active === id && (
                <span
                  className="row-span-2 text-xs font-mono"
                  style={{ color: "var(--rp-accent)" }}
                >
                  ↵
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Foot showLabels />
    </nav>
  );
}

function Brand({ showLabels }: { showLabels: boolean }) {
  return (
    <div
      className={clsx(
        "px-4 py-3 border-b border-railLine flex items-center gap-3",
        !showLabels && "justify-center px-2",
      )}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
        style={{ background: "var(--rp-accent)", color: "white" }}
      >
        RP
      </div>
      {showLabels && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-serif text-base">RPBuilder</span>
          <span className="text-[10px] font-mono text-railTextDim">renpy-mcp · v0.1</span>
        </div>
      )}
    </div>
  );
}

function Foot({ showLabels }: { showLabels: boolean }) {
  const { t } = useI18n();
  return (
    <div className="px-3 py-3 border-t border-railLine">
      {showLabels ? (
        <div className="flex items-center gap-2 text-[10px] font-mono text-railTextDim">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--rp-accent)" }}
          />
          {t("nav.watcherLive")}
        </div>
      ) : (
        <div
          className="w-1.5 h-1.5 rounded-full mx-auto"
          style={{ background: "var(--rp-accent)" }}
          title={t("nav.watcherLive")}
        />
      )}
    </div>
  );
}

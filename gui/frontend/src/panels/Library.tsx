import { useState } from "react";
import { clsx } from "clsx";
import { Users, Image, Database, FileText, Gamepad2 } from "lucide-react";
import { Characters } from "@/panels/Characters";
import { Assets } from "@/panels/Assets";
import { Variables } from "@/panels/Variables";
import { Screens } from "@/panels/Screens";
import { MiniGames } from "@/panels/MiniGames";
import { useI18n, type MessageKey } from "@/i18n";

type Tab = "characters" | "assets" | "variables" | "screens" | "minigames";

const TABS: {
  id: Tab;
  label: MessageKey;
  hint: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "characters", label: "library.tab.characters", hint: "library.tab.charactersHint", icon: Users },
  { id: "assets", label: "library.tab.assets", hint: "library.tab.assetsHint", icon: Image },
  { id: "variables", label: "library.tab.variables", hint: "library.tab.variablesHint", icon: Database },
  { id: "screens", label: "library.tab.screens", hint: "library.tab.screensHint", icon: FileText },
  { id: "minigames", label: "library.tab.minigames", hint: "library.tab.minigamesHint", icon: Gamepad2 },
];

export function Library() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("characters");
  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-line bg-card flex items-center gap-1 overflow-x-auto">
        {TABS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "px-3 py-1 rounded text-xs flex items-center gap-1.5 border whitespace-nowrap",
              tab === id
                ? "bg-cardAlt text-ink border-line"
                : "text-ink3 hover:text-ink border-transparent hover:bg-cardAlt/40",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{t(label)}</span>
            <span className="text-[10px] font-mono text-ink3">{t(hint)}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {tab === "characters" && <Characters />}
        {tab === "assets" && <Assets />}
        {tab === "variables" && <Variables />}
        {tab === "screens" && <Screens />}
        {tab === "minigames" && <MiniGames />}
      </div>
    </div>
  );
}

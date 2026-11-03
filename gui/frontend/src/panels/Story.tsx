import { useState } from "react";
import { clsx } from "clsx";
import { GitBranch, Split } from "lucide-react";
import { StoryMap } from "@/panels/StoryMap";
import { ChoiceView } from "@/panels/ChoiceView";
import { useI18n } from "@/i18n";

type Mode = "map" | "choice";

export function Story({
  selectedLabel,
  onSelectLabel,
}: {
  selectedLabel: string | null;
  onSelectLabel: (name: string | null) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("map");
  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-line bg-card flex items-center gap-2">
        <ModeButton
          active={mode === "map"}
          onClick={() => setMode("map")}
          icon={<GitBranch className="w-3.5 h-3.5" />}
          label={t("story.mode.map")}
          hint={t("story.mode.mapHint")}
        />
        <ModeButton
          active={mode === "choice"}
          onClick={() => setMode("choice")}
          icon={<Split className="w-3.5 h-3.5" />}
          label={t("story.mode.choice")}
          hint={t("story.mode.choiceHint")}
        />
      </div>
      <div className="flex-1 min-h-0">
        {mode === "map" ? (
          <StoryMap selectedLabel={selectedLabel} onSelectLabel={onSelectLabel} />
        ) : (
          <ChoiceView onSelectLabel={(name) => onSelectLabel(name)} />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-1 rounded text-xs flex items-center gap-1.5 border",
        active
          ? "bg-cardAlt text-ink border-line"
          : "text-ink3 hover:text-ink border-transparent hover:bg-cardAlt/40",
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="text-[10px] font-mono text-ink3">{hint}</span>
    </button>
  );
}

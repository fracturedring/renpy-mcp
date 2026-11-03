import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Info, Plus, X } from "lucide-react";
import { api } from "@/api/client";
import type { LabelInfo, ScreenInfo } from "@/api/types";
import { useI18n } from "@/i18n";

// A minigame scaffold is two coupled files: a `screen <prefix>_minigame` and a
// `label <prefix>_play` that call-screens it. We detect "installed" minigames
// by pairing those two names — anything missing its other half surfaces as a
// dangling half in the list so the user can see the inconsistency.
type MinigameRow = {
  prefix: string;
  screen: ScreenInfo | null;
  label: LabelInfo | null;
};

const SCREEN_SUFFIX = "_minigame";
const LABEL_SUFFIX = "_play";

export function MiniGames() {
  const { t } = useI18n();
  const screens = useQuery({
    queryKey: ["screens"],
    queryFn: () => api<{ screens: ScreenInfo[]; count: number }>("/api/screens"),
  });
  const labels = useQuery({
    queryKey: ["labels"],
    queryFn: () => api<{ labels: LabelInfo[]; count: number }>("/api/labels"),
  });
  const [adding, setAdding] = useState(false);

  const rows = useMemo<MinigameRow[]>(() => {
    if (!screens.data && !labels.data) return [];
    const prefixes = new Set<string>();
    const screenMap = new Map<string, ScreenInfo>();
    const labelMap = new Map<string, LabelInfo>();
    for (const s of screens.data?.screens ?? []) {
      if (s.name.endsWith(SCREEN_SUFFIX)) {
        const prefix = s.name.slice(0, -SCREEN_SUFFIX.length);
        prefixes.add(prefix);
        screenMap.set(prefix, s);
      }
    }
    for (const l of labels.data?.labels ?? []) {
      if (l.name.endsWith(LABEL_SUFFIX)) {
        const prefix = l.name.slice(0, -LABEL_SUFFIX.length);
        if (screenMap.has(prefix) || labelMap.has(prefix)) {
          prefixes.add(prefix);
          labelMap.set(prefix, l);
        }
      }
    }
    return [...prefixes]
      .sort()
      .map((prefix) => ({
        prefix,
        screen: screenMap.get(prefix) ?? null,
        label: labelMap.get(prefix) ?? null,
      }));
  }, [screens.data, labels.data]);

  const labelNames = useMemo(
    () => (labels.data?.labels ?? []).map((l) => l.name),
    [labels.data],
  );

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-800">{t("library.minigames.title")}</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-indigo-600 inline-flex items-center gap-1.5"
          disabled={!labels.data}
        >
          <Plus className="w-4 h-4" /> {t("library.minigames.newScaffold")}
        </button>
      </div>

      {(screens.isLoading || labels.isLoading) && (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      )}
      {(screens.error || labels.error) && (
        <p className="text-sm text-red-600">
          {t("library.error", { message: String(screens.error ?? labels.error) })}
        </p>
      )}

      {screens.data && labels.data && (
        <>
          {rows.length === 0 ? (
            <div className="bg-card border border-dashed border-zinc-300 rounded-lg p-10 text-center">
              <Gamepad2 className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
              <p className="text-sm text-zinc-600">{t("library.minigames.empty")}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {t("library.minigames.emptyHintBefore")}
                <code className="font-mono">screen &lt;name&gt;_minigame</code>
                {t("library.minigames.emptyHintAnd")}
                <code className="font-mono">label &lt;name&gt;_play</code>
                {t("library.minigames.emptyHintAfter")}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-zinc-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2 font-medium">
                      {t("library.minigames.colName")}
                    </th>
                    <th className="text-left px-4 py-2 font-medium">
                      {t("library.minigames.colScreen")}
                    </th>
                    <th className="text-left px-4 py-2 font-medium">
                      {t("library.minigames.colEntryLabel")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Row key={row.prefix} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-zinc-500 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {t("library.minigames.noticeBefore")}
          <code className="font-mono">_play</code>
          {t("library.minigames.noticeAfter")}
        </span>
      </p>

      {adding && (
        <NewMinigameModal
          existingPrefixes={new Set(rows.map((r) => r.prefix))}
          labelNames={labelNames}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function Row({ row }: { row: MinigameRow }) {
  const { t } = useI18n();
  const { prefix, screen, label } = row;
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2 font-mono text-zinc-800">{prefix}</td>
      <td className="px-4 py-2 text-xs font-mono">
        {screen ? (
          <span className="text-zinc-600">
            {screen.name}
            <span className="text-zinc-400">
              {" "}
              — {screen.file}:{screen.start_line}
            </span>
          </span>
        ) : (
          <span className="text-amber-600">
            {t("library.minigames.missingScreen", { name: prefix })}
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-xs font-mono">
        {label ? (
          <span className="text-zinc-600">
            {label.name}
            <span className="text-zinc-400">
              {" "}
              — {label.file}:{label.start_line}
            </span>
          </span>
        ) : (
          <span className="text-amber-600">
            {t("library.minigames.missingLabel", { name: prefix })}
          </span>
        )}
      </td>
    </tr>
  );
}

function NewMinigameModal({
  existingPrefixes,
  labelNames,
  onClose,
}: {
  existingPrefixes: Set<string>;
  labelNames: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [onCompleteLabel, setOnCompleteLabel] = useState(labelNames[0] ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [screensFile, setScreensFile] = useState("");
  const [labelFile, setLabelFile] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nameValid = /^[A-Za-z_]\w*$/.test(name.trim());
  const labelValid = /^[A-Za-z_]\w*$/.test(onCompleteLabel.trim());
  const collides = nameValid && existingPrefixes.has(name.trim());

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        on_complete_label: onCompleteLabel.trim(),
      };
      if (screensFile.trim()) payload.screens_file = screensFile.trim();
      if (labelFile.trim()) payload.label_file = labelFile.trim();
      return api<{ summary?: string; error?: string }>("/api/minigames", {
        method: "POST",
        json: payload,
      });
    },
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["screens"] });
      qc.invalidateQueries({ queryKey: ["labels"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (err) => setError(String(err)),
  });

  const canSubmit =
    nameValid && labelValid && !collides && !create.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-card w-full sm:max-w-md rounded-t-lg sm:rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold">{t("library.minigames.modalTitle")}</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700"
            title={t("common.close")}
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-500 mb-1">
              {t("library.minigames.name")}
            </span>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="fishing"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-mono"
            />
            <span className="block mt-1 text-[10px] text-zinc-500">
              {t("library.minigames.createsBefore")}
              <code className="font-mono">screen {name || "<name>"}_minigame</code>
              {t("library.minigames.createsAnd")}
              <code className="font-mono">label {name || "<name>"}_play</code>
              {t("library.minigames.createsAfter")}
            </span>
            {!nameValid && name.length > 0 && (
              <span className="text-[10px] text-red-600 block mt-1">
                {t("library.minigames.identifierError")}
              </span>
            )}
            {collides && (
              <span className="text-[10px] text-red-600 block mt-1">
                {t("library.minigames.collisionBefore")}
                <code>{name}</code>
                {t("library.minigames.collisionAfter")}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-500 mb-1">
              {t("library.minigames.onCompleteLabel")}
            </span>
            <input
              list="minigame-label-options"
              type="text"
              value={onCompleteLabel}
              onChange={(e) => {
                setOnCompleteLabel(e.target.value);
                setError(null);
              }}
              placeholder="ending"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-mono"
            />
            <datalist id="minigame-label-options">
              {labelNames.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <span className="block mt-1 text-[10px] text-zinc-500">
              {t("library.minigames.jumpBefore")}
              <code>_play</code>
              {t("library.minigames.jumpMid")}
              <code>jump</code>
              {t("library.minigames.jumpAfter")}
            </span>
            {!labelValid && onCompleteLabel.length > 0 && (
              <span className="text-[10px] text-red-600 block mt-1">
                {t("library.minigames.labelIdentifierError")}
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-800"
          >
            {showAdvanced
              ? t("library.minigames.hideTargets")
              : t("library.minigames.showTargets")}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <label className="block text-sm">
                <span className="block text-xs font-medium text-zinc-500 mb-1">
                  {t("library.minigames.screensFile")}
                </span>
                <input
                  type="text"
                  value={screensFile}
                  onChange={(e) => setScreensFile(e.target.value)}
                  placeholder="game/screens.rpy"
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-xs font-mono"
                />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-zinc-500 mb-1">
                  {t("library.minigames.labelFile")}
                </span>
                <input
                  type="text"
                  value={labelFile}
                  onChange={(e) => setLabelFile(e.target.value)}
                  placeholder="game/script.rpy"
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-xs font-mono"
                />
              </label>
            </div>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md border border-zinc-200 hover:bg-white"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {create.isPending
              ? t("library.minigames.scaffolding")
              : t("library.minigames.scaffold")}
          </button>
        </div>
      </div>
    </div>
  );
}

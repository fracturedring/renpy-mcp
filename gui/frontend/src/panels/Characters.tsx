import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { api } from "@/api/client";
import type { CharacterInfo } from "@/api/types";
import { useI18n } from "@/i18n";

export function Characters() {
  const { t } = useI18n();
  const list = useQuery({
    queryKey: ["characters"],
    queryFn: () => api<{ characters: CharacterInfo[] }>("/api/characters"),
  });
  const [editing, setEditing] = useState<CharacterInfo | null>(null);

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-800">{t("library.characters.title")}</h1>
      </div>

      {list.isLoading && <p className="text-sm text-zinc-500">{t("common.loading")}</p>}
      {list.error && (
        <p className="text-sm text-red-600">
          {t("library.error", { message: String(list.error) })}
        </p>
      )}

      {list.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.data.characters.map((c) => (
            <CharacterCard key={c.var} character={c} onEdit={() => setEditing(c)} />
          ))}
          {list.data.characters.length === 0 && (
            <p className="col-span-full text-sm text-zinc-500">
              {t("library.characters.empty")}
            </p>
          )}
        </div>
      )}

      {editing && <EditDrawer character={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CharacterCard({
  character,
  onEdit,
}: {
  character: CharacterInfo;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  // Try to extract a `color="#..."` from the raw kwargs to color the card stripe.
  const colorMatch = character.raw_args.match(/color\s*=\s*["']([^"']+)["']/);
  const color = colorMatch?.[1] ?? "#71717a";

  return (
    <div className="bg-card border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ background: color }} />
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-800">
            {character.display_name ?? character.var}
          </h3>
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-700"
            title={t("common.edit")}
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          {t("library.characters.var", { name: character.var })}
        </div>
        <div className="text-xs text-zinc-400 truncate" title={character.raw_args}>
          {character.raw_args}
        </div>
        <div className="text-[10px] text-zinc-400 font-mono">
          {character.file}:{character.line}
        </div>
      </div>
    </div>
  );
}

function EditDrawer({ character, onClose }: { character: CharacterInfo; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(character.display_name ?? "");
  const [color, setColor] = useState(
    character.raw_args.match(/color\s*=\s*["']([^"']+)["']/)?.[1] ?? "#000000",
  );
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async () =>
      api<{ summary?: string; error?: string }>(`/api/characters/${character.var}`, {
        method: "PATCH",
        json: { display_name: displayName, color },
      }),
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["characters"] });
      onClose();
    },
    onError: (err) => setError(String(err)),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-card w-full sm:max-w-md rounded-t-lg sm:rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold">{t("library.characters.edit")}</h2>
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
          <Field label={t("library.characters.variable")} value={character.var} disabled />
          <Field
            label={t("library.characters.displayName")}
            value={displayName}
            onChange={setDisplayName}
            placeholder={t("library.characters.displayNamePlaceholder")}
          />
          <Field
            label={t("library.characters.color")}
            value={color}
            onChange={setColor}
            placeholder="#0099cc"
          />
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
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {update.isPending ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-zinc-500 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-mono disabled:bg-zinc-50 disabled:text-zinc-400"
      />
    </label>
  );
}

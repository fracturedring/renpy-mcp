import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Plus, Save, X, Pencil, Info } from "lucide-react";
import { api } from "@/api/client";
import type { VariableInfo } from "@/api/types";
import { useI18n, type MessageKey } from "@/i18n";

type KindFilter = "all" | "default" | "define";

/** Only the "all" bucket is UI copy; `default` / `define` are Ren'Py keywords. */
const KIND_LABEL: Record<KindFilter, MessageKey | null> = {
  all: "library.variables.all",
  // `default` and `define` are Ren'Py keywords, not UI words — they stay verbatim.
  default: null,
  define: null,
};

export function Variables() {
  const { t } = useI18n();
  const list = useQuery({
    queryKey: ["variables"],
    queryFn: () => api<{ variables: VariableInfo[] }>("/api/variables"),
  });
  const [filter, setFilter] = useState<KindFilter>("all");
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  // The Variables panel only edits `default` declarations — set_variable_default
  // is the only matching MCP tool. `define` lines surface read-only and use
  // the update_options_field flow elsewhere (Build panel, when it lands).
  const filtered = useMemo<VariableInfo[]>(() => {
    if (!list.data) return [];
    if (filter === "all") return list.data.variables;
    return list.data.variables.filter((v) => v.kind === filter);
  }, [list.data, filter]);

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-800">{t("library.variables.title")}</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-indigo-600 inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> {t("library.variables.newDefault")}
        </button>
      </div>

      <div className="border-b border-zinc-200 mb-4 flex gap-1">
        {(Object.keys(KIND_LABEL) as KindFilter[]).map((k) => {
          const labelKey = KIND_LABEL[k];
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={clsx(
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                filter === k
                  ? "border-accent text-accent font-medium"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {labelKey ? t(labelKey) : k}
              {list.data && (
                <span className="ml-1.5 text-xs text-zinc-400">
                  {k === "all"
                    ? list.data.variables.length
                    : list.data.variables.filter((v) => v.kind === k).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {list.isLoading && <p className="text-sm text-zinc-500">{t("common.loading")}</p>}
      {list.error && (
        <p className="text-sm text-red-600">
          {t("library.error", { message: String(list.error) })}
        </p>
      )}

      {list.data && (
        <div className="bg-card border border-zinc-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium">{t("library.variables.colName")}</th>
                <th className="text-left px-4 py-2 font-medium w-20">
                  {t("library.variables.colKind")}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t("library.variables.colValue")}
                </th>
                <th className="text-left px-4 py-2 font-medium w-48">
                  {t("library.variables.colLocation")}
                </th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 text-sm">
                    {t("library.variables.emptyFilter")}
                  </td>
                </tr>
              )}
              {filtered.map((v) =>
                editingName === v.name && v.kind === "default" ? (
                  <EditRow key={v.name} variable={v} onClose={() => setEditingName(null)} />
                ) : (
                  <Row
                    key={`${v.kind}-${v.name}`}
                    variable={v}
                    editable={v.kind === "default"}
                    onEdit={() => setEditingName(v.name)}
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {t("library.variables.noticeBefore")}
          <code className="font-mono">update_options_field</code>
          {t("library.variables.noticeAfter")}
        </span>
      </p>

      {adding && <NewVariableModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function Row({
  variable,
  editable,
  onEdit,
}: {
  variable: VariableInfo;
  editable: boolean;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2 font-mono text-zinc-800">{variable.name}</td>
      <td className="px-4 py-2">
        <KindPill kind={variable.kind} />
      </td>
      <td className="px-4 py-2 font-mono text-xs text-zinc-700 truncate max-w-md" title={variable.value}>
        {variable.value}
      </td>
      <td className="px-4 py-2 text-xs text-zinc-500 font-mono">
        {variable.file}:{variable.line}
      </td>
      <td className="px-4 py-2 text-right">
        {editable ? (
          <button
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-700"
            title={t("library.variables.editValue")}
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-[10px] text-zinc-400">{t("library.variables.readOnly")}</span>
        )}
      </td>
    </tr>
  );
}

function EditRow({ variable, onClose }: { variable: VariableInfo; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(variable.value);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api<{ summary?: string; error?: string }>(
        `/api/variables/${encodeURIComponent(variable.name)}`,
        { method: "PUT", json: { value: draft } },
      ),
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["variables"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (err) => setError(String(err)),
  });

  return (
    <tr className="border-t border-zinc-100 bg-indigo-50/40">
      <td className="px-4 py-2 font-mono text-zinc-800">{variable.name}</td>
      <td className="px-4 py-2">
        <KindPill kind={variable.kind} />
      </td>
      <td className="px-4 py-2" colSpan={2}>
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft !== variable.value) save.mutate();
            if (e.key === "Escape") onClose();
          }}
          className="w-full px-2 py-1 border border-zinc-300 rounded text-xs font-mono"
        />
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-700"
          title={t("library.variables.cancelTitle")}
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || draft === variable.value}
          className="p-1 text-accent disabled:text-zinc-300 hover:text-indigo-700"
          title={t("library.variables.saveTitle")}
        >
          <Save className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function KindPill({ kind }: { kind: "default" | "define" }) {
  return (
    <span
      className={clsx(
        "inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-mono rounded",
        kind === "default"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-zinc-100 text-zinc-600 border border-zinc-200",
      )}
    >
      {kind}
    </span>
  );
}

function NewVariableModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [value, setValue] = useState("False");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api<{ summary?: string; error?: string }>(
        `/api/variables/${encodeURIComponent(name.trim())}`,
        { method: "PUT", json: { value } },
      ),
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["variables"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (err) => setError(String(err)),
  });

  const valid = /^[A-Za-z_]\w*$/.test(name.trim());

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-card w-full sm:max-w-md rounded-t-lg sm:rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold">{t("library.variables.newDefault")}</h2>
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
              {t("library.variables.name")}
            </span>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="met_mei"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-mono"
            />
            {!valid && name.length > 0 && (
              <span className="text-[10px] text-red-600 block mt-1">
                {t("library.variables.identifierError")}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-500 mb-1">
              {t("library.variables.valueLabel")}
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='False, 0, "", []'
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-mono"
            />
          </label>
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
            disabled={!valid || create.isPending || value === ""}
            className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {create.isPending ? t("library.variables.creating") : t("library.variables.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Choice View — the second canvas (Phase 6).
 *
 * Derived filter over the same data as Story Map: every top-level
 * `menu:` in the project, with its branches rendered as choice pills.
 * Player perspective — what happens when I pick X?
 *
 * Read-mostly: clicking a pill jumps the Inspector to the target
 * label. Dragging an existing target to a different label would call
 * `redirect_jump` (line-precise via `target_line`); deferred until the
 * Inspector exposes per-event drag affordances.
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, AlertCircle, Pencil } from "lucide-react";
import { api } from "@/api/client";
import type { ChoiceBranch, ChoiceGraph, ChoiceRecord } from "@/api/types";
import { useI18n } from "@/i18n";

export function ChoiceView({
  onSelectLabel,
}: {
  onSelectLabel: (name: string) => void;
}) {
  const { t } = useI18n();
  const choiceQ = useQuery({
    queryKey: ["choice-graph"],
    queryFn: () => api<ChoiceGraph>("/api/choice-graph"),
  });

  if (choiceQ.isLoading) {
    return <div className="p-8 text-sm text-ink3">{t("story.choice.loading")}</div>;
  }
  if (choiceQ.error) {
    return (
      <div className="p-8 text-sm text-rose-600">
        {t("common.error")}: {String(choiceQ.error)}
      </div>
    );
  }
  if (!choiceQ.data || choiceQ.data.count === 0) {
    return <EmptyChoiceView />;
  }

  return (
    <div className="w-full h-full overflow-auto bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <header className="border-b border-line pb-3">
          <span className="text-[10px] uppercase tracking-wide text-ink3 font-mono">
            {t("story.choice.perspective")}
          </span>
          <h1 className="font-serif text-2xl text-ink mt-1">{t("story.choice.title")}</h1>
          <p className="text-xs text-ink3 mt-1">
            {choiceQ.data.count === 1
              ? t("story.choice.summaryOne", { count: choiceQ.data.count })
              : t("story.choice.summaryMany", { count: choiceQ.data.count })}
          </p>
        </header>

        {choiceQ.data.choices.map((choice) => (
          <ChoiceCard
            key={`${choice.label}:${choice.line}`}
            choice={choice}
            file={choice.file}
            onSelectLabel={onSelectLabel}
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({
  choice,
  file,
  onSelectLabel,
}: {
  choice: ChoiceRecord;
  file: string;
  onSelectLabel: (name: string) => void;
}) {
  const { t } = useI18n();
  return (
    <article className="bg-card border border-line rounded-lg shadow-sm overflow-hidden">
      <header className="px-4 py-2.5 border-b border-line bg-cardAlt/40 flex items-baseline justify-between">
        <button
          onClick={() => onSelectLabel(choice.label)}
          className="font-serif text-base text-ink hover:underline text-left"
          title={t("story.choice.openInInspector", { label: choice.label })}
        >
          {choice.label}
        </button>
        <span className="text-[10px] font-mono text-ink3">
          {choice.file}:{choice.line}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {choice.branches.map((branch) => (
          <li
            key={`${branch.line}:${branch.text}`}
            className="px-4 py-2 flex items-start gap-3 text-sm"
          >
            <ChoicePill branch={branch} file={file} />
            {branch.condition && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono"
                style={{
                  background: "var(--rp-card-2)",
                  color: "var(--rp-accent)",
                }}
                title={t("story.choice.condition", { condition: branch.condition })}
              >
                {t("story.choice.condition", { condition: branch.condition })}
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-ink3 mt-1 shrink-0" />
            {branch.target ? (
              <button
                onClick={() => onSelectLabel(branch.target!)}
                className="font-mono text-sm text-ink hover:underline"
                title={t("story.choice.openInInspector", { label: branch.target })}
              >
                {branch.target}
              </button>
            ) : (
              <span className="font-mono text-xs text-ink3 italic inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {t("story.choice.noJump")}
              </span>
            )}
            {branch.target_kind === "call" && (
              <span className="text-[10px] font-mono text-ink3 ml-auto">
                {t("story.choice.viaCall")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

function ChoicePill({ branch, file }: { branch: ChoiceBranch; file: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(branch.text);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Reset the draft if upstream text changes (a refetch after a successful
  // edit) so reopening the pill picks up the new value.
  useEffect(() => {
    if (!editing) setDraft(branch.text);
  }, [branch.text, editing]);

  const submit = useMutation({
    mutationFn: async () => {
      const trimmed = draft.trim();
      if (!trimmed) throw new Error(t("story.choice.emptyText"));
      if (trimmed === branch.text) {
        setEditing(false);
        return;
      }
      const data = await api<{ summary?: string; error?: string }>(
        "/api/menu-choices/edit",
        { method: "POST", json: { file, line: branch.line, text: trimmed } },
      );
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      setEditing(false);
      setError(null);
      qc.invalidateQueries({ queryKey: ["choice-graph"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (err) => setError(String(err)),
  });

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit.mutate();
            } else if (e.key === "Escape") {
              setDraft(branch.text);
              setEditing(false);
              setError(null);
            }
          }}
          disabled={submit.isPending}
          className="px-2 py-0.5 border border-line rounded text-xs bg-card text-ink min-w-[14ch]"
        />
        <button
          type="button"
          onClick={() => submit.mutate()}
          disabled={submit.isPending || !draft.trim()}
          className="text-[10px] font-mono text-ink3 hover:text-ink disabled:opacity-50"
        >
          {submit.isPending ? "…" : t("common.save")}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(branch.text);
            setEditing(false);
            setError(null);
          }}
          className="text-[10px] font-mono text-ink3 hover:text-ink"
        >
          {t("common.cancel")}
        </button>
        {error && <span className="text-[10px] text-rose-600">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs hover:ring-1 hover:ring-line"
      style={{ background: "var(--rp-card-2)", color: "var(--rp-ink-2)" }}
      title={t("story.choice.editTitle")}
    >
      <span>"{branch.text}"</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60" />
    </button>
  );
}

function EmptyChoiceView() {
  const { t } = useI18n();
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-ink3 text-sm">
      <p className="font-serif text-base">{t("story.choice.empty")}</p>
      <p className="text-xs mt-2">
        {t("story.choice.emptyHintPrefix")}
        <code className="font-mono">menu:</code>
        {t("story.choice.emptyHintSuffix")}
      </p>
    </div>
  );
}

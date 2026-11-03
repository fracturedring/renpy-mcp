import { useEffect } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import {
  ACCENT_OPTIONS,
  type AccentId,
  type Density,
  type Prefs,
  type Rail,
  type Theme,
} from "@/lib/usePrefs";
import { SUPPORTED_LOCALES, useI18n, type Locale, type MessageKey } from "@/i18n";

const THEMES: { id: Theme; label: MessageKey }[] = [
  { id: "light", label: "prefs.theme.light" },
  { id: "cream", label: "prefs.theme.cream" },
  { id: "dark", label: "prefs.theme.dark" },
];

const DENSITIES: { id: Density; label: MessageKey }[] = [
  { id: "compact", label: "prefs.density.compact" },
  { id: "regular", label: "prefs.density.regular" },
  { id: "roomy", label: "prefs.density.roomy" },
];

const RAILS: { id: Rail; label: MessageKey; sub: MessageKey }[] = [
  { id: "icon", label: "prefs.rail.icon", sub: "prefs.rail.iconSub" },
  { id: "labeled", label: "prefs.rail.labeled", sub: "prefs.rail.labeledSub" },
  { id: "palette", label: "prefs.rail.palette", sub: "prefs.rail.paletteSub" },
];

export function PrefsModal({
  prefs,
  setPref,
  onClose,
}: {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card text-ink w-[560px] max-w-[92vw] rounded-lg shadow-xl border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-line">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink3">
              {t("prefs.workspace")}
            </div>
            <h2 className="font-serif text-xl">{t("prefs.appearance")}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink3 hover:text-ink p-1"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-6 py-5 space-y-5">
          <Row label={t("prefs.theme")} hint={t("prefs.themeHint")}>
            <Seg
              options={THEMES}
              value={prefs.theme}
              onChange={(v) => setPref("theme", v)}
              labelOf={(o) => t(o.label)}
            />
          </Row>

          <Row label={t("prefs.accent")} hint={t("prefs.accentHint")}>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setPref("accent", a.id as AccentId)}
                  className={clsx(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                    prefs.accent === a.id ? "border-ink" : "border-line hover:border-ink2",
                  )}
                  title={a.label}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: a.value }} />
                  {/* Accent names are colour words, not UI chrome, and stay
                      in English in both locales — a translated colour name
                      would have to be re-guessed against the swatch. */}
                  <span className="font-mono text-ink2">{a.label}</span>
                </button>
              ))}
            </div>
          </Row>

          <Row label={t("prefs.density")} hint={t("prefs.densityHint")}>
            <Seg
              options={DENSITIES}
              value={prefs.density}
              onChange={(v) => setPref("density", v)}
              labelOf={(o) => t(o.label)}
            />
          </Row>

          <Row label={t("prefs.sidebar")} hint={t("prefs.sidebarHint")}>
            <div className="flex gap-2">
              {RAILS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPref("rail", r.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-1.5 rounded-md border text-xs transition-colors min-w-24",
                    prefs.rail === r.id
                      ? "border-ink bg-cardAlt"
                      : "border-line hover:border-ink2",
                  )}
                >
                  <span className="font-medium text-ink">{t(r.label)}</span>
                  <span className="text-[10px] font-mono text-ink3">{t(r.sub)}</span>
                </button>
              ))}
            </div>
          </Row>

          <Row label={t("prefs.language")} hint={t("prefs.languageHint")}>
            <div className="flex gap-2">
              {SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setPref("locale", l.id as Locale)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md border text-xs transition-colors",
                    prefs.locale === l.id
                      ? "border-ink bg-cardAlt font-medium text-ink"
                      : "border-line hover:border-ink2 text-ink2",
                  )}
                  lang={l.id}
                >
                  {/* Locale names are in their own language, as every
                      language picker does: a user who cannot read the
                      current UI must still recognise "简体中文". */}
                  {l.label}
                </button>
              ))}
            </div>
          </Row>
        </div>
        <footer className="px-6 pb-5 pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs text-ink3">{t("prefs.autosaved")}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm text-white"
            style={{ background: "var(--rp-accent)" }}
          >
            {t("prefs.done")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-xs text-ink3 mt-0.5">{hint}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Seg<T extends string>({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly { id: T; label: MessageKey }[];
  value: T;
  onChange: (v: T) => void;
  labelOf: (option: { id: T; label: MessageKey }) => string;
}) {
  return (
    <div className="inline-flex border border-line rounded-md overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={clsx(
            "px-3 py-1.5 text-xs transition-colors",
            value === opt.id
              ? "bg-cardAlt text-ink font-medium"
              : "text-ink2 hover:bg-cardAlt/50",
          )}
        >
          {labelOf(opt)}
        </button>
      ))}
    </div>
  );
}

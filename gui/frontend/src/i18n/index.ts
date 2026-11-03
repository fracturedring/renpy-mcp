/**
 * Tiny i18n runtime for the GUI.
 *
 * Deliberately not react-i18next. The GUI has one non-English target
 * (Simplified Chinese) and no plural rules beyond English's singular/
 * plural pair, so a 40-line hook beats adding a 40 kB dependency plus a
 * backend loader to a frontend that boots from a static `dist/`.
 *
 * Two properties are worth more than flexibility here:
 *
 *   1. **A missing translation is a compile error.** The `zh-Hans`
 *      catalogs are typed as `Record<keyof typeof en, string>`, so
 *      forgetting a key fails `tsc -b` rather than shipping English
 *      text in a Chinese UI. Adding a key to `en` and forgetting the
 *      translation is the single most likely translator mistake, so it
 *      should not be possible to commit.
 *   2. **Translation never changes behaviour.** The locale is a display
 *      concern: `.rpy` content, label names, character names, file
 *      paths, and tool output are never translated, because they are
 *      project data and identifiers rather than UI chrome.
 */
import { createContext, useContext, useMemo } from "react";
import { common } from "./catalog/common";
import { inspector } from "./catalog/inspector";
import { library } from "./catalog/library";
import { shell } from "./catalog/shell";
import { ship } from "./catalog/ship";
import { story } from "./catalog/story";

export type Locale = "en" | "zh-Hans";

export const SUPPORTED_LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "zh-Hans", label: "简体中文" },
];

/**
 * Merge every namespace into one flat key→string map per locale.
 *
 * Keys are dotted (`nav.story`), which keeps call sites readable and
 * makes grep for a rendered string land on the catalog line, but they
 * are flat strings at runtime — no nested lookup, no missing-branch
 * surprises.
 *
 * Exported for the command palette: it matches a query against every
 * locale so a Chinese user can still find a panel by typing the English
 * name, and vice versa.
 */
export const CATALOGS: Record<Locale, Record<string, string>> = {
  en: {
    ...common.en,
    ...shell.en,
    ...story.en,
    ...inspector.en,
    ...library.en,
    ...ship.en,
  },
  "zh-Hans": {
    ...common["zh-Hans"],
    ...shell["zh-Hans"],
    ...story["zh-Hans"],
    ...inspector["zh-Hans"],
    ...library["zh-Hans"],
    ...ship["zh-Hans"],
  },
};

/** Every key that has an English string, i.e. every legal `t()` argument. */
export type MessageKey = keyof typeof CATALOGS.en;

export type Vars = Record<string, string | number>;

/**
 * Substitute `{name}` placeholders.
 *
 * Unknown placeholders are left intact on purpose: seeing `{pid}` in the
 * UI is a loud, harmless bug report, whereas silently rendering an empty
 * string hides a typo until someone reads the source.
 */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const table = CATALOGS[locale] ?? CATALOGS.en;
  // Fall back to English rather than the key itself: an untranslated
  // string should read as a slightly-off sentence, not as `prefs.theme`
  // leaking into the UI.
  const text = table[key] ?? CATALOGS.en[key] ?? key;
  return format(text, vars);
}

export interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

export const I18nContext = createContext<I18n | null>(null);

/**
 * Pick the startup locale.
 *
 * An explicit preference always wins; otherwise follow the browser, and
 * match broadly so `zh-CN`, `zh-TW`, and `zh` all land on Simplified.
 * Traditional Chinese is not translated yet — Simplified is far closer
 * to `zh-TW` than English is, and the alternative (English) is strictly
 * worse for those users.
 */
export function detectLocale(preferred?: Locale): Locale {
  if (preferred) return preferred;
  if (typeof navigator === "undefined") return "en";
  const tags = [navigator.language, ...(navigator.languages ?? [])];
  for (const tag of tags) {
    if (!tag) continue;
    const lower = tag.toLowerCase();
    if (lower === "zh" || lower.startsWith("zh-")) return "zh-Hans";
  }
  return "en";
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}

/** Memoised value+helpers for the provider; keeps re-render cost at zero. */
export function useI18nValue(
  locale: Locale,
  setLocale: (locale: Locale) => void,
): I18n {
  return useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );
}

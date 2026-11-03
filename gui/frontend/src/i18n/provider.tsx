/**
 * Wires the i18n runtime to the persisted locale preference.
 *
 * Kept separate from `index.ts` so the runtime has no React context
 * dependency cycle with `usePrefs`, and so components that only need
 * `translate()` (tests, non-React helpers) do not pull in a provider.
 */
import type { ReactNode } from "react";
import { I18nContext, useI18nValue, type Locale } from "./index";

export function I18nProvider({
  locale,
  setLocale,
  children,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  children: ReactNode;
}) {
  const value = useI18nValue(locale, setLocale);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

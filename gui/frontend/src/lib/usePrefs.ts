/**
 * GUI-wide user preferences: theme, accent, density, sidebar rail style.
 *
 * Backed by `localStorage` under one key (`renpy-mcp-gui-prefs`). The hook
 * also pushes derived values to the document root so component CSS that
 * reads `data-theme` / `data-rail` / `data-density` attributes or the
 * `--rp-accent` variable stays in sync without prop-drilling.
 *
 * Preferences are intentionally GUI-local — they do not round-trip
 * through the MCP server. Authoring decisions live in `.rpy` files;
 * appearance is just per-user editor chrome.
 */
import { useCallback, useEffect, useState } from "react";
import { detectLocale, type Locale } from "@/i18n";

export type Theme = "light" | "cream" | "dark";
export type Density = "compact" | "regular" | "roomy";
export type Rail = "icon" | "labeled" | "palette";
export type AccentId = "plum" | "indigo" | "amber" | "teal" | "rose" | "moss";

export interface Prefs {
  theme: Theme;
  accent: AccentId;
  density: Density;
  rail: Rail;
  locale: Locale;
}

export const ACCENT_OPTIONS: { id: AccentId; value: string; label: string }[] = [
  { id: "plum", value: "oklch(0.55 0.13 350)", label: "plum" },
  { id: "indigo", value: "oklch(0.55 0.16 270)", label: "indigo" },
  { id: "amber", value: "oklch(0.62 0.13 75)", label: "amber" },
  { id: "teal", value: "oklch(0.58 0.10 195)", label: "teal" },
  { id: "rose", value: "oklch(0.62 0.13 20)", label: "rose" },
  { id: "moss", value: "oklch(0.50 0.08 145)", label: "moss" },
];

const DEFAULTS: Prefs = {
  theme: "cream",
  accent: "plum",
  density: "regular",
  rail: "labeled",
  // First run follows the browser rather than forcing English; a stored
  // preference always wins, so this only decides the opening language.
  locale: detectLocale(),
};

const STORAGE_KEY = "renpy-mcp-gui-prefs";

function load(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: Prefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage may be disabled (private mode); failure is fine. */
  }
}

export function accentValue(id: AccentId): string {
  return (ACCENT_OPTIONS.find((a) => a.id === id) ?? ACCENT_OPTIONS[0]).value;
}

export function usePrefs(): {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  accentColor: string;
} {
  const [prefs, setPrefs] = useState<Prefs>(() => load());

  // Sync state → DOM. Each effect is narrowly scoped so a single
  // preference change doesn't re-touch unrelated attributes.
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    document.documentElement.dataset.rail = prefs.rail;
  }, [prefs.rail]);

  useEffect(() => {
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.density]);

  useEffect(() => {
    document.documentElement.style.setProperty("--rp-accent", accentValue(prefs.accent));
  }, [prefs.accent]);

  // Keep <html lang> honest so screen readers, spellcheck, and CSS
  // `:lang()` / font fallback pick the right language.
  useEffect(() => {
    document.documentElement.lang = prefs.locale;
  }, [prefs.locale]);

  // Persist on every change.
  useEffect(() => {
    save(prefs);
  }, [prefs]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  return { prefs, setPref, accentColor: accentValue(prefs.accent) };
}

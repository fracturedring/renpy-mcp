/**
 * Relative timestamps, shared by the header pill and the recent-edits
 * list. Both had their own copy producing identical English strings;
 * translating the same three phrases twice invited drift.
 */
import type { MessageKey, Vars } from "@/i18n";

type T = (key: MessageKey, vars?: Vars) => string;

/** `seconds` is elapsed time, never a wall-clock value. */
export function relativeFromSeconds(t: T, seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  if (clamped < 60) return t("time.secondsAgo", { count: clamped });
  const minutes = Math.round(clamped / 60);
  if (minutes < 60) return t("time.minutesAgo", { count: minutes });
  return t("time.hoursAgo", { count: Math.round(minutes / 60) });
}

/** Same, from a `Date` (watcher events carry one). */
export function relativeFromDate(t: T, at: Date): string {
  return relativeFromSeconds(t, (Date.now() - at.getTime()) / 1000);
}

/** Same, from a unix timestamp in seconds (the recent-edits API). */
export function relativeFromTimestamp(t: T, ts: number): string {
  return relativeFromSeconds(t, Date.now() / 1000 - ts);
}

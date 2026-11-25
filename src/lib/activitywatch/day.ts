import { zonedTimeToUtc } from "@/lib/date";
import { periodOf } from "./period";

const DAY_MINUTES = 24 * 60;

// The calendar day of `dateKey` in America/Guayaquil as one ActivityWatch
// period, cut at `nowMs` while the day is still running. Null for a day that
// has not started yet.
export function dayRange(
  dateKey: string,
  nowMs: number
): { period: string; finished: boolean } | null {
  const startMs = zonedTimeToUtc(dateKey, 0).getTime();
  const endMs = zonedTimeToUtc(dateKey, DAY_MINUTES).getTime();
  if (startMs >= nowMs) return null;
  const finished = endMs <= nowMs;
  return { period: periodOf(startMs, finished ? endMs : nowMs), finished };
}

// The longest `limit` items, plus the rest summed into one entry.
export function topWithRest<T extends { seconds: number }>(
  items: T[],
  limit: number
): { top: T[]; rest: { count: number; seconds: number } | null } {
  const sorted = [...items].sort((a, b) => b.seconds - a.seconds);
  const others = sorted.slice(limit);
  return {
    top: sorted.slice(0, limit),
    rest:
      others.length > 0
        ? { count: others.length, seconds: others.reduce((sum, i) => sum + i.seconds, 0) }
        : null,
  };
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "<1 min";
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// Time per top-level category ("Work › Programming" counts as "Work"),
// longest first.
export function byTopCategory(
  categories: { path: string[]; seconds: number }[]
): { name: string; seconds: number }[] {
  const totals = new Map<string, number>();
  for (const { path, seconds } of categories) {
    const name = path[0] ?? "Uncategorized";
    totals.set(name, (totals.get(name) ?? 0) + seconds);
  }
  return [...totals]
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

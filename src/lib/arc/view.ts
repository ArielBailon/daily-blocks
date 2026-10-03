// Pure helpers for the Winter Arc view. Dates are "YYYY-MM-DD" keys.

import { ARC_DAYS, ARC_START } from "@/lib/arc/config";
import { addDays, arcEnd, weekStartOf, type WeekResult } from "@/lib/arc/rules";
import type { ArcSummary } from "@/lib/arc/summary";

export type ArcProgress =
  | { kind: "before" }
  | { kind: "during"; day: number }
  | { kind: "after" };

export function arcProgress(
  todayKey: string,
  start: string = ARC_START
): ArcProgress {
  if (todayKey < start) return { kind: "before" };
  if (todayKey > arcEnd(start)) return { kind: "after" };
  let day = 1;
  while (addDays(start, day - 1) < todayKey) day += 1;
  return { kind: "during", day };
}

// The Monday-to-Sunday week that contains today, only while today is inside the
// arc. The first week may start before the arc.
export function currentWeek(
  summary: ArcSummary,
  todayKey: string,
  start: string = ARC_START
): WeekResult | null {
  if (arcProgress(todayKey, start).kind !== "during") return null;
  const weekStart = weekStartOf(todayKey);
  return summary.weeks.find((w) => w.weekStart === weekStart) ?? null;
}

// Whole percentage, or null when nothing was evaluated yet.
export function percent(passed: number, total: number): number | null {
  return total === 0 ? null : Math.round((passed / total) * 100);
}

// Day number 1..ARC_DAYS from the `dia` search param; anything else is null.
export function parseDayParam(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
  const day = Number(value);
  return day >= 1 && day <= ARC_DAYS ? day : null;
}

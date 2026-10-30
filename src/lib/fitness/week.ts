import { parseDateKey, resolveToday, toDateKey } from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar day in America/Guayaquil for an instant, as YYYY-MM-DD.
export function localDateKey(now: Date = new Date()): string {
  return toDateKey(resolveToday(now).date);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  if (!date) throw new Error(`Invalid date key: ${dateKey}`);
  return toDateKey(new Date(date.getTime() + days * DAY_MS));
}

// ISO weekday: 1 = Monday ... 7 = Sunday.
export function isoWeekday(dateKey: string): number {
  const date = parseDateKey(dateKey);
  if (!date) throw new Error(`Invalid date key: ${dateKey}`);
  return ((date.getUTCDay() + 6) % 7) + 1;
}

export function weekStart(dateKey: string): string {
  return addDays(dateKey, -(isoWeekday(dateKey) - 1));
}

export function weekEnd(dateKey: string): string {
  return addDays(weekStart(dateKey), 6);
}

export function weekDates(dateKey: string): string[] {
  const start = weekStart(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) throw new Error("Invalid date key");
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

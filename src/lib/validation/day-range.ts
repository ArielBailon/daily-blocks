import { parseDateKey } from "@/lib/date";

export const MAX_RANGE_DAYS = 120;

const DAY_MS = 86_400_000;

export type DayRangeResult =
  | { ok: true; from: Date; to: Date }
  | { ok: false; error: string };

// `from` and `to` hold every value the query string carried for that name, so a
// missing parameter is [] and a repeated one has several entries.
export function parseDayRange(from: string[], to: string[]): DayRangeResult {
  if (from.length !== 1 || to.length !== 1) {
    return { ok: false, error: "Indica una sola fecha en from y en to" };
  }
  const start = parseDateKey(from[0]);
  const end = parseDateKey(to[0]);
  if (!start || !end) {
    return { ok: false, error: "Las fechas deben tener el formato AAAA-MM-DD" };
  }
  if (start.getTime() > end.getTime()) {
    return { ok: false, error: "from no puede ser posterior a to" };
  }
  const days = (end.getTime() - start.getTime()) / DAY_MS + 1;
  if (days > MAX_RANGE_DAYS) {
    return { ok: false, error: `El rango no puede superar ${MAX_RANGE_DAYS} días` };
  }
  return { ok: true, from: start, to: end };
}

import { SCHEDULED_WEEKDAYS } from "./streak";
import { addDays, daysBetween, isoWeekday } from "./week";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Average kg change per week over the last `weeks` weeks, first to last entry in
// the window. Negative means losing weight. Needs two entries on different days.
export function weeklyPace(
  entries: { date: string; kg: number }[],
  todayKey: string,
  weeks: number
): number | null {
  const windowStart = addDays(todayKey, -weeks * 7);
  const inWindow = entries
    .filter((e) => e.date >= windowStart && e.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (inWindow.length < 2) return null;

  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days === 0) return null;
  return round2(((last.kg - first.kg) / days) * 7);
}

// Scheduled training days in the last `weeks` weeks (ending today) that got a
// session. Today only counts as scheduled once it has one, so a pending
// workout never lowers the ratio.
export function adherence(
  sessionDates: ReadonlySet<string>,
  todayKey: string,
  weeks: number
): {
  scheduled: number;
  done: number;
  ratio: number | null;
  extraSessions: number;
} {
  let scheduled = 0;
  let done = 0;
  let extra = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(todayKey, -i);
    const hasSession = sessionDates.has(day);
    if (SCHEDULED_WEEKDAYS.has(isoWeekday(day))) {
      if (i === 0 && !hasSession) continue;
      scheduled++;
      if (hasSession) done++;
    } else if (hasSession) {
      extra++;
    }
  }
  return {
    scheduled,
    done,
    ratio: scheduled === 0 ? null : round2(done / scheduled),
    extraSessions: extra,
  };
}

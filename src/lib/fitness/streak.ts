import { addDays, isoWeekday } from "./week";

// Mon, Tue, Wed, Fri, Sat. Thursday and Sunday are rest days.
export const SCHEDULED_WEEKDAYS = new Set([1, 2, 3, 5, 6]);
const MAX_LOOKBACK_DAYS = 3650;

// Walks back from today. A scheduled day without a COMPLETED session ends the
// streak; a rest day never does. Today without a session is still pending.
export function trainingStreak(
  sessionDates: ReadonlySet<string>,
  todayKey: string
): number {
  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const day = addDays(todayKey, -i);
    if (sessionDates.has(day)) {
      streak++;
    } else if (i > 0 && SCHEDULED_WEEKDAYS.has(isoWeekday(day))) {
      break;
    }
  }
  return streak;
}

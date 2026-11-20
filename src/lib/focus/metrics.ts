export type FocusDaySummary = {
  workSeconds: number;
  minutes: number;
  completed: number;
  abandoned: number;
  breaksSkipped: number;
};

export type CountableSession = {
  status: string;
  actualWorkSeconds: number;
  breakSkipped: boolean;
};

const EMPTY: FocusDaySummary = {
  workSeconds: 0,
  minutes: 0,
  completed: 0,
  abandoned: 0,
  breaksSkipped: 0,
};

export function emptyFocusSummary(): FocusDaySummary {
  return { ...EMPTY };
}

// Only finished sessions count: a running or never-settled one has no final time.
export function summarizeFocus(sessions: CountableSession[]): FocusDaySummary {
  const summary = emptyFocusSummary();
  for (const s of sessions) {
    if (s.status !== "COMPLETED" && s.status !== "ABANDONED") continue;
    summary.workSeconds += s.actualWorkSeconds;
    if (s.status === "COMPLETED") summary.completed += 1;
    else summary.abandoned += 1;
    if (s.breakSkipped) summary.breaksSkipped += 1;
  }
  summary.minutes = Math.round(summary.workSeconds / 60);
  return summary;
}

export function summarizeByDay(
  byDay: Record<string, CountableSession[]>
): Record<string, FocusDaySummary> {
  return Object.fromEntries(
    Object.entries(byDay).map(([key, sessions]) => [key, summarizeFocus(sessions)])
  );
}

// Rounded once from the summed seconds, never from rounded days.
export function focusTotalForDays(
  byDay: Record<string, FocusDaySummary>,
  keys: string[]
): number {
  const seconds = keys.reduce((sum, key) => sum + (byDay[key]?.workSeconds ?? 0), 0);
  return Math.round(seconds / 60);
}

export function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${hours} h`
    : `${hours} h ${String(rest).padStart(2, "0")} min`;
}

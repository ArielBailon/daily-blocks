export type LoggedSet = { weightKg: number; reps: number };

export function e1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

// Bodyweight sets (0 kg) would all score 0, so they rank as if they moved 1 kg.
export function setScore(set: LoggedSet): number {
  return e1rm(Math.max(set.weightKg, 1), set.reps);
}

export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null;
  for (const set of sets) {
    if (set.reps <= 0) continue;
    if (!best || setScore(set) > setScore(best)) best = set;
  }
  return best;
}

const PR_EPSILON = 0.01;

// A PR needs prior history for the exercise: the first time never counts.
export function detectPR(
  current: LoggedSet[],
  previous: LoggedSet[]
): { best: LoggedSet | null; isPR: boolean } {
  const best = bestSet(current);
  const previousBest = bestSet(previous);
  if (!best || !previousBest) return { best, isPR: false };
  return {
    best,
    isPR: setScore(best) > setScore(previousBest) + PR_EPSILON,
  };
}

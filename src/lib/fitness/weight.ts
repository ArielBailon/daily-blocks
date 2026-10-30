import { addDays } from "./week";

export type GoalInput = {
  startKg: number;
  goalLowKg: number;
  goalHighKg: number;
  targetRateKgPerWeek: number;
  phase: "CUT" | "BULK";
};

// Fallback when no weigh-in exists yet.
export const DEFAULT_CURRENT_KG = 76.1;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function goalMidpoint(goal: GoalInput): number {
  return (goal.goalLowKg + goal.goalHighKg) / 2;
}

// Kilos still to go until the edge of the goal range.
export function kgToGoal(currentKg: number, goal: GoalInput): number {
  const remaining =
    goal.phase === "CUT"
      ? currentKg - goal.goalHighKg
      : goal.goalLowKg - currentKg;
  return round1(Math.max(0, remaining));
}

// 0 at the starting weight, 1 at the goal midpoint.
export function goalProgress(currentKg: number, goal: GoalInput): number {
  const total = goalMidpoint(goal) - goal.startKg;
  if (total === 0) return 1;
  return Math.min(1, Math.max(0, (currentKg - goal.startKg) / total));
}

export function projectArrival(
  currentKg: number,
  goal: GoalInput,
  todayKey: string
): { weeks: number; arrivalDate: string } | null {
  if (goal.targetRateKgPerWeek <= 0) return null;
  const remaining =
    goal.phase === "CUT"
      ? currentKg - goalMidpoint(goal)
      : goalMidpoint(goal) - currentKg;
  if (remaining <= 0) return { weeks: 0, arrivalDate: todayKey };
  const weeks = remaining / goal.targetRateKgPerWeek;
  return {
    weeks: Math.ceil(weeks),
    arrivalDate: addDays(todayKey, Math.ceil(weeks * 7)),
  };
}

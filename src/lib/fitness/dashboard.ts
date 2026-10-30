import { toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getGoal, listBodyWeight, type BodyWeightDto, type GoalDto } from "./body";
import { setScore, type LoggedSet } from "./records";
import { trainingStreak } from "./streak";
import { isoWeekday, localDateKey, weekEnd, weekStart } from "./week";

const SPARKLINE_ENTRIES = 20;
const TOP_PR_COUNT = 3;

export type TopPR = {
  exerciseId: number;
  name: string;
  slug: string;
  weightKg: number;
  reps: number;
  date: string;
};

// Best set per exercise by e1RM across all completed sessions.
export async function loadTopPRs(limit = TOP_PR_COUNT): Promise<TopPR[]> {
  const rows = await prisma.setLog.findMany({
    where: {
      completed: true,
      reps: { gt: 0 },
      sessionExercise: { session: { status: "COMPLETED" } },
    },
    select: {
      weightKg: true,
      reps: true,
      sessionExercise: {
        select: {
          exercise: { select: { id: true, name: true, slug: true } },
          session: { select: { date: true } },
        },
      },
    },
  });

  const best = new Map<number, TopPR & { score: number }>();
  for (const row of rows) {
    const set: LoggedSet = {
      weightKg: row.weightKg?.toNumber() ?? 0,
      reps: row.reps ?? 0,
    };
    const score = setScore(set);
    const { exercise, session } = row.sessionExercise;
    const current = best.get(exercise.id);
    if (!current || score > current.score) {
      best.set(exercise.id, {
        exerciseId: exercise.id,
        name: exercise.name,
        slug: exercise.slug,
        weightKg: set.weightKg,
        reps: set.reps,
        date: toDateKey(session.date),
        score,
      });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      exerciseId: entry.exerciseId,
      name: entry.name,
      slug: entry.slug,
      weightKg: entry.weightKg,
      reps: entry.reps,
      date: entry.date,
    }));
}

export type DashboardData = {
  todayKey: string;
  todayWeekday: number;
  goal: GoalDto;
  weights: BodyWeightDto[];
  stats: { streak: number; thisWeek: number; total: number };
  active: { id: number; name: string } | null;
  days: { key: string; label: string; subtitle: string; dayOfWeek: number }[];
  topPRs: TopPR[];
};

export async function loadDashboard(): Promise<DashboardData> {
  const todayKey = localDateKey();
  const [goal, weights, completed, active, days, topPRs] = await Promise.all([
    getGoal(),
    listBodyWeight({ limit: SPARKLINE_ENTRIES }),
    prisma.workoutSession.findMany({
      where: { status: "COMPLETED" },
      select: { date: true },
    }),
    prisma.workoutSession.findFirst({
      where: { status: "IN_PROGRESS" },
      select: { id: true, name: true },
    }),
    prisma.routineDay.findMany({
      orderBy: { order: "asc" },
      select: { key: true, label: true, subtitle: true, dayOfWeek: true },
    }),
    loadTopPRs(),
  ]);

  const keys = completed.map((s) => toDateKey(s.date));
  const start = weekStart(todayKey);
  const end = weekEnd(todayKey);

  return {
    todayKey,
    todayWeekday: isoWeekday(todayKey),
    goal,
    weights,
    stats: {
      streak: trainingStreak(new Set(keys), todayKey),
      thisWeek: keys.filter((k) => k >= start && k <= end).length,
      total: keys.length,
    },
    active,
    days,
    topPRs,
  };
}

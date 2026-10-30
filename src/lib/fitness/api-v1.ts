import { parseDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getGoal, listBodyWeight } from "./body";
import { loadTopPRs } from "./dashboard";
import { adherence, weeklyPace } from "./pace";
import { loadExerciseProgress, loadWeekVolume } from "./progress";
import { e1rm } from "./records";
import { MUSCLE_GROUPS, type MuscleMap } from "./seed-data";
import { trainingStreak } from "./streak";
import { plannedVolume, volumeStatus } from "./volume";
import { addDays, daysBetween, localDateKey, weekEnd, weekStart } from "./week";
import { goalMidpoint, kgToGoal, projectArrival } from "./weight";

const round2 = (n: number) => Math.round(n * 100) / 100;
const MAX_RANGE_DAYS = 366;
const ADHERENCE_WEEKS = 4;

export type DateRange = { from: string; to: string };

export function resolveRange(
  query: { from?: string; to?: string },
  defaultDays: number
): DateRange | { error: string } {
  const to = query.to ?? localDateKey();
  const from = query.from ?? addDays(to, -defaultDays);
  if (from > to) return { error: "from no puede ser posterior a to" };
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return { error: `El rango no puede superar ${MAX_RANGE_DAYS} días` };
  }
  return { from, to };
}

export async function loadSummary() {
  const today = localDateKey();
  const [goal, weights, completed, topPRs] = await Promise.all([
    getGoal(),
    listBodyWeight({ from: addDays(today, -ADHERENCE_WEEKS * 7), limit: 500 }),
    prisma.workoutSession.findMany({
      where: { status: "COMPLETED" },
      select: { date: true },
    }),
    loadTopPRs(5),
  ]);
  const latest = await listBodyWeight({ limit: 1 });
  const current = latest[0] ?? null;

  const dates = completed.map((s) => toDateKey(s.date));
  const dateSet = new Set(dates);
  const pace4 = weeklyPace(weights, today, 4);
  const start = weekStart(today);
  const end = weekEnd(today);

  // Pace is the signed weekly change; the goal direction decides what is progress.
  const towardGoal = (pace: number | null) =>
    pace !== null && (goal.phase === "CUT" ? pace < 0 : pace > 0);
  const midpoint = goalMidpoint(goal);

  return {
    asOf: today,
    bodyWeight: {
      currentKg: current?.kg ?? null,
      lastEntryDate: current?.date ?? null,
    },
    goal,
    remainingKg: current ? kgToGoal(current.kg, goal) : null,
    pace: {
      last2WeeksKgPerWeek: weeklyPace(weights, today, 2),
      last4WeeksKgPerWeek: pace4,
    },
    projection: current
      ? {
          atTargetRate: projectArrival(current.kg, goal, today),
          atCurrentPace:
            pace4 !== null && towardGoal(pace4)
              ? projectArrival(
                  current.kg,
                  { ...goal, targetRateKgPerWeek: Math.abs(pace4) },
                  today
                )
              : null,
          targetKg: midpoint,
        }
      : null,
    streakDays: trainingStreak(dateSet, today),
    sessions: {
      thisWeek: dates.filter((d) => d >= start && d <= end).length,
      total: dates.length,
    },
    topPRs: topPRs.map((pr) => ({
      exercise: pr.slug,
      name: pr.name,
      weightKg: pr.weightKg,
      reps: pr.reps,
      e1rm: round2(e1rm(pr.weightKg, pr.reps)),
      date: pr.date,
    })),
    adherence: { windowWeeks: ADHERENCE_WEEKS, ...adherence(dateSet, today, ADHERENCE_WEEKS) },
  };
}

export async function loadSessionsRange({ from, to }: DateRange) {
  const rows = await prisma.workoutSession.findMany({
    where: {
      status: "COMPLETED",
      date: { gte: parseDateKey(from)!, lte: parseDateKey(to)! },
    },
    orderBy: [{ date: "asc" }, { startedAt: "asc" }],
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: { select: { slug: true, name: true } },
          sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    date: toDateKey(s.date),
    name: s.name,
    startedAt: s.startedAt.toISOString(),
    finishedAt: s.finishedAt?.toISOString() ?? null,
    durationMin: s.durationMin,
    exercises: s.exercises
      .filter((e) => e.sets.length > 0)
      .map((e) => {
        const bestWeight = e.bestWeight?.toNumber() ?? null;
        return {
          exercise: e.exercise.slug,
          name: e.exercise.name,
          target: e.target,
          isPR: e.isPR,
          bestSet:
            bestWeight !== null && e.bestReps !== null
              ? {
                  weightKg: bestWeight,
                  reps: e.bestReps,
                  e1rm: round2(e1rm(bestWeight, e.bestReps)),
                }
              : null,
          sets: e.sets.map((x) => ({
            setNumber: x.setNumber,
            weightKg: x.weightKg?.toNumber() ?? 0,
            reps: x.reps,
          })),
        };
      }),
  }));
}

export async function loadVolumeReport(weekParam: string | undefined) {
  const week = weekStart(weekParam ?? localDateKey());
  const done = await loadWeekVolume(week);
  const planned = plannedVolume();
  return {
    week,
    weekEnd: weekEnd(week),
    muscles: MUSCLE_GROUPS.map((m) => ({
      key: m.key,
      label: m.label,
      done: done[m.key],
      planned: planned[m.key],
      mev: m.mev,
      mavLow: m.mavLow,
      mavHigh: m.mavHigh,
      status: volumeStatus(done[m.key], m),
    })),
  };
}

export async function loadProgression(slug: string, limit: number) {
  const exercise = await prisma.exercise.findUnique({
    where: { slug },
    select: { slug: true, name: true, muscles: true },
  });
  if (!exercise) return null;

  const [progress] = await loadExerciseProgress(slug);
  const sessions = (progress?.sessions ?? []).slice(-limit);
  return {
    exercise: {
      slug: exercise.slug,
      name: exercise.name,
      muscles: exercise.muscles as MuscleMap,
    },
    sessions: sessions.map((s) => ({
      date: s.date,
      bestSet: { weightKg: s.bestWeight, reps: s.bestReps },
      e1rm: s.e1rm,
      maxWeightKg: s.maxWeight,
    })),
  };
}

export async function loadRoutine() {
  const days = await prisma.routineDay.findMany({
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { slug: true, name: true, muscles: true } } },
      },
      mobility: { orderBy: [{ type: "asc" }, { order: "asc" }] },
    },
  });

  const planned = plannedVolume();
  return {
    days: days.map((d) => ({
      key: d.key,
      label: d.label,
      subtitle: d.subtitle,
      dayOfWeek: d.dayOfWeek,
      exercises: d.exercises.map((x) => ({
        order: x.order,
        exercise: x.exercise.slug,
        name: x.exercise.name,
        sets: x.sets,
        reps: x.reps,
        rir: x.rir,
        note: x.note,
        muscles: x.exercise.muscles as MuscleMap,
      })),
      warmup: d.mobility.filter((m) => m.type === "WARMUP").map((m) => m.text),
      cooldown: d.mobility.filter((m) => m.type === "COOLDOWN").map((m) => m.text),
    })),
    restDays: [1, 2, 3, 4, 5, 6, 7].filter(
      (n) => !days.some((d) => d.dayOfWeek === n)
    ),
    landmarks: MUSCLE_GROUPS.map((m) => ({
      key: m.key,
      label: m.label,
      mev: m.mev,
      mavLow: m.mavLow,
      mavHigh: m.mavHigh,
      plannedSetsPerWeek: planned[m.key],
    })),
  };
}

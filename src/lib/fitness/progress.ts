import { parseDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { e1rm, setScore, type LoggedSet } from "./records";
import type { MuscleMap } from "./seed-data";
import { weeklyVolume, type MuscleVolume } from "./volume";
import { addDays } from "./week";

// Sets of discarded sessions never count; a session still in progress does.
export async function loadWeekVolume(weekStartKey: string): Promise<MuscleVolume> {
  const start = parseDateKey(weekStartKey)!;
  const end = parseDateKey(addDays(weekStartKey, 6))!;
  const rows = await prisma.sessionExercise.findMany({
    where: {
      session: { status: { not: "DISCARDED" }, date: { gte: start, lte: end } },
    },
    select: {
      exercise: { select: { muscles: true } },
      sets: { where: { completed: true }, select: { id: true } },
    },
  });
  return weeklyVolume(
    rows.map((r) => ({
      muscles: r.exercise.muscles as MuscleMap,
      completedSets: r.sets.length,
    }))
  );
}

export type ExerciseSessionPoint = {
  sessionId: number;
  date: string;
  bestWeight: number;
  bestReps: number;
  e1rm: number;
  maxWeight: number;
};

export type ExerciseProgress = {
  exerciseId: number;
  slug: string;
  name: string;
  sessions: ExerciseSessionPoint[];
  pr: { weightKg: number; reps: number; date: string };
};

function bestOf(sets: LoggedSet[]): LoggedSet {
  return sets.reduce((a, b) => (setScore(b) > setScore(a) ? b : a));
}

// Per exercise, one point per COMPLETED session in chronological order.
export async function loadExerciseProgress(
  slug?: string
): Promise<ExerciseProgress[]> {
  const rows = await prisma.setLog.findMany({
    where: {
      completed: true,
      reps: { gt: 0 },
      sessionExercise: {
        session: { status: "COMPLETED" },
        ...(slug && { exercise: { slug } }),
      },
    },
    select: {
      weightKg: true,
      reps: true,
      sessionExercise: {
        select: {
          exercise: { select: { id: true, slug: true, name: true } },
          session: { select: { id: true, date: true, startedAt: true } },
        },
      },
    },
  });

  type Bucket = {
    exercise: { id: number; slug: string; name: string };
    sessions: Map<number, { date: Date; startedAt: Date; sets: LoggedSet[] }>;
  };
  const byExercise = new Map<number, Bucket>();
  for (const row of rows) {
    const { exercise, session } = row.sessionExercise;
    const bucket = byExercise.get(exercise.id) ?? {
      exercise,
      sessions: new Map(),
    };
    const entry = bucket.sessions.get(session.id) ?? {
      date: session.date,
      startedAt: session.startedAt,
      sets: [],
    };
    entry.sets.push({ weightKg: row.weightKg?.toNumber() ?? 0, reps: row.reps ?? 0 });
    bucket.sessions.set(session.id, entry);
    byExercise.set(exercise.id, bucket);
  }

  return [...byExercise.values()].map(({ exercise, sessions }) => {
    const points = [...sessions.entries()]
      .sort(
        ([, a], [, b]) =>
          a.date.getTime() - b.date.getTime() ||
          a.startedAt.getTime() - b.startedAt.getTime()
      )
      .map(([sessionId, s]): ExerciseSessionPoint => {
        const best = bestOf(s.sets);
        return {
          sessionId,
          date: toDateKey(s.date),
          bestWeight: best.weightKg,
          bestReps: best.reps,
          e1rm: Math.round(e1rm(best.weightKg, best.reps) * 100) / 100,
          maxWeight: Math.max(...s.sets.map((x) => x.weightKg)),
        };
      });
    const prPoint = points.reduce((a, b) =>
      setScore({ weightKg: b.bestWeight, reps: b.bestReps }) >
      setScore({ weightKg: a.bestWeight, reps: a.bestReps })
        ? b
        : a
    );
    return {
      exerciseId: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      sessions: points,
      pr: { weightKg: prPoint.bestWeight, reps: prPoint.bestReps, date: prPoint.date },
    };
  });
}

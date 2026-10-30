import { toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export type HistorySession = {
  id: number;
  name: string;
  date: string;
  durationMin: number | null;
  totalSets: number;
  exercises: {
    name: string;
    isPR: boolean;
    bestWeight: number | null;
    bestReps: number | null;
    sets: { weightKg: number; reps: number }[];
  }[];
};

export const HISTORY_PAGE_SIZE = 10;

export async function loadHistory(opts: {
  limit?: number;
  cursor?: number;
}): Promise<{ sessions: HistorySession[]; nextCursor: number | null }> {
  const limit = opts.limit ?? HISTORY_PAGE_SIZE;
  // One extra row tells whether another page exists and where it starts.
  const rows = await prisma.workoutSession.findMany({
    where: { status: "COMPLETED" },
    orderBy: [{ date: "desc" }, { startedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.cursor !== undefined && { cursor: { id: opts.cursor } }),
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: { select: { name: true } },
          sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  const page = rows.slice(0, limit);
  return {
    sessions: page.map((s) => ({
      id: s.id,
      name: s.name,
      date: toDateKey(s.date),
      durationMin: s.durationMin,
      totalSets: s.exercises.reduce((n, e) => n + e.sets.length, 0),
      exercises: s.exercises
        .filter((e) => e.sets.length > 0)
        .map((e) => ({
          name: e.exercise.name,
          isPR: e.isPR,
          bestWeight: e.bestWeight?.toNumber() ?? null,
          bestReps: e.bestReps,
          sets: e.sets.map((x) => ({
            weightKg: x.weightKg?.toNumber() ?? 0,
            reps: x.reps ?? 0,
          })),
        })),
    })),
    nextCursor: rows.length > limit ? rows[limit].id : null,
  };
}

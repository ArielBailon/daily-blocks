import { Prisma } from "@/generated/prisma/client";
import { parseDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { sessionUpdateInput } from "@/lib/validation/fitness";
import { detectPR, type LoggedSet } from "./records";
import type { MuscleKey, MuscleMap } from "./seed-data";
import { localDateKey } from "./week";

const EXTRA_EXERCISE_TARGET = "3 series · RIR 1–2";
const EXTRA_EXERCISE_SETS = 3;
// The database is remote, so the default 5 s interactive transaction limit is tight.
const TX_OPTIONS = { timeout: 15_000 };

const sessionInclude = {
  routineDay: {
    include: {
      mobility: { orderBy: [{ type: "asc" }, { order: "asc" }] },
    },
  },
  exercises: {
    orderBy: { order: "asc" },
    include: {
      exercise: true,
      sets: { orderBy: { setNumber: "asc" } },
    },
  },
} satisfies Prisma.WorkoutSessionInclude;

type SessionRow = Prisma.WorkoutSessionGetPayload<{
  include: typeof sessionInclude;
}>;

export type PreviousSet = {
  setNumber: number;
  weightKg: number;
  reps: number;
};

export type SessionDto = {
  id: number;
  name: string;
  date: string;
  status: "IN_PROGRESS" | "COMPLETED" | "DISCARDED";
  startedAt: string;
  finishedAt: string | null;
  durationMin: number | null;
  routineDayKey: string | null;
  warmup: string[];
  cooldown: string[];
  warmupChecked: number[];
  cooldownChecked: number[];
  cardioDone: boolean;
  exercises: {
    id: number;
    exerciseId: number;
    slug: string;
    name: string;
    primaryMuscle: MuscleKey | null;
    order: number;
    target: string;
    note: string | null;
    isPR: boolean;
    bestWeight: number | null;
    bestReps: number | null;
    previous: PreviousSet[];
    sets: {
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
      completed: boolean;
    }[];
  }[];
};

const num = (d: Prisma.Decimal | null) => (d === null ? null : d.toNumber());

export function primaryMuscle(muscles: MuscleMap): MuscleKey | null {
  // Highest factor wins; some exercises (back extensions) only have indirect muscles.
  const top = Object.entries(muscles).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0];
  return top ? (top[0] as MuscleKey) : null;
}

// Sets of the most recent COMPLETED session that included this exercise.
async function loadPrevious(
  sessionId: number,
  exerciseId: number
): Promise<PreviousSet[]> {
  const last = await prisma.sessionExercise.findFirst({
    where: {
      exerciseId,
      session: { status: "COMPLETED", id: { not: sessionId } },
    },
    orderBy: [{ session: { date: "desc" } }, { session: { startedAt: "desc" } }],
    include: {
      sets: {
        where: { completed: true, reps: { not: null } },
        orderBy: { setNumber: "asc" },
      },
    },
  });
  return (last?.sets ?? []).map((s) => ({
    setNumber: s.setNumber,
    weightKg: num(s.weightKg) ?? 0,
    reps: s.reps ?? 0,
  }));
}

async function toDto(row: SessionRow): Promise<SessionDto> {
  const previous = await Promise.all(
    row.exercises.map((e) => loadPrevious(row.id, e.exerciseId))
  );
  const mobility = row.routineDay?.mobility ?? [];
  return {
    id: row.id,
    name: row.name,
    date: toDateKey(row.date),
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationMin: row.durationMin,
    routineDayKey: row.routineDay?.key ?? null,
    warmup: mobility.filter((m) => m.type === "WARMUP").map((m) => m.text),
    cooldown: mobility.filter((m) => m.type === "COOLDOWN").map((m) => m.text),
    warmupChecked: row.warmupChecked,
    cooldownChecked: row.cooldownChecked,
    cardioDone: row.cardioDone,
    exercises: row.exercises.map((e, i) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      slug: e.exercise.slug,
      name: e.exercise.name,
      primaryMuscle: primaryMuscle(e.exercise.muscles as MuscleMap),
      order: e.order,
      target: e.target,
      note: e.note,
      isPR: e.isPR,
      bestWeight: num(e.bestWeight),
      bestReps: e.bestReps,
      previous: previous[i],
      sets: e.sets.map((s) => ({
        setNumber: s.setNumber,
        weightKg: num(s.weightKg),
        reps: s.reps,
        completed: s.completed,
      })),
    })),
  };
}

export async function loadSessionDto(id: number): Promise<SessionDto | null> {
  const row = await prisma.workoutSession.findUnique({
    where: { id },
    include: sessionInclude,
  });
  return row ? toDto(row) : null;
}

export async function loadActiveSessionDto(): Promise<SessionDto | null> {
  const row = await prisma.workoutSession.findFirst({
    where: { status: "IN_PROGRESS" },
    include: sessionInclude,
  });
  return row ? toDto(row) : null;
}

export type CreateResult =
  | { ok: true; id: number }
  | { ok: false; reason: "no-day" | "conflict" };

export async function createSession(
  routineDayKey: string
): Promise<CreateResult> {
  const day = await prisma.routineDay.findUnique({
    where: { key: routineDayKey },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!day) return { ok: false, reason: "no-day" };

  const active = await prisma.workoutSession.findFirst({
    where: { status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (active) return { ok: false, reason: "conflict" };

  try {
    const created = await prisma.workoutSession.create({
      data: {
        routineDayId: day.id,
        name: day.label,
        date: parseDateKey(localDateKey())!,
        exercises: {
          create: day.exercises.map((x) => ({
            exerciseId: x.exerciseId,
            order: x.order,
            target: `${x.sets} × ${x.reps} · RIR ${x.rir}`,
            note: x.note,
            sets: {
              create: Array.from({ length: x.sets }, (_, i) => ({
                setNumber: i + 1,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    // Lost a race against the one-in-progress unique index.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "conflict" };
    }
    throw error;
  }
}

export type UpdateResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "closed" | "invalid" };

type SessionUpdate = z.infer<typeof sessionUpdateInput>;

export async function updateDraft(
  id: number,
  input: SessionUpdate
): Promise<UpdateResult> {
  return prisma.$transaction(async (tx): Promise<UpdateResult> => {
    const session = await tx.workoutSession.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!session) return { ok: false, reason: "not-found" };
    if (session.status !== "IN_PROGRESS") return { ok: false, reason: "closed" };

    if (
      input.warmupChecked ||
      input.cooldownChecked ||
      input.cardioDone !== undefined
    ) {
      await tx.workoutSession.update({
        where: { id },
        data: {
          ...(input.warmupChecked && { warmupChecked: input.warmupChecked }),
          ...(input.cooldownChecked && {
            cooldownChecked: input.cooldownChecked,
          }),
          ...(input.cardioDone !== undefined && {
            cardioDone: input.cardioDone,
          }),
        },
      });
    }

    if (input.addExercise) {
      const exercise = await tx.exercise.findFirst({
        where: { id: input.addExercise.exerciseId, active: true },
        select: { id: true },
      });
      if (!exercise) return { ok: false, reason: "invalid" };
      const last = await tx.sessionExercise.aggregate({
        where: { sessionId: id },
        _max: { order: true },
      });
      await tx.sessionExercise.create({
        data: {
          sessionId: id,
          exerciseId: exercise.id,
          order: (last._max.order ?? 0) + 1,
          target: EXTRA_EXERCISE_TARGET,
          sets: {
            create: Array.from({ length: EXTRA_EXERCISE_SETS }, (_, i) => ({
              setNumber: i + 1,
            })),
          },
        },
      });
    }

    if (input.removeExercise) {
      await tx.sessionExercise.deleteMany({
        where: { id: input.removeExercise.id, sessionId: id },
      });
    }

    for (const entry of input.exercises ?? []) {
      const owned = await tx.sessionExercise.findFirst({
        where: { id: entry.id, sessionId: id },
        select: { id: true },
      });
      if (!owned) return { ok: false, reason: "invalid" };

      const existing = await tx.setLog.findMany({
        where: { sessionExerciseId: entry.id },
        select: { setNumber: true, completedAt: true },
      });
      const completedAtBySet = new Map(
        existing.map((s) => [s.setNumber, s.completedAt])
      );

      await tx.setLog.deleteMany({ where: { sessionExerciseId: entry.id } });
      await tx.setLog.createMany({
        data: entry.sets.map((set, i) => ({
          sessionExerciseId: entry.id,
          setNumber: i + 1,
          weightKg: set.weightKg,
          reps: set.reps,
          completed: set.completed,
          completedAt: set.completed
            ? (completedAtBySet.get(i + 1) ?? new Date())
            : null,
        })),
      });
    }

    return { ok: true };
  }, TX_OPTIONS);
}

export type FinishResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "closed" | "no-sets" };

export async function finishSession(id: number): Promise<FinishResult> {
  return prisma.$transaction(async (tx): Promise<FinishResult> => {
    const session = await tx.workoutSession.findUnique({
      where: { id },
      include: { exercises: { include: { sets: true } } },
    });
    if (!session) return { ok: false, reason: "not-found" };
    if (session.status !== "IN_PROGRESS") return { ok: false, reason: "closed" };

    const doneSets = (e: (typeof session.exercises)[number]): LoggedSet[] =>
      e.sets
        .filter((s) => s.completed && s.reps !== null && s.reps > 0)
        .map((s) => ({ weightKg: num(s.weightKg) ?? 0, reps: s.reps ?? 0 }));

    if (!session.exercises.some((e) => doneSets(e).length > 0)) {
      return { ok: false, reason: "no-sets" };
    }

    const history = await tx.setLog.findMany({
      where: {
        completed: true,
        reps: { gt: 0 },
        sessionExercise: {
          exerciseId: { in: session.exercises.map((e) => e.exerciseId) },
          session: { status: "COMPLETED", id: { not: id } },
        },
      },
      select: {
        weightKg: true,
        reps: true,
        sessionExercise: { select: { exerciseId: true } },
      },
    });
    const previousByExercise = new Map<number, LoggedSet[]>();
    for (const h of history) {
      const list = previousByExercise.get(h.sessionExercise.exerciseId) ?? [];
      list.push({ weightKg: num(h.weightKg) ?? 0, reps: h.reps ?? 0 });
      previousByExercise.set(h.sessionExercise.exerciseId, list);
    }

    for (const e of session.exercises) {
      const { best, isPR } = detectPR(
        doneSets(e),
        previousByExercise.get(e.exerciseId) ?? []
      );
      await tx.sessionExercise.update({
        where: { id: e.id },
        data: {
          isPR,
          bestWeight: best?.weightKg ?? null,
          bestReps: best?.reps ?? null,
        },
      });
    }

    const now = new Date();
    await tx.workoutSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        finishedAt: now,
        durationMin: Math.max(
          1,
          Math.round((now.getTime() - session.startedAt.getTime()) / 60_000)
        ),
      },
    });
    return { ok: true };
  }, TX_OPTIONS);
}

export async function discardSession(
  id: number
): Promise<"ok" | "not-found" | "closed"> {
  const { count } = await prisma.workoutSession.updateMany({
    where: { id, status: "IN_PROGRESS" },
    data: { status: "DISCARDED" },
  });
  if (count > 0) return "ok";
  const exists = await prisma.workoutSession.findUnique({
    where: { id },
    select: { id: true },
  });
  return exists ? "closed" : "not-found";
}

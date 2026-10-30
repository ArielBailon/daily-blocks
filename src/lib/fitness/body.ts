import { parseDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GOAL } from "./seed-data";
import { localDateKey } from "./week";
import type { GoalInput } from "./weight";

export type BodyWeightDto = { date: string; kg: number };

export async function listBodyWeight(opts: {
  from?: string;
  to?: string;
  limit?: number;
}): Promise<BodyWeightDto[]> {
  const from = opts.from ? parseDateKey(opts.from) : null;
  const to = opts.to ? parseDateKey(opts.to) : null;
  // Newest first so `limit` keeps the most recent entries, then flipped to chronological.
  const rows = await prisma.bodyWeightEntry.findMany({
    where: {
      ...((from || to) && {
        date: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
    },
    orderBy: { date: "desc" },
    take: opts.limit ?? 60,
  });
  return rows
    .reverse()
    .map((r) => ({ date: toDateKey(r.date), kg: r.kg.toNumber() }));
}

export async function upsertBodyWeight(
  dateKey: string,
  kg: number
): Promise<BodyWeightDto> {
  const date = parseDateKey(dateKey)!;
  const row = await prisma.bodyWeightEntry.upsert({
    where: { date },
    create: { date, kg },
    update: { kg },
  });
  return { date: toDateKey(row.date), kg: row.kg.toNumber() };
}

export type GoalDto = GoalInput & { startedOn: string };

function toGoalDto(row: {
  startKg: { toNumber(): number };
  goalLowKg: { toNumber(): number };
  goalHighKg: { toNumber(): number };
  targetRateKgPerWeek: { toNumber(): number };
  phase: "CUT" | "BULK";
  startedOn: Date;
}): GoalDto {
  return {
    startKg: row.startKg.toNumber(),
    goalLowKg: row.goalLowKg.toNumber(),
    goalHighKg: row.goalHighKg.toNumber(),
    targetRateKgPerWeek: row.targetRateKgPerWeek.toNumber(),
    phase: row.phase,
    startedOn: toDateKey(row.startedOn),
  };
}

async function currentGoalRow() {
  const existing = await prisma.fitnessGoal.findFirst({
    orderBy: { id: "asc" },
  });
  if (existing) return existing;
  return prisma.fitnessGoal.create({
    data: {
      ...DEFAULT_GOAL,
      startedOn: parseDateKey(localDateKey())!,
    },
  });
}

export async function getGoal(): Promise<GoalDto> {
  return toGoalDto(await currentGoalRow());
}

export async function updateGoal(
  changes: Partial<Omit<GoalDto, "startedOn">>
): Promise<{ ok: true; goal: GoalDto } | { ok: false; error: string }> {
  const row = await currentGoalRow();
  const merged = { ...toGoalDto(row), ...changes };
  if (merged.goalLowKg > merged.goalHighKg) {
    return {
      ok: false,
      error: "La meta baja no puede ser mayor que la meta alta",
    };
  }
  const updated = await prisma.fitnessGoal.update({
    where: { id: row.id },
    data: changes,
  });
  return { ok: true, goal: toGoalDto(updated) };
}

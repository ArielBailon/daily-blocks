import { toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import type { FocusStatus } from "./session";

export type FocusSessionRow = {
  id: number;
  preset: string;
  status: FocusStatus;
  blockCount: number;
  workMinutes: number;
  breakMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
  breakSkipped: boolean;
  actualWorkSeconds: number;
};

// Read only. A session belongs to the day of its plan, not to when it started.
export async function loadFocusSessionsByDay(
  from: Date,
  to: Date
): Promise<Record<string, FocusSessionRow[]>> {
  const rows = await prisma.focusSession.findMany({
    where: { dailyPlan: { date: { gte: from, lte: to } } },
    orderBy: { startedAt: "asc" },
    include: { dailyPlan: { select: { date: true } } },
  });
  const byDay: Record<string, FocusSessionRow[]> = {};
  for (const row of rows) {
    const key = toDateKey(row.dailyPlan.date);
    (byDay[key] ??= []).push({
      id: row.id,
      preset: row.preset,
      status: row.status,
      blockCount: row.blockIds.length,
      workMinutes: row.workMinutes,
      breakMinutes: row.breakMinutes,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      breakSkipped: row.breakSkipped,
      actualWorkSeconds: row.actualWorkSeconds,
    });
  }
  return byDay;
}

export function focusSessionJson(row: FocusSessionRow) {
  return {
    id: row.id,
    preset: row.preset,
    status: row.status,
    blockCount: row.blockCount,
    workMinutes: row.workMinutes,
    breakMinutes: row.breakMinutes,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    breakSkipped: row.breakSkipped,
    actualWorkSeconds: row.actualWorkSeconds,
  };
}

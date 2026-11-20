import { Prisma, type FocusSession } from "@/generated/prisma/client";
import { resolveToday } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  blocksCovered,
  FIXED_PRESETS,
  type FocusPresetKey,
} from "./config";
import * as machine from "./session";
import type { SessionState } from "./session";

type Tx = Prisma.TransactionClient;

// The database is remote, so the default 5 s interactive transaction limit is tight.
const TX_OPTIONS = { timeout: 15_000 };
const ACTIVE_STATUSES = ["WORKING", "PAUSED", "BREAK"] as const;

export type FocusAction = "pause" | "resume" | "finish" | "abandon" | "skipBreak";

export type FocusSessionDto = {
  id: number;
  status: FocusSession["status"];
  preset: string;
  blockIds: number[];
  workMinutes: number;
  breakMinutes: number;
  startedAt: string;
  workEndsAt: string;
  breakEndsAt: string;
  pausedAt: string | null;
  breakSkipped: boolean;
  actualWorkSeconds: number;
  endedAt: string | null;
  blocksMarked: boolean;
  serverNow: string;
};

export type ServiceError = { ok: false; status: 400 | 404 | 409; error: string };

export type StartInput =
  | { blockId: number; preset: Exclude<FocusPresetKey, "CUSTOM"> }
  | { blockId: number; preset: "CUSTOM"; workMinutes: number; breakMinutes: number };

export type StartResult =
  | {
      ok: true;
      session: FocusSessionDto;
      coverage: { requested: number; covered: number; trimmed: boolean };
    }
  | ServiceError;

export type ActionResult = { ok: true; session: FocusSessionDto } | ServiceError;

const ACTIVE_CONFLICT: ServiceError = {
  ok: false,
  status: 409,
  error: "Ya hay una sesión de foco en curso",
};

export function toDto(row: FocusSession, now: Date): FocusSessionDto {
  return {
    id: row.id,
    status: row.status,
    preset: row.preset,
    blockIds: row.blockIds,
    workMinutes: row.workMinutes,
    breakMinutes: row.breakMinutes,
    startedAt: row.startedAt.toISOString(),
    workEndsAt: row.workEndsAt.toISOString(),
    breakEndsAt: row.breakEndsAt.toISOString(),
    pausedAt: row.pausedAt?.toISOString() ?? null,
    breakSkipped: row.breakSkipped,
    actualWorkSeconds: row.actualWorkSeconds,
    endedAt: row.endedAt?.toISOString() ?? null,
    blocksMarked: machine.blocksMarked(row),
    serverNow: now.toISOString(),
  };
}

async function save(
  tx: Tx,
  row: FocusSession,
  next: SessionState,
  markBlocks: boolean
): Promise<FocusSession> {
  const updated = await tx.focusSession.update({
    where: { id: row.id },
    data: {
      status: next.status,
      workEndsAt: next.workEndsAt,
      breakEndsAt: next.breakEndsAt,
      pausedAt: next.pausedAt,
      pausedSeconds: next.pausedSeconds,
      breakSkipped: next.breakSkipped,
      actualWorkSeconds: next.actualWorkSeconds,
      endedAt: next.endedAt,
    },
  });
  if (markBlocks) {
    // Skips blocks that were deleted meanwhile and blocks of a closed day.
    await tx.block.updateMany({
      where: { id: { in: row.blockIds }, dailyPlan: { closed: false } },
      data: { completed: true },
    });
  }
  return updated;
}

async function settleRow(
  tx: Tx,
  row: FocusSession,
  now: Date
): Promise<FocusSession> {
  const { next, markBlocks } = machine.settle(row, now);
  return next === row ? row : save(tx, row, next, markBlocks);
}

export async function getActiveSession(
  now: Date = new Date()
): Promise<FocusSessionDto | null> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.focusSession.findFirst({
      where: { status: { in: [...ACTIVE_STATUSES] } },
    });
    if (!row) return null;
    const settled = await settleRow(tx, row, now);
    return machine.isActive(settled.status) ? toDto(settled, now) : null;
  }, TX_OPTIONS);
}

async function startInTransaction(
  tx: Tx,
  input: StartInput,
  now: Date
): Promise<StartResult> {
  // An old session whose time ran out must not block a new one.
  const active = await tx.focusSession.findFirst({
    where: { status: { in: [...ACTIVE_STATUSES] } },
  });
  if (active) {
    const settled = await settleRow(tx, active, now);
    if (machine.isActive(settled.status)) return ACTIVE_CONFLICT;
  }

  const block = await tx.block.findUnique({
    where: { id: input.blockId },
    include: {
      dailyPlan: {
        include: {
          blocks: { select: { id: true }, orderBy: { startTime: "asc" } },
        },
      },
    },
  });
  if (!block) {
    return { ok: false, status: 404, error: "Bloque no encontrado" };
  }
  const { dailyPlan: plan } = block;
  if (plan.date.getTime() !== resolveToday(now).date.getTime()) {
    return {
      ok: false,
      status: 400,
      error: "Solo se puede iniciar foco en bloques de hoy",
    };
  }
  if (plan.closed) {
    return {
      ok: false,
      status: 409,
      error: "Este día ya está cerrado y no se puede editar.",
    };
  }

  const { workMinutes, breakMinutes } =
    input.preset === "CUSTOM" ? input : FIXED_PRESETS[input.preset];
  const coverage = machine.coverBlocks(
    plan.blocks.map((b) => b.id),
    block.id,
    blocksCovered(workMinutes, breakMinutes)
  );
  if (!coverage) {
    return { ok: false, status: 404, error: "Bloque no encontrado" };
  }

  const workEndsAt = new Date(now.getTime() + workMinutes * 60_000);
  const row = await tx.focusSession.create({
    data: {
      dailyPlanId: plan.id,
      blockIds: coverage.blockIds,
      preset: input.preset,
      workMinutes,
      breakMinutes,
      startedAt: now,
      workEndsAt,
      breakEndsAt: new Date(workEndsAt.getTime() + breakMinutes * 60_000),
      status: "WORKING",
    },
  });
  return {
    ok: true,
    session: toDto(row, now),
    coverage: {
      requested: coverage.requested,
      covered: coverage.covered,
      trimmed: coverage.trimmed,
    },
  };
}

export async function startSession(
  input: StartInput,
  now: Date = new Date()
): Promise<StartResult> {
  try {
    return await prisma.$transaction(
      (tx) => startInTransaction(tx, input, now),
      TX_OPTIONS
    );
  } catch (error) {
    // Two concurrent starts: the partial unique index lets only one through.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return ACTIVE_CONFLICT;
    }
    throw error;
  }
}

function conflict(error: string): ServiceError {
  return { ok: false, status: 409, error };
}

function transition(
  row: FocusSession,
  action: FocusAction,
  now: Date
): { next: SessionState; markBlocks: boolean } | ServiceError {
  const { status } = row;
  switch (action) {
    case "pause":
      return status === "WORKING"
        ? { next: machine.pause(row, now), markBlocks: false }
        : conflict("Solo se puede pausar mientras se trabaja");
    case "resume":
      return status === "PAUSED"
        ? { next: machine.resume(row, now), markBlocks: false }
        : conflict("La sesión no está en pausa");
    case "finish":
      return status === "WORKING" || status === "PAUSED"
        ? machine.finish(row, now)
        : conflict("Solo se puede terminar mientras se trabaja");
    case "abandon":
      return status === "WORKING" || status === "PAUSED"
        ? { next: machine.abandon(row, now), markBlocks: false }
        : conflict("Solo se puede abandonar mientras se trabaja");
    case "skipBreak":
      return status === "BREAK"
        ? { next: machine.skipBreak(row, now), markBlocks: false }
        : conflict("La sesión no está en descanso");
  }
}

export async function applyAction(
  id: number,
  action: FocusAction,
  now: Date = new Date()
): Promise<ActionResult> {
  return prisma.$transaction(async (tx): Promise<ActionResult> => {
    const found = await tx.focusSession.findUnique({ where: { id } });
    if (!found) {
      return { ok: false, status: 404, error: "Sesión no encontrada" };
    }
    if (!machine.isActive(found.status)) {
      return conflict("La sesión ya terminó");
    }
    const row = await settleRow(tx, found, now);
    if (!machine.isActive(row.status)) {
      return conflict("La sesión ya terminó");
    }

    const result = transition(row, action, now);
    if ("ok" in result) return result;
    const updated = await save(tx, row, result.next, result.markBlocks);
    return { ok: true, session: toDto(updated, now) };
  }, TX_OPTIONS);
}

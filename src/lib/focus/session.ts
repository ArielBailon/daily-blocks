import { COMPLETION_RATIO } from "./config";

export type FocusStatus =
  | "WORKING"
  | "PAUSED"
  | "BREAK"
  | "COMPLETED"
  | "ABANDONED";

export type SessionState = {
  status: FocusStatus;
  workMinutes: number;
  breakMinutes: number;
  startedAt: Date;
  workEndsAt: Date;
  breakEndsAt: Date;
  pausedAt: Date | null;
  pausedSeconds: number;
  breakSkipped: boolean;
  actualWorkSeconds: number;
  endedAt: Date | null;
};

export type Coverage = {
  blockIds: number[];
  requested: number;
  covered: number;
  trimmed: boolean;
};

// `orderedIds` are the day's block ids by start time. Never goes past the last block.
export function coverBlocks(
  orderedIds: number[],
  startId: number,
  requested: number
): Coverage | null {
  const index = orderedIds.indexOf(startId);
  if (index === -1) return null;
  const blockIds = orderedIds.slice(index, index + requested);
  return {
    blockIds,
    requested,
    covered: blockIds.length,
    trimmed: blockIds.length < requested,
  };
}

export function isActive(status: FocusStatus): boolean {
  return status === "WORKING" || status === "PAUSED" || status === "BREAK";
}

export function meetsCompletion(
  actualWorkSeconds: number,
  workMinutes: number
): boolean {
  return actualWorkSeconds >= COMPLETION_RATIO * workMinutes * 60;
}

export function blocksMarked(s: SessionState): boolean {
  return (
    (s.status === "BREAK" || s.status === "COMPLETED") &&
    meetsCompletion(s.actualWorkSeconds, s.workMinutes)
  );
}

// Time left in the current phase; frozen while paused.
export function remainingMs(s: SessionState, now: Date): number {
  switch (s.status) {
    case "WORKING":
      return Math.max(0, s.workEndsAt.getTime() - now.getTime());
    case "PAUSED":
      return Math.max(
        0,
        s.workEndsAt.getTime() - (s.pausedAt ?? now).getTime()
      );
    case "BREAK":
      return Math.max(0, s.breakEndsAt.getTime() - now.getTime());
    default:
      return 0;
  }
}

export function workedSeconds(s: SessionState, now: Date): number {
  const until = s.status === "PAUSED" && s.pausedAt ? s.pausedAt : now;
  const elapsed =
    Math.floor((until.getTime() - s.startedAt.getTime()) / 1000) -
    s.pausedSeconds;
  return Math.min(Math.max(elapsed, 0), s.workMinutes * 60);
}

export type Transition = {
  next: SessionState;
  // True when work ended in this transition and the blocks may be marked.
  markBlocks: boolean;
};

// Lazy phase change from the clock; there are no background jobs.
export function settle(s: SessionState, now: Date): Transition {
  let next = s;
  let markBlocks = false;
  if (next.status === "WORKING" && now >= next.workEndsAt) {
    next = {
      ...next,
      status: "BREAK",
      actualWorkSeconds: next.workMinutes * 60,
    };
    markBlocks = meetsCompletion(next.actualWorkSeconds, next.workMinutes);
  }
  if (next.status === "BREAK" && now >= next.breakEndsAt) {
    next = { ...next, status: "COMPLETED", endedAt: next.breakEndsAt };
  }
  return { next, markBlocks };
}

export function pause(s: SessionState, now: Date): SessionState {
  return { ...s, status: "PAUSED", pausedAt: now };
}

// Pausing pushes both end times by the paused time.
export function resume(s: SessionState, now: Date): SessionState {
  if (!s.pausedAt) return { ...s, status: "WORKING" };
  const deltaSeconds = Math.max(
    0,
    Math.floor((now.getTime() - s.pausedAt.getTime()) / 1000)
  );
  const shift = deltaSeconds * 1000;
  return {
    ...s,
    status: "WORKING",
    pausedAt: null,
    pausedSeconds: s.pausedSeconds + deltaSeconds,
    workEndsAt: new Date(s.workEndsAt.getTime() + shift),
    breakEndsAt: new Date(s.breakEndsAt.getTime() + shift),
  };
}

export function finish(s: SessionState, now: Date): Transition {
  const actualWorkSeconds = workedSeconds(s, now);
  return {
    next: { ...s, status: "COMPLETED", actualWorkSeconds, endedAt: now },
    markBlocks: meetsCompletion(actualWorkSeconds, s.workMinutes),
  };
}

export function abandon(s: SessionState, now: Date): SessionState {
  return {
    ...s,
    status: "ABANDONED",
    actualWorkSeconds: workedSeconds(s, now),
    endedAt: now,
  };
}

export function skipBreak(s: SessionState, now: Date): SessionState {
  return { ...s, status: "COMPLETED", breakSkipped: true, endedAt: now };
}

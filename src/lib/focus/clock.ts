import type { SessionState } from "./session";
import type { FocusSessionDto } from "./types";

// A transition older than this finished while the app was away: no chime.
export const ALERT_WINDOW_MS = 10_000;

// "mm:ss", rounding up so the display never shows 00:00 before the phase ends.
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Server clock minus browser clock, to be added to Date.now().
export function clockOffset(serverNow: string, clientNowMs: number): number {
  return Date.parse(serverNow) - clientNowMs;
}

export function stateFromDto(dto: FocusSessionDto): SessionState {
  return {
    status: dto.status,
    workMinutes: dto.workMinutes,
    breakMinutes: dto.breakMinutes,
    startedAt: new Date(dto.startedAt),
    workEndsAt: new Date(dto.workEndsAt),
    breakEndsAt: new Date(dto.breakEndsAt),
    pausedAt: dto.pausedAt ? new Date(dto.pausedAt) : null,
    pausedSeconds: 0,
    breakSkipped: dto.breakSkipped,
    actualWorkSeconds: dto.actualWorkSeconds,
    endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
  };
}

type Seen = Pick<FocusSessionDto, "id" | "status" | "breakEndsAt">;

// True only for a phase end seen live: work to break, or break to completed
// by the clock (not by the user skipping it). A null `next` is the active read
// finding the session already completed.
export function shouldAlert(
  prev: Seen | null,
  next: FocusSessionDto | null,
  nowMs: number
): boolean {
  if (!prev) return false;
  const recent = (iso: string) => {
    const at = Date.parse(iso);
    return nowMs >= at && nowMs - at <= ALERT_WINDOW_MS;
  };
  if (!next) {
    return (
      (prev.status === "WORKING" || prev.status === "BREAK") &&
      recent(prev.breakEndsAt)
    );
  }
  if (prev.id !== next.id) return false;
  if (
    prev.status === "WORKING" &&
    (next.status === "BREAK" ||
      (next.status === "COMPLETED" && !next.breakSkipped))
  ) {
    return recent(next.workEndsAt);
  }
  if (
    prev.status === "BREAK" &&
    next.status === "COMPLETED" &&
    !next.breakSkipped
  ) {
    return recent(next.breakEndsAt);
  }
  return false;
}

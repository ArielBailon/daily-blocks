import { BLOCK_MINUTES, toMinutes } from "@/lib/blocks";
import { zonedTimeToUtc } from "@/lib/date";

export function blockBounds(
  dateKey: string,
  startTime: string
): { startMs: number; endMs: number } {
  const start = toMinutes(startTime);
  return {
    startMs: zonedTimeToUtc(dateKey, start).getTime(),
    endMs: zonedTimeToUtc(dateKey, start + BLOCK_MINUTES).getTime(),
  };
}

// An ActivityWatch timeperiod: "<start>/<end>" in ISO 8601.
export function periodOf(startMs: number, endMs: number): string {
  return `${new Date(startMs).toISOString()}/${new Date(endMs).toISOString()}`;
}

export function blockPeriod(dateKey: string, startTime: string): string {
  const { startMs, endMs } = blockBounds(dateKey, startTime);
  return periodOf(startMs, endMs);
}

export function periodSeconds(period: string): number {
  const [start, end] = period.split("/").map(Date.parse);
  return Math.max(0, (end - start) / 1000);
}

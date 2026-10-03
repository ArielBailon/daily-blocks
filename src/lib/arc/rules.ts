// Pure Winter Arc rules. Dates are "YYYY-MM-DD" keys; nothing reads the clock
// or the database. Weeks run Monday to Sunday.

import type { BlockTag } from "@/lib/block-tags";
import { BLOCK_MINUTES, toMinutes } from "@/lib/blocks";
import { parseDateKey, toDateKey } from "@/lib/date";
import {
  ARC_DAYS,
  ARC_START,
  DEEP_BLOCKS_PER_DAY,
  DEEP_MIN_RUN,
  GYM_DAYS_PER_WEEK,
  JOB_HUNTING_BLOCKS_PER_WEEK,
  SCREENS_OFF_MIN_BLOCKS,
  WALKS_PER_WEEK,
} from "@/lib/arc/config";

export interface ArcBlock {
  startTime: string;
  completed: boolean;
  tag: BlockTag | null;
}

export interface ArcDayInput {
  date: string;
  blocks: ArcBlock[];
}

export type DailyRuleId = "DEEP" | "SCREENS_OFF";
export type WeeklyRuleId = "GYM" | "WALK" | "JOB_HUNTING";

export interface DailyRuleResult {
  applicable: boolean;
  passed: boolean;
  value: number;
  target: number;
}

export interface WeeklyRuleResult {
  count: number;
  target: number;
  // null while the week is not evaluable.
  passed: boolean | null;
}

export interface WeekResult {
  weekStart: string;
  evaluable: boolean;
  rules: Record<WeeklyRuleId, WeeklyRuleResult>;
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  if (!date) throw new Error(`Invalid date key: ${key}`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

// 0 = Sunday ... 6 = Saturday.
export function weekdayOf(key: string): number {
  const date = parseDateKey(key);
  if (!date) throw new Error(`Invalid date key: ${key}`);
  return date.getUTCDay();
}

export function weekStartOf(key: string): string {
  return addDays(key, -((weekdayOf(key) + 6) % 7));
}

export function arcEnd(start: string = ARC_START): string {
  return addDays(start, ARC_DAYS - 1);
}

const completedWith = (blocks: ArcBlock[], tag: BlockTag) =>
  blocks.filter((b) => b.completed && b.tag === tag);

// DEEP counts completed DEEP blocks that sit in runs of consecutive blocks of at
// least DEEP_MIN_RUN. A block that is not completed (or not DEEP) breaks a run.
// Not applicable on Sunday.
export function evaluateDeep(day: ArcDayInput): DailyRuleResult {
  const applicable = weekdayOf(day.date) !== 0;
  const times = [
    ...new Set(completedWith(day.blocks, "DEEP").map((b) => toMinutes(b.startTime))),
  ].sort((a, b) => a - b);

  let counted = 0;
  let run = 0;
  times.forEach((time, i) => {
    run = i > 0 && time - times[i - 1] === BLOCK_MINUTES ? run + 1 : 1;
    const last = i === times.length - 1 || times[i + 1] - time !== BLOCK_MINUTES;
    if (last && run >= DEEP_MIN_RUN) counted += run;
  });

  return {
    applicable,
    passed: applicable && counted >= DEEP_BLOCKS_PER_DAY,
    value: counted,
    target: DEEP_BLOCKS_PER_DAY,
  };
}

export function evaluateScreensOff(day: ArcDayInput): DailyRuleResult {
  const value = completedWith(day.blocks, "SCREENS_OFF").length;
  return {
    applicable: true,
    passed: value >= SCREENS_OFF_MIN_BLOCKS,
    value,
    target: SCREENS_OFF_MIN_BLOCKS,
  };
}

// A day counts when it has the tag and every block with that tag is completed.
function dayDone(day: ArcDayInput, tag: BlockTag): boolean {
  const tagged = day.blocks.filter((b) => b.tag === tag);
  return tagged.length > 0 && tagged.every((b) => b.completed);
}

// `days` holds at most one entry per date. A week is evaluable when its seven
// days are all inside the arc and its Sunday is before today; otherwise the
// counts are still reported but `passed` is null.
export function evaluateWeek(
  days: ArcDayInput[],
  weekStart: string,
  todayKey: string,
  start: string = ARC_START
): WeekResult {
  const weekEnd = addDays(weekStart, 6);
  const inWeek = days.filter((d) => d.date >= weekStart && d.date <= weekEnd);
  const evaluable =
    weekStart >= start && weekEnd <= arcEnd(start) && weekEnd < todayKey;

  const rule = (count: number, target: number): WeeklyRuleResult => ({
    count,
    target,
    passed: evaluable ? count >= target : null,
  });

  return {
    weekStart,
    evaluable,
    rules: {
      GYM: rule(inWeek.filter((d) => dayDone(d, "GYM")).length, GYM_DAYS_PER_WEEK),
      WALK: rule(inWeek.filter((d) => dayDone(d, "WALK")).length, WALKS_PER_WEEK),
      JOB_HUNTING: rule(
        inWeek.reduce(
          (sum, d) => sum + completedWith(d.blocks, "JOB_HUNTING").length,
          0
        ),
        JOB_HUNTING_BLOCKS_PER_WEEK
      ),
    },
  };
}

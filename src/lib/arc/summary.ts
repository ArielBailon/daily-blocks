// Winter Arc summary: day status, weeks, streak and totals per rule. Pure: the
// caller supplies the plans and today's date key.

import { ARC_DAYS, ARC_START } from "@/lib/arc/config";
import {
  addDays,
  arcEnd,
  evaluateDeep,
  evaluateScreensOff,
  evaluateWeek,
  weekStartOf,
  type ArcBlock,
  type ArcDayInput,
  type DailyRuleId,
  type DailyRuleResult,
  type WeekResult,
  type WeeklyRuleId,
} from "@/lib/arc/rules";

export type DayStatus = "green" | "yellow" | "red" | "gray";
export type RuleId = DailyRuleId | WeeklyRuleId;

export interface ArcDayResult {
  date: string;
  dayNumber: number;
  status: DayStatus;
  hasPlan: boolean;
  rules: Record<DailyRuleId, DailyRuleResult>;
}

export interface ArcSummary {
  days: ArcDayResult[];
  weeks: WeekResult[];
  streak: { current: number; best: number };
  rules: Record<RuleId, { passed: number; total: number }>;
}

function dailyRules(date: string, blocks: ArcBlock[]) {
  const day = { date, blocks };
  return { DEEP: evaluateDeep(day), SCREENS_OFF: evaluateScreensOff(day) };
}

// Gray for today, future days and days outside the arc. A past arc day without
// a plan is red; otherwise green when every applicable daily rule passes, red
// when none does and yellow in between.
export function dayStatus(
  date: string,
  plan: ArcDayInput | undefined,
  todayKey: string,
  start: string = ARC_START
): DayStatus {
  if (date < start || date > arcEnd(start) || date >= todayKey) return "gray";
  if (!plan) return "red";
  const applicable = Object.values(dailyRules(date, plan.blocks)).filter(
    (r) => r.applicable
  );
  const passed = applicable.filter((r) => r.passed).length;
  if (passed === applicable.length) return "green";
  return passed === 0 ? "red" : "yellow";
}

// Plans outside the arc are ignored; for a repeated date the first one wins.
export function computeArc(
  plans: ArcDayInput[],
  todayKey: string,
  start: string = ARC_START
): ArcSummary {
  const end = arcEnd(start);
  const byDate = new Map<string, ArcDayInput>();
  for (const plan of plans) {
    if (plan.date >= start && plan.date <= end && !byDate.has(plan.date)) {
      byDate.set(plan.date, plan);
    }
  }

  const days: ArcDayResult[] = Array.from({ length: ARC_DAYS }, (_, i) => {
    const date = addDays(start, i);
    const plan = byDate.get(date);
    return {
      date,
      dayNumber: i + 1,
      status: dayStatus(date, plan, todayKey, start),
      hasPlan: plan !== undefined,
      rules: dailyRules(date, plan?.blocks ?? []),
    };
  });

  const weeks: WeekResult[] = [];
  for (
    let weekStart = weekStartOf(start);
    weekStart <= end;
    weekStart = addDays(weekStart, 7)
  ) {
    weeks.push(evaluateWeek([...byDate.values()], weekStart, todayKey, start));
  }

  // Green and yellow add 1; an isolated red neither adds nor breaks; two reds
  // in a row reset the current streak. Gray days (today, future) are skipped.
  let current = 0;
  let best = 0;
  let previousRed = false;
  for (const day of days) {
    if (day.status === "gray") continue;
    if (day.status === "red") {
      if (previousRed) current = 0;
      previousRed = true;
    } else {
      current += 1;
      previousRed = false;
    }
    best = Math.max(best, current);
  }

  const rules: ArcSummary["rules"] = {
    DEEP: { passed: 0, total: 0 },
    SCREENS_OFF: { passed: 0, total: 0 },
    GYM: { passed: 0, total: 0 },
    WALK: { passed: 0, total: 0 },
    JOB_HUNTING: { passed: 0, total: 0 },
  };
  for (const day of days) {
    if (day.status === "gray") continue;
    for (const id of ["DEEP", "SCREENS_OFF"] as const) {
      if (!day.rules[id].applicable) continue;
      rules[id].total += 1;
      if (day.rules[id].passed) rules[id].passed += 1;
    }
  }
  for (const week of weeks) {
    if (!week.evaluable) continue;
    for (const id of ["GYM", "WALK", "JOB_HUNTING"] as const) {
      rules[id].total += 1;
      if (week.rules[id].passed) rules[id].passed += 1;
    }
  }

  return { days, weeks, streak: { current, best }, rules };
}

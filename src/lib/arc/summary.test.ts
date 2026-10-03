import { describe, expect, it } from "vitest";
import type { BlockTag } from "@/lib/block-tags";
import { fromMinutes, toMinutes } from "@/lib/blocks";
import { addDays, type ArcBlock, type ArcDayInput } from "@/lib/arc/rules";
import { computeArc, dayStatus } from "@/lib/arc/summary";

// Streak and totals tests start the arc on a Monday so every day is Mon-Sat
// until the seventh day.
const MON = "2026-10-05";

function run(tag: BlockTag, from: string, count: number): ArcBlock[] {
  return Array.from({ length: count }, (_, i) => ({
    startTime: fromMinutes(toMinutes(from) + i * 30),
    completed: true,
    tag,
  }));
}

const screens = () => run("SCREENS_OFF", "22:00", 2);
const deep = () => run("DEEP", "09:00", 8);

const green = (date: string): ArcDayInput => ({
  date,
  blocks: [...deep(), ...screens()],
});
const yellow = (date: string): ArcDayInput => ({ date, blocks: screens() });
const red = (date: string): ArcDayInput => ({ date, blocks: [] });

// "GYG" -> plans for MON, MON+1, MON+2 with those statuses.
function scenario(pattern: string): ArcDayInput[] {
  return [...pattern].map((letter, i) => {
    const date = addDays(MON, i);
    return letter === "G" ? green(date) : letter === "Y" ? yellow(date) : red(date);
  });
}

const streakOf = (pattern: string) =>
  computeArc(scenario(pattern), addDays(MON, pattern.length), MON).streak;

describe("computeArc days", () => {
  it("returns 90 days from day 1 to day 90", () => {
    const { days } = computeArc([], "2026-10-04");
    expect(days).toHaveLength(90);
    expect(days[0]).toMatchObject({ date: "2026-10-03", dayNumber: 1 });
    expect(days[89]).toMatchObject({ date: "2026-12-31", dayNumber: 90 });
  });

  it("is gray for today and future days, red for a past day without plan", () => {
    const { days } = computeArc([], "2026-10-05");
    expect(days[0].status).toBe("red");
    expect(days[1].status).toBe("red");
    expect(days[2].status).toBe("gray");
    expect(days[3].status).toBe("gray");
    expect(days[0].hasPlan).toBe(false);
  });

  it("is gray outside the arc", () => {
    expect(dayStatus("2026-10-02", undefined, "2027-02-01")).toBe("gray");
    expect(dayStatus("2027-01-01", undefined, "2027-02-01")).toBe("gray");
  });

  it("is green, yellow or red on a Monday by how many daily rules pass", () => {
    const today = "2026-10-06";
    expect(dayStatus(MON, green(MON), today, MON)).toBe("green");
    expect(dayStatus(MON, yellow(MON), today, MON)).toBe("yellow");
    expect(dayStatus(MON, red(MON), today, MON)).toBe("red");
  });

  it("has only SCREENS_OFF on Sunday: green with it, red without", () => {
    const sunday = "2026-10-04";
    const today = "2026-10-05";
    const withScreens = { date: sunday, blocks: screens() };
    const without = { date: sunday, blocks: deep() };
    expect(dayStatus(sunday, withScreens, today)).toBe("green");
    expect(dayStatus(sunday, without, today)).toBe("red");
  });
});

describe("streak", () => {
  it("adds green and yellow days", () => {
    expect(streakOf("GYG")).toEqual({ current: 3, best: 3 });
  });

  it("is neither added to nor broken by an isolated red", () => {
    expect(streakOf("GRG")).toEqual({ current: 2, best: 2 });
  });

  it("resets on two reds in a row, then counts again", () => {
    expect(streakOf("GRRG")).toEqual({ current: 1, best: 1 });
  });

  it("stays at 0 through consecutive reds", () => {
    expect(streakOf("RRR")).toEqual({ current: 0, best: 0 });
  });

  it("keeps the best streak", () => {
    expect(streakOf("GGGRRG")).toEqual({ current: 1, best: 3 });
  });

  it("is not changed by today pending", () => {
    const plans = scenario("GG");
    const today = addDays(MON, 2);
    expect(computeArc(plans, today, MON).streak).toEqual({ current: 2, best: 2 });
    // Today has a full plan already: still gray, still ignored.
    const withToday = [...plans, green(today)];
    expect(computeArc(withToday, today, MON).streak).toEqual({ current: 2, best: 2 });
  });
});

describe("totals per rule", () => {
  it("counts daily rules over past applicable days", () => {
    // Mon green, Tue yellow, Wed no plan, Thu green; today is Friday.
    const plans = [green(MON), yellow(addDays(MON, 1)), green(addDays(MON, 3))];
    const { rules } = computeArc(plans, addDays(MON, 4), MON);
    expect(rules.DEEP).toEqual({ passed: 2, total: 4 });
    expect(rules.SCREENS_OFF).toEqual({ passed: 3, total: 4 });
    expect(rules.GYM).toEqual({ passed: 0, total: 0 });
  });

  it("counts weekly rules over evaluable weeks only", () => {
    const gymDays = [0, 1, 2, 3, 4].map((i) => ({
      date: addDays(MON, i),
      blocks: run("GYM", "14:30", 3),
    }));
    const walk = { date: addDays(MON, 3), blocks: run("WALK", "17:00", 2) };
    const jobs = { date: addDays(MON, 5), blocks: run("JOB_HUNTING", "17:00", 4) };
    const plans = [...gymDays, walk, jobs];

    const early = computeArc(plans, addDays(MON, 6), MON);
    expect(early.weeks[0].evaluable).toBe(false);
    expect(early.rules.GYM.total).toBe(0);

    const later = computeArc(plans, addDays(MON, 7), MON);
    expect(later.weeks[0].evaluable).toBe(true);
    expect(later.rules.GYM).toEqual({ passed: 1, total: 1 });
    expect(later.rules.WALK).toEqual({ passed: 0, total: 1 });
    expect(later.rules.JOB_HUNTING).toEqual({ passed: 1, total: 1 });
  });
});

describe("computeArc input handling", () => {
  it("ignores plans outside the arc", () => {
    const base = computeArc(scenario("G"), "2026-10-06", MON);
    const extra = [...scenario("G"), green("2026-10-04"), green("2027-03-01")];
    expect(computeArc(extra, "2026-10-06", MON)).toEqual(base);
  });

  it("uses the first plan for a repeated date", () => {
    const plans = [red(MON), green(MON)];
    expect(computeArc(plans, "2026-10-06", MON).days[0].status).toBe("red");
  });

  it("is deterministic and JSON-serializable", () => {
    const plans = scenario("GYRG");
    const a = computeArc(plans, "2026-10-12", MON);
    const b = computeArc(plans, "2026-10-12", MON);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});

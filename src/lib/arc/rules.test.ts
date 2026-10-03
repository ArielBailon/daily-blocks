import { describe, expect, it } from "vitest";
import type { BlockTag } from "@/lib/block-tags";
import { fromMinutes, toMinutes } from "@/lib/blocks";
import {
  evaluateDeep,
  evaluateScreensOff,
  evaluateWeek,
  type ArcBlock,
  type ArcDayInput,
} from "@/lib/arc/rules";

// 2026-10-05 is a Monday, 2026-10-04 a Sunday.
const MONDAY = "2026-10-05";
const SUNDAY = "2026-10-04";

function run(
  tag: BlockTag,
  from: string,
  count: number,
  completed = true
): ArcBlock[] {
  return Array.from({ length: count }, (_, i) => ({
    startTime: fromMinutes(toMinutes(from) + i * 30),
    completed,
    tag,
  }));
}

const day = (date: string, ...blocks: ArcBlock[][]): ArcDayInput => ({
  date,
  blocks: blocks.flat(),
});

describe("evaluateDeep", () => {
  it("passes with 8 checked blocks in one run", () => {
    const result = evaluateDeep(day(MONDAY, run("DEEP", "09:00", 8)));
    expect(result).toMatchObject({ applicable: true, passed: true, value: 8 });
  });

  it("passes with 4 + 4 in two runs", () => {
    const result = evaluateDeep(
      day(MONDAY, run("DEEP", "09:00", 4), run("DEEP", "13:00", 4))
    );
    expect(result.passed).toBe(true);
    expect(result.value).toBe(8);
  });

  it("does not count a single isolated 30-minute block", () => {
    const result = evaluateDeep(
      day(
        MONDAY,
        run("DEEP", "09:00", 4),
        run("DEEP", "13:00", 3),
        run("DEEP", "16:00", 1)
      )
    );
    expect(result.value).toBe(7);
    expect(result.passed).toBe(false);
  });

  it("splits a run on an unchecked block", () => {
    const blocks = run("DEEP", "09:00", 8);
    blocks[3] = { ...blocks[3], completed: false };
    const result = evaluateDeep(day(MONDAY, blocks));
    expect(result.value).toBe(7);
    expect(result.passed).toBe(false);
  });

  it("does not let other tags or gaps join a run", () => {
    const split = evaluateDeep(
      day(
        MONDAY,
        run("DEEP", "09:00", 2),
        run("GYM", "10:00", 1),
        run("DEEP", "10:30", 2)
      )
    );
    expect(split.value).toBe(4);

    const apart = evaluateDeep(
      day(MONDAY, run("DEEP", "09:00", 1), run("DEEP", "10:00", 1))
    );
    expect(apart.value).toBe(0);
  });

  it("is not applicable on Sunday", () => {
    const result = evaluateDeep(day(SUNDAY, run("DEEP", "09:00", 8)));
    expect(result.applicable).toBe(false);
    expect(result.passed).toBe(false);
  });
});

describe("evaluateScreensOff", () => {
  it("passes with 2 checked blocks", () => {
    const result = evaluateScreensOff(day(MONDAY, run("SCREENS_OFF", "22:00", 2)));
    expect(result).toMatchObject({ applicable: true, passed: true, value: 2 });
  });

  it("fails with 1 checked and 1 unchecked", () => {
    const result = evaluateScreensOff(
      day(MONDAY, run("SCREENS_OFF", "22:00", 1), run("SCREENS_OFF", "22:30", 1, false))
    );
    expect(result.value).toBe(1);
    expect(result.passed).toBe(false);
  });

  it("applies on Sunday", () => {
    expect(evaluateScreensOff(day(SUNDAY)).applicable).toBe(true);
  });
});

describe("evaluateWeek", () => {
  const WEEK = "2026-10-05"; // Mon 5 .. Sun 11
  const DATES = [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ];
  const gym = (n: number) =>
    DATES.slice(0, n).map((d) => day(d, run("GYM", "14:30", 3)));
  const today = "2026-10-12";

  it("passes with 5 gym days and fails with 4", () => {
    expect(evaluateWeek(gym(5), WEEK, today).rules.GYM).toEqual({
      count: 5,
      target: 5,
      passed: true,
    });
    expect(evaluateWeek(gym(4), WEEK, today).rules.GYM.passed).toBe(false);
  });

  it("does not count a gym day with an unchecked GYM block", () => {
    const days = [
      ...gym(4),
      day(DATES[4], run("GYM", "14:30", 2), run("GYM", "15:30", 1, false)),
    ];
    expect(evaluateWeek(days, WEEK, today).rules.GYM.count).toBe(4);
  });

  it("counts a Sunday gym day toward the same week", () => {
    const days = [...gym(4), day(DATES[6], run("GYM", "14:30", 3))];
    const gymRule = evaluateWeek(days, WEEK, today).rules.GYM;
    expect(gymRule.count).toBe(5);
    expect(gymRule.passed).toBe(true);
  });

  it("does not count a day with no GYM block", () => {
    const days = [...gym(4), day(DATES[4], run("DEEP", "09:00", 8))];
    expect(evaluateWeek(days, WEEK, today).rules.GYM.count).toBe(4);
  });

  it("needs 2 walk days", () => {
    const two = [day(DATES[3], run("WALK", "17:00", 2)), day(DATES[6], run("WALK", "17:00", 2))];
    expect(evaluateWeek(two, WEEK, today).rules.WALK.passed).toBe(true);
    expect(evaluateWeek(two.slice(0, 1), WEEK, today).rules.WALK.passed).toBe(false);
  });

  it("needs 4 checked JOB_HUNTING blocks in the week", () => {
    const four = [
      day(DATES[0], run("JOB_HUNTING", "17:00", 2)),
      day(DATES[1], run("JOB_HUNTING", "17:00", 2)),
    ];
    expect(evaluateWeek(four, WEEK, today).rules.JOB_HUNTING.passed).toBe(true);
    const three = [
      day(DATES[0], run("JOB_HUNTING", "17:00", 2)),
      day(DATES[1], run("JOB_HUNTING", "17:00", 1), run("JOB_HUNTING", "17:30", 1, false)),
    ];
    const rule = evaluateWeek(three, WEEK, today).rules.JOB_HUNTING;
    expect(rule.count).toBe(3);
    expect(rule.passed).toBe(false);
  });

  it("is not evaluable for the first partial week", () => {
    const result = evaluateWeek(gym(5), "2026-09-28", "2026-12-01");
    expect(result.evaluable).toBe(false);
    expect(result.rules.GYM.passed).toBeNull();
  });

  it("is evaluable only once its Sunday is before today", () => {
    expect(evaluateWeek(gym(5), WEEK, "2026-10-11").evaluable).toBe(false);
    expect(evaluateWeek(gym(5), WEEK, "2026-10-11").rules.GYM.passed).toBeNull();
    expect(evaluateWeek(gym(5), WEEK, "2026-10-12").evaluable).toBe(true);
  });

  it("never evaluates the last, partial week", () => {
    const result = evaluateWeek([], "2026-12-28", "2027-02-01");
    expect(result.evaluable).toBe(false);
    expect(result.rules.GYM.passed).toBeNull();
  });
});

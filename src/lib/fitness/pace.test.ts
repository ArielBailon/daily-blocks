import { describe, expect, it } from "vitest";
import { adherence, weeklyPace } from "./pace";

describe("weeklyPace", () => {
  const entries = [
    { date: "2026-10-02", kg: 78 },
    { date: "2026-10-16", kg: 77 },
    { date: "2026-10-30", kg: 76 },
  ];

  it("averages the change per week over the window", () => {
    expect(weeklyPace(entries, "2026-10-30", 4)).toBe(-0.5);
    expect(weeklyPace(entries, "2026-10-30", 2)).toBe(-0.5);
  });

  it("only looks at entries inside the window", () => {
    // Two weeks back from 10-30 starts on 10-16: 77 -> 76 in 14 days.
    expect(
      weeklyPace([{ date: "2026-09-01", kg: 90 }, ...entries], "2026-10-30", 2)
    ).toBe(-0.5);
  });

  it("is positive when gaining", () => {
    expect(
      weeklyPace(
        [
          { date: "2026-10-23", kg: 70 },
          { date: "2026-10-30", kg: 70.4 },
        ],
        "2026-10-30",
        2
      )
    ).toBe(0.4);
  });

  it("needs two entries on different days", () => {
    expect(weeklyPace([], "2026-10-30", 4)).toBeNull();
    expect(weeklyPace([{ date: "2026-10-30", kg: 76 }], "2026-10-30", 4)).toBeNull();
    expect(
      weeklyPace(
        [
          { date: "2026-10-30", kg: 76 },
          { date: "2026-10-30", kg: 75 },
        ],
        "2026-10-30",
        4
      )
    ).toBeNull();
  });
});

describe("adherence", () => {
  it("is done scheduled days over scheduled days", () => {
    // 4 full weeks = 20 scheduled days; today (Fri) has a session so it counts.
    const sessions = new Set([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-30",
    ]);
    const result = adherence(sessions, "2026-10-30", 4);
    expect(result.scheduled).toBe(20);
    expect(result.done).toBe(4);
    expect(result.ratio).toBe(0.2);
  });

  it("ignores a pending workout today", () => {
    const withToday = adherence(new Set(["2026-10-30"]), "2026-10-30", 1);
    const withoutToday = adherence(new Set(), "2026-10-30", 1);
    expect(withToday.scheduled).toBe(withoutToday.scheduled + 1);
    expect(withToday.done).toBe(1);
  });

  it("reports sessions on rest days as extras", () => {
    // 2026-10-29 is a Thursday.
    const result = adherence(new Set(["2026-10-29"]), "2026-10-30", 1);
    expect(result.extraSessions).toBe(1);
    expect(result.done).toBe(0);
  });
});

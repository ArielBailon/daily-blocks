import { describe, expect, it } from "vitest";
import { trainingStreak } from "./streak";

// 2026-10-26 is a Monday.
const dates = (...d: string[]) => new Set(d);

describe("trainingStreak", () => {
  it("is 0 with no sessions", () => {
    expect(trainingStreak(dates(), "2026-10-30")).toBe(0);
  });

  it("does not break when today has no session yet", () => {
    // Thu 10-29 rest, Wed 10-28, Tue 10-27, Mon 10-26 trained; today Fri empty.
    const s = dates("2026-10-26", "2026-10-27", "2026-10-28");
    expect(trainingStreak(s, "2026-10-30")).toBe(3);
  });

  it("counts today when trained", () => {
    // Fri trained today, Thu rest, Wed trained.
    const s = dates("2026-10-28", "2026-10-30");
    expect(trainingStreak(s, "2026-10-30")).toBe(2);
  });

  it("skips rest days without breaking", () => {
    // Sat 10-31 and Fri 10-30 trained, Thu rest, Wed trained; today Sun 11-01 rest.
    const s = dates("2026-10-28", "2026-10-30", "2026-10-31");
    expect(trainingStreak(s, "2026-11-01")).toBe(3);
  });

  it("counts a session done on a rest day", () => {
    const s = dates("2026-10-28", "2026-10-29", "2026-10-30");
    expect(trainingStreak(s, "2026-10-30")).toBe(3);
  });

  it("breaks on a missed scheduled day", () => {
    // Wed 10-28 missed.
    const s = dates("2026-10-27", "2026-10-30", "2026-10-31");
    expect(trainingStreak(s, "2026-10-31")).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { goalProgress, kgToGoal, projectArrival, type GoalInput } from "./weight";

const goal: GoalInput = {
  startKg: 80,
  goalLowKg: 69,
  goalHighKg: 70,
  targetRateKgPerWeek: 0.5,
  phase: "CUT",
};

describe("kgToGoal", () => {
  it("measures to the top of the goal range", () => {
    expect(kgToGoal(76.1, goal)).toBe(6.1);
  });

  it("is 0 once inside or below the range", () => {
    expect(kgToGoal(70, goal)).toBe(0);
    expect(kgToGoal(68, goal)).toBe(0);
  });
});

describe("goalProgress", () => {
  it("is 0 at the start and 1 at the midpoint, clamped", () => {
    expect(goalProgress(80, goal)).toBe(0);
    expect(goalProgress(69.5, goal)).toBe(1);
    expect(goalProgress(65, goal)).toBe(1);
    expect(goalProgress(85, goal)).toBe(0);
  });
});

describe("projectArrival", () => {
  it("divides the distance to the midpoint by the weekly rate", () => {
    // (76.1 - 69.5) / 0.5 = 13.2 weeks -> shown as 14 weeks, arrival in 93 days.
    expect(projectArrival(76.1, goal, "2026-10-30")).toEqual({
      weeks: 14,
      arrivalDate: "2027-01-31",
    });
  });

  it("is already there at or below the midpoint", () => {
    expect(projectArrival(69.5, goal, "2026-10-30")).toEqual({
      weeks: 0,
      arrivalDate: "2026-10-30",
    });
  });

  it("has no projection without a positive rate", () => {
    expect(projectArrival(76, { ...goal, targetRateKgPerWeek: 0 }, "2026-10-30")).toBeNull();
  });
});

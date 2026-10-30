import { describe, expect, it } from "vitest";
import { bestSet, detectPR, e1rm } from "./records";

describe("e1rm", () => {
  it("applies Epley", () => {
    expect(e1rm(60, 8)).toBeCloseTo(76);
    expect(e1rm(100, 1)).toBeCloseTo(103.33, 2);
  });
});

describe("bestSet", () => {
  it("picks the highest e1RM, not the heaviest weight", () => {
    const best = bestSet([
      { weightKg: 90, reps: 1 },
      { weightKg: 80, reps: 8 },
    ]);
    expect(best).toEqual({ weightKg: 80, reps: 8 });
  });

  it("ignores sets without reps and returns null when empty", () => {
    expect(bestSet([{ weightKg: 50, reps: 0 }])).toBeNull();
    expect(bestSet([])).toBeNull();
  });

  it("ranks bodyweight sets by reps", () => {
    expect(
      bestSet([
        { weightKg: 0, reps: 6 },
        { weightKg: 0, reps: 8 },
      ])
    ).toEqual({ weightKg: 0, reps: 8 });
  });
});

describe("detectPR", () => {
  const previous = [{ weightKg: 60, reps: 8 }];

  it("is never a PR the first time an exercise is done", () => {
    const { isPR, best } = detectPR([{ weightKg: 60, reps: 8 }], []);
    expect(isPR).toBe(false);
    expect(best).toEqual({ weightKg: 60, reps: 8 });
  });

  it("is a PR when e1RM beats the previous max", () => {
    expect(detectPR([{ weightKg: 62.5, reps: 8 }], previous).isPR).toBe(true);
  });

  it("is not a PR when equal or lower", () => {
    expect(detectPR([{ weightKg: 60, reps: 8 }], previous).isPR).toBe(false);
    expect(detectPR([{ weightKg: 55, reps: 8 }], previous).isPR).toBe(false);
  });

  it("requires beating the previous max by more than 0.01", () => {
    // 60 x 8 = 76.0; 60 x 8.0 plus a hair stays within the epsilon.
    expect(detectPR([{ weightKg: 60.005, reps: 8 }], previous).isPR).toBe(false);
  });

  it("is not a PR when nothing was completed", () => {
    expect(detectPR([], previous)).toEqual({ best: null, isPR: false });
  });
});

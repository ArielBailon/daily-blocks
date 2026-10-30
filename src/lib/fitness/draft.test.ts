import { describe, expect, it } from "vitest";
import {
  addSet,
  normalizeSearch,
  parseReps,
  parseWeight,
  removeLastSet,
  toPayload,
  toggleComplete,
  type DraftSet,
} from "./draft";

const empty: DraftSet = { weight: "", reps: "", completed: false };
const previous = [
  { setNumber: 1, weightKg: 60, reps: 8 },
  { setNumber: 2, weightKg: 62.5, reps: 6 },
];

describe("parsing", () => {
  it("reads decimal commas and rejects junk", () => {
    expect(parseWeight("62,5")).toBe(62.5);
    expect(parseWeight(" 0 ")).toBe(0);
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
    expect(parseWeight("-5")).toBeNull();
    expect(parseReps("8")).toBe(8);
    expect(parseReps("8.5")).toBeNull();
    expect(parseReps("")).toBeNull();
  });

  it("builds the API payload", () => {
    expect(toPayload({ weight: "60,5", reps: "8", completed: true })).toEqual({
      weightKg: 60.5,
      reps: 8,
      completed: true,
    });
    expect(toPayload(empty)).toEqual({ weightKg: null, reps: null, completed: false });
  });
});

describe("toggleComplete", () => {
  it("autocompletes empty inputs from the same set last time", () => {
    const { set, error } = toggleComplete(empty, 2, previous);
    expect(error).toBeNull();
    expect(set).toEqual({ weight: "62.5", reps: "6", completed: true });
  });

  it("keeps what was typed", () => {
    const { set } = toggleComplete({ weight: "65", reps: "", completed: false }, 1, previous);
    expect(set).toEqual({ weight: "65", reps: "8", completed: true });
  });

  it("asks for reps when there is no history", () => {
    const { set, error } = toggleComplete(empty, 1, []);
    expect(error).toBe("Escribe las repeticiones");
    expect(set.completed).toBe(false);
  });

  it("asks for the weight when only reps are known", () => {
    const { error } = toggleComplete({ weight: "", reps: "8", completed: false }, 1, []);
    expect(error).toBe("Escribe el peso (0 = peso corporal)");
  });

  it("accepts 0 kg as bodyweight", () => {
    const { set, error } = toggleComplete({ weight: "0", reps: "6", completed: false }, 1, []);
    expect(error).toBeNull();
    expect(set.completed).toBe(true);
  });

  it("un-completes without validating", () => {
    const { set, error } = toggleComplete({ weight: "", reps: "", completed: true }, 1, []);
    expect(error).toBeNull();
    expect(set.completed).toBe(false);
  });
});

describe("set list edits", () => {
  it("adds a set copying the last weight but not the reps", () => {
    const sets = addSet([{ weight: "60", reps: "8", completed: true }]);
    expect(sets).toHaveLength(2);
    expect(sets[1]).toEqual({ weight: "60", reps: "", completed: false });
  });

  it("never removes the last remaining set", () => {
    const one = [empty];
    expect(removeLastSet(one)).toHaveLength(1);
    expect(removeLastSet([empty, empty])).toHaveLength(1);
  });
});

describe("normalizeSearch", () => {
  it("ignores accents and case", () => {
    expect(normalizeSearch("  Extensión de TRÍCEPS ")).toBe("extension de triceps");
    expect(normalizeSearch("bíceps")).toBe("biceps");
  });
});

import { describe, expect, it } from "vitest";
import { buildBlockTimes } from "@/lib/blocks";
import { planDefaultContent, presetToRoutine } from "@/lib/default-blocks";

describe("presetToRoutine", () => {
  it("maps each preset block by its start time", () => {
    const routine = presetToRoutine([
      { startTime: "06:30", activity: "Wake up", tag: null },
      { startTime: "14:00", activity: "Gym", tag: "GYM" },
    ]);
    expect(routine.get("14:00")).toEqual({ activity: "Gym", tag: "GYM" });
    expect(routine.has("07:00")).toBe(false);
  });
});

describe("planDefaultContent", () => {
  const routine = presetToRoutine([
    { startTime: "06:30", activity: "Wake up", tag: null },
    { startTime: "07:00", activity: "Morning routine", tag: null },
    { startTime: "07:30", activity: "Morning routine", tag: null },
  ]);
  const empty = { activity: "", tag: null, completed: false };

  it("creates new blocks with the routine and leaves unlisted times empty", () => {
    const wanted = buildBlockTimes("06:30", "07:30");
    const { create, fill } = planDefaultContent(wanted, [], routine);
    expect(fill).toEqual([]);
    expect(create).toEqual([
      { startTime: "06:30", activity: "Wake up", tag: null },
      { startTime: "07:00", activity: "Morning routine", tag: null },
      { startTime: "07:30", activity: "Morning routine", tag: null },
    ]);
    const gap = planDefaultContent(["14:00"], [], routine).create;
    expect(gap).toEqual([{ startTime: "14:00", activity: "", tag: null }]);
  });

  it("does not create or fill anything outside the range", () => {
    const wanted = buildBlockTimes("07:00", "07:30");
    const existing = [{ id: 1, startTime: "06:30", ...empty }];
    const { create, fill } = planDefaultContent(wanted, existing, routine);
    expect(create.map((b) => b.startTime)).toEqual(["07:00", "07:30"]);
    expect(fill).toEqual([]);
  });

  it("keeps blocks that have an activity, a tag or a check", () => {
    const existing = [
      { id: 1, startTime: "06:30", ...empty, activity: "Mine" },
      { id: 2, startTime: "07:00", ...empty, tag: "DEEP" as const },
      { id: 3, startTime: "07:30", ...empty, completed: true },
    ];
    const { create, fill } = planDefaultContent(
      buildBlockTimes("06:30", "07:30"),
      existing,
      routine
    );
    expect(create).toEqual([]);
    expect(fill).toEqual([]);
  });

  it("fills an empty existing block, and is stable when run twice", () => {
    const wanted = buildBlockTimes("06:30", "07:00");
    const first = planDefaultContent(
      wanted,
      [{ id: 1, startTime: "06:30", ...empty }],
      routine
    );
    expect(first.fill).toEqual([{ id: 1, activity: "Wake up", tag: null }]);

    const filled = [
      { id: 1, startTime: "06:30", ...empty, activity: "Wake up" },
      { id: 2, startTime: "07:00", ...empty, activity: "Morning routine" },
    ];
    const second = planDefaultContent(wanted, filled, routine);
    expect(second).toEqual({ create: [], fill: [] });
  });
});

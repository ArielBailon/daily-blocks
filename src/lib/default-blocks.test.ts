import { describe, expect, it } from "vitest";
import { BLOCK_TAGS } from "@/lib/block-tags";
import { buildBlockTimes, TIME_PATTERN } from "@/lib/blocks";
import { getDefaultBlocks, planDefaultContent } from "@/lib/default-blocks";

// 2026-10-05 is a Monday.
const day = (n: number) => new Date(Date.UTC(2026, 9, 4 + n));
const SUNDAY = day(0);
const MONDAY = day(1);
const THURSDAY = day(4);

const activities = (date: Date) =>
  [...getDefaultBlocks(date).values()].map((b) => b.activity);

describe("getDefaultBlocks", () => {
  it("uses the normal routine on Mon, Tue, Wed, Fri and Sat", () => {
    for (const n of [1, 2, 3, 5, 6]) {
      const routine = getDefaultBlocks(day(n));
      expect(routine).toBe(getDefaultBlocks(MONDAY));
      expect(routine.get("08:30")?.tag).toBeNull();
      expect(routine.get("09:00")).toEqual({ activity: "", tag: "DEEP" });
      expect(routine.get("12:30")).toEqual({ activity: "", tag: "DEEP" });
      expect(routine.get("12:00")?.tag).toBe("DEEP");
      expect(routine.get("13:00")).toEqual({ activity: "Lunch", tag: null });
      expect(routine.get("13:30")).toEqual({ activity: "Lunch", tag: null });
      expect(routine.get("14:00")).toBeUndefined();
      for (const time of ["14:30", "15:00", "15:30", "16:00", "16:30"]) {
        expect(routine.get(time)).toEqual({ activity: "Gym", tag: "GYM" });
      }
      expect(routine.get("23:30")).toEqual({ activity: "Sleep", tag: null });
      expect(routine.get("17:00")).toEqual({
        activity: "Job Applying",
        tag: "JOB_HUNTING",
      });
      expect(routine.get("17:30")?.activity).toBe("Job Applying");
      expect(routine.get("18:00")?.activity).toBe("Rest / Reading");
      expect(routine.get("18:30")?.activity).toBe("Rest / Reading");
    }
  });

  it("has no Gym on Thursday and walks Bonnie at 17:00 and 17:30", () => {
    const routine = getDefaultBlocks(THURSDAY);
    expect(activities(THURSDAY)).not.toContain("Gym");
    expect(routine.get("17:00")).toEqual({ activity: "Walk Bonnie", tag: "WALK" });
    expect(routine.get("17:30")).toEqual({ activity: "Walk Bonnie", tag: "WALK" });
    expect(routine.get("18:00")).toEqual({
      activity: "Protein shake",
      tag: null,
    });
    expect(routine.get("18:30")?.activity).toBe("Home / Bath routine");
    expect(activities(THURSDAY)).not.toContain("Job Applying");
    expect(routine.has("09:30")).toBe(false);
  });

  it("cleans the room on Sunday and has no Gym", () => {
    const routine = getDefaultBlocks(SUNDAY);
    expect(routine.get("09:30")?.activity).toBe("Clean Room");
    expect(routine.get("10:00")?.activity).toBe("Clean Room");
    expect(activities(SUNDAY)).not.toContain("Gym");
    expect(routine.get("17:00")?.tag).toBe("WALK");
    expect(routine.get("18:00")?.activity).toBe("Protein shake");
    expect(activities(SUNDAY)).not.toContain("Job Applying");
    expect(routine.get("06:30")?.activity).toBe("Wake up");
  });

  it("tags the night reading as SCREENS_OFF every day", () => {
    for (const n of [0, 1, 4]) {
      const routine = getDefaultBlocks(day(n));
      for (const time of ["22:00", "22:30", "23:00"]) {
        expect(routine.get(time)).toEqual({
          activity: "Supplements / Reading / Brush Teeth",
          tag: "SCREENS_OFF",
        });
      }
    }
  });

  it("only uses valid times, tags and activity lengths", () => {
    for (const n of [0, 1, 4]) {
      for (const [time, block] of getDefaultBlocks(day(n))) {
        expect(time).toMatch(TIME_PATTERN);
        if (!block.tag) expect(block.activity.length).toBeGreaterThan(0);
        expect(block.activity.length).toBeLessThanOrEqual(200);
        if (block.tag) expect(BLOCK_TAGS).toContain(block.tag);
      }
    }
  });
});

describe("planDefaultContent", () => {
  const routine = getDefaultBlocks(MONDAY);
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

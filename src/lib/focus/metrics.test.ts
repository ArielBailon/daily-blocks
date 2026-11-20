import { describe, expect, it } from "vitest";
import {
  focusTotalForDays,
  formatFocusMinutes,
  summarizeByDay,
  summarizeFocus,
  type FocusDaySummary,
} from "./metrics";

const session = (
  status: string,
  actualWorkSeconds: number,
  breakSkipped = false
) => ({ status, actualWorkSeconds, breakSkipped });

describe("summarizeFocus", () => {
  it("is all zeros without sessions", () => {
    expect(summarizeFocus([])).toEqual({
      workSeconds: 0,
      minutes: 0,
      completed: 0,
      abandoned: 0,
      breaksSkipped: 0,
    });
  });

  it("counts completed and abandoned sessions and sums their seconds", () => {
    const result = summarizeFocus([
      session("COMPLETED", 1500),
      session("COMPLETED", 3000, true),
      session("ABANDONED", 600),
    ]);
    expect(result).toEqual({
      workSeconds: 5100,
      minutes: 85,
      completed: 2,
      abandoned: 1,
      breaksSkipped: 1,
    });
  });

  it("ignores sessions that are still running or unsettled", () => {
    const result = summarizeFocus([
      session("WORKING", 900),
      session("PAUSED", 300),
      session("BREAK", 1500, true),
      session("COMPLETED", 60),
    ]);
    expect(result.workSeconds).toBe(60);
    expect(result.completed).toBe(1);
    expect(result.breaksSkipped).toBe(0);
  });

  it("rounds 29 seconds down and 30 seconds up", () => {
    expect(summarizeFocus([session("ABANDONED", 29)]).minutes).toBe(0);
    expect(summarizeFocus([session("ABANDONED", 30)]).minutes).toBe(1);
  });
});

describe("summarizeByDay", () => {
  it("summarizes each day on its own", () => {
    const result = summarizeByDay({
      "2026-11-18": [session("COMPLETED", 1500)],
      "2026-11-19": [session("ABANDONED", 120)],
    });
    expect(result["2026-11-18"].minutes).toBe(25);
    expect(result["2026-11-19"].abandoned).toBe(1);
  });
});

describe("focusTotalForDays", () => {
  const day = (workSeconds: number): FocusDaySummary => ({
    workSeconds,
    minutes: Math.round(workSeconds / 60),
    completed: 0,
    abandoned: 0,
    breaksSkipped: 0,
  });

  it("sums the seconds of the listed days", () => {
    const byDay = { a: day(1500), b: day(900) };
    expect(focusTotalForDays(byDay, ["a", "b"])).toBe(40);
  });

  it("ignores days with no entry and days outside the list", () => {
    const byDay = { a: day(1500), z: day(6000) };
    expect(focusTotalForDays(byDay, ["a", "missing"])).toBe(25);
    expect(focusTotalForDays(byDay, [])).toBe(0);
  });

  it("rounds once from the summed seconds", () => {
    const byDay = { a: day(40), b: day(40) };
    expect(focusTotalForDays(byDay, ["a", "b"])).toBe(1);
  });
});

describe("formatFocusMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatFocusMinutes(0)).toBe("0 min");
    expect(formatFocusMinutes(45)).toBe("45 min");
    expect(formatFocusMinutes(60)).toBe("1 h");
    expect(formatFocusMinutes(65)).toBe("1 h 05 min");
    expect(formatFocusMinutes(250)).toBe("4 h 10 min");
    expect(formatFocusMinutes(1439)).toBe("23 h 59 min");
  });
});

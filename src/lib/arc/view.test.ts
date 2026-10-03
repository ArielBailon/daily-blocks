import { describe, expect, it } from "vitest";
import { computeArc } from "@/lib/arc/summary";
import { arcProgress, currentWeek, parseDayParam, percent } from "@/lib/arc/view";

describe("arcProgress", () => {
  it("is before the start", () => {
    expect(arcProgress("2026-10-02")).toEqual({ kind: "before" });
  });
  it("is day 1 on the start date", () => {
    expect(arcProgress("2026-10-03")).toEqual({ kind: "during", day: 1 });
  });
  it("is day 90 on the last day", () => {
    expect(arcProgress("2026-12-31")).toEqual({ kind: "during", day: 90 });
  });
  it("is after the last day", () => {
    expect(arcProgress("2027-01-01")).toEqual({ kind: "after" });
  });
});

describe("currentWeek", () => {
  const summary = computeArc([], "2026-10-03");

  it("returns the first week even though it starts before the arc", () => {
    expect(currentWeek(summary, "2026-10-03")?.weekStart).toBe("2026-09-28");
  });
  it("returns the week containing today", () => {
    expect(currentWeek(summary, "2026-10-14")?.weekStart).toBe("2026-10-12");
  });
  it("is null outside the arc", () => {
    expect(currentWeek(summary, "2026-10-02")).toBeNull();
    expect(currentWeek(summary, "2027-01-01")).toBeNull();
  });
});

describe("percent", () => {
  it("is null when nothing was evaluated", () => {
    expect(percent(0, 0)).toBeNull();
  });
  it("rounds to a whole number", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 4)).toBe(0);
    expect(percent(4, 4)).toBe(100);
  });
});

describe("parseDayParam", () => {
  it("accepts 1 to 90", () => {
    expect(parseDayParam("1")).toBe(1);
    expect(parseDayParam("90")).toBe(90);
  });
  it("rejects out of range, malformed and repeated values", () => {
    expect(parseDayParam("0")).toBeNull();
    expect(parseDayParam("91")).toBeNull();
    expect(parseDayParam("abc")).toBeNull();
    expect(parseDayParam("1.5")).toBeNull();
    expect(parseDayParam(["1", "2"])).toBeNull();
    expect(parseDayParam(undefined)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseDayRange } from "@/lib/validation/day-range";

describe("parseDayRange", () => {
  it("accepts a valid range", () => {
    const result = parseDayRange(["2026-10-03"], ["2026-10-10"]);
    expect(result).toEqual({
      ok: true,
      from: new Date(Date.UTC(2026, 9, 3)),
      to: new Date(Date.UTC(2026, 9, 10)),
    });
  });

  it("accepts a single day", () => {
    expect(parseDayRange(["2026-10-03"], ["2026-10-03"]).ok).toBe(true);
  });

  it("accepts exactly 120 days and rejects 121", () => {
    // 2026-10-03 + 119 days = 2027-01-30.
    expect(parseDayRange(["2026-10-03"], ["2027-01-30"]).ok).toBe(true);
    expect(parseDayRange(["2026-10-03"], ["2027-01-31"]).ok).toBe(false);
  });

  it("rejects from after to", () => {
    expect(parseDayRange(["2026-10-04"], ["2026-10-03"]).ok).toBe(false);
  });

  it("rejects missing and repeated values", () => {
    expect(parseDayRange([], ["2026-10-03"]).ok).toBe(false);
    expect(parseDayRange(["2026-10-03"], []).ok).toBe(false);
    expect(parseDayRange(["2026-10-03", "2026-10-04"], ["2026-10-05"]).ok).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseDayRange(["abc"], ["2026-10-03"]).ok).toBe(false);
    expect(parseDayRange(["2026-10-03"], ["2026-10-3"]).ok).toBe(false);
    expect(parseDayRange(["2026-02-30"], ["2026-03-01"]).ok).toBe(false);
  });

  it("explains the failure", () => {
    const result = parseDayRange(["abc"], ["2026-10-03"]);
    expect(result.ok === false && result.error.length > 0).toBe(true);
  });
});

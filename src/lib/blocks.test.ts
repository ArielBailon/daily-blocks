import { describe, expect, it } from "vitest";
import { buildBlockTimes, isValidRange } from "@/lib/blocks";

describe("buildBlockTimes", () => {
  it("includes both ends of the range in 30-minute steps", () => {
    expect(buildBlockTimes("06:30", "08:00")).toEqual([
      "06:30",
      "07:00",
      "07:30",
      "08:00",
    ]);
  });
});

describe("isValidRange", () => {
  it("rejects a start that is not before the end", () => {
    expect(isValidRange("09:00", "09:00")).toBe(false);
    expect(isValidRange("10:00", "09:00")).toBe(false);
  });

  it("rejects times that are not on :00 or :30", () => {
    expect(isValidRange("06:15", "09:00")).toBe(false);
  });
});

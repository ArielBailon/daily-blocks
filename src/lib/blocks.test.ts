import { describe, expect, it } from "vitest";
import {
  buildBlockTimes,
  findCurrentAndNext,
  isValidRange,
} from "@/lib/blocks";

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

describe("findCurrentAndNext", () => {
  const blocks = buildBlockTimes("06:30", "08:00").map((startTime, i) => ({
    startTime,
    i,
  }));
  const at = (h: number, m: number) => h * 60 + m;

  it("finds the block at its exact start and one minute before the next", () => {
    expect(findCurrentAndNext(blocks, at(7, 0)).current?.startTime).toBe("07:00");
    expect(findCurrentAndNext(blocks, at(7, 29)).current?.startTime).toBe("07:00");
    expect(findCurrentAndNext(blocks, at(7, 30)).current?.startTime).toBe("07:30");
  });

  it("returns the following block as next", () => {
    expect(findCurrentAndNext(blocks, at(7, 10)).next?.startTime).toBe("07:30");
  });

  it("has no next on the last block, which ends 30 minutes after its start", () => {
    const result = findCurrentAndNext(blocks, at(8, 20));
    expect(result.current?.startTime).toBe("08:00");
    expect(result.next).toBeNull();
    expect(findCurrentAndNext(blocks, at(8, 30)).current).toBeNull();
  });

  it("before the first block, next is the first one", () => {
    const result = findCurrentAndNext(blocks, at(5, 0));
    expect(result.current).toBeNull();
    expect(result.next?.startTime).toBe("06:30");
  });

  it("after the last block there is nothing", () => {
    expect(findCurrentAndNext(blocks, at(12, 0))).toEqual({
      current: null,
      next: null,
    });
  });

  it("handles a gap: next is the first later block", () => {
    const gapped = [{ startTime: "09:00" }, { startTime: "11:00" }];
    const result = findCurrentAndNext(gapped, at(10, 0));
    expect(result.current).toBeNull();
    expect(result.next?.startTime).toBe("11:00");
    expect(findCurrentAndNext(gapped, at(9, 10)).next?.startTime).toBe("11:00");
  });

  it("handles an empty list", () => {
    expect(findCurrentAndNext([], at(10, 0))).toEqual({
      current: null,
      next: null,
    });
  });
});

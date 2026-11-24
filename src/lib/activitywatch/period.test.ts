import { describe, expect, it } from "vitest";
import { blockPeriod, periodSeconds, periodsToFetch } from "./period";

describe("blockPeriod", () => {
  it("covers 30 minutes from the Guayaquil start time, in UTC", () => {
    expect(blockPeriod("2026-11-24", "07:30")).toBe(
      "2026-11-24T12:30:00.000Z/2026-11-24T13:00:00.000Z"
    );
  });

  it("ends at local midnight for the 23:30 block", () => {
    expect(blockPeriod("2026-11-24", "23:30")).toBe(
      "2026-11-25T04:30:00.000Z/2026-11-25T05:00:00.000Z"
    );
  });
});

describe("periodsToFetch", () => {
  const day = "2026-11-24";
  // 10:10 in Guayaquil: 09:30 is finished, 10:00 is current, 10:30 is future.
  const now = Date.parse("2026-11-24T15:10:00Z");
  const times = ["09:30", "10:00", "10:30"];

  it("skips future blocks and fetches started ones", () => {
    expect(periodsToFetch(day, times, now, new Map())).toEqual(["09:30", "10:00"]);
  });

  it("skips a finished block that is cached", () => {
    const cache = new Map([[blockPeriod(day, "09:30"), {}]]);
    expect(periodsToFetch(day, times, now, cache)).toEqual(["10:00"]);
  });

  it("fetches the current block even when it is cached", () => {
    const cache = new Map([[blockPeriod(day, "10:00"), {}]]);
    expect(periodsToFetch(day, times, now, cache)).toEqual(["09:30", "10:00"]);
  });
});

describe("periodSeconds", () => {
  it("is the length of a timeperiod", () => {
    expect(periodSeconds(blockPeriod("2026-11-24", "10:00"))).toBe(1800);
  });
});

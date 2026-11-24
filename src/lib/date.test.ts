import { describe, expect, it } from "vitest";
import { localMinutesOfDay, zonedTimeToUtc } from "@/lib/date";

describe("localMinutesOfDay", () => {
  it("reads the America/Guayaquil wall clock (UTC-5)", () => {
    expect(localMinutesOfDay(new Date("2026-11-20T15:12:00Z"))).toBe(612);
  });

  it("is 0 at local midnight", () => {
    expect(localMinutesOfDay(new Date("2026-11-20T05:00:00Z"))).toBe(0);
  });

  it("is 1439 at 23:59 local, even though UTC is already the next day", () => {
    expect(localMinutesOfDay(new Date("2026-11-21T04:59:00Z"))).toBe(1439);
  });

  it("keeps the local day before UTC midnight", () => {
    expect(localMinutesOfDay(new Date("2026-11-20T23:30:00Z"))).toBe(18 * 60 + 30);
  });
});

describe("zonedTimeToUtc", () => {
  it("turns a Guayaquil wall time into the UTC instant (UTC-5)", () => {
    expect(zonedTimeToUtc("2026-11-24", 7 * 60 + 30).toISOString()).toBe(
      "2026-11-24T12:30:00.000Z"
    );
  });

  it("moves to the next UTC day for late evening times", () => {
    expect(zonedTimeToUtc("2026-11-24", 23 * 60 + 30).toISOString()).toBe(
      "2026-11-25T04:30:00.000Z"
    );
  });

  it("rolls minutes past the end of the day into the next day", () => {
    expect(zonedTimeToUtc("2026-11-24", 24 * 60).toISOString()).toBe(
      "2026-11-25T05:00:00.000Z"
    );
  });

  it("rejects an invalid date key", () => {
    expect(() => zonedTimeToUtc("2026-02-30", 0)).toThrow(RangeError);
  });
});

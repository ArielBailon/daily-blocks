import { describe, expect, it } from "vitest";
import { localMinutesOfDay } from "@/lib/date";

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

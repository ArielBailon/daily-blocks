import { describe, expect, it } from "vitest";
import { blockPeriod, periodSeconds } from "./period";

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

describe("periodSeconds", () => {
  it("is the length of a timeperiod", () => {
    expect(periodSeconds(blockPeriod("2026-11-24", "10:00"))).toBe(1800);
  });
});

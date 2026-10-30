import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  isoWeekday,
  localDateKey,
  weekDates,
  weekEnd,
  weekStart,
} from "./week";

describe("localDateKey", () => {
  it("uses the Guayaquil calendar day, not UTC", () => {
    // 03:00 UTC on Mon 2026-11-02 is still Sunday 22:00 in Guayaquil (UTC-5).
    expect(localDateKey(new Date("2026-11-02T03:00:00Z"))).toBe("2026-11-01");
    expect(localDateKey(new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });
});

describe("week", () => {
  it("runs Monday to Sunday", () => {
    expect(weekStart("2026-10-30")).toBe("2026-10-26");
    expect(weekEnd("2026-10-30")).toBe("2026-11-01");
    expect(weekDates("2026-10-26")).toHaveLength(7);
  });

  it("keeps Sunday in the week that started the previous Monday", () => {
    expect(isoWeekday("2026-11-01")).toBe(7);
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });

  it("puts a late-Sunday instant in the previous week in Guayaquil", () => {
    const local = localDateKey(new Date("2026-11-02T03:00:00Z"));
    expect(weekStart(local)).toBe("2026-10-26");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
  });
});

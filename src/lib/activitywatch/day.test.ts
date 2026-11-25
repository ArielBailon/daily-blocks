import { describe, expect, it } from "vitest";
import { byTopCategory, dayRange, formatDuration, topWithRest } from "./day";

describe("dayRange", () => {
  it("cuts today at now", () => {
    expect(dayRange("2026-11-24", Date.parse("2026-11-24T17:30:00Z"))).toEqual({
      period: "2026-11-24T05:00:00.000Z/2026-11-24T17:30:00.000Z",
      finished: false,
    });
  });

  it("covers a past day from local midnight to midnight", () => {
    expect(dayRange("2026-11-21", Date.parse("2026-11-24T17:30:00Z"))).toEqual({
      period: "2026-11-21T05:00:00.000Z/2026-11-22T05:00:00.000Z",
      finished: true,
    });
  });

  it("is null for a day that has not started", () => {
    expect(dayRange("2026-11-25", Date.parse("2026-11-24T17:30:00Z"))).toBeNull();
  });
});

describe("topWithRest", () => {
  const items = [
    { name: "a", seconds: 10 },
    { name: "b", seconds: 50 },
    { name: "c", seconds: 30 },
    { name: "d", seconds: 5 },
  ];

  it("keeps the longest items and sums the rest", () => {
    const { top, rest } = topWithRest(items, 2);
    expect(top.map((i) => i.name)).toEqual(["b", "c"]);
    expect(rest).toEqual({ count: 2, seconds: 15 });
  });

  it("has no rest when everything fits", () => {
    expect(topWithRest(items, 8).rest).toBeNull();
  });
});

describe("formatDuration", () => {
  it("shows minutes, hours and minutes, or <1 min", () => {
    expect(formatDuration(59)).toBe("<1 min");
    expect(formatDuration(60 * 37 + 20)).toBe("37 min");
    expect(formatDuration(3600 * 2)).toBe("2 h");
    expect(formatDuration(3600 * 5 + 60 * 12)).toBe("5 h 12 min");
  });
});

describe("byTopCategory", () => {
  it("sums subcategories under their top level, longest first", () => {
    expect(
      byTopCategory([
        { path: ["Work", "Programming"], seconds: 100 },
        { path: ["Uncategorized"], seconds: 600 },
        { path: ["Work", "Docs"], seconds: 50 },
        { path: ["Media", "Video"], seconds: 30 },
      ])
    ).toEqual([
      { name: "Uncategorized", seconds: 600 },
      { name: "Work", seconds: 150 },
      { name: "Media", seconds: 30 },
    ]);
  });

  it("is empty without categories", () => {
    expect(byTopCategory([])).toEqual([]);
  });
});

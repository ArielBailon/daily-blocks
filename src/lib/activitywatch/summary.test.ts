import { describe, expect, it } from "vitest";
import {
  barSegments,
  distractionMinutes,
  distractionSeconds,
  formatAppMinutes,
  isDeepDistracted,
  shouldShowAlert,
  summarizePeriod,
  type CategoryTime,
  type PeriodSummary,
} from "./summary";

const cat = (path: string[], duration: number) => ({
  timestamp: "2026-11-24T15:00:00Z",
  duration,
  data: { $category: path },
});
const app = (name: string, duration: number) => ({
  timestamp: "2026-11-24T15:00:00Z",
  duration,
  data: { app: name },
});

describe("summarizePeriod", () => {
  it("adds idle time and percentages of the period", () => {
    const summary = summarizePeriod(
      {
        cats: [cat(["Work", "Programming"], 900), cat(["Media", "Video"], 300)],
        apps: [app("Code.exe", 900), app("chrome.exe", 300)],
      },
      1800
    );
    expect(summary.activeSeconds).toBe(1200);
    expect(summary.idleSeconds).toBe(600);
    expect(summary.categories[0].percent).toBe(50);
    expect(summary.categories[1].percent).toBeCloseTo(50 / 3);
    const total =
      summary.categories.reduce((s, c) => s + c.percent, 0) +
      (summary.idleSeconds / 1800) * 100;
    expect(total).toBeCloseTo(100);
  });

  it("scales down active time longer than the period", () => {
    const summary = summarizePeriod(
      {
        cats: [cat(["Work"], 2400), cat(["Uncategorized"], 1200)],
        apps: [app("a", 3600)],
      },
      1800
    );
    expect(summary.activeSeconds).toBe(1800);
    expect(summary.idleSeconds).toBe(0);
    expect(summary.categories.map((c) => c.seconds)).toEqual([1200, 600]);
    expect(summary.apps).toEqual([{ app: "a", seconds: 1800 }]);
  });

  it("is all idle for an empty or malformed result", () => {
    for (const result of [{ cats: [], apps: [] }, null, { cats: "x" }]) {
      const summary = summarizePeriod(result, 1800);
      expect(summary.activeSeconds).toBe(0);
      expect(summary.idleSeconds).toBe(1800);
      expect(summary.categories).toEqual([]);
    }
  });

  it("keeps the top 3 apps sorted by time and skips bad events", () => {
    const summary = summarizePeriod(
      {
        cats: [cat(["Work"], 100)],
        apps: [
          app("b", 10),
          app("a", 40),
          app("d", 5),
          app("c", 20),
          { duration: 99, data: {} },
          { duration: "1", data: { app: "x" } },
        ],
      },
      1800
    );
    expect(summary.apps.map((a) => a.app)).toEqual(["a", "c", "b"]);
  });
});

describe("distraction", () => {
  const categories: CategoryTime[] = [
    { path: ["Media", "Video"], seconds: 120, percent: 0 },
    { path: ["Media", "Social Media", "Reddit"], seconds: 60, percent: 0 },
    { path: ["Work", "Video"], seconds: 600, percent: 0 },
    { path: ["Media"], seconds: 300, percent: 0 },
    { path: ["Uncategorized"], seconds: 300, percent: 0 },
  ];

  it("counts distraction paths and their children only", () => {
    expect(distractionSeconds(categories)).toBe(180);
  });

  it("floors to whole minutes", () => {
    expect(distractionMinutes(categories)).toBe(3);
    expect(distractionMinutes([])).toBe(0);
  });
});

describe("shouldShowAlert", () => {
  it("shows only above the threshold", () => {
    expect(shouldShowAlert({ minutes: 4, key: "s1", dismissedKey: null })).toBe(false);
    expect(shouldShowAlert({ minutes: 5, key: "s1", dismissedKey: null })).toBe(false);
    expect(shouldShowAlert({ minutes: 6, key: "s1", dismissedKey: null })).toBe(true);
  });

  it("stays hidden after dismissal until the key changes", () => {
    expect(shouldShowAlert({ minutes: 9, key: "s1", dismissedKey: "s1" })).toBe(false);
    expect(shouldShowAlert({ minutes: 6, key: "s2", dismissedKey: "s1" })).toBe(true);
  });
});

function summaryOf(categories: [string[], number][], periodSeconds = 1800): PeriodSummary {
  const active = categories.reduce((sum, [, seconds]) => sum + seconds, 0);
  return {
    periodSeconds,
    activeSeconds: active,
    idleSeconds: periodSeconds - active,
    categories: categories.map(([path, seconds]) => ({
      path,
      seconds,
      percent: (seconds / periodSeconds) * 100,
    })),
    apps: [],
  };
}

describe("barSegments", () => {
  it("groups by top-level category, largest first, idle last", () => {
    const segments = barSegments(
      summaryOf([
        [["Work", "Programming"], 540],
        [["Work"], 360],
        [["Media", "Video"], 360],
      ])
    );
    expect(segments.map((s) => [s.label, s.percent])).toEqual([
      ["Work", 50],
      ["Media", 20],
      ["inactivo", 30],
    ]);
    expect(segments.reduce((sum, s) => sum + s.percent, 0)).toBeCloseTo(100);
  });

  it("drops segments under 0.5%", () => {
    const segments = barSegments(summaryOf([[["Work"], 1791], [["Comms", "IM"], 8]]));
    expect(segments.map((s) => s.label)).toEqual(["Work"]);
  });

  it("is a single idle segment with no activity", () => {
    expect(barSegments(summaryOf([]))).toEqual([
      { key: "idle", label: "inactivo", percent: 100 },
    ]);
  });
});

describe("isDeepDistracted", () => {
  const share = (distracted: number) =>
    summaryOf([
      [["Media", "Video"], distracted],
      [["Work", "Programming"], 1000 - distracted],
    ]);

  it("is true above 20% of active time in a DEEP block", () => {
    expect(isDeepDistracted(share(210), "DEEP")).toBe(true);
  });

  it("is false at exactly 20%, for other tags and with no activity", () => {
    expect(isDeepDistracted(share(200), "DEEP")).toBe(false);
    expect(isDeepDistracted(share(500), "GYM")).toBe(false);
    expect(isDeepDistracted(share(500), null)).toBe(false);
    expect(isDeepDistracted(summaryOf([]), "DEEP")).toBe(false);
  });

  it("does not count Work > Video", () => {
    expect(
      isDeepDistracted(summaryOf([[["Work", "Video"], 900], [["Work"], 100]]), "DEEP")
    ).toBe(false);
  });
});

describe("formatAppMinutes", () => {
  it("rounds to minutes and shows <1 min under 30 s", () => {
    expect(formatAppMinutes(29)).toBe("<1 min");
    expect(formatAppMinutes(30)).toBe("1 min");
    expect(formatAppMinutes(749)).toBe("12 min");
  });
});

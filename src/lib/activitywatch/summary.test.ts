import { describe, expect, it } from "vitest";
import {
  distractionMinutes,
  distractionSeconds,
  shouldShowAlert,
  summarizePeriod,
  type CategoryTime,
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

  it("groups each app's window titles, scaled like the rest", () => {
    const title = (name: string, text: string, duration: number) => ({
      timestamp: "2026-11-24T15:00:00Z",
      duration,
      data: { app: name, title: text },
    });
    const summary = summarizePeriod(
      {
        cats: [cat(["Work"], 3600)],
        apps: [app("chrome.exe", 3600)],
        titles: [
          title("chrome.exe", "Inicio / X - Google Chrome", 2400),
          title("chrome.exe", "Feed | LinkedIn - Google Chrome", 1200),
          { duration: 5, data: { title: "no app" } },
        ],
      },
      1800
    );
    expect(summary.appDetails.get("chrome.exe")).toEqual([
      { label: "X", seconds: 1200 },
      { label: "LinkedIn", seconds: 600 },
    ]);
  });

  it("is all idle for an empty or malformed result", () => {
    for (const result of [{ cats: [], apps: [] }, null, { cats: "x" }]) {
      const summary = summarizePeriod(result, 1800);
      expect(summary.activeSeconds).toBe(0);
      expect(summary.idleSeconds).toBe(1800);
      expect(summary.categories).toEqual([]);
    }
  });

  it("keeps every app sorted by time and skips bad events", () => {
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
    expect(summary.apps.map((a) => a.app)).toEqual(["a", "c", "b", "d"]);
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

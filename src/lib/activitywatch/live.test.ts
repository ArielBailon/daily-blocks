import { describe, expect, it } from "vitest";
import { appStreakStart, pickAlert } from "./live";

const event = (start: string, seconds: number, app: string) => ({
  timestamp: start,
  duration: seconds,
  data: { app, title: "t" },
});

describe("appStreakStart", () => {
  it("is the start of a single event", () => {
    expect(appStreakStart([event("2026-11-24T15:00:00Z", 30, "chrome.exe")])).toBe(
      "2026-11-24T15:00:00.000Z"
    );
  });

  it("joins consecutive events of the same app", () => {
    expect(
      appStreakStart([
        event("2026-11-24T15:10:00Z", 60, "chrome.exe"),
        event("2026-11-24T15:05:00Z", 280, "chrome.exe"),
        event("2026-11-24T15:00:00Z", 300, "chrome.exe"),
      ])
    ).toBe("2026-11-24T15:00:00.000Z");
  });

  it("stops at a different app", () => {
    expect(
      appStreakStart([
        event("2026-11-24T15:10:00Z", 60, "chrome.exe"),
        event("2026-11-24T15:05:00Z", 300, "Code.exe"),
        event("2026-11-24T15:00:00Z", 300, "chrome.exe"),
      ])
    ).toBe("2026-11-24T15:10:00.000Z");
  });

  it("stops at a gap over 60 s", () => {
    expect(
      appStreakStart([
        event("2026-11-24T15:10:00Z", 60, "chrome.exe"),
        event("2026-11-24T15:05:00Z", 200, "chrome.exe"),
      ])
    ).toBe("2026-11-24T15:10:00.000Z");
  });

  it("is null for an empty or malformed list", () => {
    expect(appStreakStart([])).toBeNull();
    expect(appStreakStart(null)).toBeNull();
    expect(appStreakStart([{ timestamp: "x", duration: 1, data: { app: "a" } }])).toBeNull();
  });
});

describe("pickAlert", () => {
  const none = new Set<string>();
  const session = (minutes: number) => ({ id: 7, minutes });
  const block = (minutes: number) => ({ dateKey: "2026-11-24", startTime: "09:00", minutes });

  it("is null at or below the threshold", () => {
    expect(pickAlert({ session: session(4), block: block(5), dismissed: none })).toBeNull();
  });

  it("alerts for the session or the block over the threshold", () => {
    expect(pickAlert({ session: session(6), block: null, dismissed: none })).toEqual({
      key: "session:7",
      kind: "session",
      minutes: 6,
    });
    expect(pickAlert({ session: session(2), block: block(8), dismissed: none })).toEqual({
      key: "block:2026-11-24:09:00",
      kind: "block",
      minutes: 8,
    });
  });

  it("prefers the session when both qualify", () => {
    expect(pickAlert({ session: session(6), block: block(9), dismissed: none })?.kind).toBe(
      "session"
    );
  });

  it("falls back to the block after the session is dismissed", () => {
    expect(
      pickAlert({ session: session(6), block: block(9), dismissed: new Set(["session:7"]) })?.kind
    ).toBe("block");
    expect(
      pickAlert({
        session: session(6),
        block: block(9),
        dismissed: new Set(["session:7", "block:2026-11-24:09:00"]),
      })
    ).toBeNull();
  });
});

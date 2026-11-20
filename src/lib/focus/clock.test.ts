import { describe, expect, it } from "vitest";
import {
  clockOffset,
  formatClock,
  shouldAlert,
  stateFromDto,
} from "./clock";
import type { FocusSessionDto } from "./types";

const NOW = Date.parse("2026-11-20T15:00:00Z");

function dto(overrides: Partial<FocusSessionDto> = {}): FocusSessionDto {
  return {
    id: 1,
    status: "WORKING",
    preset: "CLASSIC",
    blockIds: [1],
    workMinutes: 25,
    breakMinutes: 5,
    startedAt: "2026-11-20T14:35:00.000Z",
    workEndsAt: "2026-11-20T15:00:00.000Z",
    breakEndsAt: "2026-11-20T15:05:00.000Z",
    pausedAt: null,
    breakSkipped: false,
    actualWorkSeconds: 0,
    endedAt: null,
    blocksMarked: false,
    serverNow: "2026-11-20T14:59:00.000Z",
    ...overrides,
  };
}

describe("formatClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59_000)).toBe("00:59");
    expect(formatClock(60_000)).toBe("01:00");
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(120 * 60_000)).toBe("120:00");
  });

  it("clamps negatives and rounds up partial seconds", () => {
    expect(formatClock(-5_000)).toBe("00:00");
    expect(formatClock(1)).toBe("00:01");
    expect(formatClock(59_001)).toBe("01:00");
  });
});

describe("clockOffset", () => {
  it("is server time minus browser time", () => {
    expect(clockOffset("2026-11-20T15:00:05.000Z", NOW)).toBe(5_000);
    expect(clockOffset("2026-11-20T14:59:50.000Z", NOW)).toBe(-10_000);
  });
});

describe("stateFromDto", () => {
  it("parses dates and keeps the fields", () => {
    const state = stateFromDto(
      dto({ pausedAt: "2026-11-20T14:50:00.000Z", status: "PAUSED" })
    );
    expect(state.workEndsAt).toEqual(new Date("2026-11-20T15:00:00.000Z"));
    expect(state.pausedAt).toEqual(new Date("2026-11-20T14:50:00.000Z"));
    expect(state.status).toBe("PAUSED");
    expect(state.workMinutes).toBe(25);
    expect(state.endedAt).toBeNull();
  });
});

describe("shouldAlert", () => {
  const breakEndsAt = "2026-11-20T15:05:00.000Z";
  const working = { id: 1, status: "WORKING" as const, breakEndsAt };
  const inBreak = { id: 1, status: "BREAK" as const, breakEndsAt };

  it("alerts for a live work end", () => {
    expect(shouldAlert(working, dto({ status: "BREAK" }), NOW + 1_000)).toBe(
      true
    );
  });

  it("alerts for a live break end", () => {
    expect(
      shouldAlert(inBreak, dto({ status: "COMPLETED" }), NOW + 5 * 60_000 + 2_000)
    ).toBe(true);
  });

  it("does not alert for a stale transition", () => {
    expect(shouldAlert(working, dto({ status: "BREAK" }), NOW + 11_000)).toBe(
      false
    );
  });

  it("does not alert before the scheduled end", () => {
    expect(shouldAlert(working, dto({ status: "COMPLETED" }), NOW - 60_000)).toBe(
      false
    );
  });

  it("does not alert when nothing changed or the user acted", () => {
    expect(shouldAlert(working, dto(), NOW + 1_000)).toBe(false);
    expect(
      shouldAlert(working, dto({ status: "PAUSED" }), NOW + 1_000)
    ).toBe(false);
    expect(
      shouldAlert(
        { id: 1, status: "PAUSED", breakEndsAt },
        dto({ status: "WORKING" }),
        NOW + 1_000
      )
    ).toBe(false);
    expect(
      shouldAlert(
        inBreak,
        dto({ status: "COMPLETED", breakSkipped: true }),
        NOW + 5 * 60_000 + 1_000
      )
    ).toBe(false);
    expect(
      shouldAlert(working, dto({ status: "ABANDONED" }), NOW + 1_000)
    ).toBe(false);
  });

  it("does not alert on first load or for another session", () => {
    expect(shouldAlert(null, dto({ status: "BREAK" }), NOW + 1_000)).toBe(false);
    expect(
      shouldAlert(
        { id: 2, status: "WORKING", breakEndsAt },
        dto({ status: "BREAK" }),
        NOW + 1_000
      )
    ).toBe(false);
  });

  it("alerts when the active read finds a session that just completed", () => {
    expect(shouldAlert(inBreak, null, NOW + 5 * 60_000 + 3_000)).toBe(true);
    expect(shouldAlert(working, null, NOW + 5 * 60_000 + 3_000)).toBe(true);
  });

  it("does not alert for a null read long after the end or for nothing", () => {
    expect(shouldAlert(inBreak, null, NOW + 20 * 60_000)).toBe(false);
    expect(shouldAlert(inBreak, null, NOW)).toBe(false);
    expect(shouldAlert(null, null, NOW)).toBe(false);
  });
});

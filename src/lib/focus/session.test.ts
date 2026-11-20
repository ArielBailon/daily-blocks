import { describe, expect, it } from "vitest";
import { blocksCovered } from "./config";
import {
  abandon,
  blocksMarked,
  coverBlocks,
  finish,
  meetsCompletion,
  pause,
  remainingMs,
  resume,
  settle,
  skipBreak,
  workedSeconds,
  type SessionState,
} from "./session";

const T0 = new Date("2026-11-20T14:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

function working(workMinutes = 25, breakMinutes = 5): SessionState {
  return {
    status: "WORKING",
    workMinutes,
    breakMinutes,
    startedAt: T0,
    workEndsAt: at(workMinutes * 60),
    breakEndsAt: at((workMinutes + breakMinutes) * 60),
    pausedAt: null,
    pausedSeconds: 0,
    breakSkipped: false,
    actualWorkSeconds: 0,
    endedAt: null,
  };
}

describe("blocksCovered", () => {
  it("matches the fixed presets", () => {
    expect(blocksCovered(25, 5)).toBe(1);
    expect(blocksCovered(50, 10)).toBe(2);
    expect(blocksCovered(80, 10)).toBe(3);
  });

  it("rounds custom sessions up", () => {
    expect(blocksCovered(5, 0)).toBe(1);
    expect(blocksCovered(30, 1)).toBe(2);
    expect(blocksCovered(120, 30)).toBe(5);
  });
});

describe("coverBlocks", () => {
  const ids = [10, 11, 12, 13];

  it("covers the chosen block and the following ones", () => {
    expect(coverBlocks(ids, 10, 2)).toEqual({
      blockIds: [10, 11],
      requested: 2,
      covered: 2,
      trimmed: false,
    });
  });

  it("covers one block", () => {
    expect(coverBlocks(ids, 12, 1)?.blockIds).toEqual([12]);
  });

  it("trims at the last block", () => {
    expect(coverBlocks(ids, 12, 3)).toEqual({
      blockIds: [12, 13],
      requested: 3,
      covered: 2,
      trimmed: true,
    });
  });

  it("trims when starting at the last block", () => {
    expect(coverBlocks(ids, 13, 2)?.blockIds).toEqual([13]);
  });

  it("returns null for an unknown block", () => {
    expect(coverBlocks(ids, 99, 1)).toBeNull();
  });
});

describe("settle", () => {
  it("does nothing before the work ends", () => {
    const { next, markBlocks } = settle(working(), at(25 * 60 - 1));
    expect(next.status).toBe("WORKING");
    expect(markBlocks).toBe(false);
  });

  it("moves to break exactly at the work end and marks the blocks", () => {
    const { next, markBlocks } = settle(working(), at(25 * 60));
    expect(next.status).toBe("BREAK");
    expect(next.actualWorkSeconds).toBe(25 * 60);
    expect(next.endedAt).toBeNull();
    expect(markBlocks).toBe(true);
  });

  it("stays in break until the break ends", () => {
    const { next, markBlocks } = settle(working(), at(29 * 60));
    expect(next.status).toBe("BREAK");
    expect(markBlocks).toBe(true);
  });

  it("completes once the break is over", () => {
    const broken = settle(working(), at(26 * 60)).next;
    const { next, markBlocks } = settle(broken, at(30 * 60));
    expect(next.status).toBe("COMPLETED");
    expect(next.endedAt).toEqual(at(30 * 60));
    expect(markBlocks).toBe(false);
  });

  it("crosses both phases for a stale session", () => {
    const { next, markBlocks } = settle(working(), at(5 * 3600));
    expect(next.status).toBe("COMPLETED");
    expect(next.endedAt).toEqual(at(30 * 60));
    expect(markBlocks).toBe(true);
  });

  it("goes straight to completed without a break", () => {
    const { next, markBlocks } = settle(working(25, 0), at(25 * 60));
    expect(next.status).toBe("COMPLETED");
    expect(markBlocks).toBe(true);
  });

  it("never settles a paused session", () => {
    const paused = pause(working(), at(60));
    expect(settle(paused, at(10 * 3600)).next.status).toBe("PAUSED");
  });
});

describe("pause and resume", () => {
  it("shifts both end times and counts the paused seconds", () => {
    const resumed = resume(pause(working(), at(600)), at(900));
    expect(resumed.status).toBe("WORKING");
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.pausedSeconds).toBe(300);
    expect(resumed.workEndsAt).toEqual(at(25 * 60 + 300));
    expect(resumed.breakEndsAt).toEqual(at(30 * 60 + 300));
  });

  it("accumulates over several pauses", () => {
    let s = working();
    s = resume(pause(s, at(60)), at(120));
    s = resume(pause(s, at(200)), at(230));
    expect(s.pausedSeconds).toBe(90);
    expect(s.workEndsAt).toEqual(at(25 * 60 + 90));
  });
});

describe("remainingMs", () => {
  it("counts down to the work end", () => {
    expect(remainingMs(working(), at(60))).toBe(24 * 60 * 1000);
  });

  it("is frozen while paused", () => {
    const paused = pause(working(), at(60));
    expect(remainingMs(paused, at(500))).toBe(24 * 60 * 1000);
  });

  it("counts the break and never goes negative", () => {
    const broken = settle(working(), at(26 * 60)).next;
    expect(remainingMs(broken, at(27 * 60))).toBe(3 * 60 * 1000);
    expect(remainingMs(broken, at(99 * 60))).toBe(0);
  });
});

describe("workedSeconds", () => {
  it("is the elapsed time when never paused", () => {
    expect(workedSeconds(working(), at(600))).toBe(600);
  });

  it("excludes earlier pauses", () => {
    const s = resume(pause(working(), at(300)), at(600));
    expect(workedSeconds(s, at(900))).toBe(600);
  });

  it("stops at the pause moment while paused", () => {
    const s = pause(working(), at(300));
    expect(workedSeconds(s, at(5000))).toBe(300);
  });

  it("is clamped to the planned work", () => {
    expect(workedSeconds(working(), at(5 * 3600))).toBe(25 * 60);
  });
});

describe("meetsCompletion", () => {
  it("needs at least 80% of the planned work", () => {
    expect(meetsCompletion(1199, 25)).toBe(false);
    expect(meetsCompletion(1200, 25)).toBe(true);
    expect(meetsCompletion(1500, 25)).toBe(true);
  });
});

describe("finish, abandon and skipBreak", () => {
  it("finish at 80% completes and marks", () => {
    const { next, markBlocks } = finish(working(), at(1200));
    expect(next.status).toBe("COMPLETED");
    expect(next.actualWorkSeconds).toBe(1200);
    expect(next.endedAt).toEqual(at(1200));
    expect(markBlocks).toBe(true);
    expect(blocksMarked(next)).toBe(true);
  });

  it("finish under 80% completes without marking", () => {
    const { next, markBlocks } = finish(working(), at(1199));
    expect(next.status).toBe("COMPLETED");
    expect(markBlocks).toBe(false);
    expect(blocksMarked(next)).toBe(false);
  });

  it("abandon keeps the worked time and marks nothing", () => {
    const next = abandon(working(), at(1499));
    expect(next.status).toBe("ABANDONED");
    expect(next.actualWorkSeconds).toBe(1499);
    expect(blocksMarked(next)).toBe(false);
  });

  it("skipBreak completes and records the skip", () => {
    const broken = settle(working(), at(26 * 60)).next;
    const next = skipBreak(broken, at(27 * 60));
    expect(next.status).toBe("COMPLETED");
    expect(next.breakSkipped).toBe(true);
    expect(next.endedAt).toEqual(at(27 * 60));
    expect(blocksMarked(next)).toBe(true);
  });
});

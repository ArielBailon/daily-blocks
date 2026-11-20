import type { FixedPresetKey } from "./config";
import type { FocusStatus } from "./session";

// Shared by the API and the client, so it must not import Prisma.
export type FocusSessionDto = {
  id: number;
  status: FocusStatus;
  preset: string;
  blockIds: number[];
  workMinutes: number;
  breakMinutes: number;
  startedAt: string;
  workEndsAt: string;
  breakEndsAt: string;
  pausedAt: string | null;
  breakSkipped: boolean;
  actualWorkSeconds: number;
  endedAt: string | null;
  blocksMarked: boolean;
  serverNow: string;
};

export type CoverageInfo = {
  requested: number;
  covered: number;
  trimmed: boolean;
};

export type FocusAction =
  | "pause"
  | "resume"
  | "finish"
  | "abandon"
  | "skipBreak";

export type StartRequest =
  | { blockId: number; preset: FixedPresetKey }
  | {
      blockId: number;
      preset: "CUSTOM";
      workMinutes: number;
      breakMinutes: number;
    };

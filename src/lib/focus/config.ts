import { BLOCK_MINUTES } from "@/lib/blocks";

export const FOCUS_PRESET_KEYS = ["CLASSIC", "DEEP_2", "DEEP_3", "CUSTOM"] as const;
export type FocusPresetKey = (typeof FOCUS_PRESET_KEYS)[number];

export type FixedPresetKey = Exclude<FocusPresetKey, "CUSTOM">;

export const FIXED_PRESETS: Record<
  FixedPresetKey,
  { label: string; workMinutes: number; breakMinutes: number }
> = {
  CLASSIC: { label: "Clásico", workMinutes: 25, breakMinutes: 5 },
  DEEP_2: { label: "Deep 2 bloques", workMinutes: 50, breakMinutes: 10 },
  DEEP_3: { label: "Deep 3 bloques", workMinutes: 80, breakMinutes: 10 },
};

export const CUSTOM_LIMITS = {
  workMin: 5,
  workMax: 120,
  breakMin: 0,
  breakMax: 30,
} as const;

// Share of the planned work that must be done for the blocks to be marked.
export const COMPLETION_RATIO = 0.8;

// Work plus break, rounded up to whole 30-minute blocks. For the fixed presets
// this gives exactly 1, 2 and 3.
export function blocksCovered(workMinutes: number, breakMinutes: number): number {
  return Math.ceil((workMinutes + breakMinutes) / BLOCK_MINUTES);
}

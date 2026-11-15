// Helpers for preloading a routine preset into a day's blocks. Presets live in
// the database (RoutinePreset); times are "HH:MM" (24h).

import type { BlockTag } from "@/lib/block-tags";

export const DEFAULT_START = "06:30";
export const DEFAULT_END = "23:30";

// Type aliases (not interfaces) so they are assignable to Prisma JSON input.
export type DefaultBlock = {
  activity: string;
  tag: BlockTag | null;
};

export type Routine = ReadonlyMap<string, DefaultBlock>;

export type PresetBlock = DefaultBlock & { startTime: string };

export function presetToRoutine(blocks: PresetBlock[]): Routine {
  return new Map(
    blocks.map(({ startTime, activity, tag }) => [startTime, { activity, tag }])
  );
}

interface ExistingBlock {
  id: number;
  startTime: string;
  activity: string;
  tag: BlockTag | null;
  completed: boolean;
}

// Decides what the routine adds to a day whose blocks must cover `wanted`:
// new blocks get the routine's content, existing blocks are filled only when
// empty (no activity, no tag, not completed). Blocks with content are never
// touched, and nothing is written for times outside `wanted`.
export function planDefaultContent(
  wanted: string[],
  existing: ExistingBlock[],
  routine: Routine
) {
  const byTime = new Map(existing.map((b) => [b.startTime, b]));
  const create: { startTime: string; activity: string; tag: BlockTag | null }[] =
    [];
  const fill: { id: number; activity: string; tag: BlockTag | null }[] = [];

  for (const startTime of wanted) {
    const preset = routine.get(startTime);
    const current = byTime.get(startTime);
    if (!current) {
      create.push({
        startTime,
        activity: preset?.activity ?? "",
        tag: preset?.tag ?? null,
      });
    } else if (
      preset &&
      current.activity === "" &&
      current.tag === null &&
      !current.completed
    ) {
      fill.push({ id: current.id, ...preset });
    }
  }
  return { create, fill };
}

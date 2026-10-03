// The fixed daily routine that "Generar día" preloads into empty blocks.
// A constant in code on purpose: no model, no UI. Times are "HH:MM" (24h).

import type { BlockTag } from "@/lib/block-tags";
import { BLOCK_MINUTES, fromMinutes, toMinutes } from "@/lib/blocks";

export const DEFAULT_START = "06:30";
export const DEFAULT_END = "23:30";

export interface DefaultBlock {
  activity: string;
  tag: BlockTag | null;
}

export type Routine = ReadonlyMap<string, DefaultBlock>;

// One entry fills the blocks from `from` to `to` (both included, 30 minutes
// each); `to` defaults to `from`. Times not listed stay empty.
interface Entry {
  from: string;
  to?: string;
  activity: string;
  tag?: BlockTag;
}

function buildRoutine(entries: Entry[]): Routine {
  const routine = new Map<string, DefaultBlock>();
  for (const { from, to = from, activity, tag } of entries) {
    for (let t = toMinutes(from); t <= toMinutes(to); t += BLOCK_MINUTES) {
      routine.set(fromMinutes(t), { activity, tag: tag ?? null });
    }
  }
  return routine;
}

const MORNING: Entry[] = [
  { from: "06:30", activity: "Wake up" },
  { from: "07:00", to: "07:30", activity: "Morning routine" },
  { from: "08:00", activity: "Breakfast" },
  { from: "08:30", activity: "Supplements / Chill" },
];

const LUNCH: Entry[] = [{ from: "12:30", to: "13:00", activity: "Lunch" }];

const EVENING: Entry[] = [
  { from: "19:00", activity: "Dinner" },
  {
    from: "22:00",
    to: "23:00",
    activity: "Supplements / Reading / Brush Teeth",
  },
  { from: "23:30", activity: "Sleep", tag: "BED" },
];

const WALK_EVENING: Entry[] = [
  { from: "17:00", to: "17:30", activity: "Walk Bonnie", tag: "WALK" },
  { from: "18:00", activity: "Home" },
  { from: "18:30", activity: "Bath routine" },
];

// Mon, Tue, Wed, Fri, Sat.
const NORMAL_ROUTINE = buildRoutine([
  ...MORNING,
  ...LUNCH,
  { from: "14:30", to: "15:30", activity: "Gym", tag: "GYM" },
  { from: "16:30", activity: "Home / Bath routine" },
  { from: "17:00", to: "18:30", activity: "Rest / Reading" },
  ...EVENING,
]);

const THURSDAY_ROUTINE = buildRoutine([
  ...MORNING,
  ...LUNCH,
  ...WALK_EVENING,
  ...EVENING,
]);

const SUNDAY_ROUTINE = buildRoutine([
  ...MORNING,
  { from: "09:30", to: "10:00", activity: "Clean Room" },
  ...LUNCH,
  ...WALK_EVENING,
  ...EVENING,
]);

// `date` is a DailyPlan date: UTC midnight of the calendar day.
export function getDefaultBlocks(date: Date): Routine {
  switch (date.getUTCDay()) {
    case 0:
      return SUNDAY_ROUTINE;
    case 4:
      return THURSDAY_ROUTINE;
    default:
      return NORMAL_ROUTINE;
  }
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

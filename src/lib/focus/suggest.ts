import type { FixedPresetKey } from "./config";

export type SuggestBlock = { activity: string; tag: string | null };

function normalize(activity: string): string {
  return activity.trim().toLowerCase();
}

// DEEP-tagged blocks get Deep 2; otherwise the run of consecutive blocks with
// the same non-empty activity decides. An empty activity never forms a run.
export function suggestPreset(
  blocks: SuggestBlock[],
  index: number
): FixedPresetKey {
  const block = blocks[index];
  if (!block) return "CLASSIC";
  if (block.tag === "DEEP") return "DEEP_2";

  const activity = normalize(block.activity);
  if (activity === "") return "CLASSIC";
  let run = 1;
  while (
    index + run < blocks.length &&
    normalize(blocks[index + run].activity) === activity
  ) {
    run++;
  }
  if (run >= 3) return "DEEP_3";
  return run === 2 ? "DEEP_2" : "CLASSIC";
}

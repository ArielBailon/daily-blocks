import {
  EXERCISES,
  MUSCLE_GROUPS,
  ROUTINE,
  type MuscleKey,
  type MuscleMap,
} from "./seed-data";

export type MuscleVolume = Record<MuscleKey, number>;

function emptyVolume(): MuscleVolume {
  return Object.fromEntries(
    MUSCLE_GROUPS.map((m) => [m.key, 0])
  ) as MuscleVolume;
}

// Direct sets count 1, indirect sets 0.5.
export function weeklyVolume(
  logged: { muscles: MuscleMap; completedSets: number }[]
): MuscleVolume {
  const volume = emptyVolume();
  for (const { muscles, completedSets } of logged) {
    for (const [key, factor] of Object.entries(muscles)) {
      volume[key as MuscleKey] += completedSets * (factor ?? 0);
    }
  }
  return volume;
}

export function plannedVolume(): MuscleVolume {
  const musclesBySlug = new Map(EXERCISES.map((e) => [e.slug, e.muscles]));
  return weeklyVolume(
    ROUTINE.flatMap((day) =>
      day.exercises.map((x) => ({
        muscles: musclesBySlug.get(x.slug) ?? {},
        completedSets: x.sets,
      }))
    )
  );
}

export type VolumeStatus = "below_mev" | "in_mav" | "above_mav";

export function volumeStatus(
  done: number,
  landmark: { mev: number; mavHigh: number }
): VolumeStatus {
  if (done < landmark.mev) return "below_mev";
  if (done > landmark.mavHigh) return "above_mav";
  return "in_mav";
}

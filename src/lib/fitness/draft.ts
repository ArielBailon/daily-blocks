export type DraftSet = { weight: string; reps: string; completed: boolean };

export type PreviousSetLike = {
  setNumber: number;
  weightKg: number;
  reps: number;
};

// Accepts "62,5" as well as "62.5".
export function parseWeight(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseReps(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

export function toPayload(set: DraftSet) {
  return {
    weightKg: parseWeight(set.weight),
    reps: parseReps(set.reps),
    completed: set.completed,
  };
}

export function fromServer(set: {
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}): DraftSet {
  return {
    weight: set.weightKg === null ? "" : String(set.weightKg),
    reps: set.reps === null ? "" : String(set.reps),
    completed: set.completed,
  };
}

// Empty inputs take the same-numbered set of the last session; reps are required to complete.
export function toggleComplete(
  set: DraftSet,
  setNumber: number,
  previous: PreviousSetLike[]
): { set: DraftSet; error: string | null } {
  if (set.completed) return { set: { ...set, completed: false }, error: null };

  const prev = previous.find((p) => p.setNumber === setNumber);
  const next = {
    ...set,
    weight: set.weight.trim() === "" && prev ? String(prev.weightKg) : set.weight,
    reps: set.reps.trim() === "" && prev ? String(prev.reps) : set.reps,
  };

  if (parseReps(next.reps) === null || parseReps(next.reps) === 0) {
    return { set: next, error: "Escribe las repeticiones" };
  }
  if (parseWeight(next.weight) === null) {
    return { set: next, error: "Escribe el peso (0 = peso corporal)" };
  }
  return { set: { ...next, completed: true }, error: null };
}

// A new set copies the weight of the last one, not its reps.
export function addSet(sets: DraftSet[]): DraftSet[] {
  const last = sets[sets.length - 1];
  return [...sets, { weight: last?.weight ?? "", reps: "", completed: false }];
}

export function removeLastSet(sets: DraftSet[]): DraftSet[] {
  return sets.length > 1 ? sets.slice(0, -1) : sets;
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

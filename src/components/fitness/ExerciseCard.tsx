"use client";

import { useState } from "react";
import {
  addSet,
  removeLastSet,
  toggleComplete,
  type DraftSet,
} from "@/lib/fitness/draft";
import { formatSet } from "@/lib/fitness/format";
import type { PreviousSet } from "@/lib/fitness/sessions";

const GRID = "grid grid-cols-[1.75rem_1fr_4.5rem_4rem_2.75rem] items-center gap-2";
const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-muted bg-background px-2 text-center tabular-nums outline-none placeholder:text-foreground/30 focus:border-accent";
const SECONDARY_BUTTON =
  "min-h-11 rounded-lg border border-muted px-4 text-sm transition-colors hover:border-accent";

export type DraftExercise = {
  id: number;
  name: string;
  muscleLabel: string | null;
  target: string;
  note: string | null;
  previous: PreviousSet[];
  sets: DraftSet[];
};

export function ExerciseCard({
  exercise,
  onSetsChange,
  onRemove,
}: {
  exercise: DraftExercise;
  onSetsChange: (sets: DraftSet[]) => void;
  onRemove: () => void;
}) {
  const [hint, setHint] = useState<{ index: number; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { sets, previous } = exercise;
  const done = sets.filter((s) => s.completed).length;

  function update(index: number, patch: Partial<DraftSet>) {
    setHint(null);
    onSetsChange(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggle(index: number) {
    const { set, error } = toggleComplete(sets[index], index + 1, previous);
    setHint(error ? { index, text: error } : null);
    onSetsChange(sets.map((s, i) => (i === index ? set : s)));
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold leading-snug">{exercise.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {exercise.muscleLabel && (
              <span className="rounded-full border border-muted px-2 py-0.5 text-xs text-foreground/70">
                {exercise.muscleLabel}
              </span>
            )}
            <span className="tabular-nums text-foreground/70">
              {exercise.target}
            </span>
          </div>
          {exercise.note && (
            <p className="text-sm text-foreground/60">{exercise.note}</p>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-foreground/60">
          {done}/{sets.length}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        <div
          className={`${GRID} text-xs uppercase tracking-wide text-foreground/50`}
        >
          <span>Set</span>
          <span>Anterior</span>
          <span className="text-center">Kg</span>
          <span className="text-center">Reps</span>
          <span className="text-center">✓</span>
        </div>

        {sets.map((set, i) => {
          const prev = previous.find((p) => p.setNumber === i + 1);
          return (
            <div key={i} className="flex flex-col gap-1">
              <div
                className={`${GRID} rounded-lg ${
                  set.completed ? "bg-status-green/20" : ""
                }`}
              >
                <span className="text-center tabular-nums text-foreground/70">
                  {i + 1}
                </span>
                <span className="truncate text-sm tabular-nums text-foreground/60">
                  {prev ? formatSet(prev.weightKg, prev.reps) : "—"}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`${exercise.name} serie ${i + 1} kg`}
                  placeholder={prev ? String(prev.weightKg) : ""}
                  value={set.weight}
                  onChange={(e) => update(i, { weight: e.target.value })}
                  className={INPUT_CLASS}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${exercise.name} serie ${i + 1} repeticiones`}
                  placeholder={prev ? String(prev.reps) : ""}
                  value={set.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={set.completed}
                  aria-label={`${exercise.name} serie ${i + 1} completada`}
                  onClick={() => toggle(i)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg ${
                    set.completed
                      ? "border-status-green bg-status-green text-accent-foreground"
                      : "border-muted text-foreground/30"
                  }`}
                >
                  ✓
                </button>
              </div>
              {hint?.index === i && (
                <p role="alert" className="pl-9 text-xs text-status-red">
                  {hint.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSetsChange(addSet(sets))}
          className={SECONDARY_BUTTON}
        >
          Añadir serie
        </button>
        <button
          type="button"
          disabled={sets.length <= 1}
          onClick={() => onSetsChange(removeLastSet(sets))}
          aria-label="Quitar la última serie"
          className={`${SECONDARY_BUTTON} disabled:opacity-40`}
        >
          −1
        </button>
        <div className="ml-auto">
          {confirmRemove ? (
            <span className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={onRemove}
                className="min-h-11 rounded-lg bg-status-red px-4 font-semibold text-accent-foreground"
              >
                Quitar
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className={SECONDARY_BUTTON}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="min-h-11 px-2 text-sm text-foreground/60 underline underline-offset-4 hover:text-foreground"
            >
              Quitar ejercicio
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

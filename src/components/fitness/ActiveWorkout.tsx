"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fromServer,
  toPayload,
  type DraftSet,
} from "@/lib/fitness/draft";
import { formatDateLong } from "@/lib/fitness/format";
import { MUSCLE_GROUPS } from "@/lib/fitness/seed-data";
import type { SessionDto } from "@/lib/fitness/sessions";
import { AddExerciseSheet, type CatalogExercise } from "./AddExerciseSheet";
import { Checklist } from "./Checklist";
import { ExerciseCard, type DraftExercise } from "./ExerciseCard";
import { useSessionAutosave } from "./useSessionAutosave";

const MUSCLE_LABELS = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.key, m.label])
);

function toDraft(e: SessionDto["exercises"][number]): DraftExercise {
  return {
    id: e.id,
    name: e.name,
    muscleLabel: e.primaryMuscle ? MUSCLE_LABELS[e.primaryMuscle] : null,
    target: e.target,
    note: e.note,
    previous: e.previous,
    sets: e.sets.map(fromServer),
  };
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Computed from startedAt, so it survives reloads and a session started on another device.
function useElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now === null ? "00:00" : formatElapsed(now - start);
}

const SECONDARY_BUTTON =
  "min-h-11 rounded-lg border border-muted px-5 transition-colors hover:border-accent disabled:opacity-50";

export function ActiveWorkout({
  initial,
  catalog,
}: {
  initial: SessionDto;
  catalog: CatalogExercise[];
}) {
  const router = useRouter();
  const autosave = useSessionAutosave(initial.id);
  const { queue, flush, structural, dropExercise } = autosave;
  const elapsed = useElapsed(initial.startedAt);

  const [exercises, setExercises] = useState(() => initial.exercises.map(toDraft));
  const [warmupChecked, setWarmupChecked] = useState(initial.warmupChecked);
  const [cooldownChecked, setCooldownChecked] = useState(initial.cooldownChecked);
  const [cardioDone, setCardioDone] = useState(initial.cardioDone);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [working, setWorking] = useState(false);

  const allSets = exercises.flatMap((e) => e.sets);
  const doneSets = allSets.filter((s) => s.completed).length;

  function changeSets(exerciseId: number, sets: DraftSet[]) {
    setExercises((prev) =>
      prev.map((e) => (e.id === exerciseId ? { ...e, sets } : e))
    );
    queue({ exercises: { [exerciseId]: sets.map(toPayload) } });
  }

  function changeWarmup(next: number[]) {
    setWarmupChecked(next);
    queue({ warmupChecked: next });
  }

  function changeCooldown(next: number[]) {
    setCooldownChecked(next);
    queue({ cooldownChecked: next });
  }

  function changeCardio(next: boolean) {
    setCardioDone(next);
    queue({ cardioDone: next });
  }

  async function removeExercise(exerciseId: number) {
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    dropExercise(exerciseId);
    await structural({ removeExercise: { id: exerciseId } });
  }

  async function addExercise(exerciseId: number) {
    setAdding(true);
    const known = new Set(exercises.map((e) => e.id));
    const session = await structural({ addExercise: { exerciseId } });
    setAdding(false);
    if (!session) return;
    // Only the new exercise is taken from the response, so in-flight edits are not overwritten.
    const created = (session.exercises ?? []).filter((e) => !known.has(e.id));
    setExercises((prev) => [...prev, ...created.map(toDraft)]);
    setSheetOpen(false);
  }

  async function finish() {
    setActionError(null);
    if (doneSets === 0) {
      setActionError("Completa al menos una serie para terminar.");
      return;
    }
    setWorking(true);
    try {
      if (!(await flush())) {
        setActionError("No se pudo guardar la sesión. Reintenta.");
        return;
      }
      const res = await fetch(`/api/fitness/sessions/${initial.id}/finish`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionError(body?.error ?? "Error al terminar la sesión");
        return;
      }
      router.push("/fitness");
      router.refresh();
    } catch {
      setActionError("Error al terminar la sesión");
    } finally {
      setWorking(false);
    }
  }

  async function discard() {
    setActionError(null);
    setWorking(true);
    try {
      const res = await fetch(`/api/fitness/sessions/${initial.id}/discard`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionError(body?.error ?? "Error al descartar la sesión");
        return;
      }
      router.refresh();
    } catch {
      setActionError("Error al descartar la sesión");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-muted bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-foreground/60 first-letter:uppercase">
              {formatDateLong(initial.date)}
            </p>
            <h1 className="truncate text-xl font-bold">{initial.name}</h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-semibold tabular-nums">{elapsed}</p>
            <p className="text-xs tabular-nums text-foreground/60">
              {doneSets}/{allSets.length} series
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl">
          {autosave.error ? (
            <p role="alert" className="mt-1 text-xs text-status-red">
              {autosave.error}
            </p>
          ) : (
            <p aria-live="polite" className="mt-1 h-4 text-xs text-foreground/40">
              {autosave.status === "saving" ? "Guardando…" : ""}
            </p>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <Checklist
            title="Calentamiento"
            items={initial.warmup}
            checked={warmupChecked}
            onChange={changeWarmup}
          />

          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSetsChange={(sets) => changeSets(exercise.id, sets)}
              onRemove={() => removeExercise(exercise.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="min-h-12 rounded-xl border border-dashed border-muted px-4 transition-colors hover:border-accent"
          >
            + Añadir ejercicio
          </button>

          <Checklist
            title="Vuelta a la calma"
            items={initial.cooldown}
            checked={cooldownChecked}
            onChange={changeCooldown}
          />

          <section className="rounded-xl border border-muted bg-surface p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Cardio post-sesión
            </h2>
            <button
              type="button"
              role="checkbox"
              aria-checked={cardioDone}
              onClick={() => changeCardio(!cardioDone)}
              className="flex min-h-11 w-full items-center gap-3 py-1 text-left"
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                  cardioDone
                    ? "border-status-green bg-status-green text-accent-foreground"
                    : "border-muted"
                }`}
              >
                {cardioDone && "✓"}
              </span>
              <span className={cardioDone ? "text-foreground/50 line-through" : ""}>
                20 min de caminata inclinada en zona 2
              </span>
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
            {actionError && (
              <p role="alert" className="text-sm text-status-red">
                {actionError}
              </p>
            )}
            {confirmDiscard ? (
              <div className="flex flex-col gap-3">
                <p>¿Descartar esta sesión? Se perderán todas las series.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={working}
                    onClick={discard}
                    className="min-h-11 rounded-lg bg-status-red px-5 font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    Sí, descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className={SECONDARY_BUTTON}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={working}
                  onClick={finish}
                  className="min-h-12 flex-1 rounded-lg bg-accent px-5 font-semibold text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
                >
                  Terminar sesión
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setConfirmDiscard(true)}
                  className={`${SECONDARY_BUTTON} min-h-12`}
                >
                  Descartar
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <AddExerciseSheet
        open={sheetOpen}
        catalog={catalog}
        busy={adding}
        onPick={addExercise}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

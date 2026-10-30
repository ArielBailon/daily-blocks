"use client";

import { useState } from "react";
import type { BodyWeightDto, GoalDto } from "@/lib/fitness/body";
import { formatDateLong, formatKg } from "@/lib/fitness/format";
import {
  DEFAULT_CURRENT_KG,
  goalProgress,
  kgToGoal,
  projectArrival,
} from "@/lib/fitness/weight";
import { Sparkline } from "./Sparkline";

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-muted bg-background px-3 py-2 tabular-nums outline-none focus:border-accent";
const LABEL_CLASS = "text-xs uppercase tracking-wide text-foreground/60";

const GOAL_FIELDS = [
  { key: "startKg", label: "Peso inicial (kg)" },
  { key: "goalLowKg", label: "Meta baja (kg)" },
  { key: "goalHighKg", label: "Meta alta (kg)" },
  { key: "targetRateKgPerWeek", label: "Ritmo (kg/semana)" },
] as const;

// Accepts "75,5" as well as "75.5".
function parseNumber(raw: string): number | null {
  const value = Number(raw.trim().replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(value) ? value : null;
}

export function WeightCard({
  initialEntries,
  initialGoal,
  todayKey,
}: {
  initialEntries: BodyWeightDto[];
  initialGoal: GoalDto;
  todayKey: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [goal, setGoal] = useState(initialGoal);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);

  const currentKg = entries.length
    ? entries[entries.length - 1].kg
    : DEFAULT_CURRENT_KG;
  const toGo = kgToGoal(currentKg, goal);
  const progress = goalProgress(currentKg, goal);
  const arrival = projectArrival(currentKg, goal, todayKey);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseNumber(input);
    if (kg === null) {
      setError("Escribe tu peso en kg");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness/bodyweight", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kg }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Error al guardar el peso");
        return;
      }
      setEntries((prev) => [
        ...prev.filter((p) => p.date !== body.date),
        body,
      ]);
      setInput("");
    } catch {
      setError("Error al guardar el peso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-muted bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            Peso
          </h2>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {formatKg(currentKg)}
          </p>
          {entries.length === 0 && (
            <p className="text-xs text-foreground/50">
              Aún sin registros, valor de partida.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={LABEL_CLASS}>Meta</p>
          <p className="font-semibold tabular-nums">
            {goal.goalLowKg}–{goal.goalHighKg} kg
          </p>
          <p className="text-sm text-foreground/70 tabular-nums">
            {toGo > 0 ? `Faltan ${toGo} kg` : "Meta alcanzada"}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Progreso hacia la meta"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="flex flex-col gap-1"
      >
        <svg
          aria-hidden="true"
          className="h-2 w-full overflow-hidden rounded-full"
        >
          <rect width="100%" height="100%" className="fill-muted" />
          <rect
            width={`${Math.round(progress * 100)}%`}
            height="100%"
            className="fill-accent"
          />
        </svg>
        <div className="flex justify-between text-xs text-foreground/50 tabular-nums">
          <span>{goal.startKg} kg</span>
          <span>{goal.goalLowKg}–{goal.goalHighKg} kg</span>
        </div>
      </div>

      {arrival && (
        <p className="text-sm text-foreground/70">
          {arrival.weeks === 0
            ? "Ya estás en el punto medio de tu meta."
            : `Sin fecha fija. A ${goal.targetRateKgPerWeek} kg/semana te faltan ~${arrival.weeks} semanas, llegada estimada ${formatDateLong(arrival.arrivalDate)}.`}
        </p>
      )}

      <form onSubmit={register} className="flex flex-col gap-1">
        <label htmlFor="weight-today" className={LABEL_CLASS}>
          Peso en ayunas hoy (kg)
        </label>
        <div className="flex gap-2">
          <input
            id="weight-today"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="75.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 shrink-0 rounded-lg bg-accent px-5 font-semibold text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
          >
            {saving ? "Guardando" : "Registrar"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-status-red">
            {error}
          </p>
        )}
      </form>

      <Sparkline
        values={entries.map((e) => e.kg)}
        label={`Peso de los últimos ${entries.length} registros`}
      />

      <div className="border-t border-muted pt-3">
        {editingGoal ? (
          <GoalForm
            goal={goal}
            onSaved={(next) => {
              setGoal(next);
              setEditingGoal(false);
            }}
            onCancel={() => setEditingGoal(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingGoal(true)}
            className="min-h-11 text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground"
          >
            Editar meta
          </button>
        )}
      </div>
    </section>
  );
}

function GoalForm({
  goal,
  onSaved,
  onCancel,
}: {
  goal: GoalDto;
  onSaved: (goal: GoalDto) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(GOAL_FIELDS.map((f) => [f.key, String(goal[f.key])]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, number> = {};
    for (const { key, label } of GOAL_FIELDS) {
      const n = parseNumber(values[key]);
      if (n === null) {
        setError(`${label}: escribe un número`);
        return;
      }
      payload[key] = n;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness/goal", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Error al guardar la meta");
        return;
      }
      onSaved(body);
    } catch {
      setError("Error al guardar la meta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {GOAL_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={`goal-${key}`} className={LABEL_CLASS}>
              {label}
            </label>
            <input
              id={`goal-${key}`}
              type="text"
              inputMode="decimal"
              value={values[key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className={FIELD_CLASS}
            />
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-red">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
        >
          Guardar meta
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-muted px-5 transition-colors hover:border-accent"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

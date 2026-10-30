"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Day = { key: string; label: string; subtitle: string; dayOfWeek: number };

const WEEKDAY_SHORT = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function QuickStart({
  days,
  todayWeekday,
  active,
}: {
  days: Day[];
  todayWeekday: number;
  active: { id: number; name: string } | null;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(key: string) {
    setStarting(key);
    setError(null);
    try {
      const res = await fetch("/api/fitness/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ routineDayKey: key }),
      });
      if (res.ok || res.status === 409) {
        // A 409 means a session is already running: continue it instead.
        router.push("/fitness/workout");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Error al crear la sesión");
    } catch {
      setError("Error al crear la sesión");
    } finally {
      setStarting(null);
    }
  }

  const byWeekday = new Map(days.map((d) => [d.dayOfWeek, d]));

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Inicio rápido
      </h2>

      {active && (
        <Link
          href="/fitness/workout"
          className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground transition-colors hover:bg-accent/85"
        >
          <span>Continuar {active.name}</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((weekday) => {
          const day = byWeekday.get(weekday);
          const isToday = weekday === todayWeekday;
          if (!day) {
            return (
              <li
                key={weekday}
                className="flex min-h-14 flex-col justify-center rounded-lg border border-dashed border-muted px-4 py-2 text-foreground/50"
              >
                <span className="font-semibold">
                  {WEEKDAY_SHORT[weekday]} · Descanso
                </span>
                <span className="text-sm">Paseo de ~60 min con mi perra</span>
              </li>
            );
          }
          const classes = `flex min-h-14 w-full flex-col justify-center rounded-lg border px-4 py-2 text-left transition-colors ${
            isToday
              ? "border-accent bg-accent/10"
              : "border-muted hover:border-accent"
          }`;
          const content = (
            <>
              <span className="font-semibold">
                {day.label}
                {isToday && (
                  <span className="ml-2 text-xs font-normal text-accent">
                    Hoy
                  </span>
                )}
              </span>
              <span className="text-sm text-foreground/60">{day.subtitle}</span>
            </>
          );
          return (
            <li key={weekday}>
              {active ? (
                <Link href="/fitness/workout" className={classes}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={starting !== null}
                  onClick={() => start(day.key)}
                  className={`${classes} disabled:opacity-50`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-status-red">
          {error}
        </p>
      )}
    </section>
  );
}

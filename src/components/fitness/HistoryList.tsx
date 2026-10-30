"use client";

import { useState } from "react";
import { formatDateLong, formatSet } from "@/lib/fitness/format";
import type { HistorySession } from "@/lib/fitness/history";
import { TrophyIcon } from "./TrophyIcon";

export function HistoryList({
  initialSessions,
  initialCursor,
}: {
  initialSessions: HistorySession[];
  initialCursor: number | null;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (cursor === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitness/sessions?cursor=${cursor}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Error al cargar el historial");
        return;
      }
      setSessions((prev) => [...prev, ...body.sessions]);
      setCursor(body.nextCursor);
    } catch {
      setError("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="text-foreground/60">
        Aún no has terminado ninguna sesión. Cuando lo hagas, aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onDeleted={() =>
              setSessions((prev) => prev.filter((s) => s.id !== session.id))
            }
          />
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-status-red">
          {error}
        </p>
      )}
      {cursor !== null && (
        <button
          type="button"
          disabled={loading}
          onClick={loadMore}
          className="min-h-12 rounded-lg border border-muted px-5 transition-colors hover:border-accent disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onDeleted,
}: {
  session: HistorySession;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitness/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Error al eliminar la sesión");
        return;
      }
      onDeleted();
    } catch {
      setError("Error al eliminar la sesión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{session.name}</h2>
        <p className="text-sm text-foreground/60 first-letter:uppercase">
          {formatDateLong(session.date)}
        </p>
        <p className="text-sm tabular-nums text-foreground/60">
          {session.durationMin !== null && `${session.durationMin} min · `}
          {session.totalSets} series
        </p>
      </header>

      <ul className="flex flex-wrap gap-2">
        {session.exercises
          .filter((e) => e.bestWeight !== null && e.bestReps !== null)
          .map((e, i) => (
            <li
              key={i}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm tabular-nums ${
                e.isPR
                  ? "bg-pr-gold font-semibold text-accent-foreground"
                  : "border border-muted text-foreground/80"
              }`}
            >
              {e.isPR && <TrophyIcon />}
              <span className="sr-only">{e.isPR ? "Marca personal: " : ""}</span>
              {e.name} · {formatSet(e.bestWeight!, e.bestReps!)}
            </li>
          ))}
      </ul>

      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
          Ver series
        </summary>
        <div className="flex flex-col gap-3 pt-2">
          {session.exercises.map((e, i) => (
            <div key={i}>
              <p className="text-sm font-semibold">{e.name}</p>
              <p className="text-sm tabular-nums text-foreground/70">
                {e.sets.map((s) => formatSet(s.weightKg, s.reps)).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </details>

      <div className="border-t border-muted pt-3">
        {error && (
          <p role="alert" className="mb-2 text-sm text-status-red">
            {error}
          </p>
        )}
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              ¿Eliminar esta sesión? Se pierden sus series y marcas.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={remove}
                className="min-h-11 rounded-lg bg-status-red px-5 font-semibold text-accent-foreground disabled:opacity-50"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-11 rounded-lg border border-muted px-5 transition-colors hover:border-accent"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-11 text-sm text-foreground/60 underline underline-offset-4 hover:text-foreground"
          >
            Eliminar sesión
          </button>
        )}
      </div>
    </li>
  );
}

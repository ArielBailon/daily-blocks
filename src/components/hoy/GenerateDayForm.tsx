"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FIELD_CLASS =
  "rounded-lg border border-muted bg-surface px-3 py-2 tabular-nums outline-none focus:border-accent";

export function GenerateDayForm({
  dateKey,
  initialStart,
  initialEnd,
}: {
  dateKey: string;
  initialStart: string;
  initialEnd: string;
}) {
  const router = useRouter();
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function generate(confirmRemoval: boolean): Promise<void> {
    const res = await fetch(`/api/days/${dateKey}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startTime, endTime, confirmRemoval }),
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    const message: string = body?.error ?? "Error al generar el día";
    if (res.status === 409 && body?.needsConfirmation && !confirmRemoval) {
      if (window.confirm(`${message} ¿Borrarlos?`)) {
        return generate(true);
      }
      return;
    }
    showError(message);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await generate(false);
    } catch {
      showError("Error al generar el día");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="day-start"
            className="text-xs uppercase tracking-wide text-foreground/60"
          >
            Inicio
          </label>
          <input
            id="day-start"
            type="time"
            step={1800}
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="day-end"
            className="text-xs uppercase tracking-wide text-foreground/60"
          >
            Fin
          </label>
          <input
            id="day-end"
            type="time"
            step={1800}
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
        >
          {pending ? "Generando…" : "Generar día"}
        </button>
      </div>
      {error && (
        <p
          ref={errorRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="text-sm text-accent outline-none"
        >
          {error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";

export function DailyTaskItem({
  id,
  title,
  suggestedTime,
  initialCompleted,
}: {
  id: number;
  title: string;
  suggestedTime: string | null;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    const previous = completed;
    setCompleted(next);
    setPending(true);

    try {
      const res = await fetch(`/api/daily-tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setCompleted(previous);
        const message = body?.error ?? "Error al guardar la tarea";
        setError(
          res.status === 409
            ? `${message} Recarga la página para ver el plan de hoy.`
            : message
        );
        return;
      }
      setError(null);
    } catch {
      setCompleted(previous);
      setError("Error al guardar la tarea");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={completed}
          disabled={pending}
          onChange={(e) => handleChange(e.target.checked)}
          className="accent-accent"
        />
        <span
          className={`flex-1 ${
            completed ? "text-foreground/50 line-through" : ""
          }`}
        >
          {title}
        </span>
        {suggestedTime && (
          <span className="text-sm text-foreground/70">{suggestedTime}</span>
        )}
      </label>
      {error && (
        <p role="alert" className="pl-7 text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

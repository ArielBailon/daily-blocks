"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function errorMessage(status: number, message: string) {
    return status === 409
      ? `${message} Recarga la página para ver el plan de hoy.`
      : message;
  }

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
        setError(
          errorMessage(res.status, body?.error ?? "Error al guardar la tarea")
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

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${title}" del plan de hoy?`)) {
      return;
    }
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/daily-tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          errorMessage(res.status, body?.error ?? "Error al eliminar la tarea")
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Error al eliminar la tarea");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <label className="flex flex-1 items-center gap-3">
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`Eliminar "${title}"`}
          className="px-2 py-1 text-sm text-foreground/70 hover:text-accent disabled:opacity-30"
        >
          ✕
        </button>
      </div>
      {error && (
        <p role="alert" className="pl-7 text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

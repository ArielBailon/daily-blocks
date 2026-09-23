"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AddDailyTaskForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [suggestedTime, setSuggestedTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, suggestedTime }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error ?? "Error al añadir la tarea";
        setError(
          res.status === 409
            ? `${message} Recarga la página para ver el plan de hoy.`
            : message
        );
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      setTitle("");
      setSuggestedTime("");
      router.refresh();
      requestAnimationFrame(() => titleRef.current?.focus());
    } catch {
      setError("Error al añadir la tarea");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="new-task-title" className="text-xs text-foreground/70">
            Nueva tarea
          </label>
          <input
            ref={titleRef}
            id="new-task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-b border-muted bg-transparent py-1 outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-task-time" className="text-xs text-foreground/70">
            Hora
          </label>
          <input
            id="new-task-time"
            type="time"
            value={suggestedTime}
            onChange={(e) => setSuggestedTime(e.target.value)}
            className="border-b border-muted bg-transparent py-1 outline-none focus:border-accent"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-accent px-4 py-2 text-sm text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
      >
        {pending ? "Añadiendo…" : "Añadir"}
      </button>
    </form>
  );
}

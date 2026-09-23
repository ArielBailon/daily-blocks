"use client";

import { useRef, useState } from "react";

const MAX_TASKS = 50;

export function MiscTasksPanel({
  dateKey,
  initialTasks,
}: {
  dateKey: string;
  initialTasks: string[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Saves run one at a time; only the latest list waits behind the one in flight.
  const confirmed = useRef(initialTasks);
  const queued = useRef<string[] | null>(null);
  const inFlight = useRef(false);
  // Escape discards the draft; the blur that follows must not add it back.
  const discardOnBlur = useRef(false);

  async function send(list: string[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/days/${dateKey}/misc-tasks`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tasks: list }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message: string = body?.error ?? "Error al guardar las tareas";
        setError(res.status === 409 ? `${message} Recarga la página.` : message);
        return false;
      }
      confirmed.current = body.tasks;
      setError(null);
      return true;
    } catch {
      setError("Error al guardar las tareas");
      return false;
    }
  }

  async function save(list: string[]) {
    queued.current = list;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (queued.current) {
        const next = queued.current;
        queued.current = null;
        const ok = await send(next);
        if (!ok && !queued.current) {
          setTasks(confirmed.current);
        }
      }
    } finally {
      inFlight.current = false;
    }
  }

  function update(list: string[]) {
    setTasks(list);
    save(list);
  }

  function addDraft() {
    const text = draft.trim();
    if (text === "") return;
    if (tasks.length >= MAX_TASKS) {
      setError(`Máximo ${MAX_TASKS} tareas`);
      return;
    }
    update([...tasks, text]);
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Escape") {
      discardOnBlur.current = true;
      setDraft("");
      setAdding(false);
    }
  }

  function handleBlur() {
    if (!discardOnBlur.current) addDraft();
    discardOnBlur.current = false;
    setAdding(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Tareas varias
      </h2>

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {tasks.map((task, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="min-w-0 flex-1 break-words py-1">{task}</span>
              <button
                type="button"
                onClick={() => update(tasks.filter((_, i) => i !== index))}
                aria-label={`Quitar "${task}"`}
                className="px-2 py-1 text-sm text-foreground/70 transition-colors hover:text-accent"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <input
          type="text"
          maxLength={200}
          autoFocus
          value={draft}
          aria-label="Nueva tarea"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="rounded-lg border border-muted bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            discardOnBlur.current = false;
            setAdding(true);
          }}
          disabled={tasks.length >= MAX_TASKS}
          className="rounded-lg border border-muted px-3 py-2 text-sm transition-colors enabled:hover:border-accent disabled:opacity-50"
        >
          + Añadir tarea
        </button>
      )}

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
    </section>
  );
}

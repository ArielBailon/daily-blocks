"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TaskRow = { title: string; suggestedTime: string };

type TemplateFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      templateId: number;
      initialName: string;
      initialTasks: TaskRow[];
      initialWeekdays: number[];
      initialIsDefault: boolean;
    };

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function emptyTask(): TaskRow {
  return { title: "", suggestedTime: "" };
}

export function TemplateForm(props: TemplateFormProps) {
  const router = useRouter();
  const [name, setName] = useState(
    props.mode === "edit" ? props.initialName : ""
  );
  const [tasks, setTasks] = useState<TaskRow[]>(
    props.mode === "edit" && props.initialTasks.length > 0
      ? props.initialTasks
      : [emptyTask()]
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    props.mode === "edit" ? props.initialWeekdays : []
  );
  const [isDefault, setIsDefault] = useState(
    props.mode === "edit" ? props.initialIsDefault : false
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function toggleWeekday(value: number) {
    setWeekdays((days) =>
      days.includes(value)
        ? days.filter((day) => day !== value)
        : [...days, value]
    );
  }

  function updateTask(index: number, patch: Partial<TaskRow>) {
    setTasks((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removeTask(index: number) {
    setTasks((rows) => rows.filter((_, i) => i !== index));
  }

  function moveTask(index: number, direction: -1 | 1) {
    setTasks((rows) => {
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const body = {
      name,
      tasks: tasks
        .filter((task) => task.title.trim().length > 0)
        .map((task) => ({
          title: task.title,
          suggestedTime: task.suggestedTime,
        })),
      recurrence: weekdays,
      isDefault,
    };

    try {
      const res = await fetch(
        props.mode === "create"
          ? "/api/templates"
          : `/api/templates/${props.templateId}`,
        {
          method: props.mode === "create" ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const responseBody = await res.json().catch(() => null);
        setError(responseBody?.error ?? "Error al guardar la plantilla");
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      router.push("/plantillas");
      router.refresh();
    } catch {
      setError("Error al guardar la plantilla");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16"
    >
      <h1 className="text-2xl font-semibold">
        {props.mode === "create" ? "Nueva plantilla" : "Editar plantilla"}
      </h1>

      {error && (
        <p
          ref={errorRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="text-accent outline-none"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="template-name" className="text-sm text-foreground/70">
          Nombre
        </label>
        <input
          id="template-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-b border-muted bg-transparent py-1 outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground/70">Días de la semana</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const selected = weekdays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleWeekday(day.value)}
                className={`rounded border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "border-accent bg-accent text-background hover:bg-accent/85"
                    : "border-muted text-foreground/70 hover:border-accent hover:text-accent"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="accent-accent"
        />
        Plantilla predeterminada
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm text-foreground/70">Tareas</span>
        {tasks.map((task, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label
                htmlFor={`task-title-${index}`}
                className="text-xs text-foreground/70"
              >
                Título
              </label>
              <input
                id={`task-title-${index}`}
                type="text"
                required
                value={task.title}
                onChange={(e) => updateTask(index, { title: e.target.value })}
                className="border-b border-muted bg-transparent py-1 outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`task-time-${index}`}
                className="text-xs text-foreground/70"
              >
                Hora
              </label>
              <input
                id={`task-time-${index}`}
                type="time"
                value={task.suggestedTime}
                onChange={(e) =>
                  updateTask(index, { suggestedTime: e.target.value })
                }
                className="border-b border-muted bg-transparent py-1 outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-1 pb-1 text-sm text-foreground/70">
              <button
                type="button"
                onClick={() => moveTask(index, -1)}
                disabled={index === 0}
                aria-label="Subir tarea"
                className="transition-colors enabled:hover:text-accent disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveTask(index, 1)}
                disabled={index === tasks.length - 1}
                aria-label="Bajar tarea"
                className="transition-colors enabled:hover:text-accent disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeTask(index)}
                aria-label="Eliminar tarea"
                className="transition-colors hover:text-accent"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTasks((rows) => [...rows, emptyTask()])}
          className="self-start text-sm text-accent underline-offset-4 hover:underline"
        >
          Añadir tarea
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-accent px-4 py-2 text-background transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

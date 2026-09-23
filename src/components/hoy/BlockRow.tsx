"use client";

import { useEffect, useRef, useState } from "react";
import { isOnTheHour } from "@/lib/blocks";

const SAVE_DELAY_MS = 600;

type BlockFields = { activity?: string; completed?: boolean };

export function BlockRow({
  dateKey,
  id,
  startTime,
  initialActivity,
  initialCompleted,
  canComplete,
}: {
  dateKey: string;
  id: number;
  startTime: string;
  initialActivity: string;
  initialCompleted: boolean;
  canComplete: boolean;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/days/${dateKey}/blocks/${id}`;
  // Saves for one block run one at a time so a slow response can't overwrite a newer value.
  const pending = useRef<BlockFields>({});
  const inFlight = useRef(false);
  const confirmed = useRef({
    activity: initialActivity,
    completed: initialCompleted,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestActivity = useRef(initialActivity);

  async function send(fields: BlockFields): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message: string = body?.error ?? "Error al guardar el bloque";
        setError(
          res.status === 404 || res.status === 409
            ? `${message} Recarga la página.`
            : message
        );
        return false;
      }
      confirmed.current = {
        activity: body.activity,
        completed: body.completed,
      };
      setError(null);
      return true;
    } catch {
      setError("Error al guardar el bloque");
      return false;
    }
  }

  async function save(fields: BlockFields) {
    pending.current = { ...pending.current, ...fields };
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (Object.keys(pending.current).length > 0) {
        const batch = pending.current;
        pending.current = {};
        const ok = await send(batch);
        if (!ok && batch.completed !== undefined) {
          setCompleted(confirmed.current.completed);
        }
      }
    } finally {
      inFlight.current = false;
    }
  }

  function cancelTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function handleActivityChange(value: string) {
    setActivity(value);
    latestActivity.current = value;
    cancelTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      save({ activity: value });
    }, SAVE_DELAY_MS);
  }

  function handleActivityBlur() {
    cancelTimer();
    if (activity.trim() !== confirmed.current.activity) {
      save({ activity });
    }
  }

  function handleCompletedChange(next: boolean) {
    setCompleted(next);
    save({ completed: next });
  }

  // Flush a save still waiting on the typing pause when the row goes away.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        fetch(url, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ activity: latestActivity.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [url]);

  return (
    <li className="border-b border-muted last:border-b-0">
      <div className="flex focus-within:ring-1 focus-within:ring-inset focus-within:ring-accent/40">
        <span
          className={`w-20 shrink-0 border-r border-muted px-3 py-3 text-right text-sm tabular-nums ${
            isOnTheHour(startTime)
              ? "font-semibold text-foreground"
              : "text-foreground/60"
          }`}
        >
          {startTime}
        </span>
        <input
          type="text"
          maxLength={200}
          value={activity}
          aria-label={`Actividad ${startTime}`}
          onChange={(e) => handleActivityChange(e.target.value)}
          onBlur={handleActivityBlur}
          className={`min-h-12 min-w-0 flex-1 bg-transparent px-3 py-3 outline-none ${
            completed ? "text-foreground/50 line-through" : ""
          }`}
        />
        <label
          className={`flex h-12 w-12 shrink-0 items-center justify-center ${
            canComplete ? "cursor-pointer" : "cursor-not-allowed"
          }`}
        >
          <input
            type="checkbox"
            checked={completed}
            aria-label={`Completado ${startTime}`}
            disabled={!canComplete}
            onChange={(e) => handleCompletedChange(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-2 pl-23 text-xs text-accent">
          {error}
        </p>
      )}
    </li>
  );
}

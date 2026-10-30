"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionDto } from "@/lib/fitness/sessions";

const SAVE_DELAY_MS = 600;

export type SetPayload = {
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
};

type Pending = {
  warmupChecked?: number[];
  cooldownChecked?: number[];
  exercises?: Record<number, SetPayload[]>;
};

type SaveResponse = { exercises?: SessionDto["exercises"] };

export type SaveStatus = "idle" | "saving" | "error";

function toBody(pending: Pending) {
  return {
    ...(pending.warmupChecked && { warmupChecked: pending.warmupChecked }),
    ...(pending.cooldownChecked && { cooldownChecked: pending.cooldownChecked }),
    ...(pending.exercises && {
      exercises: Object.entries(pending.exercises).map(([id, sets]) => ({
        id: Number(id),
        sets,
      })),
    }),
  };
}

const isEmpty = (p: Pending) =>
  !p.warmupChecked && !p.cooldownChecked && !p.exercises;

// Debounced, strictly serialized saves for one workout session: a slow response
// can never overwrite a newer one, and a failed batch is retried with the next change.
export function useSessionAutosave(sessionId: number) {
  const url = `/api/fitness/sessions/${sessionId}`;
  const pending = useRef<Pending>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runner = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (body: object): Promise<SaveResponse | null> => {
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message: string = data?.error ?? "Error al guardar la sesión";
          setError(
            res.status === 404 || res.status === 409
              ? `${message} Recarga la página.`
              : message
          );
          return null;
        }
        setError(null);
        return data;
      } catch {
        setError("Sin conexión. Los cambios se guardarán al reintentar.");
        return null;
      }
    },
    [url]
  );

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!runner.current) {
      runner.current = (async () => {
        let ok = true;
        try {
          while (!isEmpty(pending.current)) {
            const batch = pending.current;
            pending.current = {};
            setStatus("saving");
            if ((await send(toBody(batch))) === null) {
              // Keep the failed values unless newer ones arrived meanwhile.
              pending.current = {
                ...batch,
                ...pending.current,
                exercises: { ...batch.exercises, ...pending.current.exercises },
              };
              if (Object.keys(pending.current.exercises ?? {}).length === 0) {
                delete pending.current.exercises;
              }
              ok = false;
              break;
            }
          }
        } finally {
          runner.current = null;
        }
        setStatus(ok ? "idle" : "error");
        return ok;
      })();
    }
    return runner.current;
  }, [send]);

  const queue = useCallback(
    (change: Pending) => {
      pending.current = {
        ...pending.current,
        ...change,
        exercises: { ...pending.current.exercises, ...change.exercises },
      };
      if (Object.keys(pending.current.exercises ?? {}).length === 0) {
        delete pending.current.exercises;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, SAVE_DELAY_MS);
    },
    [flush]
  );

  const dropExercise = useCallback((id: number) => {
    if (pending.current.exercises) {
      delete pending.current.exercises[id];
      if (Object.keys(pending.current.exercises).length === 0) {
        delete pending.current.exercises;
      }
    }
  }, []);

  // Structural changes need the new ids back, so they wait for pending edits first.
  const structural = useCallback(
    async (body: object): Promise<SaveResponse | null> => {
      if (!(await flush())) return null;
      setStatus("saving");
      const result = await send(body);
      setStatus(result ? "idle" : "error");
      return result;
    },
    [flush, send]
  );

  // Last chance to save on tab close or when the app goes to the background.
  useEffect(() => {
    function saveOnExit() {
      if (isEmpty(pending.current)) return;
      const body = JSON.stringify(toBody(pending.current));
      pending.current = {};
      fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") saveOnExit();
    }
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", onVisibility);
      saveOnExit();
    };
  }, [url]);

  return { status, error, queue, flush, structural, dropExercise };
}

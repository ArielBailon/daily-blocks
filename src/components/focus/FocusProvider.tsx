"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clockOffset, shouldAlert } from "@/lib/focus/clock";
import { notifyPhaseEnd, unlockAudio } from "@/lib/focus/feedback";
import { isActive } from "@/lib/focus/session";
import type {
  CoverageInfo,
  FocusAction,
  FocusSessionDto,
  StartRequest,
} from "@/lib/focus/types";

export type FocusBlock = {
  id: number;
  startTime: string;
  activity: string;
  tag: string | null;
};

type StartResult = { ok: true } | { ok: false; error: string };

type FocusContextValue = {
  session: FocusSessionDto | null;
  loaded: boolean;
  error: string | null;
  coverage: CoverageInfo | null;
  busy: boolean;
  // Server clock minus browser clock; add it to Date.now().
  offsetMs: number;
  blocks: FocusBlock[];
  // Per block id, how many times a session marked it; rows react to changes.
  marks: Record<number, number>;
  start: (request: StartRequest) => Promise<StartResult>;
  act: (action: FocusAction) => Promise<void>;
  reload: () => Promise<void>;
};

const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocus(): FocusContextValue {
  const value = useContext(FocusContext);
  if (!value) throw new Error("useFocus must be used inside FocusProvider");
  return value;
}

const JSON_HEADERS = { "content-type": "application/json" };

export function FocusProvider({
  dateKey,
  blocks,
  children,
}: {
  dateKey: string;
  blocks: FocusBlock[];
  children: ReactNode;
}) {
  const [session, setSession] = useState<FocusSessionDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const [marks, setMarks] = useState<Record<number, number>>({});
  const offsetRef = useRef(0);

  // Last session the server told us about, even a finished one.
  const lastSeen = useRef<FocusSessionDto | null>(null);
  const markedSessions = useRef(new Set<number>());
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // The server marks blocks when it settles a session, but only the day's
  // blocks tell which ones really ended up completed.
  const syncMarks = useCallback(
    async (blockIds: number[]) => {
      try {
        const res = await fetch(`/api/days?from=${dateKey}&to=${dateKey}`);
        if (!res.ok) return;
        const body: {
          days?: { blocks: { startTime: string; completed: boolean }[] }[];
        } = await res.json();
        const done = new Set(
          (body.days?.[0]?.blocks ?? [])
            .filter((b) => b.completed)
            .map((b) => b.startTime)
        );
        const ids = blockIds.filter((id) => {
          const block = blocksRef.current.find((b) => b.id === id);
          return block !== undefined && done.has(block.startTime);
        });
        if (ids.length === 0) return;
        setMarks((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = (next[id] ?? 0) + 1;
          return next;
        });
      } catch {
        // Best effort: without it the rows catch up on the next reload.
      }
    },
    [dateKey]
  );

  const apply = useCallback(
    (next: FocusSessionDto | null) => {
      const prev = lastSeen.current;
      if (next) {
        offsetRef.current = clockOffset(next.serverNow, Date.now());
        setOffsetMs(offsetRef.current);
      }
      if (shouldAlert(prev, next, Date.now() + offsetRef.current)) {
        notifyPhaseEnd();
      }

      if (next?.blocksMarked && !markedSessions.current.has(next.id)) {
        markedSessions.current.add(next.id);
        void syncMarks(next.blockIds);
      } else if (
        !next &&
        prev &&
        (prev.status === "WORKING" || prev.status === "BREAK") &&
        !markedSessions.current.has(prev.id)
      ) {
        // The session finished by the clock while we were not looking.
        markedSessions.current.add(prev.id);
        void syncMarks(prev.blockIds);
      }

      lastSeen.current = next;
      const active = next && isActive(next.status) ? next : null;
      setSession(active);
      if (!active) setCoverage(null);
    },
    [syncMarks]
  );

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/active", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "No se pudo leer la sesión de foco");
        return;
      }
      apply(body.session ?? null);
      setError(null);
      setLoaded(true);
    } catch {
      setError("No se pudo leer la sesión de foco");
    }
  }, [apply]);

  const start = useCallback(
    async (request: StartRequest): Promise<StartResult> => {
      setBusy(true);
      try {
        const res = await fetch("/api/focus/sessions", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(request),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 409) void reload();
          return {
            ok: false,
            error: body?.error ?? "Error al iniciar la sesión de foco",
          };
        }
        apply(body.session);
        setCoverage(body.coverage);
        setError(null);
        return { ok: true };
      } catch {
        return { ok: false, error: "Error al iniciar la sesión de foco" };
      } finally {
        setBusy(false);
      }
    },
    [apply, reload]
  );

  const act = useCallback(
    async (action: FocusAction) => {
      const current = lastSeen.current;
      if (!current) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/focus/sessions/${current.id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? "Error al actualizar la sesión de foco");
          void reload();
          return;
        }
        apply(body.session);
        setError(null);
      } catch {
        setError("Error al actualizar la sesión de foco");
      } finally {
        setBusy(false);
      }
    },
    [apply, reload]
  );

  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => document.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void reload(), 0);
    // Timers stall in the background, so resync when the tab comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  // Ask the server to settle the phase once it should have ended. At least one
  // second apart, so a small clock error cannot turn into a request loop.
  useEffect(() => {
    if (!session) return;
    if (session.status !== "WORKING" && session.status !== "BREAK") return;
    const endsAt = Date.parse(
      session.status === "WORKING" ? session.workEndsAt : session.breakEndsAt
    );
    const delay = Math.max(endsAt - (Date.now() + offsetMs), 1000);
    const id = setTimeout(() => void reload(), delay);
    return () => clearTimeout(id);
  }, [session, offsetMs, reload]);

  const value = useMemo(
    () => ({
      session,
      loaded,
      error,
      coverage,
      busy,
      offsetMs,
      blocks,
      marks,
      start,
      act,
      reload,
    }),
    [session, loaded, error, coverage, busy, offsetMs, blocks, marks, start, act, reload]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

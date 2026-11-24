"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findCurrentAndNext } from "@/lib/blocks";
import { localMinutesOfDay, resolveToday, toDateKey } from "@/lib/date";
import { SUMMARY_POLL_MS } from "@/lib/activitywatch/config";
import { pickAlert, type DistractionAlert } from "@/lib/activitywatch/live";
import { blockBounds, periodOf } from "@/lib/activitywatch/period";
import { distractionMinutes } from "@/lib/activitywatch/summary";
import { useFocus } from "@/components/focus/FocusProvider";
import { useActivityWatch } from "./ActivityWatchProvider";

// Dismissed banners stay dismissed across Hoy and Ahora for the tab's life.
const dismissedKeys = new Set<string>();

type Measured = {
  session: { id: number; minutes: number } | null;
  block: { dateKey: string; startTime: string; minutes: number } | null;
};

const NOTHING: Measured = { session: null, block: null };

// Distraction minutes of the WORKING focus session and of today's current DEEP
// block, refreshed every minute while the tab is visible.
export function useDistraction(dateKey: string) {
  const { status, query } = useActivityWatch();
  const { session, blocks, offsetMs } = useFocus();
  const [measured, setMeasured] = useState<Measured>(NOTHING);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set(dismissedKeys)
  );

  const working = session?.status === "WORKING" ? session : null;
  const sessionId = working?.id ?? null;
  const startedAt = working?.startedAt ?? null;

  // Read through refs so a new clock offset or block list does not restart
  // the polling loop.
  const offsetRef = useRef(offsetMs);
  const blocksRef = useRef(blocks);
  useEffect(() => {
    offsetRef.current = offsetMs;
    blocksRef.current = blocks;
  }, [offsetMs, blocks]);

  useEffect(() => {
    if (status !== "connected") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let cancelled = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    async function run() {
      timer = null;
      if (cancelled || running || document.hidden) return;
      running = true;
      try {
        const now = Date.now();
        const periods: string[] = [];
        let sessionIndex = -1;
        let blockIndex = -1;
        let blockStart = "";

        if (sessionId !== null && startedAt) {
          // startedAt is server time; ActivityWatch uses this PC's clock.
          const startMs = Date.parse(startedAt) - offsetRef.current;
          if (startMs < now) sessionIndex = periods.push(periodOf(startMs, now)) - 1;
        }
        if (dateKey === toDateKey(resolveToday(new Date(now)).date)) {
          const { current } = findCurrentAndNext(
            blocksRef.current,
            localMinutesOfDay(new Date(now))
          );
          if (current?.tag === "DEEP") {
            blockStart = current.startTime;
            const { startMs } = blockBounds(dateKey, blockStart);
            blockIndex = periods.push(periodOf(startMs, now)) - 1;
          }
        }

        if (periods.length === 0) {
          setMeasured(NOTHING);
          return;
        }
        const results = await query(periods);
        if (cancelled || !results) return;
        setMeasured({
          session:
            sessionIndex >= 0 && sessionId !== null
              ? { id: sessionId, minutes: distractionMinutes(results[sessionIndex].categories) }
              : null,
          block:
            blockIndex >= 0
              ? {
                  dateKey,
                  startTime: blockStart,
                  minutes: distractionMinutes(results[blockIndex].categories),
                }
              : null,
        });
      } finally {
        running = false;
        if (!cancelled && !document.hidden) timer = setTimeout(run, SUMMARY_POLL_MS);
      }
    }

    const onVisibility = () => {
      clear();
      if (!document.hidden) void run();
    };

    const first = setTimeout(onVisibility, 0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, dateKey, sessionId, startedAt, query]);

  const dismiss = useCallback((key: string) => {
    dismissedKeys.add(key);
    setDismissed(new Set(dismissedKeys));
  }, []);

  if (status !== "connected") {
    return { sessionMinutes: null, alert: null, dismiss };
  }
  // A measurement of an older session must not show for a new one.
  const sessionMeasure =
    measured.session && measured.session.id === sessionId ? measured.session : null;
  const alert: DistractionAlert | null = pickAlert({
    session: sessionMeasure,
    block: measured.block,
    dismissed,
  });
  return { sessionMinutes: sessionMeasure?.minutes ?? null, alert, dismiss };
}

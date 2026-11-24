"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SUMMARY_POLL_MS } from "@/lib/activitywatch/config";
import { blockBounds, blockPeriod, periodsToFetch } from "@/lib/activitywatch/period";
import type { PeriodSummary } from "@/lib/activitywatch/summary";
import { useActivityWatch } from "./ActivityWatchProvider";

type Summaries = Record<string, PeriodSummary>;

// Finished blocks can no longer change: keep them for the tab's life, across
// Hoy and Historial, so they are queried once.
const finishedCache = new Map<string, PeriodSummary>();

const BlockSummariesContext = createContext<Summaries>({});

export function useBlockSummary(startTime: string): PeriodSummary | null {
  const { status } = useActivityWatch();
  const summaries = useContext(BlockSummariesContext);
  return status === "connected" ? (summaries[startTime] ?? null) : null;
}

function useBlockSummaries(dateKey: string, startTimes: string[]): Summaries {
  const { status, query } = useActivityWatch();
  const [state, setState] = useState<{ dateKey: string; summaries: Summaries }>({
    dateKey,
    summaries: {},
  });
  // A string, so a new array with the same blocks does not restart polling.
  const timesKey = startTimes.join(",");

  useEffect(() => {
    if (status !== "connected") return;
    const times = timesKey === "" ? [] : timesKey.split(",");
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
        const next: Summaries = {};
        for (const t of times) {
          const cached = finishedCache.get(blockPeriod(dateKey, t));
          if (cached) next[t] = cached;
        }
        const toFetch = periodsToFetch(dateKey, times, now, finishedCache);
        if (toFetch.length > 0) {
          const periods = toFetch.map((t) => blockPeriod(dateKey, t));
          const results = await query(periods);
          // On failure the provider turns unavailable, which hides the bars.
          if (cancelled || !results) return;
          results.forEach((summary, i) => {
            next[toFetch[i]] = summary;
            if (blockBounds(dateKey, toFetch[i]).endMs <= now) {
              finishedCache.set(periods[i], summary);
            }
          });
        }
        setState({ dateKey, summaries: next });
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
  }, [status, dateKey, timesKey, query]);

  return state.dateKey === dateKey ? state.summaries : {};
}

// Wraps one day's block list; each BlockActivity reads its block from here.
export function BlockActivityProvider({
  dateKey,
  startTimes,
  children,
}: {
  dateKey: string;
  startTimes: string[];
  children: ReactNode;
}) {
  const summaries = useBlockSummaries(dateKey, startTimes);
  return (
    <BlockSummariesContext.Provider value={summaries}>{children}</BlockSummariesContext.Provider>
  );
}

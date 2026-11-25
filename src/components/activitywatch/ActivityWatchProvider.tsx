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
import {
  connect,
  queryPeriods,
  ping,
  type AwConnection,
} from "@/lib/activitywatch/client";
import { STATUS_POLL_MS, UNAVAILABLE_RETRY_MS } from "@/lib/activitywatch/config";
import { periodSeconds } from "@/lib/activitywatch/period";
import { summarizePeriod, type PeriodSummary } from "@/lib/activitywatch/summary";

export type AwStatus = "checking" | "connected" | "unavailable";

type ActivityWatchValue = {
  status: AwStatus;
  // Null when ActivityWatch cannot answer; the status then turns unavailable.
  query: (periods: string[]) => Promise<PeriodSummary[] | null>;
};

const ActivityWatchContext = createContext<ActivityWatchValue | null>(null);

export function useActivityWatch(): ActivityWatchValue {
  const value = useContext(ActivityWatchContext);
  if (!value) {
    throw new Error("useActivityWatch must be used inside ActivityWatchProvider");
  }
  return value;
}

// Desktop only for now: narrow viewports never call ActivityWatch.
const DESKTOP_QUERY = "(min-width: 768px)";

export function ActivityWatchProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AwStatus>("checking");
  const connection = useRef<AwConnection | null>(null);

  const markUnavailable = useCallback(() => {
    connection.current = null;
    setStatus("unavailable");
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let cancelled = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const active = () => media.matches && !document.hidden;

    async function tick() {
      timer = null;
      if (cancelled || running || !active()) return;
      running = true;
      try {
        if (connection.current) await ping();
        else connection.current = await connect();
        if (cancelled) return;
        setStatus("connected");
        timer = setTimeout(tick, STATUS_POLL_MS);
      } catch {
        if (cancelled) return;
        markUnavailable();
        timer = setTimeout(tick, UNAVAILABLE_RETRY_MS);
      } finally {
        running = false;
      }
    }

    // Timers stall in a hidden tab, so polling stops there and restarts at once
    // when the tab or a wide viewport comes back.
    const resume = () => {
      clear();
      if (active()) void tick();
    };

    const first = setTimeout(resume, 0);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clear();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, [markUnavailable]);

  const query = useCallback(
    async (periods: string[]): Promise<PeriodSummary[] | null> => {
      const conn = connection.current;
      if (!conn || periods.length === 0) return conn ? [] : null;
      try {
        const results = await queryPeriods(conn, periods);
        return results.map((result, i) => summarizePeriod(result, periodSeconds(periods[i])));
      } catch {
        markUnavailable();
        return null;
      }
    },
    [markUnavailable]
  );

  const value = useMemo(() => ({ status, query }), [status, query]);

  return (
    <ActivityWatchContext.Provider value={value}>{children}</ActivityWatchContext.Provider>
  );
}

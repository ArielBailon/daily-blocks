"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SUMMARY_POLL_MS } from "@/lib/activitywatch/config";
import {
  byTopCategory,
  dayRange,
  formatDuration,
  topWithRest,
} from "@/lib/activitywatch/day";
import type { PeriodSummary } from "@/lib/activitywatch/summary";
import type { DetailTime } from "@/lib/activitywatch/titles";
import { useActivityWatch } from "./ActivityWatchProvider";

const TOP_APPS = 5;

const CATEGORY_BG: Record<string, string> = {
  Work: "bg-status-green",
  Media: "bg-status-red",
  Comms: "bg-status-yellow",
};
const OTHER_BG = "bg-foreground/30";

// Finished days can no longer change: query them once per tab.
const finishedDays = new Map<string, PeriodSummary>();

function useDaySummary(dateKey: string): PeriodSummary | null {
  const { status, query } = useActivityWatch();
  const [state, setState] = useState<{ dateKey: string; summary: PeriodSummary | null }>({
    dateKey,
    summary: null,
  });

  useEffect(() => {
    if (status !== "connected") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let cancelled = false;

    async function run() {
      timer = null;
      if (cancelled || running || document.hidden) return;
      running = true;
      let finished = false;
      try {
        const range = dayRange(dateKey, Date.now());
        if (!range) {
          finished = true;
          setState({ dateKey, summary: null });
          return;
        }
        finished = range.finished;
        const cached = finishedDays.get(range.period);
        if (cached) {
          setState({ dateKey, summary: cached });
          return;
        }
        const results = await query([range.period]);
        // On failure the provider turns unavailable, which hides the panel.
        if (cancelled || !results) return;
        if (range.finished) finishedDays.set(range.period, results[0]);
        setState({ dateKey, summary: results[0] });
      } finally {
        running = false;
        if (!cancelled && !finished && !document.hidden) {
          timer = setTimeout(run, SUMMARY_POLL_MS);
        }
      }
    }

    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!document.hidden) void run();
    };

    const first = setTimeout(onVisibility, 0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(first);
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, dateKey, query]);

  return status === "connected" && state.dateKey === dateKey ? state.summary : null;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Actividad en la PC"
      className="hidden flex-col gap-4 rounded-xl border border-muted bg-surface p-4 md:flex"
    >
      {children}
    </section>
  );
}

function Heading({ total }: { total?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Actividad en la PC
      </h2>
      {total && <span className="text-lg font-semibold tabular-nums">{total}</span>}
    </div>
  );
}

const percentOf = (seconds: number, total: number) =>
  total > 0 ? (seconds / total) * 100 : 0;

const TOP_DETAILS = 5;

// One app with its bar; opens to what was open in it (sites in a browser,
// projects in an editor, …).
function AppRow({
  app,
  seconds,
  maxSeconds,
  details,
}: {
  app: string;
  seconds: number;
  maxSeconds: number;
  details: DetailTime[];
}) {
  const head = (
    <>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          {details.length > 0 && (
            <span
              aria-hidden
              className="text-xs text-foreground/50 transition-transform group-open:rotate-90"
            >
              ▸
            </span>
          )}
          <span className="truncate">{app}</span>
        </span>
        <span className="shrink-0 tabular-nums text-foreground/60">
          {formatDuration(seconds)}
        </span>
      </div>
      <div aria-hidden className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percentOf(seconds, maxSeconds)}%` }}
        />
      </div>
    </>
  );

  if (details.length === 0) return <li>{head}</li>;

  const { top, rest } = topWithRest(details, TOP_DETAILS);
  return (
    <li>
      <details className="group">
        <summary className="cursor-pointer list-none rounded-sm [&::-webkit-details-marker]:hidden">
          {head}
        </summary>
        <ul className="mt-2 flex flex-col gap-1 border-l border-muted pl-3 text-xs">
          {top.map((d) => (
            <li key={d.label} className="flex justify-between gap-3">
              <span className="min-w-0 truncate" title={d.label}>
                {d.label}
              </span>
              <span className="shrink-0 tabular-nums text-foreground/60">
                {formatDuration(d.seconds)}
              </span>
            </li>
          ))}
          {rest && (
            <li className="flex justify-between gap-3 text-foreground/60">
              <span>Otros ({rest.count})</span>
              <span className="tabular-nums">{formatDuration(rest.seconds)}</span>
            </li>
          )}
        </ul>
      </details>
    </li>
  );
}

// A summary of how the PC was used during the page's day, read from
// ActivityWatch: time per category and the top apps. Not tied to the day's
// blocks. Desktop only.
export function PcTimePanel({ dateKey }: { dateKey: string }) {
  const { status } = useActivityWatch();
  const summary = useDaySummary(dateKey);

  if (status === "unavailable") {
    return (
      <Card>
        <Heading />
        <p className="text-sm text-foreground/60">
          ActivityWatch no está disponible en esta PC.
        </p>
      </Card>
    );
  }
  if (!summary) return null;

  const active = summary.activeSeconds;
  if (active === 0) {
    return (
      <Card>
        <Heading />
        <p className="text-sm text-foreground/60">Sin actividad registrada este día.</p>
      </Card>
    );
  }

  const categories = byTopCategory(summary.categories).map((c) => ({
    ...c,
    bg: CATEGORY_BG[c.name] ?? OTHER_BG,
  }));
  const { top: apps, rest } = topWithRest(summary.apps, TOP_APPS);
  const maxApp = apps[0]?.seconds ?? 0;

  return (
    <Card>
      <Heading total={formatDuration(active)} />

      <div className="flex flex-col gap-2">
        <div
          aria-hidden
          className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted"
        >
          {categories.map((c) => (
            <span
              key={c.name}
              className={c.bg}
              style={{ width: `${percentOf(c.seconds, active)}%` }}
            />
          ))}
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {categories.map((c) => (
            <li key={c.name} className="flex items-center gap-2">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${c.bg}`} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="shrink-0 tabular-nums text-foreground/60">
                {formatDuration(c.seconds)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-muted pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Top apps
        </h3>
        <ul className="flex flex-col gap-2.5">
          {apps.map((app) => (
            <AppRow
              key={app.app}
              app={app.app}
              seconds={app.seconds}
              maxSeconds={maxApp}
              details={summary.appDetails.get(app.app) ?? []}
            />
          ))}
        </ul>
        {rest && (
          <p className="flex justify-between gap-3 text-sm text-foreground/60">
            <span>Otras ({rest.count})</span>
            <span className="tabular-nums">{formatDuration(rest.seconds)}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

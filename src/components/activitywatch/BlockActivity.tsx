"use client";

import { useState } from "react";
import {
  barSegments,
  formatAppMinutes,
  isDeepDistracted,
  type BarSegment,
} from "@/lib/activitywatch/summary";
import { useBlockSummary } from "./BlockActivityProvider";

const SEGMENT_FILL: Record<string, string> = {
  "cat:Work": "fill-status-green",
  "cat:Media": "fill-status-red",
  "cat:Comms": "fill-status-yellow",
  idle: "fill-muted",
};

function fillOf(segment: BarSegment): string {
  return SEGMENT_FILL[segment.key] ?? "fill-foreground/35";
}

// What ActivityWatch saw during one block. Renders nothing until there is a
// summary, and only on desktop widths.
export function BlockActivity({
  startTime,
  tag,
}: {
  startTime: string;
  tag: string | null;
}) {
  const summary = useBlockSummary(startTime);
  const [open, setOpen] = useState(false);
  if (!summary) return null;

  const segments = barSegments(summary);
  const deep = isDeepDistracted(summary, tag);
  const label = `Actividad real ${startTime}: ${segments
    .map((s) => `${s.label} ${Math.round(s.percent)}%`)
    .join(", ")}${deep ? ", distracción en bloque Deep" : ""}`;

  const starts = segments.map((_, i) =>
    segments.slice(0, i).reduce((sum, s) => sum + s.percent, 0)
  );
  return (
    <div className="hidden pb-2 pl-23 pr-3 md:block">
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className="block w-full py-1"
      >
        <svg
          aria-hidden
          viewBox="0 0 100 1"
          preserveAspectRatio="none"
          className={`block h-1.5 w-full overflow-hidden rounded-full ${
            deep ? "ring-1 ring-accent/60 ring-offset-1 ring-offset-surface" : ""
          }`}
        >
          {segments.map((segment, i) => (
            <rect
              key={segment.key}
              x={starts[i]}
              width={segment.percent}
              height={1}
              className={fillOf(segment)}
            />
          ))}
        </svg>
      </button>
      {open && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-foreground/60">
          {summary.apps.length === 0 ? (
            <li>Sin actividad</li>
          ) : (
            summary.apps.map((app) => (
              <li key={app.app}>
                {app.app} · {formatAppMinutes(app.seconds)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

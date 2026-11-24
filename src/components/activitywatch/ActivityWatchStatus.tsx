"use client";

import { useActivityWatch } from "./ActivityWatchProvider";

const GUIDE_URL =
  "https://github.com/ArielBailon/daily-blocks/blob/master/docs/activitywatch.md";

// Desktop only: hidden below the `md` breakpoint, like the rest of the
// ActivityWatch integration.
export function ActivityWatchStatus() {
  const { status } = useActivityWatch();

  if (status === "connected") {
    return (
      <span
        role="img"
        aria-label="ActivityWatch conectado"
        title="ActivityWatch conectado"
        className="hidden h-2 w-2 self-center rounded-full bg-foreground/30 md:block"
      />
    );
  }

  if (status === "unavailable") {
    return (
      <a
        href={GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden self-center text-xs text-foreground/50 hover:text-foreground md:block"
      >
        ActivityWatch no disponible
      </a>
    );
  }

  return null;
}

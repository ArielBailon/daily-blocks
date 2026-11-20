"use client";

import { useEffect, useState } from "react";
import { stateFromDto } from "@/lib/focus/clock";
import { remainingMs } from "@/lib/focus/session";
import type { FocusSessionDto } from "@/lib/focus/types";

// The interval only repaints; the value is always derived from the end
// timestamps, so it stays exact after a background pause or a reload.
export function useRemainingMs(
  session: FocusSessionDto,
  offsetMs: number
): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return remainingMs(stateFromDto(session), new Date(nowMs + offsetMs));
}

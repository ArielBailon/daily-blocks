"use client";

import { DistractionBanner } from "./DistractionBanner";
import { useDistraction } from "./useDistraction";

// The distraction banner on its own, for pages without the live panel (Hoy).
export function DistractionAlert({ dateKey }: { dateKey: string }) {
  const { alert, dismiss } = useDistraction(dateKey);
  return alert ? <DistractionBanner alert={alert} onDismiss={dismiss} /> : null;
}

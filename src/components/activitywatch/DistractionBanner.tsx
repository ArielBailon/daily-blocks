"use client";

import type { DistractionAlert } from "@/lib/activitywatch/live";

const WHERE = {
  session: "en esta sesión de foco",
  block: "en este bloque Deep",
} as const;

export function DistractionBanner({
  alert,
  onDismiss,
}: {
  alert: DistractionAlert;
  onDismiss: (key: string) => void;
}) {
  return (
    <div
      role="status"
      className="hidden w-full max-w-xl items-center justify-between gap-4 self-center rounded-xl border border-accent/60 bg-surface px-4 py-3 text-left text-sm md:flex"
    >
      <p>
        Llevas {alert.minutes} min de distracción {WHERE[alert.kind]}.
      </p>
      <button
        type="button"
        onClick={() => onDismiss(alert.key)}
        className="shrink-0 rounded-lg border border-muted px-3 py-1.5 text-xs transition-colors hover:border-accent"
      >
        Descartar
      </button>
    </div>
  );
}

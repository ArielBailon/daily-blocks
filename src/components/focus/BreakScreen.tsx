"use client";

import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/focus/clock";
import type { FocusSessionDto } from "@/lib/focus/types";
import { useFocus } from "./FocusProvider";
import { useRemainingMs } from "./useRemainingMs";

// Native modal dialog: the page behind becomes inert and focus stays inside.
export function BreakScreen({ session }: { session: FocusSessionDto }) {
  const { busy, error, offsetMs, act } = useFocus();
  const remaining = useRemainingMs(session, offsetMs);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleSkip() {
    if (window.confirm("¿Saltar el descanso?")) void act("skipBreak");
  }

  return (
    <dialog
      ref={dialogRef}
      // The break is mandatory: Escape must not dismiss it.
      onCancel={(e) => e.preventDefault()}
      aria-labelledby="break-title"
      className="m-0 h-full max-h-none w-full max-w-none bg-background text-foreground"
    >
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <h2 id="break-title" className="text-3xl">
          Descanso
        </h2>
        <p
          role="timer"
          className="font-serif text-7xl tabular-nums sm:text-8xl"
        >
          {formatClock(remaining)}
        </p>
        <p className="max-w-xs text-foreground/70">
          Levántate, estira y aleja la vista de la pantalla.
          {session.blocksMarked && " Tus bloques ya quedaron marcados."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleSkip}
          className="min-h-11 rounded-lg border border-muted px-5 text-sm transition-colors enabled:hover:border-accent disabled:opacity-50"
        >
          Saltar descanso
        </button>
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}

"use client";

import { formatClock } from "@/lib/focus/clock";
import { fromMinutes, toMinutes, BLOCK_MINUTES } from "@/lib/blocks";
import { meetsCompletion } from "@/lib/focus/session";
import type { FocusSessionDto } from "@/lib/focus/types";
import { useFocus, type FocusBlock } from "./FocusProvider";
import { BreakScreen } from "./BreakScreen";
import { useRemainingMs } from "./useRemainingMs";

const BAR_CLASS =
  "fixed inset-x-0 bottom-0 z-40 border-t border-muted bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";
const BUTTON_CLASS =
  "min-h-11 rounded-lg border border-muted px-4 text-sm transition-colors enabled:hover:border-accent disabled:opacity-50";

function coveredRange(session: FocusSessionDto, blocks: FocusBlock[]): string {
  const times = blocks
    .filter((b) => session.blockIds.includes(b.id))
    .map((b) => b.startTime)
    .sort();
  const count = `${session.blockIds.length} ${
    session.blockIds.length === 1 ? "bloque" : "bloques"
  }`;
  if (times.length === 0) return count;
  const end = fromMinutes(toMinutes(times[times.length - 1]) + BLOCK_MINUTES);
  return `${times[0]} - ${end} · ${count}`;
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-accent">
      {message}
    </p>
  );
}

function ActiveBar({ session }: { session: FocusSessionDto }) {
  const { blocks, busy, coverage, error, offsetMs, act } = useFocus();
  const remaining = useRemainingMs(session, offsetMs);
  const working = session.status === "WORKING" || session.status === "PAUSED";
  const phase = working
    ? session.status === "PAUSED"
      ? "En pausa"
      : "Trabajo"
    : "Descanso";

  function handleFinish() {
    // Work done so far is the planned work minus what is left, pauses included.
    const workedSeconds = session.workMinutes * 60 - remaining / 1000;
    if (
      !meetsCompletion(workedSeconds, session.workMinutes) &&
      !window.confirm(
        `Llevas ${Math.floor(workedSeconds / 60)} de ${session.workMinutes} min. Con menos del 80% los bloques no se marcan. ¿Terminar igual?`
      )
    ) {
      return;
    }
    void act("finish");
  }

  function handleAbandon() {
    if (window.confirm("¿Abandonar la sesión? No se marcará ningún bloque.")) {
      void act("abandon");
    }
  }

  return (
    <section aria-label="Temporizador de foco" className={BAR_CLASS}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-accent">
              {phase}
            </span>
            <span
              role="timer"
              className="font-serif text-3xl tabular-nums leading-tight"
            >
              {formatClock(remaining)}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-sm text-foreground/70">
            <p>{coveredRange(session, blocks)}</p>
            {coverage?.trimmed && (
              <p className="text-accent">
                Solo caben {coverage.covered} de {coverage.requested} bloques.
              </p>
            )}
          </div>
          {working && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(session.status === "PAUSED" ? "resume" : "pause")
                }
                className="min-h-11 rounded-lg bg-accent px-4 text-sm text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
              >
                {session.status === "PAUSED" ? "Reanudar" : "Pausar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleFinish}
                className={BUTTON_CLASS}
              >
                Terminar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleAbandon}
                className={BUTTON_CLASS}
              >
                Abandonar
              </button>
            </div>
          )}
        </div>
        {error && <ErrorLine message={error} />}
      </div>
    </section>
  );
}

export function FocusBar() {
  const { session, error, loaded, reload } = useFocus();

  if (!session) {
    if (!error) return null;
    return (
      <section aria-label="Temporizador de foco" className={BAR_CLASS}>
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <ErrorLine message={error} />
          {!loaded && (
            <button
              type="button"
              onClick={() => void reload()}
              className={BUTTON_CLASS}
            >
              Reintentar
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Keeps the last block row clear of the fixed bar. */}
      <div aria-hidden className="h-32" />
      <ActiveBar session={session} />
      {session.status === "BREAK" && <BreakScreen session={session} />}
    </>
  );
}

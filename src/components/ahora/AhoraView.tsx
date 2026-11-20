"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BLOCK_TAG_LABELS, type BlockTag } from "@/lib/block-tags";
import {
  BLOCK_MINUTES,
  findCurrentAndNext,
  fromMinutes,
  toMinutes,
} from "@/lib/blocks";
import { localMinutesOfDay, resolveToday, toDateKey } from "@/lib/date";
import { formatClock } from "@/lib/focus/clock";
import type { FocusSessionDto } from "@/lib/focus/types";
import { PresetPicker } from "@/components/focus/PresetPicker";
import { useFocus } from "@/components/focus/FocusProvider";
import { useRemainingMs } from "@/components/focus/useRemainingMs";
import { useWakeLock } from "./useWakeLock";

export type AhoraBlock = {
  id: number;
  startTime: string;
  activity: string;
  tag: BlockTag | null;
  completed: boolean;
};

const TICK_MS = 15_000;

const PHASE_LABEL = {
  WORKING: "Trabajo",
  PAUSED: "En pausa",
  BREAK: "Descanso",
} as const;

function SessionPanel({ session }: { session: FocusSessionDto }) {
  const { offsetMs } = useFocus();
  const remaining = useRemainingMs(session, offsetMs);
  const phase =
    session.status === "WORKING" ||
    session.status === "PAUSED" ||
    session.status === "BREAK"
      ? PHASE_LABEL[session.status]
      : "";
  const count = session.blockIds.length;

  return (
    <section
      aria-label="Sesión de foco"
      className="flex flex-col items-center gap-1"
    >
      <p className="text-xs uppercase tracking-wide text-accent">{phase}</p>
      <p
        role="timer"
        className="font-serif text-7xl tabular-nums sm:text-8xl"
      >
        {formatClock(remaining)}
      </p>
      <p className="text-sm text-foreground/60">
        Cubre {count} {count === 1 ? "bloque" : "bloques"}
      </p>
    </section>
  );
}

export function AhoraView({
  dateKey,
  initialNowMs,
  blocks,
}: {
  dateKey: string;
  initialNowMs: number;
  blocks: AhoraBlock[];
}) {
  const router = useRouter();
  const { loaded, session, busy, marks } = useFocus();
  const [nowMs, setNowMs] = useState(initialNowMs);
  const [pickerOpen, setPickerOpen] = useState(false);

  useWakeLock(session !== null);

  // The first render uses the server clock so it matches on hydration; after
  // that the device clock drives the view.
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 1000);
    const id = setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const now = new Date(nowMs);
  const dayChanged = toDateKey(resolveToday(now).date) !== dateKey;

  // A tab left open past midnight must not show yesterday's blocks as current.
  useEffect(() => {
    if (dayChanged) router.refresh();
  }, [dayChanged, router]);

  const minutes = localMinutesOfDay(now);
  const { current, next } = dayChanged
    ? { current: null, next: null }
    : findCurrentAndNext(blocks, minutes);
  const currentDone =
    current !== null && (current.completed || (marks[current.id] ?? 0) > 0);

  if (blocks.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-2xl">Hoy no tiene plan</h1>
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-3 text-accent-foreground transition-colors hover:bg-accent/85"
        >
          Ir a Hoy para generarlo
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <p className="text-sm tabular-nums text-foreground/60">
        {dayChanged ? "Actualizando el día…" : fromMinutes(minutes)}
      </p>

      <section aria-label="Bloque actual" className="flex max-w-md flex-col gap-2">
        {current ? (
          <>
            <p className="text-xs uppercase tracking-wide text-accent">Ahora</p>
            <p className="text-sm tabular-nums text-foreground/60">
              {current.startTime} -{" "}
              {fromMinutes(toMinutes(current.startTime) + BLOCK_MINUTES)}
            </p>
            <h1 className="break-words text-3xl">
              {current.activity.trim() === "" ? (
                <span className="text-foreground/40">Sin actividad</span>
              ) : (
                current.activity
              )}
            </h1>
            <p className="text-sm text-foreground/60">
              {current.tag && (
                <span className="text-accent">{BLOCK_TAG_LABELS[current.tag]}</span>
              )}
              {current.tag && currentDone && " · "}
              {currentDone && "Completado"}
            </p>
          </>
        ) : (
          <h1 className="text-2xl">
            {next ? "Sin bloque ahora" : "El plan de hoy terminó"}
          </h1>
        )}
      </section>

      {session && <SessionPanel session={session} />}

      <button
        type="button"
        aria-label="Iniciar foco en el bloque actual"
        title={session ? "Ya hay una sesión de foco en curso" : "Iniciar foco"}
        disabled={!loaded || session !== null || busy || current === null}
        onClick={() => setPickerOpen(true)}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-30"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      {next && (
        <section aria-label="Siguiente bloque" className="max-w-md">
          <p className="text-xs uppercase tracking-wide text-foreground/60">
            Siguiente
          </p>
          <p className="break-words">
            <span className="tabular-nums text-foreground/60">
              {next.startTime}
            </span>{" "}
            {next.activity.trim() === "" ? (
              <span className="text-foreground/40">Sin actividad</span>
            ) : (
              next.activity
            )}
          </p>
        </section>
      )}

      {pickerOpen && current && (
        <PresetPicker blockId={current.id} onClose={() => setPickerOpen(false)} />
      )}
    </main>
  );
}

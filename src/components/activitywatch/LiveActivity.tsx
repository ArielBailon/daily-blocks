"use client";

import { useEffect, useState } from "react";
import { useActivityWatch } from "./ActivityWatchProvider";

const SHOW_TITLE_KEY = "daily-blocks:aw-show-title";

function readShowTitle(): boolean {
  try {
    return localStorage.getItem(SHOW_TITLE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeShowTitle(show: boolean) {
  try {
    if (show) localStorage.setItem(SHOW_TITLE_KEY, "1");
    else localStorage.removeItem(SHOW_TITLE_KEY);
  } catch {
    // Storage blocked: the toggle still works for this visit.
  }
}

function formatSince(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return minutes < 1 ? "<1 min" : `${minutes} min`;
}

// What the PC is doing right now. `nowMs` comes from the page's clock tick so
// the render stays pure.
export function LiveActivity({ nowMs }: { nowMs: number }) {
  const { status, current } = useActivityWatch();
  const [showTitle, setShowTitle] = useState(false);

  // Read after mount so the server render (always hidden) matches.
  useEffect(() => {
    const id = setTimeout(() => setShowTitle(readShowTitle()), 0);
    return () => clearTimeout(id);
  }, []);

  if (status !== "connected" || !current) return null;

  const toggle = () => {
    const next = !showTitle;
    setShowTitle(next);
    writeShowTitle(next);
  };

  return (
    <section
      aria-label="Actividad en la PC"
      className="hidden max-w-md flex-col items-center gap-1 text-sm md:flex"
    >
      <p>
        <span className="font-semibold">{current.app || "App desconocida"}</span>
        <span className="text-foreground/60">
          {" "}
          · {formatSince(nowMs - Date.parse(current.since))} ·{" "}
        </span>
        <span className={current.afk ? "text-foreground/60" : "text-status-green"}>
          {current.afk ? "Inactivo" : "Activo"}
        </span>
      </p>
      {showTitle && current.title && (
        <p className="max-w-md truncate text-foreground/60">{current.title}</p>
      )}
      <button
        type="button"
        aria-pressed={showTitle}
        onClick={toggle}
        className="text-xs text-foreground/50 underline-offset-2 hover:text-foreground hover:underline"
      >
        {showTitle ? "Ocultar título" : "Mostrar título"}
      </button>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartDayButton({
  routineDayKey,
  label,
}: {
  routineDayKey: string;
  label: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/fitness/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ routineDayKey }),
      });
      // 409: another device already started one, so show that session.
      if (res.ok || res.status === 409) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Error al crear la sesión");
    } catch {
      setError("Error al crear la sesión");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={starting}
        onClick={start}
        className="min-h-12 rounded-lg bg-accent px-5 font-semibold text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
      >
        {starting ? "Creando sesión…" : `Empezar ${label}`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-status-red">
          {error}
        </p>
      )}
    </div>
  );
}

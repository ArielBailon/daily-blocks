"use client";

import { useRouter } from "next/navigation";

export function HistoryDatePicker({
  dateKey,
  maxKey,
}: {
  dateKey: string | null;
  maxKey: string;
}) {
  const router = useRouter();

  function handleChange(value: string) {
    // YYYY-MM-DD strings compare in calendar order; empty or later values are ignored.
    if (value === "" || value > maxKey) return;
    router.push(`/historial?fecha=${value}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="history-date"
        className="text-xs uppercase tracking-wide text-foreground/60"
      >
        Fecha
      </label>
      <input
        id="history-date"
        type="date"
        max={maxKey}
        value={dateKey ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-fit rounded-lg border border-muted bg-surface px-3 py-2 tabular-nums outline-none focus:border-accent"
      />
    </div>
  );
}

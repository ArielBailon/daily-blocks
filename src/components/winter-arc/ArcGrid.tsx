import Link from "next/link";
import type { ArcDayResult } from "@/lib/arc/summary";
import { STATUS_CLASSES, STATUS_LABELS } from "@/components/winter-arc/status";

export function ArcGrid({
  days,
  todayKey,
  selected,
}: {
  days: ArcDayResult[];
  todayKey: string;
  selected: number | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        90 días
      </h2>
      <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {days.map((day) => {
          const isToday = day.date === todayKey;
          const isSelected = selected === day.dayNumber;
          return (
            <li key={day.date}>
              <Link
                href={`/winter-arc?dia=${day.dayNumber}`}
                aria-label={`Día ${day.dayNumber}, ${STATUS_LABELS[day.status]}${
                  isToday ? ", hoy" : ""
                }`}
                aria-current={isSelected ? "true" : undefined}
                className={`flex h-10 items-center justify-center rounded-md text-sm tabular-nums ${
                  STATUS_CLASSES[day.status]
                } ${
                  isToday
                    ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
                    : ""
                } ${isSelected ? "outline-2 outline-foreground" : ""}`}
              >
                {day.dayNumber}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

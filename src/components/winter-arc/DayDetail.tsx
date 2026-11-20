import type { ArcDayResult } from "@/lib/arc/summary";
import { STATUS_LABELS } from "@/components/winter-arc/status";
import { parseDateKey } from "@/lib/date";
import { formatFocusMinutes, type FocusDaySummary } from "@/lib/focus/metrics";

const dayFormat = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const RULES = [
  { id: "DEEP", label: "Deep" },
  { id: "SCREENS_OFF", label: "Pantallas" },
] as const;

export function DayDetail({
  day,
  focus,
}: {
  day: ArcDayResult;
  focus: FocusDaySummary;
}) {
  const sessions = focus.completed + focus.abandoned;
  const date = parseDateKey(day.date);
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h2 className="font-serif text-xl">
        Día {day.dayNumber}
        {date && (
          <span className="text-foreground/60">
            {" · "}
            {dayFormat.format(date)}
          </span>
        )}
      </h2>
      <p className="text-sm text-foreground/70">
        Estado: {STATUS_LABELS[day.status]}
        {!day.hasPlan && " · sin plan registrado"}
      </p>
      <ul className="flex flex-col gap-2">
        {RULES.map(({ id, label }) => {
          const rule = day.rules[id];
          return (
            <li key={id} className="flex items-baseline justify-between gap-3">
              <span>{label}</span>
              <span className="tabular-nums">
                {rule.applicable ? (
                  <>
                    <span className="font-semibold">{rule.value}</span>
                    <span className="text-foreground/60"> / {rule.target}</span>
                    <span className="text-foreground/60">
                      {" · "}
                      {rule.passed ? "cumple" : "no cumple"}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground/60">No aplica</span>
                )}
              </span>
            </li>
          );
        })}
        <li className="flex items-baseline justify-between gap-3">
          <span>Foco</span>
          <span className="tabular-nums">
            {sessions === 0 ? (
              <span className="text-foreground/60">Sin sesiones</span>
            ) : (
              <>
                <span className="font-semibold">
                  {formatFocusMinutes(focus.minutes)}
                </span>
                <span className="text-foreground/60">
                  {" · "}
                  {sessions} {sessions === 1 ? "sesión" : "sesiones"}
                </span>
              </>
            )}
          </span>
        </li>
      </ul>
    </section>
  );
}

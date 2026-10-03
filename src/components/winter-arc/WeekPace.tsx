import type { WeekResult, WeeklyRuleId } from "@/lib/arc/rules";

const RULES: { id: WeeklyRuleId; label: string }[] = [
  { id: "GYM", label: "Gym (días)" },
  { id: "WALK", label: "Caminatas (días)" },
  { id: "JOB_HUNTING", label: "Job Hunting (bloques)" },
];

export function WeekPace({ week }: { week: WeekResult }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Semana actual
      </h2>
      <ul className="flex flex-col gap-2">
        {RULES.map(({ id, label }) => (
          <li key={id} className="flex items-baseline justify-between gap-3">
            <span>{label}</span>
            <span className="tabular-nums">
              <span className="font-semibold">{week.rules[id].count}</span>
              <span className="text-foreground/60"> / {week.rules[id].target}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import type { ArcSummary, RuleId } from "@/lib/arc/summary";
import { percent } from "@/lib/arc/view";

const RULES: { id: RuleId; label: string; scope: string }[] = [
  { id: "DEEP", label: "Deep", scope: "días" },
  { id: "SCREENS_OFF", label: "Pantallas", scope: "días" },
  { id: "GYM", label: "Gym", scope: "semanas" },
  { id: "WALK", label: "Caminata", scope: "semanas" },
  { id: "JOB_HUNTING", label: "Job Hunting", scope: "semanas" },
];

export function RulePercentages({ rules }: { rules: ArcSummary["rules"] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Cumplimiento por regla
      </h2>
      <ul className="flex flex-col gap-2">
        {RULES.map(({ id, label, scope }) => {
          const { passed, total } = rules[id];
          const pct = percent(passed, total);
          return (
            <li key={id} className="flex items-baseline justify-between gap-3">
              <span>{label}</span>
              <span className="tabular-nums text-foreground/70">
                {pct === null ? (
                  "Sin datos"
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{pct}%</span>{" "}
                    ({passed}/{total} {scope})
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

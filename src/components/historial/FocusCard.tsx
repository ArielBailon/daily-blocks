import { formatFocusMinutes, type FocusDaySummary } from "@/lib/focus/metrics";

export function FocusCard({ summary }: { summary: FocusDaySummary }) {
  const sessions = summary.completed + summary.abandoned;
  const rows = [
    { label: "Minutos de foco", value: formatFocusMinutes(summary.minutes) },
    { label: "Sesiones completadas", value: String(summary.completed) },
    { label: "Sesiones abandonadas", value: String(summary.abandoned) },
    { label: "Descansos saltados", value: String(summary.breaksSkipped) },
  ];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Foco
      </h3>
      {sessions === 0 ? (
        <p className="text-sm text-foreground/60">Sin sesiones de foco.</p>
      ) : (
        <dl className="flex flex-col gap-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt>{label}</dt>
              <dd className="tabular-nums font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

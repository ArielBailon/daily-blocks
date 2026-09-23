import { getPastPlansSummary } from "@/lib/daily-plan";

export const dynamic = "force-dynamic";

// DailyPlan.date is stored as UTC midnight of the calendar day.
const dayFormat = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function HistorialPage() {
  const days = await getPastPlansSummary();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Historial</h1>

        {days.length === 0 ? (
          <p className="text-foreground/70">
            Todavía no hay días pasados. Aquí aparecerán cuando termine tu
            primer día con plan.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {days.map((day) => (
              <li
                key={day.id}
                className="flex items-baseline justify-between gap-4 border-b border-muted pb-3"
              >
                <span>{dayFormat.format(day.date)}</span>
                <span className="text-sm text-foreground/70">
                  {day.percent === null
                    ? "Sin tareas"
                    : `${day.completed}/${day.total} · ${day.percent}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

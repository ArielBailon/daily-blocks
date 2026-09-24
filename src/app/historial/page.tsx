import { redirect } from "next/navigation";
import { closePastPlans, getDayPlan } from "@/lib/daily-plan";
import { parseDateKey, resolveToday, toDateKey } from "@/lib/date";
import { isOnTheHour } from "@/lib/blocks";
import { HistoryDatePicker } from "@/components/historial/HistoryDatePicker";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

// DailyPlan.date is stored as UTC midnight of the calendar day.
const dayFormat = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string | string[] }>;
}) {
  const { fecha } = await searchParams;
  const { date: today } = resolveToday();
  const maxKey = toDateKey(new Date(today.getTime() - DAY_MS));

  let date: Date | null = null;
  if (fecha !== undefined) {
    const parsed = typeof fecha === "string" ? parseDateKey(fecha) : null;
    // Only past days belong to history; today and later are planned in "Hoy".
    if (!parsed || parsed.getTime() >= today.getTime()) {
      redirect("/historial");
    }
    date = parsed;
  }

  await closePastPlans(today);
  const plan = date ? await getDayPlan(date) : null;

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-3xl font-bold">Historial</h1>

        <HistoryDatePicker
          dateKey={date ? toDateKey(date) : null}
          maxKey={maxKey}
        />

        {!date ? (
          <p className="text-foreground/60">
            Elige una fecha para ver ese día.
          </p>
        ) : (
          <>
            <h2 className="font-serif text-xl first-letter:uppercase">
              {dayFormat.format(date)}
            </h2>

            {!plan ? (
              <p className="text-foreground/60">
                No hay nada registrado para este día.
              </p>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row-reverse md:items-start">
                <section className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4 md:w-72 md:shrink-0">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                    Tareas varias
                  </h3>
                  {plan.miscTasks.length === 0 ? (
                    <p className="text-sm text-foreground/60">Sin tareas.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {plan.miscTasks.map((task, index) => (
                        <li key={index} className="break-words py-1">
                          {task}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-muted bg-surface">
                  {plan.blocks.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-foreground/60">
                      Este día no tiene bloques.
                    </p>
                  ) : (
                    <ol>
                      {plan.blocks.map((block) => (
                        <li
                          key={block.id}
                          className="flex border-b border-muted last:border-b-0"
                        >
                          <span
                            className={`w-20 shrink-0 border-r border-muted px-3 py-3 text-right text-sm tabular-nums ${
                              isOnTheHour(block.startTime)
                                ? "font-semibold text-foreground"
                                : "text-foreground/60"
                            }`}
                          >
                            {block.startTime}
                          </span>
                          <span
                            className={`min-h-12 min-w-0 flex-1 break-words px-3 py-3 ${
                              block.completed
                                ? "text-foreground/50 line-through"
                                : ""
                            }`}
                          >
                            {block.activity}
                          </span>
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={block.completed}
                              readOnly
                              disabled
                              aria-label={`Completado ${block.startTime}`}
                              className="h-4 w-4 accent-accent"
                            />
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

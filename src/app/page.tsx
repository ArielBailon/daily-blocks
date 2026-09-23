import { closePastPlans, getDayPlan } from "@/lib/daily-plan";
import { redirect } from "next/navigation";
import { parseDateKey, resolveToday, toDateKey } from "@/lib/date";
import { GenerateDayForm } from "@/components/hoy/GenerateDayForm";
import { BlockRow } from "@/components/hoy/BlockRow";

export const dynamic = "force-dynamic";

const DEFAULT_START = "07:30";
const DEFAULT_END = "18:00";

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string | string[] }>;
}) {
  const { fecha } = await searchParams;
  const { date: today } = resolveToday();
  let date = today;
  if (fecha !== undefined) {
    const parsed = typeof fecha === "string" ? parseDateKey(fecha) : null;
    // "/" is the only URL for today; past days belong to history.
    if (!parsed || parsed.getTime() <= today.getTime()) {
      redirect("/");
    }
    date = parsed;
  }

  await closePastPlans(today);
  const plan = await getDayPlan(date);
  const blocks = plan?.blocks ?? [];
  const dateKey = toDateKey(date);
  const isFuture = date.getTime() > today.getTime();

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Planificación por bloques</h1>
          <p className="font-serif text-foreground/60">
            Divide tu jornada en bloques de 30 min y asigna una actividad a
            cada uno.
          </p>
        </header>

        <GenerateDayForm
          key={dateKey}
          dateKey={dateKey}
          todayKey={toDateKey(today)}
          hasBlocks={blocks.length > 0}
          initialStart={plan?.startTime ?? DEFAULT_START}
          initialEnd={plan?.endTime ?? DEFAULT_END}
        />

        <div className="overflow-hidden rounded-xl border border-muted bg-surface">
          {blocks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-foreground/60">
              Todavía no generaste este día. Elige el horario y pulsa Generar
              día.
            </p>
          ) : (
            <ol>
              {blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  dateKey={dateKey}
                  id={block.id}
                  startTime={block.startTime}
                  initialActivity={block.activity}
                  initialCompleted={block.completed}
                  canComplete={!isFuture}
                />
              ))}
            </ol>
          )}
        </div>

        {blocks.length > 0 && (
          <p className="text-center text-sm text-foreground/60">
            Se guarda automáticamente.
          </p>
        )}
      </div>
    </main>
  );
}

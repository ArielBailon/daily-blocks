import { closePastPlans, getDayPlan } from "@/lib/daily-plan";
import { resolveToday, toDateKey } from "@/lib/date";
import { GenerateDayForm } from "@/components/hoy/GenerateDayForm";
import { BlockRow } from "@/components/hoy/BlockRow";

export const dynamic = "force-dynamic";

const DEFAULT_START = "07:30";
const DEFAULT_END = "18:00";

export default async function HoyPage() {
  const { date } = resolveToday();
  await closePastPlans(date);
  const plan = await getDayPlan(date);
  const blocks = plan?.blocks ?? [];
  const dateKey = toDateKey(date);

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
          dateKey={dateKey}
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

import { getOrCreateTodayPlan } from "@/lib/daily-plan";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const plan = await getOrCreateTodayPlan();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Hoy</h1>

        {!plan ? (
          <p className="text-foreground/70">
            No hay ninguna plantilla para hoy. Asigna una recurrencia para
            este día o marca una plantilla como predeterminada en
            Plantillas.
          </p>
        ) : plan.tasks.length === 0 ? (
          <p className="text-foreground/70">
            El plan de hoy no tiene tareas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {plan.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 border-b border-muted pb-3"
              >
                <span>{task.title}</span>
                {task.suggestedTime && (
                  <span className="text-sm text-foreground/70">
                    {task.suggestedTime}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

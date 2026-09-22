import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteTemplateButton } from "@/components/plantillas/DeleteTemplateButton";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  0: "Dom",
};
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatWeekdays(weekdays: number[]): string {
  const present = new Set(weekdays);
  return WEEKDAY_ORDER.filter((day) => present.has(day))
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

export default async function PlantillasPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tasks: true } },
      recurrences: { select: { weekday: true } },
    },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Plantillas</h1>
          <Link href="/plantillas/nueva" className="text-accent">
            Nueva plantilla
          </Link>
        </div>

        {templates.length === 0 ? (
          <p className="text-foreground/70">
            Todavía no hay plantillas. Crea la primera para empezar.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between gap-4 border-b border-muted pb-3"
              >
                <Link href={`/plantillas/${template.id}`} className="flex-1">
                  <span className="block font-medium">{template.name}</span>
                  <span className="block text-sm text-foreground/70">
                    {template._count.tasks}{" "}
                    {template._count.tasks === 1 ? "tarea" : "tareas"}
                    {template.recurrences.length > 0
                      ? ` · ${formatWeekdays(
                          template.recurrences.map((r) => r.weekday)
                        )}`
                      : ""}
                  </span>
                </Link>
                <DeleteTemplateButton id={template.id} name={template.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

import { ActiveWorkout } from "@/components/fitness/ActiveWorkout";
import { StartDayButton } from "@/components/fitness/StartDayButton";
import { prisma } from "@/lib/prisma";
import {
  loadActiveSessionDto,
  primaryMuscle,
} from "@/lib/fitness/sessions";
import type { MuscleMap } from "@/lib/fitness/seed-data";
import { isoWeekday, localDateKey } from "@/lib/fitness/week";

export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const active = await loadActiveSessionDto();

  if (active) {
    const exercises = await prisma.exercise.findMany({
      where: { active: true },
      select: { id: true, name: true, muscles: true },
    });
    const catalog = exercises.map((e) => ({
      id: e.id,
      name: e.name,
      primaryMuscle: primaryMuscle(e.muscles as MuscleMap),
    }));
    return <ActiveWorkout key={active.id} initial={active} catalog={catalog} />;
  }

  const days = await prisma.routineDay.findMany({
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { name: true } } },
      },
    },
  });
  const todayWeekday = isoWeekday(localDateKey());

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-bold">Workout</h1>

        {days.map((day) => (
          <details
            key={day.id}
            open={day.dayOfWeek === todayWeekday}
            className="group rounded-xl border border-muted bg-surface"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-col">
                <span className="font-semibold">
                  {day.label}
                  {day.dayOfWeek === todayWeekday && (
                    <span className="ml-2 text-xs font-normal text-accent">
                      Hoy
                    </span>
                  )}
                </span>
                <span className="text-sm text-foreground/60">
                  {day.subtitle}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-foreground/50 transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>

            <div className="flex flex-col gap-4 border-t border-muted p-4">
              <ol className="flex flex-col gap-3">
                {day.exercises.map((x, i) => (
                  <li key={x.id} className="flex gap-3">
                    <span className="w-5 shrink-0 text-right tabular-nums text-foreground/50">
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span>{x.exercise.name}</span>
                        <span className="text-sm tabular-nums text-foreground/60">
                          {x.sets}×{x.reps} RIR {x.rir}
                        </span>
                      </span>
                      {x.note && (
                        <span className="text-sm text-foreground/60">
                          {x.note}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <StartDayButton routineDayKey={day.key} label={day.label} />
            </div>
          </details>
        ))}

        <p className="text-sm text-foreground/60">
          Compuestos a RIR 2, aislamientos a RIR 1 (la última serie puede ir a
          0). Tríceps nunca por debajo de RIR 2.
        </p>
      </div>
    </main>
  );
}

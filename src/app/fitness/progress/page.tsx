import Link from "next/link";
import { Sparkline } from "@/components/fitness/Sparkline";
import { TrophyIcon } from "@/components/fitness/TrophyIcon";
import { VolumeChart } from "@/components/fitness/VolumeChart";
import { parseDateKey } from "@/lib/date";
import { formatDateShort, formatSet } from "@/lib/fitness/format";
import { loadExerciseProgress, loadWeekVolume } from "@/lib/fitness/progress";
import { plannedVolume } from "@/lib/fitness/volume";
import { addDays, localDateKey, weekStart } from "@/lib/fitness/week";

export const dynamic = "force-dynamic";

const SPARKLINE_SESSIONS = 12;
const NAV_BUTTON =
  "flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-muted px-3 transition-colors";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string | string[] }>;
}) {
  const { semana } = await searchParams;
  const currentWeek = weekStart(localDateKey());
  const requested = typeof semana === "string" ? semana : null;
  // Any day of a past week selects that week; the future is clamped to this one.
  const week =
    requested && parseDateKey(requested)
      ? weekStart(requested) > currentWeek
        ? currentWeek
        : weekStart(requested)
      : currentWeek;

  const [done, exercises] = await Promise.all([
    loadWeekVolume(week),
    loadExerciseProgress(),
  ]);
  const planned = plannedVolume();
  const isCurrent = week === currentWeek;
  const sorted = [...exercises].sort(
    (a, b) =>
      b.sessions.length - a.sessions.length || a.name.localeCompare(b.name, "es")
  );

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-3xl font-bold">Progress</h1>

        <section className="flex flex-col gap-4 rounded-xl border border-muted bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Series por semana
            </h2>
            <nav aria-label="Semana" className="flex items-center justify-between gap-2 sm:justify-end">
              <Link
                href={`/fitness/progress?semana=${addDays(week, -7)}`}
                aria-label="Semana anterior"
                className={`${NAV_BUTTON} hover:border-accent`}
              >
                ←
              </Link>
              <span className="min-w-36 text-center text-sm tabular-nums">
                {formatDateShort(week)} – {formatDateShort(addDays(week, 6))}
              </span>
              {isCurrent ? (
                <span
                  aria-disabled="true"
                  aria-label="Semana siguiente (no disponible)"
                  className={`${NAV_BUTTON} opacity-30`}
                >
                  →
                </span>
              ) : (
                <Link
                  href={`/fitness/progress?semana=${addDays(week, 7)}`}
                  aria-label="Semana siguiente"
                  className={`${NAV_BUTTON} hover:border-accent`}
                >
                  →
                </Link>
              )}
            </nav>
          </div>
          <VolumeChart done={done} planned={planned} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            Ejercicios
          </h2>
          {sorted.length === 0 ? (
            <p className="text-foreground/60">
              Aún no hay ejercicios registrados. Termina una sesión para ver tu
              progreso aquí.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sorted.map((exercise) => {
                const recent = exercise.sessions.slice(-SPARKLINE_SESSIONS);
                // Bodyweight exercises never have a max weight, so chart reps instead.
                const byWeight = recent.some((s) => s.maxWeight > 0);
                return (
                  <li
                    key={exercise.exerciseId}
                    className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-snug">
                        {exercise.name}
                      </h3>
                      <span className="shrink-0 text-sm tabular-nums text-foreground/60">
                        {exercise.sessions.length}{" "}
                        {exercise.sessions.length === 1 ? "sesión" : "sesiones"}
                      </span>
                    </div>
                    <p className="flex items-center gap-2 text-pr-gold">
                      <TrophyIcon />
                      <span className="font-semibold tabular-nums">
                        {formatSet(exercise.pr.weightKg, exercise.pr.reps)}
                      </span>
                      <span className="text-sm text-foreground/60">
                        {formatDateShort(exercise.pr.date)}
                      </span>
                    </p>
                    <Sparkline
                      values={recent.map((s) =>
                        byWeight ? s.maxWeight : s.bestReps
                      )}
                      label={`${byWeight ? "Peso máximo" : "Repeticiones"} por sesión de ${exercise.name}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

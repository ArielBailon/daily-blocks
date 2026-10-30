import { QuickStart } from "@/components/fitness/QuickStart";
import { WeightCard } from "@/components/fitness/WeightCard";
import { loadDashboard } from "@/lib/fitness/dashboard";
import { formatDateShort, formatSet } from "@/lib/fitness/format";

export const dynamic = "force-dynamic";

const CARD = "flex flex-col gap-3 rounded-xl border border-muted bg-surface p-4";
const CARD_TITLE =
  "text-sm font-semibold uppercase tracking-wide text-foreground/60";

export default async function FitnessDashboardPage() {
  const data = await loadDashboard();
  const { stats } = data;

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <WeightCard
              initialEntries={data.weights}
              initialGoal={data.goal}
              todayKey={data.todayKey}
            />

            <section className="grid grid-cols-3 gap-3">
              <Stat value={stats.streak} label="Racha (días)" />
              <Stat value={`${stats.thisWeek} / 5`} label="Esta semana" />
              <Stat value={stats.total} label="Sesiones" />
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <QuickStart
              days={data.days}
              todayWeekday={data.todayWeekday}
              active={data.active}
            />

            <section className={CARD}>
              <h2 className={CARD_TITLE}>Mejores marcas (1RM estimado)</h2>
              {data.topPRs.length === 0 ? (
                <p className="text-foreground/60">
                  Aún no hay marcas. Termina tu primera sesión para empezar.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {data.topPRs.map((pr, i) => (
                    <li
                      key={pr.exerciseId}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span>
                        <span className="mr-2 text-pr-gold tabular-nums">
                          {i + 1}
                        </span>
                        {pr.name}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="font-semibold">
                          {formatSet(pr.weightKg, pr.reps)}
                        </span>
                        <span className="block text-xs text-foreground/50">
                          {formatDateShort(pr.date)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className={CARD}>
              <h2 className={CARD_TITLE}>Cardio semanal</h2>
              <ul className="flex flex-col gap-1 text-foreground/80">
                <li>5 × 20 min post-sesión en zona 2 (8–12 % de inclinación)</li>
                <li>2 × 60 min de paseo, jueves y domingo</li>
              </ul>
              <p className="text-sm text-foreground/60">Total: ~220 min</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-muted bg-surface p-3">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-foreground/60">{label}</p>
    </div>
  );
}

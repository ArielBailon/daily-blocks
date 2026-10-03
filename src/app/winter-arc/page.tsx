import { closePastPlans } from "@/lib/daily-plan";
import { resolveToday, toDateKey } from "@/lib/date";
import { ARC_DAYS, ARC_START } from "@/lib/arc/config";
import { loadArcPlans } from "@/lib/arc/load";
import { computeArc } from "@/lib/arc/summary";
import { arcProgress, currentWeek, parseDayParam } from "@/lib/arc/view";
import { ArcGrid } from "@/components/winter-arc/ArcGrid";
import { DayDetail } from "@/components/winter-arc/DayDetail";
import { RulePercentages } from "@/components/winter-arc/RulePercentages";
import { WeekPace } from "@/components/winter-arc/WeekPace";

export const dynamic = "force-dynamic";

export default async function WinterArcPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string | string[] }>;
}) {
  const { dia } = await searchParams;
  const { date: today } = resolveToday();
  const todayKey = toDateKey(today);

  await closePastPlans(today);
  const summary = computeArc(await loadArcPlans(), todayKey);
  const progress = arcProgress(todayKey);
  const week = currentWeek(summary, todayKey);

  const requested = parseDayParam(dia);
  const selected =
    requested ?? (progress.kind === "during" ? progress.day : null);
  const detail = selected ? summary.days[selected - 1] : null;

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Winter Arc</h1>
          <p className="text-foreground/70">
            {progress.kind === "before" && `El reto empieza el ${ARC_START}.`}
            {progress.kind === "during" && `Día ${progress.day} de ${ARC_DAYS}`}
            {progress.kind === "after" && `El reto de ${ARC_DAYS} días terminó.`}
          </p>
        </header>

        <section className="flex gap-8 rounded-xl border border-muted bg-surface p-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {summary.streak.current}
            </p>
            <p className="text-sm text-foreground/60">Racha actual</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {summary.streak.best}
            </p>
            <p className="text-sm text-foreground/60">Mejor racha</p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {week && <WeekPace week={week} />}
          <RulePercentages rules={summary.rules} />
        </div>

        <ArcGrid days={summary.days} todayKey={todayKey} selected={selected} />
        {detail && <DayDetail day={detail} />}
      </div>
    </main>
  );
}

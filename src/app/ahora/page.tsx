import { getDayPlan } from "@/lib/daily-plan";
import { resolveToday, serverNowMs, toDateKey } from "@/lib/date";
import { AhoraView } from "@/components/ahora/AhoraView";
import { FocusBar } from "@/components/focus/FocusBar";
import { FocusProvider } from "@/components/focus/FocusProvider";

export const dynamic = "force-dynamic";

// Read only: unlike Hoy, this page does not close past plans.
export default async function AhoraPage() {
  const initialNowMs = serverNowMs();
  const { date: today } = resolveToday(new Date(initialNowMs));
  const plan = await getDayPlan(today);
  const blocks = (plan?.blocks ?? []).map(
    ({ id, startTime, activity, tag, completed }) => ({
      id,
      startTime,
      activity,
      tag,
      completed,
    })
  );

  return (
    <FocusProvider
      dateKey={toDateKey(today)}
      blocks={blocks.map(({ id, startTime, activity, tag }) => ({
        id,
        startTime,
        activity,
        tag,
      }))}
    >
      <AhoraView
        dateKey={toDateKey(today)}
        initialNowMs={initialNowMs}
        blocks={blocks}
      />
      <FocusBar />
    </FocusProvider>
  );
}

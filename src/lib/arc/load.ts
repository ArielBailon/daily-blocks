import { prisma } from "@/lib/prisma";
import { ARC_START } from "@/lib/arc/config";
import { arcEnd, type ArcDayInput } from "@/lib/arc/rules";
import { parseDateKey, toDateKey } from "@/lib/date";

// Plans inside the arc range, mapped for the rule engine.
export async function loadArcPlans(): Promise<ArcDayInput[]> {
  const first = parseDateKey(ARC_START);
  const last = parseDateKey(arcEnd());
  if (!first || !last) throw new Error("Invalid arc range");
  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: first, lte: last } },
    include: { blocks: { orderBy: { startTime: "asc" } } },
  });
  return plans.map((plan) => ({
    date: toDateKey(plan.date),
    blocks: plan.blocks.map((b) => ({
      startTime: b.startTime,
      completed: b.completed,
      tag: b.tag,
    })),
  }));
}

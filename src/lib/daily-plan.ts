import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveToday } from "@/lib/date";
import { buildBlockTimes } from "@/lib/blocks";

const blocksInOrder = { blocks: { orderBy: { startTime: "asc" as const } } };

export function getDayPlan(date: Date) {
  return prisma.dailyPlan.findUnique({ where: { date }, include: blocksInOrder });
}

export type GenerateDayResult =
  | { kind: "ok"; plan: NonNullable<Awaited<ReturnType<typeof getDayPlan>>> }
  | { kind: "needs-confirmation"; count: number }
  | { kind: "closed" };

// Creates the day's blocks for [startTime, endTime). Blocks already inside the
// range are kept as they are; blocks outside it are deleted, but blocks with
// content (activity or check) are only deleted when confirmRemoval is true.
export async function generateDay(input: {
  date: Date;
  startTime: string;
  endTime: string;
  confirmRemoval: boolean;
}): Promise<GenerateDayResult> {
  const run = () =>
    prisma.$transaction(async (tx): Promise<GenerateDayResult> => {
      const { date, startTime, endTime } = input;
      const plan = await tx.dailyPlan.upsert({
        where: { date },
        create: { date, startTime, endTime },
        update: {},
        include: { blocks: true },
      });
      if (plan.closed) {
        return { kind: "closed" };
      }

      const wanted = buildBlockTimes(startTime, endTime);
      const outside = plan.blocks.filter((b) => !wanted.includes(b.startTime));
      const withContent = outside.filter((b) => b.activity !== "" || b.completed);
      if (withContent.length > 0 && !input.confirmRemoval) {
        return { kind: "needs-confirmation", count: withContent.length };
      }

      if (outside.length > 0) {
        await tx.block.deleteMany({
          where: { id: { in: outside.map((b) => b.id) } },
        });
      }
      await tx.block.createMany({
        data: wanted.map((time) => ({ dailyPlanId: plan.id, startTime: time })),
        skipDuplicates: true,
      });
      const updated = await tx.dailyPlan.update({
        where: { id: plan.id },
        data: { startTime, endTime },
        include: blocksInOrder,
      });
      return { kind: "ok", plan: updated };
    });

  try {
    return await run();
  } catch (error) {
    // A concurrent first generate for the same date can race on the unique date.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return run();
    }
    throw error;
  }
}

export async function closePastPlans(today: Date) {
  await prisma.dailyPlan.updateMany({
    where: { date: { lt: today }, closed: false },
    data: { closed: true },
  });
}

export async function getPastPlansSummary() {
  const { date: today } = resolveToday();
  await closePastPlans(today);

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { lt: today } },
    orderBy: { date: "desc" },
    select: { id: true, date: true, tasks: { select: { completed: true } } },
  });

  return plans.map((plan) => {
    const total = plan.tasks.length;
    const completed = plan.tasks.filter((task) => task.completed).length;
    return {
      id: plan.id,
      date: plan.date,
      total,
      completed,
      percent: total === 0 ? null : Math.round((completed / total) * 100),
    };
  });
}

// Like getOrCreateTodayPlan, but when no template applies it creates an empty
// plan (templateId null) so a task can be added by hand.
export async function getOrCreateTodayPlanForEdit() {
  const plan = await getOrCreateTodayPlan();
  if (plan) {
    return plan;
  }

  const { date } = resolveToday();
  try {
    return await prisma.dailyPlan.create({
      data: { date, templateId: null },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.dailyPlan.findUniqueOrThrow({
        where: { date },
        include: { tasks: { orderBy: { order: "asc" } } },
      });
    }
    throw error;
  }
}

export async function getOrCreateTodayPlan() {
  const { date, weekday } = resolveToday();
  await closePastPlans(date);

  const existing = await prisma.dailyPlan.findUnique({
    where: { date },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (existing) {
    return existing;
  }

  const recurrence = await prisma.templateRecurrence.findUnique({
    where: { weekday },
  });
  const templateId =
    recurrence?.templateId ??
    (await prisma.template.findFirst({ where: { isDefault: true } }))?.id ??
    null;
  if (templateId === null) {
    return null;
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (!template) {
    return null;
  }

  try {
    return await prisma.dailyPlan.create({
      data: {
        date,
        templateId,
        tasks: {
          create: template.tasks.map((task, index) => ({
            title: task.title,
            suggestedTime: task.suggestedTime,
            completed: false,
            order: index,
          })),
        },
      },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.dailyPlan.findUnique({
        where: { date },
        include: { tasks: { orderBy: { order: "asc" } } },
      });
    }
    throw error;
  }
}

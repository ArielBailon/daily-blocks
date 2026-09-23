import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveToday } from "@/lib/date";

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

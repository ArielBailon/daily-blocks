import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildBlockTimes } from "@/lib/blocks";
import { getDefaultBlocks, planDefaultContent } from "@/lib/default-blocks";

const blocksInOrder = { blocks: { orderBy: { startTime: "asc" as const } } };

export function getDayPlan(date: Date) {
  return prisma.dailyPlan.findUnique({ where: { date }, include: blocksInOrder });
}

// Plans with a date in [from, to], oldest first. Days without a plan are absent.
export function getDayPlansInRange(from: Date, to: Date) {
  return prisma.dailyPlan.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    include: blocksInOrder,
  });
}

export type GenerateDayResult =
  | { kind: "ok"; plan: NonNullable<Awaited<ReturnType<typeof getDayPlan>>> }
  | { kind: "needs-confirmation"; count: number }
  | { kind: "closed" };

// Creates the day's blocks for [startTime, endTime], preloading the weekday's
// default routine. Blocks already inside the range are kept as they are (empty
// ones get the routine); blocks outside it are deleted, but blocks with content
// (activity, check, or tag) are only deleted when confirmRemoval is true.
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
      const withContent = outside.filter(
        (b) => b.activity !== "" || b.completed || b.tag !== null
      );
      if (withContent.length > 0 && !input.confirmRemoval) {
        return { kind: "needs-confirmation", count: withContent.length };
      }

      if (outside.length > 0) {
        await tx.block.deleteMany({
          where: { id: { in: outside.map((b) => b.id) } },
        });
      }
      const { create, fill } = planDefaultContent(
        wanted,
        plan.blocks,
        getDefaultBlocks(date)
      );
      await tx.block.createMany({
        data: create.map((b) => ({ ...b, dailyPlanId: plan.id })),
        skipDuplicates: true,
      });
      for (const { id, activity, tag } of fill) {
        await tx.block.update({ where: { id }, data: { activity, tag } });
      }
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

export type SaveMiscTasksResult =
  | { kind: "ok"; tasks: string[] }
  | { kind: "closed" };

// Replaces the day's "Tareas varias" list, creating the plan (with the schema's
// default range and no blocks) when the day has none yet.
export async function saveMiscTasks(input: {
  date: Date;
  tasks: string[];
}): Promise<SaveMiscTasksResult> {
  const run = () =>
    prisma.$transaction(async (tx): Promise<SaveMiscTasksResult> => {
      const { date, tasks } = input;
      const plan = await tx.dailyPlan.upsert({
        where: { date },
        create: { date, miscTasks: tasks },
        update: {},
      });
      if (plan.closed) {
        return { kind: "closed" };
      }
      const updated = await tx.dailyPlan.update({
        where: { id: plan.id },
        data: { miscTasks: tasks },
      });
      return { kind: "ok", tasks: updated.miscTasks };
    });

  try {
    return await run();
  } catch (error) {
    // A concurrent first save for the same date can race on the unique date.
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

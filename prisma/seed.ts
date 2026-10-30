import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_GOAL,
  EXERCISES,
  MUSCLE_GROUPS,
  ROUTINE,
} from "../src/lib/fitness/seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  for (const m of MUSCLE_GROUPS) {
    await prisma.muscleGroup.upsert({ where: { key: m.key }, create: m, update: m });
  }

  const ids = new Map<string, number>();
  for (const e of EXERCISES) {
    const data = {
      name: e.name,
      muscles: e.muscles,
      isElbowFriendly: e.isElbowFriendly ?? true,
    };
    const row = await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: { slug: e.slug, ...data },
      update: data,
    });
    ids.set(e.slug, row.id);
  }

  for (const d of ROUTINE) {
    const fields = {
      label: d.label,
      subtitle: d.subtitle,
      dayOfWeek: d.dayOfWeek,
      order: d.dayOfWeek,
    };
    const day = await prisma.routineDay.upsert({
      where: { key: d.key },
      create: { key: d.key, ...fields },
      update: fields,
    });

    // The routine is replaced wholesale so removed entries don't linger.
    await prisma.routineExercise.deleteMany({ where: { routineDayId: day.id } });
    await prisma.routineDayMobility.deleteMany({ where: { routineDayId: day.id } });
    await prisma.routineExercise.createMany({
      data: d.exercises.map((x, i) => ({
        routineDayId: day.id,
        exerciseId: ids.get(x.slug)!,
        order: i + 1,
        sets: x.sets,
        reps: x.reps,
        rir: x.rir,
        note: x.note ?? null,
      })),
    });
    await prisma.routineDayMobility.createMany({
      data: [
        ...d.warmup.map((text, i) => ({
          routineDayId: day.id,
          type: "WARMUP" as const,
          order: i,
          text,
        })),
        ...d.cooldown.map((text, i) => ({
          routineDayId: day.id,
          type: "COOLDOWN" as const,
          order: i,
          text,
        })),
      ],
    });
  }

  if ((await prisma.fitnessGoal.count()) === 0) {
    await prisma.fitnessGoal.create({
      data: { ...DEFAULT_GOAL, startedOn: new Date(Date.UTC(2026, 9, 30)) },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

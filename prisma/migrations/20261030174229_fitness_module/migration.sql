-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "MobilityType" AS ENUM ('WARMUP', 'COOLDOWN');

-- CreateEnum
CREATE TYPE "GoalPhase" AS ENUM ('CUT', 'BULK');

-- CreateTable
CREATE TABLE "MuscleGroup" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mev" INTEGER NOT NULL,
    "mavLow" INTEGER NOT NULL,
    "mavHigh" INTEGER NOT NULL,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscles" JSONB NOT NULL,
    "isElbowFriendly" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineDay" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoutineDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" SERIAL NOT NULL,
    "routineDayId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "rir" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineDayMobility" (
    "id" SERIAL NOT NULL,
    "routineDayId" INTEGER NOT NULL,
    "type" "MobilityType" NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "RoutineDayMobility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" SERIAL NOT NULL,
    "routineDayId" INTEGER,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "warmupChecked" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "cooldownChecked" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionExercise" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "target" TEXT NOT NULL,
    "note" TEXT,
    "isPR" BOOLEAN NOT NULL DEFAULT false,
    "bestWeight" DECIMAL(6,2),
    "bestReps" INTEGER,

    CONSTRAINT "SessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" SERIAL NOT NULL,
    "sessionExerciseId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2),
    "reps" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyWeightEntry" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "kg" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "BodyWeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessGoal" (
    "id" SERIAL NOT NULL,
    "startKg" DECIMAL(5,2) NOT NULL DEFAULT 80,
    "goalLowKg" DECIMAL(5,2) NOT NULL DEFAULT 69,
    "goalHighKg" DECIMAL(5,2) NOT NULL DEFAULT 70,
    "targetRateKgPerWeek" DECIMAL(4,2) NOT NULL DEFAULT 0.5,
    "phase" "GoalPhase" NOT NULL DEFAULT 'CUT',
    "startedOn" DATE NOT NULL,

    CONSTRAINT "FitnessGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineDay_key_key" ON "RoutineDay"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExercise_routineDayId_order_key" ON "RoutineExercise"("routineDayId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineDayMobility_routineDayId_type_order_key" ON "RoutineDayMobility"("routineDayId", "type", "order");

-- CreateIndex
CREATE INDEX "WorkoutSession_date_idx" ON "WorkoutSession"("date");

-- CreateIndex
CREATE INDEX "WorkoutSession_status_date_idx" ON "WorkoutSession"("status", "date");

-- CreateIndex
CREATE INDEX "SessionExercise_exerciseId_idx" ON "SessionExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "SessionExercise_sessionId_order_idx" ON "SessionExercise"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SetLog_sessionExerciseId_setNumber_key" ON "SetLog"("sessionExerciseId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BodyWeightEntry_date_key" ON "BodyWeightEntry"("date");

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineDayMobility" ADD CONSTRAINT "RoutineDayMobility_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "SessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one in-progress workout (single-user app). Prisma cannot express partial indexes.
CREATE UNIQUE INDEX "WorkoutSession_single_in_progress" ON "WorkoutSession" ((1)) WHERE "status" = 'IN_PROGRESS';

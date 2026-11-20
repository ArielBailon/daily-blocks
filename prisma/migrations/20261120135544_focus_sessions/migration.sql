-- CreateEnum
CREATE TYPE "FocusStatus" AS ENUM ('WORKING', 'PAUSED', 'BREAK', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" SERIAL NOT NULL,
    "dailyPlanId" INTEGER NOT NULL,
    "blockIds" INTEGER[],
    "preset" TEXT NOT NULL,
    "workMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "workEndsAt" TIMESTAMP(3) NOT NULL,
    "breakEndsAt" TIMESTAMP(3) NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "pausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" "FocusStatus" NOT NULL,
    "breakSkipped" BOOLEAN NOT NULL DEFAULT false,
    "actualWorkSeconds" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_dailyPlanId_idx" ON "FocusSession"("dailyPlanId");

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one active focus session.
CREATE UNIQUE INDEX "FocusSession_single_active" ON "FocusSession" ((1)) WHERE "status" IN ('WORKING', 'PAUSED', 'BREAK');

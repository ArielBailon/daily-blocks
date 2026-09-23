-- AlterTable
ALTER TABLE "DailyPlan" ADD COLUMN     "endTime" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "miscTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "startTime" TEXT NOT NULL DEFAULT '07:30';

-- CreateTable
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "dailyPlanId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "activity" TEXT NOT NULL DEFAULT '',
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_dailyPlanId_startTime_key" ON "Block"("dailyPlanId", "startTime");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

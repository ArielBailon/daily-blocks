/*
  Warnings:

  - You are about to drop the column `templateId` on the `DailyPlan` table. All the data in the column will be lost.
  - You are about to drop the `DailyTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateRecurrence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyPlan" DROP CONSTRAINT "DailyPlan_templateId_fkey";

-- DropForeignKey
ALTER TABLE "DailyTask" DROP CONSTRAINT "DailyTask_dailyPlanId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateRecurrence" DROP CONSTRAINT "TemplateRecurrence_templateId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateTask" DROP CONSTRAINT "TemplateTask_templateId_fkey";

-- AlterTable
ALTER TABLE "DailyPlan" DROP COLUMN "templateId";

-- DropTable
DROP TABLE "DailyTask";

-- DropTable
DROP TABLE "Template";

-- DropTable
DROP TABLE "TemplateRecurrence";

-- DropTable
DROP TABLE "TemplateTask";

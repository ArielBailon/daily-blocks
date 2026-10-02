-- CreateEnum
CREATE TYPE "BlockTag" AS ENUM ('DEEP', 'LINKEDIN', 'GYM', 'WALK', 'PROTEIN', 'APPLY', 'INTERVIEW', 'SCREENS_OFF', 'BED');

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "tag" "BlockTag";

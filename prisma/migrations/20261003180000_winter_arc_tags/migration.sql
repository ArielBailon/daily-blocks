-- Tags that no rule uses lose their value on existing blocks.
UPDATE "Block" SET "tag" = NULL WHERE "tag" IN ('INTERVIEW', 'LINKEDIN', 'BED');

-- AlterEnum: APPLY becomes JOB_HUNTING, keeping existing blocks tagged.
ALTER TYPE "BlockTag" RENAME VALUE 'APPLY' TO 'JOB_HUNTING';

-- Postgres cannot drop enum values: recreate the type without the removed ones.
CREATE TYPE "BlockTag_new" AS ENUM ('DEEP', 'GYM', 'WALK', 'PROTEIN', 'JOB_HUNTING', 'SCREENS_OFF');
ALTER TABLE "Block" ALTER COLUMN "tag" TYPE "BlockTag_new" USING ("tag"::text::"BlockTag_new");
DROP TYPE "BlockTag";
ALTER TYPE "BlockTag_new" RENAME TO "BlockTag";

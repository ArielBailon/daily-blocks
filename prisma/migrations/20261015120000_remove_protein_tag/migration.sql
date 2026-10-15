-- The PROTEIN tag is retired: existing blocks keep their activity but lose the tag.
UPDATE "Block" SET "tag" = NULL WHERE "tag" = 'PROTEIN';

-- Postgres cannot drop enum values: recreate the type without PROTEIN.
CREATE TYPE "BlockTag_new" AS ENUM ('DEEP', 'GYM', 'WALK', 'JOB_HUNTING', 'SCREENS_OFF');
ALTER TABLE "Block" ALTER COLUMN "tag" TYPE "BlockTag_new" USING ("tag"::text::"BlockTag_new");
DROP TYPE "BlockTag";
ALTER TYPE "BlockTag_new" RENAME TO "BlockTag";

# Feature: Block day model

**From build-plan:** feature 12
**Build attempt:** 1
**Branch:** feature/block-day-model
**Status:** verified

## Goal

The database can store a day planned in blocks:
- `DailyPlan` gains its time range (`startTime`, `endTime`) and the "Tareas
  varias" log (`miscTasks`);
- a new `Block` model holds each 30-minute block's activity and completion.

The change is purely additive. Existing plans, tasks, templates, and every
current screen keep working exactly as they do now.

## In scope

- Prisma schema changes, and one additive migration applied with
  `prisma migrate dev`.
- A regenerated Prisma client, so later features (13, 14, 15) can use the new
  fields and model.

## Out of scope

- Any UI, route, or query change. "Hoy" keeps its current task list until 13.
- Creating blocks. Nothing writes `Block` rows yet. Generation and editing
  are 13.
- Removing templates or `DailyTask`. That's 16, destructive, and last.
- Validation rules for times (only `:00`/`:30`, start < end). They're enforced
  where the values are written, in 13.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Schema.** In `prisma/schema.prisma`, make these changes:
      - `DailyPlan` gains:
        ```prisma
        startTime String   @default("07:30")
        endTime   String   @default("18:00")
        miscTasks String[] @default([])
        blocks    Block[]
        ```
      - New model:
        ```prisma
        model Block {
          id          Int       @id @default(autoincrement())
          dailyPlanId Int
          dailyPlan   DailyPlan @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
          startTime   String
          activity    String    @default("")
          completed   Boolean   @default(false)

          @@unique([dailyPlanId, startTime])
        }
        ```
      - Leave `templateId`, `tasks`, and all legacy models untouched.

      *Done when:*
      - `npx prisma validate --config prisma7.config.ts` passes.
      - An offline preview contains only additive SQL:
        - `CREATE TABLE "Block"`;
        - the unique index;
        - the foreign key with `ON DELETE CASCADE`;
        - `ALTER TABLE "DailyPlan" ADD COLUMN` × 3, each with a default.

        Preview command: `npx prisma migrate diff --config prisma7.config.ts
        --from-schema <HEAD schema copy> --to-schema prisma/schema.prisma
        --script`. The preview must contain no `DROP` and no `ALTER COLUMN`.

- [x] **2. Apply the migration (after user confirmation).**
      - Show the user the preview SQL, then ask before touching the database.
        `.env` points at the hosted Prisma Postgres, the project's only
        database.
      - After a yes, run `npx prisma migrate dev --config prisma7.config.ts
        --name block_day_model < /dev/null`. With stdin closed, a reset prompt
        fails instead of being accepted.
      - If Prisma reports drift or wants a reset, stop and report. Never run
        `migrate reset` or `db push`.
      - If Prisma rewrites `prisma/migrations/migration_lock.toml` with only a
        line-ending change, restore it with `git checkout --`.

      *Done when:*
      - `prisma/migrations/<timestamp>_block_day_model/migration.sql` matches
        the preview.
      - `npx prisma migrate status --config prisma7.config.ts` reports
        "Database schema is up to date!".
      - `npm run lint` and `npm run build` pass. The regenerated client
        exposes `prisma.block`, `DailyPlan.startTime`, `endTime`, and
        `miscTasks`.

## Files / areas

- `prisma/schema.prisma`.
- `prisma/migrations/<timestamp>_block_day_model/migration.sql`: new.
- `src/generated/prisma/**` is regenerated and gitignored, so it doesn't go
  in the commit.

## Data / contracts

- **`DailyPlan.startTime` and `DailyPlan.endTime`:** `TEXT NOT NULL`,
  24-hour `"HH:MM"`, defaults `"07:30"` and `"18:00"`. Existing rows get the
  defaults. The range is `[startTime, endTime)` in 30-minute steps, and the
  `:00`/`:30` and start < end rules are enforced by the writer in 13.
- **`DailyPlan.miscTasks`:** Prisma `String[]` with `@default([])`. It's an
  ordered list of task texts, in insertion order. Existing rows get an empty
  list.
  - **As built:** Prisma emits `TEXT[] DEFAULT ARRAY[]::TEXT[]` without
    `NOT NULL`. That's Prisma's standard for scalar lists, which can't be
    declared optional. The Prisma client types the field as a non-null
    `string[]`, and every write goes through Prisma, so no nulls appear.
- **`Block`:**
  - `startTime` is `"HH:MM"`, and it's unique per plan
    (`@@unique([dailyPlanId, startTime])`). The unique index also covers
    lookups by `dailyPlanId`, because that's its leading column.
  - `activity` is free text, `""` by default. An empty block is valid.
  - `completed` defaults to `false`.
  - Deleting a plan deletes its blocks (`ON DELETE CASCADE`).
- **Close-out:** `DailyPlan.closed` keeps its meaning (feature 8), and
  `closePastPlans()` already covers the new fields, because it flags the
  whole plan. The rule that closed days are read-only for blocks and misc
  tasks is enforced by the writers in 13 and 14.
- No data is deleted or rewritten.

## Testing

- No test runner and no Verify command are configured. The gates are
  `prisma validate`, the offline SQL preview, `migrate status`,
  `npm run lint`, and `npm run build`.
- Nothing is user-visible, so there's no browser or manual check. The app
  should look and behave exactly as before on `npm run dev`.

## Notes for the AI

- The repo's Prisma config is `prisma7.config.ts`, not the default name, so
  every Prisma command needs `--config prisma7.config.ts`.
- The discarded 11a attempt had added and then dropped `startTime`/`endTime`,
  and removed its migration record. The database currently matches
  `master`'s single `init` migration, so this migration applies cleanly.
- Coding standards: schema changes go through `prisma migrate dev` (not
  `db push`), and `prisma migrate status` must be run before committing.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6282,"specSha256":"cf457fa484305de98c7fd55b4434cd78ef8a40a532eb4ee2fd5223fbb105d11a","branch":"refs/heads/feature/block-day-model","head":"184e8070cc251db0d461b81fd3895530177b4960","baseRef":"refs/heads/master","baseCommit":"184e8070cc251db0d461b81fd3895530177b4960","sourceTree":"f2585658fa0df7b8c3ee1a9690bab320c8160080","absentOptional":[]} -->

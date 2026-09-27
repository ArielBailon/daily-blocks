# Fix: Rango predeterminado y hora fin inclusiva

**Type:** Fix
**Status:** verified
**Branch:** fix/rango-predeterminado-y-hora-fin-inclusiva

## The problem

- **The end time is exclusive.** `buildBlockTimes` in `src/lib/blocks.ts`
  generates blocks for `[start, end)` (`t < last`). With end 18:00, the last
  block created is 17:30, but the user expects the end hour to have its own
  block (18:00).
- **The default range is 07:30–18:00.** It is set in two places:
  - `DEFAULT_START`/`DEFAULT_END` in `src/app/page.tsx`, which fill the form
    when the day has no plan.
  - `@default("07:30")`/`@default("18:00")` on `DailyPlan` in
    `prisma/schema.prisma`, which is used when "Tareas varias" creates a plan
    before any day is generated (`saveMiscTasks` in `src/lib/daily-plan.ts`).

  The user wants 06:30–21:00.

## The fix

- **Inclusive end:** `buildBlockTimes` covers `[start, end]` (`t <= last`), so
  the last block starts exactly at the end time. For example, 06:30–21:00
  creates 30 blocks, from 06:30 to 21:00.
- **Validation:** the rule `start < end` in `src/lib/validation/day.ts` and
  `isValidRange` stays as it is. The largest possible end, 23:30, still
  produces a valid block.
- **New defaults 06:30 / 21:00** in `page.tsx` and in the schema, with an
  additive Prisma migration that only changes the column defaults
  (`ALTER COLUMN ... SET DEFAULT`). Existing rows are not touched.
- **Must not break:**
  - Days already generated keep their saved `endTime`. If "Generar día" is run
    again with end 18:00, it now adds the 18:00 block and keeps what was
    already written.
  - The confirmation before deleting blocks with text outside the range keeps
    working with the new range.
  - Closed days (history) stay read-only and are not recalculated.
- **Plans:** update the defaults in `blueprint/project-plan.md` (§3 and §4)
  and state that the end is inclusive. Then regenerate the overview, which
  currently says "exclusive; blocks cover `[startTime, endTime)`".

## Build steps

- [x] **1. Inclusive end.** Change `buildBlockTimes` and its comment in
      `src/lib/blocks.ts`, and update the comment in `generateDay`
      (`src/lib/daily-plan.ts`: "[startTime, endTime)").
      **Done when:** for 07:30–18:00, the block list ends at `18:00` (22
      blocks). This is checked with a Node script against the function, since
      the project has no test runner. Lint passes.
- [x] **2. New defaults.** Set `DEFAULT_START = "06:30"` and
      `DEFAULT_END = "21:00"` in `src/app/page.tsx`, update `@default` in
      `prisma/schema.prisma`, and create the migration with
      `prisma migrate dev` (using `--config prisma7.config.ts` if the project
      requires it). *Implemented:* the SQL was written by hand, because `.env`
      points to the shared database (`db.prisma.io`), and was applied with
      `prisma migrate deploy` after the user approved it.
      **Done when:** the migration contains only the two `SET DEFAULT`
      statements, `prisma migrate status` is in sync, and the build passes.
- [x] **3. Plans and overview.** Edit the project plan and regenerate the
      overview (defaults and inclusive end).
      **Done when:** neither file mentions 07:30/18:00 or an exclusive end.

## Verify

- `npm run lint` and `npm run build`.
- In the app, on a future date with no plan: the form shows 06:30 and 21:00.
  "Generar día" creates blocks from 06:30 to 21:00, and 21:00 is the last one.
- On a day that already has a plan, generate with end 18:00: the 18:00 block
  appears, and blocks with text are kept.
- Adding a task in "Tareas varias" on a date with no plan creates the plan with
  06:30–21:00. It can be checked in the form after reloading the page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3736,"specSha256":"7d9d97284c018b52cb9a3b60fa964d8d5dc787adbdab10b6fb8653e85e7f151d","branch":"refs/heads/fix/rango-predeterminado-y-hora-fin-inclusiva","head":"56113db0d49d78738a93a635b4684828c1943898","baseRef":"refs/heads/master","baseCommit":"56113db0d49d78738a93a635b4684828c1943898","sourceTree":"1d12373e92fd48d486382d49a8f963153ea00e59","absentOptional":[]} -->

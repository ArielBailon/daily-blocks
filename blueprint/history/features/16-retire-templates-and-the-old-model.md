# Feature: Retire templates and the old model

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/retire-templates-and-the-old-model
**Status:** verified

## Goal

Finish the move to the block planner. Remove the "Plantillas" section, its
routes, and template-based day generation. Drop the `Template`,
`TemplateTask`, `TemplateRecurrence`, and `DailyTask` tables with their data,
plus `DailyPlan.templateId`. After this, `DailyPlan` and `Block` are the whole
data model, matching the overview's target model.

## In scope

- **Navigation:** "Hoy" and "Historial" only.
- **Removed pages:** `/plantillas`, `/plantillas/nueva`, `/plantillas/[id]`.
  Visiting them gives Next's default 404.
- **Removed API routes:** `/api/templates`, `/api/templates/[id]`,
  `/api/daily-tasks`, `/api/daily-tasks/[id]`. They 404.
- **Removed code:** the template and daily-task components, validation, and
  the template-based generation in `src/lib/daily-plan.ts`
  (`getOrCreateTodayPlan`, `getOrCreateTodayPlanForEdit`).
- **Schema:** drop the four legacy models and `DailyPlan.templateId` (with its
  foreign key and the `template` and `tasks` relations) through one
  `prisma migrate dev` migration.

## Out of scope

- Any change to "Hoy", "Historial", blocks, or "Tareas varias" behavior.
- Migrating legacy data. The overview says it is deleted, not migrated. On
  2026-09-24 all four legacy tables had 0 rows and no `DailyPlan` had a
  `templateId`, so nothing is lost today. Step 2 re-checks this before the
  migration runs.
- Editing `project-overview.md` or its "legacy until 16" notes. That is
  `/overview`'s job if you want it refreshed.
- Tidying `resolveToday()`'s now-unused `weekday` field (`src/lib/date.ts`).
  It stays as it is.
- Deploy migration steps (finding F-07, which belongs to `/release`).

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Remove the Plantillas section, legacy routes, and legacy code.**
      - **`src/components/layout/NavBar.tsx`:** remove the
        `{ href: "/plantillas", label: "Plantillas" }` entry.
      - **Delete:**
        - `src/app/plantillas/` (`page.tsx`, `nueva/page.tsx`,
          `[id]/page.tsx`);
        - `src/app/api/templates/` (`route.ts`, `[id]/route.ts`);
        - `src/app/api/daily-tasks/` (`route.ts`, `[id]/route.ts`);
        - `src/components/plantillas/` (`DeleteTemplateButton.tsx`,
          `TemplateForm.tsx`);
        - `src/components/hoy/AddDailyTaskForm.tsx` and
          `src/components/hoy/DailyTaskItem.tsx`, which have no importers;
        - `src/lib/validation/template.ts` and
          `src/lib/validation/daily-task.ts`.
      - **`src/lib/daily-plan.ts`:** delete `getOrCreateTodayPlanForEdit`
        and `getOrCreateTodayPlan`, and any import that becomes unused. Keep
        `getDayPlan`, `generateDay`, `saveMiscTasks`, and `closePastPlans`
        unchanged.
      - The Prisma schema is still unchanged in this step, so the build keeps
        working.

      *Done when:*
      - A search of `src/` (excluding `src/generated/`) finds no match for
        `template`, `Template`, `plantilla`, `dailyTask`, `DailyTask`,
        `daily-task`, or `getOrCreateTodayPlan`. The only allowed hits are
        unrelated words such as JSX/TS syntax. List any hit in the review
        packet.
      - `npm run lint` and `npm run build` pass. The build's route list has
        no `/plantillas…`, `/api/templates…`, or `/api/daily-tasks…`.
      - With `npm run dev`:
        - the nav shows only "Hoy" and "Historial";
        - `/plantillas` and `GET /api/templates` return 404;
        - "Hoy" still loads and generates today's blocks, and `/historial`
          still shows a past day.

- [x] **2. Drop the legacy tables with a migration.**
      - **`prisma/schema.prisma`:** delete the `Template`, `TemplateTask`,
        `TemplateRecurrence`, and `DailyTask` models. In `DailyPlan`, delete
        `templateId`, `template`, and `tasks`. Leave `DailyPlan`'s other
        fields and `Block` exactly as they are.
      - `npx prisma validate --config prisma7.config.ts` passes.
      - **Re-check data:** count the rows in the four legacy tables and the
        `DailyPlan` rows with a non-null `templateId` (a read-only query). If
        any count is not 0, stop and report the counts before going on. The
        plan says the data is deleted, but data added since the spec was
        written should be confirmed first.
      - **Preview the SQL offline:** `npx prisma migrate diff --config
        prisma7.config.ts --from-migrations prisma/migrations --to-schema
        prisma/schema.prisma --script` (adjust flags to this Prisma
        version's CLI if needed). Expected: drop the `DailyPlan` →
        `Template` foreign key, drop the `templateId` column, and drop the
        four tables with their foreign keys. Nothing touches `Block` or the
        other `DailyPlan` columns.
      - **Show the preview and wait for an explicit yes.** This is the
        destructive step. After the yes, run `npx prisma migrate dev
        --config prisma7.config.ts --name retire_templates`. Never use
        `migrate reset` or `db push`. If `migrate dev` wants to reset the
        database, stop and report instead.
      - The generated client is rebuilt by `migrate dev`. If a running dev
        server holds stale types, restart it.

      *Done when:*
      - `prisma/migrations/<timestamp>_retire_templates/migration.sql`
        exists and matches the approved preview.
      - `npx prisma migrate status --config prisma7.config.ts` reports the
        schema is up to date.
      - `npm run lint` and `npm run build` pass.
      - With `npm run dev`: "Hoy" generates and edits blocks and "Tareas
        varias"; `/historial?fecha=2026-09-23` still shows that day's
        blocks, checks, and tasks.

## Files / areas

- Edited: `src/components/layout/NavBar.tsx`, `src/lib/daily-plan.ts`,
  `prisma/schema.prisma`.
- Deleted: `src/app/plantillas/`, `src/app/api/templates/`,
  `src/app/api/daily-tasks/`, `src/components/plantillas/`,
  `src/components/hoy/AddDailyTaskForm.tsx`,
  `src/components/hoy/DailyTaskItem.tsx`, `src/lib/validation/template.ts`,
  `src/lib/validation/daily-task.ts`.
- New: `prisma/migrations/<timestamp>_retire_templates/migration.sql`.
- Regenerated (gitignored): `src/generated/prisma`.

## Data / contracts

- **Final model:**
  - `DailyPlan`: `id`, `date` (unique, `@db.Date`), `closed`, `startTime`,
    `endTime`, `miscTasks`, and its `blocks`.
  - `Block`: unchanged.
- **Destructive migration:** the four legacy tables and
  `DailyPlan.templateId` are dropped along with their data. This is the
  plan's explicit decision. The row re-check and the explicit yes before
  `migrate dev` are the safety gates.
- **Removed URLs** return 404. No redirects: this is a single-user app, and
  nothing links to them after the nav change.
- `/api/days/...` routes and their contracts are unchanged.

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build` after each step;
  - `prisma validate`, the offline SQL preview, and `migrate status` in
    step 2;
  - the manual `npm run dev` checks in each step.
- No browser harness is configured. Any browser evidence comes from an
  ad-hoc session.
- No test data is written. The step 2 row check is read-only.

## Notes for the AI

- The Prisma config file is `prisma7.config.ts`, not the default name, so
  every Prisma command needs `--config prisma7.config.ts` (as in
  feature 12).
- Coding standards: schema changes go through `prisma migrate dev` (not
  `db push`), and `prisma migrate status` runs before committing.
- Step 1 must come first. Removing the models first would break the build
  while the old code still uses them.
- Finding F-02 (unindexed foreign keys) is about columns this feature drops.
  The only foreign key left, `Block.dailyPlanId`, is the leading column of
  the `Block_dailyPlanId_startTime_key` unique index. Don't edit the
  findings ledger here. A later `/audit` can re-examine F-02.
- Next 16: read `node_modules/next/dist/docs/` only if a routing question
  comes up. This feature only deletes routes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8459,"specSha256":"fa4c0910ae162d48a8e72c1159dfc513ab5b1d78e6b1371bf72711a4b5793e94","branch":"refs/heads/feature/retire-templates-and-the-old-model","head":"0369f6052310df35c0f59bcc7bdfe276c7f9efae","baseRef":"refs/heads/master","baseCommit":"0369f6052310df35c0f59bcc7bdfe276c7f9efae","sourceTree":"8cdd15a7c3b4b139aed5527067876a77d94980b4","absentOptional":[]} -->

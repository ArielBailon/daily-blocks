# Feature: "Hoy" checklist view

**From build-plan:** feature 7
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/hoy-checklist-view`

## Goal

Turn today's generated plan into a working checklist: each task gets a
checkbox, and ticking it saves immediately with no save button. This is the
headline feature of the app - everything built so far exists to keep this list
filled with the right tasks.

## In scope

- A `PATCH /api/daily-tasks/[id]` route handler that sets a single
  `DailyTask`'s completion state and keeps `completedAt` consistent with it.
- A client component for a checklist row: checkbox plus title (and suggested
  time when set), which calls that route on change, updates optimistically,
  and reverts with a visible error if the request fails.
- `src/app/page.tsx` renders those rows instead of the current read-only list,
  keeping feature 6's existing states intact (no matching template, plan with
  no tasks).
- A completed row is visually distinguishable (muted / struck through).

## Out of scope

- Blocking edits on a closed day (build-plan item 8). `DailyPlan.closed` is
  still always `false` - nothing sets it yet - so the guard would be
  unreachable code. Item 8 owns adding that check to this route.
- Adding or removing one-off tasks from today's plan (build-plan item 9).
  This feature only changes `completed` on tasks that already exist.
- Any completion count, percentage, or progress bar on "Hoy". The percentage
  belongs to the history view (build-plan item 10).
- Changes to template CRUD, recurrence, or the generation logic from
  features 3-6.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: currently `feature`, so one review packet is produced
after all steps below are done (not a pause after each one).
`workflow.checkpointCommits` is `disabled`, so no per-step checkpoint commits
are offered. `/complete` makes the final feature commit.

## Build steps

- [x] **Step 1 - Toggle endpoint** - Add
      `src/lib/validation/daily-task.ts` exporting a Zod schema for
      `{ completed: boolean }`, then
      `src/app/api/daily-tasks/[id]/route.ts` with a `PATCH` handler that
      mirrors the existing template-route structure: reuse the same `parseId`
      shape, invalid id or `P2025` to 404, unparseable JSON or failed Zod to
      400, unknown failure to 500. On success it runs
      `prisma.dailyTask.update` setting `completed` to the submitted value and
      `completedAt` to `new Date()` when `true` / `null` when `false`, and
      returns the updated `{ id, completed, completedAt }`. *Done when:*
      `npm run build` succeeds; Step 3's live check confirms the row is
      written.
- [x] **Step 2 - Checklist row component** - Add
      `src/components/hoy/DailyTaskItem.tsx` (`"use client"`) taking the
      task's `id`, `title`, `suggestedTime`, and initial `completed`. It owns
      its own `completed`, `pending`, and `error` state: on change it flips
      state optimistically, disables the checkbox while the request is in
      flight, and on a failed response reverts to the previous value and shows
      the error with `role="alert"`, clearing that error on the next
      successful toggle. The checkbox is associated with its title through a
      wrapping `<label>`, matching the "Plantilla predeterminada" checkbox
      already in `TemplateForm`. *Done when:* `npm run build` and
      `npm run lint` succeed.
- [x] **Step 3 - Wire "Hoy"** - In `src/app/page.tsx`, replace the read-only
      `<li>` contents with `<DailyTaskItem>`, passing each task's fields;
      leave the no-plan and no-tasks branches from feature 6 exactly as they
      are. *Done when:* in the running app, "Hoy" shows a checkbox per task;
      ticking one persists across a reload; unticking it persists too; the
      completed row is visually distinct; and the no-template empty state
      still renders when no template applies.

## Files / areas

- `src/lib/validation/daily-task.ts` - new: the `{ completed }` Zod schema.
- `src/app/api/daily-tasks/[id]/route.ts` - new: the `PATCH` handler.
- `src/components/hoy/DailyTaskItem.tsx` - new: the client checklist row.
- `src/app/page.tsx` - render rows through the new component.

## Data / contracts

- The endpoint takes the **desired absolute state** (`{ completed: true }` /
  `{ completed: false }`), not a "toggle" verb. That makes it idempotent, so a
  double click, a retry, or two tabs cannot land on the opposite value from
  the one the user chose.
- `DailyTask.completedAt` is maintained as a strict function of `completed`:
  set to the server's `new Date()` when completing, set back to `null` when
  un-completing. It is never left populated on an incomplete task. This is the
  only code that writes the field, so this rule defines it for the features
  that read it later.
- URL shape: `/api/daily-tasks/[id]` is a flat top-level resource, matching
  the existing `/api/templates/[id]` precedent, and `DailyTask.id` is a
  globally unique autoincrement key so no plan id is needed in the path. This
  leaves `POST /api/daily-tasks` and `DELETE /api/daily-tasks/[id]` free for
  build-plan item 9 without reinterpreting this route.
- No `router.refresh()` after a toggle: the row already holds the new value
  and the server now matches it, so a refresh would only cost a round trip and
  risk a flicker. Nothing else on the page derives from `completed`.
- Task titles come from user-typed template text and are rendered as plain
  React children, which escapes them, exactly as the current read-only list
  and the templates list already do. No `dangerouslySetInnerHTML`.
- No auth or ownership check: the overview's usage model states this is a
  single-user app with no authentication and no multi-tenancy.

## Testing

- No test runner is configured for this project (`AGENTS.md` Commands has no
  `test`/`Verify` entry), so this relies on `npm run build`, `npm run lint`,
  and manual/browser verification rather than an automated test gate.
- Manual verification per step is listed above under each step's *Done when*.
  End-to-end: with a template assigned to today, open "Hoy", tick a task,
  reload and confirm it stays ticked; untick it, reload and confirm it stays
  unticked; confirm a completed row reads as completed at a glance.

## Notes for the AI

- Follow the error-handling shape already in
  `src/app/api/templates/[id]/route.ts` (`Prisma.PrismaClientKnownRequestError`
  with `error.code === "P2025"` to 404) rather than inventing a new one.
- Keep the client boundary as small as possible: `src/app/page.tsx` stays a
  server component that fetches through `getOrCreateTodayPlan()`, and only the
  individual row is `"use client"`. Per-row state is deliberate - there is no
  shared count to lift state for.
- Style with the existing tokens (`border-muted`, `text-foreground/70`,
  `text-accent`, `accent-accent` on the checkbox) already used in
  `TemplateForm` and the templates list. No new dependency.
- Spanish UI copy, consistent with the rest of the app.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7091,"specSha256":"55d8f0c619a49306385bd79612111adafa993b113b6e43e72a470fa205897765","branch":"refs/heads/feature/hoy-checklist-view","head":"76e562430493a8801e2b67be039a7655ce096d9e","baseRef":"refs/heads/master","baseCommit":"76e562430493a8801e2b67be039a7655ce096d9e","sourceTree":"5542490f2a61657e17d66ec16e33607645d8ea23","absentOptional":[]} -->

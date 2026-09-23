# Feature: Day close-out

**From build-plan:** feature 8
**Build attempt:** 1
**Branch:** feature/day-close-out
**Status:** verified

## Goal

When the calendar day changes, every earlier `DailyPlan` becomes a closed,
immutable snapshot of its tasks' final state (`closed = true`). The server
refuses any change to a task that doesn't belong to today's open plan, even
from a browser tab left open since the day before.

## In scope

- A lazy close-out step. There's no scheduler, so "when the day ends" means
  "the first time the app notices the date has changed" (the build-plan's
  "al detectar el cambio de fecha"). Every `DailyPlan` dated before today
  with `closed = false` is set to `closed = true` in one `updateMany`.
- Running that close-out every time "Hoy" loads, before today's plan is
  read or generated.
- An immutability guard on `PATCH /api/daily-tasks/[id]`. The update only
  applies when the task's plan is today's plan and `closed = false`. A task
  on a closed or past day gets `409` with a clear Spanish message, and the
  database is left unchanged.
- A client message for that `409` in the existing `DailyTaskItem` error
  path, telling the user to reload to see today's plan.

## Out of scope

- A scheduled or cron close-out (Vercel Cron). Closing lazily on the next
  request is enough, because nothing can edit a past day and nothing reads
  history until feature 10.
- Closing today's plan by hand ("terminar el día ahora"). The plans don't
  include it.
- Adding or removing tasks on today's plan (feature 9). Feature 9 must apply
  the same "today and not closed" guard to its own routes.
- The history view and its completion % (feature 10). Feature 10 should call
  the close-out helper before it reads past plans.
- Changing how "today" is resolved (`resolveToday()`, server-local calendar
  day). See Notes.
- Schema changes. `DailyPlan.closed` already exists (feature 2) with
  `@default(false)`.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Close-out helper and Hoy integration.** In `src/lib/daily-plan.ts`,
      add `closePastPlans(today: Date)`. It runs
      `prisma.dailyPlan.updateMany({ where: { date: { lt: today }, closed:
      false }, data: { closed: true } })`. It changes only the `closed` flag
      and never touches or copies `DailyTask` rows: the existing rows are the
      snapshot. Call it at the start of `getOrCreateTodayPlan()`, using the
      `date` that function already gets from `resolveToday()`, so one "today"
      value drives both close-out and generation. The call is idempotent, so
      concurrent or repeated loads are safe.
      *Done when:* `npm run lint` and `npm run build` pass, and after loading
      `/`, a `DailyPlan` row with an earlier date that was `closed = false`
      reads `closed = true` in `npx prisma studio` (or a `psql` query). You
      can create that row by changing a plan's `date` to yesterday in Studio.
      Today's plan stays `closed = false`, and its tasks still show and can
      be toggled.

- [x] **2. Immutability guard in the task PATCH route.** In
      `src/app/api/daily-tasks/[id]/route.ts`, replace the unconditional
      `prisma.dailyTask.update` with a single conditional
      `prisma.dailyTask.updateMany({ where: { id, dailyPlan: { date: today,
      closed: false } }, data: {...} })`, where `today` is
      `resolveToday().date`. Putting the check and the write in one statement
      closes the gap where a plan could close between a check and the write.
      If `count === 0`, use `findUnique` to decide which error to return:
      no task → `404 { error: "Tarea no encontrada" }`; task exists →
      `409 { error: "Este día ya está cerrado y no se puede editar." }`. On
      success, read the task back and return the same response shape as today
      (`{ id, completed, completedAt }`). Keep the existing 400 and 500
      responses unchanged.
      *Done when:* `npm run lint` and `npm run build` pass, and with `npm run
      dev`: toggling a task on today's plan still returns 200 and survives a
      reload. A `PATCH` (browser devtools `fetch` or `curl`) to a task whose
      plan is past or has `closed = true` returns 409 with that body, and
      that task's `completed`/`completedAt` are unchanged in Studio. An
      unknown id still returns 404.

- [x] **3. Stale-tab feedback in the checkbox.** In
      `src/components/hoy/DailyTaskItem.tsx`, when the response is `409`, roll
      back the checkbox (existing behavior) and show the server's message plus
      "Recarga la página para ver el plan de hoy." in the existing
      `role="alert"` paragraph. Other errors keep their current handling, and
      a later successful save still clears the message.
      *Done when:* `npm run lint` and `npm run build` pass. In the browser, open
      `/`, then set that plan's `date` to yesterday in Studio without
      reloading. Toggling a checkbox rolls it back and shows the closed-day
      message. Reloading `/` shows today's plan (newly generated or empty
      state), and the edited plan is now `closed = true`.

## Files / areas

- `src/lib/daily-plan.ts`: new `closePastPlans()`, called from
  `getOrCreateTodayPlan()`.
- `src/app/api/daily-tasks/[id]/route.ts`: conditional update with 404/409
  handling.
- `src/components/hoy/DailyTaskItem.tsx`: 409 message.
- Read only: `src/lib/date.ts` (`resolveToday()`), `prisma/schema.prisma`
  (no migration).

## Data / contracts

- **Closed means:** `DailyPlan.closed = true`. Its `DailyTask` rows are the
  frozen snapshot of that day's final state. There's no separate snapshot
  table or copy.
- **When a plan closes:** the first time `getOrCreateTodayPlan()` runs with a
  `resolveToday().date` later than the plan's `date`. Plans never reopen.
  Today's plan is never closed by this feature.
- **Editability rule** (feature 9 reuses it): you can only mutate a task when
  its plan's `date` equals `resolveToday().date` and `closed = false`. Both
  checks go in the same `where` as the write.
- **`PATCH /api/daily-tasks/[id]` responses:** 200
  `{ id, completed, completedAt }` (unchanged); 400 `{ error }` for invalid
  JSON or body (unchanged); 404 `{ error: "Tarea no encontrada" }`;
  **new** 409 `{ error: "Este día ya está cerrado y no se puede editar." }`;
  500 `{ error: "Error al actualizar la tarea" }`.
- No authentication (single user, per the overview). No new inputs to
  validate beyond the existing Zod schema.

## Testing

- No test runner and no Verify command are configured (`AGENTS.md` Commands).
  The gates are `npm run lint` (passed at spec time, exit 0) and
  `npm run build`, plus the manual checks under each step.
- `closePastPlans(today)` takes `today` as a parameter, and `resolveToday()`
  already accepts `now`. These are the test seams for when a runner is added.
- No browser harness is configured, so there is no automated browser
  coverage.

## Notes for the AI

- Follow the existing route-handler style: `NextResponse.json`, Spanish error
  strings, and `Prisma.PrismaClientKnownRequestError` checks where relevant.
  `updateMany` doesn't throw P2025, so the 404 path now comes from the
  follow-up `findUnique`.
- A relation filter inside `updateMany`'s `where` (`dailyPlan: { ... }`) is
  valid Prisma. Check `node_modules/next/dist/docs/` only if the route
  signature changes (it shouldn't).
- **Timezone caveat (existing, not fixed here):** `resolveToday()` uses the
  server process's local calendar day. Locally that's the user's day. On
  Vercel (UTC) it would roll over at UTC midnight, so after this feature,
  today's plan would lock at that hour in the user's timezone (for example,
  7 pm at UTC-5). This feature inherits that rule rather than redefining it.
  Deployment isn't configured yet. Fix it with `/fix` before `/release`.

## Open questions

None blocking. The timezone rule above is recorded as a follow-up `/fix`
before deployment.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8173,"specSha256":"3923c705e3c0666b07e56c2f53d0c17ae94dd8b8d4720139c84177ed053d3410","branch":"refs/heads/feature/day-close-out","head":"cb1b0041dc0988164b7b319caae21329624f3d25","baseRef":"refs/heads/master","baseCommit":"cb1b0041dc0988164b7b319caae21329624f3d25","sourceTree":"20c10558bc1a35bebea947d19319842289772323","absentOptional":[]} -->

# Feature: Automatic daily plan generation

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/automatic-daily-plan-generation`

## Goal

When "Hoy" is opened and there's no `DailyPlan` for today yet, create one from
the template that applies to today (weekday recurrence first, default template
otherwise), so the day always starts pre-filled instead of blank.

## In scope

- A pure date helper that resolves "today" as both a UTC-midnight `Date` (for
  `DailyPlan.date`, `@db.Date`) and a weekday number (`0`-`6`, same
  `Date.getDay()` encoding feature 4 already committed to), derived from the
  same instant so they can never disagree. This directly closes finding
  `F-05`: `@db.Date` truncates to the UTC calendar day, so building the stored
  value from decomposed local Y/M/D (not from a raw local-time `Date`) keeps
  what's written and what's looked up next time in agreement.
- Server-side generation logic: look up today's `DailyPlan` by date; if none
  exists, resolve the matching template - `TemplateRecurrence` for today's
  weekday takes priority (feature 4's contract is per-weekday, so it's the
  more specific match), falling back to the `Template` with `isDefault: true`
  (feature 5's own description: "used when a day has no matching recurrence").
  If a template resolves, create the `DailyPlan` with `DailyTask` rows copied
  from that template's current tasks (title, suggestedTime, order,
  `completed: false`) - a snapshot, not a live reference, consistent with the
  data model's "historical source of truth once closed" note.
- If no recurrence and no default template exist, no plan is created; "Hoy"
  shows an empty state instead of a blank checklist.
- A minimal read-only rendering of the generated (or already-existing) plan's
  tasks on `/` (title + suggested time, in order) so generation is observable
  without building the interactive checklist - that's feature 7's scope, not
  this one's.

## Out of scope

- Checkbox interactivity / toggling completed with immediate save (build-plan
  item 7 - "Hoy" checklist view).
- Day close-out and the immutability of closed days (build-plan item 8).
  `DailyPlan.closed` stays at its schema default (`false`); nothing here reads
  or sets it.
- Manual one-off edits to today's plan (build-plan item 9).
- History view (build-plan item 10).

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: currently `feature`, so one review packet is produced
after all steps below are done (not a pause after each one).
`workflow.checkpointCommits` is `disabled`, so no per-step checkpoint commits
are offered. `/complete` makes the final feature commit.

## Build steps

- [x] **Step 1 - Today date/weekday helper** - Add `src/lib/date.ts` exporting
      `resolveToday(now: Date = new Date())`, returning `{ date, weekday }`:
      `date` is `new Date(Date.UTC(now.getFullYear(), now.getMonth(),
      now.getDate()))` (matches `DailyPlan.date`'s `@db.Date` truncation
      exactly, regardless of the server process's local offset from UTC);
      `weekday` is `now.getDay()`, computed from the same `now` so it always
      names the same calendar day as `date`. The `now` parameter is the test
      seam for this otherwise-nondeterministic value. *Done when:* `npm run
      build` succeeds.
- [x] **Step 2 - Generation logic** - Add `src/lib/daily-plan.ts` exporting
      `getOrCreateTodayPlan()`: call `resolveToday()`; `prisma.dailyPlan
      .findUnique({ where: { date }, include: { tasks: { orderBy: { order:
      "asc" } } } })`; return it if found. Otherwise resolve a template -
      `prisma.templateRecurrence.findUnique({ where: { weekday } })`, else
      `prisma.template.findFirst({ where: { isDefault: true } })` - and if
      one resolves, load its tasks ordered and `prisma.dailyPlan.create({
      data: { date, templateId, tasks: { create: [...] } }, include: {...}
      })`, mapping each template task to `{ title, suggestedTime, order,
      completed: false }` by array index (matching how the template routes
      already reassign `order`). Catch a `Prisma.PrismaClientKnownRequestError`
      with code `P2002` around that create (two near-simultaneous opens racing
      on `DailyPlan.date`'s unique constraint) and re-fetch by date instead of
      throwing. Return `null` when no template resolves. *Done when:* `npm run
      build` succeeds; a live check confirms a matching `DailyPlan` +
      `DailyTask` rows are created on first call and reused (no duplicate) on
      a second call for the same day.
- [x] **Step 3 - Wire "Hoy"** - Replace the placeholder in `src/app/page.tsx`
      with a server component that calls `getOrCreateTodayPlan()` and renders:
      the plan's tasks as a plain ordered list (title, and suggested time when
      set) when a plan exists (even with zero tasks, show the plan's "no
      tasks" state rather than the no-template empty state); otherwise an
      empty-state message that no template applies to today. Add `export const
      dynamic = "force-dynamic"` to match the other data-driven pages. *Done
      when:* in the running app, a template with today's weekday recurrence (or,
      absent that, a default template) produces a populated "Hoy" page on
      first visit and stays the same on reload; a day with neither shows the
      empty state.

## Files / areas

- `src/lib/date.ts` - new: `resolveToday()`.
- `src/lib/daily-plan.ts` - new: `getOrCreateTodayPlan()`.
- `src/app/page.tsx` - replace the placeholder with the generated/existing
  plan's read-only task list or the empty state.

## Data / contracts

- `DailyPlan.date` is written and looked up as UTC-midnight for the
  server process's local calendar day (`Date.UTC(now.getFullYear(),
  now.getMonth(), now.getDate())`), never a raw `new Date()`. This is the
  fix for finding `F-05` and is now the one place in the app that touches
  this field, so it's the single source of truth for the encoding.
- Weekday-recurrence match takes priority over the default template when both
  exist for the same day; this is the concrete resolution of "recurrente o
  default" in the build-plan line.
- `DailyTask` rows created here are an independent copy of the template's
  tasks at generation time (not linked back to `TemplateTask`), matching the
  existing "historical source of truth" note in the data model.
- `DailyPlan.date` already carries a unique constraint (`@unique`, from
  feature 2); generation handles the resulting `P2002` on a same-day race by
  re-reading rather than erroring.
- No new API route: `getOrCreateTodayPlan()` is called directly from the `/`
  server component. There's no client interactivity to route through
  `src/app/api/**` here (unlike the template CRUD forms) - see Notes below.

## Testing

- No test runner is configured for this project (`AGENTS.md` Commands has no
  `test`/`Verify` entry), so this relies on `npm run build` and manual/browser
  verification. `resolveToday()`'s `now` parameter is a deliberate test seam
  for whenever a runner is added later.
- Manual verification per step is listed above under each step's *Done when*.
  End-to-end: mark a template's recurrence for today's weekday, open `/`,
  confirm its tasks appear; reload, confirm no duplicate `DailyPlan` is
  created (same task list, not doubled); remove that recurrence and mark a
  different template as default, delete today's `DailyPlan` in `prisma
  studio` (or use a day with no existing plan) and reopen `/` to confirm the
  default template is used instead.

## Notes for the AI

- `getOrCreateTodayPlan()` performs a read-then-maybe-write during a Server
  Component render, not through a Route Handler. This departs from the
  template CRUD precedent (client `fetch` to `src/app/api/**`) because there's
  no client action here to route through an endpoint - opening `/` is the only
  trigger, and going through a client-side `fetch` after mount would add a
  loading flash the spec doesn't call for. Keep this localized to
  `src/lib/daily-plan.ts`; do not add an API route for it in this feature.
- Reuse the existing Prisma error-handling pattern already used in the
  template routes (`error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "..."`) for the `P2002` race case.
- Do not add checkbox markup, completion toggling, or any mutation route for
  `DailyTask.completed` in this feature - that's feature 7.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8484,"specSha256":"b4d557d7e9a916facd0e5613ad8bf46e34572e11a13ab0ca18e7bd54fd8e1ebc","branch":"refs/heads/feature/automatic-daily-plan-generation","head":"61d430f694da389a93b378c0bc3c644784f027dc","baseRef":"refs/heads/master","baseCommit":"61d430f694da389a93b378c0bc3c644784f027dc","sourceTree":"ebb8db5af894f0dd84a91948fbd736334442444a","absentOptional":[]} -->

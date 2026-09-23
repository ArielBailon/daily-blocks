# Feature: History view

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/history-view
**Status:** verified

## Goal

`/historial` lists every past day that has a plan, newest first, and shows
the share of that day's tasks that were completed. It reads the closed,
immutable snapshots that feature 8 produces. It is read-only.

## In scope

- Replace the placeholder in `src/app/historial/page.tsx` with a server
  component that:
  1. Closes past plans first: `closePastPlans(resolveToday().date)`. A day
     that ended while the app was unused is then closed before it's
     displayed, even if "Hoy" was never opened since.
  2. Loads every `DailyPlan` with `date < today`, newest first, with its
     tasks' `completed` flags.
  3. Renders one row per day: the date, `completadas/total`, and the rounded
     percentage.
- An empty state for when there are no past days yet.
- Rendering a day with zero tasks without dividing by zero.

## Out of scope

- A per-day detail page, filters, charts, streaks, or averages. The plan asks
  only for "lista de días pasados con %", and the UI guidelines say no
  dashboards.
- Pagination. It's a single user with roughly one row per day, so the size
  is small for years.
- Including today. Today is still open and lives in "Hoy".
- Days with no `DailyPlan`, meaning days when no template applied and nothing
  was added by hand. They have no data, so they don't appear.
- Any edit capability. History is read-only by design (feature 8).

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. History query and completion math.** In
      `src/lib/daily-plan.ts`, add `getPastPlansSummary()`:
      1. `const { date: today } = resolveToday();`
      2. `await closePastPlans(today);`
      3. `prisma.dailyPlan.findMany({ where: { date: { lt: today } },
         orderBy: { date: "desc" }, select: { id: true, date: true, tasks: {
         select: { completed: true } } } })`.
      4. Map to `{ id, date, total, completed, percent }`, where
         `percent = total === 0 ? null : Math.round((completed / total) *
         100)`.
      *Done when:* `npm run lint` and `npm run build` pass.

- [x] **2. History page.** Rewrite `src/app/historial/page.tsx`:
      - Add `export const dynamic = "force-dynamic"`, as in "Hoy". The page is
        currently prerendered static and must read fresh data.
      - Use the same `max-w-md` layout and heading as "Hoy".
      - Each row is a `<li>` with the date on the left and `completed/total ·
        NN%` on the right, or "Sin tareas" when `percent` is `null`.
      - Format dates in Spanish with
        `new Intl.DateTimeFormat("es", { timeZone: "UTC", weekday: "short",
        day: "numeric", month: "short", year: "numeric" })`, for example
        "mié, 23 sept 2026". `timeZone: "UTC"` is required because
        `DailyPlan.date` is stored as UTC midnight of the calendar day.
      - Empty state: "Todavía no hay días pasados. Aquí aparecerán cuando
        termine tu primer día con plan."
      *Done when:* `npm run lint` and `npm run build` pass, the build lists
      `/historial` as `ƒ` (dynamic) instead of `○`, and with a dev server the
      page shows past days newest first with correct percentages, or the
      empty state.

## Files / areas

- `src/lib/daily-plan.ts`: new `getPastPlansSummary()`, reusing
  `closePastPlans` and `resolveToday`.
- `src/app/historial/page.tsx`: replace the placeholder.
- No API route. Server components read with Prisma directly, per the coding
  standards, and there is no client interactivity.

## Data / contracts

- **Source of truth:** `DailyPlan` and `DailyTask` rows of past, closed days.
  There's no schema change.
- **A "past day"** is a `DailyPlan` with `date < resolveToday().date` (the
  fixed `America/Guayaquil` calendar day). Opening the page closes those
  plans before reading them, which is idempotent.
- **Percentage:** `completed / total`, rounded to the nearest integer. It's
  `null`, shown as "Sin tareas", when the day has zero tasks. Completion is
  the final `completed` flag frozen at close-out; `completedAt` isn't used.
- **Date display:** Spanish short weekday, day, short month, and year,
  formatted in `UTC` so the stored UTC-midnight date shows its own calendar
  day.
- No user-controlled text is rendered. Dates and numbers come from the
  server. No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are
  `npm run lint` and `npm run build`, plus manual checks.
- **Manual try path** (dev server, `/historial`):
  1. With past plans present, rows are newest first, with no row for today.
  2. For a day with 3 of 4 tasks done, the row reads "3/4 · 75%".
  3. A past plan whose tasks were all removed shows "Sin tareas".
  4. A past plan that was still `closed = false` is `true` in Studio after
     visiting the page.
  5. With no past plans, the empty state shows.
- No browser harness is configured, so there is no automated browser
  coverage.

## Notes for the AI

- Keep the page a server component. No `"use client"` is needed.
- Unexpected database errors fall through to Next's default error handling,
  like "Hoy". There's no custom error boundary in this project.
- `select` with a nested `tasks: { select: { completed: true } }` is enough.
  `groupBy` or `_count` with a filter would be premature at this scale.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5640,"specSha256":"5c7d7b8a1c42fca428b7c5b7c2c1085f03ef839afef41b519eb0a52e487a5380","branch":"refs/heads/feature/history-view","head":"7311c6916c0b9bc55c5b0913b8955741d18219e5","baseRef":"refs/heads/master","baseCommit":"7311c6916c0b9bc55c5b0913b8955741d18219e5","sourceTree":"dc5f6da115ec6c80646a032e7354144e6cb3a4c7","absentOptional":[]} -->

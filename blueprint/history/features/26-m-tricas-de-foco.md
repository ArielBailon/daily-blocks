# Feature: Métricas de foco

**From build-plan:** feature 26
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/m-tricas-de-foco`

## Goal

Show what the focus sessions produced: per day in Historial (real focus minutes,
completed and abandoned sessions, skipped breaks), per day and for the current
week in the Winter Arc view, and each day's sessions in `GET /api/days`. The Arc
rules are not touched.

## In scope

- Pure metrics (no Prisma) in `src/lib/focus/metrics.ts`: a per-day summary, a
  minutes formatter and a multi-day total.
- One read-only loader that returns the focus sessions of a date range grouped by
  the day of their plan.
- `GET /api/days`: every day in the response gets a `focusSessions` array.
- Historial: a "Foco" card for the selected past day with focus minutes,
  completed sessions, abandoned sessions and skipped breaks; "Sin sesiones de
  foco." when there are none.
- Winter Arc:
  - `DayDetail` (the selected day, `?dia=N`) gets a "Foco" row with that day's
    minutes and session count;
  - `WeekPace` gets the focus total of the current Monday-to-Sunday week.
- Tests for the pure logic.

## Out of scope

- Any change to the Arc rules, `computeArc`, `ArcDayResult`, `ArcSummary` or
  `GET /api/arc/stats`. Whether R1 (Deep) should use focus sessions is a separate
  proposal, not built here.
- New endpoints, charts, filters, per-session lists in the UI, editing or
  deleting sessions.
- Changes to Hoy, `/ahora`, the timer or the focus API from 23.
- Schema changes or migrations.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Pure metrics with tests** - `src/lib/focus/metrics.ts`:
      `summarizeFocus`, `summarizeByDay`, `emptyFocusSummary`, `formatFocusMinutes`,
      `focusTotalForDays`, with tests.
      *Done when:* `npm test`, `npm run lint` and `npm run build` pass with the
      cases listed under Testing.
- [x] **Step 2 - Loader and `GET /api/days`** - `src/lib/focus/load.ts`
      (read-only query by plan date range, grouped by `YYYY-MM-DD`) and the
      `focusSessions` field in `src/app/api/days/route.ts`. *Done when:*
      `npm run lint` and `npm run build` pass, and in step 5 the endpoint returns
      the sessions of a day and `[]` for a day without any.
- [x] **Step 3 - Historial card** - a "Foco" card in `src/app/historial/page.tsx`
      (extracted to a small component if the page grows), beside "Tareas
      varias". *Done when:* `npm run lint` and `npm run build` pass, and in step 5
      the card shows the expected numbers for a day with test sessions and the
      empty text for a day without.
- [x] **Step 4 - Winter Arc** - load the arc range's focus summaries in
      `src/app/winter-arc/page.tsx`, pass the selected day's summary to
      `DayDetail` and the week total to `WeekPace`. *Done when:* `npm run lint`
      and `npm run build` pass, and in step 5 the day row and the week total show
      the expected numbers while `GET /api/arc/stats` is byte-identical before and
      after inserting sessions.
- [x] **Step 5 - Live run-through** - with a running dev server, check the flows
      in the Testing section using throwaway sessions inserted on existing plans,
      deleted afterwards. *Done when:* each flow passes and any failure is fixed
      or reported; `npm test`, `npm run lint` and `npm run build` pass.

Step 5 evidence note: run with the user's approval in this chat, with a dev
server started and stopped by the agent, against the real database, using 5
throwaway `FocusSession` rows (ids 14-18) on the existing plans of 2026-11-18
(3 finished sessions plus 1 left `WORKING`) and of today (1 completed, 1200 s),
all deleted afterwards (table back to 0 rows). Observed: `GET /api/days` listed
the sessions of each day in `startedAt` order and `focusSessions: []` for a day
without any; Historial 2026-11-18 showed 1 h 25 min, 2 completed, 1 abandoned,
1 skipped break (the `WORKING` row ignored) and 2026-11-16 showed "Sin sesiones
de foco."; `/winter-arc?dia=47` showed "1 h 25 min · 3 sesiones", `?dia=45` showed
"Sin sesiones", and the current-week total showed 1 h 45 min (85 + 20 min);
`GET /api/arc/stats` was byte-identical before the inserts, after them and after
the deletion. The sessions used `blockIds` of `{}`, so `blockCount` was 0 in the
test data; the mapping `blockIds.length` was not exercised with real ids. Not
seen live: the 90-day grid (unchanged by design) and a first arc week that starts
before the arc.

## Files / areas

- New: `src/lib/focus/metrics.ts` (+ test), `src/lib/focus/load.ts`; optionally
  `src/components/historial/FocusCard.tsx`.
- Edited: `src/app/api/days/route.ts`, `src/app/historial/page.tsx`,
  `src/app/winter-arc/page.tsx`, `src/components/winter-arc/DayDetail.tsx`,
  `src/components/winter-arc/WeekPace.tsx`.
- Reused: `addDays`, `weekStartOf` from `src/lib/arc/rules.ts`, `ARC_START`,
  `arcEnd`, `toDateKey`, `parseDateKey`, `getDayPlansInRange`.

## Data / contracts

No schema change. Sessions belong to the day of their plan (`dailyPlanId` to
`DailyPlan.date`, America/Guayaquil by construction), not to `startedAt`.

`FocusDaySummary`: `{ workSeconds, minutes, completed, abandoned, breaksSkipped }`.

- Only finished sessions count: `COMPLETED` and `ABANDONED`. `WORKING`,
  `PAUSED` and `BREAK` are ignored (a session still running, or one that was never
  settled, has no final time yet).
- `workSeconds` is the sum of `actualWorkSeconds` over counted sessions, so
  abandoned sessions contribute the work they really did.
- `minutes = Math.round(workSeconds / 60)`; a total over several days is rounded
  once from the summed seconds, never from rounded days.
- `breaksSkipped` counts counted sessions with `breakSkipped = true`.
- `formatFocusMinutes(n)`: `"0 min"`, `"45 min"`, `"1 h"`, `"1 h 05 min"`,
  `"4 h 10 min"`.

`GET /api/days` day object gains `focusSessions`, an array whose items have
exactly these fields: `id`, `preset`, `status`, `blockCount` (`blockIds.length`;
block ids are not exposed anywhere in this API), `workMinutes`, `breakMinutes`,
`startedAt` (ISO), `endedAt` (ISO or null), `breakSkipped`, `actualWorkSeconds`.
All sessions of the day are listed, active ones included, ordered by
`startedAt`. A day with none has
`[]`. The route stays read-only and keeps its status codes and error shape.

Winter Arc: `DayDetail` shows "Foco" as `formatFocusMinutes` plus the number of
counted sessions, or "Sin sesiones" for zero. `WeekPace` shows the week's total
(Monday to Sunday of the current week, today included) using the same formatter.
The 90-day grid is unchanged.

Historial card lines, in this order: "Minutos de foco", "Sesiones completadas",
"Sesiones abandonadas", "Descansos saltados". Text and numbers render as React
text.

## Testing

Vitest, pure logic only (no jsdom or browser runner is configured, and none is
added). Cases:

- `summarizeFocus`: no sessions gives zeros; completed and abandoned counted and
  their seconds summed; active statuses ignored; skipped breaks counted; 29 s
  rounds to 0 min and 30 s to 1 min.
- `formatFocusMinutes`: 0, 45, 60, 65, 250 and 1439.
- `focusTotalForDays`: sums seconds across the listed keys, ignores keys with no
  entry, rounds once (two days of 40 s each give 1 min, not 2).

Live flows (step 5, approved dev server, real database): insert throwaway
`FocusSession` rows on an existing past plan inside the arc range and on today's
plan, then check: Historial shows the exact counts for that past day and the
empty text for a day without sessions; `/winter-arc?dia=N` shows the day's focus;
the week total includes today's and the earlier days of the week; `GET /api/days`
lists the sessions and `[]` elsewhere; the `GET /api/arc/stats` body is
byte-identical before and after the inserts. Delete the inserted rows afterwards.

## Notes for the AI

- `AGENTS.md` warns this Next.js has breaking changes: read the relevant page and
  route-handler guides in `node_modules/next/dist/docs/` before editing pages.
- Keep lint rules satisfied (no impure calls during render; the pages are server
  components).
- Decisions where the plan was silent, to confirm at review: only finished
  sessions count; abandoned sessions count their real work minutes; "per day" in
  the Winter Arc means the selected day's detail, not a column in the grid;
  `/api/arc/stats` is left alone; the API exposes `blockCount`, not block ids.
- A past day can still show a session that was never settled (it stays `WORKING`
  until something reads the active session); Historial and the Arc are read-only
  and do not settle it, so that day under-reports until then.
- Step 5 writes throwaway rows to the real database: get the user's approval in
  the current chat, tag the rows by id, delete exactly those afterwards, and stop
  the dev server at the end.
- This feature needs no migration.
- Branch name: the build-plan title has an accent, and the slug rule keeps ASCII
  letters and digits only, hence `m-tricas-de-foco`.
- Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9371,"specSha256":"af21e6f1bbb9abdf58716562911f59a5351dea2763ba65667ba9feda6242db85","branch":"refs/heads/feature/m-tricas-de-foco","head":"63f0559153edad9bcd749594b0fded8b8ee4f626","baseRef":"refs/heads/master","baseCommit":"63f0559153edad9bcd749594b0fded8b8ee4f626","sourceTree":"3830fd0be4f378864b7cecbd25ffdd499cb9f6b2","absentOptional":[]} -->

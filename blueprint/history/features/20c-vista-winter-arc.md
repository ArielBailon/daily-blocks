# Feature: Vista Winter Arc

**From build-plan:** feature 20c
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/vista-winter-arc`

## Goal

Show the Winter Arc on screen: a new "Winter Arc" section that renders what the
rule engine (20b, `computeArc`) already calculates: "Día X de 90", streaks, the
current week's pace, the 90-day grid with per-rule detail, and the % per rule.

## In scope

- New page `/winter-arc` and a "Winter Arc" link in the nav bar (after
  Historial). Server component, `force-dynamic`, reading plans with Prisma and
  calling `computeArc(plans, todayKey)` with today from `resolveToday()`. No
  new calculation: every number comes from `ArcSummary`.
- Header: "Día X de 90" for today. Before the start (2026-10-03) it says the arc
  starts on that date; after day 90 it says the arc is over.
- Streak: current and best (`summary.streak`).
- Current week (Monday to Sunday containing today, taken from `summary.weeks`):
  GYM, WALK and JOB_HUNTING as `count / target`. Shown only while today is inside
  the arc. Weeks are not evaluable until they end, so no pass/fail wording.
- 90-day grid: one cell per day with its day number and status (green, yellow,
  red, gray). Status is never conveyed by color alone (accessible label such as
  "Día 12, verde"). Today is highlighted. Each cell is a link to
  `/winter-arc?dia=N`; the page shows that day's detail below the grid: date,
  status, whether it had a plan, and DEEP and SCREENS_OFF as `value / target`
  (DEEP shown as "No aplica" on Sundays). With no valid `dia`, the detail
  defaults to today when it is inside the arc, otherwise it is hidden.
- % per rule (DEEP, SCREENS_OFF, GYM, WALK, JOB_HUNTING): `passed / total` and
  the percentage; "Sin datos" when `total` is 0.
- Status color tokens (green, yellow, red) in `globals.css`, with text contrast
  checked on the dark theme.

## Out of scope

- Any change to the rules, config constants or the summary (20b).
- The read API `GET /api/arc/stats` (21).
- Schema changes or migrations: nothing new is stored.
- Editing days from this view, charts, notifications, offline data.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are disabled
(`workflow.checkpointCommits`). `/complete` makes the final feature commit.
Never accept a review packet you have not read; split any diff that is too large
to review.

## Build steps

- [x] **Step 1 - Loader and view helpers** - `loadArcPlans()` reads `DailyPlan`
      rows with `date` between `ARC_START` and `arcEnd()` (blocks ordered, mapped
      to `ArcDayInput`: `date` key, blocks `{ startTime, completed, tag }`).
      Pure helpers in `src/lib/arc/view.ts`: `arcProgress(todayKey)` returning
      `before | during {day} | after`, `currentWeek(summary, todayKey)` (the
      `WeekResult` whose `weekStart` is `weekStartOf(todayKey)`, or null outside
      the arc), `percent(passed, total)` (null when total is 0, otherwise a whole
      number rounded) and `parseDayParam(value)` (integer 1..90 or null).
      *Done when:* `npm test` passes with new tests covering each helper's
      boundaries (day 1, day 90, before and after the arc, week that starts
      before the arc, total 0, invalid and repeated `dia` values) and
      `npm run lint` is clean.
- [x] **Step 2 - Route, nav, header, streak, week and %** - `/winter-arc` page
      with the "Día X de 90" header, streak, current-week pace and the % per
      rule, plus the nav link (active state works like the other links). The
      page renders in every state: before the arc, during, after, and with no
      plans yet. *Done when:* `npm run build` passes; in the browser `/winter-arc`
      shows "Día 1 de 90" for 2026-10-03, streaks at 0, week counts and "Sin
      datos" or percentages as the data dictates, and the nav highlights
      "Winter Arc" on that route and not on others.
- [x] **Step 3 - 90-day grid and day detail** - the grid (status colors from the
      new tokens, accessible labels, today highlighted, 90 links) and the detail
      panel driven by `?dia=N`. Responsive: readable on a narrow phone viewport
      with no horizontal page scroll. *Done when:* in the browser, 90 cells show;
      clicking one shows its detail and updates the URL; `?dia=0`, `?dia=91`,
      `?dia=abc` and `?dia=1&dia=2` fall back to the default detail without
      error; the layout works at about 375 px wide; `npm run build`, `npm test`
      and `npm run lint` pass.

## Files / areas

- `src/app/winter-arc/page.tsx` (new)
- `src/components/winter-arc/` (new): small presentational components, e.g.
  `ArcGrid.tsx`, `DayDetail.tsx`, `RulePercentages.tsx`, `WeekPace.tsx`; server
  components unless interaction demands otherwise (none planned).
- `src/lib/arc/view.ts`, `src/lib/arc/view.test.ts` (new); `src/lib/arc/load.ts`
  (new, Prisma query).
- `src/components/layout/NavBar.tsx` (add the link)
- `src/app/globals.css` (status color tokens in `:root` and `@theme inline`)

## Data / contracts

- No schema change. Input is `DailyPlan` + `Block`, read-only. `DailyPlan.date`
  is a UTC-midnight `@db.Date`; keys come from `toDateKey`. "Today" comes from
  `resolveToday()` (America/Guayaquil), not the server clock.
- URL: `/winter-arc` with optional `dia` (1..90). Invalid or repeated values are
  ignored, not redirected.
- Display rules are fixed by 20b: gray = today, future or outside the arc; a past
  arc day without a plan is red; weekly results are `null` until the week ends.
- Single-user app: no auth or tenant scoping.

## Testing

- Test runner configured (`npm test`, Vitest). Logic in scope for tests:
  everything in `view.ts`. The loader's Prisma query and the components are not
  unit tested.
- No Browser tests command is declared; verify the page by hand in the dev
  server and report only what was actually observed.
- Manual path: open `/winter-arc`, check header, streak, week, percentages, the
  grid and the detail; complete some blocks in "Hoy" and confirm the numbers
  change after reload.

## Notes for the AI

- Read the relevant guide in `node_modules/next/dist/docs/` before writing the
  page (this Next.js version differs from older ones; `searchParams` is a
  Promise, as in the existing pages).
- Server components fetch with Prisma directly; do not add an API route (that is
  feature 21). Follow `historial/page.tsx` for layout and Spanish copy style.
- Route name and nav label are not fixed by the plans; `/winter-arc` and "Winter
  Arc" are the chosen defaults (easy to rename).
- Render stored text safely (no user text is displayed here besides numbers and
  dates). Use `<Link>` with `aria-current` for the selected cell.
- Do not recompute statuses or streaks in the UI; use `ArcSummary` as is.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6909,"specSha256":"d366079ca1aac2e6ad86dd05107e4461e310ffc0f3b7f2162bd8d6b564a10d78","branch":"refs/heads/feature/vista-winter-arc","head":"3d3a9da922534916846674c0ae89bdbab7d19cb8","baseRef":"refs/heads/master","baseCommit":"3d3a9da922534916846674c0ae89bdbab7d19cb8","sourceTree":"714855fe88fbed859ea4772f36d3d7ac0cdc542e","absentOptional":[]} -->

## Verification evidence

- `npm test` (60 tests pass), `npm run lint`, `npx tsc --noEmit` and `npm run build` passed.
- Browser (Playwright against the dev server, 2026-10-03): header "Día 1 de 90", streaks 0, week pace 0/5, 0/2, 0/4, "Sin datos" per rule, 90 grid links with accessible labels, `?dia=5` updates URL and detail, `dia=0|91|abc|1&dia=2` fall back to today's detail, no horizontal scroll at 375 px.
- Not observed: green, yellow and red cell colors (no past day yet existed); only the pending style rendered.

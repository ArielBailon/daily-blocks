# Feature: API de lectura

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/api-de-lectura`

## Goal

Expose the planner's data read-only over HTTP: `GET /api/days?from&to` returns
the days in a range with their blocks, tags and misc tasks, and
`GET /api/arc/stats` returns the same Winter Arc calculation the `/winter-arc`
view shows, so other tools can consume it.

## In scope

- `GET /api/days?from=YYYY-MM-DD&to=YYYY-MM-DD`: both required, inclusive,
  `from <= to`, at most 120 days (`to - from + 1 <= 120`). Returns only days
  that have a plan, ordered by date; days with no plan are omitted, not
  invented. Each day carries its blocks (ordered by start time) and its misc
  tasks.
- `GET /api/arc/stats`: today's progress plus the full `ArcSummary` computed by
  `computeArc` from the plans in the arc range, with "today" from
  `resolveToday()`. Same inputs and function as the view: no new calculation.
- Errors use the existing shape `{ "error": "<mensaje en español>" }`: 400 for a
  missing, malformed or impossible date, `from > to`, or a range over 120 days;
  500 for an unexpected failure, with a generic message and nothing leaked.
- Pure range validation with tests.

## Out of scope

- Any write, any change to schema or migrations, pagination, filtering by tag,
  and an API for a single day or for blocks.
- Authentication, API keys or rate limiting (see Open questions): the app has
  none today and this feature does not introduce them.
- Closing past plans: these endpoints must not write. Unlike the pages, they do
  not call `closePastPlans`, so `closed` is not part of the response.
- Changing the `/winter-arc` page or the rule engine.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are disabled
(`workflow.checkpointCommits`). `/complete` makes the final feature commit.
Never accept a review packet you have not read; split any diff that is too large
to review.

## Build steps

- [x] **Step 1 - `GET /api/days`** - pure `parseDayRange(from, to)` in
      `src/lib/validation/day-range.ts` returning either the two `Date`s (UTC
      midnight) or an error message; a query in `src/lib/daily-plan.ts` (or a
      sibling in `src/lib/`) fetching plans with `date` between them, blocks
      ordered by `startTime`; the route handler in
      `src/app/api/days/route.ts`. *Done when:* `npm test` passes with new tests
      for `parseDayRange` (valid range, same-day range, exactly 120 days, 121
      days, `from > to`, missing, repeated or malformed values, impossible dates
      such as `2026-02-30`), `npm run lint` and `npm run build` pass, and with the
      dev server running a request for a range covering today returns 200 with
      today's plan while `?from=2026-10-03&to=2027-02-01` (122 days), a missing
      `to` and `from=abc` return 400 with an `error` body.
- [x] **Step 2 - `GET /api/arc/stats`** - `src/app/api/arc/stats/route.ts` using
      `loadArcPlans`, `computeArc` and `arcProgress`, `dynamic = "force-dynamic"`.
      *Done when:* `npm run build` lists the route as dynamic, and with the dev
      server running the response matches what `/winter-arc` shows (streak,
      per-rule passed/total, 90 days) for the same moment; a database failure path
      is covered by the try/catch returning 500 with the generic error body.

## Files / areas

- `src/app/api/days/route.ts` (new)
- `src/app/api/arc/stats/route.ts` (new)
- `src/lib/validation/day-range.ts`, `src/lib/validation/day-range.test.ts` (new)
- `src/lib/daily-plan.ts` (add the range query) or a small sibling in `src/lib/`
- Reused unchanged: `src/lib/arc/load.ts`, `src/lib/arc/summary.ts`,
  `src/lib/arc/view.ts`, `src/lib/date.ts`.

## Data / contracts

- No schema change. Read-only over `DailyPlan` + `Block`. `DailyPlan.date` is a
  UTC-midnight `@db.Date`; keys are `YYYY-MM-DD` (`toDateKey` / `parseDateKey`).
- `GET /api/days` 200 body:

  ```json
  { "days": [
    { "date": "2026-10-03",
      "blocks": [ { "startTime": "06:30", "activity": "", "completed": false, "tag": "DEEP" } ],
      "miscTasks": [ "..." ] }
  ] }
  ```

  `tag` is a `BlockTag` string or `null`; `startTime` is `HH:MM`; `activity` and
  `miscTasks` are user text returned verbatim as JSON data (the API never renders
  HTML). An empty range result is `{ "days": [] }` with status 200.
- `GET /api/arc/stats` 200 body: `{ "today": "YYYY-MM-DD", "progress":
  <ArcProgress>, "summary": <ArcSummary> }`, where both types are the existing
  ones from `src/lib/arc/`. Status colors travel as the `DayStatus` strings
  (`green`, `yellow`, `red`, `gray`).
- Both are GET-only (other methods get Next's default 405) and not cached.
- Single-user app, no auth or tenant scoping exists; the endpoints are reachable
  by anyone who can reach the deployment URL, the same as the existing write
  routes.

## Testing

- Vitest (`npm test`): `parseDayRange` as listed in step 1. The Prisma query and
  the route handlers are not unit tested.
- Verify the endpoints by hand against the running dev server (the user starts
  it) and report only what was observed. `curl` or the browser is enough; no
  Browser tests command is declared.

## Notes for the AI

- Read the Route Handlers guide in `node_modules/next/dist/docs/` if unsure of
  this Next.js version's conventions; follow
  `src/app/api/days/[date]/misc-tasks/route.ts` for error shape and Spanish
  messages (`NextResponse.json({ error }, { status })`).
- Read `from`/`to` from `request.nextUrl.searchParams` (or `new URL`). A repeated
  parameter is invalid, not "first wins".
- Do not add dependencies, auth, CORS headers or caching layers.
- Do not touch the `/winter-arc` page; duplicating its three-line computation in
  the route is cheaper than a new abstraction.

## Open questions

- None blocking. To confirm at review: the API has no authentication. It exposes
  personal block text and misc tasks to anyone with the URL, exactly like the
  existing unauthenticated write routes. If that is not acceptable for a
  public Vercel deployment, say so before implementing; an access mechanism
  would be its own decision.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6312,"specSha256":"43d3088d4f5d837524d3738390afd1dfbcb3b247ee3590a9026557d129a10d28","branch":"refs/heads/feature/api-de-lectura","head":"b5491fd2a7f5572f70ddaca0b9501c5a1ba34d9c","baseRef":"refs/heads/master","baseCommit":"b5491fd2a7f5572f70ddaca0b9501c5a1ba34d9c","sourceTree":"203bd84b37f9d880c7ba6020fafd5fdba3d053d5","absentOptional":[]} -->

## Verification evidence

- `npm test` (67 tests pass), `npm run lint`, `npx tsc --noEmit` and `npm run build` passed; both routes listed as dynamic.
- `curl` against the dev server (2026-10-03): `/api/days` 200 for a range covering today (28 blocks) and 200 `{"days":[]}` for an empty range; 400 with a Spanish `error` for a 122-day range, missing `to`, repeated `from`, `from=abc` and `from` after `to`; POST returns 405. `/api/arc/stats` 200 with 90 days, streak 0/0 and weekly counts matching the `/winter-arc` view.
- Not exercised: the 500 error path (no database failure was forced).

# Feature: Motor de reglas

**From build-plan:** feature 20b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/motor-de-reglas

## Goal

A pure rule engine for the Winter Arc: given the days' blocks and today's date,
it returns each day's rule results and status, the weekly results, the streak
and the totals per rule. No database, no UI and no API here: 20c shows it and
21 serves it.

## In scope

New code under `src/lib/arc/`, pure functions only, with unit tests.

- **Constants** (`config.ts`): `ARC_START = "2026-10-03"`, `ARC_DAYS = 90` (the
  last day is 2026-12-31, derived, never typed twice), `DEEP_BLOCKS_PER_DAY = 8`,
  `DEEP_MIN_RUN = 2`, `SCREENS_OFF_MIN_BLOCKS = 2`, `GYM_DAYS_PER_WEEK = 5`,
  `WALKS_PER_WEEK = 2`, `JOB_HUNTING_BLOCKS_PER_WEEK = 4`.
- **Daily rules**
  - `DEEP` (Monday to Saturday; not applicable on Sunday): a run is a sequence
    of consecutive blocks (30 minutes apart) tagged `DEEP` and completed. Only
    runs of `DEEP_MIN_RUN` blocks or more count; the rule passes when the
    counted blocks total `DEEP_BLOCKS_PER_DAY` or more. A `DEEP` block that is
    not completed breaks the run.
  - `SCREENS_OFF` (every day): passes with `SCREENS_OFF_MIN_BLOCKS` or more
    completed `SCREENS_OFF` blocks.
- **Weekly rules** (weeks run Monday to Sunday)
  - `GYM`: counts the days with at least one `GYM` block where every `GYM`
    block is completed; target `GYM_DAYS_PER_WEEK`. Any weekday counts,
    including Thursday and Sunday (recovery days).
  - `WALK`: same counting with `WALK` blocks; target `WALKS_PER_WEEK`.
  - `JOB_HUNTING`: counts completed `JOB_HUNTING` blocks; target
    `JOB_HUNTING_BLOCKS_PER_WEEK`.
  - A week is **evaluable** only when its seven days are all inside the arc
    and its Sunday is before today. A week that is not evaluable still reports
    its counts (for the "current week" pace of 20c) but has `passed: null`.
- **Day status**: for a day inside the arc and before today, `green` when every
  applicable daily rule passes, `red` when none does, `yellow` otherwise. A
  past day with no plan is `red`. `gray` for today, future days, days before
  `ARC_START` and days after the last arc day. Sunday has only `SCREENS_OFF`,
  so it is green or red.
- **Streak** ("never fail twice in a row"), over past arc days in date order:
  green and yellow add 1; an isolated red neither adds nor breaks; two reds in
  a row reset the current streak to 0 (each further consecutive red keeps it
  at 0). Today and future days are ignored. Returns `current` and `best`.
- **Totals per rule**: `{ passed, total }`. Daily rules count past arc days
  where the rule applies (a missing plan counts as not passed); weekly rules
  count evaluable weeks.

## Out of scope

- Any database read, route, page, component or navigation (20c, 21).
- Time zone handling: the caller supplies `todayKey` (from `resolveToday`).
- Preloading or tagging blocks, new tags, schema or migrations.
- Formatting percentages (the view derives them from `passed` / `total`).

## Build loop

Per `blueprint/config.json`: `stepReview: "feature"` and `checkpointCommits:
"disabled"`. Implement the steps in order, run the checks of each step, then
stop for review. `/complete` creates the final commit.

## Build steps

- [x] 1. **Constants and daily rules.** Add `src/lib/arc/config.ts` and
  `src/lib/arc/rules.ts` with `evaluateDeep`, `evaluateScreensOff` and the
  input types (`ArcBlock = { startTime; completed; tag }`, `ArcDayInput = {
  date: "YYYY-MM-DD"; blocks: ArcBlock[] }`). Sort blocks by start time before
  looking for runs; use `toMinutes` from `@/lib/blocks`. Add
  `src/lib/arc/rules.test.ts`. *Done when:* `npm test` covers: 8 checked DEEP
  blocks in one run pass; 4+4 in two runs pass; a single 30-minute DEEP block
  does not count (7 in runs plus 1 isolated fails); an unchecked block in the
  middle splits a run; DEEP is not applicable on Sunday; SCREENS_OFF passes
  with 2 checked and fails with 1 checked plus 1 unchecked; non-DEEP tags and
  non-consecutive blocks never join a run.
- [x] 2. **Weekly rules and week evaluability.** In `rules.ts` add
  `evaluateWeek(days, weekStart, todayKey)` returning, per `GYM`, `WALK` and
  `JOB_HUNTING`, `{ count, target, passed }` and the week's `evaluable` flag
  (`passed` is `null` when not evaluable). Date math with `parseDateKey` /
  `toDateKey` from `@/lib/date` (UTC), no new date library. *Done when:*
  `npm test` covers: 5 gym days pass and 4 fail; a gym day with one unchecked
  `GYM` block does not count; a Sunday gym day counts toward the same week; a
  day with no `GYM` block does not count; walks 2 pass and 1 fails;
  JOB_HUNTING 4 checked blocks pass and 3 fail; the week of 2026-09-28 (only
  Oct 3-4 in the arc) is not evaluable; 2026-10-05 to 2026-10-11 is evaluable
  only when today is 2026-10-12 or later; the last arc week (2026-12-28 to
  2027-01-03) is never evaluable.
- [x] 3. **Status, streak, totals and `computeArc`.** Add
  `src/lib/arc/summary.ts` with `computeArc(plans: ArcDayInput[], todayKey:
  string, start = ARC_START)` returning `{ days, weeks, streak, rules }`:
  `days` has one entry per arc day (`date`, `dayNumber` 1-90, `status`,
  `hasPlan`, per-rule results with applicability, value and target); `weeks`
  lists every week touching the arc; `streak = { current, best }`; `rules` has
  `{ passed, total }` per rule. Ignore plans outside the arc. Add
  `src/lib/arc/summary.test.ts`. *Done when:* `npm test` covers: returns 90
  days, the first is 2026-10-03 (day 1) and the last 2026-12-31 (day 90);
  today and future days are gray; a past day without plan is red; green /
  yellow / red for a Monday with 2 / 1 / 0 daily rules passing; Sunday green
  with SCREENS_OFF and red without; streak sequences G Y G = 3, G R G = 2 (the
  isolated red neither adds nor breaks), G R R G = 1 (reset by two reds, then
  +1), R R R = 0, and today pending does not change the streak; `best` keeps
  the maximum; totals per rule match a small hand-built scenario; the same
  input always gives the same output. `npm run lint`, `npx tsc --noEmit` and
  `npm run build` pass.

## Files / areas

- `src/lib/arc/config.ts`, `src/lib/arc/rules.ts`, `src/lib/arc/summary.ts`
  and their `*.test.ts` (all new)
- Reuses [blocks.ts](src/lib/blocks.ts) (`toMinutes`, `BLOCK_MINUTES`),
  [date.ts](src/lib/date.ts) (`parseDateKey`, `toDateKey`) and
  [block-tags.ts](src/lib/block-tags.ts) (`BlockTag`)
- No change to the schema, routes, components or existing files.

## Data / contracts

- Input only: `ArcDayInput[]` (date key plus blocks with `startTime`,
  `completed`, `tag`) and `todayKey`. The engine never reads the database or
  the clock; 20c and 21 will map `DailyPlan` + `Block` rows into this shape.
- Outputs are plain serializable objects (no `Date`, no `Map`), so 21 can
  return them as JSON unchanged. Dates are `"YYYY-MM-DD"` strings.
- Duplicate dates in the input: the engine uses the first one (the database
  has one plan per date, so this is a defensive tie-break, not a feature).
- Status values: `"green" | "yellow" | "red" | "gray"`. Rule ids: `"DEEP" |
  "SCREENS_OFF" | "GYM" | "WALK" | "JOB_HUNTING"`.

## Testing

- Unit (Vitest, `npm test`): as listed per step, with hand-built days and
  fixed `todayKey` values. No database and no network.
- No runtime check needed: nothing here is reachable from the app yet. Do not
  claim UI or end-to-end evidence.
- `npm run lint`, `npx tsc --noEmit` and `npm run build` before review.

## Notes for the AI

- Read `node_modules/next/dist/docs/` only if you touch Next.js APIs; this
  feature should not.
- Keep it as plain functions and types: no classes, no dependency, no
  configuration surface beyond the constants above.
- The block grid is 30 minutes (`BLOCK_MINUTES`); consecutive means exactly
  one step apart.
- Decisions recorded from earlier chat, do not reinterpret: a block without a
  check means it was not done; unexpected events are not recorded; the type of
  workout is not modeled; DEEP blocks are tagged by hand by the user.

## Open questions

- None blocking. To confirm at review: today is always `gray` even if all its
  rules already pass, and a day after 2026-12-31 is `gray`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8228,"specSha256":"97940fba44752e645a3a27944cd54a47a597a3130c8274d13dbc2712d61c7695","branch":"refs/heads/feature/motor-de-reglas","head":"4574a79936afdf3e50d962dcc5c121127d6f6c99","baseRef":"refs/heads/master","baseCommit":"4574a79936afdf3e50d962dcc5c121127d6f6c99","sourceTree":"b33ddfcb33be73aec59cd58e868716d40dc63649","absentOptional":[]} -->

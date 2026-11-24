# Feature: Plan vs. realidad en Hoy e Historial

**From build-plan:** feature 28
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/plan-vs-realidad-en-hoy-e-historial`

## Goal

Show, under each past or current block, what really happened on the PC: a
compact stacked bar by category plus idle time, and the top 3 apps when the bar
is expanded. Hoy shows it for today; Historial for the chosen past date, read
from ActivityWatch's own history on the PC. A DEEP block that drifted into
distraction gets a subtle highlight. Built on the client and provider of
feature 27; nothing is stored and the backend does not change.

## In scope

- `useBlockSummaries(dateKey, startTimes)`: queries the started blocks of the
  day in one `query` call, refreshes every 60 s, pauses while the tab is
  hidden, refreshes at once when it comes back or when the status turns
  `connected`, and keeps finished blocks in an in-memory cache so they are not
  queried again (`periodsToFetch` from 27).
- `BlockActivityProvider` (wraps a day's block list, runs the hook once) and
  `BlockActivity` (one block's bar and expandable top 3 apps).
- Hoy: under each block row of today, for past and current blocks only. Future
  blocks and future dates show nothing.
- Historial: the same under each block of the chosen date (all past, so one
  query and then only the cache).
- DEEP highlight: tag `DEEP` and more than 20% of the block's active time in
  `DISTRACTION_CATEGORIES` -> a subtle accent ring on the bar plus a text
  alternative. In Hoy it follows the tag as edited in the row.
- Pure logic with tests: bar segments by top-level category plus idle, and the
  DEEP-distraction rule.
- Desktop only and silent: nothing renders unless the status is `connected` and
  the block has a summary; hidden below `md`. No placeholders, spinners or
  error text.

## Out of scope

- Ahora, the live current app, distraction minutes of a focus session and the
  alert banner (29).
- Any backend, schema, API or persistence change; sending ActivityWatch data
  to the daily-blocks API.
- Category editing, per-category legends outside the bar, the mobile version.
- Changing how Hoy or Historial behave beyond inserting the bar.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Bar logic with tests** - `barSegments(summary)` and
      `isDeepDistracted(summary, tag)` in `src/lib/activitywatch/summary.ts`.
      *Done when:* `npm test` and `npm run lint` pass with the cases under
      Testing.
- [x] **Step 2 - Summaries hook and provider** -
      `src/components/activitywatch/BlockActivityProvider.tsx` with
      `useBlockSummaries` and `useBlockSummary(startTime)`. *Done when:*
      `npm run lint` and `npm run build` pass; behavior checked in step 4.
- [x] **Step 3 - Bar in Hoy and Historial** -
      `src/components/activitywatch/BlockActivity.tsx`, inserted in
      `BlockRow` (Hoy) and in the Historial block list, each list wrapped in
      `BlockActivityProvider`. *Done when:* `npm run lint` and `npm run build`
      pass; rendering checked in step 4.
- [x] **Step 4 - Live run-through** - dev server on port 3000 with
      ActivityWatch running, flows under Testing. *Done when:* each flow passes
      or is reported, and `npm test`, `npm run lint` and `npm run build` pass.

Step 4 evidence note (2026-11-24): run with the user's approval in this chat,
real ActivityWatch, driven with Playwright, no database writes and no tag
changes (real DEEP blocks with distraction existed, so no block was retagged).
The dev server that answered was the one started for feature 27 (PID 31408,
left running because stopping its shell did not stop Node); it served this
working tree with hot reload and was killed at the end. Observed on Hoy at
1280 px: one `/api/0/query/` call with 12 periods on load; bars on the 12 past
and current blocks (06:30-12:00) and none from 12:30 on; the DEEP blocks at
08:30 and 09:00 showed the accent ring and their label ended in "distraccion en
bloque Deep" (Media 47% of the 09:00 block), the other DEEP blocks did not;
clicking the 09:00 bar listed "chrome.exe 18 min, claude.exe 6 min, Code.exe 3
min" and clicking again collapsed it. The next call came 60.5 s later with 1
period (the current block). With `document.hidden` forced true no call ran for
65 s, and one ran right after the tab came back. Navigating Hoy -> Historial ->
Hoy client-side queried only 1 period on return (finished blocks from the
module cache). Historial 2026-11-21: 35 bars from one call with 35 periods.
Historial 2026-09-20 (4 blocks, no PC activity recorded): 4 fully idle bars. At
390 px: no request to port 5600 and no bar; widening to 1280 px started the
queries and showed 12 bars. With port 5600 blocked in the browser (same fetch
failure as ActivityWatch off) the bars disappeared within one 10 s poll, the
NavBar said "ActivityWatch no disponible", all 35 rows stayed and there were no
page errors. Screenshot reviewed for alignment under the activity column.
Not observable: a date before ActivityWatch was installed (2026-09-12), because
no plan exists before 2026-09-20. Console noise seen and unrelated: the dev-only
500 on `/icon/192`, and "Failed to fetch RSC payload" errors caused by the
first version of the test's own fetch spy (fixed and rerun).

## Files / areas

- New: `src/components/activitywatch/BlockActivityProvider.tsx`,
  `src/components/activitywatch/BlockActivity.tsx`.
- Edited: `src/lib/activitywatch/summary.ts` and `summary.test.ts`;
  `src/app/page.tsx` (wrap the block `<ol>`); `src/components/hoy/BlockRow.tsx`
  (render `BlockActivity` under the row with the row's current tag);
  `src/app/historial/page.tsx` (wrap the `<ol>`; each `<li>` becomes a column
  holding the existing row plus `BlockActivity`, same look).
- Reused from 27: `useActivityWatch().status` and `.query`, `blockPeriod`,
  `periodsToFetch`, `distractionSeconds`, `PeriodSummary`.

## Data / contracts

No schema, API or persisted data. Everything below runs in the browser.

- `useBlockSummaries(dateKey, startTimes): Record<string, PeriodSummary>`
  keyed by block start time. It does nothing unless `status === "connected"`.
  Each run computes `periodsToFetch(dateKey, startTimes, Date.now(), cache)`;
  when non-empty it calls `query(periods)` once; on success it stores every
  result in state and stores finished blocks (`endMs <= now`) in the cache; on
  `null` (failure) it keeps the previous state (the provider of 27 already
  turns the status `unavailable`, which hides everything). Runs: on connect, on
  tab visible, and every 60 s while visible. Calls never overlap; a result that
  arrives after unmount or after `dateKey` changed is dropped.
- Cache: a module-level `Map<period, PeriodSummary>` in the provider file, so
  it survives navigation between Hoy and Historial for the tab's life. Only
  finished blocks go in; the current block is always queried again.
- `barSegments(summary)` -> `{ key, label, percent }[]`: categories grouped by
  their top-level name (`Work`, `Media`, `Comms`, `Uncategorized`, or any
  user-defined top level), sorted by percent descending, then an `idle`
  segment when idle > 0. Percents are of the 30-minute period and sum to 100.
  Segments under 0.5% are dropped from the bar (still counted in the text
  alternative's active total).
- Colors (theme tokens, dark theme): `Work` -> `status-green`, `Media` ->
  `status-red`, `Comms` -> `status-yellow`, any other category ->
  `foreground/35`, idle -> `muted`.
- `isDeepDistracted(summary, tag)`: `tag === "DEEP"`, `activeSeconds > 0` and
  `distractionSeconds(categories) / activeSeconds > 0.2`.
- Rendering (`BlockActivity`, `hidden md:block`): a full-width bar 6 px tall,
  rounded, with one segment per entry, below the row and aligned with the
  activity column. The bar is a `button` with `aria-expanded` and an
  `aria-label` such as "Actividad real: Work 50%, Media 17%, inactivo 33%";
  clicking it toggles the top 3 apps as `app · N min` (minutes rounded, `<1
  min` under 30 s), or "Sin actividad" when no app has time. DEEP highlight:
  `ring-1 ring-accent/60` on the bar and the label gains "distracción en bloque
  Deep". App and category names are rendered as React text only.
- Which blocks: Hoy passes all of today's block start times; `periodsToFetch`
  drops future ones, and `BlockActivity` renders only when its block has a
  summary. On a future date (`/?fecha=...`) the provider gets no start times,
  so nothing is queried. Historial passes the chosen date's start times.
- Privacy: summaries hold app names and category paths only (27's query never
  returns titles or URLs); nothing is logged or sent to the daily-blocks API.

## Testing

Vitest, pure logic only. Cases:

- `barSegments`: groups `Work > Programming` and `Work` into one `Work`
  segment; adds idle last; drops segments under 0.5%; all-idle summary gives a
  single idle segment; percents sum to 100.
- `isDeepDistracted`: DEEP with 21% distraction of active time -> true; exactly
  20% -> false; non-DEEP tag or null -> false; zero active time -> false;
  `Work > Video` does not count.

Live flows (step 4, dev server started and stopped by the agent with the
user's approval, real ActivityWatch, no database writes beyond what opening Hoy
already does):

1. Hoy at 1280 px: past and current blocks show a bar; future blocks show none;
   clicking a bar shows up to 3 apps with minutes and collapses again.
2. Exactly one request to `/api/0/query/` on load, then about one per 60 s;
   a finished block's period stops appearing in later query bodies; no request
   while the tab is hidden.
3. A DEEP block with distraction shows the accent ring (checked on a real block
   if one exists, otherwise by temporarily tagging a past block DEEP in the UI
   and restoring the tag afterwards, with the user's approval).
4. Historial for a past date with ActivityWatch data shows the bars; a date
   before ActivityWatch was installed shows all-idle bars.
5. At 390 px no bar shows and no request goes to port 5600; with ActivityWatch
   stopped the bars disappear without errors in the app.

## Notes for the AI

- Read the client component guide in `node_modules/next/dist/docs/` before
  writing the provider and keep the enforced lint rules (no synchronous state
  in effects, no impure calls during render).
- Decisions where the request was silent, to confirm at review: segments are
  grouped by top-level category (Work, Media, Comms, other) to stay readable at
  6 px, with subcategories only in the 27 data; the bar itself is the expand
  control; a block before ActivityWatch existed shows a fully idle bar (it is a
  real "no activity" reading); app names are shown as ActivityWatch reports them
  (for example `chrome.exe`).
- Hoy: `BlockRow` keeps its current behavior; the bar is a sibling under the
  row, never inside the input or the checkbox label.
- No migration, no new dependency. Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11310,"specSha256":"e64bf2320a8d78cfa4ce7546d1b58c3c8183a275d0cee16268922fea264768ed","branch":"refs/heads/feature/plan-vs-realidad-en-hoy-e-historial","head":"73a7c3e2df112453bb9a63cc6bed8423de9de103","baseRef":"refs/heads/master","baseCommit":"73a7c3e2df112453bb9a63cc6bed8423de9de103","sourceTree":"06a914f2b994d4c0b8fe2c1ac959bb295f75b5db","absentOptional":[]} -->

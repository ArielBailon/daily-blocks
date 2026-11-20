# Feature: Modo "Ahora"

**From build-plan:** feature 25
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/modo-ahora`

## Goal

Add `/ahora`, a minimal phone-first view that answers "what should I be doing
right now": the current block by the clock (America/Guayaquil), the active focus
session with a large countdown, the next block, and a play button to start a
session on the current block. It reuses the focus client from feature 24.

## In scope

- New route `/ahora` and an "Ahora" entry in the NavBar (the bar must still fit
  and read cleanly at 390 px with six links).
- The view fills the screen and shows, for today's plan:
  - the current time of day (HH:MM, America/Guayaquil);
  - the current block: its time span, activity, tag label and whether it is
    completed;
  - the active focus session, when there is one: phase (Trabajo / En pausa /
    Descanso), the remaining time in large type, and the covered blocks;
  - the next block (time, activity);
  - a play button that opens the existing preset picker on the current block.
- Current and next block are derived from the clock: a block starting at `S`
  covers `[S, S + 30 min)`; the next block is the one after the current block,
  or, when no block is current, the first block that starts later.
- The view updates as time passes (no reload needed) and notices a date change.
- Screen Wake Lock while a session is active (work, pause or break), requested
  again when the tab becomes visible; released when the session ends or the
  view closes. If the API is missing or the request fails, nothing happens.
- Empty states: no plan or a plan without blocks shows a link to Hoy to generate
  it; before the first block, after the last one, or in a gap shows what applies
  (next block or "El plan de hoy terminó") with the play button disabled.
- Session controls (Pausar/Reanudar, Terminar, Abandonar) and the mandatory break
  screen come from the existing `FocusBar` and `BreakScreen`, mounted on this
  page.

## Out of scope

- Fullscreen API, notifications, service worker changes, new API routes or
  schema changes.
- Editing blocks, tags or the checkbox from `/ahora`; changing Hoy.
- Metrics (26).
- Rewriting `FocusProvider`, `FocusBar` or `PresetPicker` beyond what reuse needs.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Clock helpers with tests** - `localMinutesOfDay(now)` in
      `src/lib/date.ts` (minutes since local midnight in America/Guayaquil) and
      `findCurrentAndNext(blocks, minutes)` in `src/lib/blocks.ts`, with tests.
      *Done when:* `npm test`, `npm run lint` and `npm run build` pass with the
      cases listed under Testing.
- [x] **Step 2 - Route, nav entry and time view** - `src/app/ahora/page.tsx`
      (server: today's plan, `force-dynamic`, no writes), `AhoraView.tsx`
      (client: clock tick, current and next block, empty states, date-change
      refresh), mounted under `FocusProvider`; NavBar link and spacing fix.
      *Done when:* `npm run lint` and `npm run build` pass, and in step 4 the page
      shows the current and next block for the real time at 390 px and the NavBar
      fits.
- [x] **Step 3 - Session display, play button and wake lock** - big countdown
      for the active session, play button on the current block (opens
      `PresetPicker`), `FocusBar` mounted on the page,
      `src/components/ahora/useWakeLock.ts`. *Done when:* `npm run lint` and
      `npm run build` pass, and in step 4 a session started from `/ahora` shows
      the large timer and holds a wake lock, which is released when it ends.
- [x] **Step 4 - Live run-through** - with a running dev server, check the flows
      in the Testing section on today's real plan, restoring any `completed`
      values and deleting test sessions afterwards. *Done when:* each flow passes
      and any failure is fixed or reported; `npm test`, `npm run lint` and
      `npm run build` pass.

Step 4 evidence note: run with the user's approval in this chat, with a dev
server started and stopped by the agent, against the real database and today's
real plan, driving the page at 390 px through Playwright. Observed: the view
showed the real current and next block; it moved to the next block by itself
within the 15 s tick (no reload); the NavBar wraps to two rows ("Plantillas"
alone on the second) with no horizontal scroll; a session started from the play
button showed the 72 px timer and the bar, and `navigator.wakeLock.request` was
called once and released on abandon; with a break, the wake lock was held
through it (0 releases) and released on skipping; the current block showed
"Completado" without reload when the work phase ended. Block `completed` values
were restored from a snapshot taken first and the 2 test sessions were deleted.
Phase ends were brought forward by editing the session timestamps in the
database. Not exercised live: the no-plan state (today has a plan; the branch
is only read in code), the gap and after-last-block states (the pure
`findCurrentAndNext` cases are tested, the rendering of "Sin bloque ahora" and
"El plan de hoy terminó" was not seen), and the midnight date-change refresh.

## Files / areas

- New: `src/app/ahora/page.tsx`, `src/components/ahora/AhoraView.tsx`,
  `src/components/ahora/useWakeLock.ts`.
- Edited: `src/components/layout/NavBar.tsx`, `src/lib/date.ts` (also `serverNowMs()`, added in step 2 because the lint rules forbid `Date.now()` inside a server component),
  `src/lib/blocks.ts` and its tests (a `date.test.ts` is added).
- Reused: `FocusProvider`, `FocusBar`, `BreakScreen`, `PresetPicker`,
  `useRemainingMs`, `getDayPlan`, `resolveToday`, `toDateKey`,
  `BLOCK_TAG_LABELS`, `GET /api/focus/active`, `POST /api/focus/sessions`,
  `PATCH /api/focus/sessions/[id]`.

## Data / contracts

No schema or API change. The server page passes plain props to the client view:
`dateKey` (today), `initialNowMs` (server clock, so the first render is the same
on server and client) and `blocks`
`{ id, startTime, activity, tag, completed }[]` ordered by start time. The same
list, without `completed`, goes to `FocusProvider`.

- `localMinutesOfDay(now: Date): number` in 0-1439, from the
  America/Guayaquil wall clock (`Intl.DateTimeFormat` with that zone), never the
  server or browser zone.
- `findCurrentAndNext(blocks, minutes)` returns
  `{ current: Block | null, next: Block | null }`: `current` is the block with
  `start <= minutes < start + 30`; `next` is the following block in the list when
  there is a current one, otherwise the first block with `start > minutes`.
- Date change: the view recomputes today's key from the clock; when it differs
  from `dateKey` it stops showing a current block and calls `router.refresh()`
  (the server then renders the new day). Time updates run on an interval of at
  most 15 s plus on tab visibility.
- Completed state of the current block: the server value, or true once
  `marks[id] > 0` from `useFocus()` (a session just marked it).
- Wake lock: `navigator.wakeLock.request("screen")` while a session is active;
  one sentinel at a time; re-request on `visibilitychange` to visible (the
  browser releases it when hidden); release on cleanup; every failure ignored.
- Activity and tag text render as React text only. The play button is disabled
  while the focus state is loading, while a session is active, and when there is
  no current block.
- Errors from the focus client appear in `FocusBar`; the page itself has no
  other request.

## Testing

Vitest, pure logic only (no jsdom or browser runner is configured, and none is
added). Cases:

- `localMinutesOfDay`: a UTC instant that is 10:12 in Guayaquil gives 612;
  midnight local gives 0; 23:59 local gives 1439; a UTC instant on the next UTC
  day but still the same Guayaquil day; independent of the process time zone.
- `findCurrentAndNext`: exact block start and one minute before the next start;
  last block; before the first block (no current, next is the first); after the
  last block (no current, no next); a gap in the list; empty list; the block
  after the current one is returned even when it is not 30 minutes later.

Live flows (step 4, user-approved dev server, real database): `/ahora` shows the
current block and the next for the real time; the NavBar fits at 390 px with
six links; a session started with the play button shows the large timer and
the bar, and `navigator.wakeLock.request` was called (spied) and released on
abandon; the break screen shows and the wake lock persists through it; with no
plan the link to Hoy appears (checked by reading the empty-state branch if
today's plan cannot be removed); a block auto-marked while on `/ahora` shows
completed.

## Notes for the AI

- `AGENTS.md` warns this Next.js has breaking changes: read the relevant
  client-component and page guides in `node_modules/next/dist/docs/` before
  writing UI, and keep the lint rules already enforced (no state set
  synchronously in effects, no impure calls during render).
- Decisions where the plan was silent, to confirm at review: "pantalla completa"
  means the view fills the viewport, not the Fullscreen API; the existing
  `FocusBar` stays at the bottom for controls even though the large timer repeats
  the time; the clock follows the device after the first render; wake lock also
  holds during the break; `/ahora` does not close past plans (read only).
- A page left open past midnight must not show yesterday's blocks as current:
  the date-change refresh exists for that.
- The dev server and any writes to the real database need the user's approval in
  the current chat; test with the empty late blocks, restore `completed` values
  against a snapshot and delete test sessions. Phase ends can be brought forward
  by editing the session's end timestamps and reloading.
- This feature needs no migration.
- Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10228,"specSha256":"c3f91abe8e12cc330090696fd430434a73bfe49269a06ee5a5314482d2c70092","branch":"refs/heads/feature/modo-ahora","head":"55d9f79179969364c1d4371be590b17738f4988f","baseRef":"refs/heads/master","baseCommit":"55d9f79179969364c1d4371be590b17738f4988f","sourceTree":"8e690b392d4e2ec6c82cf8e94a5bfd00472c3584","absentOptional":[]} -->

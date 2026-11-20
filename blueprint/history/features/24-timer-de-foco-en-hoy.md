# Feature: Timer de foco en Hoy

**From build-plan:** feature 24
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/timer-de-foco-en-hoy`

## Goal

Put the Pomodoro in front of the user inside "Hoy": a play button on each of
today's blocks starts a focus session through the API from feature 23, a fixed
bar shows the running timer, a mandatory full-screen break follows, and the
blocks the server auto-marks show as done without a reload.

## In scope

- Play button on every block row of **today** (not on future days, not in
  Historial). Disabled while a session is active (work, pause or break) and
  until the active session has been read from the server.
- Preset picker opened by the play button, with the suggested preset
  preselected: Clasico, Deep 2 bloques, Deep 3 bloques, Personalizado. It shows
  how many blocks the choice covers and warns when fewer fit.
- Personalizado: work 5-120 min and break 0-30 min, validated inline with the
  same limits as the server; last values remembered in `localStorage` inside
  try/catch (a convenience only).
- Suggested preset: block tagged `DEEP` suggests Deep 2 bloques; otherwise count
  consecutive blocks from the chosen one with the same non-empty activity (trim,
  case-insensitive): 1 gives Clasico, 2 gives Deep 2 bloques, 3 or more give Deep
  3 bloques. An empty activity counts as 1.
- Fixed active-timer bar: phase (Trabajo / Descanso), remaining time, covered
  blocks, Pausar/Reanudar, Terminar, Abandonar.
- Remaining time is always `workEndsAt - now` (or `breakEndsAt - now`, frozen
  at `pausedAt` while paused); the interval only repaints. `now` is the browser
  clock corrected by the `serverNow` the API returns.
- The session is restored with `GET /api/focus/active` when the page loads, and
  re-read when the tab becomes visible again and when the local clock passes the
  end of a phase (the read settles the phase and marks blocks on the server).
- Mandatory break: full-screen countdown over the page; "Saltar descanso" asks
  for confirmation and calls `skipBreak`.
- In-app feedback only: a short chime (Web Audio, no asset) and
  `navigator.vibrate` when work ends and when the break ends, only for a
  transition seen while the app is open and recent (not for one that finished
  long ago while the tab was in the background or closed).
- Blocks marked by the server show as completed without reloading, without
  discarding text the user is typing, and again after a later session even if
  the user had unchecked the block by hand.
- Mobile-first layout; the bar never hides the last block row.

## Out of scope

- `/ahora` and Screen Wake Lock (25); Historial, `/winter-arc` and
  `GET /api/days` metrics (26).
- Push, Notification API, service worker changes, background jobs.
- Server or schema changes (feature 23 contracts are used as they are). The only
  server-side file touched is moving the DTO type, see Files.
- Changing Generar dia, block editing, Tareas varias or the Winter Arc rules.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Shared type and pure helpers with tests** - move
      `FocusSessionDto` to `src/lib/focus/types.ts` (status as the string union
      from `session.ts`; `service.ts` imports it and re-exports nothing new), so
      client code never imports `service.ts`. Add
      `src/lib/focus/suggest.ts` (`suggestPreset`), `src/lib/focus/clock.ts`
      (`formatClock`, `clockOffset`, `stateFromDto`, `shouldAlert`) and tests.
      *Done when:* `npm test`, `npm run lint` and `npm run build` pass with the
      cases listed under Testing.
- [x] **Step 2 - Provider and timer bar** - `src/components/focus/FocusProvider.tsx`
      (context and `useFocus`: session, loaded flag, error, start, pause,
      resume, finish, abandon, skipBreak, remaining time, marked-block signals),
      `FocusBar.tsx`, mounted in `src/app/page.tsx` around the page content with
      bottom padding while a session is active. Server errors (409, 404, 5xx)
      show a message in the bar and trigger a re-read. *Done when:* `npm run
      lint` and `npm run build` pass, and with a session created through the API
      the bar shows phase, remaining time and covered blocks (seen in step 5).
- [x] **Step 3 - Play button, preset picker and block sync** - `PlayButton`
      and `PresetPicker.tsx` (dialog with focus handling, labelled fields,
      inline validation, coverage warning), `BlockRow.tsx` gets the button and
      the "marked by focus" sync, `page.tsx` passes the day's block list for the
      suggestion and `canFocus={!isFuture}`. *Done when:* `npm run lint` and
      `npm run build` pass, and in step 5 a started session covers the expected
      blocks and its auto-marked blocks tick without reload.
- [x] **Step 4 - Break screen and feedback** - `BreakScreen.tsx` (full-screen
      `role="dialog"` countdown, "Saltar descanso" with `window.confirm`),
      `src/lib/focus/feedback.ts` (chime and vibrate, audio unlocked from the
      play-button click), play buttons disabled during the break. *Done when:*
      `npm run lint` and `npm run build` pass, and in step 5 the break screen
      appears on the work end, skipping needs the confirmation, and the chime and
      vibration fire only for a live transition.
- [x] **Step 5 - Live run-through** - with the dev server started by the user, run
      the flows in the Testing section on today's real plan. Record the covered
      blocks' `completed` values first and restore them afterwards. *Done when:*
      each flow passes and any failure is fixed or reported; `npm test`,
      `npm run lint` and `npm run build` pass.

Step 5 evidence note: run with the user's approval (the user asked me to start
the dev server) against the real database and today's real plan, driving the
page in a 390 px browser through Playwright. Test sessions touched only the
empty 23:00 and 23:30 blocks; `completed` values were restored and compared with
a snapshot taken first (0 differences), and the 4 test sessions were deleted.
Phase ends were brought forward by editing `workEndsAt` / `breakEndsAt` in the
database and reloading the page, since the shortest session is 5 minutes. Not
exercised live: a play button on a future day with blocks (the future date used
had no plan; covered only by reading `canFocus={!isFuture}`), the audible chime
and vibration (the pure alert rule is tested, the sound itself was not heard),
and the Historial page has no play button by construction (its own markup).
The Next.js dev indicator overlaps the first bar button in development only.

## Files / areas

- Server-side (type move only): `src/lib/focus/service.ts`, new
  `src/lib/focus/types.ts`.
- Pure logic: `src/lib/focus/suggest.ts`, `clock.ts`, `custom.ts` (custom-minutes validation and storage parsing, added in step 3) and tests (reuses
  `config.ts` and `session.ts`, which have no Prisma).
- Client: `src/components/focus/FocusProvider.tsx`, `FocusBar.tsx`,
  `PresetPicker.tsx`, `BreakScreen.tsx`, `src/lib/focus/feedback.ts`.
- Edited: `src/components/hoy/BlockRow.tsx`, `src/app/page.tsx`.
- Reused: `GET /api/focus/active`, `POST /api/focus/sessions`,
  `PATCH /api/focus/sessions/[id]`, Tailwind tokens in `globals.css`.

## Data / contracts

No schema or API change. The client uses the feature 23 DTO (`status`,
`blockIds`, `workEndsAt`, `breakEndsAt`, `pausedAt`, `blocksMarked`,
`serverNow`, ...) and `POST` coverage `{ requested, covered, trimmed }`.

- Clock: on every response compute `offset = serverNow - Date.now()` and use
  `Date.now() + offset` as `now`. Remaining time is clamped at 0.
- Phase end: when the corrected `now` reaches `workEndsAt` (or `breakEndsAt`)
  the client reads `GET /api/focus/active` at most once per second until the
  phase changes, so a small clock error cannot loop requests.
- Alert rule: `shouldAlert(prev, next, now)` is true only for WORKING to BREAK or
  BREAK to COMPLETED seen in this page session, and only when the scheduled end
  time is within the last 10 seconds of `now`.
- Marked blocks: every DTO with `blocksMarked` true contributes its `blockIds`
  once per session id; rows set `completed` true when their id is newly marked,
  also updating the row's confirmed value so a failed later save rolls back
  correctly.
- Confirmations (existing `window.confirm` pattern): Abandonar always; Terminar
  only when the worked time is below 80% (blocks would not be marked); Saltar
  descanso always.
- Custom form: integers only, work 5-120, break 0-30 (shared constants from
  `config.ts`), errors announced with `role="alert"` and tied to the field;
  stored in `localStorage` under one key, parsed defensively.
- Text from the block activity is rendered as React text only.
- Error text is Spanish; unexpected failures show a generic message.

## Testing

Vitest, pure logic only (no jsdom or browser runner is configured, and none is
added). Cases:

- `suggestPreset`: DEEP tag gives Deep 2 even when a run of 3 exists; runs of 1,
  2 and 3+ with the same activity; case and spacing ignored; empty activity gives
  Clasico; run stops at a different activity; last block.
- `formatClock`: 0, 59 s, 1 min, 25:00, 120:00, negative clamped, ms rounded up.
- `clockOffset` and corrected now; `stateFromDto` parses dates and keeps fields.
- `shouldAlert`: live work end, live break end, stale transition (older than 10
  s), no transition, pause and resume do not alert, first load in BREAK does not.

Live flows (step 5, user-started server, real database, real blocks): start a
CLASSIC session from a block; second play is disabled; reload restores the bar;
pause and resume keep the remaining time; Terminar under 80% asks confirmation
and marks nothing; Abandonar asks confirmation; a custom 5/0 session runs to the
end and ticks its block without reload; a DEEP block suggests Deep 2; trimmed
coverage at the last block shows the warning; break screen blocks the page and
Saltar descanso needs confirmation; future days and Historial have no play
button; narrow viewport (about 375 px) keeps the bar clear of the last row.

## Notes for the AI

- `AGENTS.md` warns this Next.js has breaking changes: read the relevant guide in
  `node_modules/next/dist/docs/` (client components, `useEffect` and hooks rules
  in the installed React) before writing UI. Follow the lint rules already
  enforced (for example no state set synchronously in effects).
- Decisions where the plan was silent, to confirm at review: the provider is
  mounted on Hoy only (the bar does not follow to other routes; 25 reuses the
  provider later); the bar sits at the bottom, fixed, with safe-area padding; the
  play button is disabled during work and pause too, not only during the break
  (the server would answer 409); Terminar confirms only below 80%; the chime is a
  synthesized beep; the suggestion reads the block list from the server render,
  so it can lag behind unsaved edits in other rows.
- Step 5 writes to the real database and can mark real blocks: note their
  `completed` state first and restore it, and abandon test sessions instead of
  letting them complete when marking is not needed.
- The dev server is started by the user; do not start it.
- Remind the user that this feature needs no migration.
- Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11638,"specSha256":"045130fd5e23ed645c1bbffba92227914a3a2e36bab8b500cc0a465b45447dc5","branch":"refs/heads/feature/timer-de-foco-en-hoy","head":"3b88d49126abd1830c8528602c610c6e86924486","baseRef":"refs/heads/master","baseCommit":"3b88d49126abd1830c8528602c610c6e86924486","sourceTree":"49d83bbea5e74dea6062f56f83c55d9b79991279","absentOptional":[]} -->

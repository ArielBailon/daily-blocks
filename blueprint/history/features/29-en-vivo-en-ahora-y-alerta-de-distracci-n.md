# Feature: En vivo en Ahora y alerta de distracción

**From build-plan:** feature 29
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/en-vivo-en-ahora-y-alerta-de-distracci-n`

## Goal

Make `/ahora` show what is happening on the PC right now (current app, how
long, active or idle, the window title only on request) and, during a focus
session, how many minutes went to distraction. When the active focus session
or the current DEEP block passes `DISTRACTION_ALERT_MINUTES`, show a
dismissible in-app banner in Hoy and Ahora. Built on 27 and 28; client-side
only, desktop only, nothing stored.

## In scope

- Ahora, under the current block: current app and time in it, "Activo" or
  "Inactivo", and the window title hidden by default behind a "Mostrar título"
  toggle whose preference lives in `localStorage` (wrapped in try/catch).
- Ahora, with a focus session in WORKING: "Distracción en esta sesión: N min",
  counted from the session's `startedAt` to now.
- Banner in Hoy (today only) and Ahora when the WORKING session, or the current
  DEEP block of today, has more than `DISTRACTION_ALERT_MINUTES` (5) minutes
  of distraction. A "Descartar" button hides it; it does not come back for the
  same session or block, only when a new session or block crosses the
  threshold.
- Time in the current app: consecutive window events of the same app, so
  switching tabs or documents inside one app does not reset it.
- Pure logic with tests: the app streak start and the alert choice.
- Silent like 27 and 28: nothing renders unless the status is `connected`;
  hidden below `md`.

## Out of scope

- Push, the Notification API, sound, vibration and service worker changes.
- Any change to `FocusSession`, the Pomodoro logic, `FocusProvider`,
  `FocusBar`, the Winter Arc engine, the backend or the schema. Saving
  distraction minutes per session would touch `FocusSession`; it is a separate
  proposal, not part of this feature.
- The block bars of 28, URLs from the web watcher, the mobile version.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Live logic with tests** - `src/lib/activitywatch/live.ts`
      (`appStreakStart`, `pickAlert`) and `readCurrent` in `client.ts` using
      the streak. *Done when:* `npm test` and `npm run lint` pass with the cases
      under Testing.
- [x] **Step 2 - Distraction hook and banner** -
      `src/components/activitywatch/useDistraction.ts`,
      `DistractionBanner.tsx`, and `DistractionAlert.tsx` (hook plus banner)
      inserted in Hoy. *Done when:* `npm run lint` and `npm run build` pass;
      behavior checked in step 4.
- [x] **Step 3 - Live panel in Ahora** -
      `src/components/activitywatch/LiveActivity.tsx` with the title toggle,
      and `AhoraView` rendering the banner and the panel from one
      `useDistraction` call. *Done when:* `npm run lint` and `npm run build`
      pass; rendering checked in step 4.
- [x] **Step 4 - Live run-through** - dev server on port 3000 with
      ActivityWatch running, flows under Testing. *Done when:* each flow passes
      or is reported, and `npm test`, `npm run lint` and `npm run build` pass.

Step 4 evidence note (2026-11-24): run with the user's approval in this chat
(dev server started and stopped by the agent, test focus session allowed and
deleted afterwards), real ActivityWatch, Playwright. Ahora at 1280 px: the
panel showed the app in focus with "<1 min" and "Activo" (checked against the
window bucket: chrome.exe had taken focus 11 s earlier after Code.exe); the
title was hidden, "Mostrar titulo" showed it and stored `"1"`, a reload kept
it shown, "Ocultar titulo" hid it and removed the key. A Clasico session (id 21,
block 12:00) started from Ahora's play button showed "Distraccion en esta
sesion: 0 min". To reach the threshold without waiting, that test row's
`startedAt` was moved to 09:00 local (14:00Z) in the database (the only DB edit
besides the test row itself); after a reload Ahora showed the banner "Llevas 20
min de distraccion en esta sesion de foco." and the line "... 20 min".
"Descartar" removed it; client-side navigation to Hoy and back to Ahora showed
no banner; a full reload of Hoy showed it again (dismissals last for the tab's
life, as specified). At 390 px: no panel, banner or line and no request to port
5600, while the focus timer stayed; widening to 1280 px showed all three; with
port 5600 blocked in the browser all three disappeared within one poll, the
NavBar said "ActivityWatch no disponible", the timer stayed and there were no
page errors. Cleanup: the session was abandoned from the UI (confirm dialog),
row 21 (ABANDONED, CLASSIC) was deleted, and block 12:00 (id 2610) stayed
`completed = false`. Not observed live: the DEEP-block banner (no DEEP block was
current during the run; `pickAlert` covers the block case in tests) and a real
6-minute distraction.

## Files / areas

- New: `src/lib/activitywatch/live.ts`, `live.test.ts`,
  `src/components/activitywatch/useDistraction.ts`,
  `DistractionBanner.tsx`, `DistractionAlert.tsx`, `LiveActivity.tsx`.
- Edited: `src/lib/activitywatch/client.ts` (`readCurrent` reads the last 50
  window events to find the streak), `src/components/ahora/AhoraView.tsx`
  (banner on top, live panel under the current block, distraction line near
  the session), `src/app/page.tsx` (`DistractionAlert` inside the existing
  `FocusProvider`, above the form).
- Reused: `useActivityWatch` (`status`, `current`, `query`), `useFocus`
  (`session`, `blocks`, `offsetMs`), `findCurrentAndNext`, `localMinutesOfDay`,
  `resolveToday`, `toDateKey`, `blockBounds`, `periodOf`,
  `distractionMinutes`, `shouldShowAlert`, `DISTRACTION_ALERT_MINUTES`.

## Data / contracts

No schema, API or persisted data besides one `localStorage` boolean.

- `appStreakStart(events, nowMs)`: events are the window bucket's newest first
  (`{ timestamp, duration, data: { app } }`). Starting from the newest, walk
  back while the app is the same and the gap between one event's end and the
  next event's start is at most 60 s; return the start of the oldest event in
  that run, or null when the list is empty or malformed. `readCurrent` now
  reads `events?limit=50` and sets `since` to that start (still null when the
  newest event ended over 2 minutes ago). The 50 events live only in memory for
  that call; titles are not kept except the newest one.
- `useDistraction(dateKey)` -> `{ sessionMinutes: number | null, block: {
  startTime, minutes } | null }`. Only when `status === "connected"`; every
  60 s while the tab is visible, at once when it becomes visible, and when the
  session id or status changes. One `query` call with up to two periods:
  - the session, when `session.status === "WORKING"`: from `startedAt`
    converted to the browser clock (`Date.parse(startedAt) - offsetMs`) to now;
  - the current block, when `dateKey` is today and the block found by
    `findCurrentAndNext(blocks, localMinutesOfDay(now))` has tag `DEEP`: from
    its start to now.
  Minutes are `distractionMinutes` of each summary. On a failed query the
  provider turns `unavailable` and the hook's output is ignored.
- `pickAlert({ session, block, dismissed })` -> `{ key, kind: "session" |
  "block", minutes } | null`, with keys `session:<id>` and
  `block:<dateKey>:<HH:MM>`. Candidates are checked with `shouldShowAlert`
  (minutes > 5, key not dismissed); the session wins when both qualify.
- Dismissal: a module-level `Set` of dismissed keys in `useDistraction.ts`, so
  a banner dismissed in Hoy stays dismissed in Ahora for the tab's life.
- Banner (`role="status"`, `hidden md:flex`, accent border, inside the page
  width): "Llevas N min de distracción en esta sesión de foco." or "... en este
  bloque Deep."; button "Descartar" (moves focus nowhere special, removes the
  banner).
- Live panel (Ahora, `hidden md:flex`): app name, "· N min" in it (floor of
  minutes, "<1 min" under 1 minute) computed from the view's `nowMs` tick (no
  `Date.now()` in render), "Activo"/"Inactivo", and a "Mostrar título" /
  "Ocultar título" button (`aria-pressed`). The title renders as React text,
  truncated to one line. Preference key `daily-blocks:aw-show-title`, `"1"` or
  absent; read after mount (so the server render matches), written on toggle;
  every `localStorage` access inside try/catch, falling back to hidden.
- Session line (Ahora, under the session timer): "Distracción en esta sesión:
  N min", only while WORKING and only when `sessionMinutes` is known.
- Hoy: the banner only when the page shows today; on a future date the hook
  gets a non-today `dateKey` and the session (if any) still counts, since the
  session belongs to today.
- Privacy: titles and URLs never leave the browser, are not logged, and are
  not persisted; only the boolean preference goes to `localStorage`.

## Testing

Vitest, pure logic only. Cases:

- `appStreakStart`: single event; same app across three events with small gaps
  returns the oldest start; a different app in between stops the run; a gap
  over 60 s stops the run; empty or malformed list returns null.
- `pickAlert`: below and at 5 minutes -> null; session over threshold ->
  session alert; only the block over -> block alert; both over -> session;
  dismissed session key falls back to the block when it qualifies; all
  dismissed -> null.

Live flows (step 4, dev server started and stopped by the agent with the
user's approval, real ActivityWatch):

1. Ahora at 1280 px: the panel shows the app in focus, its minutes and
   "Activo"; the title is hidden until "Mostrar título", and the choice
   survives a reload; at 390 px the panel is not shown.
2. With a real or test focus session in WORKING (started from the UI with the
   user's approval, abandoned afterwards), Ahora shows the distraction line.
3. Banner: shown on Hoy and Ahora when a WORKING session or the current DEEP
   block has over 5 minutes of distraction (observed for real if it happens,
   otherwise by watching a YouTube video in another window for 6 minutes with
   the user's help); "Descartar" hides it on both pages and it does not return
   for the same key.
4. With ActivityWatch unreachable the panel, line and banner disappear without
   errors.

## Notes for the AI

- Read the client component guide in `node_modules/next/dist/docs/` and keep
  the enforced lint rules (no synchronous state in effects, no impure calls in
  render; `AhoraView` already ticks `nowMs` every 15 s).
- Decisions where the request was silent, to confirm at review: "tiempo en la
  app" merges consecutive events of the same app with gaps up to 60 s; session
  distraction counts from `startedAt` including paused time, as the request
  says; the block alert uses the tag saved on the server at page load (a tag
  edited in Hoy counts after the next reload); the banner lives inline at the
  top of the page, not fixed; dismissals last for the tab's life.
- A test focus session writes a `FocusSession` row; start it only with the
  user's approval and abandon it (abandon marks no blocks).
- No migration, no new dependency. Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11462,"specSha256":"e18b260a68a466fa6625578c05ee6571218f3b6ea896ae631f82866e19af5d8e","branch":"refs/heads/feature/en-vivo-en-ahora-y-alerta-de-distracci-n","head":"b9b94e957d3e7de2d703aa549490fd07a1939a01","baseRef":"refs/heads/master","baseCommit":"b9b94e957d3e7de2d703aa549490fd07a1939a01","sourceTree":"28e0713e8696d85969e40c429e612c510a94faab","absentOptional":[]} -->

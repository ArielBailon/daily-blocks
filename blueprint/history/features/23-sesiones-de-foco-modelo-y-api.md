# Feature: Sesiones de foco: modelo y API

**From build-plan:** feature 23
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/sesiones-de-foco-modelo-y-api`

## Goal

Add the server side of the Pomodoro: a `FocusSession` model and three routes to
start, read and drive a focus session that covers one or more of today's
blocks. When the work phase ends with enough time worked, the covered blocks
are marked completed by the server. No UI in this feature (that is 24).

## In scope

- Prisma model `FocusSession` and enum `FocusStatus`
  (`WORKING | PAUSED | BREAK | COMPLETED | ABANDONED`), additive migration, plus
  a partial unique index so at most one session is active
  (`WORKING`, `PAUSED` or `BREAK`), same technique as
  `WorkoutSession_single_in_progress`.
- Presets as constants in `src/lib/focus/config.ts`: Clasico 25/5 (1 block),
  Deep 2 bloques 50/10 (2), Deep 3 bloques 80/10 (3), Personalizado (work 5-120
  min, break 0-30 min, covers `ceil((work + break) / 30)` blocks).
- Pure functions in `src/lib/focus/` (no Prisma): coverage with trimming,
  effective state and remaining time given `now`, lazy phase settlement, pause
  and resume timestamp shifts, worked seconds, the 80% rule.
- `POST /api/focus/sessions`: start a session from a block of today.
- `GET /api/focus/active`: the active session or `null`.
- `PATCH /api/focus/sessions/[id]`: `action` is `pause | resume | finish |
  abandon | skipBreak`.
- Auto-marking of the covered blocks (`completed = true`) in the same
  transaction as the transition, only when the day is still open.
- Tests for all pure logic and the zod input.

## Out of scope

- Any UI: play button, timer bar, break screen, sound, vibration (24); `/ahora`
  (25); Historial, `/winter-arc` and `GET /api/days` changes (26).
- Suggested preset by tag or by consecutive blocks (UI concern, 24).
- Push, Notification API, service worker, background jobs or cron.
- Changing Generar dia, block editing, misc tasks or the Winter Arc rules.
- Endpoints for listing or metrics of past sessions.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Schema and migration** - add `FocusStatus` and `FocusSession`
      to `prisma/schema.prisma` with `prisma migrate dev` (name
      `focus_sessions`), then append to that migration's SQL the partial unique
      index `CREATE UNIQUE INDEX "FocusSession_single_active" ON
      "FocusSession" ((1)) WHERE "status" IN ('WORKING','PAUSED','BREAK')` and
      apply it. *Done when:* `prisma migrate status` reports in sync, the
      generated client exposes `prisma.focusSession`, `npm run build` passes,
      and a query on `pg_indexes` shows the partial index.
- [x] **Step 2 - Presets and pure logic with tests** - `src/lib/focus/config.ts`
      (presets, limits, `blocksCovered`), and pure functions in
      `src/lib/focus/session.ts` (coverage, settle, pause/resume, finish and
      abandon patches, worked seconds, `meetsCompletion`), with
      `session.test.ts`. *Done when:* `npm test` passes with cases listed under
      Testing and `npm run lint` passes.
- [x] **Step 3 - Validation and service** - `src/lib/validation/focus.ts` (zod,
      Spanish messages, with a test) and `src/lib/focus/service.ts` (Prisma:
      `startSession`, `getActiveSession`, `applyAction`, all inside
      `prisma.$transaction`, settling any stale session first and marking
      blocks in the same transaction). *Done when:* `npm test`, `npm run lint`
      and `npm run build` pass.
- [x] **Step 4 - Route handlers and live check** - the three routes under
      `src/app/api/focus/`, using `jsonError`/`parseBody`/`parseId` from
      `src/lib/fitness/http.ts`. *Done when:* with the dev server running
      against a non-production database, requests show: start returns 201 and a
      second start returns 409; `GET /api/focus/active` returns the session;
      pause then resume shifts `workEndsAt`; finish with under 80% leaves
      blocks unmarked; a 5-minute custom session whose `workEndsAt` is moved
      into the past (by editing the row) settles to `BREAK` on the next read and
      marks its blocks; start on a closed day, a future day or a missing block
      returns 4xx; `npm test`, `npm run lint` and `npm run build` pass.

Step 4 evidence note: with the user's approval it ran against the single remote
database, using a throwaway plan on 2030-01-01 (deleted afterwards) and a
clock injected into the service; route handlers were invoked directly, not
through a running dev server. Real-clock routes were only exercised on paths
that write nothing.

## Files / areas

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_focus_sessions/`
- `src/lib/focus/config.ts`, `session.ts`, `session.test.ts`, `service.ts`
- `src/lib/validation/focus.ts` (+ test)
- `src/app/api/focus/sessions/route.ts`,
  `src/app/api/focus/sessions/[id]/route.ts`,
  `src/app/api/focus/active/route.ts`
- Reused: `src/lib/date.ts` (`resolveToday`), `src/lib/prisma.ts`,
  `src/lib/fitness/http.ts`, `src/lib/blocks.ts`.

## Data / contracts

`FocusSession`: `id` Int PK; `dailyPlanId` Int FK to `DailyPlan` (cascade),
indexed; `blockIds` Int[] (no FK: blocks can be deleted by Generar dia, so
marking uses `updateMany` on ids that still exist); `preset` String (one of
`CLASSIC | DEEP_2 | DEEP_3 | CUSTOM`, validated in code so a new preset needs no
migration); `workMinutes`, `breakMinutes` Int; `startedAt`, `workEndsAt`,
`breakEndsAt` DateTime; `pausedAt` DateTime?; `pausedSeconds` Int default 0;
`status` FocusStatus; `breakSkipped` Boolean default false;
`actualWorkSeconds` Int default 0; `endedAt` DateTime?.

All timestamps come from the server clock, one `now` per request. The client
never sends a time.

Start, `POST /api/focus/sessions`, body
`{ blockId, preset: "CLASSIC"|"DEEP_2"|"DEEP_3" }` or
`{ blockId, preset: "CUSTOM", workMinutes, breakMinutes }` (integers, 5-120 and
0-30; minutes sent with a fixed preset are rejected). Rules: block must exist;
its plan must be today's (`resolveToday`) and not closed. Coverage is the chosen
block plus the following blocks of that plan ordered by `startTime`, up to the
preset count, never past the last block; if fewer fit, the session is trimmed.
Response 201 `{ session, coverage: { requested, covered, trimmed } }`.

Session DTO: `id, status, preset, blockIds, workMinutes, breakMinutes,
startedAt, workEndsAt, breakEndsAt, pausedAt, breakSkipped, actualWorkSeconds,
endedAt, blocksMarked, serverNow` (ISO strings). `blocksMarked` is derived, not
stored: true when the session reached `BREAK` or `COMPLETED` with
`meetsCompletion`. `serverNow` lets 24 correct client clock skew.

`GET /api/focus/active` returns 200 `{ session: <dto> | null }`. It settles
first, so a session whose time has run out is moved on (and its blocks marked)
as a side effect; a session that settles to `COMPLETED` is returned as `null`.

`PATCH /api/focus/sessions/[id]` body `{ action }`, returns 200 `{ session }`.
Allowed states (after settling): `pause` only in `WORKING`; `resume` only in
`PAUSED`; `finish` in `WORKING` or `PAUSED`; `abandon` in `WORKING` or
`PAUSED`; `skipBreak` only in `BREAK`. Anything else is 409. Unknown id is 404,
bad body or action is 400.

Transitions:

- `pause`: `status = PAUSED`, `pausedAt = now`. While paused the remaining time
  is frozen at `workEndsAt - pausedAt` and nothing settles.
- `resume`: delta = `now - pausedAt`; add it to `workEndsAt` and
  `breakEndsAt`, to `pausedSeconds` (whole seconds), clear `pausedAt`, status
  `WORKING`.
- Settle (lazy, on every read or action; no jobs): `WORKING` with
  `now >= workEndsAt` becomes `BREAK` with `actualWorkSeconds = workMinutes *
  60`; `BREAK` with `now >= breakEndsAt` becomes `COMPLETED` with `endedAt =
  breakEndsAt`. A stale session can cross both in one settle. With
  `breakMinutes = 0` the break phase is skipped straight to `COMPLETED`.
- Worked seconds (finish and abandon): `floor((t - startedAt) / 1000) -
  pausedSeconds`, with `t = pausedAt` if paused else `now`, clamped to
  `[0, workMinutes * 60]`.
- `finish`: `COMPLETED`, `endedAt = now`, `actualWorkSeconds` as above; no
  break follows. `abandon`: `ABANDONED`, same fields, marks nothing.
  `skipBreak`: `COMPLETED`, `breakSkipped = true`, `endedAt = now`.
- Marking: on settle into `BREAK` (or straight to `COMPLETED`) and on `finish`,
  if `actualWorkSeconds >= 0.8 * workMinutes * 60`, `updateMany` sets
  `completed = true` on `blockIds` whose plan is not closed, in the same
  transaction. `abandon` never marks.

One active session: the partial unique index guarantees it; the start runs in a
transaction, settles any stale active session first (so an old session never
blocks a new one), and maps a unique violation to 409
"Ya hay una sesión de foco en curso". Mandatory break: a session in `BREAK`
counts as active, so a new start is refused until the break ends or is skipped.

Errors use `{ "error": "<mensaje en español>" }`; unexpected failures return a
generic 500 message.

## Testing

Vitest, pure logic only (routes and Prisma verified live in step 4). Cases:
coverage (full, trimmed at the last block, count 1, start at the last block);
`blocksCovered` for custom (`ceil`); settle (before work end, exactly at work
end, between, past break end, both crossed, `breakMinutes = 0`, paused never
settles); pause/resume shift of both end times and `pausedSeconds`; worked
seconds (never paused, paused mid-way, paused now, clamped to the maximum);
`meetsCompletion` at 79%, 80% and 100%; zod: each preset, custom limits at 5,
120, 0, 30 and just outside, minutes with a fixed preset, unknown preset/action.

## Notes for the AI

- `AGENTS.md` warns this Next.js has breaking changes: read the Route Handler
  guide in `node_modules/next/dist/docs/` before step 4, and follow the
  existing handlers' shape (`RouteContext<...>`, `await ctx.params`).
- Prisma client lives in `src/generated/prisma`; import from
  `@/generated/prisma/client`. Use `prisma migrate dev`, never `db push`.
- Decisions made where the plan was silent, to confirm at review: pause only
  during work (the break is mandatory rest); `finish` ends the session with no
  break; `abandon` only during work; `finish` under 80% is `COMPLETED` but
  marks nothing; `GET /api/focus/active` has side effects by design.
- Step 4 writes rows: confirm `DATABASE_URL` is not the production database
  before running requests, and delete the test sessions afterwards.
- Remind the user before `/complete` that deploy runs `prisma migrate deploy`.
- Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11120,"specSha256":"f0a1f9a6c8977cbd9f0bd274429bbea31af960a526c7dcf7390d81cee4b14bc4","branch":"refs/heads/feature/sesiones-de-foco-modelo-y-api","head":"83bbb29c54921863d95e2970005c3fd1461e895c","baseRef":"refs/heads/master","baseCommit":"83bbb29c54921863d95e2970005c3fd1461e895c","sourceTree":"7da41cc80bb9675be67427d287a0026cbe890cfc","absentOptional":[]} -->

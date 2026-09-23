# Feature: Date and clear

**From build-plan:** feature 13c
**Build attempt:** 1
**Branch:** feature/date-and-clear
**Status:** verified

## Goal

"Hoy" can plan any day from today onward:
- a date field picks the day, and the date lives in the URL;
- `/` always opens today.

Future days work like today, except their completion checkbox is disabled.
A "Vaciar" button deletes all of the selected day's blocks after
confirmation.

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- This sub-feature takes the FECHA field, placed before INICIO, and the
  secondary "Vaciar" button after "Generar día" (bordered, not filled).
- Not taken here: the "Tareas varias" panel (14).

## In scope

- **Server date rule:** `generate` and the block `PATCH` accept today or a
  future date, not only today. Past dates stay rejected.
- **Server check rule:** on a future date, the block `PATCH` rejects any
  `completed` field.
- **New route** `DELETE /api/days/[date]/blocks` deletes all blocks of that
  day.
- **"Hoy" page:** reads `?fecha=YYYY-MM-DD`.
  - With no `fecha`, it shows today.
  - Today's own key, an invalid key, or a past key redirects to `/`.
- **Form:**
  - a labelled "Fecha" date field, where picking a date navigates;
  - a "Vaciar" button, with confirmation.
- **Rows:** the checkbox is disabled on future days.

## Out of scope

- The "Tareas varias" panel and whether "Vaciar" also clears `miscTasks`
  (decide in 14).
- Viewing past days (15). A past `fecha` just redirects to today.
- Removing the legacy model (16).
- Changing `generateDay`'s keep/confirm rules.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Server: future dates and clear.**
      - **`src/app/api/days/[date]/generate/route.ts`:** replace the
        "only today" check with "not in the past". If
        `date < resolveToday().date`, return 400 `"Solo se puede planificar
        hoy o un día futuro"`. Everything else stays the same.
      - **`src/app/api/days/[date]/blocks/[id]/route.ts`:**
        - Use the same past-date check and message.
        - After validating the body: if `date > today` and `completed !==
          undefined`, return 400 `"Solo se pueden marcar bloques de hoy"`
          and write nothing.
        - Activity edits on future days are allowed.
      - **New `src/app/api/days/[date]/blocks/route.ts`** with `DELETE`:
        1. Parse the date with `parseDateKey`. If it's invalid, return 400
           `"Fecha inválida"`. A past date returns 400 with the same message
           as `generate`.
        2. Delete with `prisma.block.deleteMany({ where: { dailyPlan: {
           date, closed: false } } })`.
        3. If `count === 0` and a plan for that date exists with
           `closed: true`, return 409 `"Este día ya está cerrado y no se
           puede editar."`.
        4. Otherwise return 204. This also covers a day with no plan or no
           blocks, which makes the route idempotent.
        5. Anything unexpected returns 500 `"Error al vaciar el día"`.

        The plan row, its `startTime`/`endTime`, and any legacy rows stay.

      *Done when:*
      - `npm run lint` and `npm run build` pass, and the build lists
        `ƒ /api/days/[date]/blocks`.
      - Against `npm run dev`, `curl` shows:
        - Generate for tomorrow's key → 200.
        - Generate for yesterday's key → 400.
        - `PATCH` of a tomorrow block `{"activity":"x"}` → 200.
        - `PATCH` of a tomorrow block `{"completed":true}` → 400.
        - `PATCH` of a today block `{"completed":true}` → 200.
        - `DELETE` of tomorrow's blocks → 204, and a second `DELETE` → 204.
          Re-generating the same range then returns only empty blocks.
        - `DELETE` of yesterday's blocks → 400.
      - Test data is cleaned up afterwards: tomorrow is emptied, and today's
        touched block is reset.

- [x] **2. Date field, "Vaciar", and future-day rows.**
      - **`src/app/page.tsx`:**
        - It takes `searchParams: Promise<{ fecha?: string | string[] }>`.
        - With `today = resolveToday().date`:
          - `fecha` missing → show today;
          - otherwise parse it with `parseDateKey`. If it isn't a string, is
            invalid, is `< today`, or equals today, call `redirect("/")`
            from `next/navigation`.
        - Call `closePastPlans(today)`, then `getDayPlan(date)`.
        - Compute `isFuture = date > today`.
        - Pass `dateKey`, `todayKey`, and `hasBlocks` to the form, and pass
          `canComplete={!isFuture}` to each `BlockRow`.
        - Give the form `key={dateKey}`, so its start/end state resets when
          the date changes.
      - **`src/components/hoy/GenerateDayForm.tsx`:**
        - **Fecha:**
          - It comes first, as `<input type="date" id="day-date"
            min={todayKey} value={dateKey}>`, labelled "Fecha" in the same
            label style as Inicio/Fin.
          - On change with a value `>= todayKey` (a string comparison on
            `YYYY-MM-DD`), call `router.push(value === todayKey ? "/" :
            `/?fecha=${value}`)`.
          - An empty or past value is ignored.
        - **Vaciar:**
          - A `type="button"` after "Generar día", styled `rounded-lg border
            border-muted px-5 py-2` with an `enabled:hover:border-accent`
            affordance.
          - It's disabled when `!hasBlocks` or a request is running.
          - On click, it shows `window.confirm("¿Vaciar este día? Se
            borrarán todos sus bloques.")`. On cancel, nothing happens.
          - On OK, it sends `DELETE /api/days/${dateKey}/blocks`:
            - 204 → `router.refresh()`;
            - an error → the existing `role="alert"` message with focus,
              using the server message or `"Error al vaciar el día"`.
        - One `pending` state covers both actions, so both buttons are
          disabled while either request runs. "Vaciar" reads "Vaciando…"
          while its own request runs.
      - **`src/components/hoy/BlockRow.tsx`:** new prop `canComplete:
        boolean`.
        - When it's false, the checkbox is `disabled`, with
          `disabled:cursor-not-allowed disabled:opacity-40`, and its label
          cell is `cursor-not-allowed`.
        - Its `aria-label` stays `Completado HH:MM`, so the disabled state is
          announced natively.

      *Done when:* `npm run lint` and `npm run build` pass, and with
      `npm run dev`:
      1. `/` shows today's date in Fecha, and the nav "Hoy" is active.
      2. Picking tomorrow changes the URL to `/?fecha=<tomorrow>` and shows
         Inicio/Fin at 07:30/18:00 with the empty state. Generating creates
         the blocks.
      3. On tomorrow:
         - typing an activity saves, and it's still there after a reload;
         - every checkbox is disabled and can't be toggled.
      4. Picking today again goes to `/`, where checkboxes are enabled and
         today's blocks are unchanged.
      5. `/?fecha=<yesterday>`, `/?fecha=2026-02-30`, `/?fecha=abc`, and
         `/?fecha=<today>` all end on `/`.
      6. On tomorrow, "Vaciar" → Cancel keeps the blocks. "Vaciar" → OK
         shows the empty state, and "Vaciar" is then disabled. Generating
         again rebuilds the blocks, empty.
      7. "Vaciar" on a day with no blocks is disabled.
      8. At about 375 px, the form wraps (Fecha, Inicio, Fin, and both
         buttons) with no horizontal scroll.
      9. Test data is cleaned up afterwards: tomorrow is emptied, and today
         is back to how it started.

## Files / areas

- `src/app/api/days/[date]/generate/route.ts`: date rule.
- `src/app/api/days/[date]/blocks/[id]/route.ts`: date rule, and the
  future-day `completed` rejection.
- `src/app/api/days/[date]/blocks/route.ts`: new `DELETE`.
- `src/app/page.tsx`: `fecha`, the redirect, and the new props.
- `src/components/hoy/GenerateDayForm.tsx`: Fecha, "Vaciar", and the shared
  pending state.
- `src/components/hoy/BlockRow.tsx`: `canComplete`.
- Unchanged: `src/lib/daily-plan.ts`, `src/lib/date.ts`,
  `src/lib/validation/day.ts`, and `NavBar.tsx` (its active state already
  uses the pathname, so `/?fecha=…` keeps "Hoy" active).

## Data / contracts

- **Page URL:** `/` is today, and `/?fecha=YYYY-MM-DD` is a future day.
  Today's key, past keys, and invalid keys redirect to `/`. History (15)
  owns past days.
- **Allowed dates for all `/api/days/{date}/…` writes:** `date >= today` in
  `America/Guayaquil` (the existing `resolveToday`). A past date returns
  400 `"Solo se puede planificar hoy o un día futuro"`, and an unparseable
  one returns 400 `"Fecha inválida"`.
- **`PATCH /api/days/{date}/blocks/{id}`:** unchanged, except for the date
  rule. On a future date, a body containing `completed` returns 400
  `"Solo se pueden marcar bloques de hoy"`.
- **`DELETE /api/days/{date}/blocks`:**
  - Deletes every `Block` of that date's open plan.
  - Keeps the `DailyPlan` row (with its range, `miscTasks`, and legacy
    rows).
  - Responses:
    - `204`, also when nothing was there, so it's idempotent;
    - `400 { error }` for a bad or past date;
    - `409 { error }` for a closed plan;
    - `500 { error: "Error al vaciar el día" }`.
  - Destructive: the only guard is the client confirmation, which is enough
    for a single user with no auth. There's no undo.
- A future plan is created by "Generar día" the same way as today's (range
  only, no templates). It becomes closed automatically once its date is in
  the past.
- No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build`;
  - the `curl` checks in step 1;
  - the manual `npm run dev` path in step 2.
- No browser harness is configured. Any browser evidence comes from an
  ad-hoc session, not from a repeatable suite.
- The runtime checks write to the real database, so each step ends by
  cleaning up its test data.

## Notes for the AI

- Next 16: `searchParams` is a Promise and must be awaited (see
  `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`).
  `redirect` comes from `next/navigation` and must not be called inside a
  try/catch.
- `Date` comparisons: `DailyPlan.date` values and `parseDateKey` results are
  UTC midnight, so compare with `getTime()`. Comparing `YYYY-MM-DD` strings
  is also safe on the client.
- The `BlockRow` unmount flush (from 13b) may send a `keepalive` PATCH for a
  block that "Vaciar" just deleted. It returns 404 with nothing mounted to
  show it, which is acceptable.
- Keep the date rule inline in each route (one comparison). Don't add a
  shared helper for three call sites of one line.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11002,"specSha256":"a06aa563626da2762b3e38c5ca9eafab550e4ae30321831a338c47a113d9b194","branch":"refs/heads/feature/date-and-clear","head":"a3321d84412ca1b1538e7a76eea8208ea8730058","baseRef":"refs/heads/master","baseCommit":"a3321d84412ca1b1538e7a76eea8208ea8730058","sourceTree":"572969219e782dc2cd9c55ce4495e27a39903d79","absentOptional":[]} -->

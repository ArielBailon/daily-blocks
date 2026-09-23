# Feature: Block screen for today

**From build-plan:** feature 13a
**Build attempt:** 1
**Branch:** feature/block-screen-for-today
**Status:** verified

## Goal

"Hoy" becomes the block-planning screen from the design reference, for
today's date:
- a range form (start and end) with a "Generar día" button;
- below it, the day's 30-minute blocks as a bordered grid with 24-hour time
  labels.

Generating creates the blocks for the chosen range and keeps any block that
already exists inside it. When a new range would delete blocks that have
content, it asks first. The old task list disappears from "Hoy".

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- This sub-feature takes the header, the INICIO/FIN form with "Generar día",
  and the grid: the time column, with on-the-hour labels bold and half-hours
  muted, plus the empty activity column.
- It doesn't take the date field, "Vaciar" (13c), the checkbox and editable
  activity (13b), the "Tareas varias" panel (14), or the footer (13b, once
  something autosaves).

## In scope

- **Pure block helpers** (`src/lib/blocks.ts`): build the block start times
  for a range, and validate a range.
- **Date-key helpers** (`src/lib/date.ts`): convert between a stored
  `DailyPlan.date` and `"YYYY-MM-DD"`.
- **Server logic** (`src/lib/daily-plan.ts`):
  - `getDayPlan(date)` reads a plan and its blocks without creating
    anything.
  - `generateDay(...)` creates or updates the plan's range and blocks in one
    transaction, with the "keep what's written" and "confirm before deleting
    content" rules.
- **Route** `POST /api/days/[date]/generate`. In 13a, `date` must be today.
- **"Hoy" page** (server component) reads today's plan. A client form
  submits the range and handles the confirmation round trip.
- **Removed from "Hoy":** the `DailyTaskItem` list and `AddDailyTaskForm`.
  The component files and the `/api/daily-tasks*` routes stay untouched until
  16.

## Out of scope

- Editing a block's activity, the completion checkbox, and the autosave
  footer (13b).
- The date picker, future days, and "Vaciar" (13c).
- The "Tareas varias" panel and `miscTasks` writes (14).
- History (15), and removing templates, `DailyTask`, or template generation
  (16). `getOrCreateTodayPlan()` stays in place for the legacy
  `POST /api/daily-tasks` route; "Hoy" just stops calling it.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Pure helpers.**
      - `src/lib/blocks.ts`, with no imports:
        - `BLOCK_MINUTES = 30`.
        - `TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/`.
        - `toMinutes("HH:MM")`, and `fromMinutes(n) → "HH:MM"`.
        - `buildBlockTimes(start, end) → string[]`. It starts at `start` and
          steps by 30 minutes while `< end`, so `07:30`–`18:00` gives 21
          times, the last one `17:30`.
        - `isValidRange(start, end)`: both match `TIME_PATTERN` and
          `start < end`.
        - `isOnTheHour("HH:MM")`: the minutes are `00`.
      - `src/lib/date.ts` gains:
        - `toDateKey(date) → "YYYY-MM-DD"`, using UTC parts, because
          `DailyPlan.date` is UTC midnight.
        - `parseDateKey("YYYY-MM-DD") → Date | null`, for a real calendar
          date at UTC midnight. It returns `null` for bad formats or
          impossible dates like `2026-02-30`.

      *Done when:* `npm run lint` passes, and a type-stripping Node check
      prints:
      - `buildBlockTimes("07:30","18:00")`: length 21, with first `07:30` and
        last `17:30`.
      - `buildBlockTimes("08:00","12:30")`: length 9, with last `12:00`.
      - `isValidRange` is true for `("07:30","18:00")` and false for
        `("07:15","18:00")`, `("18:00","07:30")`, `("09:00","09:00")`, and
        `("24:00","25:00")`.
      - `parseDateKey("2026-02-30") === null`, and
        `toDateKey(parseDateKey("2026-09-23"))` returns `"2026-09-23"`.

- [x] **2. Day read and generate logic.** In `src/lib/daily-plan.ts`:
      - `getDayPlan(date)` returns `findUnique({ where: { date }, include: {
        blocks: { orderBy: { startTime: "asc" } } } })`. It creates nothing.
      - `generateDay({ date, startTime, endTime, confirmRemoval })` returns a
        result union, all in one `prisma.$transaction`:
        1. `upsert` the plan by `date`. On create, pass only `date`,
           `startTime`, and `endTime`, with no template.
        2. If the plan is `closed`, return `{ kind: "closed" }`.
        3. Compute `wanted = buildBlockTimes(...)`. Find the existing blocks
           whose `startTime` isn't in `wanted`.
        4. If any of those blocks has content (`activity !== ""` or
           `completed`) and `confirmRemoval` isn't `true`, return
           `{ kind: "needs-confirmation", count }` and write nothing.
        5. Otherwise:
           - delete the out-of-range blocks;
           - `createMany({ data: missing times, skipDuplicates: true })`;
           - update the plan's `startTime` and `endTime`;
           - return `{ kind: "ok", plan }` with its blocks.

        Blocks inside the new range are never touched, so their activity and
        check are kept. If the transaction throws a `P2002` because of a
        concurrent create, retry once.

      *Done when:* `npm run lint` and `npm run build` pass.

- [x] **3. Generate route.** Add `src/app/api/days/[date]/generate/route.ts`
      with `POST`, following the style of the existing routes:
      1. Parse `date` with `parseDateKey`. If it's invalid, return 400
         `"Fecha inválida"`.
      2. Only today is allowed in 13a: if `date` isn't `resolveToday().date`,
         return 400 `"Solo se puede generar el día de hoy"`. Future dates come
         in 13c.
      3. Parse the JSON body. Invalid JSON returns 400 `"JSON inválido"`.
      4. Validate the body with Zod in `src/lib/validation/day.ts`:
         `{ startTime, endTime, confirmRemoval?: boolean }`. Times must match
         `TIME_PATTERN`, with the message `"Las horas deben terminar en :00 o
         :30"`. If `start >= end`, return `"La hora de inicio debe ser menor
         que la de fin"`. Failures return 400 with the first issue message.
      5. Call `closePastPlans(today)`, then `generateDay`.
      6. Map the result:
         - `ok` → 200 `{ startTime, endTime, blocks: [{ id, startTime,
           activity, completed }] }`;
         - `needs-confirmation` → 409 `{ error: "Hay N bloques con contenido
           fuera del nuevo rango.", needsConfirmation: true, count: N }`;
         - `closed` → 409 `{ error: "Este día ya está cerrado y no se puede
           editar." }`;
         - anything unexpected → 500 `"Error al generar el día"`.

      *Done when:* `npm run lint` and `npm run build` pass, and the build
      lists `ƒ /api/days/[date]/generate`.

- [x] **4. "Hoy" screen.**
      - Rewrite `src/app/page.tsx` as a server component
        (`force-dynamic`):
        1. `const { date } = resolveToday()`, then `closePastPlans(date)`,
           then `plan = getDayPlan(date)`.
        2. Header: `<h1>` "Planificación por bloques", with a muted serif
           paragraph below it: "Divide tu jornada en bloques de 30 min y
           asigna una actividad a cada uno." The second sentence of the
           reference, about "Tareas varias", arrives with 14.
        3. `<GenerateDayForm dateKey={toDateKey(date)} initialStart={plan?.startTime ?? "07:30"} initialEnd={plan?.endTime ?? "18:00"} />`.
        4. Grid, as a `<ol>` in a `rounded-xl border border-muted bg-surface
           overflow-hidden` card. Each row:
           - is a `<li>` with `border-b border-muted` (none on the last row);
           - has a time cell `w-20 shrink-0 border-r border-muted px-3 py-3
             text-right text-sm tabular-nums`, `font-semibold text-foreground`
             when `isOnTheHour` and `text-foreground/60` otherwise;
           - has an empty flexible activity cell with `min-h-12`.
        5. Empty state, when there's no plan or it has 0 blocks: a muted
           line inside the card: "Todavía no generaste este día. Elige el
           horario y pulsa Generar día."
      - New client component `src/components/hoy/GenerateDayForm.tsx`:
        - Fields: labelled "Inicio" and "Fin" inputs, `type="time"`,
          `step={1800}`, with `id`/`htmlFor` pairs, uppercase muted labels
          as in the reference, and boxed inputs `rounded-lg border
          border-muted bg-surface px-3 py-2`.
        - The "Generar día" button uses the accent fill: `rounded-lg bg-accent
          px-5 py-2 text-accent-foreground`. While a request is running, it's
          disabled and reads "Generando…".
        - On submit, POST `{ startTime, endTime }`:
          - On a 409 with `needsConfirmation`, show `window.confirm(error +
            " ¿Borrarlos?")`. If confirmed, resend with `confirmRemoval:
            true`. If not, do nothing.
          - On success, `router.refresh()`.
          - On any other error, show the message in a `role="alert"`
            paragraph and move focus to it (the `TemplateForm` pattern). The
            message clears on the next submit.
        - The layout wraps on narrow screens (`flex flex-wrap items-end
          gap-3`).

      *Done when:* `npm run lint` and `npm run build` pass, and with `npm
      run dev`:
      1. `/` shows the header, the form with 07:30/18:00, and the empty
         state.
      2. "Generar día" shows 21 rows, from 07:30 to 17:30. `07:00`-style
         hours are bold and half-hours are muted.
      3. Changing to 08:00–12:30 and generating again shows 9 rows, with no
         confirmation, because the blocks are empty.
      4. A range like 08:15 shows the validation message.
      5. On a ~375 px viewport, the form wraps and the grid fits with no
         horizontal scroll.
      6. The old task list and "Añadir" form are gone from `/`.
      7. `/plantillas` and `/historial` still work.

      The confirmation path can't be triggered from the UI until 13b. Check
      it by setting one block's `activity` in Prisma Studio, then generating
      a range that excludes that block: the dialog appears, "Cancel" keeps
      the block, and "OK" removes it.

## Files / areas

- `src/lib/blocks.ts`: new, pure.
- `src/lib/date.ts`: gains `toDateKey` and `parseDateKey`.
- `src/lib/daily-plan.ts`: gains `getDayPlan` and `generateDay`. The
  existing functions stay.
- `src/lib/validation/day.ts`: new Zod schema.
- `src/app/api/days/[date]/generate/route.ts`: new.
- `src/app/page.tsx`: rewritten.
- `src/components/hoy/GenerateDayForm.tsx`: new.
- Unused after this but deliberately kept until 16:
  `src/components/hoy/DailyTaskItem.tsx`,
  `src/components/hoy/AddDailyTaskForm.tsx`, and `src/app/api/daily-tasks/**`.

## Data / contracts

- **URL shape:** `/api/days/{YYYY-MM-DD}/…`. The date key is the plan's
  calendar day, and later routes (13b, 13c, 14) reuse this prefix. In 13a
  the server accepts only today's key. 13c widens this to future days.
- **`POST /api/days/{date}/generate`**
  - Body: `{ startTime: "HH:MM", endTime: "HH:MM", confirmRemoval?: boolean }`.
  - Responses:
    - `200 { startTime, endTime, blocks: [{ id, startTime, activity, completed }] }`,
      with the blocks ordered by `startTime`;
    - `400 { error }` for a bad date, a date other than today, invalid JSON,
      or invalid times;
    - `409 { error, needsConfirmation: true, count }`, with nothing written;
    - `409 { error }` for a closed day;
    - `500 { error: "Error al generar el día" }`.
  - Idempotent: repeating the same range changes nothing.
- **Content rule:** a block has content when `activity !== ""` or
  `completed`. Only blocks with content trigger the confirmation. Empty
  out-of-range blocks are removed silently.
- **Plan creation:** `generateDay` never uses templates and never creates
  `DailyTask` rows. An existing today plan that was created by template
  generation keeps its legacy `DailyTask` rows, invisible, until 16.
- **Rendering:** block activities (empty in 13a) and times are React text
  only.
- No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build`;
  - the Node check for the pure helpers;
  - the manual path in step 4, including the Prisma Studio setup for the
    confirmation branch.
- No browser harness is configured.

## Notes for the AI

- Route style: `NextResponse.json`, Spanish messages, `RouteContext<"/api/days/[date]/generate">`,
  and `await ctx.params`. Check `node_modules/next/dist/docs/` if the typed
  context for the new route doesn't resolve.
- Keep `blocks.ts` and the new `date.ts` helpers import-free and pure, so the
  `node --experimental-strip-types` check can load them. `date.ts` already
  follows this rule.
- `createMany` with `skipDuplicates` is supported on PostgreSQL and relies on
  the `@@unique([dailyPlanId, startTime])` index from feature 12.
- The design reference's controls use `#201d19`. Using `bg-surface`
  (`#1c1a16`) for inputs is close enough, so no new token is needed.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13375,"specSha256":"58eb96af75cf44fdb005e78b8c737adedf98e371c2417668ed104406a3d7895c","branch":"refs/heads/feature/block-screen-for-today","head":"6b40e46b6616dda27622bbdc58b994df9fd2c2f7","baseRef":"refs/heads/master","baseCommit":"6b40e46b6616dda27622bbdc58b994df9fd2c2f7","sourceTree":"c0249957725e2524aefc97af6b893457484e0b7a","absentOptional":[]} -->

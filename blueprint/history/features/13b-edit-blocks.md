# Feature: Edit blocks

**From build-plan:** feature 13b
**Build attempt:** 1
**Branch:** feature/edit-blocks
**Status:** verified

## Goal

On "Hoy", each block of today's grid becomes editable:
- a free-text activity;
- a completion checkbox.

Both save automatically, with no save button. A footer tells the user
"Se guarda automáticamente".

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- This sub-feature takes the activity column (a borderless text field that
  fills the cell) and the footer line.
- The reference shows no checkbox. It goes at the right end of each row,
  after the activity, in the accent color.
- The reference footer says "Se guarda automáticamente en este dispositivo".
  Data is saved to the server, not the device, so the footer reads only
  "Se guarda automáticamente."
- Not taken here: the date field and "Vaciar" (13c), and the "Tareas varias"
  panel (14).

## In scope

- **Validation:** a Zod schema for a partial block update,
  `{ activity?, completed? }`.
- **Route** `PATCH /api/days/[date]/blocks/[id]`. In 13b, `date` must be
  today, the same rule `generate` uses. 13c widens it.
- **Client row component** `BlockRow`:
  - an activity input that saves after a short pause in typing and when the
    field loses focus;
  - a checkbox that saves immediately.

  Saves for one block are sent one at a time, so a slow response can't
  overwrite a newer value.
- **"Hoy" page:** the rows render `BlockRow`, and the footer appears below
  the grid when there are blocks.
- The generate confirmation path from 13a can now be triggered from the UI.
  It is verified here without code changes.

## Out of scope

- The date picker, future days, the disabled checkbox on future days, and
  "Vaciar" (13c).
- "Tareas varias" and `miscTasks` writes (14).
- History by date (15), and removing the legacy model (16).
- Changes to `generateDay` or its route.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Block update route.**
      - `src/lib/validation/day.ts` gains `blockUpdateInput`:
        - `activity`: optional, `z.string(...).trim().max(200, "La actividad
          no puede superar 200 caracteres")`. An empty string is valid and
          clears the activity.
        - `completed`: optional boolean.
        - Refine: at least one field is present. Otherwise the message is
          `"No hay cambios que guardar"`.
      - New `src/app/api/days/[date]/blocks/[id]/route.ts`, with `PATCH`,
        following the style of `generate` and `daily-tasks/[id]`:
        1. Parse `date` with `parseDateKey`. If it's invalid, return 400
           `"Fecha inválida"`. If it isn't `resolveToday().date`, return 400
           `"Solo se puede editar el día de hoy"`.
        2. Parse `id` as an integer. If it isn't one, return 404
           `"Bloque no encontrado"`.
        3. Handle the body: invalid JSON returns 400 `"JSON inválido"`, and a
           schema failure returns 400 with the first issue message.
        4. Write with `prisma.block.updateMany({ where: { id, dailyPlan: {
           date, closed: false } }, data })`. `data` holds only the fields
           that were sent. The check and the write are one statement.
        5. If `count === 0`, look up the block with `findFirst({ where: { id,
           dailyPlan: { date } } })`:
           - not found → 404 `"Bloque no encontrado"`;
           - found → 409 `"Este día ya está cerrado y no se puede editar."`.
        6. On success, read the block back and return 200 `{ id, startTime,
           activity, completed }`.
        7. Anything unexpected returns 500 `"Error al guardar el bloque"`.

      *Done when:*
      - `npm run lint` and `npm run build` pass, and the build lists
        `ƒ /api/days/[date]/blocks/[id]`.
      - Against `npm run dev` on a generated today, `curl` shows:
        - `{"activity":"  Leer  "}` → 200 with `activity: "Leer"`;
        - `{"completed":true}` → 200, and the activity is unchanged;
        - `{}` → 400;
        - a 201-character activity → 400;
        - an unknown id → 404;
        - yesterday's date key → 400.

- [x] **2. Editable rows and footer.**
      - New client component `src/components/hoy/BlockRow.tsx`, with the
        props `{ dateKey, id, startTime, initialActivity, initialCompleted }`.
        It renders the whole `<li>`:
        - **Time cell:** unchanged from 13a (bold on the hour, muted on the
          half hour).
        - **Activity:** `<input type="text" maxLength={200}>` with
          `aria-label={`Actividad ${startTime}`}`. It's borderless and
          transparent with `outline-none`, fills the cell with `min-h-12`,
          and shows a subtle accent focus ring on the row
          (`focus-within:`). When the block is completed, the text is muted
          and struck through (`text-foreground/50 line-through`).
        - **Checkbox:** `accent-accent`, with
          `aria-label={`Completado ${startTime}`}`, in a fixed-width cell at
          the right with a large enough touch target (at least
          `h-12 w-12`, centered).
        - **Save queue** (one per row, in refs):
          - `pending`: the fields changed but not yet sent.
          - `inFlight`: a boolean.
          - `confirmed`: the last activity and completed values the server
            returned.

          `save(fields)` merges the fields into `pending`. If nothing is in
          flight, it sends one PATCH with all pending fields and repeats
          until `pending` is empty. Only one request per block runs at a
          time.
        - **Activity saving:**
          - Typing updates local state and schedules `save({ activity })`
            after 600 ms idle.
          - Blur cancels that timer and saves immediately, if the local text
            (trimmed) differs from `confirmed.activity`.
          - On unmount, a still-pending timer is flushed with
            `fetch(..., { keepalive: true })`.
          - The server's trimmed value is not written back into the input
            while the user is typing.
        - **Checkbox saving:**
          - `onChange` sets local state and calls `save({ completed })`
            right away.
          - On failure, it reverts to `confirmed.completed`.
        - **Errors:**
          - A failed save shows a `role="alert"` line under the row, in
            `text-xs text-accent`.
          - On a 409 or 404 it says: `"<message> Recarga la página."`.
            Otherwise it shows the server message, or `"Error al guardar el
            bloque"` on a network error.
          - A failed activity save keeps the typed text; the next edit or
            blur retries.
          - The message clears on the next successful save.
          - Focus does not move, so typing isn't interrupted.
      - `src/app/page.tsx`:
        - Map `blocks` to `<BlockRow key={block.id} dateKey={toDateKey(date)} ... />`,
          and remove the inline `<li>` markup.
        - Below the card, when `blocks.length > 0`, add
          `<p className="text-center text-sm text-foreground/60">Se guarda automáticamente.</p>`.
        - The empty state stays as it is.

      *Done when:* `npm run lint` and `npm run build` pass, and with
      `npm run dev` on `/`:
      1. After generating, typing "Leer" into the 08:00 row and waiting
         about 1 s, then reloading, shows "Leer" still there.
      2. Typing quickly and then tabbing away saves the final text: reload
         shows it exactly, trimmed.
      3. Checking 08:30 and reloading keeps it checked, with the struck-through
         style. Unchecking and reloading keeps it unchecked.
      4. Checking a row doesn't change its activity, and editing the
         activity doesn't change its check.
      5. With DevTools set to "Offline", checking a box reverts it and shows
         the alert. Going back online, the next check saves and clears the
         alert.
      6. Generating a range that excludes a row with text (for example
         08:00 → 09:00) asks for confirmation:
         - "Cancel" keeps the row;
         - "OK" removes it;
         - the rows that remain keep their text and checks.
      7. The footer shows "Se guarda automáticamente." under the grid, and
         it's hidden in the empty state.
      8. At about 375 px, the rows fit with no horizontal scroll, and the
         checkbox is easy to tap.

## Files / areas

- `src/lib/validation/day.ts`: gains `blockUpdateInput`.
- `src/app/api/days/[date]/blocks/[id]/route.ts`: new.
- `src/components/hoy/BlockRow.tsx`: new.
- `src/app/page.tsx`: the rows use `BlockRow`, plus the footer.
- Unchanged: `src/lib/daily-plan.ts`, `GenerateDayForm.tsx`, the
  generate route, and the legacy `daily-tasks` files (kept until 16).

## Data / contracts

- **`PATCH /api/days/{YYYY-MM-DD}/blocks/{id}`**
  - Body: `{ activity?: string, completed?: boolean }`, with at least one
    field.
  - `activity` is trimmed on the server, may be `""`, and has a maximum of
    200 characters after trimming.
  - Only the fields sent are written, so an activity save never touches
    `completed` and a check never touches `activity`.
  - Responses:
    - `200 { id, startTime, activity, completed }`;
    - `400 { error }` for a bad date, a date other than today, invalid JSON,
      or an invalid body;
    - `404 { error: "Bloque no encontrado" }` when the id isn't a block of
      that date;
    - `409 { error: "Este día ya está cerrado y no se puede editar." }`;
    - `500 { error: "Error al guardar el bloque" }`.
  - Idempotent: sending the same body twice gives the same state.
- **Date in the URL:** `{date}` scopes the write. A block id from another
  day returns 404, so 13c can widen allowed dates without reshaping the URL.
- **Content rule (from 13a):** since activities are stored trimmed, a
  whitespace-only activity counts as empty for generate's confirmation.
- **Rendering:** activities render only as an input `value` (React text),
  never as HTML.
- No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build`;
  - the `curl` checks in step 1;
  - the manual `npm run dev` path in step 2.
- No browser harness is configured. Any browser evidence comes from a manual
  run or an ad-hoc DevTools session during `/check`, not from a repeatable
  suite.

## Notes for the AI

- Typed route context: `RouteContext<"/api/days/[date]/blocks/[id]">`, then
  `await ctx.params`. If the nested dynamic segment's type doesn't resolve,
  check `node_modules/next/dist/docs/`.
- `BlockRow` keeps its own state after `router.refresh()` (for example,
  after "Generar día"). This works because `key={block.id}` is stable and
  inside-range blocks keep their id. Don't re-sync local state from props
  on every render.
- A block that `generate` deletes while one of its saves is pending returns
  404. The row shows the reload hint, which is acceptable.
- Keep the queue logic inside `BlockRow`. Nothing else autosaves yet, so
  don't extract a generic hook until 14 needs one.
- Today's plan can't normally be closed while it's open. The 409 path covers
  a tab left open across midnight.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11485,"specSha256":"c0d60f200fd724ba7e326797b603aacd6c2122e84896c7e43a4f4cd16f8e201f","branch":"refs/heads/feature/edit-blocks","head":"bc88f7411346c94d5dc1aa2d5594e502c9d38eec","baseRef":"refs/heads/master","baseCommit":"bc88f7411346c94d5dc1aa2d5594e502c9d38eec","sourceTree":"4c298ad1ffc39ef71046340a4e94d113283cd01a","absentOptional":[]} -->

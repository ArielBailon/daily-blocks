# Feature: Misc tasks

**From build-plan:** feature 14
**Build attempt:** 1
**Branch:** feature/misc-tasks
**Status:** verified

## Goal

"Hoy" gets a "Tareas varias" panel for the selected day (today or a future
day): a plain text list of small tasks.
- You can add and remove tasks. There's no checkbox and no editing of an
  existing task.
- Every change saves automatically to `DailyPlan.miscTasks`.

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- This feature takes:
  - the "TAREAS VARIAS" card to the right of the grid, with an uppercase
    muted heading and a full-width bordered "+ Añadir tarea" button;
  - the header's second sentence: `Junta tareas pequeñas en "Tareas
    varias".`
- **On narrow screens,** the panel stacks above the grid, right after the
  form (user decision).

## In scope

- **Server:**
  - `saveMiscTasks(date, tasks)` in `src/lib/daily-plan.ts`;
  - Zod validation;
  - `PUT /api/days/[date]/misc-tasks`, which replaces the day's whole list.
- **Plan creation:** adding a task to a day with no plan creates the plan
  (schema defaults 07:30–18:00, no blocks), so the panel works before
  "Generar día".
- **Client:** a `MiscTasksPanel` component:
  - add with Enter;
  - remove with ✕;
  - one save at a time, where the latest list wins;
  - on failure, the list reverts and shows an alert.
- **Page layout:**
  - a wider container;
  - the panel and grid side by side from `md` up, with the panel stacked
    first on mobile;
  - the header's second sentence.

## Out of scope

- "Vaciar" clearing misc tasks. By user decision it keeps deleting only
  blocks, and its confirmation text stays the same.
- Editing, reordering, or checking a task.
- History by date (15), and removing the legacy model (16).

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Save route.**
      - **`src/lib/validation/day.ts`** gains `miscTasksInput`:
        - Shape: `z.object({ tasks: z.array(z.string("La tarea debe ser
          texto").trim().min(1, "La tarea no puede estar vacía").max(200,
          "La tarea no puede superar 200 caracteres")).max(50, "Máximo 50
          tareas") })`.
        - Error messages: `"Las tareas deben ser una lista"` when `tasks` is
          missing or isn't an array.
      - **`src/lib/daily-plan.ts`** gains `saveMiscTasks({ date, tasks })`,
        which returns `{ kind: "ok", tasks } | { kind: "closed" }`. It
        mirrors `generateDay`'s pattern, all in one `prisma.$transaction`:
        1. `upsert` by `date`. On create, pass `{ date, miscTasks: tasks }`
           so the schema defaults supply the range. On update, pass `{}`.
        2. If the plan is `closed`, return `{ kind: "closed" }`.
        3. Otherwise `update` its `miscTasks` to `tasks`, and return the
           saved list.

        A `P2002` from a concurrent first create is retried once.
      - **New `src/app/api/days/[date]/misc-tasks/route.ts`** with `PUT`,
        in the same style as the other `/api/days` routes:
        1. Validate the date. An invalid key returns 400 `"Fecha inválida"`,
           and a past date returns 400 `"Solo se puede planificar hoy o un
           día futuro"`.
        2. Handle the body: invalid JSON returns 400 `"JSON inválido"`, and a
           schema failure returns 400 with the first issue message.
        3. Call `saveMiscTasks`, then map the result:
           - `ok` → 200 `{ tasks }`;
           - `closed` → 409 `"Este día ya está cerrado y no se puede
             editar."`;
           - anything unexpected → 500 `"Error al guardar las tareas"`.

      *Done when:*
      - `npm run lint` and `npm run build` pass, and the build lists
        `ƒ /api/days/[date]/misc-tasks`.
      - Against `npm run dev`, `curl` shows:
        - `{"tasks":["  Llamar  ","Pagar luz"]}` for tomorrow → 200 with
          `["Llamar","Pagar luz"]`, even when tomorrow had no plan;
        - `{"tasks":[]}` → 200 `[]`;
        - `{"tasks":[""]}` → 400;
        - a 201-character task → 400;
        - 51 tasks → 400;
        - `{}` → 400;
        - yesterday's key → 400.
      - Afterwards, generating tomorrow still returns the default range
        07:30–18:00.
      - Test data is cleaned up: tomorrow's tasks are set to `[]` and its
        blocks are emptied.

- [x] **2. Panel and layout.**
      - **New client component `src/components/hoy/MiscTasksPanel.tsx`**,
        with the props `{ dateKey, initialTasks }`:
        - **Card:** `rounded-xl border border-muted bg-surface p-4`, with the
          heading `<h2>` "Tareas varias" styled `text-sm font-semibold
          uppercase tracking-wide text-foreground/60` as in the reference.
        - **List:** a `<ul>`, one `<li>` per task in stored order. Each item
          shows:
          - the text as React text, with `break-words`;
          - a ✕ button with `aria-label={`Quitar "${task}"`}`, which removes
            that index immediately, with no confirmation.
        - **Add:**
          - A full-width bordered "+ Añadir tarea" button reveals an
            `<input type="text" maxLength={200} aria-label="Nueva tarea">`
            that takes focus.
          - Enter with trimmed non-empty text appends the task, saves,
            clears the input, and keeps it open for the next one.
          - Escape closes it. Blur closes it too, but first appends any
            non-empty text so nothing typed is lost.
          - The button is disabled at 50 tasks.
        - **Save:**
          - Every change sets local state and calls `save(list)`.
          - A PUT is sent with the whole list. While one is in flight, only
            the latest list is queued, then sent once that PUT finishes.
          - The server's returned list becomes `confirmed`.
        - **Failure:**
          - The list reverts to `confirmed`, and a `role="alert"` line shows
            in `text-xs text-accent` inside the card.
          - The message is the server's, plus " Recarga la página." on a
            409. On a network error it's `"Error al guardar las tareas"`.
          - The message clears on the next successful save. Focus doesn't
            move.
      - **`src/app/page.tsx`:**
        - Change the container from `max-w-3xl` to `max-w-5xl`.
        - The header paragraph gains the sentence `Junta tareas pequeñas en
          "Tareas varias".`
        - After the form, add a wrapper `flex flex-col gap-6
          md:flex-row-reverse md:items-start`. It contains, in DOM order:
          1. `<MiscTasksPanel key={dateKey} dateKey={dateKey}
             initialTasks={plan?.miscTasks ?? []} />` inside
             `md:w-72 md:shrink-0`;
          2. the existing grid card, inside `min-w-0 flex-1`.
        - The footer stays below the wrapper.

      *Done when:* `npm run lint` and `npm run build` pass, and with
      `npm run dev`:
      1. **Desktop, about 1280 px:** the panel sits to the right of the grid,
         and the header shows both sentences.
      2. On today, "+ Añadir tarea" → typing "Comprar pan" + Enter → the
         task appears, the input stays open, and a reload shows it.
      3. Adding a second task, then removing the first with ✕, and reloading
         shows only the second.
      4. Typing text then clicking elsewhere adds it. Escape with text
         discards it.
      5. With DevTools set to "Offline", adding a task reverts the list and
         shows the alert. Back online, the next add saves and clears the
         alert.
      6. On tomorrow with no plan, adding a task works before "Generar día".
         Generating afterwards gives the default 21 blocks, and the task is
         still there.
      7. "Vaciar" on a day with tasks removes the blocks and keeps the
         tasks.
      8. **About 375 px:** the panel is above the grid, and there's no
         horizontal scroll.
      9. Test data is cleaned up afterwards: today's and tomorrow's tasks are
         removed, tomorrow's blocks are emptied, and today's blocks are left
         as they were.

## Files / areas

- `src/lib/validation/day.ts`: `miscTasksInput`.
- `src/lib/daily-plan.ts`: `saveMiscTasks`.
- `src/app/api/days/[date]/misc-tasks/route.ts`: new.
- `src/components/hoy/MiscTasksPanel.tsx`: new.
- `src/app/page.tsx`: container width, header sentence, and the
  panel/grid wrapper.
- Unchanged: `GenerateDayForm.tsx` ("Vaciar" deletes only blocks),
  `BlockRow.tsx`, and the `blocks` routes.

## Data / contracts

- **`PUT /api/days/{YYYY-MM-DD}/misc-tasks`**
  - Body: `{ tasks: string[] }`. Each task is trimmed, then must be 1–200
    characters. The list holds at most 50. Duplicates are allowed. The
    order is the stored order.
  - It replaces `DailyPlan.miscTasks` in full, and it's idempotent.
  - It creates the plan when it's missing, with only `date` and
    `miscTasks`, so the range uses the schema defaults. No template or
    blocks are created.
  - Responses:
    - `200 { tasks }`, the saved list;
    - `400 { error }` for a bad or past date, invalid JSON, or an invalid
      body;
    - `409 { error }` for a closed day;
    - `500 { error: "Error al guardar las tareas" }`.
- **Whole-list replace:** two open tabs editing the same day can overwrite
  each other, and the last save wins. That's acceptable for a single user.
- **Rendering:** task text renders only as React text, never as HTML.
- No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build`;
  - the `curl` checks in step 1;
  - the manual `npm run dev` path in step 2.
- No browser harness is configured. Any browser evidence comes from an
  ad-hoc session.
- The runtime checks write to the real database, and each step cleans up
  its own test data.

## Notes for the AI

- The `DailyPlan.miscTasks` column already exists (`String[] @default([])`,
  feature 12). No migration is needed.
- Wrapper order:
  - DOM order puts the panel first, so mobile shows it above the grid.
  - `md:flex-row-reverse` puts it on the right on desktop.
  - On desktop this means the tab order reaches the panel before the grid.
    This follows from the mobile-first decision and is acceptable.
- `MiscTasksPanel` keeps its own state after `router.refresh()` from
  "Generar día" or "Vaciar". `key={dateKey}` resets it when the date
  changes.
- "Limits: 50 tasks and 200 characters" are internal storage guards chosen
  here, not product rules. They're easy to change.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10785,"specSha256":"c7de1b9ae43aeaa723316f336b120391a1b9a8d6116edb72c91f81799ab67fb2","branch":"refs/heads/feature/misc-tasks","head":"c45313cc0f56ff6c5c5fc361adcb8d770b82e911","baseRef":"refs/heads/master","baseCommit":"c45313cc0f56ff6c5c5fc361adcb8d770b82e911","sourceTree":"cffac57d14d214bd3809ac122e40fc47fe7ac6a2","absentOptional":[]} -->

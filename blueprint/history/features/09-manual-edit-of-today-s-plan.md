# Feature: Manual edit of today's plan

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/manual-edit-of-today-s-plan
**Status:** verified

## Goal

From "Hoy", you can add a one-off task to today's plan or remove any task
from it. Neither change ever touches the template the plan came from. Edits
follow the same rule as feature 8: only today's open plan can change.

## In scope

- **Add:** a small form on "Hoy" with a title (required) and an optional
  suggested time. It appends a new `DailyTask` to the end of today's plan.
- **Add on a day with no plan:** when no template applies today, the first
  add creates today's `DailyPlan` with `templateId = null` and adds the task
  to it. This is the case the data model describes as "null when manually
  edited without a template".
- **Remove:** a remove control on each task of today's plan, with a native
  confirm. It works on tasks that came from the template and on one-off
  tasks. It deletes that `DailyTask` row only.
- **Server guard for both actions:** the target plan must be today's plan
  (`resolveToday().date`) with `closed = false`, otherwise `409`. This is
  the same rule as the toggle route.
- Loading, validation, and error feedback in the same style as the existing
  forms.

## Out of scope

- Editing a task's title or time, or reordering tasks.
- Changing a template from "Hoy". Templates stay untouched by design.
- Undo after a remove.
- History view (feature 10).
- The timezone rule behind `resolveToday()`. A separate `/fix` is planned
  before `/release`.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Add-task API.** Export the existing task schema from
      `src/lib/validation/template.ts` (rename `templateTaskInput` →
      `taskInput`, keeping its current rules: trimmed title of 1-200 chars,
      optional `HH:MM` time, `""` meaning none). Re-export it as
      `dailyTaskCreateInput` from `src/lib/validation/daily-task.ts`. Add
      `POST` in a new `src/app/api/daily-tasks/route.ts`:
      1. Parse JSON (400 `"JSON inválido"`) and validate (400, first issue
         message).
      2. `plan = await getOrCreateTodayPlan()`, which also closes past plans
         and generates from a template when one applies.
      3. If it returns `null`, create `{ date: today, templateId: null }`. On
         `P2002` (same-day race), re-read by date.
      4. If the plan is `closed`, return 409 with the feature 8 message.
      5. Create the task with `order = (max order in plan ?? -1) + 1`,
         `completed: false`, and `suggestedTime ?? null`.
      6. Return `201 { id, title, suggestedTime, completed, order }`. Any
         other error returns 500 `"Error al añadir la tarea"`.

      Put the "create today's plan without a template" logic in
      `src/lib/daily-plan.ts` as `getOrCreateTodayPlanForEdit()`, so the route
      stays thin.
      *Done when:* `npm run lint` and `npm run build` pass, and the template
      form still saves (the schema rename didn't break `templateInput`).

- [x] **2. Remove-task API.** Add `DELETE` to
      `src/app/api/daily-tasks/[id]/route.ts`, using the same pattern as
      `PATCH`: `prisma.dailyTask.deleteMany({ where: { id, dailyPlan: { date:
      today, closed: false } } })`. The guard and the write are one
      statement. If `count === 0`, use `findUnique` to decide: missing → 404
      `"Tarea no encontrada"`; exists → 409 `"Este día ya está cerrado y no se
      puede editar."`. Success → `204` with no body. Unexpected → 500
      `"Error al eliminar la tarea"`. A non-integer id → 404, as in `PATCH`.
      *Done when:* `npm run lint` and `npm run build` pass.

- [x] **3. Add form on "Hoy".** New client component
      `src/components/hoy/AddDailyTaskForm.tsx`:
      - Fields: a labelled title input (`required`) and a labelled
        `type="time"` input, both with `id`/`htmlFor` pairs. The submit button
        shows "Añadiendo…" and is disabled while the request is pending.
      - On `201`: clear the fields, `router.refresh()`, and return focus to
        the title input.
      - On error: show the server's message (fallback `"Error al añadir la
        tarea"`) in a `role="alert"` paragraph and focus it, following the
        `TemplateForm` pattern. The error clears on the next submit.
      - On `409`: add "Recarga la página para ver el plan de hoy.", like
        `DailyTaskItem`.

      Render it in `src/app/page.tsx` below the list in all three states:
      tasks, empty plan, and no plan. Adjust the no-plan copy to say a task
      can be added by hand. The form keeps its own client state, which is
      fine because the page is `force-dynamic`.
      *Done when:* `npm run lint` and `npm run build` pass.

- [x] **4. Remove control per task.** In
      `src/components/hoy/DailyTaskItem.tsx`, add a `✕` button with
      `aria-label={`Eliminar "${title}"`}` next to the time, outside the
      `<label>` so tapping it doesn't toggle the checkbox. On click:
      1. Ask `window.confirm(`¿Eliminar "${title}" del plan de hoy?`)`. A
         cancel does nothing.
      2. Disable the checkbox and the button while the request is pending.
      3. `DELETE /api/daily-tasks/{id}`. On `204`, `router.refresh()`.
      4. On error, show the message in the existing `role="alert"` paragraph,
         with the reload hint on 409.

      Keep the tap target reasonable on mobile, with padding around the glyph.
      *Done when:* `npm run lint` and `npm run build` pass, and the manual try
      path below works against a dev server.

## Files / areas

- `src/lib/validation/template.ts`: export the shared `taskInput`.
- `src/lib/validation/daily-task.ts`: `dailyTaskCreateInput`.
- `src/lib/daily-plan.ts`: `getOrCreateTodayPlanForEdit()`.
- `src/app/api/daily-tasks/route.ts`: new `POST`.
- `src/app/api/daily-tasks/[id]/route.ts`: new `DELETE`.
- `src/components/hoy/AddDailyTaskForm.tsx`: new.
- `src/components/hoy/DailyTaskItem.tsx`: remove button.
- `src/app/page.tsx`: render the form and adjust the no-plan copy.

## Data / contracts

- **No schema change.** `DailyTask` fields: `title`, `suggestedTime`
  (`"HH:MM"` or `null`), `completed` (starts `false`), `completedAt` (starts
  `null`), `order` (int).
- **Template isolation:** neither route reads or writes `Template` or
  `TemplateTask`, and adding or removing never changes
  `DailyPlan.templateId`. A plan generated from a template keeps its
  `templateId` after edits; only a plan created by a manual add has `null`.
- **Order:** new tasks append after the current maximum `order` for that
  plan. Gaps left by removals are fine, since the list sorts by `order` ascending.
- **`POST /api/daily-tasks`** body: `{ title: string, suggestedTime?: string }`.
  Responses:
  - `201 { id, title, suggestedTime, completed, order }`
  - `400 { error }` for invalid JSON or a validation failure
  - `409 { error: "Este día ya está cerrado y no se puede editar." }`
  - `500 { error: "Error al añadir la tarea" }`

  The server always decides "today"; the client never sends a date or plan
  id.
- **`DELETE /api/daily-tasks/[id]`** responses:
  - `204` on success
  - `404 { error: "Tarea no encontrada" }`
  - `409 { error: "Este día ya está cerrado y no se puede editar." }`
  - `500 { error: "Error al eliminar la tarea" }`
- **Editability rule** (from feature 8): only tasks whose plan is today's plan
  and `closed = false` can change. For `DELETE`, the rule is in the same
  `where` as the write.
- **Rendering:** titles are user text and are rendered only as React text
  children, never as HTML.
- No auth (single user, per the overview).

## Testing

- No test runner and no Verify command are configured. The gates are
  `npm run lint` and `npm run build`, plus manual checks.
- **Manual try path** (dev server, `/`):
  1. Add "Llamar al banco" at 10:30. It appears last, unchecked, and
     survives a reload.
  2. Submit an empty title: you see the browser's `required` hint, and the
     server returns a 400 message.
  3. Tick the new task: it saves, as in feature 7.
  4. Remove it, confirming the dialog: it disappears and stays gone after
     a reload.
  5. Remove a template-origin task: the template's task list in
     `/plantillas/[id]` is unchanged.
  6. On a day with no template: the add creates a plan, and the task shows.
- No browser harness is configured, so there is no automated browser
  coverage.

## Notes for the AI

- Mirror the existing route style: `NextResponse.json`, Spanish messages, and
  `RouteContext<"/api/daily-tasks/[id]">` for the dynamic route. Check
  `node_modules/next/dist/docs/` if a `204` response via `new Response(null,
  { status: 204 })` gives a type or runtime issue with this Next version.
- `getOrCreateTodayPlan()` returns a plan with tasks included. The edit
  helper only needs `id` and `closed`, but reusing the function is simpler
  than duplicating generation.
- A tab left open overnight that adds a task adds it to the new today's plan,
  because the server resolves today. `router.refresh()` then shows that
  plan. This is acceptable and consistent with the server owning "today".
- Order ties are only cosmetic for a single user, so no transaction is needed
  around max + create.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9499,"specSha256":"1c371440ce41f078070f0207696d8c4644004fd4eb176d01c4ece108409dfbeb","branch":"refs/heads/feature/manual-edit-of-today-s-plan","head":"0f9a3ef6de8083547200e56eb9e5c57e3879dfae","baseRef":"refs/heads/master","baseCommit":"0f9a3ef6de8083547200e56eb9e5c57e3879dfae","sourceTree":"a173902dc1e223c5fe2dcf21e5020e964768fb1f","absentOptional":[]} -->

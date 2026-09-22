# Feature: Template CRUD

**From build-plan:** feature 3
**Build attempt:** 1
**Status:** verified
**Branch:** feature/template-crud

## Goal

Let the user create, edit, and delete a template (a name plus an ordered list
of tasks, each with a title and an optional suggested time) from `/plantillas`,
so features 4-7 have real templates to attach recurrence to and generate days
from.

## In scope

- `POST /api/templates` and `PUT`/`DELETE /api/templates/[id]` Route Handlers
  that validate input with Zod and write through Prisma.
- `/plantillas` (Server Component): list every template with its task count,
  a link to edit each one, a delete action, and an empty state when none
  exist.
- `/plantillas/nueva` and `/plantillas/[id]`: a shared client form for
  creating and editing a template's name and ordered task list (add, remove,
  reorder with up/down, edit title/suggested time per row).
- Deleting a template (cascades to its tasks at the DB level, already set up
  in feature 2).

## Out of scope

- Recurrence assignment (feature 4) and the default-template toggle
  (feature 5) - the create/edit form never reads or writes
  `isDefault` or `TemplateRecurrence`.
- Anything that reads a template to build a day (features 6-7).
- Auth/authorization (project has none - single user, confirmed by
  `coding-standards.md`).
- Drag-and-drop reordering - up/down buttons cover it without a new
  dependency.
- Pagination or search on the template list - proportional for a
  single-user list that stays small.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and
`checkpointCommits` is `disabled`. Implement and verify each step below,
then present one feature-level review packet with the full diff and
Done-when evidence - no per-step approval pause, no checkpoint commits.
`/complete` makes the one feature commit after review.

## Build steps

- [x] 1. Validation schema. Add `zod` as a dependency. Add
      `src/lib/validation/template.ts` exporting the Zod schema below.
      **Done when:** `npm run build` passes (the schema compiles; nothing
      imports it into a route yet).
- [x] 2. Route Handlers. Add `src/app/api/templates/route.ts` (`POST`) and
      `src/app/api/templates/[id]/route.ts` (`PUT`, `DELETE`), using the
      schema from step 1 and the request/response contract below.
      **Done when:** a temporary, uncommitted script exercises all three
      routes against the running dev server (create, then update, then
      delete the same template) and `prisma.template.findMany()` confirms
      each write landed, with the output recorded as evidence before the
      script is deleted.
- [x] 3. Template list. Replace `src/app/plantillas/page.tsx` with a Server
      Component that reads templates directly with Prisma (name + task
      count, ordered by `createdAt`), links each to `/plantillas/[id]`, and
      a "Nueva plantilla" link to `/plantillas/nueva`. Add
      `src/components/plantillas/DeleteTemplateButton.tsx` (client, confirm
      dialog, calls `DELETE`, then `router.refresh()`).
      **Done when:** browser screenshot of `/plantillas` showing the empty
      state, then showing at least one template after step 2's smoke-test
      data (or a manually created one).
- [x] 4. Template form. Add `src/components/plantillas/TemplateForm.tsx`
      (client): name field, an ordered task-row list (title, suggested time,
      remove, move up/down), an "Añadir tarea" button, submit
      posts to `POST`/`PUT` per the contract below, and an accessible error
      summary (see Data / contracts) on failure. Add
      `src/app/plantillas/nueva/page.tsx` (renders the form for create) and
      `src/app/plantillas/[id]/page.tsx` (Server Component: loads the
      template with Prisma, calls `notFound()` when the id is missing or
      not a valid number, renders the form pre-filled for edit).
      **Done when:** a full browser walkthrough - create a template with two
      tasks, see it in the list, open it, rename it and reorder/edit its
      tasks, save, delete it - with a screenshot at each state and no
      console errors.

## Files / areas

- `src/lib/validation/template.ts` - new, Zod schemas
- `src/app/api/templates/route.ts` - new, `POST`
- `src/app/api/templates/[id]/route.ts` - new, `PUT`, `DELETE`
- `src/app/plantillas/page.tsx` - replaces the feature-1 placeholder
- `src/app/plantillas/nueva/page.tsx` - new
- `src/app/plantillas/[id]/page.tsx` - new
- `src/components/plantillas/TemplateForm.tsx` - new
- `src/components/plantillas/DeleteTemplateButton.tsx` - new
- `package.json` / `package-lock.json` - add `zod`

## Data / contracts

```ts
// src/lib/validation/template.ts
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM, 24h

const templateTaskInput = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  suggestedTime: z
    .string()
    .trim()
    .regex(timePattern, "Formato de hora inválido (HH:MM)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const templateInput = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  tasks: z.array(templateTaskInput),
});
```

- `suggestedTime` has no format defined anywhere else in the codebase (the
  schema just says `String?`); `HH:MM` 24-hour is the simplest format for a
  daily-schedule app and is what step 4's time input produces. An empty
  string from the form means "not provided" and is stored as `null`, never
  `""`.
- An empty `tasks` array is valid - a template can exist with zero tasks;
  nothing in the plan requires at least one.

**`POST /api/templates`** - body: `templateInput`. On success: `201` with
`{ "id": number }`. Creates the `Template` and its `TemplateTask` rows in one
nested Prisma `create`, `order` assigned from array index. `isDefault` is
never accepted here; it keeps the schema default (`false`).

**`PUT /api/templates/[id]`** - body: `templateInput`. On success: `200` with
`{ "id": number }`. Full-replace semantics: inside one `$transaction`,
update `Template.name`, delete every existing `TemplateTask` row for that
template, then create the new ones with `order` from array index. The form
never tracks task ids, so this is the smallest contract that supports
add/remove/reorder without diffing. `404` with `{ "error": string }` when
the id doesn't exist (Prisma `P2025`).

**`DELETE /api/templates/[id]`** - on success: `200` with `{ "id": number }`.
`404` with `{ "error": string }` when the id doesn't exist (Prisma `P2025`).
Cascades to `TemplateTask`/`TemplateRecurrence` at the DB level (feature 2).

All three: `400` with `{ "error": string }` on a Zod validation failure
(the first issue's message); `500` with `{ "error": string }` (a generic
message, no internals) on any other thrown error, caught with try/catch.
An invalid or non-numeric `[id]` segment is treated the same as not-found,
never a 500.

**Error UI:** one accessible error region per form (`role="alert"`,
`aria-live="polite"`, `tabIndex={-1}`), populated with the server's error
message on a failed submit and given focus; cleared as soon as the user
resubmits. Every field has a real `<label htmlFor>`. No per-field
`aria-invalid` wiring beyond that - proportional for a single summary
message rather than per-field Zod mirroring on the client.

## Testing

No unit test runner is configured yet. `templateInput` is exactly the kind of
pure validator `coding-standards.md` calls out as testable, but the test gate
is off while no test command is declared in `AGENTS.md`; `/tests` remains the
explicit opt-in for that later. Verified per step with `npm run build`, the
step-2 smoke test against the live database, and step 3/4 browser evidence.

## Notes for the AI

- Server components fetch with Prisma directly (`src/lib/prisma.ts`); only
  the form and the delete button are client components and only they call
  the Route Handlers, per `coding-standards.md`.
- Keep the Spanish UI copy consistent with features 1's placeholders
  ("Nueva plantilla", "Añadir tarea", "Eliminar", "Subir"/"Bajar").
- Reuse the existing theme utilities from feature 1
  (`bg-background`, `text-foreground`, `text-muted`, `text-accent`,
  `border-muted`) - no new design tokens needed.
- `router.refresh()` after a client mutation is enough to re-read the
  Server Component list; Route Handlers do not need `revalidatePath` on top
  of that for this single-user app.

## Implementation-discovered fixes

Two defects surfaced while building the steps above, both fixed in place
since they block the spec's own contracts rather than expanding scope:

- `src/app/plantillas/page.tsx` and `src/app/plantillas/[id]/page.tsx` both
  need `export const dynamic = "force-dynamic"`. Without it, Next
  prerenders them statically at build time, so `router.refresh()` after a
  create/edit/delete would keep showing build-time data - the list would
  never reflect a change.
- `package.json`'s generate step (added in feature 2 as `prebuild`) covered
  `npm run build` but not `npm run dev` - feature 2 flagged this as
  finding F-06, deferred until a route or page actually imported
  `src/lib/prisma.ts`. This feature is that trigger: reproduced the break
  (`npm run dev` on a clean checkout 500s on `/plantillas` with `Module not
  found: Can't resolve '@/generated/prisma/client'`), then changed the
  script to `"postinstall": "prisma generate"` so it runs after `npm
  install` regardless of what follows. Re-verified `dev` and `build` both
  work from a clean `src/generated/prisma`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9573,"specSha256":"b0aef7fd1d37c000f2425f650e1b271763cd876a488bb4a2234fd9269ac3f57e","branch":"refs/heads/feature/template-crud","head":"4b9d039f7a4bcf113b7faf014b8e972d8bdd5867","baseRef":"refs/heads/master","baseCommit":"4b9d039f7a4bcf113b7faf014b8e972d8bdd5867","sourceTree":"32967f795222783f08abd8ec323c85cf6223767c","absentOptional":[]} -->

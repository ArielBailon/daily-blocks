# Feature: Default template

**From build-plan:** feature 5
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/default-template`

## Goal

Let one template be marked as the default, so the automatic daily-plan
generation feature (build-plan item 6) has a fallback template for any day
with no weekday recurrence assigned.

## In scope

- A "Predeterminada" toggle on the template create/edit forms
  (`TemplateForm`), backed by the existing `Template.isDefault` field.
- Saving a template with the toggle on atomically clears `isDefault` on every
  other template first, so at most one template is ever the default. Turning
  the toggle off just clears it for that template, leaving no default (a
  valid state: `isDefault` is a plain boolean with no required-one contract
  in the data model).
- The templates list (`/plantillas`) marks the default template so it's
  visible without opening it.

## Out of scope

- Automatic daily-plan generation that reads `isDefault` (build-plan item 6).
- Weekday recurrence behavior (build-plan item 4, already shipped).
- Any change to `TemplateTask` or `TemplateRecurrence` handling.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: currently `feature`, so one review packet is produced
after all steps below are done (not a pause after each one).
`workflow.checkpointCommits` is `disabled`, so no per-step checkpoint commits
are offered. `/complete` makes the final feature commit.

## Build steps

- [x] **Step 1 - Persist default on save** - Add `isDefault: boolean` (default
      `false`) to the shared `templateInput` Zod schema in
      `src/lib/validation/template.ts`. In both `POST /api/templates` and
      `PUT /api/templates/[id]`, inside the existing transaction, when
      `isDefault` is `true` run `tx.template.updateMany({ where: { isDefault:
      true, NOT: { id } }, data: { isDefault: false } })` before writing this
      template's own `isDefault` value (on create, include it directly in the
      `template.create` data; on update, add it to the existing
      `template.update` data alongside `name`). When `isDefault` is `false`,
      only this template's own field needs to change; do not touch other rows.
      *Done when:* `npm run build` succeeds; the live end-to-end check in Step
      2 confirms only one template stays default at a time.
- [x] **Step 2 - Default toggle in the form** - Add a checkbox/toggle labelled
      "Plantilla predeterminada" to `TemplateForm`, included in the submitted
      body as `isDefault`. Update `src/app/plantillas/[id]/page.tsx` to pass
      the template's current `isDefault` into `TemplateForm` as
      `initialIsDefault`; `/plantillas/nueva` needs no change (starts
      unchecked). *Done when:* in the running app, creating a template with
      the toggle on persists it (visible on reload); editing an existing
      template shows the toggle correctly checked/unchecked; marking a second
      template as default clears it from the first one (verified by
      reopening both templates after save).
- [x] **Step 3 - Show default on the list** - In `src/app/plantillas/page.tsx`,
      include `isDefault` in the existing `findMany` and mark the default
      template in the list (e.g. a small "Predeterminada" label) next to its
      name. *Done when:* the `/plantillas` list visually shows which template
      is default and updates after Step 2's save.

## Files / areas

- `src/lib/validation/template.ts` - add `isDefault` to `templateInput`.
- `src/app/api/templates/route.ts` - clear other defaults and set this one on
  create.
- `src/app/api/templates/[id]/route.ts` - clear other defaults and set this
  one on update.
- `src/components/plantillas/TemplateForm.tsx` - default toggle UI and state.
- `src/app/plantillas/[id]/page.tsx` - load and pass current `isDefault`.
- `src/app/plantillas/page.tsx` - display the default marker.

## Data / contracts

- `Template.isDefault` already exists and is migrated (feature 2). It carries
  no database-level uniqueness constraint, so "at most one default template"
  is an application-level invariant enforced inside the same
  `prisma.$transaction` already used for `name`/`tasks`/`recurrence`, the same
  pattern feature 4 established for `TemplateRecurrence.weekday`.
- API contract addition: `POST /api/templates` and `PUT /api/templates/[id]`
  now accept an optional-defaulting `isDefault: boolean` field alongside the
  existing `name`/`tasks`/`recurrence`. Response shapes are unchanged.
- Zero templates being default is valid (no automatic "first template becomes
  default" behavior); build-plan item 6 owns what happens on a day with
  neither a matching recurrence nor a default template.

## Testing

- No test runner is configured for this project (`AGENTS.md` Commands has no
  `test`/`Verify` entry), so this relies on `npm run build`, `npm run lint`,
  and manual/browser verification rather than an automated test gate.
- Manual verification per step is listed above under each step's *Done when*.
  End-to-end: mark template A as default, confirm it shows on the list and
  its edit page has the toggle checked; mark template B as default, confirm
  A's toggle clears and the list marker moves to B.

## Notes for the AI

- Reuse the existing `prisma.$transaction` in both routes rather than adding
  a second round-trip or a new data-access pattern.
- Style the toggle with the existing tokens already used in `TemplateForm`
  (`border-muted`, `bg-accent`, `text-foreground/70`), consistent with the
  weekday picker added in feature 4. No new dependency.
- `TemplateFormProps`'s `edit` branch should gain `initialIsDefault`,
  mirroring how `initialWeekdays` already works.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5747,"specSha256":"5aa18763d020ac4ffe25c4a3b871062edb03f8ce994e838e1e4e0e09c3f5fa67","branch":"refs/heads/feature/default-template","head":"05808f251d5ce4186c5625197db7b2dbd3d2101c","baseRef":"refs/heads/master","baseCommit":"05808f251d5ce4186c5625197db7b2dbd3d2101c","sourceTree":"41bbb82ed5fe6b99c8d834cf2aa8d489bf508a47","absentOptional":[]} -->

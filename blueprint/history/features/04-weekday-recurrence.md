# Feature: Weekday recurrence

**From build-plan:** feature 4
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/weekday-recurrence`

## Goal

Let a template be assigned to one or more days of the week, so the automatic
daily-plan generation feature (build-plan item 6) can later look up "which
template applies to today" without any manual step.

## In scope

- A weekday picker (Mon-Sun, 7 toggles) on the template create and edit forms
  (`TemplateForm`), backed by the existing `TemplateRecurrence` model.
- Saving a template writes its selected weekdays to `TemplateRecurrence`,
  atomically replacing whatever weekdays it previously owned.
- Because `TemplateRecurrence.weekday` is the primary key, assigning a weekday
  already owned by another template reassigns it (moves it off that template).
  This follows directly from the data model frozen in feature 2 and needs no
  extra confirmation step.
- The templates list (`/plantillas`) shows each template's assigned weekdays
  (abbreviated), next to the existing task-count line, so it's obvious which
  days are already taken before you edit another template.

## Out of scope

- The "default template" toggle (build-plan item 5, `Template.isDefault`).
- Automatic daily-plan generation that reads these recurrences (build-plan
  item 6).
- Any change to `TemplateTask` create/edit behavior.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: currently `feature`, so one review packet is produced
after all steps below are done (not a pause after each one).
`workflow.checkpointCommits` is `disabled`, so no per-step checkpoint commits are
offered. `/complete` makes the final feature commit.

## Build steps

- [x] **Step 1 - Persist recurrence on save** - Add `recurrence: number[]` (JS
      `Date.getDay()` values, `0`-`6`) to the shared `templateInput` Zod schema
      in `src/lib/validation/template.ts`. In both `POST /api/templates` and
      `PUT /api/templates/[id]`, inside the existing transaction, delete this
      template's `TemplateRecurrence` rows for weekdays no longer selected,
      then `upsert` each selected weekday (`where: { weekday }`) to point
      `templateId` at this template, deduping the incoming array with a `Set`
      before writing (defensive; the UI itself cannot submit duplicates).
      *Done when:* `npm run build` succeeds, and a manual `fetch`/curl POST and
      PUT with a `recurrence` array against the running dev server produces the
      expected `TemplateRecurrence` rows (checked via `prisma studio` or a
      direct query).
- [x] **Step 2 - Weekday picker in the form** - Add a 7-toggle weekday group to
      `TemplateForm` (labelled Mon-Sun in Spanish, values `1,2,3,4,5,6,0` to
      match the `Date.getDay()` encoding), included in the submitted body as
      `recurrence`. Update `src/app/plantillas/[id]/page.tsx` to include
      `recurrences` in its Prisma query and pass the current weekdays into
      `TemplateForm` as `initialWeekdays`; `/plantillas/nueva` needs no change
      (starts with none selected). *Done when:* in the running app, creating a
      template with a day checked persists it (visible on reload), editing an
      existing template shows its current days pre-checked, and checking a day
      already owned by another template moves it there on save (verified by
      reopening both templates).
- [x] **Step 3 - Show recurrence on the list** - In
      `src/app/plantillas/page.tsx`, include each template's
      `recurrences` in the existing `findMany` and render the assigned weekday
      abbreviations next to the task count. *Done when:* the `/plantillas`
      list visually reflects each template's assigned days and updates after
      Step 2's save.

## Files / areas

- `src/lib/validation/template.ts` - add `recurrence` to `templateInput`.
- `src/app/api/templates/route.ts` - write recurrence rows on create.
- `src/app/api/templates/[id]/route.ts` - sync recurrence rows on update.
- `src/components/plantillas/TemplateForm.tsx` - weekday picker UI and state.
- `src/app/plantillas/[id]/page.tsx` - load and pass current recurrences.
- `src/app/plantillas/page.tsx` - display recurrence per template.

## Data / contracts

- `TemplateRecurrence.weekday` is stored using JS `Date.getDay()` encoding:
  `0` = Sunday ... `6` = Saturday. This is the native platform value with no
  conversion needed, and build-plan item 6 (automatic generation) will look up
  a `TemplateRecurrence` by `new Date().getDay()`, so this encoding is a fixed
  contract from here on, not an internal detail to revisit later.
- `weekday` is the model's primary key (already migrated in feature 2): at
  most one `TemplateRecurrence` row can exist per weekday. Assigning a weekday
  to a template is therefore always an upsert-by-weekday, and moving a weekday
  between templates is a normal, silent outcome of that constraint, not an
  error case.
- API contract addition: `POST /api/templates` and `PUT /api/templates/[id]`
  now accept an optional-defaulting `recurrence: number[]` field (integers
  `0`-`6`) alongside the existing `name`/`tasks`. Response shapes are
  unchanged.
- Deleting a template already cascades to its `TemplateRecurrence` rows
  (`onDelete: Cascade`, set in feature 2); no change needed in the delete
  route.

## Testing

- No test runner is configured for this project (`AGENTS.md` Commands has no
  `test`/`Verify` entry), so this project relies on `npm run build`, `npm run
  lint`, and manual/browser verification rather than an automated test gate.
- Manual verification per step is listed above under each step's *Done when*.
  End-to-end: create a template with Tue+Thu checked, confirm it persists;
  create a second template and check Tue, confirm the first template's Tue
  checkbox clears on reload and the list page reflects both templates'
  current days correctly.

## Notes for the AI

- Reuse the existing transaction pattern already in
  `PUT /api/templates/[id]` (`prisma.$transaction`) rather than introducing a
  new data-access pattern.
- Keep the weekday picker as plain toggle buttons/checkboxes styled with the
  existing tokens (`border-muted`, `bg-accent`, `text-foreground/70`) already
  used throughout `TemplateForm`, no new dependency.
- `TemplateForm`'s create/edit prop union (`TemplateFormProps`) should gain
  `initialWeekdays` on the `edit` branch only, mirroring how `initialTasks`
  already works.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6473,"specSha256":"38a7467eec4edd075ab8c020b3c85fe5d97c2575c432167d230bc714496a5e18","branch":"refs/heads/feature/weekday-recurrence","head":"c403ed04b67fe22fd067a861f2b4b0c43b44900d","baseRef":"refs/heads/master","baseCommit":"c403ed04b67fe22fd067a861f2b4b0c43b44900d","sourceTree":"2b5d68e512ed669ccb819e95e0ff42322b1ba7eb","absentOptional":[]} -->

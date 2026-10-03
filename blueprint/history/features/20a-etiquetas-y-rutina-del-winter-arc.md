# Feature: Etiquetas y rutina del Winter Arc

**From build-plan:** feature 20a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/etiquetas-y-rutina-del-winter-arc

## Goal

Prepare the data the Winter Arc rules will read (20b): rename the `APPLY` tag
to `JOB_HUNTING` ("Job Hunting"), remove `INTERVIEW`, `LINKEDIN` and `BED`,
and update the default
routine of feature 19 with the new blocks. No rule, view or API here.

## In scope

- Tag enum: `APPLY` -> `JOB_HUNTING` (existing blocks keep it); `INTERVIEW`,
  `LINKEDIN` and `BED` removed (existing blocks with them end up with no tag).
  Remaining tags: `DEEP`, `GYM`, `WALK`, `PROTEIN`, `JOB_HUNTING`,
  `SCREENS_OFF`.
- Label for the new tag: "Job Hunting". Remove the labels of the removed tags.
- Default routine changes in [default-blocks.ts](src/lib/default-blocks.ts):
  - **Normal days (Mon, Tue, Wed, Fri, Sat):** 17:00 and 17:30 become "Job
    Applying" (tag `JOB_HUNTING`); Rest / Reading remains at 18:00 and 18:30.
  - **Thursday and Sunday:** after Walk Bonnie (17:00, 17:30, tag `WALK`):
    18:00 "Protein shake" (tag `PROTEIN`) and 18:30 "Home / Bath routine"
    (replaces the separate 18:00 "Home" and 18:30 "Bath routine").
  - **Every day:** 22:00, 22:30 and 23:00 "Supplements / Reading / Brush
    Teeth" get the tag `SCREENS_OFF`.
- The "Sleep" block at 23:30 loses its `BED` tag (no tag).
- Update the existing tests to the new routine.

## Out of scope

- The rules, day status, streaks, Winter Arc view and API (20b, 20c, 21).
- Preloading DEEP blocks: the 09:00-12:00 gap stays empty (see Open questions).
- Changing days already generated: blocks with content are never overwritten.
  To get the new routine on an already generated day, use "Vaciar" and then
  "Generar día". Today's blocks are not touched by this feature.

## Build loop

Per `blueprint/config.json`: `stepReview: "feature"` and `checkpointCommits:
"disabled"`. Implement the steps in order, run the checks of each step, then
stop for review. `/complete` creates the final commit. Applying the migration
to the remote database needs separate approval in the current chat.

## Build steps

- [x] 1. **Tag enum, migration and labels.** In `prisma/schema.prisma` change
  `BlockTag` to `DEEP, GYM, WALK, PROTEIN, JOB_HUNTING, SCREENS_OFF`. Add one migration under `prisma/migrations/` (written by hand, then
  checked with `prisma migrate diff`; do not apply it yet) that, in order:
  sets `Block.tag` to NULL where it is `INTERVIEW`, `LINKEDIN` or `BED`; renames the enum value
  `APPLY` to `JOB_HUNTING`; creates the new enum type without the removed tags,
  casts the column through text to it, drops the old type and renames the new
  one back to `BlockTag`. Update [block-tags.ts](src/lib/block-tags.ts)
  (`BLOCK_TAGS` in enum order, `BLOCK_TAG_LABELS` with "Job Hunting" and
  without the removed labels), run `prisma generate`. Add `src/lib/block-tags.test.ts`.
  *Done when:* `npx prisma validate` passes; `prisma migrate diff` between the
  migrations and the schema is empty; `npm test` covers that every tag has a
  label, that `APPLY`, `INTERVIEW`, `LINKEDIN` and `BED` are gone, and that `JOB_HUNTING` has
  label "Job Hunting"; `npx tsc --noEmit` and `npm run lint` are clean.
- [x] 2. **Routine changes.** Edit `default-blocks.ts` as listed in scope
  (normal days, Thursday and Sunday, evening tag). Keep the shared-segment
  structure: the evening tag goes in `EVENING`, the Thursday/Sunday evening in
  `WALK_EVENING`, the Job Applying blocks in the normal routine only. Update
  [default-blocks.test.ts](src/lib/default-blocks.test.ts): Job Applying at
  17:00 and 17:30 with `JOB_HUNTING` on normal days and Rest / Reading at 18:00
  and 18:30; Thursday and Sunday have Protein shake at 18:00 with `PROTEIN`,
  Home / Bath routine at 18:30 and no Job Applying; 22:00, 22:30 and 23:00
  carry `SCREENS_OFF` on all three routines; Sleep at 23:30 has no tag; Gym is
  unchanged.
  *Done when:* `npm test`, `npx tsc --noEmit` and `npm run lint` pass.
- [x] 3. **Apply and check in the running app.** With explicit approval, run
  `npx prisma migrate deploy`, then `npx prisma migrate status`. Restart the
  dev server if the old client is cached. Generate a future Monday, Thursday
  and Sunday (not today) and compare them with this spec; open the tag
  selector of a block and confirm it lists "Job Hunting" and not the removed tags.
  Clear the test days afterwards. *Done when:* the three days match, the
  selector is correct, and `npm run build` compiles. Report only what was
  observed.

## Files / areas

- `prisma/schema.prisma` and one new migration under `prisma/migrations/`
- [src/lib/block-tags.ts](src/lib/block-tags.ts) and `src/lib/block-tags.test.ts` (new)
- [src/lib/default-blocks.ts](src/lib/default-blocks.ts) and its test
- No route or component change expected: [BlockRow.tsx](src/components/hoy/BlockRow.tsx)
  and the validation in [day.ts](src/lib/validation/day.ts) read `BLOCK_TAGS`
  and `BLOCK_TAG_LABELS`.

## Data / contracts

- Persisted data: `Block.tag` enum changes as above. `APPLY` rows become
  `JOB_HUNTING`; `INTERVIEW`, `LINKEDIN` and `BED` rows become NULL (the only
  data loss, and only the tag). No other table changes.
- API: `PATCH /api/days/[date]/blocks/[id]` accepts the new tag list; a request
  with a removed tag now fails validation with the existing "Etiqueta
  inválida" error.
- Time zone and weekday logic unchanged (`getUTCDay()` of `DailyPlan.date`).

Resulting routines (30-minute blocks; unlisted times stay empty):

| Segment | Blocks |
|---|---|
| Morning | 06:30 Wake up; 07:00-07:30 Morning routine; 08:00 Breakfast; 08:30 Supplements / Chill |
| Lunch | 12:30-13:00 Lunch |
| Evening | 19:00 Dinner; 22:00-23:00 Supplements / Reading / Brush Teeth (`SCREENS_OFF`); 23:30 Sleep |

- **Normal (Mon, Tue, Wed, Fri, Sat):** Morning; Lunch; 14:30-15:30 Gym
  (`GYM`); 16:30 Home / Bath routine; 17:00-17:30 Job Applying
  (`JOB_HUNTING`); 18:00-18:30 Rest / Reading; Evening.
- **Thursday:** Morning; Lunch; 17:00-17:30 Walk Bonnie (`WALK`); 18:00
  Protein shake (`PROTEIN`); 18:30 Home / Bath routine; Evening.
- **Sunday:** Thursday plus 09:30-10:00 Clean Room.

## Testing

- Unit (`npm test`): tags and routine as in steps 1-2.
- Manual in the running app (step 3). No browser harness is configured.
- `npm run lint`, `npx tsc --noEmit` and `npm run build` before review.

## Notes for the AI

- Read `node_modules/next/dist/docs/` only if you touch Next.js APIs; this
  feature should not.
- Postgres cannot drop an enum value, hence the create-cast-drop-rename
  sequence. Review the SQL by hand: it runs against the shared database.
- Never apply the migration or touch today's date blocks without approval.
- Keep activity texts in English exactly as written; labels in Spanish except
  "Job Hunting", which is the user's wording.
- No new dependency, config surface or UI.

## Open questions

- None. DEEP blocks are not preloaded by design: the user tags them by hand
  when planning each day.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7050,"specSha256":"c61dd2090e3c183143775780574889f44b5b062da1544241cf4bc2e5b966fd31","branch":"refs/heads/feature/etiquetas-y-rutina-del-winter-arc","head":"eb1350580900443187236e4b1cbebaf24304cefb","baseRef":"refs/heads/master","baseCommit":"eb1350580900443187236e4b1cbebaf24304cefb","sourceTree":"9ee5528ef2d77a02cda611e7d9b9e5d3b3e23ac2","absentOptional":[]} -->

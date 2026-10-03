# Feature: Bloques por defecto

**From build-plan:** feature 19
**Build attempt:** 1
**Status:** verified
**Branch:** feature/bloques-por-defecto

## Goal

"Generar día" preloads a fixed routine by weekday into the day's empty blocks,
so the day starts planned. Three routines: normal (Mon, Tue, Wed, Fri, Sat),
Thursday and Sunday. The default range becomes 06:30-23:30 every day. The
routine is a constant in code: templates do not return.

## In scope

- A constant `DEFAULT_ROUTINES` (activity + optional tag per block time) and a
  pure function that returns the routine for a calendar date, using the weekday
  of the requested date (not of today).
- `generateDay` applies the routine to **empty** blocks inside `[startTime,
  endTime]` after creating the blocks. A block is empty when `activity === ""`,
  `tag === null` and `completed === false` (same definition `generateDay`
  already uses for "has content"). Blocks with any content are never touched.
- Default range 06:30-23:30: the `Hoy` page fallback and the `DailyPlan.endTime`
  column default (`"21:00"` -> `"23:30"`, default-only migration; existing rows
  keep their values).
- Unit tests for the pure logic.

## Out of scope

- Editing the routine from the UI, per-user routines, templates or any new
  model. No new table or column.
- Applying the routine to past or closed days (the route already rejects them).
- The Winter Arc rules, view and API (features 20-21).
- Backfilling or changing existing plans and blocks.

## Build loop

Per `blueprint/config.json`: `stepReview: "feature"` (one review packet after
all steps) and `checkpointCommits: "disabled"`. Implement the steps in order,
run the checks named in each step, then stop for review. `/complete` creates
the final commit.

## Build steps

- [x] 1. **Routine constant and pure function.** New `src/lib/default-blocks.ts`
  with `DEFAULT_START = "06:30"`, `DEFAULT_END = "23:30"`, the routines below,
  and `getDefaultBlocks(date: Date): Map<string, { activity: string; tag:
  BlockTag | null }>` (key = block start time). Build the three routines from
  shared segments (morning, lunch, evening) so each text exists once. Tags use
  `BlockTag` from `@/lib/block-tags`. Add `src/lib/default-blocks.test.ts`.
  *Done when:* `npm test` passes with tests for: Mon/Tue/Wed/Fri/Sat return the
  normal routine; Thursday has no Gym and has Walk Bonnie at 17:00 and 17:30;
  Sunday has Clean Room at 09:30 and 10:00 and no Gym; every key is a valid
  `:00`/`:30` time; every activity is 200 characters or fewer.
- [x] 2. **Apply the routine in `generateDay`.** In
  [daily-plan.ts](src/lib/daily-plan.ts), after `createMany`, fill the empty
  blocks in range from `getDefaultBlocks(date)` using one `updateMany` per
  distinct (activity, tag) pair or one `update` per block inside the same
  transaction. The returned plan must include the filled blocks. Extract the
  "which blocks to fill" decision as a pure function in `default-blocks.ts`
  (inputs: existing blocks, range times, routine) and test it.
  *Done when:* `npm test` covers: a block outside the range is not created or
  filled; a block with an activity, a tag or a check keeps its values; an
  empty existing block inside the range is filled; running it twice gives the
  same result. `npm run lint` is clean.
- [x] 3. **Default range.** Add the migration changing `DailyPlan.endTime`
  default to `"23:30"` (`prisma migrate dev`, update `schema.prisma`). In
  [page.tsx](src/app/page.tsx) replace the local `DEFAULT_START`/`DEFAULT_END`
  with the exports from `default-blocks.ts`.
  *Done when:* `npx prisma migrate status` reports the schema in sync, and a
  plan created by saving a misc task (no blocks) shows 06:30-23:30 in the form.
- [x] 4. **Check in the running app.** Generate a Monday, a Thursday and a
  Sunday (future dates) with the default range and compare with the routines
  below; re-press "Generar día" after editing one block and confirm the edited
  block is kept. *Done when:* the three days match the tables and the edited
  block survives. Report only what was actually observed.

## Files / areas

- `src/lib/default-blocks.ts` (new) and `src/lib/default-blocks.test.ts` (new)
- [src/lib/daily-plan.ts](src/lib/daily-plan.ts) - `generateDay`
- [src/app/page.tsx](src/app/page.tsx) - default range constants
- `prisma/schema.prisma` and one new migration under `prisma/migrations/`
- No route or component change expected: the generate route
  ([route.ts](src/app/api/days/[date]/generate/route.ts)) already returns the
  plan's blocks including `activity` and `tag`.

## Data / contracts

- Weekday comes from `date.getUTCDay()` (`DailyPlan.date` is UTC midnight of the
  calendar day): 0 = Sunday, 4 = Thursday, everything else is the normal routine.
- API contract unchanged: `POST /api/days/[date]/generate` returns
  `{ startTime, endTime, blocks[] }`; the blocks now carry the preloaded
  activity and tag.
- `confirmRemoval` logic is unchanged. Preloaded content counts as content, so
  shrinking the range later asks for confirmation as it does for typed text.
- Schema: only the default of `DailyPlan.endTime` changes. `startTime` default
  stays `"06:30"`.

Each entry runs for the listed blocks only (30 minutes each); times not listed
stay empty. Tags not listed are none.

**Shared segments**

| Segment | Blocks |
|---|---|
| Morning | 06:30 Wake up; 07:00 and 07:30 Morning routine; 08:00 Breakfast; 08:30 Supplements / Chill |
| Lunch | 12:30 and 13:00 Lunch |
| Evening | 19:00 Dinner; 22:00, 22:30 and 23:00 Supplements / Reading / Brush Teeth; 23:30 Sleep (tag `BED`) |

**Normal (Mon, Tue, Wed, Fri, Sat):** Morning; Lunch; 14:30, 15:00, 15:30 Gym
(tag `GYM`); 16:30 Home / Bath routine; 17:00, 17:30, 18:00, 18:30 Rest /
Reading; Evening.

**Thursday:** Morning; Lunch; 17:00 and 17:30 Walk Bonnie (tag `WALK`); 18:00
Home; 18:30 Bath routine; Evening.

**Sunday:** Morning; 09:30 and 10:00 Clean Room; Lunch; 17:00 and 17:30 Walk
Bonnie (tag `WALK`); 18:00 Home; 18:30 Bath routine; Evening.

## Testing

- Unit (Vitest, `npm test`): the routine per weekday and the fill decision, as
  listed in steps 1-2. No database in unit tests.
- Manual in the running app (step 4). No browser harness is configured, so no
  browser test is added.
- `npm run lint` and `npm run build` before review.

## Notes for the AI

- Read `node_modules/next/dist/docs/` only if you touch Next.js APIs; this
  feature should not.
- Keep user-facing strings in Spanish, but activity texts exactly as written
  above (English).
- No new dependency, no config surface, no UI. Constant plus pure functions.
- Known behavior to keep: pressing "Generar día" again refills a default block
  whose text and tag the user cleared. That follows "only into empty blocks".
- Feature 20 will treat Thursday and Sunday as gym rest days; do nothing about
  rules here.

## Open questions

- None blocking. To confirm at review: the block counts of multi-block
  entries (Morning routine 07:00-07:30, Rest / Reading 17:00-18:30,
  evening 22:00-23:00) were expanded from your times ("until the next
  entry"); Supplements / Chill is a single block at 08:30.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7165,"specSha256":"d5f1368acc368695f887849b7ad5cfe4514dd3a0c6c159923e2ac14ff20dfea6","branch":"refs/heads/feature/bloques-por-defecto","head":"ed8adea62ef3259162fdd53c6e86c9f35cd3f557","baseRef":"refs/heads/master","baseCommit":"ed8adea62ef3259162fdd53c6e86c9f35cd3f557","sourceTree":"278a348b61eb0d72163d13486ea18f974c35d4a3","absentOptional":[]} -->

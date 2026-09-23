# Fix: Resolve today in the user's time zone

**Type:** Fix
**Status:** verified
**Branch:** fix/resolve-today-in-the-user-s-time-zone

## The problem

`resolveToday()` in `src/lib/date.ts` builds "today" from the **server
process's** local calendar day (`now.getFullYear()/getMonth()/getDate()/getDay()`).
On this machine that's `America/Guayaquil` (UTC-5, no DST), so it works
locally. On the planned host (Vercel), functions run in UTC, and Vercel
reserves the `TZ` env var, so it can't be changed there. From 19:00 local
time onward, UTC is already on the next calendar day. Several things go wrong
at once:

- "Hoy" would generate or show **tomorrow's** plan, with tomorrow's weekday
  template, every evening.
- Feature 8's close-out would close the real today at 19:00, and the toggle,
  add and remove routes would return 409 for the rest of the evening.

Every caller goes through `resolveToday()`:

- `src/lib/daily-plan.ts`: generation, close-out, and the edit helper.
- `src/app/api/daily-tasks/[id]/route.ts`: `PATCH` and `DELETE`.
- `src/app/api/daily-tasks/route.ts`: indirectly, through the edit helper.

## The fix

Compute the calendar day in one fixed time zone for the app,
`America/Guayaquil`. It's the single user's zone, as detected on this
machine. Use `Intl.DateTimeFormat` with `timeZone`, which is built into Node
and needs no dependency. The result no longer depends on the server's zone.

- Add `const APP_TIME_ZONE = "America/Guayaquil";` in `src/lib/date.ts`. It's
  a constant, not an env var, because this is a single-user app with one
  deployment. It's a one-line change if the user moves.
- `resolveToday(now = new Date())`:
  1. Read the `year`, `month`, and `day` parts from
     `new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year:
     "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)`.
  2. `date = new Date(Date.UTC(y, m - 1, d))`.
  3. `weekday = date.getUTCDay()`.
- The return shape stays `{ date, weekday }`, and the storage encoding stays
  the same (UTC midnight of the calendar day, per feature 6). No caller, route,
  or schema changes.

**Must not break:**

- Existing rows. Locally the server zone already is `America/Guayaquil`, so
  every stored `DailyPlan.date` already matches the new rule. There's no data
  migration, and nothing is deployed yet.
- Feature 6's generation and race handling, feature 8's close-out and 409
  guard, feature 9's add and remove. All of them consume `resolveToday()`
  unchanged.
- `completedAt` stays a real instant (`new Date()`) and is not affected.

## Build steps

- [x] **1. Zone-aware `resolveToday()`.** Implement the change above in
      `src/lib/date.ts` only.
      *Done when:*
      - `npm run lint` and `npm run build` pass.
      - With the server forced to UTC, a Node check against the pure module
        (it has no imports) returns the Guayaquil day, not the UTC day:
        `TZ=UTC node --experimental-strip-types -e "import('./src/lib/date.ts').then(({resolveToday:r})=>{for(const s of ['2026-09-23T23:30:00-05:00','2026-09-24T00:10:00-05:00','2026-09-23T04:59:00Z']){const x=r(new Date(s));console.log(s,x.date.toISOString(),x.weekday)}})"`
      - Expected output, in order:
        - `2026-09-23T00:00:00.000Z 3`
        - `2026-09-24T00:00:00.000Z 4`
        - `2026-09-22T00:00:00.000Z 2`

## Verify

- Run the Node check above. The first input is 23:30 in Guayaquil, which is
  already the 24th in UTC. It must still resolve to the 23rd, a Wednesday.
- With `npm run dev`, "Hoy" still shows today's plan and toggling still saves.
  Locally nothing changes visibly, because the machine zone already matches.
- Not provable locally: the Vercel behavior itself. The UTC-forced check is
  the evidence for it.

## Notes for the AI

- The `Intl` zone data comes with Node's default full ICU, both locally and
  on Vercel.
- This touches finding `F-05`'s area, but not its specific concern (writers
  passing raw local `Date`s). `F-05` stays for a later `/audit`; there's no
  `Fixes:` stamp.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4033,"specSha256":"f79d95749a6139ac14fe0e9c9428c3212dd0a8ae6ad6a53554e82a892ec2b995","branch":"refs/heads/fix/resolve-today-in-the-user-s-time-zone","head":"eb00a301dad5bd45a76be5008f15d2dbe0860395","baseRef":"refs/heads/master","baseCommit":"eb00a301dad5bd45a76be5008f15d2dbe0860395","sourceTree":"d4a309ae9016bb7d7c0ec39e9cbfc9b8b97baada","absentOptional":[]} -->

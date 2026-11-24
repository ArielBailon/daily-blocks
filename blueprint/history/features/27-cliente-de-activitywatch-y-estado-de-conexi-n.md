# Feature: Cliente de ActivityWatch y estado de conexión

**From build-plan:** feature 27
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/cliente-de-activitywatch-y-estado-de-conexi-n`

## Goal

Let the browser on the PC read ActivityWatch directly (`http://localhost:5600`,
Python `aw-server` v0.13.2) and expose a light connection state, so features 28
and 29 can show what really happened in each block. The integration is 100%
client-side: Vercel cannot reach the PC, nothing from ActivityWatch is stored
and the backend does not change. Desktop only for now: narrow viewports do
nothing.

## In scope

- `src/lib/activitywatch/config.ts`: `AW_URL` from `NEXT_PUBLIC_AW_URL`,
  default `http://localhost:5600`; `DISTRACTION_CATEGORIES` as full paths
  `["Media","Games"]`, `["Media","Video"]`, `["Media","Social Media"]`,
  `["Media","Music"]` (`Work > Video` also exists, so a bare name is
  ambiguous); `DISTRACTION_ALERT_MINUTES = 5`.
- Thin `fetch` client with a 2 s timeout (`AbortSignal.timeout`):
  `GET /api/0/info`, `GET /api/0/buckets/`, `GET /api/0/settings`,
  `GET /api/0/buckets/{id}/events?limit=1`, `POST /api/0/query/`.
- Categories: the `classes` from `/api/0/settings`; if that read fails or has
  no usable rule, a fallback in code with ActivityWatch's default categories.
- Pure logic with Vitest tests: block to ISO timeperiod, query building,
  bucket discovery, per-period aggregation by category and app with
  percentages and idle time, distraction seconds/minutes, alert decision.
- `ActivityWatchProvider` + `useActivityWatch()` (same pattern as
  `FocusProvider`), mounted once in the root layout: status
  `checking | connected | unavailable`, current activity polled every 10 s,
  paused while the tab is hidden, and a bound `query(periods)` for 28 and 29.
  A pure in-memory cache helper for finished blocks.
- A small status item in the NavBar, desktop widths only: a discreet dot when
  connected; "ActivityWatch no disponible" with a link to the guide when not.
- `docs/activitywatch.md`: CORS setup for the Python server on Windows, the
  Chrome local-network permission note, and `NEXT_PUBLIC_AW_URL`.

## Out of scope

- Prisma schema, migrations, Route Handlers, local scripts, service worker.
- Persisting or sending anything from ActivityWatch to the daily-blocks API.
- Rendering summaries in Hoy/Historial (28), live view and alert banner in
  Ahora/Hoy (29), and the React hook that refreshes block summaries every 60 s
  (28, where it first has a consumer; this feature ships the query and the
  cache helper it uses).
- A category editor, the mobile version, editing files outside the repo (the
  user applies the CORS config by hand).
- Any change to `FocusSession`, the Pomodoro or the Winter Arc engine.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps,
while `every` pauses for review after each step. Checkpoint commits are
disabled (`workflow.checkpointCommits`). `/complete` makes the final feature
commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Config and pure logic with tests** - `config.ts`,
      `categories.ts`, `period.ts`, `query.ts`, `summary.ts` under
      `src/lib/activitywatch/`, plus `zonedTimeToUtc` in `src/lib/date.ts`.
      *Done when:* `npm test`, `npm run lint` and `npm run build` pass with the
      cases listed under Testing.
- [x] **Step 2 - Client and provider** - `client.ts` (fetch wrappers) and
      `src/components/activitywatch/ActivityWatchProvider.tsx` mounted in
      `src/app/layout.tsx` around the NavBar and the page. *Done when:*
      `npm run lint` and `npm run build` pass, and every existing page still
      renders (checked in step 4).
- [x] **Step 3 - NavBar status and guide** -
      `src/components/activitywatch/ActivityWatchStatus.tsx` in the NavBar and
      `docs/activitywatch.md`. *Done when:* `npm run lint` and `npm run build`
      pass; the guide names the exact file and key confirmed in Data /
      contracts.
- [x] **Step 4 - Live run-through** - dev server on port 3000 with
      ActivityWatch running, flows under Testing. *Done when:* each flow passes
      or is reported, and `npm test`, `npm run lint` and `npm run build` pass.

Step 4 evidence note (2026-11-24): dev server started and stopped by the agent
with the user's approval in this chat, real ActivityWatch v0.13.2, driven with
Playwright; no database writes beyond what opening Hoy already does. Observed:
at 1280 px the NavBar showed "ActivityWatch conectado"; discovery (`/api/0/info`,
`/api/0/buckets/`, `/api/0/settings`) ran once, then the last window and AFK
events were read every 10.0 s; with `document.hidden` forced true no request ran
for 22 s, and one ran right after the tab came back; the only daily-blocks API
call was the existing `/api/focus/active`. At 390 px on `/ahora` no request to
port 5600 ran in 12 s, the status item was not in the page and there was no
horizontal scroll. With ActivityWatch quit by the user, the NavBar switched to
"ActivityWatch no disponible" (link to the GitHub guide, new tab,
`noopener noreferrer`), Historial kept working, and retries ran every 60 s (the
only console errors were the browser's own `ERR_CONNECTION_REFUSED` lines); after
reopening it the status went back to connected by itself in 22 s. Flow 3: a
one-off `tsx` script in the scratchpad ran `connect`, `readCurrent` and
`queryPeriods` against the real server: it found the three `AbsPC` buckets, used
the 13 regex rules from settings, and summarized today's 10 started blocks in one
query (category percentages, top 3 apps, idle, distraction minutes). Not
reproduced: flow 1 "before CORS is configured", because the user had already
applied the config; a CORS block and ActivityWatch off share the same
`unavailable` path, which flow 4 exercised. Seen during the run and unrelated to
this feature: a dev-only 500 on `/icon/192` (`SyntaxError: Unexpected end of
JSON input`) and the `pg` SSL-mode warning; neither file is touched here.

## Files / areas

- New: `src/lib/activitywatch/{config,categories,period,query,summary,client}.ts`,
  tests `period.test.ts`, `query.test.ts`, `summary.test.ts` next to them,
  `src/components/activitywatch/ActivityWatchProvider.tsx`,
  `src/components/activitywatch/ActivityWatchStatus.tsx`,
  `docs/activitywatch.md`.
- Edited: `src/lib/date.ts` and `src/lib/date.test.ts` (`zonedTimeToUtc`),
  `src/app/layout.tsx` (mount the provider), `src/components/layout/NavBar.tsx`
  (status item).
- Reused: `BLOCK_MINUTES`, `toMinutes` from `src/lib/blocks.ts`; the
  America/Guayaquil zone in `src/lib/date.ts`.

## Data / contracts

No schema, API or persisted data. ActivityWatch facts verified on 2026-11-24
against the user's server (`/api/0/info` -> `{"hostname":"AbsPC","version":"v0.13.2",...}`):

- Buckets: `aw-watcher-window_AbsPC` (`data: {app, title}`),
  `aw-watcher-afk_AbsPC` (`data: {status: "afk" | "not-afk"}`),
  `aw-watcher-web-chrome_AbsPC` (`data: {url, title, audible, incognito,
  tabCount}`), plus a stale `aw-watcher-web-chrome` without hostname.
  Discovery: among bucket ids with the prefix, prefer `<prefix><hostname>`
  (web: a prefix match ending in `_<hostname>`), else the first match by
  `last_updated` descending. Window and AFK are required; web is optional and
  only recorded (no consumer yet).
- Paths: the Python server redirects `/api/0/buckets` and `/api/0/query`
  without a trailing slash, which breaks a CORS POST, so the client always uses
  `/api/0/buckets/` and `/api/0/query/`.
- `GET /api/0/settings` returns `{ classes: [{ id, name: string[], rule:
  { type: "regex" | "none" | null, regex?, ignore_case? }, data? }], ... }`.
  Rules passed to `categorize` are `[name, rule]` for classes with
  `rule.type === "regex"` and a non-empty `regex` (aw-webui's
  `hasMatchableRegex`). Fallback: aw-webui's `defaultCategories` (Work,
  Programming, ActivityWatch, Image, Video, Audio, 3D, Media > Games / Video /
  Social Media / Music, Comms > IM / Email) with their exact regexes and
  `ignore_case` flags.
- Query: `POST /api/0/query/` with
  `{ query: string[], timeperiods: ["<startISO>/<endISO>", ...] }`; the
  response is one result per timeperiod. Statements (verified live):
  `window = query_bucket("<window>"); afk = query_bucket("<afk>");
  notafk = filter_keyvals(afk, "status", ["not-afk"]);
  active = filter_period_intersect(window, notafk);
  active = categorize(active, <rules JSON>);
  RETURN = {"apps": sort_by_duration(merge_events_by_keys(active, ["app"])),
  "cats": sort_by_duration(merge_events_by_keys(active, ["$category"]))};`.
  Bucket ids and rules are embedded with `JSON.stringify`. No `//` comments.
  `merge_events_by_keys` keeps only the merged key, so the query result holds
  app names and category paths, never titles or URLs.
- Period: `blockPeriod(dateKey, "HH:MM")` -> `"<start>/<start+30min>"` in UTC
  ISO, from `zonedTimeToUtc(dateKey, minutes)` (America/Guayaquil wall clock to
  an instant, computed with `Intl`, independent of the browser zone; a 23:30
  block ends at 00:00 the next day).
- Aggregation `summarizePeriod(result, periodSeconds)` ->
  `{ activeSeconds, idleSeconds, categories: { path: string[], seconds,
  percent }[], apps: { app, seconds }[] }`. Query events are not clipped to the
  period (live: AFK summed 3054 s in an 1800 s block), so when the active total
  exceeds the period every item is scaled down proportionally; idle is
  `periodSeconds - activeSeconds` (includes the PC off or ActivityWatch not
  running). Percentages are of the period, so categories plus idle sum to 100.
  Categories and apps sorted by seconds descending; `apps` keeps the top 3.
- `distractionSeconds(categories)`: the sum for paths equal to, or under, a
  `DISTRACTION_CATEGORIES` path. `distractionMinutes` floors to whole minutes.
- `shouldShowAlert({ minutes, key, dismissedKey })`: true when
  `minutes > DISTRACTION_ALERT_MINUTES` and `dismissedKey !== key`. The key is
  the session id or the DEEP block's start time (29); distraction minutes only
  grow inside one key, so crossing the threshold again means a new key.
- Cache helper `periodsToFetch(dateKey, startTimes, nowMs, cache)`: returns the
  started blocks that are not finished-and-cached; future blocks are never
  queried. Cached entries are only finished blocks.
- Provider state: `status`, `current: { app, title, since, afk } | null`
  (`since` is the window event's `timestamp`; `current` is null when the last
  window event ended more than 2 minutes ago), and
  `query(periods: string[]) => Promise<PeriodSummary[] | null>` (null on any
  failure, which also flips the status to `unavailable`).
- Polling: only when `matchMedia("(min-width: 768px)")` matches (Tailwind
  `md`). On first connect, read info, buckets and settings once; then every
  10 s read the last window and AFK events. While `unavailable`, retry every
  60 s instead of 10 s, so an unconfigured ActivityWatch does not flood the
  console with CORS errors. On `visibilitychange` to hidden, stop; on visible,
  poll at once. Narrow viewports make no request and stay `checking` (nothing
  renders there).
- A failed `fetch` cannot tell "off" from "blocked by CORS": both are
  `unavailable`. An HTTP error or a missing window/AFK bucket is also
  `unavailable`.
- Privacy: titles and URLs stay in browser memory only. No `console.*` calls
  with event data, no request to the daily-blocks API, no `localStorage` in
  this feature.
- Status item (NavBar, `hidden md:flex`): `connected` -> a small muted dot with
  the accessible label "ActivityWatch conectado"; `unavailable` ->
  "ActivityWatch no disponible" linking to
  `https://github.com/ArielBailon/daily-blocks/blob/master/docs/activitywatch.md`
  (new tab, `rel="noopener noreferrer"`); `checking` -> nothing.
- CORS (Python server, confirmed on this PC): file
  `C:\Users\<user>\AppData\Local\activitywatch\activitywatch\aw-server\aw-server.toml`,
  section `[server]`, key `cors_origins`, a comma-separated string:
  `cors_origins = "https://daily-blocks-mu.vercel.app,http://localhost:3000"`,
  uncommented, then restart ActivityWatch.

## Testing

Vitest, pure logic only (no jsdom or browser runner; none is added). Cases:

- `zonedTimeToUtc`: 2026-11-24 07:30 Guayaquil -> 12:30Z; 23:30 -> 04:30Z next
  day; same result whatever the process zone.
- `blockPeriod`: a normal block; the 23:30 block crossing midnight.
- `categorizeRules`: keeps regex classes, drops `none`, `null` and empty
  regex; falls back to defaults on an empty or malformed `classes`.
- `findBuckets`: prefers the hostname bucket over the stale web bucket;
  missing window or AFK -> null; falls back to the latest prefix match.
- `buildQuery`: embeds ids and rules as JSON, has no `//`.
- `summarizePeriod`: normal case with idle; active over the period scaled
  down; empty result is all idle; top 3 apps; percentages sum to 100.
- `distractionSeconds`: counts `Media > Video` and a child path, not
  `Work > Video`, not `Media` itself.
- `shouldShowAlert`: at, below and above the threshold; dismissed key; new key
  after dismissal.
- `periodsToFetch`: future block skipped, current block always fetched,
  finished cached block skipped, finished uncached block fetched.

Live flows (step 4, dev server started and stopped by the agent, real
ActivityWatch, no database writes):

1. Before CORS is configured: at 1280 px the NavBar shows "ActivityWatch no
   disponible" with the guide link; at 390 px nothing shows and no request to
   port 5600 is made; Hoy, Ahora and Historial work as before.
2. After the user adds the origins and restarts ActivityWatch: the status turns
   connected within one poll; requests to port 5600 repeat about every 10 s
   and stop while the tab is hidden; no request carries ActivityWatch data to
   the daily-blocks API.
3. A one-off script (scratchpad, not committed) calls `query` logic against the
   real server for today's started blocks and prints only category paths, app
   names and seconds.
4. Stopping ActivityWatch turns the status to "no disponible" without errors in
   the app.

## Notes for the AI

- `AGENTS.md` warns this Next.js has breaking changes: read the client
  component and layout guides in `node_modules/next/dist/docs/` before writing
  the provider, and keep the lint rules already enforced (no state set
  synchronously in effects, no impure calls during render).
- Decisions where the request was silent, to confirm at review: the provider
  lives in the root layout so the NavBar can show the status; the 60 s summary
  refresh hook moves to 28 (no consumer here); `unavailable` retries every
  60 s; `current` is null after 2 minutes without window events; the guide
  link points to GitHub, so it 404s until the branch reaches `master` on
  GitHub.
- Flow 2 depends on the user editing `aw-server.toml`; never edit files outside
  the repo. Chrome may ask for local network access on the Vercel origin.
- No migration, no new dependency. Keep comments to the why; no em dashes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15135,"specSha256":"dc0e5f54f2f6719c7d2d219294d502f88b1cc6c6b1257bb6813ab8de5d215d94","branch":"refs/heads/feature/cliente-de-activitywatch-y-estado-de-conexi-n","head":"59f2991652ea2b31f0de0a9fa896363d4a53d429","baseRef":"refs/heads/master","baseCommit":"59f2991652ea2b31f0de0a9fa896363d4a53d429","sourceTree":"f1cee09d97dd070cb6469390f50bd170709d8af2","absentOptional":[]} -->

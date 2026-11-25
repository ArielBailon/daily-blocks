# Fix: Panel de tiempo en la PC

**Type:** Fix
**Status:** verified
**Branch:** `fix/panel-de-tiempo-en-la-pc`

## The problem

Feature 28 ties ActivityWatch to each daily block: a bar under every block row
in Hoy and Historial. The user does not want ActivityWatch related to the
blocks; they want a separate view of how they used their time on the PC
during the day.

## The fix

- Remove the per-block bars from Hoy and Historial (`BlockActivity`,
  `BlockActivityProvider`, and the now-unused `barSegments`,
  `isDeepDistracted`, `formatAppMinutes`, `periodsToFetch` with their tests).
  Hoy's `BlockRow` and Historial's block list go back to their pre-28 markup.
- Add `PcTimePanel` in the right-hand column (under "Tareas varias" in Hoy, under
  the Foco card in Historial), desktop only (`hidden md:flex`), silent unless
  ActivityWatch is `connected`. It covers the whole calendar day of the page
  (00:00 to 24:00 America/Guayaquil, cut at now for today) with one query, and
  shows three collapsible sections (native `<details>`):
  1. **Por app** (open by default): one horizontal bar per app with its time,
     longest first, bar length relative to the top app; the top 8 apps, then
     "Otras (N)" with the rest summed.
  2. **Por categoría**: the same per ActivityWatch category path (for example
     `Work › Programming`), colored by top-level category (Work green, Media
     red, Comms yellow, others gray).
  3. **Total**: active time on the PC that day and the number of distinct apps.
- Today refreshes every 60 s while the tab is visible; a past day is queried
  once and cached in memory for the tab's life.
- Must not break: the alert banner in Hoy (29), the NavBar status (27), Hoy
  and Historial block editing and display. No schema or persistence change.

The first panel design above was replaced by the compact one in the scope
change below.

## Scope change (2026-11-25)

After seeing Hoy, the user asked for three more things in this fix:

- **Remove "Tareas varias"** from Hoy and Historial: `MiscTasksPanel`, the
  `PUT /api/days/[date]/misc-tasks` route, `saveMiscTasks` and
  `miscTasksInput`. The `DailyPlan.miscTasks` column and its field in the
  read API stay, so no data is lost and no migration runs.
- **Remove the Ahora mode completely** (features 25 and the Ahora half of 29):
  `/ahora`, `AhoraView`, `useWakeLock`, `LiveActivity`, the NavBar entry, and
  the "current window" read (`readCurrent`, `appStreakStart`) that only fed
  Ahora. The ActivityWatch provider keeps its status heartbeat with a cheap
  `/api/0/info` ping. The focus timer in Hoy (24), focus metrics (26), the
  NavBar status (27) and the distraction banner in Hoy (29) stay.
- **A compact panel in the place of "Tareas varias"**, modeled on the
  ActivityWatch dashboard but summarized: total active time, one stacked bar
  by top-level category with a legend, and the top 5 apps with bars plus
  "Otras (N)". While ActivityWatch is unavailable it shows a short muted
  note instead of disappearing. In Historial it sits above the Foco card.

**Per-app detail (2026-11-25):** each app in "Top apps" opens (native
`<details>`) to what was open in it: up to 5 entries plus "Otros (N)". The
query also merges active events by app and title; `groupTitles` drops the
app's own trailing name ("Google Chrome", "Visual Studio Code") and groups by
the last title segment, which is the site in a browser and the project in an
editor. Titles stay in browser memory, never persisted. The Chrome web
watcher's URLs are not used: it follows only one Chrome window, so it
misattributes time spent in other windows.

## Build steps

- [x] **Step 1 - Day totals logic with tests** - `dayRange`, `topWithRest` and
      `formatDuration` in `src/lib/activitywatch/day.ts`; `summarizePeriod`
      keeps every app (its only top-3 consumer goes away); remove the unused 28
      logic and its tests. *Done when:* `npm test` and `npm run lint` pass.
- [x] **Step 2 - Panel and removal of block bars** - `PcTimePanel.tsx` in Hoy
      and Historial; `BlockRow.tsx`, `src/app/page.tsx` and
      `src/app/historial/page.tsx` without the 28 bars. *Done when:*
      `npm run lint` and `npm run build` pass, and Playwright screenshots of Hoy
      and Historial at 1280 px are shown to the user before approval.

- [x] **Step 3 - Remove Tareas varias and Ahora; compact panel** - as in the
      scope change above. *Done when:* `npm test`, `npm run lint` and
      `npm run build` pass, and a screenshot of Hoy at 1280 px is shown.
- [x] **Step 4 - Per-app detail** - `groupTitles` in
      `src/lib/activitywatch/titles.ts` with tests, titles in the query and
      summary, expandable app rows. *Done when:* `npm test`, `npm run lint` and
      `npm run build` pass, and a screenshot with Chrome and Code open is shown.

## Verify

Open Hoy at a desktop width with ActivityWatch running: no bars under the
blocks; on the right, "Actividad en la PC" with the total, the category bar
and legend, and "Top apps"; opening chrome.exe lists the sites. Historial for
a past date shows the same for that day, above Foco. At 390 px nothing shows. `/ahora` returns 404 and the NavBar
has no Ahora entry; Hoy has no "Tareas varias".


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5223,"specSha256":"f1ca4d06f0a32c371930247280145538e8c6942b77de35cd720152f04b7ae0f6","branch":"refs/heads/fix/panel-de-tiempo-en-la-pc","head":"ccf7952fd75addd582aab6f54d47f3f530328733","baseRef":"refs/heads/master","baseCommit":"ccf7952fd75addd582aab6f54d47f3f530328733","sourceTree":"6811f44c1149d0f3c03c533f91835ab08c976037","absentOptional":[]} -->

# Feature: History by date

**From build-plan:** feature 15
**Build attempt:** 1
**Branch:** feature/history-by-date
**Status:** verified

## Goal

"Historial" lets you pick a past date and see that day read-only:
- its 30-minute blocks with activity and check;
- its "Tareas varias".

Nothing can be edited there. This replaces the old list of past days with
their % completed (feature 10).

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- The day view reuses "Hoy"'s look: the same bordered grid with a 24-hour
  time column (bold on the hour, muted on the half hour), and the "Tareas
  varias" card beside it. It has no form, no buttons, and no inputs.

## In scope

- **`/historial`:**
  - With no date, it shows only a "Fecha" date field and a prompt: "Elige
    una fecha para ver ese día." (user decision)
  - `/historial?fecha=YYYY-MM-DD` shows that past day read-only.
- **URL rules:** an invalid key, today, or a future key redirects to
  `/historial`.
- **Day states:**
  - blocks and/or tasks exist → show them;
  - the plan exists but has no blocks → "Este día no tiene bloques." in the
    grid card;
  - no tasks → "Sin tareas." in the panel;
  - no plan at all → "No hay nada registrado para este día."
- **Removed:** the old list and `getPastPlansSummary()`, which has no other
  caller and reads the legacy `DailyTask`.

## Out of scope

- Editing past days. `closePastPlans` already closes them, and the
  `/api/days` writes reject past dates.
- Showing legacy `DailyTask` rows. Days from before the block model show
  "No hay nada registrado…" unless they have blocks or tasks. The legacy
  tables go away in 16.
- Summaries, percentages, or a list of days with data.
- Removing Plantillas or the legacy models (16).

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. History page with date picker and read-only day.**
      - **New client component
        `src/components/historial/HistoryDatePicker.tsx`**, with the props
        `{ dateKey: string | null, maxKey: string }`:
        - A labelled "Fecha" `<input type="date" id="history-date"
          max={maxKey} value={dateKey ?? ""}>`, in the same label and field
          style as "Hoy"'s form.
        - On change with a non-empty value `<= maxKey`, call
          `router.push(`/historial?fecha=${value}`)`. An empty or later
          value is ignored.
      - **Rewrite `src/app/historial/page.tsx`** as a server component
        (`force-dynamic`, `searchParams: Promise<{ fecha?: string |
        string[] }>`):
        1. Set `today = resolveToday().date`, compute `maxKey` = the day
           before today as `YYYY-MM-DD`, and call `closePastPlans(today)`.
        2. With no `fecha`: render the header, the picker with
           `dateKey={null}`, and the muted prompt "Elige una fecha para ver
           ese día."
        3. Otherwise parse `fecha`. If it isn't a string, is invalid, or is
           `>= today`, call `redirect("/historial")`.
        4. Load the day with `getDayPlan(date)`, and render:
           - the header "Historial";
           - the picker with `dateKey`;
           - the long date as a subheading, formatted with the existing
             `dayFormat` (`es`, UTC), which can change to `weekday: "long"`
             and `month: "long"`;
           - then either "No hay nada registrado para este día." when
             there's no plan, or a layout like "Hoy"'s:
             - a wrapper `flex flex-col gap-6 md:flex-row-reverse
               md:items-start`;
             - the tasks card (`md:w-72 md:shrink-0`) with the heading
               "Tareas varias" and a `<ul>` of task text, or "Sin tareas.";
             - the grid card (`min-w-0 flex-1`), with an `<ol>` of rows or
               "Este día no tiene bloques.".
        5. **Each row:**
           - the same time cell as `BlockRow`, using `isOnTheHour`;
           - the activity as plain text in a `min-h-12 px-3 py-3 break-words`
             cell, struck through and muted when completed;
           - on the right, `<input type="checkbox" checked={completed}
             disabled aria-label={`Completado ${startTime}`}>` with
             `accent-accent`. Being disabled makes it read-only and it's
             announced natively.
        6. Container: `max-w-5xl`, the same page padding as "Hoy".
      - **Remove `getPastPlansSummary`** from `src/lib/daily-plan.ts`. Keep
        `closePastPlans`, which other callers use. Confirm with a search
        that nothing else imports the removed function.

      *Done when:* `npm run lint` and `npm run build` pass, and with
      `npm run dev`:
      1. `/historial` shows the date field (empty, with `max` = yesterday)
         and the prompt, with no list. The nav "Historial" is active.
      2. Picking a past date that has blocks and tasks goes to
         `/historial?fecha=…` and shows:
         - the long date;
         - the blocks with their activities and checks, with checked
           activities struck through;
         - the tasks.

         There are no text inputs and no buttons besides the date field and
         the nav, and the checkboxes are disabled.
      3. A past date with a plan but no blocks shows "Este día no tiene
         bloques." plus its tasks, or "Sin tareas.".
      4. A past date with no plan shows "No hay nada registrado para este
         día."
      5. `/historial?fecha=<today>`, `?fecha=<tomorrow>`,
         `?fecha=2026-02-30`, and `?fecha=abc` all end on `/historial`.
      6. **About 375 px:** the tasks card is above the grid, and there's no
         horizontal scroll.

      **Test data:** past days can't be written through the app. To get
      fixtures, set them up in Prisma Studio or with a one-off Prisma
      script: 2026-09-20 with a few blocks (some activities, one checked)
      and two misc tasks, and 2026-09-19 with a plan but no blocks. Remove
      those fixtures afterwards. Check whether yesterday (2026-09-22)
      already has data first, and use it if it does.

## Files / areas

- `src/components/historial/HistoryDatePicker.tsx`: new.
- `src/app/historial/page.tsx`: rewritten.
- `src/lib/daily-plan.ts`: `getPastPlansSummary` removed.
- Reused unchanged: `getDayPlan`, `closePastPlans`, `parseDateKey`,
  `toDateKey`, `resolveToday`, `isOnTheHour`, and `NavBar` (its active
  state uses the pathname).

## Data / contracts

- **Page URL:**
  - `/historial` shows the empty picker.
  - `/historial?fecha=YYYY-MM-DD` shows a past day.
  - Today's key, future keys, and invalid keys redirect to `/historial`.
- **Read-only:** no API route is added, and the page renders on the server
  with no client-side writes.
- **"Past":** `date < resolveToday().date` in `America/Guayaquil`.
  "Yesterday" is `today - 1 day` in UTC-midnight date keys.
- **Rendering:** activities and tasks render only as React text, never as
  HTML.
- No auth (single user).

## Testing

- No test runner and no Verify command are configured. The gates are:
  - `npm run lint` and `npm run build`;
  - the manual `npm run dev` path in step 1.
- No browser harness is configured. Any browser evidence comes from an
  ad-hoc session.
- Fixture rows written for the check are removed afterwards. Only rows
  created for the check are deleted; existing past days are never touched.

## Notes for the AI

- Next 16: `searchParams` is a Promise. `redirect` comes from
  `next/navigation` and must not be called inside a try/catch (the same
  pattern as `src/app/page.tsx`).
- The history rows are a small read-only markup, not `BlockRow`, which is
  an editable client component. Don't add props to `BlockRow` to make it
  read-only.
- Compute yesterday's key on the server as
  `toDateKey(new Date(today.getTime() - 86_400_000))`. `today` is UTC
  midnight, so this is exact.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8105,"specSha256":"2936a40204180ec63929f47462d6c823ada093a9e746fe8977e35da55c544681","branch":"refs/heads/feature/history-by-date","head":"5d6c5bd1c1fb7ffd442c91634dc1a13349600967","baseRef":"refs/heads/master","baseCommit":"5d6c5bd1c1fb7ffd442c91634dc1a13349600967","sourceTree":"10584663852f9bdc927f4b42027953c79710ea7a","absentOptional":[]} -->

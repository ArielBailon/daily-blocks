# daily-blocks - Project Overview

<!-- blueprint:source-hash 502c49a1466cfba70f96f02684aee2b7f6b023cb9c03ed92cfa2850173a2e54b -->

> A personal day planner that splits the day into 30-minute blocks, each with
> a free-text activity, an optional tag and a completion checkbox, plus a small
> log of misc tasks, and keeps an immutable, browsable history of each day.

## Problem

Manually rewriting a Deep-Work-style time-block schedule every day is
repetitive, and there's no record of how much of each day's plan actually got
done.

## Users

Personal use only (Ariel). Single user, no multi-tenancy, no roles or
accounts, no authentication. Used from desktop and mobile browsers through the
deployed URL; mobile is the primary surface for the daily view.

## Features

Features 1-18 are built. 1-10 were the original template-based checklist;
11-16 moved the app to the block planner and retired the template model. The
headline is **"Hoy" as block planning (13)**. 17 made the app installable.
18-21 add the **Winter Arc**: a 90-day challenge measured only from block tags
and checks, with no check-in form.

1. **Layout and navigation** - app shell with navigation.
2. **Prisma data schema** - original models on Postgres.
3. **Template CRUD** - *retired in 16.*
4. **Weekday recurrence** - *retired in 16.*
5. **Default template** - *retired in 16.*
6. **Automatic daily plan generation** - *replaced by 13.*
7. **"Hoy" checklist view** - *replaced by 13.*
8. **Day close-out** - past days become an immutable snapshot and can't be
   edited. *Still applies.*
9. **Manual edit of today's plan** - *replaced by 13.*
10. **History view** - *replaced by 15.*
11. **Global dark theme** - near-black background, cards with a subtle border,
    terracotta accent; serif headings, sans body text.
12. **Block day model** - `DailyPlan` gains start/end time and a misc-tasks
    list; new `Block` model. Additive migration.
13. **Block planning in "Hoy"** *(headline)* - pick the date (today or future)
    and start/end (only `:00`/`:30`). "Generar día" builds 30-minute blocks
    from start to end, both included, keeping what's written, and confirms
    before deleting blocks with text outside the range. "Vaciar" clears the
    day after confirmation. Each block has a free-text activity and an
    auto-saved checkbox, disabled on future days. Built as 13a (today's block
    screen), 13b (edit blocks), 13c (date and Vaciar).
14. **Tareas varias** - side panel for the day's small tasks as a text list
    (add/remove), auto-saved, no checkbox.
15. **History by date** - pick a past date and see its blocks, checks and misc
    tasks read-only.
16. **Retire templates and the old model** - remove Plantillas, its routes and
    template-based generation; drop Template, TemplateTask,
    TemplateRecurrence and DailyTask with their data.
17. **Installable app (PWA)** - manifest (name, dark-theme colors, icons) to
    install on the phone and open full screen. Offline shows a simple "Sin
    conexión" screen; no offline reading or editing.
18. **Etiquetas de bloque** - optional tag per block, chosen in "Hoy" with a
    compact auto-saved selector; shown read-only in Historial. Additive
    migration.
19. **Bloques por defecto al generar el día** - "Generar día" preloads a fixed
    routine by weekday (normal: Mon, Tue, Wed, Fri, Sat; Thursday; Sunday)
    only into empty blocks inside the range. Default range 06:30-23:30 every
    day. A constant in code: templates do not return.
20. **Motor de reglas y vista Winter Arc** - built in three steps. 20a: tag
    and routine adjustments (APPLY -> JOB_HUNTING; INTERVIEW, LINKEDIN and BED
    removed; Job
    Applying, Protein shake and SCREENS_OFF blocks in the default routine).
    20b: pure rule engine. Daily: DEEP (Mon-Sat, 8 checked blocks in runs of
    2+) and SCREENS_OFF (every day, 2+ checked blocks). Weekly, full weeks
    only (Mon-Sun): GYM (5 days), WALK (2 days), JOB_HUNTING (4+ blocks).
    Day status green/yellow/red/gray, "never fail twice in a row" streak,
    arc start 2026-10-03, 90 days. 20c: the "Winter Arc" view with "Día X de
    90", streaks, current week, 90-day grid and % per rule.
21. **API de lectura** - read-only `GET /api/days?from&to` (days with blocks,
    tags and misc tasks, max 120 days) and `GET /api/arc/stats` (same
    calculation as the Winter Arc view).

## Data model

### DailyPlan

- `id` (int) - primary key
- `date` (date, unique) - one plan per calendar day
- `closed` (bool, default false) - true once the day is past; closed days are
  read-only
- `startTime` (string `HH:MM`) - start of the day's range
- `endTime` (string `HH:MM`) - end of the range, inclusive: blocks cover
  `[startTime, endTime]` in 30-minute steps, so the last block starts at
  `endTime`
- `miscTasks` (string list, default empty) - the "Tareas varias" log, in
  insertion order
- has many `Block`

### Block

- `id` (int) - primary key
- `dailyPlanId` (int) - FK -> DailyPlan, cascade on delete
- `startTime` (string `HH:MM`) - start of the 30-minute block; unique per
  `dailyPlanId`
- `activity` (string, may be empty) - free-text activity
- `completed` (bool, default false) - whether the block was done
- `tag` (enum `BlockTag`, nullable) - `DEEP | LINKEDIN | GYM | WALK | PROTEIN | APPLY | INTERVIEW |
  SCREENS_OFF | BED`; added in 18. 20a renames APPLY to JOB_HUNTING and
  removes INTERVIEW, LINKEDIN and BED.

> Winter Arc adds no tables: its state is derived from `DailyPlan` + `Block`;
> the default blocks of 19 are a code constant.
>
> `DailyPlan` and `Block` are the day's source of truth. Once `closed` is true
> they are an immutable snapshot that history (15) and the Winter Arc (20, 21)
> read. Template, TemplateTask, TemplateRecurrence and DailyTask were dropped
> in 16.

## Tech stack

- **Next.js (App Router, TypeScript, Tailwind, `src/`)** - frontend and app
  shell.
- **Next.js Route Handlers (`src/app/api/**`)** - backend in the same project.
- **Prisma** - ORM for all database access.
- **PostgreSQL on Prisma Postgres, free tier** - provisioned from Vercel
  Storage; reachable from desktop and mobile.

## Monetization

Not applicable - personal-use tool.

## UI/UX

Minimalist. Dark theme across the whole app: near-black background, cards
with a subtle border, terracotta accent, serif headings, sans body text. Must
work well on a narrow mobile viewport.

Design reference: `blueprint/reference/planificacion-por-bloques.png`.

- `/` (Hoy) - title and short description; a form with date, start and end,
  plus "Generar día" and "Vaciar"; a grid with one row per block: 24-hour time
  (on-the-hour bold, half-hours muted), the activity, a tag selector and a
  completion checkbox; a "Tareas varias" side panel with "+ Añadir tarea"; a
  footer saying "Se guarda automáticamente".
- `/historial` - pick a past date and see that day read-only.
- Winter Arc section (20) - route not specified in the plans.
- Navigation: Hoy, Historial, and Winter Arc once 20 lands.
- Installable as a PWA (17): home-screen icon, opens full screen. Offline
  shows only a "Sin conexión" screen; no offline data.

## Deployment

- **Host:** Vercel.
- **Database:** Prisma Postgres, free tier, via Vercel Storage, connected with
  `DATABASE_URL`.
- **Env vars:** `DATABASE_URL`.
- **Build:** `npm run vercel-build` (runs `prisma migrate deploy`, then
  `next build`), per AGENTS.md.
- **PWA:** installation requires HTTPS, which the Vercel URL provides.

> TODO: health checks and domain are not decided; revisit in `/release`.

## Open questions

> Resolve these in the plans, then re-run /overview.

- `project-plan.md` never mentions the Winter Arc, tags, default blocks or the
  read API (features 18-21 exist only in `build-plan.md`). Its section 3, 4
  and 7 are out of date.
- Feature 12 still says the default range is 07:30-18:00; the real default
  is 06:30-23:30 (feature 19).
- The Winter Arc route and its nav label are not specified.

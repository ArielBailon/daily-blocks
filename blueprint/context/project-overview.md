# daily-blocks - Project Overview

<!-- blueprint:source-hash 5e98c1028d67c7be57899a483665f20e0589549b2a741892923d502afe58f11e -->

> A personal day planner that splits the day into 30-minute blocks, each with
> a free-text activity and a completion checkbox, plus a small log of misc
> tasks, and keeps an immutable, browsable history of each day.

## Problem

Manually rewriting a Deep-Work-style time-block schedule every day is
repetitive, and there's no record of how much of each day's plan actually got
done.

## Users

Personal use only (Ariel). Single user, no multi-tenancy, no roles or
accounts, no authentication. Used from desktop and mobile browsers through the
deployed URL; mobile is the primary surface for the daily view.

## Features

Features 1-10 are built (the original template-based checklist). Features
11-16 move the app to the block planner and then retire the template model.
The headline is **"Hoy" as block planning (13)**. 17 makes the app
installable on the phone.
18-21 agregan el **Winter Arc**: un reto de 90 días que se mide solo con
etiquetas y checks de bloques, sin formulario de check-in.

1. **Layout and navigation** - app shell with "Hoy", "Plantillas", "Historial".
2. **Prisma data schema** - Template, TemplateTask, TemplateRecurrence,
   DailyPlan, DailyTask on Postgres.
3. **Template CRUD** - templates with an ordered task list.
4. **Weekday recurrence** - assign a template to weekdays.
5. **Default template** - used when a day has no recurrence.
6. **Automatic daily plan generation** - "Hoy" creates the day's plan from the
   matching template.
7. **"Hoy" checklist view** - tasks with checkboxes, saved immediately.
8. **Day close-out** - past days become an immutable snapshot and can't be
   edited. *Still applies to the new model.*
9. **Manual edit of today's plan** - add/remove a one-off task.
10. **History view** - past days with % completed. *Replaced by 15.*
11. **Global dark theme** - near-black background, cards with a subtle border,
    terracotta accent; serif headings, sans body text, across the whole app.
12. **Block day model** - `DailyPlan` gains start/end time and a misc-tasks
    list; new `Block` model. Additive migration; existing data untouched.
13. **Block planning in "Hoy"** *(headline)* - pick the date (today or future)
    and start/end (only `:00`/`:30`, default 06:30-21:00). "Generar día"
    builds the 30-minute blocks from start to end, both included, while
    keeping what's already written, and asks for confirmation before deleting
    blocks with text that fall outside the new range. "Vaciar" clears the day after confirmation. Each block has a
    free-text activity and a completion checkbox, auto-saved. On future days
    the checkbox is disabled.
14. **Tareas varias** - side panel to log the day's small tasks as a text
    list (add/remove), auto-saved, no checkbox.
15. **History by date** - pick a past date and see its blocks, checks, and
    misc tasks read-only.
16. **Retire templates and the old model** - remove the Plantillas section,
    its routes, and template-based generation; drop Template, TemplateTask,
    TemplateRecurrence, and DailyTask with their data.
17. **Installable app (PWA)** - web app manifest (name, dark-theme colors,
    icons) so the app can be installed on the phone and opened full screen
    without browser chrome. Offline shows a simple "Sin conexión" screen;
    no offline reading or editing.
18. **Etiquetas de bloque** - `tag` opcional por bloque con un selector
    compacto en "Hoy" que se guarda solo; indicador sutil en Hoy y en
    Historial (solo lectura). Migración aditiva.
19. **Bloques por defecto** - de lunes a sábado, "Generar día" precarga los
    bloques de `DEFAULT_BLOCKS` (actividad + etiqueta) solo en bloques vacíos
    y dentro del rango. Los domingos no se precarga nada. Rango por defecto
    06:30-22:00 todos los días. Constante en código, sin modelo ni UI.
20. **Motor de reglas y vista Winter Arc** - R1-R5 en funciones puras en
    `src/lib/arc/`; estado del día a partir de R1, R3 y R5 (R1 no aplica el
    domingo); racha "nunca fallar dos veces seguidas"; R2 y R4 semanales con
    ritmo, evaluadas solo en semanas completas. `/arc` muestra "Día X de 90",
    las rachas, la semana actual, la grilla de 90 días con detalle por regla
    y el % por regla.
21. **API de lectura** - `GET /api/days?from&to` (máximo 120 días) y
    `GET /api/arc/stats`, reutilizando `src/lib/arc/`. Sin auth.

## Data model

Target model once 16 lands. Until then the legacy models below still exist.

### DailyPlan

- `id` (int) - primary key
- `date` (date, unique) - one plan per calendar day
- `closed` (bool, default false) - true once the day is past; closed days are
  read-only
- `startTime` (string `HH:MM`, default `"06:30"`) - start of the day's range
- `endTime` (string `HH:MM`, default `"21:00"`) - end of the day's range
  (inclusive; blocks cover `[startTime, endTime]` in 30-minute steps, so the
  last block starts at `endTime`)
- `miscTasks` (string list, default empty) - the "Tareas varias" log, in
  insertion order
- has many `Block`
- legacy until 16: `templateId` (nullable FK -> Template), has many
  `DailyTask`

### Block

- `id` (int) - primary key
- `dailyPlanId` (int) - FK -> DailyPlan, cascade on delete
- `startTime` (string `HH:MM`) - start of the 30-minute block; unique per
  `dailyPlanId`
- `activity` (string, may be empty) - free-text activity
- `completed` (bool, default false) - whether the block was done
- `tag` (enum `BlockTag`, nullable) - `DEEP | LINKEDIN | GYM | WALK |
  PROTEIN | APPLY | INTERVIEW | SCREENS_OFF | BED`. Se agrega en 18; los
  bloques existentes quedan sin etiqueta.

> Winter Arc no agrega tablas: todo su estado se deriva de `DailyPlan` +
> `Block`, y la configuración (inicio, `DEFAULT_BLOCKS`, constantes) vive en
> `src/lib/arc/config.ts`.

### Legacy (removed in 16)

- `Template` (name, isDefault, createdAt), `TemplateTask` (title, optional
  suggestedTime, order), `TemplateRecurrence` (weekday 0-6 as primary key ->
  template), `DailyTask` (title, suggestedTime, completed, completedAt, order).
  Their data is deleted, not migrated.

> `DailyPlan` and `Block` are the day's source of truth. Once `closed` is
> true they are an immutable snapshot that history (15) reads.

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

- `/` (Hoy) - title and short description; a form with date, start, and end,
  plus "Generar día" and "Vaciar"; a grid with one row per block: 24-hour time
  (on-the-hour bold, half-hours muted), the activity, and a completion
  checkbox; a "Tareas varias" side panel with "+ Añadir tarea"; a footer
  saying "Se guarda automáticamente".
- `/historial` - pick a past date and see that day read-only.
- Navigation: Hoy, Historial y Winter Arc (`/arc`, 20). Plantillas is removed in 16.
- Installable as a PWA (17): home-screen icon, opens full screen. Offline
  shows only a "Sin conexión" screen; no offline data.

## Deployment

- **Host:** Vercel.
- **Database:** Prisma Postgres, free tier, via Vercel Storage, connected with
  `DATABASE_URL`.
- **Env vars:** `DATABASE_URL`.
- **PWA:** installation requires HTTPS, which the Vercel URL provides.

> TODO: build/start commands, migration step on deploy, health checks, and
> domain are not decided; revisit in `/release`.

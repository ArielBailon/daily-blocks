# daily-blocks - Project Overview

<!-- blueprint:source-hash 15196beaf6d0719ad9eb48f8e5af636891e8b113b99b772a0f7c2027475eedd7 -->

> A personal daily planner that generates a time-blocked checklist from
> reusable templates, tracks completion, and keeps an immutable history of
> each day.

## Problem

Manually rewriting a Deep-Work-style time-block schedule every day is
repetitive, since most workdays repeat the same structure. There's no way to
reuse a day's task layout across similar days, and no record of how much of
the plan actually got done.

## Users

Personal use only (Ariel). Single user, no multi-tenancy, no roles or
accounts.

## Usage model

Single-user, no authentication. No multi-tenant, hostile-user, or compliance
requirements. Free-tier Postgres (Prisma Postgres, via Vercel Storage) is sufficient for
scale. Accessed from both desktop and mobile browsers via the deployed URL,
with mobile as the primary usage surface for the daily view.

## Features

The headline feature is the "Hoy" (Today) checklist view — everything else
supports keeping it filled with the right tasks and preserving its history.

1. **Layout and navigation** - app shell with "Hoy," "Plantillas," and
   "Historial" sections.
2. **Prisma data schema** - Template, TemplateTask, TemplateRecurrence,
   DailyPlan, DailyTask models migrated to Postgres.
3. **Template CRUD** - create, edit, and delete a template with its ordered
   task list (title + optional suggested time).
4. **Weekday recurrence** - assign a template to one or more days of the
   week.
5. **Default template** - mark one template as default for days with no
   recurrence assigned.
6. **Automatic daily plan generation** - opening "Hoy" with no plan for the
   date creates one from the matching template (recurring or default).
7. **"Hoy" checklist view** - **(headline)** list today's tasks with
   checkboxes; toggling completed/pending saves immediately.
8. **Day close-out** - snapshot the day's final task state when the day ends
   (or the date changes); a closed day can't be edited.
9. **Manual edit of today's plan** - add or remove a one-off task from
   today's plan without changing the template it came from.
10. **History view** - list of past days with % of tasks completed per day.

## Data model

### Template

- `id` - primary key
- `name` (string)
- `isDefault` (bool) - used when a day has no matching recurrence
- `createdAt` (datetime)
- has many `TemplateTask`, `TemplateRecurrence`

### TemplateTask

- `id` - primary key
- `templateId` - FK -> Template
- `title` (string)
- `suggestedTime` (string/time, optional)
- `order` (int)

### TemplateRecurrence

- `templateId` - FK -> Template
- `weekday` (int, 0-6) - primary key, so each weekday maps to at most one
  template

### DailyPlan

- `id` - primary key
- `date` (date, unique) - one plan per calendar day
- `templateId` - FK -> Template, nullable (null when manually edited without
  a template)
- `closed` (bool) - true once the day's snapshot is final and immutable
- has many `DailyTask`

### DailyTask

- `id` - primary key
- `dailyPlanId` - FK -> DailyPlan
- `title` (string)
- `suggestedTime` (string/time, optional)
- `completed` (bool)
- `completedAt` (datetime, optional)
- `order` (int)

> `DailyPlan`/`DailyTask` are the historical source of truth once `closed` is
> true - later features (history, close-out) depend on this snapshot being
> immutable.

## Tech stack

- **Next.js (App Router, TypeScript, Tailwind, `src/`)** - frontend and app
  shell.
- **Next.js Route Handlers (`src/app/api/**`)** - backend, in the same
  project; no separate service.
- **Prisma** - ORM for all database access.
- **PostgreSQL on Prisma Postgres, free tier** - provisioned from the Vercel
  Storage dashboard; reachable from desktop and mobile without a self-hosted
  server.

## Monetization

Not applicable — personal-use tool.

## UI/UX

Minimalist, serif typography, warm/earth tones (cream/earth), no dashboards
or unnecessary configuration. Must work well on a narrow mobile viewport
without compromising the daily view, since phone is the primary usage
surface.

- `/` (Hoy) - today's checklist, generated from the matching template.
- `/plantillas` - template CRUD, recurrence assignment, default toggle.
- `/historial` - list of past days with completion percentage.

## Deployment

- **Host:** Vercel.
- **Database:** Prisma Postgres, free tier, provisioned via Vercel Storage, connected via `DATABASE_URL`.
- **Env vars:** `DATABASE_URL`.
- Accessible from both desktop and mobile via the deployed public URL.

> TODO: build/start commands, health checks, and domain are not yet decided
> beyond the Vercel default; revisit in `/release`.

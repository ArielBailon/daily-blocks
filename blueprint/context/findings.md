# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] unverified - Foreign-key columns have no indexes

**File:** prisma/schema.prisma:27
**Found:** 2026-09-22 by /audit (scope: current; lens: performance)
**Why it matters:** PostgreSQL does not index foreign-key columns automatically,
and Prisma does not add them for this provider. The applied migration confirms it:
`prisma/migrations/20260922152321_init/migration.sql:52` creates only
`DailyPlan_date_key`, so `TemplateTask.templateId` (schema line 27),
`TemplateRecurrence.templateId` (line 36), `DailyPlan.templateId` (line 43), and
`DailyTask.dailyPlanId` (line 51) are unindexed. Every relation read that later
features will run (loading a plan's tasks, a template's tasks) and every
`ON DELETE CASCADE`/`SET NULL` parent delete scans the child table. Marked
unverified because there is no profiling evidence and no query code exists yet:
for a single-user planner these tables stay small enough that a sequential scan
is likely faster than an index lookup, so this is a scale-dependent lead rather
than a confirmed defect. It is recorded so the decision is deliberate rather than
accidental.
**Suggested fix:** If a later feature shows slow relation reads, add
`@@index([templateId])` to `TemplateTask` and `TemplateRecurrence`,
`@@index([templateId])` to `DailyPlan`, and `@@index([dailyPlanId])` to
`DailyTask`, then a follow-up `prisma migrate dev`. Do not add them now on
hypothetical scale alone.
**Resolution:**

### F-05 [P2] unverified - `@db.Date` maps to UTC midnight, so local-time writers can record the wrong day

**File:** prisma/schema.prisma:42
**Found:** 2026-09-22 by /audit (scope: current; lens: quality)
**Why it matters:** The spec's rationale says `@db.Date` "avoids
timezone-dependent duplicate-day bugs". It removes the time component in the
database, but Prisma Client still exposes the field as a JavaScript `Date` and
truncates to the calendar day in UTC. A writer that passes a locally constructed
value (`new Date()`) from a UTC+1/+2 timezone between local midnight and 01:00 or
02:00 stores the previous calendar day, which then collides with yesterday's row
through `DailyPlan_date_key` (`migration.sql:52`) or silently attaches today's
tasks to yesterday's plan. "One plan per calendar day" is the core contract of
this app. Marked unverified because no code in this delta reads or writes the
field, so this is a lead for the features that do (3 and 6), not a defect in the
current diff.
**Suggested fix:** When feature 3 or 6 writes `DailyPlan.date`, build the value
at UTC midnight for the user's local calendar day (a small shared helper in
`src/lib/`), and cover the boundary case. No schema change is needed.
**Resolution:**

### F-06 [P3] fixed - The generate step covers `npm run build` but not `npm run dev`

**File:** package.json:7
**Found:** 2026-09-22 by /audit (scope: current; lens: quality)
**Why it matters:** F-01's repair uses `prebuild`, which npm runs only for
`npm run build`. `AGENTS.md` also declares `npm run dev` as a project command,
and there is no `postinstall` or `predev` script, so a fresh clone that runs
`npm install && npm run dev` never produces `src/generated/prisma` (gitignored
at `.gitignore:43`). Nothing breaks today because no page or route imports the
client yet: `src/lib/prisma.ts:1` is the only reference, and it is unreachable
from any route, so Turbopack never compiles it on demand. Once feature 3 wires
a Server Component or Route Handler to `prisma`, the first `npm run dev` on a
clean checkout fails on an unresolved `@/generated/prisma/client` until someone
happens to run a build. Marked unverified because that break is not reachable in
this delta; it is recorded so the narrower `prebuild` choice stays deliberate.
**Suggested fix:** When feature 3 adds the first importer, either change
`prebuild` to `postinstall` (one script covering install, dev, and build, since
`DATABASE_URL= npx prisma generate` exits 0 and needs no database) or add a
matching `predev`. Prisma ORM 7 no longer generates on install, so the script
has to be explicit either way. No new dependency is needed. Nothing is lost by
deferring: the only current cost is one manual `npx prisma generate`.
**Resolution:** Feature 3 (Template CRUD) is exactly the predicted trigger -
it wires `src/lib/prisma.ts` into Route Handlers and Server Components.
Reproduced the break first: removed `src/generated/prisma`, ran a fresh dev
server, and `GET /plantillas` failed with `Module not found: Can't resolve
'@/generated/prisma/client'`. Replaced `"prebuild": "prisma generate"` with
`"postinstall": "prisma generate"` in `package.json`, which npm runs after
`npm install` regardless of whether `dev`, `build`, or nothing follows.
Re-verified: removed the generated client again, ran `npm install` (which
regenerated it via `postinstall`), then confirmed both `npm run dev` (`GET
/plantillas` returns `200`) and `npm run build` succeed. Not yet closed - no
review has looked at the fix.

### F-07 [P2] fixed - Nothing applies the migration on a production deploy

**File:** package.json:8
**Found:** 2026-09-22 by /audit (scope: current; lens: quality)
**Why it matters:** This feature ships the project's first migration
(`prisma/migrations/20260922152321_init/migration.sql`), so from now on a
deployed instance needs the migration applied before it serves a request.
`coding-standards.md:66` states the rule directly: "Production deployments must
run `prisma migrate deploy` before the app starts". The repair added
`prisma generate` to the build, which only emits client code and never touches
the database, and `build`/`start` (`package.json:8-9`) are plain `next build`
and `next start`. There is no `vercel.json`, CI workflow, or release script, so
a first deploy to the Vercel host named in `project-overview.md` would build
successfully against a database with no tables and fail at the first query.
Marked unverified because nothing is deployed yet and
`project-overview.md:133-134` explicitly defers build and start commands to
`/release`, so this is a release-readiness gap rather than a defect in the
current delta.
**Suggested fix:** During `/release`, put `prisma migrate deploy` in the
deployment's build or pre-start step (for Vercel, folding it into the build
command is the usual place, for example `"build": "prisma migrate deploy &&
next build"`). Do not add it to the local `prebuild`: `prisma migrate dev`
already owns local schema changes per `coding-standards.md:64`, and running
`migrate deploy` on every local build would be machinery this project does not
need yet.
**Resolution:** During /release (2026-09-24) added a `vercel-build` script to
`package.json`: `prisma migrate deploy --config prisma7.config.ts && next build`.
Vercel runs `vercel-build` instead of `build` when it exists, so local
`npm run build` stays migration-free. Verified locally with `npm run vercel-build`:
"No pending migrations to apply." and the build passed. Not yet closed - no review
has looked at the fix, and it has not run on Vercel yet.

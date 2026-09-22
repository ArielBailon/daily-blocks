# Feature: Layout and navigation

**From build-plan:** feature 1
**Build attempt:** 1
**Branch:** feature/layout-and-navigation

## Goal

Replace the create-next-app placeholder with the app's real shell: a
persistent navigation between the three sections ("Hoy," "Plantillas,"
"Historial") and the project's warm, serif, mobile-first visual baseline,
so every later feature has routes and a theme to build into.

## In scope

- Warm/serif theme tokens in `globals.css` (cream background, warm-ink
  foreground, one muted tone, one accent tone for the active nav link), no
  dark-mode branch.
- A shared navigation component linking `/` (Hoy), `/plantillas`
  (Plantillas), `/historial` (Historial), with the current route visually
  marked active, rendered on every page via the root layout.
- Placeholder pages for `/plantillas` and `/historial` (heading only - real
  content is features 3 and 10).
- Replacing `/` (`src/app/page.tsx`) with a "Hoy" placeholder heading (real
  checklist content is feature 7).
- Removing create-next-app boilerplate: default metadata, Geist fonts, the
  starter copy/links on `/`, and the now-unused `public/*.svg` files.

## Out of scope

- Any Prisma model, migration, or data fetching (feature 2).
- Real content for Hoy, Plantillas, or Historial (features 3, 7, 10).
- Auth/session handling (project has none - single user).
- A responsive breakpoint-specific nav (hamburger, bottom tab bar); three
  links fit one row at any supported width.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and
`checkpointCommits` is `disabled`. Implement and verify each step below,
then present one feature-level review packet with the full diff and
Done-when evidence - no per-step approval pause, no checkpoint commits.
`/complete` makes the one feature commit after review.

## Build steps

- [x] 1. Theme tokens and root layout. In `src/app/globals.css`, replace the
      default black/white + dark-mode tokens with a warm palette
      (`--background` cream, `--foreground` warm dark ink, `--muted` soft
      tan, `--accent` muted terracotta) under the existing `@theme inline`
      block; drop the `prefers-color-scheme: dark` override. In
      `src/app/layout.tsx`, swap the `Geist`/`Geist_Mono` fonts for a single
      serif Google Font (`next/font/google`, e.g. `Lora`) applied via
      `font-sans` in `@theme inline`, and set real `metadata` (`title:
      "daily-blocks"`, a one-line `description`).
      **Done when:** `npm run build` succeeds and any route renders with the
      cream background, warm-ink text, and serif font (screenshot).
- [x] 2. Navigation shell. Add `src/components/layout/NavBar.tsx` (client
      component - needs the current pathname): three links to `/`,
      `/plantillas`, `/historial` labeled "Hoy," "Plantillas," "Historial,"
      the active one styled with the accent token via `usePathname`. Render
      `<NavBar />` once in `src/app/layout.tsx` above `{children}`.
      **Done when:** every route in step 3 shows the same nav bar with the
      current section visibly marked active (screenshot of two different
      routes).
- [x] 3. Section pages. Replace `src/app/page.tsx` with a minimal "Hoy"
      placeholder (heading + one line noting the checklist isn't built yet),
      removing the `next/image` boilerplate, starter copy, and external
      links. Add `src/app/plantillas/page.tsx` and
      `src/app/historial/page.tsx` with matching minimal placeholders
      ("Plantillas" / "Historial"). Delete the now-unused
      `public/next.svg`, `public/vercel.svg`, `public/file.svg`,
      `public/globe.svg`, `public/window.svg`.
      **Done when:** `npm run build` succeeds and manually visiting `/`,
      `/plantillas`, and `/historial` on the dev server renders each
      section's placeholder with no console errors (screenshot each).

## Files / areas

- `src/app/globals.css` - theme tokens
- `src/app/layout.tsx` - fonts, metadata, mounts `NavBar`
- `src/components/layout/NavBar.tsx` - new
- `src/app/page.tsx` - Hoy placeholder (replaces starter content)
- `src/app/plantillas/page.tsx` - new
- `src/app/historial/page.tsx` - new
- `public/*.svg` - removed (next.svg, vercel.svg, file.svg, globe.svg, window.svg)

## Data / contracts

None. No Prisma model, route handler, or persisted data in this feature.

## Testing

No unit test runner is configured yet (opt-in per `coding-standards.md`), and
this feature is pure UI/navigation with no logic-bearing code, so it's exempt
from the test gate. Verified with `npm run build` plus dev-server screenshots
per step above, per the Browser Verification section of
`coding-standards.md`.

## Notes for the AI

- Font, exact hex values, and nav placement (single top row) are reversible
  implementation details, not product decisions - proceed without asking.
- Keep `NavBar` the only client component this feature needs; the three
  pages stay server components.
- Nothing here touches `prisma/schema.prisma` or `.env` - feature 2 owns
  the data layer.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5146,"specSha256":"d5cc659198a2d58143f2d130f6e9e90318d2a2757796efa1ccebfa46fccd54e4","branch":"refs/heads/feature/layout-and-navigation","head":"ecdb0922cb3f057aa285403710b7152befe4c318","baseRef":"refs/heads/master","baseCommit":"ecdb0922cb3f057aa285403710b7152befe4c318","sourceTree":"4e760596cf8f89f115f34bfabe97589b6974ff25","absentOptional":[]} -->

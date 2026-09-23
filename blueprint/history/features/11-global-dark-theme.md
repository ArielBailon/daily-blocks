# Feature: Global dark theme

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/global-dark-theme
**Status:** verified

## Goal

The whole app switches to the dark palette of the design reference:
- a near-black warm background and cards with a subtle border;
- a terracotta accent;
- serif headings and sans body text.

Every existing screen (Hoy, Plantillas, Historial) renders correctly and
readably in it. Native controls also render dark: date and time pickers,
checkboxes, and scrollbars.

## Design reference

- [blueprint/reference/planificacion-por-bloques.png](../reference/planificacion-por-bloques.png)
- This feature takes only the palette, typography, and native-control look
  from it. The block layout itself is feature 13.

## In scope

- **Palette:** replace the cream palette in `src/app/globals.css` with dark
  tokens, keeping the token names so the existing classes keep working. Add
  two new tokens:
  - `surface`: the card background.
  - `accent-foreground`: text on accent fills.
- **`color-scheme: dark`** on `:root`, so the browser renders form controls,
  pickers, and scrollbars dark.
- **Typography:**
  - Body text uses Tailwind's default sans stack. Remove the
    `--font-sans: var(--font-serif)` override.
  - `h1`–`h3` use the serif font through one base rule.
  - Keep `next/font` Lora as `--font-serif`.
- **Accent fills:** the three accent-filled controls switch from
  `text-background` to `text-accent-foreground`:
  - `AddDailyTaskForm` "Añadir".
  - `TemplateForm` "Guardar".
  - The selected weekday toggle in `TemplateForm`.

## Out of scope

- Any layout change, and the block grid, boxed inputs, and side panel. Those
  are 13 and 14. Existing screens keep their current structure and just take
  the new palette.
- Restyling the template screens beyond the token swap. They're removed in 16.
- A light/dark toggle, or following the OS preference. The plan says dark
  across the whole app.

## Build loop

Config: `workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`.
Implement all steps in order, keep the project working after each one, and
present one review packet at the end. No checkpoint commits. `/complete`
makes the final feature commit.

## Build steps

- [x] **1. Dark tokens, color scheme, and fonts.** In `src/app/globals.css`:

      ```css
      :root {
        color-scheme: dark;
        --background: #171411;        /* page */
        --surface: #1d1a16;           /* cards, grid */
        --foreground: #ece6dc;        /* primary text */
        --muted: #2f2a24;             /* borders, dividers */
        --accent: #e0875c;            /* terracotta */
        --accent-foreground: #1a1410; /* text on accent fills */
      }
      @theme inline {
        --color-background: var(--background);
        --color-surface: var(--surface);
        --color-foreground: var(--foreground);
        --color-muted: var(--muted);
        --color-accent: var(--accent);
        --color-accent-foreground: var(--accent-foreground);
        --font-serif: var(--font-serif);
      }
      @layer base {
        h1, h2, h3 { font-family: var(--font-serif), Georgia, serif; }
      }
      ```

      - Remove the `--font-sans` override.
      - Keep the existing `body` background/color rule and the cursor rules.
      - The hex values are estimated from the reference image. Before
        finalizing, sample the reference PNG's page background, grid
        background, border, primary text, and "Generar día" button colors,
        and use the sampled values if they differ by more than a few units.
        Record the final values in this spec's Data / contracts.
      - If `--font-serif` inside `@theme` resolves circularly, because
        `next/font` already defines `--font-serif` on `<html>`, drop that
        line and rely on the base rule. `var(--font-serif)` still works there.

      *Done when:*
      - `npm run lint` and `npm run build` pass.
      - The compiled CSS contains `color-scheme:dark`, the new token values,
        and the `h1`–`h3` serif rule.
      - With `npm run dev`, `/`, `/plantillas`, and `/historial`:
        - render on the dark background;
        - show body text in a sans font and headings in Lora;
        - show dark native date/time pickers and checkboxes.

- [x] **2. Readable accent fills.** Replace `text-background` with
      `text-accent-foreground` on the three accent-filled controls listed in
      scope. Leave every other class alone.
      *Done when:*
      - `npm run lint` and `npm run build` pass.
      - `grep -rn "text-background" src` returns nothing.
      - With `npm run dev`, "Añadir", "Guardar", and a selected weekday show
        dark text on the terracotta fill. Hover (`bg-accent/85`) and disabled
        states still read.

## Files / areas

- `src/app/globals.css`: tokens, `color-scheme`, font rules.
- `src/components/hoy/AddDailyTaskForm.tsx`, `src/components/plantillas/TemplateForm.tsx`:
  `text-background` → `text-accent-foreground`.
- `src/app/layout.tsx`: unchanged. Lora keeps its `--font-serif` variable.

## Data / contracts

- **Final values** (sampled from the reference PNG during implementation):
  - `--background` `#171512`
  - `--surface` `#1c1a16`
  - `--foreground` `#ece7e0`
  - `--muted` `#34302a`
  - `--accent` `#e08654`
  - `--accent-foreground` `#1a1410` (chosen for contrast, not sampled)

  The reference's side panel is `#241f18` and its controls are `#201d19`.
  Those are for features 13 and 14 if needed.
- **Tokens** (names stable, values dark). Components use them as Tailwind
  colors: `bg-background`, `bg-surface`, `text-foreground`, `border-muted`,
  `text-accent`, `bg-accent`, `text-accent-foreground`.
  - `--muted` stays the border/divider color, as it's used today.
  - Muted *text* keeps using `text-foreground/70`.
- **Contrast** (WCAG AA, 4.5:1 for body text):
  - `--foreground` on `--background` is about 15:1.
  - `--foreground` at 70% opacity is about 8:1.
  - `--accent` text on `--background` is about 6.9:1.
  - `--accent-foreground` on `--accent` is about 6.7:1.
  - The reference shows **white** text on the orange button. That's only
    about 2.7:1 and fails AA, so this spec uses dark text on accent fills
    instead. See Open questions.
- No data, routes, or behavior change.

## Testing

- No test runner and no Verify command are configured. The gates are
  `npm run lint` and `npm run build`, a compiled-CSS check, and a visual check
  on a dev server (desktop and a ~375 px viewport).
- No browser harness is configured.

## Notes for the AI

- Tailwind v4 is CSS-first: tokens live in `globals.css` (`@theme inline`),
  and there's no `tailwind.config.js`.
- `color-scheme: dark` is what makes `<input type="date|time">` and checkboxes
  match the reference's dark pickers. Don't hand-style them in this feature.
- Keep `accent-accent` on checkboxes. With the dark scheme, the checked fill
  becomes the terracotta accent.

## Open questions

- **Text on accent buttons:** the spec uses dark text (`#1a1410`, about 6.7:1)
  instead of the reference's white text (about 2.7:1), for readability. If
  you prefer white, the alternative is a darker accent. Even the current
  `#b3583d` only reaches about 4.4:1 with white, so it would change the
  orange noticeably. This doesn't block implementation, because it's one
  token value.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7381,"specSha256":"244c40bcbf65a741f70edc9ecd47436bd8e35e5573b1bf45074ac4488dbc0bdf","branch":"refs/heads/feature/global-dark-theme","head":"8ad5cc7c733effae7a84cb9b458ca23dc5a8ccb9","baseRef":"refs/heads/master","baseCommit":"8ad5cc7c733effae7a84cb9b458ca23dc5a8ccb9","sourceTree":"cf6249e3203925f14254e885b06b4deb901a9898","absentOptional":[]} -->

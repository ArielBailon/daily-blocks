# Fix: Button hover affordances and Hoy empty-state copy

**Type:** Fix
**Status:** verified
**Branch:** fix/button-hover-affordances-and-hoy-empty-state-copy

## The problem

1. **No pointer cursor on buttons.** Tailwind v4's preflight resets
   `<button>` to `cursor: default`, and `src/app/globals.css` doesn't
   restore it. Every `<button>` in the app shows the arrow cursor on hover.
   Several also have no visual hover state at all:
   - `AddDailyTaskForm.tsx:90`: "Añadir", the accent-filled button.
   - `TemplateForm.tsx:166`: the weekday toggles.
   - `TemplateForm.tsx:232` and `:241`: the ↑ and ↓ buttons.
   - `TemplateForm.tsx:261`: "Añadir tarea".
   - `TemplateForm.tsx:270`: "Guardar", the accent-filled button.
   - `plantillas/page.tsx:39` and `:55`: the "Nueva plantilla" link and the
     template rows. They get a pointer as links, but have no hover color.

   The checkboxes in "Hoy" also show the arrow cursor.

2. **Unwanted copy in "Hoy".** When no plan exists for today,
   `src/app/page.tsx` shows "No hay ninguna plantilla para hoy. Asigna una
   recurrencia… o añade una tarea a mano." The user wants it removed.

## The fix

**Pointer cursor, globally.** Add one base rule to `src/app/globals.css`, so
every current and future button gets it without per-component classes:

```css
@layer base {
  button:not(:disabled),
  [role="button"]:not([aria-disabled="true"]),
  input[type="checkbox"]:not(:disabled),
  label:has(> input[type="checkbox"]:not(:disabled)) {
    cursor: pointer;
  }
  button:disabled,
  input[type="checkbox"]:disabled {
    cursor: not-allowed;
  }
}
```

**Hover color, per control.** Use Tailwind classes with a short
`transition-colors` and the existing palette tokens only (`accent`,
`foreground`, `muted`). No new colors.

| Control | Hover effect |
|---|---|
| Accent-filled buttons ("Añadir", "Guardar") | `hover:bg-accent/85` (slightly lighter terracotta). No change while disabled: use `enabled:hover:` |
| Weekday toggle, unselected | `hover:border-accent hover:text-accent` |
| Weekday toggle, selected | `hover:bg-accent/85` |
| ↑ / ↓ arrows | `enabled:hover:text-accent` |
| "Añadir tarea" text button, "Nueva plantilla" link | `hover:underline underline-offset-4` |
| Template row title (`plantillas/page.tsx:55`) | `hover:text-accent` on the name |
| ✕ and "Eliminar" (already `hover:text-accent`) | Add `transition-colors` only |
| NavBar links (already have hover) | Unchanged |

**Copy.** In `src/app/page.tsx`, the `!plan` branch renders nothing: no
paragraph. The add form below still shows, so the user can still start a day
by hand. The "El plan de hoy no tiene tareas." line for an existing empty plan
stays.

**Must not break:**

- Disabled states still look disabled (`disabled:opacity-*`) and don't show a
  hover color.
- Checkbox toggling, the add and remove flows, and the template form behavior
  all stay the same. This fix changes classes and CSS only, plus removing one
  paragraph.

## Build steps

- [x] **1. Global cursor rule, hover classes, and copy removal.** Apply the
      table above and the `globals.css` rule, and remove the `!plan`
      paragraph.
      *Done when:*
      - `npm run lint` and `npm run build` pass.
      - With `npm run dev`, hovering any enabled button or checkbox shows the
        pointer, and each control in the table shows its hover effect.
      - Disabled buttons show `not-allowed` with no color change.
      - On a day with no template, "Hoy" shows only the heading and the add
        form.

## Verify

- Run `npm run dev` and hover each control on `/`, `/plantillas`,
  `/plantillas/nueva`, and a template edit page.
- Check on a narrow viewport too. Hover doesn't exist on touch, so nothing
  should look stuck after a tap: Tailwind v4's `hover:` only applies on
  devices that support hover.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3845,"specSha256":"12e48ad09f204ef0f2da703ae69022ad7f45a32a5bca2acc37ac806f0c19890f","branch":"refs/heads/fix/button-hover-affordances-and-hoy-empty-state-copy","head":"21589c0a2164ce980ba151c70c5be88accde2825","baseRef":"refs/heads/master","baseCommit":"21589c0a2164ce980ba151c70c5be88accde2825","sourceTree":"89072da072aba2605490ee6e791c689db66d1b60","absentOptional":[]} -->

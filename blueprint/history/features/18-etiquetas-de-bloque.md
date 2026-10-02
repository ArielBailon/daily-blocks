# Feature: Etiquetas de bloque

**From build-plan:** feature 18
**Build attempt:** 1
**Status:** verified
**Branch:** feature/etiquetas-de-bloque

## Goal

Cada bloque puede llevar una etiqueta opcional del Winter Arc (`DEEP`,
`LINKEDIN`, `GYM`, `WALK`, `PROTEIN`, `APPLY`, `INTERVIEW`, `SCREENS_OFF`,
`BED`). En "Hoy" se elige con un selector compacto que se guarda solo, por el
mismo PATCH del bloque. En Historial se ve en solo lectura. Es la base de datos
que leerán los features 19–21. La migración es aditiva: los bloques existentes
quedan sin etiqueta.

## In scope

- Enum `BlockTag` en Prisma y columna `Block.tag BlockTag?` (nullable, sin
  default), con migración `block_tags` creada con `prisma migrate dev`.
- Una sola lista de etiquetas en código: `src/lib/block-tags.ts` exporta
  `BLOCK_TAGS` (tupla `as const`, en el orden del enum), el tipo `BlockTag` y
  `BLOCK_TAG_LABELS` (etiqueta visible corta en español). Los componentes
  cliente importan de aquí, no del cliente Prisma generado.
- Etiquetas visibles (un detalle de UI reversible, elegido aquí):
  `DEEP` "Deep", `LINKEDIN` "LinkedIn", `GYM` "Gym", `WALK` "Caminata",
  `PROTEIN` "Proteína", `APPLY` "Postular", `INTERVIEW` "Entrevista",
  `SCREENS_OFF` "Pantallas", `BED` "Cama".
- `blockUpdateInput` acepta `tag`: uno de `BLOCK_TAGS` o `null` (quitar la
  etiqueta). El refine de "No hay cambios que guardar" cuenta `tag` como
  cambio.
- `PATCH /api/days/[date]/blocks/[id]` guarda `tag` con las mismas reglas que
  `activity`: hoy o futuro, plan no cerrado (409 si está cerrado, 404 si el
  bloque no existe). A diferencia de `completed`, se puede etiquetar un día
  futuro. La respuesta incluye `tag`.
- `POST /api/days/[date]/generate` incluye `tag` en cada bloque de la
  respuesta.
- `generateDay`: un bloque con etiqueta cuenta como "con contenido". Si queda
  fuera del nuevo rango, se pide confirmación antes de borrarlo, igual que un
  bloque con texto o check.
- `BlockRow` (Hoy): un `<select>` nativo compacto, ubicado en la columna de la
  hora debajo de la hora. Opciones: "—" (sin etiqueta) y las nueve
  etiquetas. Al cambiarlo se guarda de inmediato por la misma cola de
  guardado que el checkbox. Si el guardado falla, vuelve al último valor
  confirmado y muestra el mensaje de error de la fila (el `role="alert"`
  existente). Tiene `aria-label="Etiqueta HH:MM"`.
- Indicador sutil: sin etiqueta, el selector se ve como un "—" atenuado. Con
  etiqueta, se ve el nombre corto en texto pequeño con el color de acento. No
  hay colores por etiqueta.
- Historial: la columna de la hora muestra debajo el nombre corto de la
  etiqueta como texto (sin control). Sin etiqueta no muestra nada.
- Pedido durante la revisión: las filas en punto (`:00`) llevan un fondo apenas más claro (`bg-foreground/[0.025]`) en Hoy y en Historial, y las opciones del selector tienen fondo y texto del tema para que la lista nativa se lea en Chrome/Windows.
- Pedido durante la revisión: el encabezado de Hoy pasa a ser solo el título "Daily Blocks" (sin la descripción).
- Mobile-first: la fila no gana columnas nuevas, así que el campo de actividad
  no se angosta en el celular.

## Out of scope

- Bloques por defecto con etiqueta y el cambio del rango por defecto (feature
  19).
- Reglas, estado del día, racha y la vista `/arc` (feature 20).
- La API de lectura `GET /api/days` y `/api/arc/stats` (feature 21).
- Etiquetar días cerrados: siguen siendo inmutables.
- Colores por etiqueta, filtros o búsqueda por etiqueta.

## Build loop

Según `blueprint/config.json` (`stepReview: "feature"`,
`checkpointCommits: "disabled"`): implementar todos los pasos y presentar un
solo paquete de revisión al final, sin commits intermedios. `/complete` crea
el commit del feature.

## Build steps

- [x] 1. Esquema, migración y contrato del PATCH.
  - Antes de migrar, confirmar a qué base apunta `DATABASE_URL` en `.env`. Si
    no es claramente la base local o de desarrollo que se usó en las
    migraciones anteriores, detenerse y preguntar.
  - Agregar `enum BlockTag` y `tag BlockTag?` a `Block` en
    `prisma/schema.prisma`. Correr `npx prisma migrate dev --config
    prisma7.config.ts --name block_tags`. Nunca `migrate reset` ni `db push`.
    Si `migrate dev` quiere resetear, detenerse y avisar.
  - Crear `src/lib/block-tags.ts`. Extender `blockUpdateInput` con `tag`.
  - Actualizar el PATCH (guardar y devolver `tag`), la respuesta de
    `generate` (devolver `tag`) y la regla de "con contenido" en
    `generateDay`.

  *Done when:*
  - `prisma/migrations/<timestamp>_block_tags/migration.sql` solo crea el
    enum y agrega una columna nullable. No toca otras columnas ni datos.
  - `npx prisma migrate status --config prisma7.config.ts` dice que está al
    día.
  - Con el dev server: un PATCH `{ "tag": "DEEP" }` a un bloque de hoy
    devuelve 200 con `tag: "DEEP"`; `{ "tag": null }` lo quita; `{ "tag":
    "FOO" }` devuelve 400 con un mensaje en español; `{}` sigue devolviendo
    "No hay cambios que guardar"; un bloque de un día futuro acepta `tag`
    pero sigue rechazando `completed`.
  - Un bloque que solo tiene etiqueta, fuera del nuevo rango, hace que
    "Generar día" pida confirmación.
  - `npm run lint` y `npm run build` pasan.

- [x] 2. Selector en Hoy e indicador en Historial.
  - `BlockRow` recibe `initialTag`, agrega el selector a la cola de guardado
    (`BlockFields` gana `tag`, `confirmed` guarda `tag`) y revierte si falla.
  - `src/app/page.tsx` pasa `block.tag`. `src/app/historial/page.tsx` muestra
    el nombre corto debajo de la hora.

  *Done when:*
  - En el navegador, con un viewport de celular (unos 390 px de ancho):
    elegir una etiqueta en Hoy, recargar y que siga ahí; quitarla con "—" y
    que desaparezca al recargar; la fila mantiene el campo de actividad usable
    sin scroll horizontal.
  - En un día futuro se puede etiquetar y el checkbox sigue deshabilitado.
  - Un día pasado con etiquetas (preparado con una fecha de prueba o datos
    reales) muestra el nombre corto en Historial sin control editable.
  - El selector se puede usar con teclado y tiene nombre accesible.
  - `npm run lint` y `npm run build` pasan.

## Files / areas

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_block_tags/`
- `src/lib/block-tags.ts` (nuevo)
- `src/lib/validation/day.ts`
- `src/lib/daily-plan.ts` (regla de "con contenido" en `generateDay`)
- `src/app/api/days/[date]/blocks/[id]/route.ts`
- `src/app/api/days/[date]/generate/route.ts`
- `src/components/hoy/BlockRow.tsx`
- `src/app/page.tsx`
- `src/app/historial/page.tsx`

## Data / contracts

- **Persistencia:** `Block.tag` es un enum de Postgres `BlockTag` nullable.
  `null` significa "sin etiqueta". Las filas existentes quedan en `null`.
  Agregar un valor al enum en el futuro requiere una migración.
- **PATCH `/api/days/[date]/blocks/[id]`:** el body acepta
  `{ activity?: string, completed?: boolean, tag?: BlockTag | null }`, con al
  menos un campo. La respuesta 200 es
  `{ id, startTime, activity, completed, tag }`. Los errores no cambian:
  400 (fecha, JSON, validación o `completed` en un día futuro), 404, 409 y
  500, siempre con `{ error }` en español.
- **POST `/api/days/[date]/generate`:** cada bloque de la respuesta gana
  `tag`.
- **Contenido de un bloque** (para la confirmación de borrado):
  `activity !== "" || completed || tag !== null`.

## Testing

No hay test runner configurado: `AGENTS.md` no declara un comando de test ni
`Verify`. La lógica nueva es solo validación y wiring, así que la evidencia es
la siguiente:
- respuestas reales del PATCH con el dev server;
- capturas del navegador en un viewport de celular;
- `npm run lint` y `npm run build`.

El test runner se decidió para antes del feature 20, con `/tests`. No se agrega
aquí.

## Notes for the AI

- Leer la guía de Next en `node_modules/next/dist/docs/` antes de tocar
  rutas o páginas si algo no coincide con lo esperado.
- La lista de `src/lib/block-tags.ts` debe coincidir exactamente con el enum
  de Prisma. Tipar el objeto de datos del PATCH de forma que TypeScript avise
  si divergen (por ejemplo, asignándolo al tipo de input de Prisma).
- `BLOCK_TAG_LABELS` se renderiza como texto de React (escapado). No hay
  texto del usuario nuevo.
- La etiqueta no tacha ni atenúa nada: el tachado sigue dependiendo solo de
  `completed`.
- Decisiones del usuario para los features siguientes (se registran aquí
  para no perderlas; no se implementan en este feature):
  - `ARC_START = "2026-10-03"`.
  - `WALKS_PER_WEEK = 3`.
  - Rango por defecto de 06:30–22:00 todos los días, también el domingo.
  - R1: un tramo DEEP de ≥6 bloques cuenta como 2 tramos de 90 min.
  - Un día pasado dentro del arco sin plan cuenta como rojo. El gris queda
    solo para hoy, días futuros y días antes del arco.
  - Racha: cuentan los días verdes y amarillos. Un rojo aislado no suma ni
    corta. Dos rojos seguidos la reinician. Hoy pendiente no la corta.
  - R2 y R4 se evalúan solo en semanas completas.
  - `/tests` (Vitest) se corre antes del feature 20.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9120,"specSha256":"9b1554f3ea83391d45f2d87d22e7e943837c3dfa2454ffacc4ae1d1c34f5a9cc","branch":"refs/heads/feature/etiquetas-de-bloque","head":"753b6b3d6eb61b97dfc7a72d9cd2b70001416bc7","baseRef":"refs/heads/master","baseCommit":"753b6b3d6eb61b97dfc7a72d9cd2b70001416bc7","sourceTree":"b1d0a32b02275871beb178952faa9034afecb121","absentOptional":[]} -->

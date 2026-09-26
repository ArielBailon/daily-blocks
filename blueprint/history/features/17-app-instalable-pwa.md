# Feature: App instalable (PWA)

**From build-plan:** feature 17
**Build attempt:** 1
**Status:** verified
**Branch:** feature/app-instalable-pwa

## Goal

Make daily-blocks installable on the phone: it gets a home-screen icon and opens
full screen with no browser bar, using the existing dark theme. With no
connection, a page load shows a simple "Sin conexión" screen instead of the
browser's error page. There is no offline reading or editing.

## In scope

- Web app manifest through Next's `src/app/manifest.ts` convention: name, short
  name, description, `start_url: "/"`, `display: "standalone"`, and background
  and theme colors from the theme tokens (`--background` `#171512`, accent
  `#e08654`).
- App icons generated with the built-in `ImageResponse` (`next/og`): 192×192
  and 512×512 PNGs for the manifest, plus a 180×180 `apple-icon` for iOS. The
  design is simple: a terracotta rounded square on the dark background, with a
  small grid of blocks or a serif "d". The artwork can be changed later.
- iOS metadata in `layout.tsx`: `appleWebApp` (capable, title, status bar
  style) and a `viewport` export with `themeColor`.
- A minimal service worker at `public/sw.js`. On install it caches only
  `/offline.html`, and on activate it deletes old caches. It intercepts only
  navigation requests (`request.mode === "navigate"`): it tries the network
  first and serves `/offline.html` only when the network fails.
- `public/offline.html`: a standalone static page in the dark theme with the
  "Sin conexión" message and a "Reintentar" button that reloads the page.
- A small client component that registers `/sw.js` (scope `/`,
  `updateViaCache: "none"`), rendered from the root layout.
- A `headers()` entry in `next.config.ts` for `/sw.js`: `Cache-Control:
  no-cache, no-store, must-revalidate` and a JavaScript `Content-Type`, as the
  Next PWA guide recommends, so updates to the worker are picked up.

## Out of scope

- Offline reading or editing, caching API responses or pages, and background
  sync.
- Push notifications, an in-app "Install" button or custom
  `beforeinstallprompt` UI, and iOS splash screens (`startupImage`).
- Global security headers, and any PWA library (`next-pwa`, Serwist, Workbox).
- Replacing `src/app/favicon.ico`. It stays as it is.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet at the end. `checkpointCommits` is `disabled`: no commits between steps.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Manifest and icons.** Add `src/app/icon.tsx`, using
      `generateImageMetadata` to produce ids for 192 and 512, and
      `src/app/apple-icon.tsx` (180). Add `src/app/manifest.ts` pointing at the
      generated icon URLs. First confirm the exact URL each generated icon is
      served at (run `npm run build` and read the route output, or open it in
      dev) before hard-coding it in the manifest.
      **Done when:** `/manifest.webmanifest` returns the manifest JSON, each
      icon URL in it returns a PNG of the stated size, `<head>` contains the
      manifest and apple-touch-icon links, and `npm run lint` and
      `npm run build` pass.
- [x] **2. iOS metadata and theme color.** Add `appleWebApp` to the root
      `metadata` and a `viewport` export with `themeColor: "#171512"` in
      `src/app/layout.tsx`.
      **Done when:** the rendered `<head>` includes
      `apple-mobile-web-app-capable`, the apple title and status bar tags, and
      `<meta name="theme-color">`, and the build passes.
- [x] **3. Service worker, offline page, and registration.** Add
      `public/sw.js` and `public/offline.html`, add
      `src/components/pwa/ServiceWorkerRegister.tsx` (`"use client"`, registers
      in `useEffect` only when `"serviceWorker" in navigator`, and ignores
      registration failure with a `console.error`), render it in the layout,
      and add the `/sw.js` headers in `next.config.ts`.
      **Done when:** in a browser on localhost (dev or `npm run start`), the
      worker is registered and active with scope `/`; with the network set to
      offline in DevTools, reloading `/` or `/historial` shows "Sin conexión";
      after going back online, "Reintentar" loads the real page; with the
      network online, pages and saves behave as before (the worker does not
      touch API `fetch` calls); `/sw.js` responds with the no-cache header;
      lint and build pass.
- [x] **4. Installability check.** Run `npm run build && npm run start` and
      inspect DevTools → Application → Manifest (or Lighthouse's PWA /
      installability checks, if available).
      **Done when:** the manifest shows no errors, the icons render, and the
      browser reports the app as installable. The real install on the phone
      (Android and iOS) happens after deploying to Vercel over HTTPS; it is
      listed as manual evidence in Testing and is not claimed here.

## Files / areas

- `src/app/manifest.ts` (new)
- `src/app/icon.tsx`, `src/app/apple-icon.tsx` (new)
- `src/app/layout.tsx`: `metadata.appleWebApp`, `viewport` export, and
  rendering `<ServiceWorkerRegister />`
- `src/components/pwa/ServiceWorkerRegister.tsx` (new)
- `public/sw.js`, `public/offline.html` (new; the `public/` folder does not
  exist yet)
- `next.config.ts`: `headers()` for `/sw.js`

## Data / contracts

- There are no database, API, or Prisma changes.
- Manifest: `name: "daily-blocks"`, `short_name: "daily-blocks"`, description
  taken from the current layout metadata ("Planificación diaria por bloques de
  tiempo"), `start_url: "/"`, `display: "standalone"`,
  `background_color: "#171512"`, `theme_color: "#171512"`, and icons 192 and
  512 as `image/png` with `purpose: "any"`.
- Service worker cache: one versioned cache name (for example
  `daily-blocks-offline-v1`) holding only `/offline.html`. Bumping the version
  in `sw.js` replaces it on activate. Non-navigation requests are not
  intercepted (no `respondWith`), so `/api/**` always goes to the network.

## Testing

- There is no unit test runner or Browser tests command, so no automated tests
  are added. The logic is trivial and mostly declarative.
- Evidence for Check: `npm run lint`; `npm run build` (shows the manifest and
  icon routes); requests to `/manifest.webmanifest`, the icon URLs, and
  `/sw.js` (headers); a browser on localhost with DevTools Application and
  offline mode for steps 3 and 4.
- Manual, after deploying (not verifiable locally): install from Chrome on
  Android and from Safari on iOS ("Añadir a pantalla de inicio"), and confirm it
  opens full screen with the icon and the dark status bar.

## Notes for the AI

- Read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`,
  `.../03-api-reference/03-file-conventions/01-metadata/manifest.md`,
  `app-icons.md`, `generate-image-metadata.md`, and `generate-viewport.md`
  before writing code. This Next version (16.3) may differ from what you
  remember.
- `ImageResponse` uses the `style` prop (Satori). This is a documented
  exception to the "no inline styles" standard, which applies to React UI with
  Tailwind.
- `public/offline.html` is served as a static file, outside the Next build, so
  it cannot use Tailwind. Use a `<style>` block with the theme hex values, a
  system serif font, and no external resources, because it must work with no
  network.
- Do not enable `experimental.useOffline`, `cacheComponents`, or other
  experimental flags. They are outside this feature's scope.
- Keep `sw.js` short and commented. Do not add precaching of Next chunks.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7601,"specSha256":"f603b59ae56a6a1cf70bf6bed5200552c5d43977546a356cd913592fc4b987b2","branch":"refs/heads/feature/app-instalable-pwa","head":"cd2acb7449adeca1860493ec8015457c1b590af3","baseRef":"refs/heads/master","baseCommit":"cd2acb7449adeca1860493ec8015457c1b590af3","sourceTree":"2c3af5fd3548d0b9b3ddb25caea54e568e560728","absentOptional":[]} -->

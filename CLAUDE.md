# MangaReader

Offline reader for local CBZ/CBR files, shipped as an **Android app (APK)** via Capacitor. It is a reader only: no scrapers, no downloads, no backend, no accounts, no telemetry. Files never leave the device.

## Stack

- React 19 + TypeScript 6 (strict) + Vite 8, rendered inside Capacitor 8 (Android WebView). No web deployment and no PWA.
- State: Zustand (UI state only). Persistence: IndexedDB via `idb` (metadata, covers, progress, settings) and OPFS (copied comic files).
- Archives: `@zip.js/zip.js` (CBZ, random access) and `node-unrar-js` (CBR, WASM), both inside one Web Worker exposed with Comlink.
- i18n: `i18next` + `react-i18next` (EN/ES, `src/i18n/locales`).
- Tests: Vitest + Testing Library + happy-dom (+ `fake-indexeddb`). Lint: ESLint 9 flat config (typescript-eslint, react-hooks, jsx-a11y) + Prettier.
- Version pins: TypeScript stays on 6.0.x (typescript-eslint does not support 7) and ESLint on 9 (jsx-a11y does not support 10).

## Commands

| Command                                   | Purpose                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                             | Vite dev server (use Chrome DevTools device emulation) |
| `npm run build`                           | Typecheck + production build into `dist/`              |
| `npm run typecheck`                       | `tsc -b --noEmit`                                      |
| `npm test` / `npm run test:watch`         | Vitest (single run / watch)                            |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                 |
| `npm run format` / `npm run format:check` | Prettier                                               |
| `npm run android:sync`                    | Build web + copy into `android/`                       |
| `npm run android:run`                     | Build, sync and run on a connected device/emulator     |
| `npm run android:open`                    | Open `android/` in Android Studio                      |

Android builds need JDK 21 + Android SDK (bundled with Android Studio). CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests and build, then assembles a debug APK and uploads it as an artifact.

## Architecture (DDD / Clean Architecture)

```
src/
  modules/{archive,library,reading,settings}/
    domain/          entities, value objects, repository interfaces (no external deps)
    application/     use cases + factory.ts (composes repositories, exposes use cases)
    infrastructure/  concrete repositories (Idb*, Opfs*, ZipJs*, Unrar*, Worker*)
    test/            application/, domain/, infrastructure/, helpers/ (*Mother.ts), fixtures/
  shared/            cross-module infrastructure (idb database, native bridges)
  components/        React UI (outside modules, no business rules)
  hooks/             React hooks (outside modules, no business rules)
  stores/            Zustand stores (UI state, call factories)
  i18n/              i18next setup + locales
  app/               entry point, router, root layout
  __tests__/         component and hook tests
android/             Capacitor native project (committed); local plugins in app/src/main/java/com/mangareader/app
```

## Conventions

- Code, comments and commit messages in English. All user-facing strings go through i18n (EN + ES), never hardcoded.
- Dependencies point inwards: domain ← application ← infrastructure. Components/hooks/stores call factories, never repositories directly.
- Entities/VOs: private constructor, `static create` (validates), `fromPrimitive(data: XPrimitive)`, `toPrimitive(): XPrimitive`, `equals`, immutable updates. Declare the `XPrimitive` interface in the same file.
- Classes that talk to external systems (IndexedDB, OPFS, worker, archives) are named `*Repository`; the interface lives in `domain/`, implementations are prefixed by technology (`IdbComicRepository`).
- Use cases: one operation each, dependencies injected via a props object, throw `Error('[useCaseName] message')`. User-facing errors use typed error codes mapped to i18n keys.
- Tests: Object Mother functions in `test/helpers/*Mother.ts`, repository mocks via `*RepositoryMother` with `vi.fn()`. Use semantic queries (`getByRole`, `getByLabelText`) and ARIA states; never assert CSS classes.
- Heavy work (unzip, unrar, XML parsing, thumbnails) runs in the archive Web Worker, never on the UI thread.
- Accessibility: keyboard reachable controls, ARIA labels on icon-only buttons, 44px touch targets, WCAG AA contrast via the CSS tokens in `src/styles/global.css`.
- Styling: CSS Modules + CSS custom properties; theme via `data-theme` on `<html>` (absent = follow system).
- Privacy: no network calls. CSP in `index.html` restricts connections to `'self'`, `blob:` and the local dev server; Android backup is disabled so copied comics are never uploaded.

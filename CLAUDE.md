# MangaReader

Offline reader for local CBZ/CBR files, shipped as an **Android app (APK)** and an **iOS app** via Capacitor. It is a reader only: no scrapers, no downloads, no backend, no accounts, no telemetry. Files never leave the device.

## Stack

- React 19 + TypeScript 6 (strict) + Vite 8, rendered inside Capacitor 8 (Android WebView / iOS WKWebView), plus an installable web version (PWA via `vite-plugin-pwa`) on GitHub Pages.
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
| `npm run assets`                          | Regenerate launcher icons and splash screens           |
| `npm run ios:sync`                        | Build web + copy into `ios/` (Xcode project, SPM)      |

iOS: the Xcode project lives in `ios/App` (Swift Package Manager, iOS 17+ because the UI relies on popover, `@starting-style` and `linear()`). It can only be compiled on macOS: CI builds an **unsigned .ipa** on `macos-latest` (artifact `manga-reader-ios-unsigned-ipa`), which the owner signs and installs with Sideloadly and a free Apple ID (re-sign every 7 days). Platform differences live behind `src/shared/infrastructure/nativeSystemUi.ts` (Android `SystemUi` plugin vs iOS `@capacitor/status-bar`) and `useEdgeSwipeBack` (iOS edge-swipe back on pushed screens). If WKWebView cannot start the archive worker, `ResilientArchiveRepository` decodes on the main thread.

Android builds need **JDK 21** + Android SDK. Android Studio bundles a newer JBR (Java 25) that Gradle 8.14 rejects, so point `JAVA_HOME` (and Android Studio's Gradle JDK) to a JDK 21. CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests and build, then assembles a debug APK and uploads it as an artifact. On pushes to `main` it also deploys `dist/` to GitHub Pages (https://xggarcia.github.io/MangaReader/).

Web version: the same build, served from GitHub Pages. `src/shared/infrastructure/webApp.ts` registers the offline service worker **only on the web** (never inside Capacitor), detects the iOS home-screen web app (which also gets the edge-swipe back) and drives the one-time "Add to Home Screen" hint on iPhone/iPad. Comics still stay on the device (OPFS/IndexedDB of the browser); the service worker only caches the app shell.

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
- Heavy work (unzip, unrar, XML parsing, thumbnails, page recompression) runs in the archive Web Worker, never on the UI thread.
- Device files (Android only, `DeviceFilesPlugin.java` + `src/shared/infrastructure/deviceFiles.ts`): Storage Access Framework, no storage or network permission. A comics folder (`Settings.comicsFolder`, a SAF tree; Android refuses the Download root, so a sub-folder) is scanned for new comics and `.mangareader` exports. The "+" button uses `ACTION_OPEN_DOCUMENT` so originals can be deleted after import (`Settings.deleteOriginals`: never / afterReduce / always; shared files are never deleted). Files opened with or shared to the app arrive through intent filters (`filesReceived`). Files are read by copying them to the app cache and fetching `convertFileSrc` (Capacitor's local server does not handle Range requests correctly).
- Library export (`.mangareader`): a ZIP with `mangareader.json` (comics, progress, collections) first, then `covers/<id>` and `comics/<id>`. Written natively with deflate level 0 (streamable, read back with `ZipInputStream`) from chunks the page sends through an androidx.webkit `WebMessageListener` (`window.MangaReaderExport`, raw ArrayBuffers, ~5x faster than base64 over the plugin bridge, which stays as the fallback). Import skips comics already present (same id or same file), keeps the newer progress and merges collections by id or name. The web version imports exports with zip.js.
- Reduce size (`optimizeComic`): the worker rewrites a comic as a CBZ with pages renamed by position (`0001.webp`…) so page indexes, and thus progress, stay valid. `PageQuality` limits the shorter side of each page; the stored file is replaced only after the new archive is complete and has the same page count. `Comic.fileSize` keeps the imported size (duplicate detection) while `storedSize` is what the copy takes now.
- Accessibility: keyboard reachable controls, ARIA labels on icon-only buttons, 44px touch targets, WCAG AA contrast via the CSS tokens in `src/styles/global.css`.
- Styling: CSS Modules + CSS custom properties; theme via `data-theme` on `<html>` (absent = follow system).
- Privacy: no network calls (the web version only downloads its own app files). The Android manifest has **no INTERNET permission** (keep it that way), CSP in `index.html` restricts connections to `'self'`, `blob:` and the local dev server, and Android backup is disabled so copied comics are never uploaded.
- Native plugins: `@capacitor/app` (back button), `@capacitor-community/keep-awake` (screen on while reading) and the local `SystemUi` plugin (immersive mode).
- Manual testing without a phone: run the Android emulator, `adb install` the debug APK and inspect the WebView through `chrome://inspect` (debug builds enable WebView debugging).

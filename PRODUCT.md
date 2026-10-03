# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

A single owner (the developer) reading their own comic collection on their Android phone (Samsung). They read manga (right to left, single page), western comics (left to right, often two-page spreads) and webtoons/manhwa (long vertical strips), in short and long sessions, often one-handed and in low light.

## Product Purpose

MangaReader is an offline reader for comic archives (CBZ, CBR) the user already owns. It imports files from the device, keeps a private copy, shows them as a library with covers and progress, and offers a fast, distraction-free reader. Success: opening the app and getting back into the current volume in one tap, with page turns that feel instant and never stutter, even on 300+ page volumes.

## Positioning

A fully local reader with feature parity, where possible, with Panels (iOS): everything works offline, nothing leaves the device, and the Android build has no Internet permission at all.

## Operating Context

- Files arrive from the Android file picker (several at once), drag and drop in development, and later from "Share"/"Open with" intents.
- Reading happens full screen, immersive, with taps on the sides, swipes, pinch and double-tap zoom, and a page scrubber.
- The owner tests every milestone by installing a debug APK on the phone.

## Capabilities and Constraints

- Shipped: CBZ and CBR (incl. solid RAR), ComicInfo.xml metadata, library grid with search/sort/read status/progress, single, double and webtoon modes, RTL/LTR, fit modes, zoom, brightness, themes (system/light/dark), ES/EN, resume reading, keep screen on.
- Panels parity backlog (local features only): more formats (PDF, CB7, comic EPUB, CBT/TAR), panel-by-panel guided view (experimental detection), page thumbnails strip, image filters (sharpen, denoise, moiré reduction, margin cropping), collections/folders with color and cover, sort by progress, reading presets, extra themes, lock with biometrics/PIN, incognito mode, reading statistics and yearly recap, home screen widget.
- Out of scope (confirmed): cloud sync and storage (iCloud, Dropbox, OneDrive), OPDS/Komga/Kavita servers, downloads from any site, store, accounts, OCR/Live Text and translation.
- Technical: React + TypeScript + Vite inside Capacitor 8 (Android WebView), DDD module structure, IndexedDB + OPFS storage, archive work in a Web Worker.

## Brand Commitments

- Name: MangaReader.
- The owner explicitly asked for an iOS-style look and feel on Android: very clean, polished, with smooth animations.
- Accent color: magenta (current #C2185B), to be adapted to light and dark shades.
- Reference product: Panels – Comic Reader (iOS).

## Evidence on Hand

No real user content is bundled. Synthetic test archives (numbered pages) are generated for testing; real comics belong to the owner and are never committed.

## Product Principles

1. Reading comes first: the interface disappears while reading and returns on demand.
2. Instant feel: page turns, sheets and navigation must never stutter or show blank frames.
3. Local and private by construction: no network, no telemetry, no accounts.
4. One app for three reading styles: manga, western comics and webtoons each get a first-class mode.
5. Calm, tidy library: covers lead, chrome stays quiet.

## Accessibility & Inclusion

WCAG AA contrast, 44px minimum touch targets, full keyboard support in development, screen reader labels on icon-only controls, and reduced-motion support for every animation.

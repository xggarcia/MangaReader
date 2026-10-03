---
version: 1
slug: 'src-app-router-tsx'
primary_target: 'src/app/router.tsx'
related_targets: ['src/components', 'src/styles']
---

# App shell, library, reader and settings

Scope: whole app (Operate mode). Audience: the owner, one-handed on a Samsung phone, often in low light, reading manga, western comics and webtoons. Task: get back into the current volume in one tap, browse covers calmly, read without the UI in the way. Must stay untouched: every shipped function, the offline/no-network guarantee, ES/EN copy, Android system Back.

## Direction contract

THESIS: An iOS-native reading app on Android: content-first chrome that dissolves into translucent material, springs instead of fades, and a page that physically follows the finger. Refuses the Android-default flat app bar plus FAB and the web-app card grid.

OWN-WORLD: Apple HIG grammar. Grouped system backgrounds (light #F2F2F7 / dark #000 with #1C1C1E elevated), hairline separators, translucent bars with backdrop blur and saturation, large titles collapsing to inline on scroll, inset grouped lists, segmented controls, switches, sheets with grabbers, context menus that lift the cover. Magenta accent tuned per scheme (light #C2185B, dark #FF4F8B). Inter (self-hosted, SF-like metrics) with HIG type ramp. Lucide line icons at 1.75 stroke.

STORY: Open app, the large "Biblioteca" title sits above a quiet grid of covers with a "Continue reading" hero; tap a cover, it grows into the reader; drag pages with the finger; tap centre and blurred bars glide in; back slides home.

FIRST VIEWPORT: Large title 34pt left-aligned under the status bar, search field below, then the continue-reading card (cover + title + progress), then the cover grid; translucent tab bar at the bottom with four tabs (Library, Collections, Stats, Settings), magenta active tint.

FORM: Pinned by the brief (iOS Human Interface Guidelines look on Android, magenta accent); no concept roll, the brief-pinned direction beats the roll. Signature interaction: finger-tracking page pager with spring settle; second: cover-to-reader shared-element transition.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

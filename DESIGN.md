---
name: MangaReader
description: Offline CBZ/CBR reader for Android, dressed in Apple HIG grammar with a magenta accent.
colors:
  accent: '#c2185b'
  accent-pressed: '#a0124a'
  accent-tint: 'rgb(194 24 91 / 0.12)'
  accent-dark: '#ff4f8b'
  accent-pressed-dark: '#ff7aa6'
  accent-tint-dark: 'rgb(255 79 139 / 0.18)'
  label-on-accent: '#ffffff'
  label-on-accent-dark: '#1a0010'
  destructive: '#d70015'
  destructive-dark: '#ff453a'
  success: '#248a3d'
  success-dark: '#30d158'
  bg-grouped: '#f2f2f7'
  bg: '#ffffff'
  bg-elevated: '#ffffff'
  bg-elevated-2: '#f2f2f7'
  bg-sheet: '#f2f2f7'
  bg-sheet-card: '#ffffff'
  bg-grouped-dark: '#000000'
  bg-elevated-dark: '#1c1c1e'
  bg-elevated-2-dark: '#2c2c2e'
  bg-sheet-dark: '#1c1c1e'
  bg-sheet-card-dark: '#2c2c2e'
  bg-reader: '#000000'
  label: '#000000'
  label-secondary: 'rgb(60 60 67 / 0.78)'
  label-tertiary: 'rgb(60 60 67 / 0.45)'
  label-dark: '#ffffff'
  label-secondary-dark: 'rgb(235 235 245 / 0.64)'
  label-tertiary-dark: 'rgb(235 235 245 / 0.34)'
  fill: 'rgb(120 120 128 / 0.2)'
  fill-secondary: 'rgb(120 120 128 / 0.16)'
  fill-tertiary: 'rgb(118 118 128 / 0.12)'
  fill-dark: 'rgb(120 120 128 / 0.36)'
  fill-secondary-dark: 'rgb(120 120 128 / 0.32)'
  fill-tertiary-dark: 'rgb(118 118 128 / 0.24)'
  separator: 'rgb(60 60 67 / 0.29)'
  separator-opaque: '#c6c6c8'
  separator-dark: 'rgb(84 84 88 / 0.65)'
  separator-opaque-dark: '#38383a'
  material-bar: 'rgb(249 249 249 / 0.8)'
  material-thick: 'rgb(255 255 255 / 0.86)'
  material-bar-dark: 'rgb(22 22 23 / 0.8)'
  material-thick-dark: 'rgb(37 37 38 / 0.88)'
  material-reader: 'rgb(28 28 30 / 0.72)'
  dim: 'rgb(0 0 0 / 0.36)'
  dim-dark: 'rgb(0 0 0 / 0.5)'
typography:
  large-title:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '2.125rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.026em'
  title1:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.75rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.011em'
  title2:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.375rem'
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: '-0.02em'
  title3:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.017em'
  headline:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.011em'
  body:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: '-0.011em'
  callout:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.31
  subhead:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.33
  footnote:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.38
  caption:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.33
  caption2:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.6875rem'
    fontWeight: 500
    lineHeight: 1.18
    letterSpacing: '0.01em'
rounded:
  cover: '6px'
  sm: '8px'
  md: '10px'
  lg: '14px'
  sheet: '14px'
  pill-bar: '22px'
  pill-capsule: '16px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  gutter: '16px'
  nav-height: '44px'
  tab-height: '50px'
components:
  button-bar:
    backgroundColor: 'transparent'
    textColor: '{colors.accent}'
    rounded: '{rounded.pill-bar}'
    padding: '0 8px'
    height: '44px'
    width: '44px'
  button-filled:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.label-on-accent}'
    typography: '{typography.headline}'
    rounded: '{rounded.lg}'
    padding: '0 24px'
    height: '50px'
  button-filled-active:
    backgroundColor: '{colors.accent-pressed}'
  button-capsule:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.label-on-accent}'
    typography: '{typography.subhead}'
    rounded: '{rounded.pill-capsule}'
    padding: '0 16px'
    height: '32px'
  search-field:
    backgroundColor: '{colors.fill-tertiary}'
    textColor: '{colors.label}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0 34px'
    height: '38px'
  tab-bar:
    backgroundColor: '{colors.material-bar}'
    textColor: '{colors.label-secondary}'
    typography: '{typography.caption2}'
    height: '50px'
  tab-bar-active:
    textColor: '{colors.accent}'
  grouped-section:
    backgroundColor: '{colors.bg-elevated}'
    rounded: '{rounded.md}'
  grouped-row:
    textColor: '{colors.label}'
    typography: '{typography.body}'
    padding: '4px 16px'
    height: '48px'
  menu:
    backgroundColor: '{colors.material-thick}'
    textColor: '{colors.label}'
    rounded: '{rounded.lg}'
    width: '260px'
  menu-item:
    typography: '{typography.body}'
    padding: '0 16px 0 12px'
    height: '46px'
  sheet:
    backgroundColor: '{colors.bg-sheet}'
    textColor: '{colors.label}'
    rounded: '{rounded.sheet}'
    width: '600px'
  sheet-card:
    backgroundColor: '{colors.bg-sheet-card}'
    rounded: '{rounded.md}'
  action-sheet-group:
    backgroundColor: '{colors.material-thick}'
    textColor: '{colors.accent}'
    rounded: '{rounded.lg}'
    height: '57px'
  segmented-track:
    backgroundColor: '{colors.fill-tertiary}'
    rounded: '9px'
    padding: '2px'
  segmented-thumb:
    backgroundColor: '{colors.bg-elevated}'
    typography: '{typography.footnote}'
    rounded: '7px'
    height: '40px'
  comic-cover:
    backgroundColor: '{colors.fill-secondary}'
    rounded: '{rounded.cover}'
    width: '104px'
  continue-card:
    backgroundColor: '{colors.bg-elevated}'
    textColor: '{colors.label}'
    rounded: '{rounded.lg}'
    padding: '12px'
  reader-bar:
    backgroundColor: '{colors.material-reader}'
    textColor: '#ffffff'
    typography: '{typography.headline}'
    height: '44px'
  status-new:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.accent}'
    typography: '{typography.caption2}'
    rounded: '4px'
    padding: '1px 6px'
---

# Design System: MangaReader

## Overview

**Creative North Star: "Glass Over Paper"**

The comic page is the paper; everything else is glass laid over it. Chrome is translucent material that blurs and saturates whatever sits underneath, and it gets out of the way when reading starts. The grammar is Apple's Human Interface Guidelines, rendered faithfully on an Android WebView: grouped system backgrounds, hairline separators, large titles that collapse into an inline bar title, inset grouped lists, segmented controls, sheets with grabbers, and context menus that lift a cover off the shelf. It deliberately rejects the Android default of a flat app bar plus floating action button, and the web-app card grid.

Density is calm. The library leads with covers at 2:3 and keeps text small and secondary; settings read as native iOS grouped lists. Motion carries the physicality: springs rather than fades, a page track that follows the finger and settles like thrown paper, a cover that grows into the reader. One accent, magenta, tuned separately for light and dark, carries every interactive affordance.

Built from code in `src/styles/global.css` and `src/components/{ui,common,library,reader,settings}`. Where the direction contract and the build differ, this file follows the build.

**Key Characteristics:**

- Translucent material bars (`saturate(180%) blur(20px)`) over content; opaque only where content must not show through.
- One accent (magenta) for every tappable tint, progress fill and selection; never decorative.
- Hairline (0.5px) separators drawn with box-shadow or pseudo-elements, inset to the label.
- Springs (`linear()` spring curve) for press feedback and arrivals; the iOS sheet curve for slides.
- Reader is always black and always dark-scheme, independent of app theme.
- Every icon is a Lucide line icon; every overlay lives on the popover top layer.

## Colors

A neutral iOS system palette (grey grouped grounds, translucent labels and fills) with a single magenta voice that shifts lighter and pinker in dark mode.

### Primary

- **Magenta** (`accent`, light): bar buttons, active tab, filled and capsule buttons, progress fills, focus ring, caret, slider thumbs, the "New" badge text, Done buttons in sheets. 5.9:1 on white, 5.3:1 on the grouped grey.
- **Magenta Pressed** (`accent-pressed`): `:active` background of filled buttons.
- **Magenta Wash** (`accent-tint`): text selection, search focus halo (2px ring), "New" badge ground.
- **Neon Magenta** (`accent-dark`): the same roles in dark scheme (6.7:1 on black). Its pressed state goes lighter (`accent-pressed-dark`), not darker.
- **On-Accent** (`label-on-accent` white / `label-on-accent-dark` near-black `#1a0010`): text on magenta fills. Dark mode flips to dark text because the bright accent cannot carry white at AA.

### Semantic

- **Destructive** (`destructive` / `destructive-dark`): remove actions in menus and action sheets, import error icon.
- **Success** (`success` / `success-dark`): reserved for positive status.
- **Settings tile colours** (literal iOS system hues on 30px tiles: indigo `#5856d6`, orange `#ff9500`, green `#34c759`, blue `#007aff`, `#5e5ce6`): identify settings rows only, white glyph on top.
- **Collection tints** (provisional, collections are in progress): magenta `#c2185b` plus iOS red, orange, yellow, green, teal, blue, indigo, purple, graphite.

### Neutral

- **Grouped Grey** (`bg-grouped`, `#000` in dark): the page ground under every screen and the body background.
- **Elevated White** (`bg-elevated`, `#1c1c1e` in dark): grouped list cards, continue-reading card, import error card, segmented thumb.
- **Sheet Ground** (`bg-sheet` grey in light, `#1c1c1e` in dark) with **Sheet Card** (`bg-sheet-card`, `#2c2c2e` in dark): sheets sit on the grouped grey in light and lift to elevated grey in dark so their top edge stays visible against black.
- **Reader Black** (`bg-reader`): the reader canvas, both schemes.
- **Labels** (`label`, `label-secondary`, `label-tertiary`): primary text, metadata and section titles, placeholders/disabled/grabber.
- **Fills** (`fill`, `fill-secondary`, `fill-tertiary`): progress tracks, pressed rows, search field and segmented track.
- **Separators** (`separator`, `separator-opaque`): hairlines between rows, under collapsed bars, above the tab bar.
- **Materials** (`material-bar`, `material-thick`, `material-reader`): nav and tab bars; menus, action sheets and import HUD; reader chrome.
- **Dim** (`dim` / `dim-dark`): backdrop under sheets, action sheets and the context menu.

### Named Rules

**The One Voice Rule.** Magenta means "you can tap this" or "this is your progress". It never decorates a surface, a heading or an illustration.

**The Stronger Secondary Rule.** Secondary labels are deliberately stronger than stock iOS (0.78 alpha light, 0.64 dark) so metadata clears WCAG AA on every ground. Never drop back to iOS's 0.6. Tertiary labels are for placeholders that are not required reading, disabled controls and the grabber only.

**The Scoped Dark Rule.** Dark tokens apply three ways: system dark with no `data-theme`, `data-theme="dark"` on `<html>`, or `data-theme="dark"` on any subtree. Anything floating over the reader (the reading options sheet) is wrapped in `<div data-theme="dark" style="display: contents">` so it is dark even in light app theme. Components that hardcode a dark variant (segmented thumb `#636366`) must honour both selectors.

## Typography

**Display Font:** Inter Variable (self-hosted `@fontsource-variable/inter`, optical-size axis on), falling back to system-ui, -apple-system, Segoe UI, Roboto.
**Body Font:** the same family; there is no second face.

**Character:** One SF-like grotesque doing all the work through the HIG size ramp, with optical sizing and a slight global tightening (`-0.011em`) so it reads as native iOS text.

### Hierarchy

- **Large Title** (700, 34px, 1.2, -0.026em): one per tab root, left-aligned under the status bar; scrolls away and reappears as an inline Headline in the bar.
- **Title 1** (700, 28px): cover placeholder initial.
- **Title 2** (700, 22px, -0.02em): empty-state title.
- **Title 3** (600, 20px, -0.017em): in-page section headings ("Continue reading", "All comics"), sheet titles.
- **Headline** (600, 17px): inline nav title, reader title, filled buttons, sheet Done, card titles.
- **Body** (400, 17px): list rows, menu items, search input, action-sheet buttons (at 20px).
- **Subhead** (400, 15px): capsule button (600), counts, HUD text, menu header title (600).
- **Footnote** (400, 13px): grouped section titles (uppercase, 0.02em), footers, meta lines, segmented labels (500, 600 when selected), grid cell titles (600).
- **Caption** (400, 12px): grid subtitles, progress percent, reader page counter.
- **Caption 2** (500, 11px, 0.01em): tab labels, the uppercase "New" badge (0.04em).

### Named Rules

**The Tabular Numbers Rule.** Every changing number (page x of y, percentages, counts, import progress) uses `font-variant-numeric: tabular-nums` so it does not jitter.

**The Ramp-Only Rule.** Set type with the `--text-*` shorthand tokens; weight overrides are allowed, ad-hoc font sizes are not (the action-sheet 20px button is the single exception, matching iOS).

## Layout

Single column, phone-first, safe-area aware. Screen content sits inside a 16px gutter (`--gutter`) plus `env(safe-area-inset-*)` on each side. The navigation bar is 44px plus the top inset and sticky; the tab bar is 50px plus the bottom inset and fixed; tab screens pad their bottom by tab height + inset + 32px.

Spacing follows a 4px base: 4, 8, 12, 16, 20, 24, 32. Grouped sections are separated by 32px, a section title sits 8px above its card, in-page headings 12px above content.

The library grid is `repeat(auto-fill, minmax(104px, 1fr))` with 24px row and 16px column gaps (three columns on a typical phone), cells use `content-visibility: auto` for large libraries, and the status row is pinned to the cell bottom so it aligns across a row. Sheets cap at 600px wide and 88dvh tall; action sheets at 560px; menus at 260px (context menu 280px). The reader is full bleed with no gutter.

## Elevation & Depth

Depth is mostly material and tone, not shadow. Layers: grouped grey ground, elevated cards, translucent bars that blur what scrolls beneath, then top-layer overlays over a dim backdrop. Shadows are reserved for physical objects (covers, the lifted cover, floating menus, the segmented thumb, the scrubber thumb).

### Shadow Vocabulary

- **Cover** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), 0 6px 16px rgb(0 0 0 / 0.1)`; dark `0.5` / `0.4`): every cover thumbnail at rest.
- **Lifted** (`0 8px 24px rgb(0 0 0 / 0.18), 0 24px 64px rgb(0 0 0 / 0.22)`): the cover preview in the long-press context menu.
- **Menu** (`0 10px 40px rgb(0 0 0 / 0.18)`): pull-down menus, context-menu action list, import HUD.
- **Sheet edge** (`0 -2px 30px rgb(0 0 0 / 0.2)`): bottom sheets.
- **Segmented thumb** (`0 3px 8px rgb(0 0 0 / 0.12), 0 3px 1px rgb(0 0 0 / 0.04)`).
- **Hairlines** (`0 0.5px 0 var(--separator)` under a collapsed nav bar, `0 -0.5px 0` above the tab bar; `rgb(255 255 255 / 0.12)` on reader bars).

### Named Rules

**The Material Not Shadow Rule.** Bars are separated from content by blur plus a 0.5px hairline, never by a drop shadow. The large-title nav bar is fully transparent until the title scrolls behind it, then becomes `material-bar` with the hairline.

## Shapes

Continuous, gentle iOS corners. Covers 6px (4px on the small continue-reading thumbnail); grouped cards, search field and sheet cards 10px; menus, action-sheet groups, filled buttons, continue card and the context-menu preview 14px; sheets 14px on the top corners only. Pills use half their height: bar buttons 22px, capsules 16px. Segmented track 9px with a 7px thumb; settings icon tiles 7px; grabber 36 x 5px at 3px. Progress tracks are 4px tall (3px on covers) with 2px radius. Borders are essentially absent: edges come from tone, hairlines and the cover shadow; the only stroke is the dashed drop-target outline.

## Components

### Buttons

Tactile and quiet: everything presses down with a spring.

- **Bar button:** icon-only, accent glyph on transparent, 44 x 44 minimum, 22px pill. Active: opacity 0.45 and `scale(0.92)`. Disabled: tertiary label. Always carries `aria-label`.
- **Filled button:** magenta, on-accent Headline, 50px tall, 24px side padding, 14px radius. Active: `accent-pressed` and `scale(0.97)`. Disabled: opacity 0.5. Used for empty-state and error primary actions.
- **Capsule button:** magenta, 32px tall, 16px pill, Subhead 600. Active: `scale(0.94)`. The "Continue" capsule on the continue card is the same visual, decorative inside the larger button.
- **Text button (sheet Done):** accent Headline, 44px tall, no fill.

### Search Field

Filled 38px capsule (10px radius) on `fill-tertiary`, 17px magnifier at 9px inset in secondary label, placeholder in secondary label (not tertiary). Focus: 2px `accent-tint` halo, no outline. Clear button appears only with a value: 36px hit area around a 17px tertiary disc with a white 12px X.

### Navigation

- **Large-title screen:** 34pt title under a transparent sticky bar; an IntersectionObserver sentinel collapses the bar into `material-bar` + hairline and fades/slides the inline title in (6px rise). Leading slot for back, trailing slot for bar buttons.
- **Tab bar:** fixed bottom `material-bar`, hairline on top, icon (25px) over Caption 2 label, secondary label at rest, magenta when `aria-current="page"`. Active icons thicken (stroke 2.1) and gain a 22% `currentColor` fill so they read as filled without losing inner lines. Press scales the icon to 0.88. Tapping the active tab scrolls to top. Carries `view-transition-name: tab-bar` so it stays put during push/pop.

### Grouped Lists

Inset grouped cards on the grouped ground: uppercase Footnote section title in secondary label, 10px-radius `bg-elevated` card, optional Footnote footer. Rows are at least 48px, 16px side padding, 12px gap; hairline separators inset 16px, or 60px when rows carry a 30px icon tile. **Menu row:** trailing secondary value with a `ChevronsUpDown` glyph opens a pull-down menu with a checkmark on the current option.

### Menus

Pull-down menu: `material-thick` with blur, 14px radius, menu shadow, up to 260px wide, positioned against its trigger (aligns to the trigger's nearer edge, opens upward when there is no room). Items 46px with a 24px leading checkmark column and optional trailing 19px icon; hairline between items; pressed `fill-secondary`; destructive in red. Opens from its anchor corner (`scale(0.6)` to 1 on the spring) and fires a selection haptic.

### Sheets

- **Bottom sheet:** `bg-sheet`, top corners 14px, grabber, Title 3 title with accent Done, body padded 20px plus bottom inset. Slides up on the iOS curve over a `dim` backdrop. Drag the grabber/header: follows the finger down, rubber-bands up at 1/4, dismisses past 120px or 0.6 px/ms. Content inside uses `bg-sheet-card` for grouped controls.
- **Action sheet (confirmations):** two floating `material-thick` groups 8px apart and 8px from the edges: a header (secondary Footnote title, 600) plus the action (57px, Body at 20px, accent or destructive), and a separate bold Cancel group. `role="alertdialog"`, focus lands on the dialog itself.

### Segmented Control

Radio group in a fieldset: `fill-tertiary` track with 2px padding, raised thumb sliding to the selection on the spring (`--duration-slow`), 40px segments, Footnote 500 / 600 selected. Thumb is `bg-elevated` in light and `#636366` in dark. Legend in secondary Footnote 600, or visually hidden.

### Comic Cover and Grid Cell

2:3 cover at 6px radius with the cover shadow; image fades in; placeholder shows the title initial in Title 1 tertiary. In-progress covers carry a 3px white progress bar on a blurred `rgb(0 0 0 / 0.35)` track inset 6px. Below: two-line Footnote 600 title, one-line Caption subtitle, then a status (magenta "New" badge, "NN %" or check + "Read") and a 44px ellipsis button. Press scales to 0.96. Long press (450ms, 8px tolerance) or right click opens the context menu.

### Continue-Reading Card

Full-width `bg-elevated` button, 14px radius, 12px padding: 64px cover, two-line Headline title, tabular "Page x of y · NN %" meta, 4px magenta progress bar, magenta capsule. Press `scale(0.98)`. Its cover is the shared element for the open transition.

### Context Menu (lifted cover)

Full-screen popover over `dim` with `blur(14px) saturate(140%)`; the cover lifts from its grid rect into a ~220px preview (14px radius, lifted shadow) with a FLIP on the spring (520ms); the action list (header with title and subtitle, then 46px actions with trailing icons) follows 40ms later (420ms). Closing reverses the lift on the iOS curve (300ms) while the list fades (160ms). Medium impact haptic on open.

### Reader Chrome

Black canvas. Top and bottom bars in `material-reader` with blur and white 12% hairlines: back chevron, centred Headline title, `ALargeSmall` options button (48 x 44). Bottom: scrubber with a 4px track filled white up to the thumb (fill grows from the right in manga order), 22px white thumb that scales 1.18 while dragged, a white bubble with the page number that springs in above the thumb, and a tabular Caption counter. Centre tap toggles the chrome: bars slide out on the iOS curve and fade, and the hidden overlay is `inert`.

### Motion Grammar

- **Spring** (`--ease-spring`, a `linear()` approximation of a critically damped spring with ~1.7% overshoot): presses, menu pop, segmented thumb, scrubber thumb and bubble, HUD arrival, cover lift.
- **iOS sheet curve** (`--ease-ios`, `cubic-bezier(0.32, 0.72, 0, 1)`): sheets, action sheets, reader bars, view transitions, cover un-lift.
- **Ease out** (`--ease-out`, `cubic-bezier(0.22, 1, 0.36, 1)`): progress widths, inline title rise.
- **Durations:** fast 180ms (opacity, colour), base 320ms (presses, fades), slow 480ms (slides, view transitions).
- **Push / pop** (View Transitions, `data-nav` on `<html>`): forward pushes the new page in from 100% while the old slides to -28% and dims to brightness 0.82; back reverses with the old page on top. Tab switches cross-fade at 180ms.
- **Cover morph:** the tapped cover gets `view-transition-name: reader-cover` and the reader's loading state renders the cached cover with the same name, so the cover grows into the reader.
- **Pager settle:** the track follows the finger directly (8px axis lock, 0.32 edge resistance); release commits past 22% of width or 0.4 px/ms, settling with `cubic-bezier(0.2, 0.9, 0.24, 1)` over 180-420ms scaled by flick velocity. Taps and keys play the same animation; rapid taps finish and queue.
- **Reduced motion:** durations collapse to 1ms, view transitions are disabled, the pager and context menu jump to their end states, and the spinner slows to 2.4s.

## Do's and Don'ts

### Do:

- **Do** build new screens from `LargeTitleScreen`, `GroupedSection`/`Row`/`MenuRow`, `SegmentedControl`, `Sheet`, `ConfirmSheet`, `Menu`, `SearchField` and `BarButton` before writing new chrome.
- **Do** use Lucide icons: 1.75 stroke at 24-25px (tab bar at rest), stepping up as size drops (1.9 at 19px menu icons, 2-2.2 at 15-18px, 2.4-3 for 12-13px checkmarks), and lighter (1.25-1.5) only for 48-56px empty and error illustrations.
- **Do** put every sheet, menu and confirmation on the popover top layer (`popover="auto"`, or `manual` with an `onToggle` close handler) so light dismiss and Android Back close it.
- **Do** keep every touch target at least 44 x 44px, extending the hit area with negative margins when the glyph is smaller.
- **Do** give icon-only buttons an `aria-label` through i18n, and expose state with ARIA (`aria-current`, `aria-checked`, `aria-haspopup`).
- **Do** wrap anything shown over the reader in a `data-theme="dark"` subtree.
- **Do** use `--duration-*` tokens or a `prefers-reduced-motion` check for every animation, including Web Animations API calls.
- **Do** use tabular numbers for any counter or percentage.

### Don't:

- **Don't** use `window.alert`, `confirm` or `prompt`; confirmations are `ConfirmSheet` action sheets.
- **Don't** use unicode glyphs or emoji as icons (no "✕", "⋯", "›"); use the Lucide component.
- **Don't** add a flat Android app bar, a floating action button or Material ripples.
- **Don't** separate bars from content with drop shadows; use material blur plus a 0.5px hairline.
- **Don't** use magenta on headings, backgrounds or decoration.
- **Don't** put tertiary label colour on text the user must read.
- **Don't** hardcode colours in components when a token exists; add a token with light and dark values instead.
- **Don't** let the reader inherit the light theme: its canvas is always `bg-reader` and its chrome always `material-reader`.

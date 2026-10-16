# Calendar-first update verification

Date: 2026-10-16.

## Scope
Calendar-first Home, progressive setup help, task-block typography and tooltips, thin accent-colored native and custom scrollbars. Existing account work was preserved.

## Evidence
- TypeScript, lint and production build pass.
- 335 tests across 37 files pass, including structural accessibility checks, setup actions/progress, Home reading order, preview behavior and task-block handlers/descriptions.
- Browser: desktop 1440x1000, tablet 768x1024 and phone 375x812. Home calendar begins around 350px on desktop and 541px on a phone at default text size, before optional onboarding; no horizontal overflow.
- Browser: 125% text, dark theme, compact density, narrow weekly columns. Task labels and time rows do not overlap; focus reveals full title/time/priority in a tooltip.
- All 15 accent palettes checked in light and dark: native scrollbar color follows the selected palette. The accessible accent-text shade is used so pale palettes remain visible.
- Read-only independent code review identified short-block padding clipping; fixed by moving the short-block resize strip to the right.

## Limits
This is a targeted regression pass, not a repeat of the complete 0.0.9 browser accessibility/background matrix. Forced-colors fallback was inspected in CSS rather than tested with a real high-contrast OS session. Real screen-reader testing is still outstanding. Node reports its existing experimental localStorage warning during tests.

## Release notes
Keep unfinished next.config.ts, src/auth, src/components/auth and src/lib/appwrite changes out of this update's commit. Two already-committed local predecessors contain schema migration setup and base-aware routes; both were inspected before pushing master.

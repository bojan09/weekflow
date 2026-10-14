# UI/UX audit, version 0.0.9

Date: 2026-10-14. Covers every screen of the demo and the public site, in light and dark, at
phone (375px) and desktop (1100px) widths, with 125% text, in a production build.

## How it was run
- **Automated, in a real browser:** axe-core 4.10 with its full default rule set on every page, in both
  schemes. The sweep loads each page in a hidden frame of the chosen width, disables transitions, runs
  axe, checks horizontal overflow (also at 125% text), page title, language and viewport, and measures
  touch targets. The script is `docs/audit/sweep.js` (paste it into the browser console, then call
  `__sweep(urls, width, { axe: true, scale: true, targets: true })`).
- **Theme matrix:** axe's `color-contrast` rule on Home for all 15 accent colours in light and dark
  (30 combinations), and for all 12 backgrounds with glass off, subtle and frosted in light and dark
  (72 combinations).
- **Automated, in unit tests:** `src/a11y.test.tsx` runs axe on the Guide, Start here, Review, every Team
  tab, the landing sections and footer, and the help, plan and organize dialogs. It cannot judge colour
  or layout, so it complements the browser sweep.
- **By hand:** keyboard tab order and focus visibility, the skip link, reduced motion, page weight.

## Pages covered
Landing, demo launcher, Home, My Week, Tasks, Calendar, Review, Team (all tabs), Profile, Settings and
its ten panes, Guide, Version history.

## Results
| Check | Result |
|---|---|
| axe, every page, light and dark, desktop and phone | No violations |
| Colour contrast, 15 accents x light/dark | No violations |
| Colour contrast, 12 backgrounds x 3 glass levels x light/dark | No violations |
| Horizontal scroll at 375px | None |
| Horizontal scroll at 125% text, 375px and 1100px | None (after fixes) |
| Keyboard order | Skip link, logo, navigation, page controls, in reading order; focus outline visible |
| Reduced motion | Transitions and animations drop to about 0ms when set to reduce |
| Page titles | Unique per page, including each Settings pane |
| Language, viewport | `lang="en"`, `width=device-width, initial-scale=1`, zoom not disabled |
| Dependencies | 0 known vulnerabilities in production dependencies |

## Problems found and fixed
1. **Phone: page overflowed sideways on Home, Tasks and Review.** The page header's action row could not
   wrap. It now wraps, and the help, search and account buttons stay together.
2. **Touch targets under 44px.** Added a global 44px minimum for buttons, inputs, selects, sliders, tabs
   and radio options on phones and touch screens; enlarged the hit area (without changing the look) of the
   switch, the colour swatches, the task checkbox and menu buttons, and the checklist checkbox and remove
   buttons in the editor; raised the header icon buttons, Demo states, Exit demo, the public logo link,
   Open the app, the Settings back link, About's Version history link, filter chips and day chips.
3. **125% text overflowed:** the week, month and review navigation rows now wrap; the week page's grid
   no longer grows past the screen; the time inputs in Planning wrap; Settings rows wrap their control
   under the label when there is no room (desktop width).
4. **Stale launcher:** "What you can try" listed only early features. It now covers the planner, Team and
   the Guide.
5. **Vendor names:** earlier release notes and the public roadmap named tools. Removed, with tests.
6. **Page titles:** every Settings pane shared one title; each now has its own.

## Known limits (accepted)
- Seven-column grids on a phone (the month calendar and the day headers of the week grid) have cells
  about 39 to 42px wide and 47 to 80px tall. Seven equal columns cannot reach 44px wide at 375px. Every
  cell is well above the 24px WCAG minimum, and each is far taller than 44px.
- The sweep measures a control's own box for text fields; a text field whose label sits beside it can
  appear small in the report even though the field itself is 44px tall.
- Development tooling reports 5 high-severity advisories in the lint toolchain (not shipped). The only
  automatic fix downgrades the framework, so it was not applied.
- Real screen-reader runs (VoiceOver, NVDA) and low-end device performance are not covered by this audit.

## Page weight (production build, Home)
About 435 KB of JavaScript across 31 files before compression, 22 KB of CSS, two fonts; the page loaded
in about 80 ms on the local server. No route-specific code is loaded elsewhere.

## Re-running
Run the sweep after any UI change, and add a Guide entry for any new screen (a test enforces it).

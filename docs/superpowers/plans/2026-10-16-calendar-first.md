# Calendar-first Home Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the calendar immediately useful, onboarding optional, and calendar blocks and scrollbars feel native to Weekflow.

**Architecture:** Refine the existing Home and shared calendar components without changing domain data, scheduling, or persistence. Keep the full onboarding content in Guide and reuse existing progress tracking. Preserve the unfinished account work.

**Tech Stack:** Existing Next.js, TypeScript, Tailwind, Base UI, Zustand, Vitest.

**Spec:** Direction A approved in chat on 2026-10-16, plus thinner accent-colored scrollbars and the marked task-block screenshot.

**Status:** Implemented as 0.0.11. Verification evidence and remaining manual limits are recorded in `docs/AUDIT-0.0.11.md`. The checklist below records the original execution plan.

## Global Constraints
- Master only; commit and push completed updates under standing authorization.
- No dependencies, backend changes, data migrations, or landing-page redesign.
- Preserve routes, calendar geometry, locked tasks, keyboard, pointer drag and resize behavior.
- Retain existing palettes, light/dark/system, backgrounds, density and reduced motion.
- Do not stage pre-existing account changes or the two pre-existing unpublished commits unintentionally.

## Review Focus
- Long titles, narrow overlap lanes, short tasks and 125% text must not overlap time labels or resize handles.
- Do not increase task height visually beyond its duration; clipping must not misrepresent time.
- First-time and returning users both reach the calendar without an onboarding wall.
- Scrollbars remain usable, including horizontal panels and forced-colors mode.
- Small-screen attention items must not displace today's calendar.

### Task 1: Progressive onboarding
**Files:** `src/components/guide/start-here.tsx`, its tests, and `src/guide/content.ts`.
**Interface:** Keep `StartHere()` and existing guide progress/actions; display only the first unfinished step, count, Hide and Guide link. Full checklist stays in Guide.
- [ ] Replace tests that require all steps visible with next-step progression, correct actions, completed/hidden states and Guide navigation tests.
- [ ] Implement the compact prompt without changing the tracker/store.
- [ ] Run the guide tests and confirm all states pass.

### Task 2: Calendar-first Home
**Files:** `src/screens/home/home-screen.tsx`, `src/components/home/stat-card.tsx`, Home tests if necessary.
**Interface:** Reuse WeekPlanner, WeekNav, stats, conflicts, quick add and plan dialog actions.
- [ ] Put one primary plan action beside the greeting, compact stats, calendar before attention/onboarding, and quick add after the calendar.
- [ ] Keep attention content beside the calendar on wide desktops and after it on phones. Preserve missed/review actions and rules.
- [ ] Verify 375px, tablet, and 1440px layouts; keyboard access to every retained action.

### Task 3: Calendar blocks
**Files:** `src/components/calendar/task-block.tsx`, new `task-block.test.tsx`, scoped CSS if needed.
**Interface:** Retain BlockProps and all event handlers.
- [ ] Test full time range, long title, short block, lock icon, preview and resize callback behavior.
- [ ] Use a container-query layout based on actual block width/height. Reserve footer space for the handle, clamp title separately, omit redundant inline priority text, and expose full details on hover/focus via an accessible description.
- [ ] Keep time ranges on one line where possible; compact start-time presentation for narrow blocks with full range available in description. Never inflate timed geometry.
- [ ] Verify 15/30/45/60/120-minute tasks, both densities, overlap lanes and 125% text.

### Task 4: Scrollbars
**Files:** `src/app/globals.css`, `src/components/ui/scroll-area.tsx`.
**Interface:** Semantic scrollbar tokens derived from primary color; native overflow and Base UI scrollbar share them.
- [ ] Add thin native scrollbars, rounded thumbs and hover states; keep transparent tracks and forced-colors override.
- [ ] Match the existing Base UI scrollbar thumb and width.
- [ ] Verify page, calendar and dialog scrolling in both schemes and several accent palettes.

### Task 5: Verification and release
- [ ] Run typecheck, lint, complete tests and production build; fix caused regressions.
- [ ] Inspect desktop/mobile, 125% text, short and long blocks, keyboard and drag/resize.
- [ ] Update changelog, version and guide only after verification; report limitations honestly.
- [ ] Stage only this update. Before pushing master, inspect the two pre-existing unpublished commits so a push does not silently publish unfinished account work.

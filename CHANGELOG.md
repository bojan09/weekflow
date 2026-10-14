# Changelog

Newest first. This file is the source of the in-app Version history and the
version timeline. Each entry is `## <version> — <title>`, then a `Date:` line,
a `Summary:` line, and bullet changes. `package.json` must match the newest entry.
Database schema migrations are tracked separately and never share this file.

## 0.0.2 — Tasks, week calendar and Home
Date: 2026-10-14
Summary: Create and organize tasks, plan your week on a calendar with drag, resize and locking, and see conflicts with suggested fixes on Home.

- Tasks: create, edit, complete, delete with undo, search, filters, inbox, subtasks, dependencies, labels, estimated vs actual time
- Quick-add understands "Write report 1h30 !high due fri"
- Week, day and agenda views with drag, resize, keyboard moves, working-hours shading, workload bars and a current-time line
- Unscheduled tray with drag-to-schedule and one-click "next free slot"
- Lock a task in place or pin it to a day so it never moves
- Home: greeting, weekly stats, conflicts with fixes you apply by hand, and Active Rules chips from your real settings
- Month Calendar page with workload per day
- Soft and frosted glass surfaces, with opacity solved per background so text stays readable
- Demo scenarios: a normal week, empty, overloaded, and conflicts
- Browser tab icon, and the tech stack removed from the public footer

## 0.0.1 — Foundation and design system
Date: 2026-10-14
Summary: Design tokens, 15 accent palettes, themes and backgrounds, navigation shell, Profile, Settings and the interactive demo.

- Design token system generated from OKLCH with WCAG AA contrast enforced for every palette in light and dark
- Light, Dark and System themes, 15 accent palettes, 12 page backgrounds, density and motion preferences, persisted per user
- Navigation shell: dark sidebar on desktop, bottom navigation on tablet and mobile, command palette and keyboard shortcuts
- Profile page with editable identity details
- Settings with ten categories, including Appearance, Scheduling engine rules, Calendar and Accessibility
- Version history timeline generated from this file
- Interactive demo at /demo with a state simulator for loading, error, offline and permission-denied screens
- Local-first data layer behind repository interfaces, ready for the Appwrite adapter

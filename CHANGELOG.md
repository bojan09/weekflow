# Changelog

Newest first. This file is the source of the in-app Version history and the
version timeline. Each entry is `## <version> — <title>`, then a `Date:` line,
a `Summary:` line, and bullet changes. `package.json` must match the newest entry.
Database schema migrations are tracked separately and never share this file.

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

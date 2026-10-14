# Weekflow roadmap

Free forever. No subscriptions, paid tiers, feature gates or limits. Team features are free too.

This is the approved phased plan. UI and UX come first on a local data layer; accounts and the
Appwrite database come after the UI is complete (0.1.0). One phase at a time: each ends with
verification, a report, and a stop for approval. The version changes only after a phase is
finished and tested (`package.json` + `CHANGELOG.md`).

| Version | Scope | Status |
|---|---|---|
| **0.0.1** | Foundation: design tokens, 15 accent palettes, themes and backgrounds, navigation shell, local data layer, Profile, Settings (10 categories), version timeline, demo at `/demo` with a state simulator | Built |
| 0.0.2 | Tasks, inbox, week calendar (day/week/agenda), drag and resize, locking, Home dashboard with stats and Active Rules | Next |
| 0.0.3 | Deterministic scheduling engine (pure TypeScript), constraints, explanations, plan preview, automated tests | Planned |
| 0.0.4 | Replan, undo and rollback, schedule history, workload analytics, weekly review | Planned |
| 0.0.5 | Team workspaces UI on mock data, with the permission model designed in | Planned |
| 0.0.6 | UI/UX audit: accessibility, mobile, performance, regression across every theme, palette and background | Planned |
| 0.1.0 | Appwrite: auth, schema and migrations, permissions, Functions, adapters, real Profile security | Planned |
| 0.1.1 | Realtime, team authorization tests, security and performance audit | Planned |

## Architecture rules

- `src/engine` is pure TypeScript: no React, no DOM, no clock, no randomness. Same input, same output.
- Screens talk to repository ports (`src/data`). The demo uses a localStorage adapter; the
  Appwrite adapter implements the same interface in 0.1.0.
- Zustand holds UI state and preferences only. Domain data is not kept in Zustand.
- Every color comes from generated semantic tokens (`src/theme/generated`). Palette contrast is
  solved at build time and verified by tests.
- Text never sits directly on the page background; content is always on a surface token, so
  contrast does not depend on the chosen background.
- Validate at boundaries with Zod. Server-side authorization is authoritative once the backend lands.
- Schema migrations are tracked separately from the app version.

## Single source of truth for the version

`package.json` holds the version. `CHANGELOG.md` holds the release list. `npm run gen`
(run automatically by `dev`, `build`, `test` and `typecheck`) writes `src/generated/version.ts`,
which the sidebar footer, Settings → About and the version timeline all read. A test fails if
the two disagree.

## Decisions

- Node 22 LTS (`.nvmrc`, `engines`).
- Domain data layer: a small custom store, not TanStack and not SWR.
- Deployment: Vercel. Database: Appwrite Cloud.
- Demo lives under `/demo/*`; `/app/*` is added with accounts.
- Commits go straight to `master`, only when requested.

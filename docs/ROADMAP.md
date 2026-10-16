# Weekflow roadmap

Free forever. No subscriptions, paid tiers, feature gates or limits. Team features are free too.

This is the approved phased plan. UI and UX come first on a local data layer; accounts and the
Appwrite database come after the UI is complete (0.1.0). One phase at a time: each ends with
verification, a report, and a stop for approval. The version changes only after a phase is
finished and tested (`package.json` + `CHANGELOG.md`).

| Version | Scope | Status |
|---|---|---|
| 0.0.1 | Foundation: design tokens, 15 accent palettes, themes and backgrounds, navigation shell, local data layer, Profile, Settings, version timeline, `/demo` | Built |
| **0.0.2** | Tasks, inbox, week/day/agenda calendar with drag, resize and locking, Home dashboard, month Calendar, conflicts with manual fixes, glass surfaces, demo scenarios | Built |
| 0.0.3 | **Landing page and public site**: redesigned landing, public navbar with mobile drawer, mobile-friendly footer (see `docs/LANDING-DESIGN.md`). Built from the owner's three reference designs. | Built |
| 0.0.4 | **Scheduling engine** (pure TypeScript in `src/engine`): ordering, constraints, explanations, plan preview, automated tests | Built |
| **0.0.5** | **Replanning and review**: auto-replan of missed tasks, schedule history with rollback, workload analytics, weekly review | Built |
| **0.0.6** | **Guide and onboarding**: Guide page, help on every screen, (i) jargon tips, Start here checklist (requested by the owner, who found the number of features hard to take in). Spec and plan in `docs/superpowers/` | Built |
| **0.0.7** | **Repeat, organize and remind**: recurring tasks, projects, templates, custom categories, long-task blocks, in-app reminders (spec in `docs/superpowers/specs/2026-10-14-organize-and-repeat-design.md`) | Built |
| **0.0.8** | **Team workspaces preview** on sample data with a pure permission model (spec in `docs/superpowers/specs/2026-10-14-team-workspaces-design.md`) | Built |
| **0.0.9** | **UI/UX audit**: accessibility, mobile, performance, regression across every theme, palette and background. Report: `docs/AUDIT-0.0.9.md` | Built |
| 0.1.0 | Appwrite authentication, schema and migrations, private adapters, real Profile security, server-authorized workspaces and account deletion | Implementation and release verification in progress |
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
- Commit and push straight to `master` after every phase or update (standing approval).
- The public site never shows the tech stack.

## 0.0.6 notes: Guide and onboarding
Calendar-first refinement (0.0.11): approved 2026-10-16. Home now shows one optional next step below the calendar; the full setup map and checklist live in the Guide. Task-block typography adapts to space, and scrollbars follow the accent palette. Account integration is approved and in release verification; deployment and inbox checks must finish before 0.1.0 is marked released.

Owner request: "there are so many features, we need a phase that will make sure users can see and
understand everything. A guide page or guide on every part would be useful." Start the phase with
the brainstorming skill (decisions first, then a blueprint), as the owner asked.

Starting points to explore, not decisions:
- A Guide page that explains every area in plain words, with a live "try it" link for each
- Short in-context help on each screen (what this is, what to do first)
- A first-run tour and a getting-started checklist driven by real actions
- Plain names for the planner jargon (inbox, lock, buffer, strict deadline, engine)
- Every later phase adds its own guide entries as part of being done (Definition of Done)

## Definition of Done (from 0.0.6)
A phase is not finished until its new screens, settings and jargon have Guide entries
(`src/guide/content.ts`, `src/guide/terms.ts`). A new route without a Guide section fails
`src/guide/content.test.ts`.

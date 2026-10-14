# Weekflow

Plan smarter. Work better. Your time. Your rules.

A flexible weekly planner with a deterministic scheduling engine. Free forever.

**Stack:** Next.js, TypeScript (strict), Tailwind CSS, shadcn/ui, Zustand, Appwrite (from 0.1.0).

## Getting started

Requires Node 22 or newer (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open http://localhost:3000, then **Open the demo**. The demo runs entirely in your browser on
sample data.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (regenerates theme tokens and version first) |
| `npm run build` | Production build |
| `npm run typecheck` | Generate files, route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (theme contrast, preferences, data layer, controls, changelog) |
| `npm run gen` | Regenerate `src/theme/generated/*` and `src/generated/version.ts` |

## Project docs

- [docs/ROADMAP.md](docs/ROADMAP.md): phased plan, architecture rules, decisions
- [CHANGELOG.md](CHANGELOG.md): releases (source of the in-app version history)

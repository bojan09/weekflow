# Guide and onboarding (0.0.6): design

Status: approved by the owner on 2026-10-14, awaiting spec review before the implementation plan.

## Problem
Weekflow now has many features (tasks, week calendar, planning engine, conflicts, replanning, history,
weekly review, deep settings). The owner is "amazed and confused at the same time". Users need to see and
understand everything. Priority order, chosen by the owner: first a **map** of what exists and where,
then **how-tos**, then plain explanations of the **rules and jargon**.

## Decisions
| Topic | Decision |
|---|---|
| Layers | Guide page, help on each screen, first-run "Start here" panel with checklist |
| First run | A dismissible **Start here** panel on Home (no popup tour, no spotlight) |
| Guide layout | **One long page** with a sticky contents list and a search box; phones get a collapsible "On this page" |
| Per-screen help | "?" button opens a help panel, plus one first-visit hint line per screen, plus (i) tips on jargon |
| Help key | **H** opens help for the current screen; **?** keeps opening keyboard shortcuts |
| Content | One typed content module is the single source for every surface |
| Checklist | Six steps, ticked by real actions (see below) |

## Architecture
```
src/guide/content.ts     SECTIONS and TERMS (plain typed data)
src/guide/progress.ts    pure: which steps a state change completes
src/guide/store.ts       Zustand + persist (skipHydration): done steps, hidden panel, dismissed hints
src/guide/tracker.tsx    mounted once in AppShell: watches tasks, pathname and plan dialog
src/components/guide/
  help-button.tsx        "?" in PageHeader; H key
  help-panel.tsx         side sheet (bottom sheet on phones), content by route
  term.tsx               (i) popover from a TERMS entry
  start-here.tsx         Home panel: Map, Do (checklist), Learn
  screen-hint.tsx        one dismissible first-visit line per screen
src/screens/guide/       /demo/guide: sticky contents, search, sections, glossary
```

### Content model
```ts
Section { id, title, route?: AppRoute, summary, whatItIs, steps: Step[], tips: string[],
          shortcuts: {keys, label}[], terms: TermId[], tryIt?: {label, route, sub?}, comingIn?: string }
Term    { id, word, plain, whyItMatters, section: SectionId, setting?: {route, sub} }
```
Sections: Big picture, Home, My Week, Tasks, Calendar, Planning (Plan my week, rules, locks, conflicts),
Replanning and history, Weekly review, Settings, Profile, Keyboard shortcuts, Glossary. Team is a section
marked `comingIn: "0.0.8"`.

### Checklist steps and how they tick
| Step | Completed when |
|---|---|
| Add a task | a new task id appears and every previous id is still present |
| Put a task on the calendar | an existing task gains a placement |
| Lock a task | an existing task flips from unlocked to locked |
| Preview a plan | the Plan my week dialog is open with a plan displayed |
| Check your rules | the user visits Settings, Planning |
| Open the weekly review | the user visits the Review page |

The tracker diffs successive task snapshots, so drag, keyboard, quick-add and the editor all count the
same way. A scenario load replaces the ids, so no old id survives, and nothing ticks.
Progress persists in `weekflow:demo:guide` (browser only, like the rest of the demo; moves to the account in 0.1.0).
When all six are done, or the user presses Hide, the panel collapses to a small "Guide" link.
"Replay Start here" on the Guide page restores it.

## Surfaces
- **Start here (Home):** three doors. *Map*: link to Big picture plus one line per main area. *Do*: checklist with "n of 6" and a "Show me" link per step. *Learn*: the main terms as (i) tips.
- **Help panel:** the section matching the current route: what it is, try-this-first steps with links, good-to-know tips, that screen's shortcuts, its terms, and a deep link to the Guide section. Reuses the existing Sheet (focus trap, Escape, focus return). Bottom sheet below 640px. Button has `aria-keyshortcuts="H"`; the H key is ignored while typing.
- **(i) tips:** a `Term` next to Buffer, Strict deadline, Stability weight, Inbox, Lock, Focus time, and similar. Opens on click or Enter (not hover only), 44px hit area. Popover: plain meaning, why it matters, "More in the Guide". Used on the Settings Planning and Engine panes, the Plan my week dialog and the Home rules bar.
- **First-visit hints:** one dismissible line per screen, remembered per screen. Not shown on Home while Start here is visible, nor on the Guide page.
- **Guide page** `/demo/guide`: sticky contents (desktop), "On this page" disclosure (phone), live search over titles, summaries and steps with an announced result count. Linked from the sidebar, phone More menu, avatar menu, command palette (`g u`) and the public footer. The shortcuts dialog gains "Help for this page: H".

## Accessibility and responsiveness
One `h1`, sequential headings, landmarks, working skip link, 44px targets, reduced motion respected, tokens that
already meet AA. Verified at 375, 768 and 1280 px, in light and dark, with glass on.

## Testing
- **Content:** every app route has a Section; every `tryIt` link resolves to a real route; every `TermId` exists; no empty section; no duplicate ids.
- **Tracker (pure):** each of the six steps ticks for the right change; a scenario load ticks nothing; repeated changes do not untick.
- **UI:** H and the button open the panel, Escape closes it and returns focus; search filters and announces; (i) opens by keyboard; hints dismiss and stay dismissed; Start here collapses at 6 of 6 and can be replayed.
- **Browser:** axe on the Guide page, help panel, (i) popover and Start here, at phone and desktop widths.
- Standard gate: typecheck, lint, tests, build, then version 0.0.6 and changelog.

## Definition of Done (applies from this phase on)
A phase is not done until its new screens or settings have a Guide section and any new jargon has Terms.
The "every route has a Section" test enforces it.

## Out of scope
Spotlight or step-by-step tours, video or animated demos, translations, "was this helpful?" feedback,
account-synced progress (0.1.0). Team stays a "coming in 0.0.8" section.

## Risks
- Content drifts from behavior: mitigated by the route, link and term tests, and by the Definition of Done.
- Tracker false positives: mitigated by diffing rules above and tests; steps never untick.
- Too much help is itself clutter: hints are one line, dismissible, once per screen; panels are on demand.

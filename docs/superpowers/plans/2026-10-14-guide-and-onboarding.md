# Guide and onboarding (0.0.6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user see and understand every part of Weekflow: a Guide page, per-screen help, jargon tips, and a Start here checklist on Home.

**Architecture:** One typed content module (`src/guide/content.ts`, `terms.ts`) feeds every surface. A pure `progress.ts` decides which checklist steps a state change completes; a Zustand store persists them; a tracker mounted in `AppShell` watches real data. UI surfaces (help panel, `Term` popover, Start here, screen hint, Guide page) only read content and store.

**Tech Stack:** Next.js 16 (App Router, `"use client"` components), React 19, TypeScript strict, Tailwind v4, Base UI (`@base-ui/react`: `render` prop, no `asChild`), Zustand 5 with `persist` + `skipHydration`, Vitest + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-14-guide-and-onboarding-design.md`

**Conventions to follow (from this repo):**
- Spawn nothing in the global scope that touches `window` at import time. Stores hydrate in a layout effect.
- Pure logic lives outside components and has tests. Components stay thin.
- Never write the stack names (Next.js, Appwrite, Tailwind, shadcn, Zustand) in any user-visible text.
- Commit to `master` only. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Gate before the release commit: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`.
- When editing files with a script, normalise CRLF first (`.replace(/\r\n/g, "\n")`).

## File map

| File | Responsibility |
|---|---|
| `src/lib/routes.ts` (modify) | runtime `APP_ROUTES`, `routeOfPath` |
| `src/guide/types.ts` (new) | `GuideSection`, `GuideStep`, `GuideLink`, `GuideTerm` |
| `src/guide/terms.ts` (new) | `TERMS`, `TermId`, `termById` |
| `src/guide/content.ts` (new) | `SECTIONS`, `sectionForRoute`, `sectionById` |
| `src/guide/search.ts` (new) | `searchGuide(query)` pure filter |
| `src/guide/progress.ts` (new) | `STEPS`, `stepsFromTaskChange`, `stepsFromPath` |
| `src/guide/store.ts` (new) | persisted progress store |
| `src/guide/tracker.tsx` (new) | watches tasks, path and plan dialog |
| `src/components/ui/popover.tsx` (new) | Base UI popover wrapper |
| `src/components/guide/term.tsx` (new) | (i) tip |
| `src/components/guide/help-button.tsx`, `help-panel.tsx` (new) | "?" button and side/bottom sheet |
| `src/components/guide/screen-hint.tsx` (new) | first-visit hint line |
| `src/components/guide/start-here.tsx` (new) | Home panel |
| `src/screens/guide/guide-screen.tsx` + `src/app/demo/(app)/guide/page.tsx` (new) | Guide page |
| modify: `ui.ts`, `page-header.tsx`, `app-shell.tsx`, `shortcuts.tsx`, `nav.ts`, `avatar-menu.tsx`, `controls.tsx`, settings panes, `plan-dialog.tsx`, `active-rules-bar.tsx`, `unscheduled-tray.tsx`, `home-screen.tsx`, `site-footer.tsx` | wiring |

---

### Task 1: Runtime routes and content types

**Files:**
- Modify: `src/lib/routes.ts`
- Create: `src/lib/routes.test.ts`
- Create: `src/guide/types.ts`

- [ ] **Step 1: Write the failing test** `src/lib/routes.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { APP_ROUTES, appPath, routeOfPath } from "./routes";

describe("routes", () => {
  it("lists every route including guide and review", () => {
    expect(APP_ROUTES).toContain("guide");
    expect(APP_ROUTES).toContain("review");
  });

  it("builds app paths", () => {
    expect(appPath("settings", "planning")).toBe("/demo/settings/planning");
  });

  it("finds the route of a pathname", () => {
    expect(routeOfPath("/demo/week")).toBe("week");
    expect(routeOfPath("/demo/settings/engine")).toBe("settings");
    expect(routeOfPath("/demo")).toBeNull();
    expect(routeOfPath("/")).toBeNull();
    expect(routeOfPath("/demo/unknown")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it**: `npx vitest run src/lib/routes.test.ts` → FAIL (`APP_ROUTES` is not exported).

- [ ] **Step 3: Replace `src/lib/routes.ts`**

```ts
/** Every in-app route lives under this base. Accounts add /app later. */
export const DEMO_BASE = "/demo";

export const APP_ROUTES = [
  "home",
  "week",
  "tasks",
  "calendar",
  "review",
  "team",
  "profile",
  "settings",
  "changelog",
  "guide",
] as const;

export type AppRoute = (typeof APP_ROUTES)[number];

export function appPath(route: AppRoute, sub?: string): string {
  return `${DEMO_BASE}/${route}${sub ? `/${sub}` : ""}`;
}

/** "/demo/settings/planning" gives "settings". Null outside the app. */
export function routeOfPath(pathname: string): AppRoute | null {
  const [, base, segment] = pathname.split("/");
  if (`/${base ?? ""}` !== DEMO_BASE) return null;
  return (APP_ROUTES as readonly string[]).includes(segment ?? "") ? (segment as AppRoute) : null;
}
```

- [ ] **Step 4: Create `src/guide/types.ts`**

```ts
import type { AppRoute } from "@/lib/routes";
import type { TermId } from "./terms";

export interface GuideLink {
  route: AppRoute;
  sub?: string;
  label: string;
}

export interface GuideStep {
  text: string;
  to?: GuideLink;
}

export interface GuideShortcut {
  keys: string;
  label: string;
}

export interface GuideSection {
  id: string;
  title: string;
  /** The app screen this section describes, if it is a screen. One section per route. */
  route?: AppRoute;
  /** One line, used in lists and the Start here map. */
  summary: string;
  /** One short line shown once as a first-visit hint on the screen. */
  hint: string;
  whatItIs: string;
  steps: readonly GuideStep[];
  tips: readonly string[];
  shortcuts: readonly GuideShortcut[];
  terms: readonly TermId[];
  tryIt?: GuideLink;
  /** Version that delivers this section's screen. Shown instead of steps. */
  comingIn?: string;
}

export interface GuideTerm {
  id: string;
  word: string;
  plain: string;
  whyItMatters: string;
  /** Id of the section that explains it in depth. */
  section: string;
  setting?: GuideLink;
}
```

- [ ] **Step 5: Run** `npx vitest run src/lib/routes.test.ts` → PASS. Run `npx tsc --noEmit`: it will report `Cannot find module './terms'` for `types.ts`; that is fixed in Task 2. Do not commit yet.

---

### Task 2: Glossary terms

**Files:**
- Create: `src/guide/terms.ts`

- [ ] **Step 1: Create `src/guide/terms.ts`**

```ts
import type { GuideTerm } from "./types";

/**
 * Plain-language meanings of the words Weekflow uses. Each id is used by the
 * (i) tips, the help panel and the glossary. Write for someone who has never
 * used a planner: short, concrete, no jargon inside the explanation.
 */
export const TERMS = [
  {
    id: "inbox",
    word: "Inbox",
    plain: "Open tasks that have no time on your calendar yet.",
    whyItMatters: "Capture first, place later. Plan my week can fill the inbox for you.",
    section: "tasks",
  },
  {
    id: "lock",
    word: "Lock",
    plain: "A locked task is pinned to its day and time. You cannot drag it, and the planner never moves it.",
    whyItMatters: "Use it for meetings and anything fixed. Everything else flows around it.",
    section: "week",
  },
  {
    id: "buffer",
    word: "Buffer",
    plain: "The gap Weekflow keeps between two tasks.",
    whyItMatters: "It stops your day from becoming back-to-back. The planner leaves this much room.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "daily-limit",
    word: "Daily limit",
    plain: "The most hours of work you want planned on a single day.",
    whyItMatters: "A day over the limit is flagged as overloaded, and the planner stops filling it.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "strict-deadline",
    word: "Strict deadline",
    plain: "The planner never places a task after its deadline. If a task cannot fit, it tells you.",
    whyItMatters: "Best for hard due dates, because you hear about a problem early.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "soft-deadline",
    word: "Soft deadline",
    plain: "The planner may place a task after its deadline, and flags it when it does.",
    whyItMatters: "Useful when dates are flexible and you would rather have a plan than a refusal.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "stability",
    word: "Stability",
    plain: "How much the planner prefers to leave tasks where they already are.",
    whyItMatters:
      "At 5 or more, Plan my week only moves tasks that break a rule. Lower lets it rearrange more of your week.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "focus-time",
    word: "Focus time",
    plain: "Uninterrupted time for deep work.",
    whyItMatters: "With it on, tasks in the Focus category are planned early, when your day is clearest.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "conflict",
    word: "Conflict",
    plain: "A problem in your schedule, such as two tasks at the same time or a day over its limit.",
    whyItMatters: "Home lists conflicts with fixes you can apply by hand. Plan my week can fix them too.",
    section: "home",
  },
  {
    id: "missed",
    word: "Missed task",
    plain: "An open task whose time has passed without it being done.",
    whyItMatters: "You can replan missed tasks yourself, after being asked, or automatically.",
    section: "replan",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "schedule-history",
    word: "Schedule history",
    plain: "Saved copies of your calendar, taken just before a bulk change.",
    whyItMatters: "Lets you go back to how your week looked before a plan or replan.",
    section: "replan",
  },
  {
    id: "engine",
    word: "Scheduling engine",
    plain: "The part of Weekflow that proposes a plan. The same tasks and rules always give the same plan.",
    whyItMatters: "It explains every choice, and it changes nothing until you press Apply.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
] as const satisfies readonly GuideTerm[];

export type TermId = (typeof TERMS)[number]["id"];

const BY_ID = new Map<string, GuideTerm>(TERMS.map((t) => [t.id, t]));

export function termById(id: TermId): GuideTerm {
  const term = BY_ID.get(id);
  if (!term) throw new Error(`Unknown guide term: ${id}`);
  return term;
}
```

- [ ] **Step 2: Run** `npx tsc --noEmit` → no errors. (`types.ts` now resolves `TermId`.)

---

### Task 3: Guide content (all sections) with its tests

**Files:**
- Create: `src/guide/content.ts`
- Create: `src/guide/content.test.ts`

- [ ] **Step 1: Write the failing test** `src/guide/content.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { SETTINGS_SECTIONS } from "@/screens/settings/sections";
import { APP_ROUTES } from "@/lib/routes";
import { SECTIONS, sectionById, sectionForRoute } from "./content";
import { TERMS } from "./terms";

describe("guide content", () => {
  it("has a section for every app route, exactly one each", () => {
    for (const route of APP_ROUTES) {
      expect(SECTIONS.filter((s) => s.route === route), route).toHaveLength(1);
      expect(sectionForRoute(route).route).toBe(route);
    }
  });

  it("has unique, non-empty section ids and titles", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SECTIONS) {
      expect(s.title.trim(), s.id).not.toBe("");
      expect(s.summary.trim(), s.id).not.toBe("");
      expect(s.whatItIs.trim(), s.id).not.toBe("");
    }
  });

  it("keeps hints to one short line", () => {
    for (const s of SECTIONS) {
      expect(s.hint.length, s.id).toBeGreaterThan(10);
      expect(s.hint.length, s.id).toBeLessThanOrEqual(110);
    }
  });

  it("gives every live section steps and tips, and marks unbuilt screens honestly", () => {
    for (const s of SECTIONS) {
      if (s.comingIn) expect(s.steps).toHaveLength(0);
      else {
        expect(s.steps.length, s.id).toBeGreaterThan(0);
        expect(s.tips.length, s.id).toBeGreaterThan(0);
      }
    }
    expect(sectionForRoute("team").comingIn).toBe("0.0.8");
  });

  it("only links to real routes and real settings panes", () => {
    const panes = new Set<string>(SETTINGS_SECTIONS.map((p) => p.id));
    const links = SECTIONS.flatMap((s) => [s.tryIt, ...s.steps.map((st) => st.to)]).filter(Boolean);
    for (const link of links) {
      expect(APP_ROUTES as readonly string[]).toContain(link?.route);
      if (link?.sub) {
        expect(link.route).toBe("settings");
        expect(panes.has(link.sub), link.sub).toBe(true);
      }
    }
    for (const term of TERMS) {
      if ("setting" in term) expect(panes.has(term.setting.sub ?? ""), term.id).toBe(true);
    }
  });

  it("has a valid glossary", () => {
    const ids = TERMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const term of TERMS) {
      expect(sectionById(term.section), term.id).toBeDefined();
      expect(term.plain.length, term.id).toBeGreaterThan(10);
    }
    for (const s of SECTIONS) for (const id of s.terms) expect(ids, `${s.id}:${id}`).toContain(id);
  });

  it("never names the tech stack", () => {
    const text = JSON.stringify([SECTIONS, TERMS]);
    for (const word of ["Next.js", "Appwrite", "Tailwind", "shadcn", "Zustand", "Vercel"]) {
      expect(text).not.toContain(word);
    }
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/guide/content.test.ts` → FAIL (`./content` missing).

- [ ] **Step 3: Create `src/guide/content.ts`**

```ts
import type { AppRoute } from "@/lib/routes";
import type { GuideSection } from "./types";

/**
 * The Guide, in reading order. This one list feeds the Guide page, the help
 * panel, the first-visit hints and the Start here map. Every app route has
 * exactly one section (a test enforces it), so a new screen cannot ship
 * without its guide entry.
 */
export const SECTIONS: readonly GuideSection[] = [
  {
    id: "overview",
    title: "The big picture",
    route: "guide",
    summary: "What Weekflow is and where everything lives.",
    hint: "This is the Guide. Search it, or jump to any part from the contents.",
    whatItIs:
      "Weekflow is a weekly planner. You capture tasks, tell it your working hours and limits, and it helps you fit the work into a week you can actually keep. You are always in charge: it suggests, you decide.",
    steps: [
      { text: "Home shows your week at a glance, your conflicts and your rules.", to: { route: "home", label: "Open Home" } },
      { text: "My Week is where you plan: drag tasks onto a calendar.", to: { route: "week", label: "Open My Week" } },
      { text: "Tasks is the full list, with search, filters and the inbox.", to: { route: "tasks", label: "Open Tasks" } },
      { text: "Calendar shows the whole month.", to: { route: "calendar", label: "Open Calendar" } },
      { text: "Review shows how the week went.", to: { route: "review", label: "Open Review" } },
      { text: "Settings holds your rules: hours, breaks, limits and the planner.", to: { route: "settings", label: "Open Settings" } },
    ],
    tips: [
      "Nothing is final. Plans are previewed first, and changes can be undone.",
      "Press / or Ctrl+K to search for any page or command.",
      "This demo keeps your data in this browser only. Nothing is sent anywhere.",
    ],
    shortcuts: [
      { keys: "/ or Ctrl+K", label: "Search and commands" },
      { keys: "H", label: "Help for the page you are on" },
    ],
    terms: ["engine"],
    tryIt: { route: "home", label: "Go to Home" },
  },
  {
    id: "home",
    title: "Home",
    route: "home",
    summary: "Your week at a glance, with conflicts and your active rules.",
    hint: "Home is your overview. Anything that needs attention shows up here first.",
    whatItIs:
      "Home answers 'how is my week looking?'. It shows weekly numbers, a compact calendar, scheduling conflicts with fixes you can apply, and the rules the planner follows.",
    steps: [
      { text: "Read the four numbers at the top: tasks, completed, overdue and free time." },
      { text: "Use Quick add to drop a task into your inbox in one line." },
      { text: "Open Plan my week to let Weekflow propose times for your inbox.", to: { route: "week", label: "Go to My Week" } },
      { text: "Check Scheduling conflicts and press a fix button to apply it." },
    ],
    tips: [
      "Quick add understands 'Write report 1h30 !high due fri'.",
      "A banner appears if tasks ran past their time and you chose to be asked first.",
      "Active Rules lists only the rules that are really switched on.",
    ],
    shortcuts: [
      { keys: "C", label: "New task" },
      { keys: "P", label: "Plan my week" },
    ],
    terms: ["conflict", "inbox"],
    tryIt: { route: "home", label: "Go to Home" },
  },
  {
    id: "week",
    title: "My Week",
    route: "week",
    summary: "Plan your week by dragging tasks onto a calendar.",
    hint: "Drag a task onto the calendar. Press L on a selected task to lock it.",
    whatItIs:
      "My Week is your planning table. Tasks without a time wait in the Unscheduled list. Drag them onto a day, move them around, and pull the bottom edge to change how long they take.",
    steps: [
      { text: "Drag a task from Unscheduled onto a day and time, or press Schedule to use the next free slot." },
      { text: "Drag a block to move it, or pull its bottom edge to resize it." },
      { text: "Lock a task that must not move, from its lock button or the L key." },
      { text: "Switch between Day, Week and Agenda views at the top." },
      { text: "Press Plan my week to have the planner fill your free time." },
    ],
    tips: [
      "Everything also works by keyboard: Enter to edit, arrows to move, Shift plus arrows to resize.",
      "Shaded areas are outside your working hours. You can still place tasks there, but you will get a warning.",
      "The bar under each day shows how full it is against your daily limit.",
    ],
    shortcuts: [
      { keys: "[ and ]", label: "Previous and next week" },
      { keys: ".", label: "Jump to today" },
      { keys: "L", label: "Lock or unlock the selected task" },
      { keys: "Shift + arrows", label: "Resize the selected task" },
    ],
    terms: ["lock", "inbox", "daily-limit"],
    tryIt: { route: "week", label: "Open My Week" },
  },
  {
    id: "tasks",
    title: "Tasks",
    route: "tasks",
    summary: "Every task in one list, with search, filters and checklists.",
    hint: "Search or filter your tasks. Tick the circle to complete one.",
    whatItIs:
      "Tasks is the complete list. Each task can have a length, a priority, a category, a deadline, notes, a checklist and dependencies on other tasks.",
    steps: [
      { text: "Press New task, or type in Quick add, to capture something." },
      { text: "Search by title and filter by status, priority or category." },
      { text: "Open a task to add a deadline, notes, a checklist or a dependency." },
      { text: "Tick a task to complete it. You can add the time it really took, to learn from your estimates." },
    ],
    tips: [
      "Deleting asks nothing, because it can always be undone from the message that appears.",
      "A task that depends on another cannot be planned before it.",
    ],
    shortcuts: [{ keys: "C", label: "New task" }],
    terms: ["inbox", "lock"],
    tryIt: { route: "tasks", label: "Open Tasks" },
  },
  {
    id: "calendar",
    title: "Calendar",
    route: "calendar",
    summary: "The whole month, with how busy each day is.",
    hint: "Pick a day to open it in My Week. Colours show how full each day is.",
    whatItIs:
      "Calendar is the month view. Each day shows its tasks and a fullness bar. Use it to spot heavy weeks and to jump to a day.",
    steps: [
      { text: "Use the arrows to change month." },
      { text: "Select a day to open it in My Week." },
      { text: "Filter by category to see one kind of work." },
    ],
    tips: ["A full or overloaded day is marked with text as well as colour."],
    shortcuts: [],
    terms: ["daily-limit"],
    tryIt: { route: "calendar", label: "Open Calendar" },
  },
  {
    id: "planning",
    title: "Planning and rules",
    summary: "How Plan my week decides, and the rules you control.",
    hint: "Plan my week shows a preview with a reason for every choice.",
    whatItIs:
      "Plan my week is a deterministic planner: the same tasks and rules always give the same plan. It places tasks by priority and deadline, in the first free time that respects your working hours, breaks, buffers, daily limit, dependencies and deadlines. It changes nothing until you press Apply, and you can undo.",
    steps: [
      { text: "Press Plan my week, from Home, My Week, the command menu or the P key." },
      { text: "Read the preview. Open 'Why here?' on any task to see the reasons." },
      { text: "Optionally switch on 'Also fix conflicts' to let it move unlocked tasks that break a rule." },
      { text: "Press Apply plan, or Cancel. Applying can be undone straight away." },
      { text: "Change the rules whenever you like.", to: { route: "settings", sub: "engine", label: "Open the scheduling rules" } },
    ],
    tips: [
      "Tasks that cannot fit are listed with the reason, never dropped silently.",
      "Locked tasks never move, whatever you choose.",
      "Preferring mornings or afternoons is a soft preference, not a rule.",
    ],
    shortcuts: [{ keys: "P", label: "Plan my week" }],
    terms: ["engine", "buffer", "daily-limit", "strict-deadline", "soft-deadline", "stability", "focus-time", "lock"],
    tryIt: { route: "settings", sub: "planning", label: "Open planning preferences" },
  },
  {
    id: "replan",
    title: "Replanning and history",
    summary: "What happens when tasks slip, and how to go back.",
    hint: "Missed tasks can be replanned. Schedule history lets you roll back.",
    whatItIs:
      "A task is missed when its time passes without it being done. Weekflow can replan those tasks for you, either after asking or automatically, and it saves your schedule before every bulk change so you can restore it.",
    steps: [
      { text: "Choose how it behaves in Settings, Scheduling engine: never, ask first, or automatic." },
      { text: "When asked first, a banner on Home offers a preview of a new plan." },
      { text: "Open Schedule history from the Review page or the command menu to restore an earlier version." },
    ],
    tips: [
      "Restoring keeps your edits to titles and notes, and leaves locked and finished tasks alone.",
      "A restore is itself saved, so you can undo it.",
    ],
    shortcuts: [],
    terms: ["missed", "schedule-history"],
    tryIt: { route: "settings", sub: "engine", label: "Open the scheduling rules" },
  },
  {
    id: "review",
    title: "Weekly review",
    route: "review",
    summary: "How the week went: workload, progress and what slipped.",
    hint: "See your workload, what got done and what slipped. Replan from here.",
    whatItIs:
      "The review shows workload per day against your limit, where the time went by category, how your estimates compared with reality, and lists of completed, missed, upcoming and due-soon tasks.",
    steps: [
      { text: "Look at Workload by day. The line marks your daily limit." },
      { text: "Check Missed, and press Replan missed tasks if any slipped." },
      { text: "Open Schedule history to go back to an earlier plan." },
    ],
    tips: [
      "Turn on the weekly review reminder in Settings, Notifications, to see a card on Home on the day you choose.",
      "Estimates versus reality needs the actual time on finished tasks.",
    ],
    shortcuts: [],
    terms: ["daily-limit", "missed", "schedule-history"],
    tryIt: { route: "review", label: "Open the review" },
  },
  {
    id: "settings",
    title: "Settings",
    route: "settings",
    summary: "Your hours, limits and how the planner behaves.",
    hint: "Changes save as you make them. Look for the (i) next to unfamiliar words.",
    whatItIs:
      "Settings holds your preferences. Planning preferences covers working days, hours, breaks, buffers and the daily limit. Scheduling engine covers how the planner decides. Appearance has themes, 15 colours, 12 backgrounds and glass surfaces.",
    steps: [
      { text: "Start with Planning preferences: set your days, hours and breaks.", to: { route: "settings", sub: "planning", label: "Open Planning preferences" } },
      { text: "Then Scheduling engine: choose strict or soft deadlines and how much to prefer stability.", to: { route: "settings", sub: "engine", label: "Open Scheduling engine" } },
      { text: "Make it yours in Appearance.", to: { route: "settings", sub: "appearance", label: "Open Appearance" } },
    ],
    tips: [
      "Each section can be reset to its defaults.",
      "Some options are saved now and start working in a later release. Their descriptions say so.",
    ],
    shortcuts: [],
    terms: ["buffer", "daily-limit", "strict-deadline", "soft-deadline", "stability", "focus-time"],
    tryIt: { route: "settings", sub: "planning", label: "Open Planning preferences" },
  },
  {
    id: "profile",
    title: "Profile",
    route: "profile",
    summary: "Your name, avatar and demo account details.",
    hint: "Your details live in this browser only. Accounts arrive in a later release.",
    whatItIs: "Profile holds your name and contact details. In the demo they stay in your browser.",
    steps: [{ text: "Edit your name and details, then save." }],
    tips: ["Sign-in and real accounts arrive with the database release."],
    shortcuts: [],
    terms: [],
    tryIt: { route: "profile", label: "Open Profile" },
  },
  {
    id: "team",
    title: "Team",
    route: "team",
    summary: "Shared planning with a team. Coming soon.",
    hint: "Team workspaces are not built yet. This page says what is planned.",
    whatItIs:
      "Team workspaces will let you share projects and tasks, assign work and see team availability, without ever touching anyone's personal time.",
    steps: [],
    tips: [],
    shortcuts: [],
    terms: [],
    comingIn: "0.0.8",
  },
  {
    id: "changelog",
    title: "Version history",
    route: "changelog",
    summary: "Everything that changed in each release.",
    hint: "Each release lists what was added. The newest is at the top.",
    whatItIs: "Version history is the log of every release, newest first, with a short summary and the changes in each.",
    steps: [{ text: "Scroll the timeline, or open an older release." }],
    tips: ["The version shown in the sidebar matches the newest entry here."],
    shortcuts: [],
    terms: [],
    tryIt: { route: "changelog", label: "Open Version history" },
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    summary: "Every shortcut in one place.",
    hint: "Press ? any time to see every keyboard shortcut.",
    whatItIs: "Shortcuts are switched off while you type in a field. Press ? to see the full list in a dialog.",
    steps: [
      { text: "Go to a page with G then a letter, for example G then W for My Week." },
      { text: "Press C to add a task, P to plan, H for help, / to search." },
    ],
    tips: ["On the calendar, [ and ] change week and . jumps to today."],
    shortcuts: [
      { keys: "?", label: "Show all shortcuts" },
      { keys: "H", label: "Help for this page" },
      { keys: "C", label: "New task" },
      { keys: "P", label: "Plan my week" },
      { keys: "G then H, W, T, C, R, M, P, S, U, V", label: "Go to a page" },
    ],
    terms: [],
  },
];

const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
const BY_ROUTE = new Map(SECTIONS.flatMap((s) => (s.route ? [[s.route, s] as const] : [])));

export function sectionById(id: string): GuideSection | undefined {
  return BY_ID.get(id);
}

/** The section that describes a screen. Every route has one (tested). */
export function sectionForRoute(route: AppRoute): GuideSection {
  const section = BY_ROUTE.get(route);
  if (!section) throw new Error(`No guide section for route: ${route}`);
  return section;
}
```

- [ ] **Step 4: Run** `npx vitest run src/guide/content.test.ts` → PASS (7 tests). If "keeps hints to one short line" fails, shorten the offending hint.

- [ ] **Step 5: Commit**

```bash
git add src/lib/routes.ts src/lib/routes.test.ts src/guide
git commit -m "feat(guide): content model, glossary and sections with coverage tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Guide search

**Files:**
- Create: `src/guide/search.ts`, `src/guide/search.test.ts`

- [ ] **Step 1: Failing test** `src/guide/search.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { searchGuide } from "./search";
import { SECTIONS } from "./content";
import { TERMS } from "./terms";

describe("searchGuide", () => {
  it("returns everything for an empty query", () => {
    const result = searchGuide("   ");
    expect(result.sections).toHaveLength(SECTIONS.length);
    expect(result.terms).toHaveLength(TERMS.length);
  });

  it("matches titles, steps, tips and glossary words, ignoring case", () => {
    expect(searchGuide("LOCK").sections.map((s) => s.id)).toContain("week");
    expect(searchGuide("buffer").terms.map((t) => t.id)).toContain("buffer");
    expect(searchGuide("restore").sections.map((s) => s.id)).toContain("replan");
  });

  it("requires every word to match", () => {
    expect(searchGuide("lock zebra").sections).toHaveLength(0);
  });

  it("returns nothing for gibberish", () => {
    const result = searchGuide("qzxqzx");
    expect(result.sections).toHaveLength(0);
    expect(result.terms).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run** → FAIL (missing module).

- [ ] **Step 3: Create `src/guide/search.ts`**

```ts
import { SECTIONS } from "./content";
import { TERMS } from "./terms";
import type { GuideSection, GuideTerm } from "./types";

export interface GuideSearchResult {
  sections: readonly GuideSection[];
  terms: readonly GuideTerm[];
}

const sectionText = (s: GuideSection): string =>
  [s.title, s.summary, s.whatItIs, ...s.steps.map((st) => st.text), ...s.tips, ...s.shortcuts.map((k) => k.label)]
    .join(" ")
    .toLowerCase();

const termText = (t: GuideTerm): string => [t.word, t.plain, t.whyItMatters].join(" ").toLowerCase();

/** Plain substring search. Every word in the query must appear. */
export function searchGuide(query: string): GuideSearchResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { sections: SECTIONS, terms: TERMS };
  const hits = (text: string): boolean => words.every((w) => text.includes(w));
  return {
    sections: SECTIONS.filter((s) => hits(sectionText(s))),
    terms: TERMS.filter((t) => hits(termText(t))),
  };
}
```

- [ ] **Step 4: Run** `npx vitest run src/guide/search.test.ts` → PASS.
- [ ] **Step 5: Commit** `git add src/guide/search.ts src/guide/search.test.ts && git commit -m "feat(guide): in-page search" ` (with the Co-Authored-By trailer as in Task 3).

---

### Task 5: Checklist progress (pure)

**Files:**
- Create: `src/guide/progress.ts`, `src/guide/progress.test.ts`

- [ ] **Step 1: Failing test** `src/guide/progress.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import { STEPS, stepsFromPath, stepsFromTaskChange } from "./progress";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 30, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  ...extra,
});
const placed = { date: "2026-10-14", startMin: 600 };

describe("stepsFromTaskChange", () => {
  const base = [task("a"), task("b")];

  it("ticks add-task for exactly one new task with all old ones kept", () => {
    expect(stepsFromTaskChange(base, [...base, task("c")])).toEqual(["add-task"]);
  });

  it("ticks schedule-task when an existing task gains a place", () => {
    const next = [{ ...base[0]!, placement: placed }, base[1]!];
    expect(stepsFromTaskChange(base, next)).toEqual(["schedule-task"]);
  });

  it("ticks lock-task when an existing task becomes locked", () => {
    const prev = [task("a", { placement: placed }), base[1]!];
    const next = [{ ...prev[0]!, locked: true }, prev[1]!];
    expect(stepsFromTaskChange(prev, next)).toEqual(["lock-task"]);
  });

  it("ticks nothing when tasks are replaced wholesale (a scenario load)", () => {
    const scenario = [task("x", { placement: placed }), task("y", { placement: placed, locked: true }), task("z")];
    expect(stepsFromTaskChange(base, scenario)).toEqual([]);
  });

  it("ticks nothing for several new tasks at once, or for no change", () => {
    expect(stepsFromTaskChange(base, [...base, task("c"), task("d")])).toEqual([]);
    expect(stepsFromTaskChange(base, base)).toEqual([]);
  });

  it("does not tick when a placement is removed or a lock is released", () => {
    const prev = [task("a", { placement: placed, locked: true })];
    expect(stepsFromTaskChange(prev, [{ ...prev[0]!, locked: false }])).toEqual([]);
    expect(stepsFromTaskChange(prev, [{ ...prev[0]!, locked: false, placement: null }])).toEqual([]);
  });
});

describe("stepsFromPath", () => {
  it("ticks check-rules on Settings, Planning only", () => {
    expect(stepsFromPath("/demo/settings/planning")).toEqual(["check-rules"]);
    expect(stepsFromPath("/demo/settings/engine")).toEqual([]);
    expect(stepsFromPath("/demo/settings")).toEqual([]);
  });
  it("ticks open-review on the Review page", () => {
    expect(stepsFromPath("/demo/review")).toEqual(["open-review"]);
  });
  it("ticks nothing elsewhere", () => {
    expect(stepsFromPath("/demo/home")).toEqual([]);
  });
});

describe("STEPS", () => {
  it("lists the six steps with unique ids", () => {
    expect(STEPS).toHaveLength(6);
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(6);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/guide/progress.ts`**

```ts
import type { Task } from "@/domain/tasks";
import { appPath, type AppRoute } from "@/lib/routes";

export type StepId =
  | "add-task"
  | "schedule-task"
  | "lock-task"
  | "preview-plan"
  | "check-rules"
  | "open-review";

export interface ChecklistStep {
  id: StepId;
  label: string;
  hint: string;
  to: { route: AppRoute; sub?: string };
}

/** The Start here checklist, in order. */
export const STEPS: readonly ChecklistStep[] = [
  { id: "add-task", label: "Add a task", hint: "Use Quick add on Home or the New task button.", to: { route: "home" } },
  { id: "schedule-task", label: "Put a task on your calendar", hint: "Drag it onto a day, or press Schedule.", to: { route: "week" } },
  { id: "lock-task", label: "Lock a task", hint: "Pin one so it never moves. Select it and press L.", to: { route: "week" } },
  { id: "preview-plan", label: "Preview a plan", hint: "Open Plan my week and read the reasons.", to: { route: "week" } },
  { id: "check-rules", label: "Check your rules", hint: "See your hours, breaks and daily limit.", to: { route: "settings", sub: "planning" } },
  { id: "open-review", label: "Open the weekly review", hint: "See your workload and what got done.", to: { route: "review" } },
];

/**
 * Which steps a change in the task list completes. Every earlier task must
 * still exist, so replacing the whole list (loading a demo scenario) never
 * counts as the user doing something.
 */
export function stepsFromTaskChange(prev: readonly Task[], next: readonly Task[]): StepId[] {
  if (prev === next) return [];
  const before = new Map(prev.map((t) => [t.id, t] as const));
  const nextIds = new Set(next.map((t) => t.id));
  if (![...before.keys()].every((id) => nextIds.has(id))) return [];

  const steps: StepId[] = [];
  const added = next.filter((t) => !before.has(t.id));
  if (added.length === 1) steps.push("add-task");

  for (const task of next) {
    const old = before.get(task.id);
    if (!old) continue;
    if (old.placement === null && task.placement !== null && task.status === "todo" && !steps.includes("schedule-task")) {
      steps.push("schedule-task");
    }
    if (!old.locked && task.locked && !steps.includes("lock-task")) steps.push("lock-task");
  }
  return steps;
}

/** Steps completed by visiting a page. */
export function stepsFromPath(pathname: string): StepId[] {
  if (pathname === appPath("settings", "planning")) return ["check-rules"];
  if (pathname === appPath("review")) return ["open-review"];
  return [];
}
```

- [ ] **Step 4: Run** `npx vitest run src/guide/progress.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(guide): checklist step detection (pure)`.

---

### Task 6: Progress store

**Files:**
- Create: `src/guide/store.ts`, `src/guide/store.test.ts`

- [ ] **Step 1: Failing test** `src/guide/store.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useGuideStore } from "./store";

beforeEach(() => {
  window.localStorage.clear();
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("guide store", () => {
  it("records completed steps and never un-ticks them", () => {
    useGuideStore.getState().complete(["add-task"]);
    useGuideStore.getState().complete(["lock-task", "add-task"]);
    expect(useGuideStore.getState().done).toEqual({ "add-task": true, "lock-task": true });
  });

  it("does not change state when nothing is new", () => {
    useGuideStore.getState().complete(["add-task"]);
    const before = useGuideStore.getState().done;
    useGuideStore.getState().complete(["add-task"]);
    expect(useGuideStore.getState().done).toBe(before);
  });

  it("hides, shows and dismisses hints", () => {
    useGuideStore.getState().hidePanel();
    expect(useGuideStore.getState().panelHidden).toBe(true);
    useGuideStore.getState().dismissHint("week");
    expect(useGuideStore.getState().dismissedHints).toEqual({ week: true });
  });

  it("replay clears ticks, hints and shows the panel again", () => {
    const s = useGuideStore.getState();
    s.complete(["add-task"]);
    s.hidePanel();
    s.dismissHint("week");
    s.replay();
    const after = useGuideStore.getState();
    expect(after.done).toEqual({});
    expect(after.dismissedHints).toEqual({});
    expect(after.panelHidden).toBe(false);
  });

  it("ignores corrupt saved data", () => {
    window.localStorage.setItem("weekflow:demo:guide", "{not json");
    useGuideStore.persist.rehydrate();
    expect(useGuideStore.getState().done).toEqual({});
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/guide/store.ts`**

```ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { APP_ROUTES, type AppRoute } from "@/lib/routes";
import type { StepId } from "./progress";

export const GUIDE_STORAGE_KEY = "weekflow:demo:guide";

const stepIds = ["add-task", "schedule-task", "lock-task", "preview-plan", "check-rules", "open-review"] as const;
const persistedSchema = z.object({
  done: z.partialRecord(z.enum(stepIds), z.literal(true)).default({}),
  panelHidden: z.boolean().default(false),
  dismissedHints: z.partialRecord(z.enum(APP_ROUTES), z.literal(true)).default({}),
});

interface GuideState {
  done: Partial<Record<StepId, true>>;
  panelHidden: boolean;
  dismissedHints: Partial<Record<AppRoute, true>>;
  /** True once saved progress has been read. Surfaces wait for it to avoid a flash. */
  hydrated: boolean;
  complete: (ids: readonly StepId[]) => void;
  hidePanel: () => void;
  showPanel: () => void;
  dismissHint: (route: AppRoute) => void;
  /** Start over: show Start here again with nothing ticked and every hint back. */
  replay: () => void;
}

/**
 * Onboarding progress. Browser-only like the rest of the demo; it moves to the
 * account in 0.1.0. Hydration is manual so server and first client render agree.
 */
export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      done: {},
      panelHidden: false,
      dismissedHints: {},
      hydrated: false,
      complete: (ids) =>
        set((state) => {
          const fresh = ids.filter((id) => !state.done[id]);
          if (fresh.length === 0) return state;
          return { done: { ...state.done, ...Object.fromEntries(fresh.map((id) => [id, true as const])) } };
        }),
      hidePanel: () => set({ panelHidden: true }),
      showPanel: () => set({ panelHidden: false }),
      dismissHint: (route) => set((state) => ({ dismissedHints: { ...state.dismissedHints, [route]: true } })),
      replay: () => set({ done: {}, dismissedHints: {}, panelHidden: false }),
    }),
    {
      name: GUIDE_STORAGE_KEY,
      version: 1,
      skipHydration: true,
      partialize: (state) => ({
        done: state.done,
        panelHidden: state.panelHidden,
        dismissedHints: state.dismissedHints,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return { ...current, ...(parsed.success ? parsed.data : { done: {}, panelHidden: false, dismissedHints: {} }) };
      },
    },
  ),
);
```

- [ ] **Step 4: Run** `npx vitest run src/guide/store.test.ts`. If `z.partialRecord` is not found in the installed Zod 4, replace it with `z.record(z.enum(stepIds), z.literal(true)).default({})` and the same for hints. Expect PASS.
- [ ] **Step 5: Commit** `feat(guide): persisted onboarding progress store`.

---

### Task 7: Tracker + UI-store flags

**Files:**
- Modify: `src/stores/ui.ts`
- Create: `src/guide/tracker.tsx`, `src/guide/tracker.test.tsx`

- [ ] **Step 1: Modify `src/stores/ui.ts`**: add help state. Using a normalising script:

```bash
node - <<'EOF'
const fs=require("fs");const p="src/stores/ui.ts";let s=fs.readFileSync(p,"utf8").replace(/\r\n/g,"\n");
const rep=(a,b)=>{if(!s.includes(a))throw new Error("missing "+a);s=s.replace(a,b);};
rep("  historyOpen: boolean;\n  editor","  historyOpen: boolean;\n  helpOpen: boolean;\n  editor");
rep("  setHistoryOpen: (open: boolean) => void;\n","  setHistoryOpen: (open: boolean) => void;\n  setHelpOpen: (open: boolean) => void;\n");
rep("  historyOpen: false,\n  editor","  historyOpen: false,\n  helpOpen: false,\n  editor");
rep("  setHistoryOpen: (historyOpen) => set({ historyOpen }),\n","  setHistoryOpen: (historyOpen) => set({ historyOpen }),\n  setHelpOpen: (helpOpen) => set({ helpOpen }),\n");
fs.writeFileSync(p,s);
EOF
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Failing test** `src/guide/tracker.test.tsx`

```tsx
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { buildTask } from "@/domain/task-ops";
import { useUiStore } from "@/stores/ui";
import { GuideTracker } from "./tracker";
import { useGuideStore } from "./store";

let pathname = "/demo/home";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const mk = (id: string) => buildTask({ title: id, durationMin: 30, priority: "low" }, id, "2026-10-12T00:00:00.000Z");

beforeEach(() => {
  window.localStorage.clear();
  pathname = "/demo/home";
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: false });
  useUiStore.setState({ planOpen: false });
  act(() => tasksCollection.write([mk("a"), mk("b")]));
});

describe("GuideTracker", () => {
  it("marks the guide store hydrated", () => {
    render(<GuideTracker />);
    expect(useGuideStore.getState().hydrated).toBe(true);
  });

  it("ticks add, schedule and lock from real task changes", () => {
    render(<GuideTracker />);
    act(() => tasksCollection.write([mk("a"), mk("b"), mk("c")]));
    expect(useGuideStore.getState().done["add-task"]).toBe(true);

    act(() =>
      tasksCollection.write([
        { ...mk("a"), placement: { date: "2026-10-14", startMin: 600 } },
        mk("b"),
        mk("c"),
      ]),
    );
    expect(useGuideStore.getState().done["schedule-task"]).toBe(true);

    act(() =>
      tasksCollection.write([
        { ...mk("a"), placement: { date: "2026-10-14", startMin: 600 }, locked: true },
        mk("b"),
        mk("c"),
      ]),
    );
    expect(useGuideStore.getState().done["lock-task"]).toBe(true);
  });

  it("does not tick anything when the whole list is replaced", () => {
    render(<GuideTracker />);
    act(() => tasksCollection.write([mk("x"), mk("y"), mk("z")]));
    expect(useGuideStore.getState().done).toEqual({});
  });

  it("ticks preview-plan when the plan dialog opens", () => {
    render(<GuideTracker />);
    act(() => useUiStore.getState().setPlanOpen(true));
    expect(useGuideStore.getState().done["preview-plan"]).toBe(true);
  });

  it("ticks check-rules and open-review from the page visited", () => {
    pathname = "/demo/settings/planning";
    const { rerender } = render(<GuideTracker />);
    expect(useGuideStore.getState().done["check-rules"]).toBe(true);
    pathname = "/demo/review";
    rerender(<GuideTracker />);
    expect(useGuideStore.getState().done["open-review"]).toBe(true);
  });
});
```

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Create `src/guide/tracker.tsx`**

```tsx
"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { tasksCollection } from "@/data/tasks";
import { useUiStore } from "@/stores/ui";
import { stepsFromPath, stepsFromTaskChange } from "./progress";
import { useGuideStore } from "./store";

/**
 * Mounted once in the app shell. It loads saved progress, then ticks the
 * Start here steps from what the user really does: changes to their tasks,
 * the page they open and the plan preview. It renders nothing.
 */
export function GuideTracker(): null {
  const pathname = usePathname();
  const complete = useGuideStore((s) => s.complete);

  // Load saved progress first, before any step can be ticked.
  useLayoutEffect(() => {
    useGuideStore.persist.rehydrate();
    useGuideStore.setState({ hydrated: true });
  }, []);

  useLayoutEffect(() => {
    let previous = tasksCollection.getSnapshot();
    return tasksCollection.subscribe(() => {
      const next = tasksCollection.getSnapshot();
      complete(stepsFromTaskChange(previous, next));
      previous = next;
    });
  }, [complete]);

  useLayoutEffect(() => {
    complete(stepsFromPath(pathname));
  }, [pathname, complete]);

  useLayoutEffect(() => {
    return useUiStore.subscribe((state, prev) => {
      if (state.planOpen && !prev.planOpen) complete(["preview-plan"]);
    });
  }, [complete]);

  return null;
}
```

- [ ] **Step 5: Run** `npx vitest run src/guide/tracker.test.tsx` → PASS.
- [ ] **Step 6: Mount in `src/components/shell/app-shell.tsx`**: add `import { GuideTracker } from "@/guide/tracker";` and render `<GuideTracker />` directly after `<PlanDialog />` (use the same normalising script pattern).
- [ ] **Step 7: Commit** `feat(guide): tracker ticks steps from real actions`.

---

### Task 8: (i) Term popover

**Files:**
- Create: `src/components/ui/popover.tsx`, `src/components/guide/term.tsx`, `src/components/guide/term.test.tsx`
- Modify: `src/components/settings/controls.tsx` (add `hint` to `SettingRow`)

- [ ] **Step 1: Create `src/components/ui/popover.tsx`**

```tsx
"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lift ring-1 ring-foreground/10 outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

const PopoverTitle = PopoverPrimitive.Title
const PopoverDescription = PopoverPrimitive.Description

export { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }
```

- [ ] **Step 2: Failing test** `src/components/guide/term.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Term } from "./term";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Term", () => {
  it("is a labelled button that explains the word on click", () => {
    render(<Term id="buffer" />);
    const button = screen.getByRole("button", { name: "What is Buffer?" });
    expect(screen.queryByText(/gap Weekflow keeps/)).toBeNull();
    fireEvent.click(button);
    expect(screen.getByText(/gap Weekflow keeps/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /More in the Guide/ }).getAttribute("href")).toBe("/demo/guide#term-buffer");
  });

  it("links to the related setting when there is one", () => {
    render(<Term id="stability" />);
    fireEvent.click(screen.getByRole("button", { name: "What is Stability?" }));
    expect(screen.getByRole("link", { name: /Scheduling engine/ }).getAttribute("href")).toBe("/demo/settings/engine");
  });
});
```

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Create `src/components/guide/term.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { termById, type TermId } from "@/guide/terms";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * A small (i) next to a confusing word. Opens on click, Enter or Space, so it
 * works on touch and with a keyboard. The icon is 24px with a 44px tap area.
 */
export function Term({ id, className }: { id: TermId; className?: string }) {
  const term = termById(id);
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`What is ${term.word}?`}
        className={cn(
          "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none after:absolute after:-inset-2.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle className="text-sm font-semibold">{term.word}</PopoverTitle>
        <PopoverDescription className="mt-1 text-sm">{term.plain}</PopoverDescription>
        <p className="mt-2 text-sm text-muted-foreground">{term.whyItMatters}</p>
        <div className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-primary-text">
          {term.setting ? (
            <Link href={appPath(term.setting.route, term.setting.sub)} className="hover:underline">
              Open {term.setting.label}
            </Link>
          ) : null}
          <Link href={`${appPath("guide")}#term-${term.id}`} className="hover:underline">
            More in the Guide
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run src/components/guide/term.test.tsx` → PASS.
- [ ] **Step 6: Add `hint` to `SettingRow`** in `src/components/settings/controls.tsx`. Change the props type to add `hint?: ReactNode;`, destructure `hint`, and replace the label markup:

```tsx
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {hint}
        </div>
```
(replacing the bare `<label htmlFor={id} className="text-sm font-medium">{label}</label>`).
- [ ] **Step 7: Commit** `feat(guide): (i) term popover`.

---

### Task 9: Place (i) tips where the jargon is

**Files (modify):** `src/screens/settings/panes/planning.tsx`, `src/screens/settings/panes/engine.tsx`, `src/components/plan/plan-dialog.tsx`, `src/components/home/active-rules-bar.tsx`, `src/components/calendar/unscheduled-tray.tsx`

Use a normalising Node script like earlier tasks. Each edit adds `import { Term } from "@/components/guide/term";` and one `<Term id="…" />`:

- [ ] **Step 1: Planning pane.**
  - `<SettingRow label="Maximum daily workload"` → add prop `hint={<Term id="daily-limit" />}`.
  - `<SettingRow label="Buffer between tasks"` → `hint={<Term id="buffer" />}`.
  - `<SettingsGroup title="Focus time">` group: change `<ToggleRow label="Keep focus time"` to be preceded by nothing; instead add `hint` is not supported on `ToggleRow`, so change `SettingsGroup title="Focus time"` to `description="Uninterrupted time for deep work. See what it does in the Guide."` is NOT needed. Use `<SettingRow label="Focus block length" hint={<Term id="focus-time" />}>` for the (i).
- [ ] **Step 2: Engine pane.**
  - `<SettingRow label="Deadline behavior"` → `hint={<><Term id="strict-deadline" /><Term id="soft-deadline" /></>}`.
  - `<SettingRow label="Stability weight"` → `hint={<Term id="stability" />}`.
  - `<SettingRow label="Auto-rescheduling"` → `hint={<Term id="missed" />}`.
- [ ] **Step 3: Plan dialog.** In `plan-dialog.tsx` change the two label blocks: `<span className="block text-sm font-medium">Also fix conflicts</span>` → `<span className="flex items-center gap-1 text-sm font-medium">Also fix conflicts <Term id="conflict" /></span>`; the "Replan missed tasks" span likewise with `<Term id="missed" />`. A `Term` inside a `<label>` toggles the switch when clicked, so give it `className="pointer-events-auto"` and wrap it: `<span onClick={(e) => e.preventDefault()}><Term id="conflict" /></span>`.
- [ ] **Step 4: Rules bar.** In `active-rules-bar.tsx` change the heading to `<h2 id="rules-title" className="flex items-center gap-1 text-sm font-semibold">Active Rules <Term id="engine" /></h2>`.
- [ ] **Step 5: Tray.** In `unscheduled-tray.tsx` change the heading text `Unscheduled` to `Unscheduled <Term id="inbox" />` and its `<h2>` className to include `flex items-center gap-1`.
- [ ] **Step 6: Run** `npx tsc --noEmit && npx vitest run` → all pass (existing plan-dialog tests must still find buttons by name). If `plan-dialog.test.tsx` fails because of the extra buttons, query with `getByRole("button", { name: /Apply plan/ })` (already used) and keep going.
- [ ] **Step 7: Commit** `feat(guide): (i) tips on settings, plan dialog, rules bar and inbox`.

---

### Task 10: Help panel, button and H key

**Files:**
- Create: `src/components/guide/help-panel.tsx`, `src/components/guide/help-button.tsx`, `src/components/guide/help.test.tsx`
- Modify: `src/components/shell/page-header.tsx`, `src/components/shell/app-shell.tsx`, `src/components/shell/shortcuts.tsx`

- [ ] **Step 1: Failing test** `src/components/guide/help.test.tsx`

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { HelpButton } from "./help-button";
import { HelpPanel } from "./help-panel";

let pathname = "/demo/week";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  pathname = "/demo/week";
  useUiStore.setState({ helpOpen: false });
});

describe("help panel", () => {
  it("opens from the button and shows the current screen's guide", () => {
    render(
      <>
        <HelpButton />
        <HelpPanel />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Help for this page" }));
    expect(screen.getByRole("heading", { name: /My Week/ })).toBeTruthy();
    expect(screen.getByText(/Drag a task from Unscheduled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Read the full guide/ }).getAttribute("href")).toBe("/demo/guide#week");
  });

  it("follows the route", () => {
    pathname = "/demo/review";
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    expect(screen.getByRole("heading", { name: /Weekly review/ })).toBeTruthy();
  });

  it("explains an unbuilt screen honestly", () => {
    pathname = "/demo/team";
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    expect(screen.getByText(/Arrives in version 0.0.8/)).toBeTruthy();
  });

  it("closes with Escape", () => {
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(useUiStore.getState().helpOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/components/guide/help-panel.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hourglass } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { sectionForRoute } from "@/guide/content";
import { termById } from "@/guide/terms";
import { useMediaQuery } from "@/hooks/use-media-query";
import { appPath, routeOfPath } from "@/lib/routes";
import { useUiStore } from "@/stores/ui";
import { Term } from "./term";

/** The guide for the screen you are on: what it is, what to try, shortcuts and words. */
export function HelpPanel() {
  const open = useUiStore((s) => s.helpOpen);
  const setOpen = useUiStore((s) => s.setHelpOpen);
  const route = routeOfPath(usePathname()) ?? "guide";
  const section = sectionForRoute(route);
  const wide = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={wide ? "right" : "bottom"} className="max-h-[85dvh] overflow-y-auto p-5 sm:max-h-none">
        <SheetHeader className="p-0">
          <SheetTitle>About {section.title}</SheetTitle>
          <SheetDescription>{section.summary}</SheetDescription>
        </SheetHeader>

        {section.comingIn ? (
          <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-3 text-sm text-info-text">
            <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Arrives in version {section.comingIn}. {section.whatItIs}
          </p>
        ) : (
          <>
            <p className="text-sm">{section.whatItIs}</p>
            {section.steps.length > 0 ? (
              <section aria-label="Try this first">
                <h3 className="text-sm font-semibold">Try this first</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                  {section.steps.map((step) => (
                    <li key={step.text}>
                      {step.text}
                      {step.to ? (
                        <>
                          {" "}
                          <Link href={appPath(step.to.route, step.to.sub)} onClick={() => setOpen(false)} className="font-medium text-primary-text hover:underline">
                            {step.to.label}
                          </Link>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {section.tips.length > 0 ? (
              <section aria-label="Good to know">
                <h3 className="text-sm font-semibold">Good to know</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {section.shortcuts.length > 0 ? (
          <section aria-label="Shortcuts on this page">
            <h3 className="text-sm font-semibold">Shortcuts</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {section.shortcuts.map((shortcut) => (
                <div key={shortcut.keys} className="contents">
                  <dt>
                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{shortcut.keys}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{shortcut.label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {section.terms.length > 0 ? (
          <section aria-label="Words used on this page">
            <h3 className="text-sm font-semibold">Words used here</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {section.terms.map((id) => (
                <li key={id} className="flex items-center gap-1">
                  {termById(id).word}
                  <Term id={id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Link
          href={`${appPath("guide")}#${section.id}`}
          onClick={() => setOpen(false)}
          className="mt-auto inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline"
        >
          Read the full guide
        </Link>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create `src/components/guide/help-button.tsx`**

```tsx
"use client";

import { CircleHelp } from "lucide-react";
import { useUiStore } from "@/stores/ui";

export function HelpButton() {
  const setOpen = useUiStore((s) => s.setHelpOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Help for this page"
      aria-keyshortcuts="H"
      className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      <CircleHelp className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run src/components/guide/help.test.tsx` → PASS. (If the Escape test cannot find a focused element, dispatch the keydown on `document.body`; Base UI listens at the document.)

- [ ] **Step 6: Wire up.** With the normalising script:
  - `page-header.tsx`: `import { HelpButton } from "@/components/guide/help-button";` and render `<HelpButton />` immediately before `<SearchButton />`.
  - `app-shell.tsx`: `import { HelpPanel } from "@/components/guide/help-panel";` and render `<HelpPanel />` after `<HistoryDialog />`.
  - `shortcuts.tsx`: in the keydown handler change `else if (key === "p") {` branch chain by inserting, before it: `else if (key === "h") {\n        event.preventDefault();\n        ui.setHelpOpen(!ui.helpOpen);\n      }`. (`g then h` still reaches Home first because the `pendingG` branch returns earlier.) In `ShortcutsDialog` add before "Plan my week": `<dt>Help for this page</dt><dd><Kbd>H</Kbd></dd>`.
- [ ] **Step 7: Run** `npx tsc --noEmit && npx vitest run` → pass.
- [ ] **Step 8: Commit** `feat(guide): help panel, button and H shortcut`.

---

### Task 11: First-visit hint

**Files:**
- Create: `src/components/guide/screen-hint.tsx`, `src/components/guide/screen-hint.test.tsx`
- Modify: `src/components/shell/app-shell.tsx`

- [ ] **Step 1: Failing test** `src/components/guide/screen-hint.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuideStore } from "@/guide/store";
import { ScreenHint } from "./screen-hint";

let pathname = "/demo/week";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/demo/week";
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("ScreenHint", () => {
  it("shows the screen's hint once and remembers the dismissal", () => {
    const { container } = render(<ScreenHint />);
    expect(screen.getByText(/Drag a task onto the calendar/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(container).toBeEmptyDOMElement();
    expect(useGuideStore.getState().dismissedHints.week).toBe(true);
  });

  it("waits for saved progress before showing anything", () => {
    useGuideStore.setState({ hydrated: false });
    const { container } = render(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays away from the Guide, the changelog and Home while Start here is showing", () => {
    pathname = "/demo/guide";
    const { container, rerender } = render(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
    pathname = "/demo/home";
    rerender(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows on Home once Start here is hidden", () => {
    pathname = "/demo/home";
    useGuideStore.setState({ panelHidden: true });
    render(<ScreenHint />);
    expect(screen.getByText(/Home is your overview/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/components/guide/screen-hint.tsx`**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Lightbulb, X } from "lucide-react";
import { sectionForRoute } from "@/guide/content";
import { STEPS } from "@/guide/progress";
import { useGuideStore } from "@/guide/store";
import { routeOfPath } from "@/lib/routes";

const NEVER = new Set(["guide", "changelog"]);

/** One short line the first time a screen is opened. Dismissed once, gone for good. */
export function ScreenHint() {
  const route = routeOfPath(usePathname());
  const { hydrated, dismissedHints, done, panelHidden, dismissHint } = useGuideStore();
  if (!hydrated || !route || NEVER.has(route) || dismissedHints[route]) return null;

  // Home already has Start here while it is visible.
  const startHereVisible = !panelHidden && STEPS.some((s) => !done[s.id]);
  if (route === "home" && startHereVisible) return null;

  return (
    <p className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-2.5 text-sm text-primary-soft-text">
      <span className="flex items-center gap-2">
        <Lightbulb className="size-4 shrink-0" aria-hidden="true" />
        {sectionForRoute(route).hint}
      </span>
      <button
        type="button"
        onClick={() => dismissHint(route)}
        aria-label="Got it"
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg font-medium hover:bg-card/60"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </p>
  );
}
```

- [ ] **Step 4: Mount** in `app-shell.tsx`: `import { ScreenHint } from "@/components/guide/screen-hint";` and render `<ScreenHint />` as the first child inside `<main …>` (before `{children}`).
- [ ] **Step 5: Run** `npx vitest run src/components/guide/screen-hint.test.tsx` → PASS.
- [ ] **Step 6: Commit** `feat(guide): first-visit screen hints`.

---

### Task 12: Start here panel on Home

**Files:**
- Create: `src/components/guide/start-here.tsx`, `src/components/guide/start-here.test.tsx`
- Modify: `src/screens/home/home-screen.tsx`

- [ ] **Step 1: Failing test** `src/components/guide/start-here.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuideStore } from "@/guide/store";
import { StartHere } from "./start-here";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("StartHere", () => {
  it("shows three doors and the progress count", () => {
    render(<StartHere />);
    expect(screen.getByRole("heading", { name: "Start here" })).toBeTruthy();
    expect(screen.getByText("0 of 6 done")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Map" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Do" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Learn" })).toBeTruthy();
  });

  it("marks finished steps in text, not just colour", () => {
    useGuideStore.setState({ done: { "add-task": true } });
    render(<StartHere />);
    expect(screen.getByText("1 of 6 done")).toBeTruthy();
    expect(screen.getByText("Done: Add a task")).toBeTruthy();
  });

  it("can be hidden, then replayed", () => {
    const { rerender } = render(<StartHere />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    rerender(<StartHere />);
    expect(screen.queryByRole("heading", { name: "Start here" })).toBeNull();
    expect(screen.getByRole("link", { name: /Open the Guide/ })).toBeTruthy();
  });

  it("collapses to a Guide link when all six steps are done", () => {
    useGuideStore.setState({
      done: { "add-task": true, "schedule-task": true, "lock-task": true, "preview-plan": true, "check-rules": true, "open-review": true },
    });
    render(<StartHere />);
    expect(screen.queryByRole("heading", { name: "Start here" })).toBeNull();
    expect(screen.getByRole("link", { name: /Open the Guide/ })).toBeTruthy();
  });

  it("renders nothing until saved progress is loaded", () => {
    useGuideStore.setState({ hydrated: false });
    const { container } = render(<StartHere />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/components/guide/start-here.tsx`**

```tsx
"use client";

import Link from "next/link";
import { BookOpen, CircleCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS } from "@/guide/content";
import { STEPS } from "@/guide/progress";
import { useGuideStore } from "@/guide/store";
import { termById, type TermId } from "@/guide/terms";
import { appPath } from "@/lib/routes";
import { Term } from "./term";

const MAP_IDS = ["home", "week", "tasks", "calendar", "review", "settings"] as const;
const LEARN: readonly TermId[] = ["inbox", "lock", "buffer", "strict-deadline", "stability"];

/**
 * First-run help on Home: a map of the app, a checklist that ticks off as you
 * really do things, and the words people trip on. Collapses when finished.
 */
export function StartHere() {
  const { hydrated, done, panelHidden, hidePanel } = useGuideStore();
  if (!hydrated) return null;

  const count = STEPS.filter((s) => done[s.id]).length;
  const finished = count === STEPS.length;

  if (panelHidden || finished) {
    return (
      <p className="text-sm text-muted-foreground">
        {finished ? "You have done the basics. " : ""}
        <Link href={appPath("guide")} className="inline-flex min-h-11 items-center font-medium text-primary-text hover:underline">
          <BookOpen className="mr-1.5 size-4" aria-hidden="true" /> Open the Guide
        </Link>
      </p>
    );
  }

  return (
    <section aria-labelledby="start-title" className="rounded-2xl border border-primary-border bg-primary-soft/50 p-4 shadow-soft md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="start-title" className="text-base font-semibold">
            Start here
          </h2>
          <p className="text-sm text-muted-foreground">Three minutes to see how everything fits.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium tabular-nums">{count} of {STEPS.length} done</span>
          <Button variant="ghost" size="sm" onClick={hidePanel}>
            Hide
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <section aria-labelledby="start-map" className="rounded-xl bg-card p-4">
          <h3 id="start-map" className="text-sm font-semibold">
            Map
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {MAP_IDS.map((id) => {
              const section = SECTIONS.find((s) => s.id === id);
              return section?.route ? (
                <li key={id}>
                  <Link href={appPath(section.route)} className="font-medium hover:underline">
                    {section.title}
                  </Link>
                  <span className="text-muted-foreground">: {section.summary}</span>
                </li>
              ) : null;
            })}
          </ul>
          <Link href={`${appPath("guide")}#overview`} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline">
            Read the big picture
          </Link>
        </section>

        <section aria-labelledby="start-do" className="rounded-xl bg-card p-4">
          <h3 id="start-do" className="text-sm font-semibold">
            Do
          </h3>
          <ol className="mt-2 space-y-1.5 text-sm">
            {STEPS.map((step) => {
              const complete = Boolean(done[step.id]);
              return (
                <li key={step.id} className="flex items-start gap-2">
                  {complete ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className={complete ? "text-muted-foreground line-through" : "font-medium"}>
                      <span className="sr-only">{complete ? `Done: ${step.label}` : `To do: ${step.label}`}</span>
                      <span aria-hidden="true">{step.label}</span>
                    </span>
                    {complete ? null : (
                      <>
                        {" "}
                        <Link href={appPath(step.to.route, step.to.sub)} className="text-primary-text hover:underline">
                          Show me
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="start-learn" className="rounded-xl bg-card p-4">
          <h3 id="start-learn" className="text-sm font-semibold">
            Learn
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Tap the (i) for a plain explanation.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {LEARN.map((id) => (
              <li key={id} className="flex items-center gap-1">
                {termById(id).word}
                <Term id={id} />
              </li>
            ))}
          </ul>
          <Link href={`${appPath("guide")}#glossary`} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline">
            All the words
          </Link>
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run** `npx vitest run src/components/guide/start-here.test.tsx` → PASS. (The "Hide then replay" test: the collapsed link text is `Open the Guide`.)
- [ ] **Step 5: Mount on Home.** In `src/screens/home/home-screen.tsx` import `StartHere` from `@/components/guide/start-here` and render `<StartHere />` as the first child of the fragment returned by `HomeBody` (before the stats `<section>`).
- [ ] **Step 6: Commit** `feat(guide): Start here panel with real-action checklist`.

---

### Task 13: Guide page, route, navigation and footer link

**Files:**
- Create: `src/screens/guide/guide-screen.tsx`, `src/app/demo/(app)/guide/page.tsx`, `src/screens/guide/guide-screen.test.tsx`
- Modify: `src/lib/nav.ts`, `src/components/shell/avatar-menu.tsx`, `src/components/site/site-footer.tsx`

- [ ] **Step 1: Failing test** `src/screens/guide/guide-screen.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECTIONS } from "@/guide/content";
import { useGuideStore } from "@/guide/store";
import { TERMS } from "@/guide/terms";
import { GuideScreen } from "./guide-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/guide", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  useGuideStore.setState({ done: { "add-task": true }, panelHidden: true, dismissedHints: {}, hydrated: true });
});

describe("GuideScreen", () => {
  it("renders every section and the glossary, with one h1", () => {
    render(<GuideScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const s of SECTIONS) expect(document.getElementById(s.id), s.id).not.toBeNull();
    expect(document.getElementById("glossary")).not.toBeNull();
    for (const t of TERMS) expect(document.getElementById(`term-${t.id}`), t.id).not.toBeNull();
  });

  it("filters as you type and announces the result count", () => {
    render(<GuideScreen />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search the guide" }), { target: { value: "buffer" } });
    expect(document.getElementById("planning")).not.toBeNull();
    expect(document.getElementById("profile")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/\d+ sections?, \d+ words?/);
  });

  it("says so when nothing matches", () => {
    render(<GuideScreen />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search the guide" }), { target: { value: "qzxqzx" } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it("replays Start here", () => {
    render(<GuideScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Replay Start here" }));
    expect(useGuideStore.getState().panelHidden).toBe(false);
    expect(useGuideStore.getState().done).toEqual({});
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Create `src/screens/guide/guide-screen.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Hourglass, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Term } from "@/components/guide/term";
import { searchGuide } from "@/guide/search";
import { useGuideStore } from "@/guide/store";
import { termById } from "@/guide/terms";
import type { GuideSection } from "@/guide/types";
import { appPath } from "@/lib/routes";

function Contents({ sections, showGlossary }: { sections: readonly GuideSection[]; showGlossary: boolean }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">
            {s.title}
          </a>
        </li>
      ))}
      {showGlossary ? (
        <li>
          <a href="#glossary" className="flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">
            Glossary
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft md:p-6">
      <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight">
        {section.title}
      </h2>
      {section.comingIn ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-info-soft px-3 py-3 text-sm text-info-text">
          <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Arrives in version {section.comingIn}. {section.whatItIs}
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-prose text-sm">{section.whatItIs}</p>
          {section.steps.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold">How to use it</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {section.steps.map((step) => (
                  <li key={step.text}>
                    {step.text}
                    {step.to ? (
                      <>
                        {" "}
                        <Link href={appPath(step.to.route, step.to.sub)} className="font-medium text-primary-text hover:underline">
                          {step.to.label}
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          {section.tips.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold">Good to know</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </>
          ) : null}
          {section.shortcuts.length > 0 ? (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {section.shortcuts.map((k) => (
                <div key={k.keys} className="contents">
                  <dt>
                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{k.keys}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{k.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.terms.length > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">Words:</span>
              {section.terms.map((id) => (
                <span key={id} className="inline-flex items-center">
                  {termById(id).word}
                  <Term id={id} />
                </span>
              ))}
            </p>
          ) : null}
          {section.tryIt ? (
            <Link
              href={appPath(section.tryIt.route, section.tryIt.sub)}
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {section.tryIt.label}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

export function GuideScreen() {
  const [query, setQuery] = useState("");
  const replay = useGuideStore((s) => s.replay);
  const result = useMemo(() => searchGuide(query), [query]);
  const empty = result.sections.length === 0 && result.terms.length === 0;

  return (
    <>
      <PageHeader
        title="Guide"
        subtitle="Everything in Weekflow, explained. Search, or jump to any part."
        actions={
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              replay();
              toast("Start here is back on Home.");
            }}
          >
            <RotateCcw aria-hidden="true" /> Replay Start here
          </Button>
        }
      />

      <div className="relative mb-5 max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search the guide"
          placeholder="Search the guide, for example “lock” or “buffer”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-xl border-input bg-card pl-9"
        />
      </div>
      <p role="status" className="sr-only">
        {query.trim() ? `${result.sections.length} sections, ${result.terms.length} words` : ""}
      </p>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-4 lg:self-start">
          <details className="rounded-2xl border bg-card p-2 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">On this page</summary>
            <Contents sections={result.sections} showGlossary={result.terms.length > 0} />
          </details>
          <div className="hidden rounded-2xl border bg-card p-2 lg:block">
            <Contents sections={result.sections} showGlossary={result.terms.length > 0} />
          </div>
        </nav>

        <div className="space-y-5">
          {empty ? (
            <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              Nothing matches “{query}”. Try a shorter word, or clear the search.
            </p>
          ) : null}
          {result.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
          {result.terms.length > 0 ? (
            <section id="glossary" aria-labelledby="glossary-title" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft md:p-6">
              <h2 id="glossary-title" className="text-xl font-semibold tracking-tight">
                Glossary
              </h2>
              <dl className="mt-3 space-y-4">
                {result.terms.map((term) => (
                  <div key={term.id} id={`term-${term.id}`} className="scroll-mt-24">
                    <dt className="text-sm font-semibold">{term.word}</dt>
                    <dd className="mt-0.5 text-sm">{term.plain}</dd>
                    <dd className="mt-0.5 text-sm text-muted-foreground">{term.whyItMatters}</dd>
                    {term.setting ? (
                      <dd className="mt-1">
                        <Link href={appPath(term.setting.route, term.setting.sub)} className="text-sm font-medium text-primary-text hover:underline">
                          Open {term.setting.label}
                        </Link>
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create the route** `src/app/demo/(app)/guide/page.tsx`

```tsx
import type { Metadata } from "next";
import { GuideScreen } from "@/screens/guide/guide-screen";

export const metadata: Metadata = { title: "Guide" };

export default function Page() {
  return <GuideScreen />;
}
```

- [ ] **Step 5: Run** `npx vitest run src/screens/guide/guide-screen.test.tsx` → PASS.

- [ ] **Step 6: Navigation.** With the normalising script:
  - `src/lib/nav.ts`: import `BookOpen` from `lucide-react` and add to `SECONDARY_NAV` after Settings: `{ route: "guide", label: "Guide", icon: BookOpen, shortcut: "u" },`. (The command palette, shortcuts dialog and phone More menu read `ALL_NAV`/`SECONDARY_NAV`, so they pick it up.)
  - `src/components/shell/avatar-menu.tsx`: add before the Version history item: `<DropdownMenuItem render={<Link href={appPath("guide")} />}>Guide</DropdownMenuItem>`.
  - `src/components/site/site-footer.tsx`: add `import { appPath } from "@/lib/routes";` and change `const PROJECT = SITE_LINKS.filter(...)` to `const PROJECT = [...SITE_LINKS.filter((l) => ["Roadmap", "Version history"].includes(l.label)), { href: appPath("guide"), label: "Guide" }];`.
- [ ] **Step 7: Run** `npx tsc --noEmit && npx vitest run` → all pass. `src/components/site/site.test.tsx` ("never mentions the tech stack") must still pass.
- [ ] **Step 8: Commit** `feat(guide): Guide page, search, navigation and footer link`.

---

### Task 14: Verify in the browser

- [ ] **Step 1:** `npm run typecheck && npm run lint && npx vitest run && npm run build` all clean. Fix anything before continuing.
- [ ] **Step 2:** Start the prod server with `preview_start` (`weekflow-prod`). In the Browser pane, clear `localStorage`, open `/demo/home` and check: Start here panel shows three doors and "0 of 6 done"; no first-visit hint on Home.
- [ ] **Step 3:** Do the real actions and watch ticks: add a task with Quick add (1 of 6), drag/Schedule a task (2), press L on a placed task (3), open Plan my week (4), open Settings → Planning (5), open Review (6). After the sixth, Start here collapses to "Open the Guide".
- [ ] **Step 4:** Load a demo scenario from the demo bar: confirm nothing new ticks.
- [ ] **Step 5:** On `/demo/week` press `H`: the help panel opens with "About My Week"; Escape closes and focus returns. Press `?`: the shortcuts dialog opens (unchanged). Click an (i) in Settings → Scheduling engine: the popover opens, and by keyboard (Tab, Enter) too.
- [ ] **Step 6:** On `/demo/guide`: contents link to each section; search "lock" filters; "Replay Start here" restores the panel on Home. Resize to 375 wide: "On this page" collapses, no horizontal scroll.
- [ ] **Step 7:** Run axe on `/demo/guide`, `/demo/home` with Start here visible, the help panel open, and an (i) popover open, at 1100 and 375 wide, light and dark. Fix every violation.
- [ ] **Step 8:** `preview_stop` the server.

---

### Task 15: Release 0.0.6

**Files:** `package.json`, `CHANGELOG.md`, `docs/ROADMAP.md`, `src/lib/roadmap.ts`, `src/components/site/sections.tsx`

- [ ] **Step 1: Changelog.** Insert above `## 0.0.5 — Replanning and review` in `CHANGELOG.md`:

```markdown
## 0.0.6 — Guide and onboarding
Date: 2026-10-14
Summary: A guide to every part of Weekflow, help on every screen, and a Start here checklist on Home.

- Guide page: the big picture, a section for every screen, planner rules and a glossary, with live search and a contents list
- Help on every screen: press H or the ? button for what the page is, what to try first, shortcuts and the words used (? still shows all shortcuts)
- (i) tips next to confusing words such as buffer, strict deadline, stability and inbox, in Settings, Plan my week, the rules bar and the inbox
- Start here on Home: a map of the app, a six-step checklist that ticks off as you really do each thing, and the words people trip on
- One short first-visit hint per screen, shown once
- Replay Start here from the Guide page
- Guide added to the sidebar, the phone More menu, the account menu, the command menu and the public footer
```

- [ ] **Step 2: Version and roadmap.** `package.json` `"version": "0.0.6"`. In `src/lib/roadmap.ts` remove the `0.0.6` "Guide and onboarding" entry (shipped versions live in the changelog). In `docs/ROADMAP.md` set the 0.0.6 row's status to `Built` and the 0.0.7 row's to `Next`. Append to `docs/ROADMAP.md`:

```markdown

## Definition of Done (from 0.0.6)
A phase is not finished until its new screens, settings and jargon have Guide entries
(`src/guide/content.ts`, `src/guide/terms.ts`). A new route without a Guide section fails
`src/guide/content.test.ts`.
```

- [ ] **Step 3: Landing page.** In `src/components/site/sections.tsx` FAQ, change the "Do I need an account to try it?" answer to end with `Open the Guide inside the demo for a tour of everything.` and run `npx vitest run src/components/site` to confirm the site tests still pass.
- [ ] **Step 4: Gate** `npm run typecheck && npm run lint && npx vitest run && npm run build`.
- [ ] **Step 5: Commit and push to master**

```bash
git add -A
git commit -m "feat: Weekflow 0.0.6 - guide, help and Start here onboarding

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin master
```

- [ ] **Step 6: Report** to the owner: what shipped, test counts, and anything that did not pass.

---

## Self-review

**Spec coverage**
- Guide page with sticky contents, search, phone disclosure, glossary, replay, links from sidebar, More, avatar menu, palette, footer → Task 13 (palette and shortcuts dialog via `ALL_NAV`).
- `g u` shortcut → Task 13 (`shortcut: "u"` in nav, used by the global `g` sequence).
- Help panel, `H` key, bottom sheet on phones, `aria-keyshortcuts`, shortcuts dialog row, `?` unchanged → Task 10.
- (i) tips on Settings Planning/Engine, Plan dialog, rules bar, inbox → Tasks 8 and 9.
- First-visit hint, not on Home with Start here, not on Guide → Task 11.
- Start here with Map/Do/Learn, collapse, hide, replay → Tasks 12 and 13.
- Six steps, detection rules, scenario-load safety, persistence → Tasks 5, 6, 7.
- Content tests (route coverage, links, terms, no stack names) and the Definition of Done → Tasks 3 and 15.
- Axe, widths, light/dark → Task 14.
- Out of scope items are not built.

**Known deviations from the spec (intentional, small)**
- "Preview a plan" ticks when the Plan my week dialog opens (even when the inbox is empty), because that is when the user is shown the preview.
- Step links in the help panel are optional per step (some steps are plain text).

**Placeholder scan:** none. Task 9 lists exact elements and props to change; if a label string differs from what the plan quotes, run `grep -n "<label text>" <file>` and edit the matching element.

**Type consistency:** `StepId`, `STEPS`, `stepsFromTaskChange`, `stepsFromPath` (Task 5) are used unchanged in Tasks 6, 7, 11, 12. `useGuideStore` fields (`done`, `panelHidden`, `dismissedHints`, `hydrated`, `complete`, `hidePanel`, `showPanel`, `dismissHint`, `replay`) match across tasks. `Term` takes `id: TermId`. `sectionForRoute` and `routeOfPath` are defined in Tasks 3 and 1.

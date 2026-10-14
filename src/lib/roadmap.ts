import type { AppRoute } from "./routes";

export interface RoadmapEntry {
  version: string;
  title: string;
  summary: string;
}

/** What each upcoming version delivers. Shipped versions live in CHANGELOG.md. */
export const ROADMAP: readonly RoadmapEntry[] = [
  {
    version: "0.0.2",
    title: "Tasks and the week calendar",
    summary: "Tasks, inbox, week calendar with drag, resize and locking, and the Home dashboard.",
  },
  {
    version: "0.0.3",
    title: "Scheduling engine",
    summary: "Deterministic planning with explanations, conflict detection, plan preview and tests.",
  },
  {
    version: "0.0.4",
    title: "Replanning and workload",
    summary: "Replan, undo, schedule history, workload analytics and the weekly review.",
  },
  {
    version: "0.0.5",
    title: "Team workspaces",
    summary: "Members, shared projects and tasks, assignment, comments and team availability.",
  },
  {
    version: "0.0.6",
    title: "Polish and audit",
    summary: "Full accessibility, mobile and regression pass across every theme and palette.",
  },
  {
    version: "0.1.0",
    title: "Accounts and sync",
    summary: "Sign-in, Appwrite database, permissions and server-side authorization.",
  },
];

export const PLANNED_ROUTES: Partial<
  Record<AppRoute, { version: string; blurb: string; items: string[] }>
> = {
  home: {
    version: "0.0.2",
    blurb: "Your week at a glance: stats, the week calendar, active rules, conflicts and a quick-add.",
    items: [
      "Four stat cards: tasks this week, completed, overdue and free time",
      "The week time-block calendar",
      "Active Rules bar driven by your Scheduling engine settings",
      "Quick-add task and a Replan week action",
    ],
  },
  week: {
    version: "0.0.2",
    blurb: "A weekly time-block calendar you can drag, resize and lock.",
    items: [
      "Day, week and agenda views with a current-time indicator",
      "Drag to move, resize to change duration, lock a task in place",
      "An unscheduled tray and workload indicators per day",
    ],
  },
  tasks: {
    version: "0.0.2",
    blurb: "Capture and organize work quickly, with an inbox for anything unscheduled.",
    items: [
      "Title, duration, priority, deadline, earliest start and preferred times",
      "Subtasks, dependencies, projects, labels and recurring tasks",
      "Search, filters and fast keyboard creation",
    ],
  },
  calendar: {
    version: "0.0.2",
    blurb: "A calendar view of everything scheduled, filterable by project or category.",
    items: ["Month overview with workload per day", "Filter by project or category"],
  },
  team: {
    version: "0.0.5",
    blurb: "Collaborate, assign tasks and keep everyone aligned. Free for every team.",
    items: [
      "Members, roles and invitations",
      "Shared projects, tasks, deadlines and calendars",
      "Team availability and workload, without touching anyone's personal time",
    ],
  },
};

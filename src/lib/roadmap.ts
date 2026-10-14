import type { AppRoute } from "./routes";

export interface RoadmapEntry {
  version: string;
  title: string;
  summary: string;
}

/** What each upcoming version delivers. Shipped versions live in CHANGELOG.md. */
export const ROADMAP: readonly RoadmapEntry[] = [
  {
    version: "0.0.4",
    title: "Scheduling engine",
    summary: "Deterministic planning with explanations, conflict detection, plan preview and tests.",
  },
  {
    version: "0.0.5",
    title: "Replanning and workload",
    summary: "Replan, undo, schedule history, workload analytics, weekly review, recurring tasks and projects.",
  },
  {
    version: "0.0.6",
    title: "Team workspaces",
    summary: "Members, shared projects and tasks, assignment, comments and team availability.",
  },
  {
    version: "0.0.7",
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
  team: {
    version: "0.0.6",
    blurb: "Collaborate, assign tasks and keep everyone aligned. Free for every team.",
    items: [
      "Members, roles and invitations",
      "Shared projects, tasks, deadlines and calendars",
      "Team availability and workload, without touching anyone's personal time",
    ],
  },
};

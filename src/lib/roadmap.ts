import type { AppRoute } from "./routes";

export interface RoadmapEntry {
  version: string;
  title: string;
  summary: string;
}

/** What each upcoming version delivers. Shipped versions live in CHANGELOG.md. */
export const ROADMAP: readonly RoadmapEntry[] = [
  {
    version: "0.0.7",
    title: "Recurring tasks and projects",
    summary: "Recurring tasks, projects, templates, custom categories, long-task blocks and in-app reminders.",
  },
  {
    version: "0.0.8",
    title: "Team workspaces",
    summary: "Members, shared projects and tasks, assignment, comments and team availability.",
  },
  {
    version: "0.0.9",
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
    version: "0.0.8",
    blurb: "Collaborate, assign tasks and keep everyone aligned. Free for every team.",
    items: [
      "Members, roles and invitations",
      "Shared projects, tasks, deadlines and calendars",
      "Team availability and workload, without touching anyone's personal time",
    ],
  },
};

export interface RoadmapEntry {
  version: string;
  title: string;
  summary: string;
}

/** What each upcoming version delivers. Shipped versions live in CHANGELOG.md. */
export const ROADMAP: readonly RoadmapEntry[] = [
  {
    version: "0.1.0",
    title: "Accounts and sync",
    summary: "Sign-in, a real database, sharing between devices and people, and server-side permissions.",
  },
];

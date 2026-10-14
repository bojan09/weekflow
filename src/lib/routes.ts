/** Every in-app route lives under this base. Accounts add /app later. */
export const DEMO_BASE = "/demo";

export type AppRoute =
  | "home"
  | "week"
  | "tasks"
  | "calendar"
  | "review"
  | "team"
  | "profile"
  | "settings"
  | "changelog";

export function appPath(route: AppRoute, sub?: string): string {
  return `${DEMO_BASE}/${route}${sub ? `/${sub}` : ""}`;
}

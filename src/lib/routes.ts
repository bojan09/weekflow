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

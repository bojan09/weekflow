/** The demo runs on local sample data. The signed-in app lives under /app. */
export const DEMO_BASE = "/demo";
export const ACCOUNT_BASE = "/app";

export type AppBase = typeof DEMO_BASE | typeof ACCOUNT_BASE;

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

/** Which half of the site a pathname belongs to. */
export function baseOfPath(pathname: string): AppBase {
  return pathname === ACCOUNT_BASE || pathname.startsWith(`${ACCOUNT_BASE}/`) ? ACCOUNT_BASE : DEMO_BASE;
}

export function appPath(route: AppRoute, sub?: string, base: AppBase = DEMO_BASE): string {
  return `${base}/${route}${sub ? `/${sub}` : ""}`;
}

/** "/demo/settings/planning" or "/app/settings/planning" gives "settings". Null outside the app. */
export function routeOfPath(pathname: string): AppRoute | null {
  const [, base, segment] = pathname.split("/");
  if (`/${base ?? ""}` !== DEMO_BASE && `/${base ?? ""}` !== ACCOUNT_BASE) return null;
  return (APP_ROUTES as readonly string[]).includes(segment ?? "") ? (segment as AppRoute) : null;
}

/** The part of the path after the route, e.g. "planning" for "/app/settings/planning". */
export function subOfPath(pathname: string): string | null {
  const [, , , sub] = pathname.split("/");
  return sub || null;
}

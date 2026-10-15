import { describe, expect, it } from "vitest";
import { APP_ROUTES, ACCOUNT_BASE, appPath, baseOfPath, routeOfPath, subOfPath } from "./routes";

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

  it("keeps the demo and the signed-in app apart", () => {
    expect(appPath("week")).toBe("/demo/week");
    expect(appPath("week", undefined, ACCOUNT_BASE)).toBe("/app/week");
    expect(baseOfPath("/app/settings/engine")).toBe("/app");
    expect(baseOfPath("/app")).toBe("/app");
    expect(baseOfPath("/demo/week")).toBe("/demo");
    expect(baseOfPath("/application")).toBe("/demo");
    expect(routeOfPath("/app/week")).toBe("week");
    expect(routeOfPath("/app/settings/planning")).toBe("settings");
    expect(subOfPath("/app/settings/planning")).toBe("planning");
    expect(subOfPath("/app/review")).toBeNull();
  });
});

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

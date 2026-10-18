import { describe, expect, it } from "vitest";
import { PROJECT_HUES } from "./project-colors";
import { projectSchema } from "./projects";
import { teamProjectSchema } from "./team/types";

describe("project colors", () => {
  it("round-trips every color for personal and shared projects", () => {
    for (const hue of PROJECT_HUES) {
      const project = { id: "project", name: "Launch", hue };
      expect(projectSchema.parse(project)).toEqual(project);
      expect(teamProjectSchema.parse(project)).toEqual(project);
    }
    expect(new Set(PROJECT_HUES).size).toBe(22);
  });
  it("rejects arbitrary CSS at the data boundary", () => {
    expect(projectSchema.safeParse({ id: "project", name: "Launch", hue: "url(https://example.com)" }).success).toBe(false);
  });
});

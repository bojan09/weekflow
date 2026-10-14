import { describe, expect, it } from "vitest";
import { SETTINGS_SECTIONS } from "@/screens/settings/sections";
import { APP_ROUTES } from "@/lib/routes";
import { SECTIONS, sectionById, sectionForRoute } from "./content";
import { TERMS } from "./terms";

describe("guide content", () => {
  it("has a section for every app route, exactly one each", () => {
    for (const route of APP_ROUTES) {
      expect(SECTIONS.filter((s) => s.route === route), route).toHaveLength(1);
      expect(sectionForRoute(route).route).toBe(route);
    }
  });

  it("has unique, non-empty section ids and titles", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SECTIONS) {
      expect(s.title.trim(), s.id).not.toBe("");
      expect(s.summary.trim(), s.id).not.toBe("");
      expect(s.whatItIs.trim(), s.id).not.toBe("");
    }
  });

  it("keeps hints to one short line", () => {
    for (const s of SECTIONS) {
      expect(s.hint.length, s.id).toBeGreaterThan(10);
      expect(s.hint.length, s.id).toBeLessThanOrEqual(110);
    }
  });

  it("gives every section steps and tips", () => {
    for (const s of SECTIONS) {
      expect(s.steps.length, s.id).toBeGreaterThan(0);
      expect(s.tips.length, s.id).toBeGreaterThan(0);
    }
    expect(sectionForRoute("team").steps.length).toBeGreaterThan(0);
  });

  it("only links to real routes and real settings panes", () => {
    const panes = new Set<string>(SETTINGS_SECTIONS.map((p) => p.id));
    const links = SECTIONS.flatMap((s) => [s.tryIt, ...s.steps.map((st) => st.to)]).filter(Boolean);
    for (const link of links) {
      expect(APP_ROUTES as readonly string[]).toContain(link?.route);
      if (link?.sub) {
        expect(link.route).toBe("settings");
        expect(panes.has(link.sub), link.sub).toBe(true);
      }
    }
    for (const term of TERMS) {
      if ("setting" in term) expect(panes.has(term.setting.sub ?? ""), term.id).toBe(true);
    }
  });

  it("has a valid glossary", () => {
    const ids: string[] = TERMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const term of TERMS) {
      expect(sectionById(term.section), term.id).toBeDefined();
      expect(term.plain.length, term.id).toBeGreaterThan(10);
    }
    for (const s of SECTIONS) for (const id of s.terms) expect(ids, `${s.id}:${id}`).toContain(id);
  });

  it("never names the tech stack", () => {
    const text = JSON.stringify([SECTIONS, TERMS]);
    for (const word of ["Next.js", "Appwrite", "Tailwind", "shadcn", "Zustand", "Vercel"]) {
      expect(text).not.toContain(word);
    }
  });
});

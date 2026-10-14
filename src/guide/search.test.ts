import { describe, expect, it } from "vitest";
import { searchGuide } from "./search";
import { SECTIONS } from "./content";
import { TERMS } from "./terms";

describe("searchGuide", () => {
  it("returns everything for an empty query", () => {
    const result = searchGuide("   ");
    expect(result.sections).toHaveLength(SECTIONS.length);
    expect(result.terms).toHaveLength(TERMS.length);
  });

  it("matches titles, steps, tips and glossary words, ignoring case", () => {
    expect(searchGuide("LOCK").sections.map((s) => s.id)).toContain("week");
    expect(searchGuide("buffer").terms.map((t) => t.id)).toContain("buffer");
    expect(searchGuide("restore").sections.map((s) => s.id)).toContain("replan");
  });

  it("requires every word to match", () => {
    expect(searchGuide("lock zebra").sections).toHaveLength(0);
  });

  it("returns nothing for gibberish", () => {
    const result = searchGuide("qzxqzx");
    expect(result.sections).toHaveLength(0);
    expect(result.terms).toHaveLength(0);
  });
});

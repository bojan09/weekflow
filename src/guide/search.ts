import { SECTIONS } from "./content";
import { TERMS } from "./terms";
import type { GuideSection, GuideTerm } from "./types";

export interface GuideSearchResult {
  sections: readonly GuideSection[];
  terms: readonly GuideTerm[];
}

const sectionText = (s: GuideSection): string =>
  [s.title, s.summary, s.whatItIs, ...s.steps.map((st) => st.text), ...s.tips, ...s.shortcuts.map((k) => k.label)]
    .join(" ")
    .toLowerCase();

const termText = (t: GuideTerm): string => [t.word, t.plain, t.whyItMatters].join(" ").toLowerCase();

/** Plain substring search. Every word in the query must appear. */
export function searchGuide(query: string): GuideSearchResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { sections: SECTIONS, terms: TERMS };
  const hits = (text: string): boolean => words.every((w) => text.includes(w));
  return {
    sections: SECTIONS.filter((s) => hits(sectionText(s))),
    terms: TERMS.filter((t) => hits(termText(t))),
  };
}

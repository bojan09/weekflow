import type { AppRoute } from "@/lib/routes";
import type { TermId } from "./terms";

export interface GuideLink {
  route: AppRoute;
  sub?: string;
  label: string;
}

export interface GuideStep {
  text: string;
  to?: GuideLink;
}

export interface GuideShortcut {
  keys: string;
  label: string;
}

export interface GuideSection {
  id: string;
  title: string;
  /** The app screen this section describes, if it is a screen. One section per route. */
  route?: AppRoute;
  /** One line, used in lists and the Start here map. */
  summary: string;
  /** One short line shown once as a first-visit hint on the screen. */
  hint: string;
  whatItIs: string;
  steps: readonly GuideStep[];
  tips: readonly string[];
  shortcuts: readonly GuideShortcut[];
  terms: readonly TermId[];
  tryIt?: GuideLink;
}

export interface GuideTerm {
  id: string;
  word: string;
  plain: string;
  whyItMatters: string;
  /** Id of the section that explains it in depth. */
  section: string;
  setting?: GuideLink;
}

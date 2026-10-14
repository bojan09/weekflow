import { DEMO_BASE, appPath } from "./routes";

/** Public navigation. Anchors use "/#id" so the header works from any page. */
export const SITE_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#customize", label: "Customize" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: appPath("changelog"), label: "Version history" },
] as const;

export const SITE_CTA = { href: DEMO_BASE, label: "Open the demo" } as const;

/** Section ids on the landing page; tests check every anchor link has a target. */
export const LANDING_SECTION_IDS = ["features", "how", "customize", "roadmap", "faq"] as const;

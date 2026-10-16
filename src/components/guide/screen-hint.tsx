"use client";

import { usePathname } from "next/navigation";
import { Lightbulb, X } from "lucide-react";
import { accountGuide, sectionForRoute } from "@/guide/content";
import { STEPS } from "@/guide/progress";
import { useGuideStore } from "@/guide/store";
import { routeOfPath } from "@/lib/routes";

const NEVER = new Set(["guide", "changelog"]);

/** One short line the first time a screen is opened. Dismissed once, gone for good. */
export function ScreenHint() {
  const pathname = usePathname();
  const route = routeOfPath(pathname);
  const { hydrated, dismissedHints, done, panelHidden, dismissHint } = useGuideStore();
  if (!hydrated || !route || NEVER.has(route) || dismissedHints[route]) return null;

  // Home already has Start here while it is visible.
  const startHereVisible = !panelHidden && STEPS.some((s) => !done[s.id]);
  if (route === "home" && startHereVisible) return null;

  return (
    <p className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-2.5 text-sm text-primary-soft-text">
      <span className="flex items-center gap-2">
        <Lightbulb className="size-4 shrink-0" aria-hidden="true" />
        {(pathname.startsWith("/app/") ? accountGuide(sectionForRoute(route)) : sectionForRoute(route)).hint}
      </span>
      <button
        type="button"
        onClick={() => dismissHint(route)}
        aria-label="Got it"
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg font-medium hover:bg-card/60"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </p>
  );
}

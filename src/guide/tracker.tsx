"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { tasksCollection } from "@/data/tasks";
import { useUiStore } from "@/stores/ui";
import { stepsFromPath, stepsFromTaskChange } from "./progress";
import { useGuideStore } from "./store";

/**
 * Mounted once in the app shell. It loads saved progress, then ticks the
 * Start here steps from what the user really does: changes to their tasks,
 * the page they open and the plan preview. It renders nothing.
 */
export function GuideTracker(): null {
  const pathname = usePathname();
  const complete = useGuideStore((s) => s.complete);

  // Load saved progress first, before any step can be ticked.
  useLayoutEffect(() => {
    if (!pathname.startsWith("/app/")) {
      useGuideStore.persist.rehydrate();
      useGuideStore.setState({ hydrated: true });
    }
  }, [pathname]);

  useLayoutEffect(() => {
    let previous = tasksCollection.getSnapshot();
    return tasksCollection.subscribe(() => {
      const next = tasksCollection.getSnapshot();
      complete(stepsFromTaskChange(previous, next));
      previous = next;
    });
  }, [complete]);

  useLayoutEffect(() => {
    complete(stepsFromPath(pathname));
  }, [pathname, complete]);

  useLayoutEffect(() => {
    return useUiStore.subscribe((state, prev) => {
      if (state.planOpen && !prev.planOpen) complete(["preview-plan"]);
    });
  }, [complete]);

  return null;
}

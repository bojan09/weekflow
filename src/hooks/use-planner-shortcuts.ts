"use client";

import { useEffect } from "react";
import type { Planner } from "./use-planner";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** [ and ] step the visible range, . jumps to today. Ignored while typing. */
export function usePlannerShortcuts(planner: Planner): void {
  const { step, goToday } = planner;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "[") step(-1);
      else if (event.key === "]") step(1);
      else if (event.key === ".") goToday();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, goToday]);
}

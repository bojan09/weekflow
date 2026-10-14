"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. `serverValue` is used for the server render
 * and hydration so the first client render always matches the HTML.
 */
export function useMediaQuery(query: string, serverValue = true): boolean {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

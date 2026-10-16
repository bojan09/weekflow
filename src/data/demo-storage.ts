import type { StateStorage } from "zustand/middleware";

/** Public demo settings must never receive account preferences or progress. */
export const demoStorage: StateStorage = {
  getItem: (name) => typeof window === "undefined" || window.location.pathname.startsWith("/app") ? null : localStorage.getItem(name),
  setItem: (name, value) => { if (!window.location.pathname.startsWith("/app")) localStorage.setItem(name, value); },
  removeItem: (name) => { if (!window.location.pathname.startsWith("/app")) localStorage.removeItem(name); },
};

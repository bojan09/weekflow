"use client";

import { useSyncExternalStore } from "react";
import { useSimulator } from "./simulator";

function subscribe(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** True when the browser is online. Assumes online on the server. */
export function useBrowserOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export interface Connectivity {
  online: boolean;
  /** True when the offline state comes from the demo simulator. */
  simulated: boolean;
}

export function useConnectivity(): Connectivity {
  const browserOnline = useBrowserOnline();
  const simulatedOffline = useSimulator((s) => s.mode === "offline");
  return { online: browserOnline && !simulatedOffline, simulated: simulatedOffline };
}

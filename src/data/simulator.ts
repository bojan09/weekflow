"use client";

import { create } from "zustand";

export type SimulatedState = "none" | "loading" | "error" | "offline" | "denied";

export const SIMULATED_STATES: ReadonlyArray<{
  id: SimulatedState;
  label: string;
  description: string;
}> = [
  { id: "none", label: "Normal", description: "Everything works as usual" },
  { id: "loading", label: "Loading", description: "Screens show their loading state" },
  { id: "error", label: "Error", description: "Screens fail to load and offer a retry" },
  { id: "offline", label: "Offline", description: "Shows the offline banner" },
  { id: "denied", label: "Permission denied", description: "Screens show the no-access state" },
];

interface SimulatorState {
  mode: SimulatedState;
  setMode: (mode: SimulatedState) => void;
}

/** Demo-only: forces screens into a given state so every state can be reviewed. */
export const useSimulator = create<SimulatorState>()((set) => ({
  mode: "none",
  setMode: (mode) => set({ mode }),
}));

"use client";

import { create } from "zustand";

/** Transient UI state only. Domain data never lives here. */
interface UiState {
  commandOpen: boolean;
  shortcutsOpen: boolean;
  moreOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setMoreOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  commandOpen: false,
  shortcutsOpen: false,
  moreOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setMoreOpen: (moreOpen) => set({ moreOpen }),
}));

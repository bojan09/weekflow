"use client";

import { create } from "zustand";
import type { ISODate } from "@/lib/dates";
import type { CategoryId, Placement, Priority } from "@/domain/tasks";

export interface NewTaskDefaults {
  title?: string;
  durationMin?: number;
  priority?: Priority;
  category?: CategoryId;
  deadline?: ISODate | null;
  placement?: Placement | null;
}

export type EditorTarget =
  | { kind: "new"; defaults?: NewTaskDefaults }
  | { kind: "edit"; id: string }
  | null;

/** Transient UI state only. Domain data never lives here. */
interface UiState {
  commandOpen: boolean;
  shortcutsOpen: boolean;
  moreOpen: boolean;
  planOpen: boolean;
  editor: EditorTarget;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setMoreOpen: (open: boolean) => void;
  setPlanOpen: (open: boolean) => void;
  openEditor: (target: Exclude<EditorTarget, null>) => void;
  closeEditor: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  commandOpen: false,
  shortcutsOpen: false,
  moreOpen: false,
  planOpen: false,
  editor: null,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setMoreOpen: (moreOpen) => set({ moreOpen }),
  setPlanOpen: (planOpen) => set({ planOpen }),
  openEditor: (editor) => set({ editor }),
  closeEditor: () => set({ editor: null }),
}));

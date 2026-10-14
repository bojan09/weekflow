/**
 * Source definitions for the 15 accent palettes.
 *
 * Only intent lives here (hue, chroma, whether text on the fill is light or
 * dark, and a target lightness). Final colors are solved against the surface
 * tokens in build.ts so every palette meets WCAG AA by construction.
 */
export interface PaletteDef {
  id: string;
  name: string;
  /** OKLCH hue angle. */
  hue: number;
  /** OKLCH chroma used for fills. */
  chroma: number;
  /** Target lightness for the light-theme fill (adjusted to meet contrast). */
  fillL: number;
  /** Which foreground sits on the fill in the light theme. */
  fg: "light" | "dark";
}

export const PALETTE_DEFS: readonly PaletteDef[] = [
  { id: "yellow", name: "Yellow", hue: 92, chroma: 0.17, fillL: 0.88, fg: "dark" },
  { id: "lime", name: "Lime", hue: 125, chroma: 0.19, fillL: 0.82, fg: "dark" },
  { id: "mist", name: "Mist", hue: 265, chroma: 0.05, fillL: 0.8, fg: "dark" },
  { id: "sky", name: "Sky", hue: 228, chroma: 0.14, fillL: 0.78, fg: "dark" },
  { id: "orange", name: "Orange", hue: 55, chroma: 0.18, fillL: 0.74, fg: "dark" },
  { id: "lavender", name: "Lavender", hue: 295, chroma: 0.11, fillL: 0.72, fg: "dark" },
  { id: "pink", name: "Pink", hue: 355, chroma: 0.2, fillL: 0.62, fg: "light" },
  { id: "teal", name: "Teal", hue: 190, chroma: 0.11, fillL: 0.58, fg: "light" },
  { id: "green", name: "Green", hue: 152, chroma: 0.15, fillL: 0.57, fg: "light" },
  { id: "red", name: "Red", hue: 25, chroma: 0.2, fillL: 0.56, fg: "light" },
  { id: "violet", name: "Violet", hue: 300, chroma: 0.2, fillL: 0.54, fg: "light" },
  { id: "indigo", name: "Indigo", hue: 272, chroma: 0.2, fillL: 0.52, fg: "light" },
  { id: "blue", name: "Blue", hue: 252, chroma: 0.19, fillL: 0.5, fg: "light" },
  { id: "plum", name: "Plum", hue: 320, chroma: 0.15, fillL: 0.44, fg: "light" },
  { id: "navy", name: "Navy", hue: 262, chroma: 0.1, fillL: 0.36, fg: "light" },
];

export const DEFAULT_ACCENT = "indigo";

export interface TaskHueDef {
  id: string;
  name: string;
  hue: number;
  chroma: number;
}

/** Eight pastel hues for task blocks (assigned by category/project). */
export const TASK_HUES: readonly TaskHueDef[] = [
  { id: "lavender", name: "Lavender", hue: 295, chroma: 0.09 },
  { id: "blue", name: "Blue", hue: 250, chroma: 0.1 },
  { id: "teal", name: "Teal", hue: 190, chroma: 0.08 },
  { id: "green", name: "Green", hue: 150, chroma: 0.1 },
  { id: "amber", name: "Amber", hue: 85, chroma: 0.11 },
  { id: "orange", name: "Orange", hue: 50, chroma: 0.11 },
  { id: "pink", name: "Pink", hue: 350, chroma: 0.1 },
  { id: "slate", name: "Slate", hue: 265, chroma: 0.025 },
];

export interface StatusDef {
  id: "success" | "warning" | "danger" | "info";
  hue: number;
}

export const STATUS_DEFS: readonly StatusDef[] = [
  { id: "success", hue: 152 },
  { id: "warning", hue: 80 },
  { id: "danger", hue: 25 },
  { id: "info", hue: 245 },
];

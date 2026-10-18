import { TASK_HUES } from "./tasks";

export const PROJECT_HUES = [...TASK_HUES, "rose", "violet", "cyan", "lime", "gold", "coral", "indigo", "mint", "sunset", "ocean", "aurora", "blossom", "forest", "twilight"] as const;
export type ProjectHue = (typeof PROJECT_HUES)[number];
export const PROJECT_COLOR_LABEL = Object.fromEntries(PROJECT_HUES.map((hue) => [hue, `${hue[0].toUpperCase()}${hue.slice(1)}${["sunset", "ocean", "aurora", "blossom", "forest", "twilight"].includes(hue) ? " gradient" : ""}`])) as Record<ProjectHue, string>;

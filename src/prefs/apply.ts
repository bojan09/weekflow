import type { Prefs } from "./schema";

export type ThemePref = Prefs["appearance"]["theme"];

export function resolveDark(theme: ThemePref, systemPrefersDark: boolean): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Reflect preferences onto the document element. Appearance is driven purely
 * by attributes + CSS variables, so no component needs a per-theme override.
 */
export function applyPrefs(
  prefs: Prefs,
  root: HTMLElement = document.documentElement,
  prefersDark: boolean = systemPrefersDark(),
): void {
  const { appearance, accessibility } = prefs;
  root.classList.toggle("dark", resolveDark(appearance.theme, prefersDark));
  root.setAttribute("data-accent", appearance.accent);
  root.setAttribute("data-bg", appearance.background);
  root.setAttribute("data-density", appearance.density);
  root.setAttribute("data-glass", appearance.glass);
  root.setAttribute("data-sidebar", appearance.sidebar);
  root.setAttribute("data-motion", accessibility.motion);
  root.style.fontSize = `${accessibility.textScale}%`;
}

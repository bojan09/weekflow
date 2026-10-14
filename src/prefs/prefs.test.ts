import { beforeEach, describe, expect, it } from "vitest";
import { applyPrefs, resolveDark } from "./apply";
import { bootScript, PREFS_STORAGE_KEY } from "./boot-script";
import { DEFAULT_PREFS, prefsSchema, sanitizePrefs } from "./schema";
import { usePrefsStore } from "./store";

function freshRoot(): HTMLElement {
  const el = document.createElement("html");
  return el;
}

beforeEach(() => {
  window.localStorage.clear();
  usePrefsStore.setState({ prefs: DEFAULT_PREFS, hydrated: false });
});

describe("prefs schema", () => {
  it("builds complete defaults from an empty object", () => {
    expect(prefsSchema.parse({})).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS.appearance).toEqual({
      theme: "system",
      accent: "indigo",
      background: "default",
      density: "comfortable",
      glass: "off",
    });
  });

  it("keeps valid sections when another section is corrupt", () => {
    const result = sanitizePrefs({
      appearance: { theme: "dark", accent: "navy" },
      planning: { workDays: "nope", bufferMin: 999 },
    });
    expect(result.appearance.theme).toBe("dark");
    expect(result.appearance.accent).toBe("navy");
    expect(result.planning).toEqual(DEFAULT_PREFS.planning);
  });

  it("falls back to defaults for non-object input", () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs("x")).toEqual(DEFAULT_PREFS);
  });

  it("rejects an unknown accent", () => {
    expect(prefsSchema.shape.appearance.safeParse({ accent: "hotpink" }).success).toBe(false);
  });
});

describe("prefs store", () => {
  it("updates a section and persists it", () => {
    usePrefsStore.getState().update("appearance", { theme: "dark", accent: "teal" });
    expect(usePrefsStore.getState().prefs.appearance.theme).toBe("dark");
    const stored = JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) ?? "{}") as {
      state: { prefs: { appearance: { accent: string } } };
    };
    expect(stored.state.prefs.appearance.accent).toBe("teal");
  });

  it("rejects an invalid update and keeps the old value", () => {
    usePrefsStore.getState().update("planning", { bufferMin: 9999 });
    expect(usePrefsStore.getState().prefs.planning.bufferMin).toBe(DEFAULT_PREFS.planning.bufferMin);
  });

  it("resets one section without touching others", () => {
    const { update, reset } = usePrefsStore.getState();
    update("appearance", { accent: "plum" });
    update("calendar", { timeFormat: "12h" });
    reset("appearance");
    expect(usePrefsStore.getState().prefs.appearance.accent).toBe("indigo");
    expect(usePrefsStore.getState().prefs.calendar.timeFormat).toBe("12h");
  });

  it("rehydrates saved prefs and sanitizes bad data", async () => {
    window.localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ state: { prefs: { appearance: { theme: "dark", density: "bogus" } } }, version: 1 }),
    );
    await usePrefsStore.persist.rehydrate();
    const { appearance } = usePrefsStore.getState().prefs;
    expect(appearance.theme).toBe("dark");
    expect(appearance.density).toBe("comfortable");
  });
});

describe("applyPrefs", () => {
  it("sets theme class and appearance attributes", () => {
    const root = freshRoot();
    const prefs = sanitizePrefs({
      appearance: { theme: "dark", accent: "red", background: "ocean", density: "compact" },
      accessibility: { motion: "reduce", textScale: 125 },
    });
    applyPrefs(prefs, root, false);
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.getAttribute("data-accent")).toBe("red");
    expect(root.getAttribute("data-bg")).toBe("ocean");
    expect(root.getAttribute("data-density")).toBe("compact");
    expect(root.getAttribute("data-motion")).toBe("reduce");
    expect(root.style.fontSize).toBe("125%");
  });

  it("resolves system theme from the OS preference", () => {
    expect(resolveDark("system", true)).toBe(true);
    expect(resolveDark("system", false)).toBe(false);
    expect(resolveDark("light", true)).toBe(false);
    expect(resolveDark("dark", false)).toBe(true);
  });
});

describe("boot script", () => {
  const run = (): void => {
    new Function(bootScript())();
  };

  beforeEach(() => {
    const root = document.documentElement;
    root.className = "";
    for (const attr of ["data-accent", "data-bg", "data-density", "data-motion"]) root.removeAttribute(attr);
    root.style.fontSize = "";
  });

  it("applies saved preferences exactly like applyPrefs", () => {
    const prefs = sanitizePrefs({
      appearance: { theme: "dark", accent: "plum", background: "forest", density: "compact" },
      accessibility: { motion: "full", textScale: 110 },
    });
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ state: { prefs }, version: 1 }));
    run();
    const expected = freshRoot();
    applyPrefs(prefs, expected, false);
    const root = document.documentElement;
    for (const attr of ["data-accent", "data-bg", "data-density", "data-motion"]) {
      expect(root.getAttribute(attr), attr).toBe(expected.getAttribute(attr));
    }
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.fontSize).toBe("110%");
  });

  it("ignores values that are not on the allow-list", () => {
    window.localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ state: { prefs: { appearance: { accent: '"><script>', background: "x" } } } }),
    );
    run();
    const root = document.documentElement;
    expect(root.getAttribute("data-accent")).toBe("indigo");
    expect(root.getAttribute("data-bg")).toBe("default");
  });

  it("survives corrupt storage", () => {
    window.localStorage.setItem(PREFS_STORAGE_KEY, "{not json");
    expect(run).not.toThrow();
  });
});

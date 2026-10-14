import { converter } from "culori";
import { contrast, oklchHex, solveColor, toHex } from "./color";
import {
  PALETTE_DEFS,
  STATUS_DEFS,
  TASK_HUES,
  type PaletteDef,
} from "./palettes";

export type Scheme = "light" | "dark";

/** A foreground/background pair that must meet `min` contrast. */
export interface ContrastCheck {
  id: string;
  fg: string;
  bg: string;
  min: number;
}

type Tokens = Record<string, string>;

const oklchOf = converter("oklch");

/** OKLCH lightness of a CSS color (0–1). */
function lightnessOf(color: string): number {
  return oklchOf(color)?.l ?? 0;
}

/** Hand-authored neutral surfaces. Contrast of these is verified below. */
const SURFACES: Record<Scheme, Tokens> = {
  light: {
    canvas: "oklch(0.955 0.02 285)",
    background: "oklch(0.985 0.006 285)",
    foreground: "oklch(0.24 0.04 270)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.24 0.04 270)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.24 0.04 270)",
    secondary: "oklch(0.955 0.012 280)",
    "secondary-foreground": "oklch(0.3 0.04 270)",
    muted: "oklch(0.955 0.012 280)",
    "muted-foreground": "oklch(0.46 0.035 270)",
    border: "oklch(0.91 0.012 275)",
    input: "oklch(0.64 0.02 275)",
    sidebar: "oklch(0.21 0.05 268)",
    "sidebar-foreground": "oklch(0.97 0.01 268)",
    "sidebar-muted": "oklch(0.78 0.03 268)",
    "sidebar-border": "oklch(0.3 0.05 268)",
    "sidebar-hover": "oklch(0.27 0.05 268)",
  },
  dark: {
    canvas: "oklch(0.13 0.03 270)",
    background: "oklch(0.18 0.035 270)",
    foreground: "oklch(0.96 0.01 270)",
    card: "oklch(0.225 0.04 270)",
    "card-foreground": "oklch(0.96 0.01 270)",
    popover: "oklch(0.225 0.04 270)",
    "popover-foreground": "oklch(0.96 0.01 270)",
    secondary: "oklch(0.27 0.04 270)",
    "secondary-foreground": "oklch(0.94 0.01 270)",
    muted: "oklch(0.27 0.04 270)",
    "muted-foreground": "oklch(0.74 0.03 270)",
    border: "oklch(0.31 0.04 270)",
    input: "oklch(0.58 0.03 270)",
    sidebar: "oklch(0.15 0.04 268)",
    "sidebar-foreground": "oklch(0.97 0.01 268)",
    "sidebar-muted": "oklch(0.76 0.03 268)",
    "sidebar-border": "oklch(0.27 0.04 268)",
    "sidebar-hover": "oklch(0.21 0.045 268)",
  },
};

const WHITE = "#ffffff";
const INK = toHex("oklch(0.2 0.03 270)");
const MARGIN = 0.1;
const TEXT_MIN = 4.5;
const UI_MIN = 3;

function surfaceChecks(scheme: Scheme): ContrastCheck[] {
  const s = SURFACES[scheme];
  const bgs = ["card", "background", "secondary"] as const;
  const checks: ContrastCheck[] = [];
  for (const bg of bgs) {
    checks.push({
      id: `${scheme}: foreground on ${bg}`,
      fg: s.foreground,
      bg: s[bg],
      min: TEXT_MIN,
    });
    checks.push({
      id: `${scheme}: muted-foreground on ${bg}`,
      fg: s["muted-foreground"],
      bg: s[bg],
      min: TEXT_MIN,
    });
  }
  checks.push({
    id: `${scheme}: input border on card`,
    fg: s.input,
    bg: s.card,
    min: UI_MIN,
  });
  checks.push({
    id: `${scheme}: sidebar foreground on sidebar`,
    fg: s["sidebar-foreground"],
    bg: s.sidebar,
    min: TEXT_MIN,
  });
  checks.push({
    id: `${scheme}: sidebar muted on sidebar`,
    fg: s["sidebar-muted"],
    bg: s.sidebar,
    min: TEXT_MIN,
  });
  checks.push({
    id: `${scheme}: sidebar muted on sidebar hover`,
    fg: s["sidebar-muted"],
    bg: s["sidebar-hover"],
    min: TEXT_MIN,
  });
  return checks;
}

function pairId(scheme: Scheme, name: string, what: string): string {
  return `${scheme}: ${name} ${what}`;
}

/** Accent tokens for one palette in one scheme, plus the checks they satisfy. */
export function buildAccent(
  def: PaletteDef,
  scheme: Scheme,
): { tokens: Tokens; checks: ContrastCheck[]; fill: string; fg: string } {
  const s = SURFACES[scheme];
  const { hue, chroma } = def;
  const card = toHex(s.card);
  const surface = toHex(s.background);
  const sidebar = toHex(s.sidebar);

  let fill: string;
  let fg: string;
  if (scheme === "light") {
    if (def.fg === "light") {
      fill = solveColor({
        hue,
        chroma,
        start: def.fillL,
        direction: -1,
        against: [WHITE],
        min: TEXT_MIN + MARGIN,
      });
      fg = WHITE;
    } else {
      fill = solveColor({
        hue,
        chroma,
        start: def.fillL,
        direction: 1,
        against: [INK],
        min: 6,
      });
      fg = INK;
    }
  } else {
    fill = solveColor({
      hue,
      chroma: chroma * 0.95,
      start: 0.72,
      direction: 1,
      against: [INK],
      min: 6,
    });
    fg = INK;
  }

  const fillL = lightnessOf(fill);
  const hoverL = fg === WHITE ? fillL - 0.04 : fillL + 0.03;
  const hover = oklchHex(hoverL, chroma, hue);

  const primaryText =
    scheme === "light"
      ? solveColor({
          hue,
          chroma,
          start: 0.55,
          direction: -1,
          against: [card, surface],
          min: TEXT_MIN + MARGIN,
        })
      : solveColor({
          hue,
          chroma,
          start: 0.78,
          direction: 1,
          against: [card, surface],
          min: TEXT_MIN + MARGIN,
        });

  const soft =
    scheme === "light"
      ? oklchHex(0.955, chroma * 0.28, hue)
      : oklchHex(0.3, chroma * 0.4, hue);
  const softText =
    scheme === "light"
      ? solveColor({
          hue,
          chroma,
          start: 0.5,
          direction: -1,
          against: [soft, card],
          min: TEXT_MIN + MARGIN,
        })
      : solveColor({
          hue,
          chroma,
          start: 0.82,
          direction: 1,
          against: [soft, card],
          min: TEXT_MIN + MARGIN,
        });
  const border =
    scheme === "light"
      ? oklchHex(0.86, chroma * 0.4, hue)
      : oklchHex(0.4, chroma * 0.5, hue);

  const ring = solveColor({
    hue,
    chroma,
    start: scheme === "light" ? 0.6 : 0.7,
    direction: scheme === "light" ? -1 : 1,
    against: [card],
    min: UI_MIN + MARGIN,
  });

  // Sidebar pill: must stand out from the navy sidebar and carry readable text.
  let pill = fill;
  let pillFg = fg;
  for (let i = 0; i <= 200; i += 1) {
    const l = Math.min(1, fillL + i * 0.005);
    const candidate = oklchHex(l, chroma, hue);
    const onWhite = contrast(candidate, WHITE) >= TEXT_MIN + MARGIN;
    const onInk = contrast(candidate, INK) >= TEXT_MIN + MARGIN;
    if (contrast(candidate, sidebar) >= UI_MIN + MARGIN && (onWhite || onInk)) {
      pill = candidate;
      pillFg = onWhite ? WHITE : INK;
      break;
    }
  }

  const logoB = oklchHex(0.72, chroma, hue + 38);

  const tokens: Tokens = {
    primary: fill,
    "primary-foreground": fg,
    "primary-hover": hover,
    "primary-text": primaryText,
    "primary-soft": soft,
    "primary-soft-text": softText,
    "primary-border": border,
    ring,
    "sidebar-primary": pill,
    "sidebar-primary-foreground": pillFg,
    "logo-a": fill,
    "logo-b": logoB,
  };

  const n = def.id;
  const checks: ContrastCheck[] = [
    { id: pairId(scheme, n, "fill text"), fg, bg: fill, min: TEXT_MIN },
    { id: pairId(scheme, n, "hover fill text"), fg, bg: hover, min: TEXT_MIN },
    { id: pairId(scheme, n, "text on card"), fg: primaryText, bg: card, min: TEXT_MIN },
    { id: pairId(scheme, n, "text on surface"), fg: primaryText, bg: surface, min: TEXT_MIN },
    { id: pairId(scheme, n, "soft text on soft"), fg: softText, bg: soft, min: TEXT_MIN },
    { id: pairId(scheme, n, "soft text on card"), fg: softText, bg: card, min: TEXT_MIN },
    { id: pairId(scheme, n, "focus ring on card"), fg: ring, bg: card, min: UI_MIN },
    { id: pairId(scheme, n, "sidebar pill vs sidebar"), fg: pill, bg: sidebar, min: UI_MIN },
    { id: pairId(scheme, n, "sidebar pill text"), fg: pillFg, bg: pill, min: TEXT_MIN },
  ];
  return { tokens, checks, fill, fg };
}

/** Status (success/warning/danger/info) tokens for one scheme. */
function buildStatus(scheme: Scheme): { tokens: Tokens; checks: ContrastCheck[] } {
  const s = SURFACES[scheme];
  const card = toHex(s.card);
  const tokens: Tokens = {};
  const checks: ContrastCheck[] = [];
  for (const def of STATUS_DEFS) {
    const { id, hue } = def;
    const soft =
      scheme === "light" ? oklchHex(0.95, 0.04, hue) : oklchHex(0.3, 0.06, hue);
    const text = solveColor({
      hue,
      chroma: 0.16,
      start: scheme === "light" ? 0.48 : 0.82,
      direction: scheme === "light" ? -1 : 1,
      against: [soft, card],
      min: TEXT_MIN + MARGIN,
    });
    const solid =
      scheme === "light"
        ? solveColor({ hue, chroma: 0.17, start: 0.62, direction: -1, against: [WHITE], min: TEXT_MIN + MARGIN })
        : solveColor({ hue, chroma: 0.15, start: 0.72, direction: 1, against: [INK], min: 6 });
    const solidFg = scheme === "light" ? WHITE : INK;
    const border =
      scheme === "light" ? oklchHex(0.86, 0.06, hue) : oklchHex(0.42, 0.08, hue);
    tokens[id] = solid;
    tokens[`${id}-foreground`] = solidFg;
    tokens[`${id}-soft`] = soft;
    tokens[`${id}-text`] = text;
    tokens[`${id}-border`] = border;
    checks.push(
      { id: pairId(scheme, id, "text on soft"), fg: text, bg: soft, min: TEXT_MIN },
      { id: pairId(scheme, id, "text on card"), fg: text, bg: card, min: TEXT_MIN },
      { id: pairId(scheme, id, "solid text"), fg: solidFg, bg: solid, min: TEXT_MIN },
    );
  }
  return { tokens, checks };
}

/** Task-block tokens: soft tint, stronger accent bar, readable title and time. */
function buildTaskHues(scheme: Scheme): { tokens: Tokens; checks: ContrastCheck[] } {
  const tokens: Tokens = {};
  const checks: ContrastCheck[] = [];
  for (const def of TASK_HUES) {
    const { id, hue, chroma } = def;
    const bg =
      scheme === "light"
        ? oklchHex(0.945, chroma * 0.5, hue)
        : oklchHex(0.3, chroma * 0.6, hue);
    const bar = solveColor({
      hue,
      chroma: chroma * 1.7,
      start: scheme === "light" ? 0.72 : 0.7,
      direction: scheme === "light" ? -1 : 1,
      against: [bg],
      min: UI_MIN + MARGIN,
    });
    const text =
      scheme === "light" ? oklchHex(0.27, 0.04, hue) : oklchHex(0.95, 0.02, hue);
    const muted = solveColor({
      hue,
      chroma: 0.03,
      start: scheme === "light" ? 0.5 : 0.78,
      direction: scheme === "light" ? -1 : 1,
      against: [bg],
      min: TEXT_MIN + MARGIN,
    });
    tokens[`task-${id}-bg`] = bg;
    tokens[`task-${id}-bar`] = bar;
    tokens[`task-${id}-fg`] = text;
    tokens[`task-${id}-muted`] = muted;
    checks.push(
      { id: pairId(scheme, `task-${id}`, "title on tint"), fg: text, bg, min: TEXT_MIN },
      { id: pairId(scheme, `task-${id}`, "time on tint"), fg: muted, bg, min: TEXT_MIN },
      { id: pairId(scheme, `task-${id}`, "bar vs tint"), fg: bar, bg, min: UI_MIN },
    );
  }
  return { tokens, checks };
}

function declarations(tokens: Tokens): string {
  return Object.entries(tokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
}

export interface BuiltPalette {
  id: string;
  name: string;
  /** Light-theme fill, used for the swatch. */
  swatch: string;
  /** Foreground that is readable on the swatch (e.g. its check mark). */
  swatchFg: string;
}

export interface BuiltTheme {
  css: string;
  palettes: BuiltPalette[];
  checks: ContrastCheck[];
}

/** Build every generated token. Deterministic: same source → same output. */
export function buildTheme(): BuiltTheme {
  const checks: ContrastCheck[] = [];
  const blocks: string[] = [];

  const schemeBlocks: Record<Scheme, string> = { light: "", dark: "" };
  for (const scheme of ["light", "dark"] as const) {
    const status = buildStatus(scheme);
    const task = buildTaskHues(scheme);
    checks.push(...surfaceChecks(scheme), ...status.checks, ...task.checks);
    schemeBlocks[scheme] = declarations({
      ...SURFACES[scheme],
      ...status.tokens,
      ...task.tokens,
    });
  }
  blocks.push(`:root,\n.light {\n${schemeBlocks.light}\n}`);
  blocks.push(`.dark {\n${schemeBlocks.dark}\n}`);

  const built: BuiltPalette[] = [];
  for (const def of PALETTE_DEFS) {
    const light = buildAccent(def, "light");
    const dark = buildAccent(def, "dark");
    checks.push(...light.checks, ...dark.checks);
    built.push({ id: def.id, name: def.name, swatch: light.fill, swatchFg: light.fg });
    blocks.push(`[data-accent="${def.id}"] {\n${declarations(light.tokens)}\n}`);
    blocks.push(`.dark[data-accent="${def.id}"] {\n${declarations(dark.tokens)}\n}`);
  }

  // "Light to dark" row: order by swatch lightness, lightest first.
  built.sort((a, b) => lightnessOf(b.swatch) - lightnessOf(a.swatch));

  const css = `/* GENERATED by scripts/gen-theme.ts — do not edit. Run \`npm run gen:theme\`. */\n\n${blocks.join("\n\n")}\n`;
  return { css, palettes: built, checks };
}

/** TypeScript module consumed by the UI (keeps culori out of the client bundle). */
export function renderPalettesModule(palettes: BuiltPalette[]): string {
  const rows = palettes
    .map((p) => `  { id: "${p.id}", name: "${p.name}", swatch: "${p.swatch}", swatchFg: "${p.swatchFg}" },`)
    .join("\n");
  const ids = palettes.map((p) => `"${p.id}"`).join(", ");
  return `// GENERATED by scripts/gen-theme.ts — do not edit. Run \`npm run gen:theme\`.

export const PALETTES = [
${rows}
] as const;

export const ACCENT_IDS = [${ids}] as const;

export type AccentId = (typeof ACCENT_IDS)[number];
`;
}

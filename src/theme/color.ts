import { clampChroma, formatHex, parse, wcagContrast } from "culori";

/** Gamut-safe OKLCH → sRGB hex. */
export function oklchHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: "oklch", l, c, h }, "oklch"));
}

/** Any CSS color string (hex, oklch(...), ...) → sRGB hex. */
export function toHex(css: string): string {
  const parsed = parse(css);
  if (!parsed) throw new Error(`Unparseable color: ${css}`);
  return formatHex(parsed);
}

/** WCAG 2.x contrast ratio between two CSS colors. */
export function contrast(a: string, b: string): number {
  return wcagContrast(toHex(a), toHex(b));
}

interface SolveOptions {
  hue: number;
  chroma: number;
  /** Starting lightness (0–1). */
  start: number;
  /** +1 lightens, -1 darkens. */
  direction: 1 | -1;
  /** Colors the result must contrast against. */
  against: readonly string[];
  /** Minimum WCAG contrast ratio against every entry in `against`. */
  min: number;
}

/**
 * Walk lightness from `start` in `direction` until the color meets `min`
 * contrast against every background. Deterministic; throws if unsatisfiable
 * so a bad token definition fails the build instead of shipping.
 */
export function solveColor(opts: SolveOptions): string {
  const step = 0.005;
  for (let i = 0; i <= 200; i += 1) {
    const l = opts.start + opts.direction * i * step;
    if (l < 0 || l > 1) break;
    const hex = oklchHex(l, opts.chroma, opts.hue);
    if (opts.against.every((bg) => contrast(hex, bg) >= opts.min)) return hex;
  }
  throw new Error(
    `No color with hue ${opts.hue} reaches ${opts.min}:1 against ${opts.against.join(", ")}`,
  );
}

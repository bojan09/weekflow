import { compositeHex, toHex } from "./color";
import { BACKGROUND_IDS, type BackgroundId } from "./backgrounds";

/**
 * The darkest and lightest colors each page background can show behind a
 * translucent surface. The build solves the minimum safe surface opacity
 * against these, so text stays readable over every part of every background.
 * Update this when a background in backgrounds.css changes.
 */
export function backdropExtremes(
  id: BackgroundId,
  scheme: "light" | "dark",
  canvas: string,
): [string, string] {
  const dot = scheme === "light" ? compositeHex("oklch(0.62 0.04 275)", 0.4, canvas) : compositeHex("oklch(0.72 0.04 275)", 0.28, canvas);
  switch (id) {
    case "default":
      return [toHex(canvas), toHex(canvas)];
    case "light":
      return [toHex("oklch(0.975 0.004 270)"), toHex("oklch(0.975 0.004 270)")];
    case "dark":
      return [toHex("oklch(0.14 0.03 270)"), toHex("oklch(0.14 0.03 270)")];
    case "tint-lavender":
      return scheme === "light" ? [toHex("oklch(0.925 0.045 290)"), toHex("oklch(0.925 0.045 290)")] : [toHex("oklch(0.2 0.06 290)"), toHex("oklch(0.2 0.06 290)")];
    case "tint-mint":
      return scheme === "light" ? [toHex("oklch(0.94 0.045 170)"), toHex("oklch(0.94 0.045 170)")] : [toHex("oklch(0.2 0.045 170)"), toHex("oklch(0.2 0.045 170)")];
    case "tint-rose":
      return scheme === "light" ? [toHex("oklch(0.94 0.04 10)"), toHex("oklch(0.94 0.04 10)")] : [toHex("oklch(0.2 0.05 10)"), toHex("oklch(0.2 0.05 10)")];
    case "dots":
    case "lines":
      return scheme === "light" ? [dot, toHex(canvas)] : [toHex(canvas), dot];
    case "ocean":
      return ["#1c5fa6", "#b0e4f4"];
    case "mountain":
      return ["#365a6a", "#f4dcc8"];
    case "forest":
      return ["#0e3b2a", "#a9d6a0"];
    case "sunset":
      return ["#5b4fa8", "#ffe6a8"];
  }
}

export const ALL_BACKGROUND_IDS = BACKGROUND_IDS;

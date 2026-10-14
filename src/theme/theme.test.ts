import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTheme, renderPalettesModule } from "./build";
import { BACKGROUND_IDS, BACKGROUNDS } from "./backgrounds";
import { contrast } from "./color";
import { PALETTE_DEFS, TASK_HUES } from "./palettes";

const theme = buildTheme();

describe("theme contrast", () => {
  it("defines exactly 15 accent palettes", () => {
    expect(PALETTE_DEFS).toHaveLength(15);
    expect(theme.palettes).toHaveLength(15);
    expect(new Set(theme.palettes.map((p) => p.id)).size).toBe(15);
  });

  it("every foreground/background pair meets its WCAG minimum in light and dark", () => {
    const failures = theme.checks
      .map((c) => ({ ...c, ratio: contrast(c.fg, c.bg) }))
      .filter((c) => c.ratio < c.min)
      .map((c) => `${c.id}: ${c.ratio.toFixed(2)} < ${c.min}`);
    expect(failures).toEqual([]);
  });

  it("checks every palette in both schemes", () => {
    for (const def of PALETTE_DEFS) {
      for (const scheme of ["light", "dark"]) {
        const matching = theme.checks.filter((c) => c.id.startsWith(`${scheme}: ${def.id} `));
        expect(matching.length, `${scheme} ${def.id}`).toBeGreaterThanOrEqual(9);
      }
    }
  });

  it("checks every task hue in both schemes", () => {
    for (const hue of TASK_HUES) {
      for (const scheme of ["light", "dark"]) {
        const matching = theme.checks.filter((c) => c.id.startsWith(`${scheme}: task-${hue.id} `));
        expect(matching).toHaveLength(3);
      }
    }
  });

  it("orders the swatch row from light to dark", () => {
    const order = theme.palettes.map((p) => p.id);
    expect(order[0]).toBe("yellow");
    expect(order[order.length - 1]).toBe("navy");
  });

  it("is deterministic", () => {
    expect(buildTheme().css).toBe(theme.css);
  });
});

describe("generated files", () => {
  const root = resolve(__dirname, "../..");

  it("tokens.css is up to date (run npm run gen:theme)", () => {
    const onDisk = readFileSync(resolve(root, "src/theme/generated/tokens.css"), "utf8");
    expect(onDisk).toBe(theme.css);
  });

  it("palettes.ts is up to date (run npm run gen:theme)", () => {
    const onDisk = readFileSync(resolve(root, "src/theme/generated/palettes.ts"), "utf8");
    expect(onDisk).toBe(renderPalettesModule(theme.palettes));
  });
});

describe("glass surfaces", () => {
  it("solves an opacity for every background in both schemes", () => {
    for (const id of BACKGROUND_IDS) {
      expect(theme.css, `light ${id}`).toContain(`[data-bg="${id}"] {\n  --glass-subtle-panel`);
      expect(theme.css, `dark ${id}`).toContain(`.dark [data-bg="${id}"] {\n  --glass-subtle-panel`);
    }
  });

  it("keeps opacities in range and frosted never more opaque than subtle", () => {
    const rows = [...theme.css.matchAll(/--glass-subtle-panel: ([\d.]+);\n {2}--glass-frosted-panel: ([\d.]+);/g)];
    expect(rows.length).toBe(BACKGROUND_IDS.length * 2);
    for (const [, subtle, frosted] of rows) {
      expect(Number(frosted)).toBeLessThanOrEqual(Number(subtle));
      expect(Number(frosted)).toBeGreaterThanOrEqual(0.5);
      expect(Number(subtle)).toBeLessThanOrEqual(1);
    }
  });

  it("checks text over translucent panels for every background", () => {
    const glassChecks = theme.checks.filter((c) => c.id.includes("glass"));
    expect(glassChecks.length).toBeGreaterThan(1000);
  });
});

describe("backgrounds", () => {
  it("keeps the id list and the labelled list in sync", () => {
    expect(BACKGROUNDS.map((b) => b.id)).toEqual([...BACKGROUND_IDS]);
  });

  it("defines CSS for every background", () => {
    const css = readFileSync(resolve(__dirname, "backgrounds.css"), "utf8");
    for (const id of BACKGROUND_IDS) {
      expect(css, id).toContain(`[data-bg="${id}"]`);
    }
  });
});

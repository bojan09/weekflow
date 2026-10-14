import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTheme, renderPalettesModule } from "../src/theme/build";
import { contrast } from "../src/theme/color";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/theme/generated");

const theme = buildTheme();
const failures = theme.checks.filter((c) => contrast(c.fg, c.bg) < c.min);
if (failures.length > 0) {
  for (const f of failures) {
    console.error(`contrast ${contrast(f.fg, f.bg).toFixed(2)} < ${f.min}: ${f.id}`);
  }
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, "tokens.css"), theme.css);
writeFileSync(resolve(out, "palettes.ts"), renderPalettesModule(theme.palettes));
console.log(
  `gen-theme: ${theme.palettes.length} palettes, ${theme.checks.length} contrast checks passed`,
);

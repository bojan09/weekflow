import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, TablesDB } from "node-appwrite";
import type { Context } from "../migrations/001-init";

/**
 * Runs every migration in /migrations, in order. Each one is idempotent.
 * Needs APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env
 * (or the environment). The API key never reaches the browser.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  // Variables may come from the real environment instead.
}
try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch {
  // Optional.
}

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY.");
  process.exit(1);
}

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const ctx: Context = { tables: new TablesDB(client), log: (message) => console.log(`  ${message}`) };

async function main(): Promise<void> {
  const files = readdirSync(resolve(root, "migrations"))
    .filter((f) => /^\d{3}-.*\.ts$/.test(f))
    .sort();

  for (const file of files) {
    console.log(`migration ${file}`);
    const mod = (await import(pathToFileURL(resolve(root, "migrations", file)).href)) as { up: (c: Context) => Promise<void> };
    await mod.up(ctx);
  }
  console.log("done");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

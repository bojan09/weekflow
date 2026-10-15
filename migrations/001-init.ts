import { Permission, Role, TablesDB } from "node-appwrite";

/**
 * Schema migration 001: the database and the tables for personal data.
 * Every step is idempotent, so running it twice changes nothing.
 *
 * Security model: no table can be read by everyone. Any signed-in user may
 * create a row, and row security is on, so each row is readable and writable
 * only by the user it was created for (see `ownerPermissions` in the app).
 */
export const DATABASE_ID = "weekflow";

export interface Context {
  tables: TablesDB;
  log: (message: string) => void;
}

const isMissing = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 404;

async function waitFor(check: () => Promise<boolean>, what: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

async function ensureDatabase({ tables, log }: Context): Promise<void> {
  try {
    await tables.get({ databaseId: DATABASE_ID });
  } catch (error) {
    if (!isMissing(error)) throw error;
    await tables.create({ databaseId: DATABASE_ID, name: "Weekflow" });
    log(`created database ${DATABASE_ID}`);
  }
}

async function ensureTable({ tables, log }: Context, tableId: string, name: string): Promise<void> {
  try {
    await tables.getTable({ databaseId: DATABASE_ID, tableId });
  } catch (error) {
    if (!isMissing(error)) throw error;
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId,
      name,
      // Any signed-in user may add a row. Nobody gets table-wide read or write.
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    });
    log(`created table ${tableId}`);
  }
}

async function ensureColumn(
  { tables, log }: Context,
  tableId: string,
  key: string,
  kind: { type: "varchar"; size: number } | { type: "mediumtext" },
  required: boolean,
): Promise<void> {
  try {
    await tables.getColumn({ databaseId: DATABASE_ID, tableId, key });
    return;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  if (kind.type === "varchar") {
    await tables.createVarcharColumn({ databaseId: DATABASE_ID, tableId, key, size: kind.size, required });
  } else {
    await tables.createMediumtextColumn({ databaseId: DATABASE_ID, tableId, key, required });
  }
  await waitFor(async () => {
    const column = (await tables.getColumn({ databaseId: DATABASE_ID, tableId, key })) as { status: string };
    return column.status === "available";
  }, `${tableId}.${key}`);
  log(`created column ${tableId}.${key}`);
}

async function ensureIndex({ tables, log }: Context, tableId: string, key: string, columns: string[]): Promise<void> {
  try {
    await tables.getIndex({ databaseId: DATABASE_ID, tableId, key });
    return;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  await tables.createIndex({ databaseId: DATABASE_ID, tableId, key, type: "key" as never, columns });
  await waitFor(async () => {
    const index = (await tables.getIndex({ databaseId: DATABASE_ID, tableId, key })) as { status: string };
    return index.status === "available";
  }, `index ${tableId}.${key}`);
  log(`created index ${tableId}.${key}`);
}

/** Tables that hold one JSON document per item, owned by one user. */
const ITEM_TABLES: ReadonlyArray<{ id: string; name: string }> = [
  { id: "tasks", name: "Tasks" },
  { id: "projects", name: "Projects" },
  { id: "templates", name: "Templates" },
  { id: "snapshots", name: "Schedule history" },
];

export async function up(ctx: Context): Promise<void> {
  await ensureDatabase(ctx);

  for (const table of ITEM_TABLES) {
    await ensureTable(ctx, table.id, table.name);
    await ensureColumn(ctx, table.id, "ownerId", { type: "varchar", size: 64 }, true);
    await ensureColumn(ctx, table.id, "data", { type: "mediumtext" }, true);
    await ensureIndex(ctx, table.id, "by_owner", ["ownerId"]);
  }

  // One row per user, with the row id equal to the user id.
  await ensureTable(ctx, "profiles", "Profiles");
  await ensureColumn(ctx, "profiles", "ownerId", { type: "varchar", size: 64 }, true);
  await ensureColumn(ctx, "profiles", "displayName", { type: "varchar", size: 120 }, false);
  await ensureColumn(ctx, "profiles", "data", { type: "mediumtext" }, false);
  await ensureIndex(ctx, "profiles", "by_owner", ["ownerId"]);
}

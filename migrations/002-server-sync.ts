import { TablesDBIndexType } from "node-appwrite";
import { DATABASE_ID, type Context } from "./001-init";

const missing = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 404;

/** Server-authorized writes, owner/team-only row reads. No existing rows are removed. */
export async function up({ tables, log }: Context): Promise<void> {
  for (const tableId of ["account_data", "team_states"]) {
    try { await tables.getTable({ databaseId: DATABASE_ID, tableId }); }
    catch (error) {
      if (!missing(error)) throw error;
      await tables.createTable({ databaseId: DATABASE_ID, tableId, name: tableId === "account_data" ? "Account data" : "Shared workspaces", permissions: [], rowSecurity: true });
    }
    for (const key of ["ownerId", "data"]) {
      try { await tables.getColumn({ databaseId: DATABASE_ID, tableId, key }); }
      catch (error) {
        if (!missing(error)) throw error;
        if (key === "ownerId") await tables.createVarcharColumn({ databaseId: DATABASE_ID, tableId, key, size: 64, required: true });
        else await tables.createMediumtextColumn({ databaseId: DATABASE_ID, tableId, key, required: true });
      }
      for (let attempt = 0; attempt < 120; attempt++) {
        const column = await tables.getColumn({ databaseId: DATABASE_ID, tableId, key });
        if ("status" in column && column.status === "available") break;
        if (attempt === 119) throw new Error(`Column ${tableId}.${key} did not become available`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    try { await tables.getIndex({ databaseId: DATABASE_ID, tableId, key: "by_owner" }); }
    catch (error) {
      if (!missing(error)) throw error;
      await tables.createIndex({ databaseId: DATABASE_ID, tableId, key: "by_owner", type: TablesDBIndexType.Key, columns: ["ownerId"] });
    }
    log(`ready ${tableId}`);
  }
  // The demo never uses these tables. Prevent direct clients bypassing server validation.
  for (const tableId of ["tasks", "projects", "templates", "snapshots", "profiles", "account_data", "team_states"]) {
    await tables.updateTable({ databaseId: DATABASE_ID, tableId, name: (await tables.getTable({ databaseId: DATABASE_ID, tableId })).name, permissions: [], rowSecurity: true });
  }
}

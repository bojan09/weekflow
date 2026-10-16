import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { TablesDB } from "node-appwrite";
import { DATABASE_ID } from "./appwrite";
import { codeOf, HttpError } from "./http";

const address = (userId: string) => ({ databaseId: DATABASE_ID, tableId: "account_data", rowId: `state.${createHash("sha256").update(userId).digest("hex").slice(0, 30)}` });
const ownerId = "system:account-state";

async function ensureMarker(tables: TablesDB, userId: string) {
  const params = address(userId);
  try { await tables.getRow(params); }
  catch (error) {
    if (codeOf(error) !== 404) throw error;
    try { await tables.createRow({ ...params, data: { ownerId, data: "active" }, permissions: [] }); }
    catch (race) { if (codeOf(race) !== 409) throw race; }
  }
  return params;
}

/** Touch the same marker in every save and deletion transaction, so writes
 * already authenticated on another worker cannot outlive successful deletion.
 */
export async function stageActiveAccount(tables: TablesDB, userId: string, transactionId: string) {
  const params = { ...await ensureMarker(tables, userId), transactionId };
  await tables.updateRow({ ...params, data: { ownerId } });
  const marker = await tables.getRow(params);
  if (marker.data !== "active") throw new HttpError(409, "Account deletion is in progress. No planner changes were saved.", "account_deleting");
}

async function changeMarker(tables: TablesDB, userId: string, change: (current: string) => string) {
  const params = await ensureMarker(tables, userId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const tx = await tables.createTransaction({ ttl: 60 });
    try {
      await tables.updateRow({ ...params, transactionId: tx.$id, data: { ownerId } });
      const marker = await tables.getRow({ ...params, transactionId: tx.$id });
      await tables.updateRow({ ...params, transactionId: tx.$id, data: { data: change(String(marker.data)) } });
      await tables.updateTransaction({ transactionId: tx.$id, commit: true });
      return;
    } catch (error) {
      await tables.updateTransaction({ transactionId: tx.$id, rollback: true }).catch(() => undefined);
      if (codeOf(error) === 409 && attempt < 2) continue;
      throw error;
    }
  }
}

export async function beginAccountDeletion(tables: TablesDB, userId: string): Promise<string> {
  const operationId = randomUUID();
  await changeMarker(tables, userId, (current) => {
    if (current !== "active") throw new HttpError(409, "Account deletion is already in progress.", "account_deleting");
    return `deleting:${operationId}`;
  });
  return operationId;
}

/** Only the operation that acquired deletion may roll back. Deleted is final. */
export async function finishAccountDeletion(tables: TablesDB, userId: string, operationId: string, outcome: "active" | "deleted") {
  await changeMarker(tables, userId, (current) => {
    if (current === "deleted") return "deleted";
    if (current !== `deleting:${operationId}`) throw new HttpError(409, "A different deletion operation owns this account.");
    return outcome;
  });
}

import "server-only";
import { createHash } from "node:crypto";
import { Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { emptyAccount, resourceSchemas, resourceSchema, type Resource } from "@/data/account-schema";
import { adminServices, DATABASE_ID, requireUser } from "./appwrite";
import { codeOf, HttpError } from "./http";
import { stageActiveAccount } from "./account-lifecycle";

const TABLE = "account_data";
const rowId = (owner: string, resource: Resource) => createHash("sha256").update(`${owner}:${resource}`).digest("hex").slice(0, 36);
const savedSchema = z.object({ resource: resourceSchema, revision: z.number().int().nonnegative(), value: z.unknown() });

function assertAccount(actual: string, expected: string | null) {
  if (expected !== actual) throw new HttpError(409, "The signed-in account changed. Sign in to the original account to resume this planner.", "session_changed");
}

export async function loadPersonal(expectedAccount: string | null) {
  const { user } = await requireUser();
  assertAccount(user.$id, expectedAccount);
  const { tables } = adminServices();
  const rows = await tables.listRows({ databaseId: DATABASE_ID, tableId: TABLE, queries: [Query.equal("ownerId", user.$id), Query.limit(20)] });
  const snapshot = emptyAccount(user);
  for (const row of rows.rows) {
    const saved = savedSchema.parse(JSON.parse(String(row.data)));
    snapshot[saved.resource] = { revision: saved.revision, value: resourceSchemas[saved.resource].parse(saved.value) };
  }
  // Email and join date are authoritative account fields, never client supplied.
  snapshot.profile.value = { ...(snapshot.profile.value as object), email: user.email, joinedAt: user.$createdAt.slice(0, 10) };
  return snapshot;
}

export async function savePersonal(resource: Resource, input: unknown, expectedAccount: string | null) {
  const { user } = await requireUser();
  assertAccount(user.$id, expectedAccount);
  const { revision, value } = z.object({ revision: z.number().int().nonnegative(), value: z.unknown() }).strict().parse(input);
  let valid: unknown = resourceSchemas[resource].parse(value);
  if (resource === "profile") valid = { ...(valid as object), email: user.email, joinedAt: user.$createdAt.slice(0, 10) };
  const { tables } = adminServices();
  for (let attempt = 0; attempt < 3; attempt++) {
  const transaction = await tables.createTransaction({ ttl: 60 });
  const params = { databaseId: DATABASE_ID, tableId: TABLE, rowId: rowId(user.$id, resource), transactionId: transaction.$id };
  try {
    await stageActiveAccount(tables, user.$id, transaction.$id);
    let exists = false;
    let currentRevision = 0;
    try {
      // Stage before reading so the row cannot change between the revision
      // check and the transaction's first write without a commit conflict.
      const initial = await tables.getRow({ databaseId: DATABASE_ID, tableId: TABLE, rowId: params.rowId });
      if (initial.ownerId !== user.$id) throw new HttpError(403, "You cannot change this data.");
      await tables.updateRow({ ...params, data: { ownerId: user.$id } });
      const current = await tables.getRow(params);
      if (current.ownerId !== user.$id) throw new HttpError(403, "You cannot change this data.");
      currentRevision = savedSchema.parse(JSON.parse(String(current.data))).revision;
      exists = true;
    } catch (error) { if (codeOf(error) !== 404) throw error; }
    if (revision !== currentRevision) throw new HttpError(409, "This data changed on another device. Export your pending changes, then reload before continuing.", "sync_conflict");
    const saved = { resource, revision: revision + 1, value: valid };
    const data = { ownerId: user.$id, data: JSON.stringify(saved) };
    if (exists) await tables.updateRow({ ...params, data, permissions: [Permission.read(Role.user(user.$id))] });
    else await tables.createRow({ ...params, data, permissions: [Permission.read(Role.user(user.$id))] });
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
    return { revision: saved.revision, value: valid };
  } catch (error) {
    await tables.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    if (codeOf(error) === 409) {
      if (attempt < 2) continue;
      throw new HttpError(409, "Another device saved first. Export your pending changes and reload.", "sync_conflict");
    }
    throw error;
  }
  }
  throw new HttpError(409, "Could not save while another change was in progress.");
}

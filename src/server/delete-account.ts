import "server-only";
import { Account, Query } from "node-appwrite";
import { z } from "zod";
import { adminServices, baseClient, DATABASE_ID, requireUser } from "./appwrite";
import { HttpError } from "./http";
import { deleteSoloWorkspaceForAccount, leaveTeamForAccountDeletion } from "./team";
import { beginAccountDeletion, finishAccountDeletion } from "./account-lifecycle";
import { codeOf } from "./http";

/** Re-authenticate before permanent deletion. Team owners must resolve ownership first. */
export async function deleteOwnAccount(body: unknown) {
  const { password } = z.object({ password: z.string().min(1).max(256), confirm: z.literal("DELETE") }).strict().parse(body);
  const { user, teams } = await requireUser();
  const admin = adminServices();
  const proof = await admin.account.createEmailPasswordSession({ email: user.email, password });
  const proofAccount = new Account(baseClient().setSession(proof.secret));
  await proofAccount.deleteSession({ sessionId: "current" });
  let cursor: string | undefined;
  const ownTeams: string[] = [];
  do {
    const page = await teams.list({ queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    for (const team of page.teams) {
      const memberships = await teams.listMemberships({ teamId: team.$id, queries: [Query.equal("userId", user.$id), Query.limit(1)] });
      if (memberships.memberships.some((member) => member.roles.includes("owner"))) {
        const members = await teams.listMemberships({ teamId: team.$id, queries: [Query.limit(1)] });
        if (members.total > 1) {
          await leaveTeamForAccountDeletion(team.$id);
          continue;
        }
        ownTeams.push(team.$id);
      }
    }
    cursor = page.teams.length === 100 ? page.teams.at(-1)?.$id : undefined;
  } while (cursor);
  const operationId = await beginAccountDeletion(admin.tables, user.$id);
  try {
  for (const teamId of ownTeams) {
    await deleteSoloWorkspaceForAccount(teamId);
  }
  for (const tableId of ["account_data", "tasks", "projects", "templates", "snapshots", "profiles"]) {
    // Fetch the first page repeatedly as rows are removed, without skipping any.
    while (true) {
      const page = await admin.tables.listRows({ databaseId: DATABASE_ID, tableId, queries: [Query.equal("ownerId", user.$id), Query.limit(100)] });
      if (!page.rows.length) break;
      for (const row of page.rows) await admin.tables.deleteRow({ databaseId: DATABASE_ID, tableId, rowId: row.$id });
    }
  }
  await admin.users.delete({ userId: user.$id });
  await finishAccountDeletion(admin.tables, user.$id, operationId, "deleted");
  } catch (failure) {
    try { await admin.users.get({ userId: user.$id }); }
    catch (error) {
      if (codeOf(error) === 404) {
        // The user is gone. Never reactivate even if finalization was interrupted.
        await finishAccountDeletion(admin.tables, user.$id, operationId, "deleted").catch(() => undefined);
        return;
      }
      throw new HttpError(503, "Could not confirm account deletion. Please try again later.");
    }
    await finishAccountDeletion(admin.tables, user.$id, operationId, "active");
    if (failure instanceof HttpError && failure.status === 409) throw failure;
    throw new HttpError(503, "Account deletion did not finish. Some data may already have been removed. Please retry deletion.");
  }
}

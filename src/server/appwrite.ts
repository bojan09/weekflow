import "server-only";
import { Account, Client, TablesDB, Teams, Users } from "node-appwrite";
import { cookies } from "next/headers";
import { cache } from "react";
import { HttpError, codeOf } from "./http";

export const SESSION_COOKIE = "weekflow-session";
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "weekflow";

export function baseClient(): Client {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !project) throw new HttpError(503, "Accounts are not configured on this deployment.");
  return new Client().setEndpoint(endpoint).setProject(project);
}

export function adminServices() {
  if (!process.env.APPWRITE_API_KEY) throw new HttpError(503, "The account service is not configured.");
  const client = baseClient().setKey(process.env.APPWRITE_API_KEY);
  return { client, account: new Account(client), tables: new TablesDB(client), teams: new Teams(client), users: new Users(client) };
}

export const requireUser = cache(async () => {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) throw new HttpError(401, "Sign in to continue.");
  const client = baseClient().setSession(secret);
  const account = new Account(client);
  try {
    const user = await account.get();
    return { user, client, account, teams: new Teams(client), tables: new TablesDB(client) };
  } catch (error) {
    if (codeOf(error) === 401) throw new HttpError(401, "Your session has ended. Sign in again.");
    throw error;
  }
});

export function publicUser(user: { $id: string; name: string; email: string; emailVerification: boolean }) {
  return { id: user.$id, name: user.name, email: user.email, emailVerified: user.emailVerification };
}

export async function setSessionCookie(session: { secret: string; expire: string }) {
  if (!session.secret) throw new HttpError(503, "The server key needs the sessions.write scope.");
  (await cookies()).set(SESSION_COOKIE, session.secret, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", expires: new Date(session.expire),
  });
}

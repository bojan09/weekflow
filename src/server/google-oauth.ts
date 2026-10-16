import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { OAuthProvider } from "node-appwrite";
import { z } from "zod";
import { safeNext } from "@/auth/schemas";
import { adminServices, setSessionCookie } from "./appwrite";
import { HttpError } from "./http";

export const OAUTH_COOKIE = "weekflow-oauth";
const flowSchema = z.object({ state: z.string().regex(/^[a-f0-9]{64}$/), next: z.string().max(1024), issuedAt: z.number() });
const tokenSchema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(2048) });
const unavailable = () => new HttpError(503, "Google sign-in is unavailable. Please try email sign-in or ask the workspace owner to check the Google provider configuration.", "google_unavailable");

export async function beginGoogleSignIn(origin: string, next: string | undefined): Promise<string> {
  const state = randomBytes(32).toString("hex");
  let redirect: string;
  try {
    redirect = await adminServices().account.createOAuth2Token({ provider: OAuthProvider.Google,
      success: `${origin}/auth/callback`, failure: `${origin}/auth/callback?failed=1`, state });
    const url = new URL(redirect);
    if (url.origin !== "https://accounts.google.com" || url.username || url.password) throw unavailable();
  } catch { throw unavailable(); }
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, next: safeNext(next), issuedAt: Date.now() }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  return redirect;
}

export async function completeGoogleSignIn(params: URLSearchParams): Promise<string> {
  const jar = await cookies();
  const saved = jar.get(OAUTH_COOKIE)?.value;
  jar.delete(OAUTH_COOKIE);
  let flow: z.infer<typeof flowSchema>;
  try { flow = flowSchema.parse(JSON.parse(saved || "null")); }
  catch { throw new HttpError(400, "This Google sign-in attempt expired. Please start again."); }
  const state = params.get("state");
  if (params.getAll("state").length !== 1 || !state || !/^[a-f0-9]{64}$/.test(state) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state)) ||
      Date.now() - flow.issuedAt > 600000 || flow.issuedAt > Date.now() + 1000) {
    throw new HttpError(400, "This Google sign-in attempt expired. Please start again.");
  }
  if (params.has("failed") || params.has("error") || params.getAll("userId").length !== 1 || params.getAll("secret").length !== 1) {
    throw new HttpError(400, "Google sign-in was not completed. Please try again.");
  }
  const token = tokenSchema.parse({ userId: params.get("userId"), secret: params.get("secret") });
  const session = await adminServices().account.createSession(token);
  await setSessionCookie(session);
  return safeNext(flow.next);
}

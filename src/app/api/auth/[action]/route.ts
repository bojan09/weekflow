import { Account, ID } from "node-appwrite";
import { cookies } from "next/headers";
import { z } from "zod";
import { changePasswordSchema, recoverySchema, signInSchema, signUpSchema } from "@/auth/schemas";
import { adminServices, baseClient, publicUser, requireUser, SESSION_COOKIE, setSessionCookie } from "@/server/appwrite";
import { assertOrigin, failure, HttpError, json, readJson } from "@/server/http";
import { deleteOwnAccount } from "@/server/delete-account";
import { throttleAuth } from "@/server/auth-throttle";
import { beginGoogleSignIn } from "@/server/google-oauth";

const tokenSchema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(2048) });

export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    if ((await context.params).action !== "session") throw new HttpError(404, "Not found.");
    try { return json({ user: publicUser((await requireUser()).user) }); }
    catch (error) { if (error instanceof HttpError && error.status === 401) return json({ user: null }); throw error; }
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const origin = assertOrigin(request);
    const action = (await context.params).action;
    const body = await readJson(request, 16_384);
    await throttleAuth(request, action);
    if (action === "google") {
      const input = z.object({ next: z.string().max(1024).optional() }).strict().parse(body);
      return json({ url: await beginGoogleSignIn(origin, input.next) });
    }
    if (action === "sign-in" || action === "sign-up") {
      const input = action === "sign-up" ? signUpSchema.parse(body) : signInSchema.parse(body);
      const service = adminServices().account;
      if ("name" in input && typeof input.name === "string") await service.create({ userId: ID.unique(), email: input.email, password: input.password, name: input.name });
      const session = await service.createEmailPasswordSession({ email: input.email, password: input.password });
      await setSessionCookie(session);
      const account = new Account(baseClient().setSession(session.secret));
      let verificationSent = false;
      if (action === "sign-up") {
        try { await account.createVerification({ url: `${origin}/verify` }); verificationSent = true; } catch { /* Resend remains available in the account. */ }
      }
      return json({ user: publicUser(await account.get()), verificationSent });
    }
    if (action === "recovery") {
      const { email } = recoverySchema.parse(body);
      try { await new Account(baseClient()).createRecovery({ email, url: `${origin}/reset-password` }); }
      catch (error) {
        // Hide whether this address exists; operational failures must still surface.
        const type = typeof error === "object" && error !== null && "type" in error ? error.type : "";
        if (type !== "user_not_found" && type !== "user_blocked") throw error;
      }
      return json({ ok: true });
    }
    if (action === "reset") {
      const input = tokenSchema.extend({ password: z.string().min(8).max(256) }).parse(body);
      await new Account(baseClient()).updateRecovery(input);
      return json({ ok: true });
    }
    if (action === "verify") {
      await new Account(baseClient()).updateVerification(tokenSchema.parse(body));
      return json({ ok: true });
    }
    if (action === "delete") {
      await deleteOwnAccount(body);
      (await cookies()).delete(SESSION_COOKIE);
      return json({ ok: true });
    }
    const { account, user } = await requireUser();
    if (action === "sign-out" || action === "sign-out-everywhere") {
      if (action === "sign-out-everywhere") await account.deleteSessions();
      else await account.deleteSession({ sessionId: "current" });
      (await cookies()).delete(SESSION_COOKIE);
    } else if (action === "send-verification") {
      if (!user.emailVerification) await account.createVerification({ url: `${origin}/verify` });
    } else if (action === "password") {
      const input = changePasswordSchema.parse(body);
      await account.updatePassword({ password: input.password, oldPassword: input.current });
    } else if (action === "rename") {
      const { name } = z.object({ name: z.string().trim().min(1).max(80) }).parse(body);
      return json({ user: publicUser(await account.updateName({ name })) });
    } else throw new HttpError(404, "Not found.");
    return json({ ok: true });
  } catch (error) { return failure(error); }
}

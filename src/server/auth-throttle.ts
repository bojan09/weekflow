import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { adminServices, DATABASE_ID } from "./appwrite";
import { codeOf, HttpError } from "./http";

const limits: Record<string, number> = { "sign-in": 30, "sign-up": 10, google: 30, recovery: 10, reset: 30, verify: 30 };
const windowMs = 10 * 60 * 1000;
const counterSchema = z.object({ count: z.number().int().nonnegative(), until: z.number() });

/** Shared across serverless workers. Store a keyed digest, never a raw IP/email.
 * Vercel overwrites x-forwarded-for; elsewhere use a shared conservative bucket.
 * https://vercel.com/docs/headers/request-headers#x-forwarded-for
 */
export async function throttleAuth(request: Request, action: string) {
  const limit = limits[action];
  if (!limit) return;
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local-or-shared-proxy";
  const secret = process.env.APPWRITE_API_KEY;
  if (!secret) throw new HttpError(503, "Accounts are not configured.");
  const rowId = `limit.${createHmac("sha256", secret).update(`${action}:${ip}`).digest("hex").slice(0, 30)}`;
  const { tables } = adminServices();
  for (let attempt = 0; attempt < 3; attempt++) {
    const tx = await tables.createTransaction({ ttl: 60 });
    const params = { databaseId: DATABASE_ID, tableId: "account_data", rowId, transactionId: tx.$id };
    try {
      let exists = false;
      const now = Date.now();
      let counter = { count: 0, until: now + windowMs };
      try {
        await tables.updateRow({ ...params, data: { ownerId: "system:auth-throttle" } });
        const row = await tables.getRow(params);
        const saved = counterSchema.parse(JSON.parse(String(row.data)));
        if (saved.until > now) counter = saved;
        exists = true;
      } catch (error) { if (codeOf(error) !== 404) throw error; }
      if (counter.count >= limit) throw new HttpError(429, "Too many tries. Wait a few minutes and try again.", "general_rate_limit_exceeded");
      const data = { ownerId: "system:auth-throttle", data: JSON.stringify({ count: counter.count + 1, until: counter.until }) };
      if (exists) await tables.updateRow({ ...params, data, permissions: [] });
      else await tables.createRow({ ...params, data, permissions: [] });
      await tables.updateTransaction({ transactionId: tx.$id, commit: true });
      return;
    } catch (error) {
      await tables.updateTransaction({ transactionId: tx.$id, rollback: true }).catch(() => undefined);
      if (codeOf(error) === 409 && attempt < 2) continue;
      if (codeOf(error) === 409) throw new HttpError(429, "Too many simultaneous tries. Please wait and try again.");
      throw error;
    }
  }
}

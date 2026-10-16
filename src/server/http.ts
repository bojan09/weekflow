import "server-only";
import { z } from "zod";
import { friendlyAuthError } from "@/auth/messages";

export class HttpError extends Error {
  constructor(public status: number, message: string, public type = "request_failed") { super(message); }
}

export function codeOf(error: unknown): number {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "number" ? error.code : 500;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

/** Canonical origin for authentication redirects and mutation checks. */
export function siteOrigin(request: Request): string {
  const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin;
  const url = new URL(expected);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new HttpError(503, "The deployment URL must use HTTPS.");
  }
  return expected;
}

export function assertOrigin(request: Request): string {
  const expected = siteOrigin(request);
  if (request.headers.get("origin") !== expected) throw new HttpError(403, "This request did not come from Weekflow.");
  return expected;
}

export async function readJson(request: Request, maxBytes = 3_500_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Use a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "The request is empty.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new HttpError(413, "This change is too large. Save a smaller change first."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "The request is not valid JSON.");
  }
}

export function failure(error: unknown): Response {
  if (error instanceof HttpError) return json({ message: error.message, type: error.type }, error.status);
  if (error instanceof z.ZodError) return json({ message: "Please check the information you entered.", type: "validation_failed" }, 400);
  const code = codeOf(error);
  const type = typeof error === "object" && error !== null && "type" in error && typeof error.type === "string" ? error.type : "service_unavailable";
  const status = [400, 401, 403, 404, 409, 429].includes(code) ? code : 503;
  return json({ message: status === 503 ? "The account service is temporarily unavailable. Your local changes have not been discarded." : friendlyAuthError(error), type }, status);
}

import { z } from "zod";
import { ACCOUNT_BASE, APP_ROUTES } from "@/lib/routes";

export const MIN_PASSWORD = 8;

const email = z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email address"));
const password = z
  .string()
  .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`)
  .max(256, "Use 256 characters or fewer");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80, "Keep it under 80 characters"),
  email,
  password,
});

export const recoverySchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords do not match", path: ["confirm"] });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Enter your current password"), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords do not match", path: ["confirm"] });

/** First message per field, for showing under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Only ever send people to a page inside the signed-in app, never to another site. */
export function safeNext(value: string | null | undefined): string {
  if (value && !/[\\\u0000-\u001f]/.test(value)) {
    try {
      const url = new URL(value, "https://weekflow.invalid");
      const route = url.pathname.split("/")[2];
      if (value.startsWith(`${ACCOUNT_BASE}/`) && url.origin === "https://weekflow.invalid" &&
        url.pathname.startsWith(`${ACCOUNT_BASE}/`) && (APP_ROUTES as readonly string[]).includes(route ?? "")) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch { /* Fall back to Home. */ }
  }
  return `${ACCOUNT_BASE}/home`;
}

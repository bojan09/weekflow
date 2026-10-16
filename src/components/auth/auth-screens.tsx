"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { signIn, signUp, requestRecovery, confirmRecovery, confirmVerification } from "@/auth/api";
import { friendlyAuthError } from "@/auth/messages";
import { fieldErrors, signInSchema, signUpSchema, recoverySchema, resetSchema, safeNext } from "@/auth/schemas";
import { useAuthStore } from "@/auth/store";
import { ACCOUNTS_ENABLED } from "@/lib/appwrite/config";
import { AuthCard, Notice, TextField } from "./auth-card";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password" | "verify";
const titles: Record<Mode, string> = {
  "sign-in": "Welcome back",
  "sign-up": "Create your account",
  "forgot-password": "Forgot your password?",
  "reset-password": "Choose a new password",
  verify: "Verify your email",
};
const actions: Record<Mode, string> = {
  "sign-in": "Sign in", "sign-up": "Create account", "forgot-password": "Send recovery link",
  "reset-password": "Reset password", verify: "Verify email",
};

export function AuthScreen({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const userId = params.get("userId") ?? "";
  const secret = params.get("secret") ?? "";
  const tokenMode = mode === "reset-password" || mode === "verify";
  const invalidToken = tokenMode && (!userId.trim() || !secret.trim() || params.getAll("userId").length !== 1 || params.getAll("secret").length !== 1);
  const disabled = !ACCOUNTS_ENABLED || busy || invalidToken || !!success;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || inFlight.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setErrors({});
    setError("");
    const schema = mode === "sign-in" ? signInSchema : mode === "sign-up" ? signUpSchema : mode === "forgot-password" ? recoverySchema : mode === "reset-password" ? resetSchema : null;
    const parsed = schema?.safeParse(data);
    if (parsed && !parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    const values = (parsed?.data ?? {}) as Record<string, string>;
    try {
      if (mode === "sign-in" || mode === "sign-up") {
        const user = mode === "sign-in" ? await signIn(values.email, values.password) : await signUp(values.name, values.email, values.password);
        useAuthStore.getState().setUser(user);
        setSuccess("You are signed in. Opening your planner…");
        router.replace(mode === "sign-in" ? safeNext(params.get("next")) : "/app/home");
        router.refresh();
      } else if (mode === "forgot-password") {
        try {
          await requestRecovery(values.email);
        } catch (failure) {
          // Account existence must never be disclosed by the recovery screen.
          if ((failure as { type?: string } | null)?.type !== "user_not_found") throw failure;
        }
        setSuccess("If an account exists with that email, you will receive a password recovery link. Check your inbox and spam folder.");
      } else if (mode === "reset-password") {
        await confirmRecovery(userId, secret, values.password);
        setSuccess("Your password has been reset. You can now sign in with your new password.");
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        await confirmVerification(userId, secret);
        setSuccess("Your email has been verified. You can now sign in.");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (failure) {
      setError(friendlyAuthError(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard title={titles[mode]} description={mode === "verify" ? "Confirm below to verify the email address on your account." : undefined}
      footer={<div className="space-y-3">
        {mode === "sign-in" ? <p>New to Weekflow? <Link className="underline" href="/sign-up">Create an account</Link></p> : <Link className="underline" href="/sign-in">Back to sign in</Link>}
        {(mode === "sign-in" || mode === "sign-up") && <p><Link className="underline" href="/demo">Try the demo</Link></p>}
      </div>}>
      <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
        {!ACCOUNTS_ENABLED && <Notice tone="info">Accounts are not configured on this deployment. <Link className="underline" href="/demo">Try the demo</Link> to explore Weekflow.</Notice>}
        {invalidToken && !success && <Notice tone="error">This link is incomplete or invalid. {mode === "reset-password" ? <Link className="underline" href="/forgot-password">Request a new recovery link.</Link> : "Open the full link from your verification email, or sign in to request a new one."}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}
        {!success && <>
          {mode === "sign-up" && <TextField id="name" name="name" label="Name" autoComplete="name" error={errors.name} disabled={busy} required />}
          {!tokenMode && <TextField id="email" name="email" label="Email" type="email" autoComplete="email" error={errors.email} disabled={busy} required />}
          {(mode === "sign-in" || mode === "sign-up" || mode === "reset-password") && <TextField id="password" name="password" label={mode === "reset-password" ? "New password" : "Password"} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} hint={mode !== "sign-in" ? "Use at least 8 characters." : undefined} error={errors.password} disabled={busy || invalidToken} required />}
          {mode === "reset-password" && <TextField id="confirm" name="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm} disabled={busy || invalidToken} required />}
          <button type="submit" disabled={disabled} className="min-h-11 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{busy ? "Please wait…" : actions[mode]}</button>
        </>}
        {mode === "sign-in" && <p className="text-center text-sm"><Link className="underline" href="/forgot-password">Forgot password?</Link></p>}
      </form>
    </AuthCard>
  );
}

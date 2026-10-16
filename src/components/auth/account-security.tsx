"use client";

import { useRef, useState, type FormEvent } from "react";
import { changePassword, closeAccount, sendVerification, signOut, signOutEverywhere } from "@/auth/api";
import { friendlyAuthError } from "@/auth/messages";
import { changePasswordSchema, fieldErrors } from "@/auth/schemas";
import { useAuthStore } from "@/auth/store";
import { accountSync } from "@/data/account-client";
import { Button } from "@/components/ui/button";
import { Notice, TextField } from "./auth-card";

type Action = "verification" | "password" | "signout" | "signout-all" | "delete";

export function AccountSecurity() {
  const user = useAuthStore((state) => state.user);
  const [pending, setPending] = useState<Action | null>(null);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const disabled = pending !== null || !user;

  async function run(action: Action, task: () => Promise<void>, message: string, leave = false) {
    if (locked.current || !user) return;
    if (leave && accountSync.hasPending()) {
      setSuccess("");
      setError("Your changes are still syncing. Wait for them to finish saving, or resolve the sync error, before signing out or deleting your account.");
      return;
    }
    locked.current = true;
    setPending(action);
    setError("");
    setSuccess("");
    try {
      await task();
      setSuccess(message);
      if (leave) {
        useAuthStore.getState().setUser(null);
        window.location.assign(new URL("/sign-in", window.location.origin).href);
        return;
      }
    } catch (failure) {
      const reply = failure as { type?: string; message?: unknown } | null;
      setError(reply?.type === "client_reply" && typeof reply.message === "string" ? reply.message : friendlyAuthError(failure));
    } finally {
      locked.current = false;
      setPending(null);
    }
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || locked.current) return;
    const form = event.currentTarget;
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    setErrors({});
    setError("");
    setSuccess("");
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    void run("password", async () => {
      await changePassword(parsed.data.current, parsed.data.password);
      form.reset();
    }, "Your password has been changed.");
  }

  function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || locked.current) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("deletePassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    const next: Record<string, string> = {};
    if (!password) next.deletePassword = "Enter your password";
    if (confirmation !== "DELETE") next.confirmation = "Type DELETE exactly to confirm";
    setDeleteErrors(next);
    setError("");
    setSuccess("");
    if (Object.keys(next).length) return;
    void run("delete", () => closeAccount(password), "Your account has been deleted. Redirecting to sign in…", true);
  }

  return (
    <section aria-labelledby="account-security-title" className="rounded-3xl border bg-card p-6 shadow-soft" aria-busy={pending !== null}>
      <h2 id="account-security-title" className="text-base font-semibold">Account security</h2>
      <div className="mt-4 space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Email verification</h3>
          <p className="text-sm text-muted-foreground">{user?.emailVerified ? "Your email is verified." : "Verify your email to confirm it belongs to you."}</p>
          {!user?.emailVerified && <Button disabled={disabled} variant="outline" className="min-h-11" onClick={() => void run("verification", sendVerification, "Verification email sent. Check your inbox and spam folder.")}>{pending === "verification" ? "Sending…" : "Resend verification email"}</Button>}
        </div>
        <form noValidate onSubmit={updatePassword} className="space-y-3 border-t pt-5">
          <h3 className="text-sm font-medium">Change password</h3>
          <p className="text-sm text-muted-foreground">If you joined with Google and have no password yet, <a className="font-medium text-primary-text underline" href="/forgot-password">set one through password recovery</a> before changing your password or deleting your account.</p>
          <TextField id="security-current" name="current" label="Current password" type="password" autoComplete="current-password" error={errors.current} disabled={disabled} required />
          <TextField id="security-password" name="password" label="New password" type="password" autoComplete="new-password" hint="Use at least 8 characters." error={errors.password} disabled={disabled} required />
          <TextField id="security-confirm" name="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm} disabled={disabled} required />
          <Button type="submit" disabled={disabled} className="min-h-11">{pending === "password" ? "Changing password…" : "Change password"}</Button>
        </form>
        <div className="space-y-3 border-t pt-5">
          <h3 className="text-sm font-medium">Sessions</h3>
          <div className="flex flex-wrap gap-3">
            <Button disabled={disabled} variant="outline" className="min-h-11" onClick={() => void run("signout", signOut, "Signed out. Redirecting to sign in…", true)}>{pending === "signout" ? "Signing out…" : "Sign out of this device"}</Button>
            <Button disabled={disabled} variant="outline" className="min-h-11" onClick={() => void run("signout-all", signOutEverywhere, "Signed out of all devices. Redirecting to sign in…", true)}>{pending === "signout-all" ? "Signing out everywhere…" : "Sign out of all devices"}</Button>
          </div>
        </div>
        <form noValidate onSubmit={deleteAccount} className="space-y-3 border-t pt-5" aria-describedby="delete-account-warning">
          <h3 className="text-sm font-medium">Delete account</h3>
          <p id="delete-account-warning" className="text-sm text-danger-text">This permanently deletes your account and all its data. This cannot be undone. Enter your password and type DELETE to confirm.</p>
          <TextField id="security-delete-password" name="deletePassword" label="Password to delete account" type="password" autoComplete="current-password" error={deleteErrors.deletePassword} disabled={disabled} required />
          <TextField id="security-delete-confirm" name="confirmation" label="Type DELETE to confirm" autoComplete="off" spellCheck={false} error={deleteErrors.confirmation} disabled={disabled} required />
          <Button type="submit" variant="destructive" disabled={disabled} className="min-h-11">{pending === "delete" ? "Deleting account…" : "Permanently delete account"}</Button>
        </form>
      </div>
    </section>
  );
}

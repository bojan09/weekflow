import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/auth/api", () => ({
  currentUser: vi.fn(), changePassword: vi.fn(), closeAccount: vi.fn(), sendVerification: vi.fn(),
  signOut: vi.fn(), signOutEverywhere: vi.fn(),
}));

import * as api from "@/auth/api";
import { useAuthStore } from "@/auth/store";
import { AccountSecurity } from "./account-security";
import { accountSync } from "@/data/account-client";
import { emptyAccount } from "@/data/account-schema";

const user = { id: "user-1", name: "Alex", email: "alex@example.test", emailVerified: false };
const assign = vi.fn();
const signInUrl = new URL("/sign-in", window.location.origin).href;
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function click(name: string) { fireEvent.click(screen.getByRole("button", { name })); }

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.getState().setUser(user);
  const actualWindow = window;
  vi.stubGlobal("window", new Proxy(actualWindow, {
    get(target, key) {
      return key === "location" ? { assign, origin: actualWindow.location.origin } : Reflect.get(target, key, target);
    },
  }));
});
afterEach(() => { accountSync.stop(); vi.unstubAllGlobals(); });

describe("account security", () => {
  it("resends verification and shows success", async () => {
    render(<AccountSecurity />);
    click("Resend verification email");
    expect(await screen.findByText(/Verification email sent/)).toBeInTheDocument();
    expect(api.sendVerification).toHaveBeenCalledTimes(1);
  });

  it("shows verified state without a resend control", () => {
    useAuthStore.getState().setUser({ ...user, emailVerified: true });
    render(<AccountSecurity />);
    expect(screen.getByText("Your email is verified.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend verification email" })).not.toBeInTheDocument();
  });

  it("validates current, new and matching passwords before calling the API", () => {
    render(<AccountSecurity />);
    fill("New password", "short"); fill("Confirm new password", "different");
    click("Change password");
    expect(screen.getByText("Enter your current password")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("The two passwords do not match")).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it("changes the password and clears password fields", async () => {
    render(<AccountSecurity />);
    fill("Current password", "old-password"); fill("New password", "new-password"); fill("Confirm new password", "new-password");
    click("Change password");
    expect(await screen.findByText("Your password has been changed.")).toBeInTheDocument();
    expect(api.changePassword).toHaveBeenCalledWith("old-password", "new-password");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    expect(assign).not.toHaveBeenCalled();
  });

  it("locks all controls during a request and prevents duplicate requests", async () => {
    let finish!: () => void;
    vi.mocked(api.sendVerification).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<AccountSecurity />);
    click("Resend verification email");
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    click("Sending…");
    expect(api.sendVerification).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByText(/Verification email sent/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change password" })).toBeEnabled();
  });

  it("shows a friendly failure and allows retry without clearing the session", async () => {
    vi.mocked(api.signOut).mockRejectedValueOnce({ type: "general_rate_limit_exceeded", message: "private service details" });
    render(<AccountSecurity />);
    click("Sign out of this device");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries");
    expect(screen.queryByText("private service details")).not.toBeInTheDocument();
    expect(useAuthStore.getState().user).toEqual(user);
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out of this device" })).toBeEnabled();
    click("Sign out of this device");
    await waitFor(() => expect(assign).toHaveBeenCalledWith(signInUrl));
  });

  it.each([
    ["Sign out of this device", "signOut"],
    ["Sign out of all devices", "signOutEverywhere"],
  ] as const)("%s clears the session before full navigation", async (label, method) => {
    assign.mockImplementation(() => expect(useAuthStore.getState().user).toBeNull());
    render(<AccountSecurity />);
    click(label);
    await waitFor(() => expect(assign).toHaveBeenCalledWith(signInUrl));
    expect(api[method]).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe("signedOut");
  });

  it("requires both a password and exact DELETE confirmation", () => {
    render(<AccountSecurity />);
    expect(screen.getByText(/This permanently deletes your account and all its data/)).toHaveTextContent("cannot be undone");
    fill("Type DELETE to confirm", "delete"); click("Permanently delete account");
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(screen.getByText("Type DELETE exactly to confirm")).toBeInTheDocument();
    expect(api.closeAccount).not.toHaveBeenCalled();
    fill("Password to delete account", "password123"); click("Permanently delete account");
    expect(api.closeAccount).not.toHaveBeenCalled();
  });

  it("deletes with the password then clears the session and reloads sign in", async () => {
    assign.mockImplementation(() => expect(useAuthStore.getState().user).toBeNull());
    render(<AccountSecurity />);
    fill("Password to delete account", "password123"); fill("Type DELETE to confirm", "DELETE");
    click("Permanently delete account");
    await waitFor(() => expect(assign).toHaveBeenCalledWith(signInUrl));
    expect(api.closeAccount).toHaveBeenCalledWith("password123");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("keeps the account signed in when deletion fails", async () => {
    vi.mocked(api.closeAccount).mockRejectedValueOnce({ type: "user_password_mismatch" });
    render(<AccountSecurity />);
    fill("Password to delete account", "wrong-password"); fill("Type DELETE to confirm", "DELETE"); click("Permanently delete account");
    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is not right");
    expect(useAuthStore.getState().user).toEqual(user);
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Permanently delete account" })).toBeEnabled();
  });

  it.each(["Sign out of this device", "Sign out of all devices", "Permanently delete account"])("blocks %s when changes become pending after render", async label => {
    const snapshot = emptyAccount({ name: "Alex", email: user.email, $createdAt: "2026-10-16T00:00:00Z" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))).mockImplementationOnce(() => new Promise(() => {})));
    await accountSync.start(crypto.randomUUID());
    render(<AccountSecurity />);
    accountSync.write("profile", { ...snapshot.profile.value as object, bio: "Unsaved change" });
    fill("Password to delete account", "password123"); fill("Type DELETE to confirm", "DELETE");
    click(label);
    expect(screen.getByRole("alert")).toHaveTextContent("Your changes are still syncing");
    expect(api.signOut).not.toHaveBeenCalled();
    expect(api.signOutEverywhere).not.toHaveBeenCalled();
    expect(api.closeAccount).not.toHaveBeenCalled();
    expect(accountSync.hasPending()).toBe(true);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(assign).not.toHaveBeenCalled();
  });

  it.each(["client_reply", "request_failed"])("shows backend message only for a safe client_reply (%s)", async type => {
    const message = "Transfer ownership of your workspace before deleting your account.";
    vi.mocked(api.closeAccount).mockRejectedValueOnce(Object.assign(new Error(message), { type }));
    render(<AccountSecurity />);
    fill("Password to delete account", "password123"); fill("Type DELETE to confirm", "DELETE"); click("Permanently delete account");
    const alert = await screen.findByRole("alert");
    if (type === "client_reply") expect(alert).toHaveTextContent(message);
    else expect(alert).not.toHaveTextContent(message);
    expect(assign).not.toHaveBeenCalled();
  });
});

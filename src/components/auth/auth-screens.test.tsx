import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = "https://accounts.example.test/v1";
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = "test-project";
});
vi.unmock("next/navigation");
vi.mock("@/auth/api", () => ({
  currentUser: vi.fn().mockResolvedValue(null), signIn: vi.fn(), signUp: vi.fn(),
  requestRecovery: vi.fn(), confirmRecovery: vi.fn(), confirmVerification: vi.fn(),
}));

import * as api from "@/auth/api";
import { AuthScreen } from "./auth-screens";
import { useAuthStore } from "@/auth/store";

const user = { id: "user-1", name: "Alex", email: "alex@example.test", emailVerified: false };
const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(), bfcacheId: "test" };
function show(mode: React.ComponentProps<typeof AuthScreen>["mode"], query = "") {
  return render(<AppRouterContext.Provider value={router}><SearchParamsContext.Provider value={new URLSearchParams(query)}><AuthScreen mode={mode} /></SearchParamsContext.Provider></AppRouterContext.Provider>);
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function submit(label: string) { fireEvent.click(screen.getByRole("button", { name: label })); }

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.signIn).mockResolvedValue(user);
  vi.mocked(api.signUp).mockResolvedValue(user);
  vi.mocked(api.requestRecovery).mockResolvedValue(undefined);
  vi.mocked(api.confirmRecovery).mockResolvedValue(undefined);
  vi.mocked(api.confirmVerification).mockResolvedValue(undefined);
});

describe("authentication screens", () => {
  it("validates before sending credentials", () => {
    show("sign-in");
    fill("Email", "invalid");
    submit("Sign in");
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it.each([["/app/week", "/app/week"], ["https://evil.example", "/app/home"]])("signs in with a safe next destination %s", async (next, destination) => {
    show("sign-in", new URLSearchParams({ next }).toString());
    fill("Email", " alex@example.test "); fill("Password", "password123"); submit("Sign in");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(destination));
    expect(api.signIn).toHaveBeenCalledWith("alex@example.test", "password123");
    expect(router.refresh).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("creates an account and opens home", async () => {
    show("sign-up", "next=/app/team");
    fill("Name", " Alex "); fill("Email", "alex@example.test"); fill("Password", "password123"); submit("Create account");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/app/home"));
    expect(api.signUp).toHaveBeenCalledWith("Alex", "alex@example.test", "password123");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("shows friendly failures and lets the user retry", async () => {
    vi.mocked(api.signIn).mockRejectedValueOnce({ type: "user_invalid_credentials", message: "private details" });
    show("sign-in"); fill("Email", user.email); fill("Password", "incorrect"); submit("Sign in");
    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password do not match");
    expect(screen.queryByText("private details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("disables duplicate submissions while waiting", async () => {
    let finish!: (value: typeof user) => void;
    vi.mocked(api.signIn).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    show("sign-in"); fill("Email", user.email); fill("Password", "password123"); submit("Sign in");
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    finish(user);
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(api.signIn).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("uses generic recovery success (missing account: %s)", async missing => {
    if (missing) vi.mocked(api.requestRecovery).mockRejectedValueOnce({ type: "user_not_found" });
    show("forgot-password"); fill("Email", user.email); submit("Send recovery link");
    expect(await screen.findByText(/If an account exists with that email/)).toBeInTheDocument();
    expect(api.requestRecovery).toHaveBeenCalledWith(user.email);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["reset-password", "verify"] as const)("blocks malformed %s tokens", mode => {
    show(mode, "userId=user-1&secret=");
    expect(screen.getByRole("alert")).toHaveTextContent("incomplete or invalid");
    expect(screen.getByRole("button")).toBeDisabled();
    expect(api.confirmRecovery).not.toHaveBeenCalled();
    expect(api.confirmVerification).not.toHaveBeenCalled();
  });

  it("validates matching passwords and resets only on submission", async () => {
    show("reset-password", "userId=user-1&secret=one-time");
    expect(api.confirmRecovery).not.toHaveBeenCalled();
    fill("New password", "password123"); fill("Confirm new password", "different"); submit("Reset password");
    expect(screen.getByText("The two passwords do not match")).toBeInTheDocument();
    expect(api.confirmRecovery).not.toHaveBeenCalled();
    fill("Confirm new password", "password123"); submit("Reset password");
    expect(await screen.findByText(/Your password has been reset/)).toBeInTheDocument();
    expect(api.confirmRecovery).toHaveBeenCalledWith("user-1", "one-time", "password123");
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("verifies only when requested and displays the result", async () => {
    show("verify", "userId=user-1&secret=one-time");
    expect(api.confirmVerification).not.toHaveBeenCalled();
    submit("Verify email");
    expect(await screen.findByText(/Your email has been verified/)).toBeInTheDocument();
    expect(api.confirmVerification).toHaveBeenCalledWith("user-1", "one-time");
  });
});

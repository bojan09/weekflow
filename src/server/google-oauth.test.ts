import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), adminServices: vi.fn(), setSessionCookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("./appwrite", () => ({ adminServices: mocks.adminServices, setSessionCookie: mocks.setSessionCookie }));
import { beginGoogleSignIn, completeGoogleSignIn, OAUTH_COOKIE } from "./google-oauth";

describe("Google sign-in security", () => {
  let saved: Map<string, string>;
  let account: { createOAuth2Token: ReturnType<typeof vi.fn>; createSession: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.clearAllMocks();
    saved = new Map();
    mocks.cookies.mockResolvedValue({ get: (key: string) => saved.has(key) ? { value: saved.get(key) } : undefined, set: vi.fn((key: string, value: string) => saved.set(key, value)), delete: vi.fn((key: string) => saved.delete(key)) });
    account = { createOAuth2Token: vi.fn(async () => "https://accounts.google.com/o/oauth2/v2/auth?client_id=public"), createSession: vi.fn(async () => ({ secret: "private-session", expire: "2026-12-01T00:00:00Z" })) };
    mocks.adminServices.mockReturnValue({ account });
  });
  const callback = (state: string) => new URLSearchParams({ state, userId: "google-user", secret: "one-time-token" });
  it("starts Google's server flow with an expiring browser-bound nonce", async () => {
    expect(await beginGoogleSignIn("https://weekflow.example", "/app/week")).toContain("accounts.google.com");
    const flow = JSON.parse(saved.get(OAUTH_COOKIE)!);
    expect(flow.state).toMatch(/^[a-f0-9]{64}$/);
    expect(account.createOAuth2Token).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", state: flow.state, success: "https://weekflow.example/auth/callback" }));
    expect((await mocks.cookies()).set).toHaveBeenCalledWith(OAUTH_COOKIE, expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 600 }));
  });
  it("exchanges the one-time token server-side, preserves safe navigation, and consumes the nonce", async () => {
    await beginGoogleSignIn("https://weekflow.example", "/app/week");
    const flow = JSON.parse(saved.get(OAUTH_COOKIE)!);
    expect(await completeGoogleSignIn(callback(flow.state))).toBe("/app/week");
    expect(account.createSession).toHaveBeenCalledWith({ userId: "google-user", secret: "one-time-token" });
    expect(mocks.setSessionCookie).toHaveBeenCalledWith({ secret: "private-session", expire: "2026-12-01T00:00:00Z" });
    expect(saved.has(OAUTH_COOKIE)).toBe(false);
    await expect(completeGoogleSignIn(callback(flow.state))).rejects.toThrow();
    expect(account.createSession).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong, missing, expired and duplicate state before creating a session", async () => {
    for (const mode of ["wrong", "missing", "expired", "duplicate"]) {
      await beginGoogleSignIn("https://weekflow.example", "/app/home");
      const flow = JSON.parse(saved.get(OAUTH_COOKIE)!);
      const params = callback(mode === "wrong" ? "f".repeat(64) : flow.state);
      if (mode === "missing") params.delete("state");
      if (mode === "expired") saved.set(OAUTH_COOKIE, JSON.stringify({ ...flow, issuedAt: Date.now() - 601000 }));
      if (mode === "duplicate") params.append("state", flow.state);
      await expect(completeGoogleSignIn(params)).rejects.toThrow();
    }
    expect(account.createSession).not.toHaveBeenCalled();
  });
  it("rejects duplicate callback credentials and provider cancellation", async () => {
    for (const mode of ["duplicate", "cancelled"]) {
      await beginGoogleSignIn("https://weekflow.example", "/app/home");
      const flow = JSON.parse(saved.get(OAUTH_COOKIE)!);
      const params = callback(flow.state);
      if (mode === "duplicate") params.append("secret", "another"); else params.set("failed", "1");
      await expect(completeGoogleSignIn(params)).rejects.toThrow();
    }
    expect(account.createSession).not.toHaveBeenCalled();
  });
  it("rejects untrusted authorization destinations and unsafe return paths", async () => {
    await beginGoogleSignIn("https://weekflow.example", "https://evil.example");
    expect(JSON.parse(saved.get(OAUTH_COOKIE)!).next).toBe("/app/home");
    account.createOAuth2Token.mockResolvedValueOnce("https://evil.example/authorize");
    await expect(beginGoogleSignIn("https://weekflow.example", "/app/home")).rejects.toThrow(/Google sign-in/);
  });
});

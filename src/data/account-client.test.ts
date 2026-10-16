import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountSync } from "./account-client";
import { emptyAccount } from "./account-schema";

const snapshot = () => emptyAccount({ name: "Private", email: "private@example.com", $createdAt: "2026-10-16T00:00:00Z" });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("private sync queue", () => {
  let accountId: string;
  beforeEach(() => { accountId = crypto.randomUUID(); vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { accountSync.stop(); vi.unstubAllGlobals(); });

  it("serializes edits made during an in-flight save without losing the newer edit", async () => {
    let finish: (response: Response) => void = () => {};
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot()));
    await accountSync.start(accountId);
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ revision: 2, value: { ...snapshot().profile.value as object, bio: "second" } }));
    const profile = snapshot().profile.value as Record<string, unknown>;
    accountSync.write("profile", { ...profile, bio: "first" });
    accountSync.write("profile", { ...profile, bio: "second" });
    finish(response({ revision: 1, value: { ...profile, bio: "first" } }));
    await vi.waitFor(() => expect(accountSync.getSnapshot().status).toBe("saved"));
    expect((accountSync.read("profile") as Record<string, unknown>).bio).toBe("second");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[2]?.[1]?.body)).revision).toBe(1);
    expect(vi.mocked(fetch).mock.calls[2]?.[1]?.headers).toMatchObject({ "X-Weekflow-Account": accountId });
    expect(accountSync.hasPending()).toBe(false);
  });

  it("keeps failed changes exportable and never silently overwrites a conflict", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot()));
    await accountSync.start(accountId);
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Changed on another device" }, 409));
    accountSync.write("profile", { ...snapshot().profile.value as object, bio: "pending" });
    await vi.waitFor(() => expect(accountSync.getSnapshot().status).toBe("error"));
    expect(accountSync.hasPending()).toBe(true);
    expect(accountSync.exportPending()).toContain("pending");
    expect(() => accountSync.write("tasks", [])).toThrow(/sync error/);
    expect(fetch).toHaveBeenCalledTimes(2);
    accountSync.stop();
    await accountSync.start(accountId);
    expect(accountSync.exportPending()).toContain("pending");
    expect(accountSync.getSnapshot().status).toBe("error");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("discards a former account's late response when the account scope ends", async () => {
    let finish: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = accountSync.start(accountId);
    accountSync.stop();
    finish(response(snapshot()));
    await pending;
    expect(accountSync.getSnapshot().snapshot).toBeNull();
    expect(accountSync.isActive()).toBe(false);
  });
});

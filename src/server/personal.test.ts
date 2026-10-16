import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ requireUser: vi.fn(), adminServices: vi.fn() }));
vi.mock("./appwrite", () => ({ ...sdk, DATABASE_ID: "weekflow" }));
vi.mock("./account-lifecycle", () => ({ stageActiveAccount: vi.fn(async () => undefined) }));
import { emptyAccount } from "@/data/account-schema";
import { loadPersonal, savePersonal } from "./personal";

const user = { $id: "owner-a", name: "Account A", email: "a@example.com", $createdAt: "2026-10-16T00:00:00Z" };

describe("personal persistence boundary", () => {
  let tables: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.requireUser.mockResolvedValue({ user });
    tables = {
      listRows: vi.fn(async () => ({ rows: [], total: 0 })),
      createTransaction: vi.fn(async () => ({ $id: "tx" })),
      updateTransaction: vi.fn(async () => ({})),
      getRow: vi.fn(async () => ({ ownerId: user.$id, data: JSON.stringify({ resource: "profile", revision: 2, value: emptyAccount(user).profile.value }) })),
      updateRow: vi.fn(async () => ({})), createRow: vi.fn(async () => ({})),
    };
    sdk.adminServices.mockReturnValue({ tables });
  });
  it("derives ownership and immutable profile fields from the session", async () => {
    const value = { ...emptyAccount(user).profile.value as object, email: "spoof@example.com", joinedAt: "2000-01-01" };
    const saved = await savePersonal("profile", { revision: 2, value }, user.$id);
    expect(saved.revision).toBe(3);
    expect(saved.value).toMatchObject({ email: user.email, joinedAt: "2026-10-16" });
    const write = tables.updateRow.mock.calls.at(-1)?.[0];
    expect(write.data.ownerId).toBe("owner-a");
    expect(write.permissions).toEqual(['read("user:owner-a")']);
    expect(tables.updateRow.mock.invocationCallOrder[0]).toBeLessThan(tables.getRow.mock.invocationCallOrder.at(-1)!);
  });
  it("rejects a posted owner or mismatched stored owner", async () => {
    await expect(savePersonal("tasks", { revision: 0, value: [], ownerId: "owner-b" }, user.$id)).rejects.toThrow();
    expect(tables.createTransaction).not.toHaveBeenCalled();
    tables.getRow.mockResolvedValue({ ownerId: "owner-b", data: "{}" });
    await expect(savePersonal("tasks", { revision: 0, value: [] }, user.$id)).rejects.toMatchObject({ status: 403 });
    expect(tables.updateTransaction).toHaveBeenLastCalledWith({ transactionId: "tx", rollback: true });
  });
  it("rejects stale saves and commit conflicts without claiming success", async () => {
    await expect(savePersonal("profile", { revision: 1, value: emptyAccount(user).profile.value }, user.$id)).rejects.toMatchObject({ status: 409 });
    tables.updateTransaction.mockImplementation(async ({ commit }) => { if (commit) throw Object.assign(new Error("Conflict"), { code: 409 }); return {}; });
    await expect(savePersonal("profile", { revision: 2, value: emptyAccount(user).profile.value }, user.$id)).rejects.toMatchObject({ status: 409 });
    expect(tables.updateTransaction).toHaveBeenLastCalledWith({ transactionId: "tx", rollback: true });
  });
  it("queries only the authenticated owner's resources and gives new accounts no demo data", async () => {
    const snapshot = await loadPersonal(user.$id);
    const query = tables.listRows.mock.calls[0]?.[0];
    expect(query.queries.some((value: string) => value.includes('ownerId') && value.includes('owner-a'))).toBe(true);
    expect(snapshot.tasks.value).toEqual([]);
    expect(snapshot.projects.value).toEqual([]);
    expect(snapshot.profile.value).toMatchObject({ email: user.email });
  });
  it("rejects a stale tab bound to a different account before privileged data access", async () => {
    await expect(loadPersonal("owner-b")).rejects.toMatchObject({ status: 409, type: "session_changed" });
    await expect(savePersonal("tasks", { revision: 0, value: [] }, "owner-b")).rejects.toMatchObject({ status: 409, type: "session_changed" });
    expect(sdk.adminServices).not.toHaveBeenCalled();
  });
});

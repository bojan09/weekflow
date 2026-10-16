import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TablesDB } from "node-appwrite";
vi.mock("./appwrite", () => ({ DATABASE_ID: "weekflow" }));
import { beginAccountDeletion, finishAccountDeletion, stageActiveAccount } from "./account-lifecycle";

describe("deletion/save coordination", () => {
  let tables: { getRow: ReturnType<typeof vi.fn>; updateRow: ReturnType<typeof vi.fn>; createRow: ReturnType<typeof vi.fn>; createTransaction: ReturnType<typeof vi.fn>; updateTransaction: ReturnType<typeof vi.fn> };
  const sdk = () => tables as unknown as TablesDB;
  beforeEach(() => {
    tables = { getRow: vi.fn(async () => ({ data: "active" })), updateRow: vi.fn(async () => ({})), createRow: vi.fn(async () => ({})), createTransaction: vi.fn(async () => ({ $id: "tx" })), updateTransaction: vi.fn(async () => ({})) };
  });
  it("stages the marker before reading it inside the save transaction", async () => {
    await stageActiveAccount(sdk(), "user-a", "save-tx");
    expect(tables.updateRow).toHaveBeenCalledWith(expect.objectContaining({ transactionId: "save-tx", data: { ownerId: "system:account-state" } }));
    expect(tables.updateRow.mock.invocationCallOrder[0]).toBeLessThan(tables.getRow.mock.invocationCallOrder.at(-1)!);
  });
  it("refuses already authenticated writes once deletion has started", async () => {
    tables.getRow.mockResolvedValue({ data: "deleting" });
    await expect(stageActiveAccount(sdk(), "user-a", "save-tx")).rejects.toMatchObject({ status: 409, type: "account_deleting" });
  });
  it("commits the deletion marker before content deletion can begin", async () => {
    const operationId = await beginAccountDeletion(sdk(), "user-a");
    expect(tables.updateRow).toHaveBeenCalledWith(expect.objectContaining({ transactionId: "tx", data: { data: `deleting:${operationId}` } }));
    expect(tables.updateTransaction).toHaveBeenCalledWith({ transactionId: "tx", commit: true });
  });
  it("does not acquire a second deletion or let a different operation roll it back", async () => {
    tables.getRow.mockResolvedValue({ data: "deleting:first-operation" });
    await expect(beginAccountDeletion(sdk(), "user-a")).rejects.toMatchObject({ status: 409 });
    await expect(finishAccountDeletion(sdk(), "user-a", "other-operation", "active")).rejects.toMatchObject({ status: 409 });
  });
  it("never reactivates a terminal deleted marker", async () => {
    tables.getRow.mockResolvedValue({ data: "deleted" });
    await finishAccountDeletion(sdk(), "user-a", "old-operation", "active");
    expect(tables.updateRow).toHaveBeenLastCalledWith(expect.objectContaining({ data: { data: "deleted" } }));
  });
});

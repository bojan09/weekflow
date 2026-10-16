import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ adminServices: vi.fn() }));
vi.mock("./appwrite", () => ({ ...sdk, DATABASE_ID: "weekflow" }));
import { throttleAuth } from "./auth-throttle";

describe("serverless authentication throttling", () => {
  let tables: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    vi.stubEnv("APPWRITE_API_KEY", "test-server-key");
    vi.stubEnv("VERCEL", "1");
    tables = {
      createTransaction: vi.fn(async () => ({ $id: "tx" })), updateTransaction: vi.fn(async () => ({})),
      updateRow: vi.fn(async () => ({})), createRow: vi.fn(async () => ({})),
      getRow: vi.fn(async () => ({ data: JSON.stringify({ count: 29, until: Date.now() + 10000 }) })),
    };
    sdk.adminServices.mockReturnValue({ tables });
  });
  it("persists a shared increment without retaining the client's IP", async () => {
    await throttleAuth(new Request("https://weekflow.example/api/auth/sign-in", { headers: { "x-forwarded-for": "192.0.2.10" } }), "sign-in");
    const write = tables.updateRow.mock.calls.at(-1)?.[0];
    expect(JSON.parse(write.data.data).count).toBe(30);
    expect(JSON.stringify(write)).not.toContain("192.0.2.10");
    expect(write.permissions).toEqual([]);
  });
  it("denies exhausted windows and rolls back the staged write", async () => {
    tables.getRow.mockResolvedValue({ data: JSON.stringify({ count: 30, until: Date.now() + 10000 }) });
    await expect(throttleAuth(new Request("https://weekflow.example"), "sign-in")).rejects.toMatchObject({ status: 429 });
    expect(tables.updateTransaction).toHaveBeenLastCalledWith({ transactionId: "tx", rollback: true });
  });
  it("does not throttle sign-out or other authenticated recovery actions", async () => {
    await throttleAuth(new Request("https://weekflow.example"), "sign-out");
    expect(tables.createTransaction).not.toHaveBeenCalled();
  });
});

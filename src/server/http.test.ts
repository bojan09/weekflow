import { afterEach, describe, expect, it, vi } from "vitest";
import { assertOrigin, failure, HttpError, readJson } from "./http";

describe("request boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("checks the configured production origin, including scheme and port", () => {
    vi.stubEnv("APP_URL", "https://weekflow-ashy.vercel.app");
    expect(assertOrigin(new Request("https://weekflow-ashy.vercel.app/api/data", { headers: { origin: "https://weekflow-ashy.vercel.app" } }))).toBe("https://weekflow-ashy.vercel.app");
    for (const origin of ["https://evil.example", "null", "http://weekflow-ashy.vercel.app", "https://weekflow-ashy.vercel.app:444"]) {
      expect(() => assertOrigin(new Request("https://weekflow-ashy.vercel.app/api/data", { headers: { origin } }))).toThrow(HttpError);
    }
  });
  it("rejects oversized and malformed bodies before processing them", async () => {
    const make = (body: string) => new Request("https://example.com", { method: "POST", headers: { "content-type": "application/json" }, body });
    await expect(readJson(make('"too large"'), 3)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(make("{"))).rejects.toMatchObject({ status: 400 });
    await expect(readJson(make('{"ok":true}'))).resolves.toEqual({ ok: true });
  });
  it("does not expose internal error messages or cache account responses", async () => {
    const result = failure(new Error("Secret database connection string"));
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(await result.text()).not.toContain("Secret");
  });
});

import { describe, expect, it } from "vitest";
import { safeNext, signUpSchema, resetSchema } from "./schemas";

describe("account boundaries", () => {
  it("allows only account routes after signing in", () => {
    expect(safeNext("/app/tasks?priority=high")).toBe("/app/tasks?priority=high");
    for (const path of ["https://evil.example/app/home", "//evil.example", "/app/../../sign-up", "/app/%2e%2e/sign-in", "/app/\\evil.example", "/demo/home", "/app/unknown", "\r\nhttps://evil.example"]) {
      expect(safeNext(path), path).toBe("/app/home");
    }
  });
  it("rejects malformed registration and mismatched recovery passwords", () => {
    expect(signUpSchema.safeParse({ name: "", email: "wrong", password: "123" }).success).toBe(false);
    expect(resetSchema.safeParse({ password: "long-enough-password", confirm: "different" }).success).toBe(false);
  });
});

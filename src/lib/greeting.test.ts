import { describe, expect, it } from "vitest";
import { firstName, greetingFor } from "./greeting";

describe("greeting", () => {
  it("picks the greeting for the hour", () => {
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(17)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(2)).toBe("Good evening");
  });

  it("extracts the first name", () => {
    expect(firstName("Sam Rivera")).toBe("Sam");
    expect(firstName("  Jordan  ")).toBe("Jordan");
    expect(firstName("")).toBe("");
  });
});

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AccountLoading } from "./account-loading";

it("shows a planner-shaped skeleton without a sign-in window or placeholder task data", () => {
  render(<AccountLoading />);
  expect(screen.getByRole("status", { name: "Loading planner" })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("link", { name: "Back to sign in" })).toBeNull();
  expect(screen.queryByText("Your Weekflow")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

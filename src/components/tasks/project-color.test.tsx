import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProjectColorPicker } from "./project-color";

it("offers named colors and gradients with a visible selected state", () => {
  const change = vi.fn();
  render(<ProjectColorPicker label="Project color" value="blue" onChange={change} />);
  expect(screen.getByRole("button", { name: "Blue" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Sunset gradient" }));
  expect(change).toHaveBeenCalledWith("sunset");
  expect(screen.getAllByRole("button")).toHaveLength(22);
});

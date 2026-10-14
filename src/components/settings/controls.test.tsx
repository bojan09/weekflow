import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AccentPicker } from "./appearance";
import { SegmentedControl } from "./controls";
import type { AccentId } from "@/theme/generated/palettes";

function Harness() {
  const [value, setValue] = useState<"a" | "b" | "c">("a");
  return (
    <SegmentedControl
      label="Pick"
      value={value}
      onChange={setValue}
      options={[
        { value: "a", label: "A" },
        { value: "b", label: "B" },
        { value: "c", label: "C" },
      ]}
    />
  );
}

describe("SegmentedControl", () => {
  it("exposes a radiogroup with one checked, focusable option", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Pick" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it("moves selection and focus with arrow keys and wraps around", () => {
    render(<Harness />);
    const [a, , c] = screen.getAllByRole("radio");
    a?.focus();
    fireEvent.keyDown(a!, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "B" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("radio", { name: "B" }), { key: "End" });
    expect(c).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(c!, { key: "ArrowRight" });
    expect(a).toHaveAttribute("aria-checked", "true");
  });

  it("selects on click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: "C" }));
    expect(screen.getByRole("radio", { name: "C" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("AccentPicker", () => {
  it("renders 15 named swatches and reports the chosen accent", () => {
    let chosen: AccentId = "indigo";
    render(<AccentPicker value="indigo" onChange={(id) => (chosen = id)} />);
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    expect(screen.getByRole("radio", { name: "Indigo" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Teal" }));
    expect(chosen).toBe("teal");
  });
});

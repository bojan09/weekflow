import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/avatar-image", () => ({ prepareAvatar: vi.fn() }));
import { prepareAvatar } from "@/lib/avatar-image";
import { AvatarPicker } from "./avatar-picker";

describe("profile photo picker", () => {
  it("previews a prepared upload and permits removing it", async () => {
    vi.mocked(prepareAvatar).mockResolvedValue("data:image/jpeg;base64,/9j/2Q==");
    const change = vi.fn(); const busy = vi.fn();
    const { rerender } = render(<AvatarPicker value={null} name="Sam Rivera" onChange={change} onBusyChange={busy} />);
    fireEvent.change(screen.getByLabelText("Upload profile photo"), { target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] } });
    await waitFor(() => expect(change).toHaveBeenCalledWith("data:image/jpeg;base64,/9j/2Q=="));
    expect(busy).toHaveBeenCalledWith(true);
    expect(busy).toHaveBeenLastCalledWith(false);
    rerender(<AvatarPicker value="data:image/jpeg;base64,/9j/2Q==" name="Sam Rivera" onChange={change} onBusyChange={busy} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(change).toHaveBeenLastCalledWith(null);
  });
  it("shows a failed upload without replacing the current photo", async () => {
    vi.mocked(prepareAvatar).mockRejectedValue(new Error("Choose a JPG, PNG or WebP image."));
    const change = vi.fn();
    render(<AvatarPicker value={null} name="Sam Rivera" onChange={change} onBusyChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Upload profile photo"), { target: { files: [new File(["bad"], "bad.svg", { type: "image/svg+xml" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a JPG");
    expect(change).not.toHaveBeenCalled();
  });
});

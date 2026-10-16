import { afterEach, describe, expect, it, vi } from "vitest";
import { profileSchema } from "@/domain/profile";
import { prepareAvatar } from "./avatar-image";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("avatar images", () => {
  it("rejects unsupported and oversized files before decoding", async () => {
    const decode = vi.fn(); vi.stubGlobal("createImageBitmap", decode);
    await expect(prepareAvatar(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }))).rejects.toThrow(/JPG/);
    await expect(prepareAvatar(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" }))).rejects.toThrow(/10 MB/);
    expect(decode).not.toHaveBeenCalled();
  });
  it("crops locally and re-encodes a bounded JPEG, releasing the decoded bitmap", async () => {
    const bitmap = { width: 600, height: 400, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/2Q==");
    const result = await prepareAvatar(new File(["image"], "photo.png", { type: "image/png" }));
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 100, 0, 400, 400, 0, 0, 256, 256);
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(result).toBe("data:image/jpeg;base64,/9j/2Q==");
  });
  it("rejects arbitrary URLs, SVG payloads and oversized image data at the shared server boundary", () => {
    const schema = profileSchema.shape.avatarImage;
    expect(schema.safeParse("https://tracker.example/photo.jpg").success).toBe(false);
    expect(schema.safeParse("data:image/svg+xml;base64,AAAA").success).toBe(false);
    expect(schema.safeParse("data:image/jpeg;base64,/9j/" + "A".repeat(120_000)).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse("data:image/jpeg;base64,/9j/2Q==").success).toBe(true);
  });
});

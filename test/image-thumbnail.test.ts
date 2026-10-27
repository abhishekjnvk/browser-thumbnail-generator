import { describe, it, expect, vi } from "vitest";
import { generateImageThumbnail } from "../src/image-thumbnail.js";
import { MockImage, objectUrlMap, setMockMediaError, setMockImageBitmap } from "./setup.js";

function createImageFile(
  type = "image/png",
  size = 1024,
  name = "test.png",
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("generateImageThumbnail", () => {
  it("should generate a thumbnail with default options", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({ file });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.original_width).toBe(800);
    expect(result.original_height).toBe(600);
    expect(result.original_size).toBe(1024);
    expect(result.size).toBeGreaterThan(0);
  });

  it("should respect custom width and height", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 200,
      height: 200,
      maintainAspectRatio: false,
    });

    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it("should maintain aspect ratio by default", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 400,
      height: 400,
      maintainAspectRatio: true,
    });

    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should use custom output format", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      outputFormat: "image/webp",
      quality: 0.5,
    });

    expect(result.thumbnail.type).toBe("image/webp");
  });

  it("should reject when image fails to load", async () => {
    setMockMediaError(true);
    const file = createImageFile();
    await expect(generateImageThumbnail({ file })).rejects.toThrow(
      "Failed to load image",
    );
  });

  it("should support AbortSignal — already aborted", async () => {
    const file = createImageFile();
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateImageThumbnail({ file, signal: controller.signal }),
    ).rejects.toThrow("aborted");
  });

  it("should support AbortSignal — abort during load", async () => {
    const file = createImageFile();
    const controller = new AbortController();

    class SlowImage extends MockImage {
      override set src(value: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 50);
        this._src = value;
      }
      private _src = "";
      override get src(): string {
        return this._src;
      }
    }
    vi.stubGlobal("Image", SlowImage);

    const promise = generateImageThumbnail({ file, signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow("aborted");
  });

  it("should remove abort listener on success", async () => {
    const file = createImageFile();
    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");

    await generateImageThumbnail({ file, signal: controller.signal });

    expect(addSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
    );
  });

  it("should revoke object URL after success", async () => {
    const file = createImageFile();

    await generateImageThumbnail({ file });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(objectUrlMap.size).toBe(0);
  });

  it("should revoke object URL after error", async () => {
    setMockMediaError(true);
    const file = createImageFile();
    await expect(generateImageThumbnail({ file })).rejects.toThrow();

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("should support maxWidth constraint (scale down only)", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      maxWidth: 400,
    });

    // 800x600 → maxWidth 400 → 400x300
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should support maxHeight constraint (scale down only)", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      maxHeight: 300,
    });

    // 800x600 → maxHeight 300 → 400x300
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should not upscale when maxWidth/maxHeight exceed original", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      maxWidth: 1600,
      maxHeight: 1200,
    });

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("should support crop mode (center-crop to fill)", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 400,
      height: 400,
      crop: true,
    });

    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
  });

  it("should support backgroundColor option", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      backgroundColor: "#000000",
      outputFormat: "image/jpeg",
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
  });

  it("should use original dimensions when width and height are 0", async () => {
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 0,
      height: 0,
    });

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("should handle SVG fallback when natural dimensions are 0", async () => {
    class SvgImage extends MockImage {
      override naturalWidth = 0;
      override naturalHeight = 0;
      override width = 0;
      override height = 0;
    }
    vi.stubGlobal("Image", SvgImage);

    const file = createImageFile("image/svg+xml");

    const result = await generateImageThumbnail({
      file,
      width: 200,
      height: 200,
    });

    // Should use target dimensions as fallback
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("should handle concurrent generations independently", async () => {
    const file1 = createImageFile("image/png", 1024, "a.png");
    const file2 = createImageFile("image/jpeg", 2048, "b.jpg");

    const [result1, result2] = await Promise.all([
      generateImageThumbnail({ file: file1, width: 200 }),
      generateImageThumbnail({ file: file2, width: 400 }),
    ]);

    expect(result1.thumbnail).toBeInstanceOf(Blob);
    expect(result2.thumbnail).toBeInstanceOf(Blob);
    expect(result1.original_size).toBe(1024);
    expect(result2.original_size).toBe(2048);
  });

  it("should fall back to canvas path when createImageBitmap fails", async () => {
    // Disable createImageBitmap to force the fallback path
    setMockImageBitmap(false);
    const file = createImageFile();

    const result = await generateImageThumbnail({ file, width: 200 });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150); // 800x600 → 200x150 with aspect ratio
  });

  it("should use createImageBitmap fast path when available", async () => {
    // createImageBitmap is enabled by default in setup
    const file = createImageFile();

    const result = await generateImageThumbnail({ file, width: 200 });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });
});

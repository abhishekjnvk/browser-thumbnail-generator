import { describe, it, expect, vi } from "vitest";
import { generateImageThumbnail } from "../src/image-thumbnail.js";
import { MockImage, objectUrlMap } from "./setup.js";

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
    class ErrorImage extends MockImage {
      override set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
      override get src(): string {
        return "";
      }
    }
    vi.stubGlobal("Image", ErrorImage);

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

    // Use a slow-loading image
    class SlowImage extends MockImage {
      override set src(value: string) {
        // Don't call onload — let the test abort first
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

  it("should revoke object URL after success", async () => {
    const file = createImageFile();

    await generateImageThumbnail({ file });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(objectUrlMap.size).toBe(0);
  });

  it("should revoke object URL after error", async () => {
    class ErrorImage extends MockImage {
      override set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
      override get src(): string {
        return "";
      }
    }
    vi.stubGlobal("Image", ErrorImage);

    const file = createImageFile();
    await expect(generateImageThumbnail({ file })).rejects.toThrow();

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  getAspectHeightWidth,
  canvasToThumbnail,
  resolveDimensions,
  fillBackground,
} from "../src/utils.js";
import { readExifOrientation, getOrientationTransform } from "../src/exif.js";
import { createMockCanvas } from "./setup.js";

describe("getAspectHeightWidth", () => {
  it("should constrain width when target box is wider than source", () => {
    const result = getAspectHeightWidth(400, 400, 800, 600);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should constrain height when target box is taller than source", () => {
    const result = getAspectHeightWidth(200, 200, 1920, 1080);
    expect(result.width).toBe(200);
    expect(result.height).toBe(113);
  });

  it("should return exact dimensions when aspect ratios match", () => {
    const result = getAspectHeightWidth(400, 300, 800, 600);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should handle landscape source in portrait box", () => {
    const result = getAspectHeightWidth(100, 200, 1600, 900);
    expect(result.width).toBe(100);
    expect(result.height).toBe(56);
  });

  it("should guard against zero source dimensions", () => {
    const result = getAspectHeightWidth(400, 300, 0, 0);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should guard against NaN source dimensions", () => {
    const result = getAspectHeightWidth(400, 300, NaN, NaN);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should return source dimensions when target is zero", () => {
    const result = getAspectHeightWidth(0, 0, 800, 600);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});

describe("resolveDimensions", () => {
  it("should use original dimensions when no constraints given", () => {
    const result = resolveDimensions({
      width: 0,
      height: 0,
      maxWidth: 0,
      maxHeight: 0,
      maintainAspectRatio: true,
      crop: false,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("should apply maxWidth constraint", () => {
    const result = resolveDimensions({
      width: 0,
      height: 0,
      maxWidth: 400,
      maxHeight: 0,
      maintainAspectRatio: true,
      crop: false,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should apply maxHeight constraint", () => {
    const result = resolveDimensions({
      width: 0,
      height: 0,
      maxWidth: 0,
      maxHeight: 300,
      maintainAspectRatio: true,
      crop: false,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should not upscale beyond original", () => {
    const result = resolveDimensions({
      width: 0,
      height: 0,
      maxWidth: 1600,
      maxHeight: 1200,
      maintainAspectRatio: true,
      crop: false,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("should center-crop when crop is true", () => {
    const result = resolveDimensions({
      width: 400,
      height: 400,
      maxWidth: 0,
      maxHeight: 0,
      maintainAspectRatio: true,
      crop: true,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    // Source 800x600, target 400x400 (1:1)
    // Crop width: 600 * 1 = 600, sx = (800 - 600) / 2 = 100
    expect(result.sw).toBe(600);
    expect(result.sh).toBe(600);
    expect(result.sx).toBe(100);
    expect(result.sy).toBe(0);
  });

  it("should stretch when maintainAspectRatio is false", () => {
    const result = resolveDimensions({
      width: 200,
      height: 200,
      maxWidth: 0,
      maxHeight: 0,
      maintainAspectRatio: false,
      crop: false,
      sourceWidth: 800,
      sourceHeight: 600,
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.sw).toBe(800);
    expect(result.sh).toBe(600);
  });
});

describe("fillBackground", () => {
  it("should call fillRect on the context", () => {
    const canvas = createMockCanvas();
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D & {
      fillRect: ReturnType<typeof vi.fn>;
      save: ReturnType<typeof vi.fn>;
      restore: ReturnType<typeof vi.fn>;
    };

    fillBackground(ctx as unknown as CanvasRenderingContext2D, canvas, "#ffffff");

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 200, 150);
  });
});

describe("canvasToThumbnail", () => {
  it("should resolve with a Blob", async () => {
    const canvas = createMockCanvas();
    canvas.width = 200;
    canvas.height = 150;

    const blob = await canvasToThumbnail(canvas, "image/png");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("should pass format and quality to toBlob", async () => {
    const canvas = createMockCanvas();
    canvas.width = 100;
    canvas.height = 100;

    await canvasToThumbnail(canvas, "image/webp", 0.8);

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.8);
  });

  it("should default to image/jpeg", async () => {
    const canvas = createMockCanvas();
    canvas.width = 100;
    canvas.height = 100;

    await canvasToThumbnail(canvas);

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", undefined);
  });

  it("should reset canvas dimensions after encoding", async () => {
    const canvas = createMockCanvas();
    canvas.width = 200;
    canvas.height = 150;

    await canvasToThumbnail(canvas);

    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("should reject when toBlob returns null", async () => {
    const canvas = createMockCanvas();
    canvas.width = 100;
    canvas.height = 100;
    canvas.toBlob = vi.fn((callback: BlobCallback) => {
      setTimeout(() => callback(null), 0);
    });

    await expect(canvasToThumbnail(canvas, "image/png")).rejects.toThrow(
      "Failed to encode canvas to image/png",
    );
  });
});

describe("readExifOrientation", () => {
  it("should return 1 for non-JPEG files", async () => {
    const file = new File([new Uint8Array(100)], "test.png", { type: "image/png" });
    const orientation = await readExifOrientation(file);
    expect(orientation).toBe(1);
  });

  it("should return 1 for JPEG without EXIF data", async () => {
    // Minimal JPEG: SOI + EOI
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const file = new File([jpegBytes], "test.jpg", { type: "image/jpeg" });
    const orientation = await readExifOrientation(file);
    expect(orientation).toBe(1);
  });

  it("should return 1 for invalid/corrupt data", async () => {
    const file = new File([new Uint8Array([0x00, 0x01, 0x02])], "test.jpg", {
      type: "image/jpeg",
    });
    const orientation = await readExifOrientation(file);
    expect(orientation).toBe(1);
  });
});

describe("getOrientationTransform", () => {
  it("should return identity for orientation 1", () => {
    const t = getOrientationTransform(1, 800, 600);
    expect(t.width).toBe(800);
    expect(t.height).toBe(600);
  });

  it("should swap dimensions for orientation 6 (90° CW)", () => {
    const t = getOrientationTransform(6, 800, 600);
    expect(t.width).toBe(600);
    expect(t.height).toBe(800);
  });

  it("should swap dimensions for orientation 8 (270° CW)", () => {
    const t = getOrientationTransform(8, 800, 600);
    expect(t.width).toBe(600);
    expect(t.height).toBe(800);
  });

  it("should keep dimensions for orientation 3 (180°)", () => {
    const t = getOrientationTransform(3, 800, 600);
    expect(t.width).toBe(800);
    expect(t.height).toBe(600);
  });

  it("should return identity for unknown orientation", () => {
    const t = getOrientationTransform(99, 800, 600);
    expect(t.width).toBe(800);
    expect(t.height).toBe(600);
  });
});

import { describe, it, expect, vi } from "vitest";
import { getAspectHeightWidth, canvasToThumbnail } from "../src/utils.js";
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

    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/webp",
      0.8,
    );
  });

  it("should default to image/jpeg", async () => {
    const canvas = createMockCanvas();
    canvas.width = 100;
    canvas.height = 100;

    await canvasToThumbnail(canvas);

    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      undefined,
    );
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

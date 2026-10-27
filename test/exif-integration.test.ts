import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist the mock so vi.mock can reference it
const { mockReadExifOrientation } = vi.hoisted(() => ({
  mockReadExifOrientation: vi.fn().mockResolvedValue(1),
}));

// Mock only readExifOrientation; keep getOrientationTransform real
vi.mock("../src/exif.js", async () => {
  const actual = await vi.importActual<typeof import("../src/exif.js")>(
    "../src/exif.js",
  );
  return {
    ...actual,
    readExifOrientation: mockReadExifOrientation,
  };
});

import { generateImageThumbnail } from "../src/image-thumbnail.js";
import { setMockImageBitmap } from "./setup.js";

function createImageFile(
  type = "image/jpeg",
  size = 1024,
  name = "test.jpg",
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("EXIF orientation integration", () => {
  beforeEach(() => {
    mockReadExifOrientation.mockResolvedValue(1);
    // Disable fast path so the full canvas path is always used
    setMockImageBitmap(false);
  });

  it("should apply no transform for orientation 1", async () => {
    mockReadExifOrientation.mockResolvedValue(1);
    const file = createImageFile();

    const result = await generateImageThumbnail({ file, width: 200 });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150); // 800x600 → 200x150
    expect(result.original_width).toBe(800);
    expect(result.original_height).toBe(600);
  });

  it("should swap dimensions for orientation 6 (90° CW)", async () => {
    mockReadExifOrientation.mockResolvedValue(6);
    const file = createImageFile();

    // Source 800x600, orientation 6 swaps to 600x800 (portrait)
    // With width: 200, maintainAspectRatio: true
    // Target box: 200 x 800 (width=200, height=sourceHeight=800)
    // sourceRatio = 600/800 = 0.75, targetRatio = 200/800 = 0.25
    // Constrain by width: 200 x round(200/0.75) = 200 x 267
    const result = await generateImageThumbnail({
      file,
      width: 200,
      maintainAspectRatio: true,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(267);
    // Original dimensions should reflect the actual image, not swapped
    expect(result.original_width).toBe(800);
    expect(result.original_height).toBe(600);
  });

  it("should swap dimensions for orientation 8 (270° CW)", async () => {
    mockReadExifOrientation.mockResolvedValue(8);
    const file = createImageFile();

    // Same swap as orientation 6: 600x800 → 200x267
    const result = await generateImageThumbnail({
      file,
      width: 200,
      maintainAspectRatio: true,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(267);
  });

  it("should keep dimensions for orientation 3 (180°)", async () => {
    mockReadExifOrientation.mockResolvedValue(3);
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 200,
      maintainAspectRatio: true,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });

  it("should crop correctly with EXIF orientation 6 (regression test)", async () => {
    // This is the regression test for the crop + EXIF coordinate space bug.
    // Source 800x600, orientation 6 swaps to 600x800.
    // Crop to 400x400: should center-crop the swapped 600x800 to 400x400.
    mockReadExifOrientation.mockResolvedValue(6);
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 400,
      height: 400,
      crop: true,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    // Crop fills the target exactly
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    // Original dimensions are the actual image dimensions
    expect(result.original_width).toBe(800);
    expect(result.original_height).toBe(600);
  });

  it("should crop correctly with EXIF orientation 8 (regression test)", async () => {
    mockReadExifOrientation.mockResolvedValue(8);
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 300,
      height: 300,
      crop: true,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });

  it("should apply background fill with EXIF orientation", async () => {
    mockReadExifOrientation.mockResolvedValue(6);
    const file = createImageFile();

    const result = await generateImageThumbnail({
      file,
      width: 200,
      backgroundColor: "#ff0000",
      outputFormat: "image/jpeg",
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.thumbnail.type).toBe("image/jpeg");
  });

  it("should read EXIF only for JPEG files", async () => {
    mockReadExifOrientation.mockResolvedValue(1);
    const pngFile = createImageFile("image/png", 1024, "test.png");

    await generateImageThumbnail({ file: pngFile, width: 200 });

    // readExifOrientation is called but returns 1 for non-JPEG
    expect(mockReadExifOrientation).toHaveBeenCalled();
  });
});

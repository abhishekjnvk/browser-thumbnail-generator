import { describe, it, expect } from "vitest";
import { generateVideoThumbnail } from "../src/video-thumbnail.js";
import { objectUrlMap, setMockVideoError } from "./setup.js";

function createVideoFile(
  type = "video/mp4",
  size = 10240,
  name = "test.mp4",
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("generateVideoThumbnail", () => {
  it("should generate a thumbnail with default options (timestamp 0)", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({ file });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.original_width).toBe(1920);
    expect(result.original_height).toBe(1080);
    expect(result.original_size).toBe(10240);
    expect(result.total_duration).toBe(10.5);
    expect(result.timestamp).toBe(0);
  });

  it("should respect custom width and height", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({
      file,
      width: 320,
      height: 240,
      maintainAspectRatio: false,
    });

    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
  });

  it("should maintain aspect ratio by default", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({
      file,
      width: 400,
      height: 400,
    });

    expect(result.width).toBe(400);
    expect(result.height).toBe(225);
  });

  it("should seek to the specified timestamp", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({
      file,
      timestamp: 5,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.timestamp).toBe(5);
  });

  it("should clamp timestamp to video duration", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({
      file,
      timestamp: 999,
    });

    expect(result.thumbnail).toBeInstanceOf(Blob);
    // Clamped to duration (10.5)
    expect(result.timestamp).toBe(10.5);
  });

  it("should use custom output format", async () => {
    const file = createVideoFile();

    const result = await generateVideoThumbnail({
      file,
      outputFormat: "image/png",
    });

    expect(result.thumbnail.type).toBe("image/png");
  });

  it("should reject when video fails to load", async () => {
    setMockVideoError(true);
    const file = createVideoFile();

    await expect(generateVideoThumbnail({ file })).rejects.toThrow(
      "Failed to load video",
    );
  });

  it("should support AbortSignal — already aborted", async () => {
    const file = createVideoFile();
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateVideoThumbnail({ file, signal: controller.signal }),
    ).rejects.toThrow("aborted");
  });

  it("should revoke object URL after success", async () => {
    const file = createVideoFile();

    await generateVideoThumbnail({ file });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(objectUrlMap.size).toBe(0);
  });

  it("should revoke object URL after error", async () => {
    setMockVideoError(true);
    const file = createVideoFile();

    await expect(generateVideoThumbnail({ file })).rejects.toThrow();

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

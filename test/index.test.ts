import { describe, it, expect } from "vitest";
import generateMediaThumbnail, {
  supportedMimeTypes,
  supportedImageMimes,
  supportedVideoMimes,
} from "../src/index.js";

function createFile(type: string, size = 1024, name = "test"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("generateMediaThumbnail — input validation", () => {
  it("should throw TypeError when options is missing", async () => {
    // @ts-expect-error testing runtime validation
    await expect(generateMediaThumbnail()).rejects.toThrow(TypeError);
    // @ts-expect-error testing runtime validation
    await expect(generateMediaThumbnail(null)).rejects.toThrow(TypeError);
  });

  it("should throw TypeError when file is missing", async () => {
    // @ts-expect-error testing runtime validation
    await expect(generateMediaThumbnail({})).rejects.toThrow("`file` is required");
  });

  it("should throw TypeError when file is not a Blob", async () => {
    await expect(
      // @ts-expect-error testing runtime validation
      generateMediaThumbnail({ file: "not a file" }),
    ).rejects.toThrow("must be a File or Blob");
  });

  it("should throw Error when file type is empty", async () => {
    const file = new File([new Uint8Array(10)], "test", { type: "" });
    await expect(generateMediaThumbnail({ file })).rejects.toThrow(
      "Could not determine the file's MIME type",
    );
  });

  it("should throw Error for unsupported file type", async () => {
    const file = createFile("application/pdf");
    await expect(generateMediaThumbnail({ file })).rejects.toThrow(
      'Unsupported file type: "application/pdf"',
    );
  });

  it("should throw TypeError for negative width", async () => {
    const file = createFile("image/png");
    await expect(
      generateMediaThumbnail({ file, width: -100 }),
    ).rejects.toThrow("`width` must be a non-negative finite number");
  });

  it("should throw TypeError for negative height", async () => {
    const file = createFile("image/png");
    await expect(
      generateMediaThumbnail({ file, height: -50 }),
    ).rejects.toThrow("`height` must be a non-negative finite number");
  });

  it("should throw TypeError for negative timestamp", async () => {
    const file = createFile("video/mp4");
    await expect(
      generateMediaThumbnail({ file, timestamp: -1 }),
    ).rejects.toThrow("`timestamp` must be a non-negative finite number");
  });

  it("should throw TypeError for quality out of range", async () => {
    const file = createFile("image/png");
    await expect(
      generateMediaThumbnail({ file, quality: 1.5 }),
    ).rejects.toThrow("`quality` must be a number between 0 and 1");
    await expect(
      generateMediaThumbnail({ file, quality: -0.1 }),
    ).rejects.toThrow("`quality` must be a number between 0 and 1");
  });
});

describe("generateMediaThumbnail — routing", () => {
  it("should route image files to image thumbnail generator", async () => {
    const file = createFile("image/jpeg");
    const result = await generateMediaThumbnail({ file });
    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.original_width).toBe(800);
    expect(result.original_height).toBe(600);
  });

  it("should route video files to video thumbnail generator", async () => {
    const file = createFile("video/mp4");
    const result = await generateMediaThumbnail({ file });
    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(result.total_duration).toBe(10.5);
    expect(result.original_width).toBe(1920);
  });

  it("should accept all supported image MIME types", async () => {
    for (const mime of supportedImageMimes) {
      const file = createFile(mime);
      const result = await generateMediaThumbnail({ file });
      expect(result.thumbnail).toBeInstanceOf(Blob);
    }
  });

  it("should accept all supported video MIME types", async () => {
    for (const mime of supportedVideoMimes) {
      const file = createFile(mime);
      const result = await generateMediaThumbnail({ file });
      expect(result.thumbnail).toBeInstanceOf(Blob);
    }
  });
});

describe("supportedMimeTypes export", () => {
  it("should include all image and video MIME types", () => {
    expect(supportedMimeTypes).toEqual([
      ...supportedImageMimes,
      ...supportedVideoMimes,
    ]);
  });

  it("should include common formats", () => {
    expect(supportedMimeTypes).toContain("image/jpeg");
    expect(supportedMimeTypes).toContain("image/png");
    expect(supportedMimeTypes).toContain("video/mp4");
    expect(supportedMimeTypes).toContain("video/webm");
  });
});

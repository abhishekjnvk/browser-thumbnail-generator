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
    const file = createImageFile("image/png");
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

  it("should throw TypeError for negative maxWidth", async () => {
    const file = createFile("image/png");
    await expect(
      generateMediaThumbnail({ file, maxWidth: -100 }),
    ).rejects.toThrow("`maxWidth` must be a non-negative finite number");
  });

  it("should throw TypeError for negative maxHeight", async () => {
    const file = createFile("image/png");
    await expect(
      generateMediaThumbnail({ file, maxHeight: -50 }),
    ).rejects.toThrow("`maxHeight` must be a non-negative finite number");
  });

  it("should throw TypeError for invalid outputFormat", async () => {
    const file = createFile("image/png");
    await expect(
      // @ts-expect-error testing runtime validation
      generateMediaThumbnail({ file, outputFormat: "image/gif" }),
    ).rejects.toThrow("`outputFormat` must be one of");
  });

  it("should throw TypeError for non-boolean maintainAspectRatio", async () => {
    const file = createFile("image/png");
    await expect(
      // @ts-expect-error testing runtime validation
      generateMediaThumbnail({ file, maintainAspectRatio: "yes" }),
    ).rejects.toThrow("`maintainAspectRatio` must be a boolean");
  });

  it("should throw TypeError for non-boolean crop", async () => {
    const file = createFile("image/png");
    await expect(
      // @ts-expect-error testing runtime validation
      generateMediaThumbnail({ file, crop: "yes" }),
    ).rejects.toThrow("`crop` must be a boolean");
  });

  it("should throw Error when file exceeds maxFileSize", async () => {
    const file = createFile("image/png", 2048);
    await expect(
      generateMediaThumbnail({ file, maxFileSize: 1024 }),
    ).rejects.toThrow("exceeds the maximum allowed size");
  });

  it("should accept file within maxFileSize limit", async () => {
    const file = createFile("image/png", 512);
    const result = await generateMediaThumbnail({ file, maxFileSize: 1024 });
    expect(result.thumbnail).toBeInstanceOf(Blob);
  });
});

function createImageFile(type = "image/png", size = 1024): File {
  return createFile(type, size);
}

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

  it("should support maxWidth option end-to-end", async () => {
    const file = createFile("image/png");
    const result = await generateMediaThumbnail({ file, maxWidth: 400 });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should support crop option end-to-end", async () => {
    const file = createFile("image/png");
    const result = await generateMediaThumbnail({
      file,
      width: 300,
      height: 300,
      crop: true,
    });
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });

  it("should support backgroundColor option end-to-end", async () => {
    const file = createFile("image/png");
    const result = await generateMediaThumbnail({
      file,
      backgroundColor: "#ff0000",
      outputFormat: "image/jpeg",
    });
    expect(result.thumbnail.type).toBe("image/jpeg");
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
    expect(supportedMimeTypes).toContain("image/webp");
    expect(supportedMimeTypes).toContain("image/avif");
    expect(supportedMimeTypes).toContain("video/mp4");
    expect(supportedMimeTypes).toContain("video/webm");
    expect(supportedMimeTypes).toContain("video/x-matroska");
  });
});

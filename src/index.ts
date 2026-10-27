import { supportedImageMimes, supportedVideoMimes, supportedMimeTypes } from "./const.js";
import { generateImageThumbnail } from "./image-thumbnail.js";
import { generateVideoThumbnail } from "./video-thumbnail.js";
import type { ThumbnailOptions, ThumbnailResult } from "./types.js";

export type { ThumbnailOptions, ThumbnailResult, OutputFormat } from "./types.js";
export { supportedMimeTypes, supportedImageMimes, supportedVideoMimes } from "./const.js";

const imageMimeSet = new Set(supportedImageMimes);
const videoMimeSet = new Set(supportedVideoMimes);

const validOutputFormats: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Generate a thumbnail from an image or video file.
 *
 * Automatically detects whether the file is an image or video based on its
 * MIME type and delegates to the appropriate generator.
 *
 * @param options - Thumbnail generation options
 * @returns A promise resolving to the thumbnail result
 * @throws {TypeError} If input validation fails
 * @throws {Error} If the file type is not supported or processing fails
 */
export async function generateMediaThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  // --- Input validation ---
  if (!options || typeof options !== "object") {
    throw new TypeError("Options object is required.");
  }

  const { file } = options;

  if (!file) {
    throw new TypeError("`file` is required. Provide a File or Blob to generate a thumbnail from.");
  }

  if (!(file instanceof Blob)) {
    throw new TypeError("`file` must be a File or Blob instance. Received: " + typeof file);
  }

  const fileType = file.type;

  if (!fileType) {
    throw new Error(
      "Could not determine the file's MIME type. The file may be empty or the type is unknown.",
    );
  }

  // --- Validate numeric options ---
  const { width, height, maxWidth, maxHeight, timestamp, quality, maxFileSize } = options;

  const validateNonNegativeNumber = (name: string, value: unknown): void => {
    if (
      value !== undefined &&
      (typeof value !== "number" || value < 0 || !Number.isFinite(value))
    ) {
      throw new TypeError(`\`${name}\` must be a non-negative finite number.`);
    }
  };

  validateNonNegativeNumber("width", width);
  validateNonNegativeNumber("height", height);
  validateNonNegativeNumber("maxWidth", maxWidth);
  validateNonNegativeNumber("maxHeight", maxHeight);
  validateNonNegativeNumber("timestamp", timestamp);
  validateNonNegativeNumber("maxFileSize", maxFileSize);

  if (quality !== undefined && (typeof quality !== "number" || quality < 0 || quality > 1)) {
    throw new TypeError("`quality` must be a number between 0 and 1.");
  }

  // --- Validate enum-like options ---
  const { outputFormat, maintainAspectRatio, crop } = options;

  if (outputFormat !== undefined && !validOutputFormats.has(outputFormat)) {
    throw new TypeError(
      `\`outputFormat\` must be one of: ${[...validOutputFormats].join(", ")}. Received: "${outputFormat}".`,
    );
  }

  if (maintainAspectRatio !== undefined && typeof maintainAspectRatio !== "boolean") {
    throw new TypeError("`maintainAspectRatio` must be a boolean.");
  }

  if (crop !== undefined && typeof crop !== "boolean") {
    throw new TypeError("`crop` must be a boolean.");
  }

  // --- Validate file size ---
  if (maxFileSize !== undefined && maxFileSize > 0 && file.size > maxFileSize) {
    throw new Error(
      `File size (${file.size} bytes) exceeds the maximum allowed size (${maxFileSize} bytes).`,
    );
  }

  // --- Route by MIME type ---
  if (videoMimeSet.has(fileType)) {
    return generateVideoThumbnail(options);
  }

  if (imageMimeSet.has(fileType)) {
    return generateImageThumbnail(options);
  }

  throw new Error(
    `Unsupported file type: "${fileType}". ` + `Supported types: ${supportedMimeTypes.join(", ")}`,
  );
}

export default generateMediaThumbnail;

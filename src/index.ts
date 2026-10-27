import { supportedImageMimes, supportedVideoMimes, supportedMimeTypes } from "./const.js";
import { generateImageThumbnail } from "./image-thumbnail.js";
import { generateVideoThumbnail } from "./video-thumbnail.js";
import type { ThumbnailOptions, ThumbnailResult } from "./types.js";

export type { ThumbnailOptions, ThumbnailResult, OutputFormat } from "./types.js";
export { supportedMimeTypes, supportedImageMimes, supportedVideoMimes } from "./const.js";

const imageMimeSet = new Set(supportedImageMimes);
const videoMimeSet = new Set(supportedVideoMimes);

/**
 * Generate a thumbnail from an image or video file.
 *
 * Automatically detects whether the file is an image or video based on its
 * MIME type and delegates to the appropriate generator.
 *
 * @param options - Thumbnail generation options
 * @returns A promise resolving to the thumbnail result
 * @throws {TypeError} If the file is missing or not a valid File/Blob
 * @throws {Error} If the file type is not supported
 */
export async function generateMediaThumbnail(
  options: ThumbnailOptions,
): Promise<ThumbnailResult> {
  // --- Input validation ---
  if (!options || typeof options !== "object") {
    throw new TypeError("Options object is required.");
  }

  const { file } = options;

  if (!file) {
    throw new TypeError("`file` is required. Provide a File or Blob to generate a thumbnail from.");
  }

  if (!(file instanceof Blob)) {
    throw new TypeError(
      "`file` must be a File or Blob instance. Received: " + typeof file,
    );
  }

  const fileType = file.type;

  if (!fileType) {
    throw new Error(
      "Could not determine the file's MIME type. The file may be empty or the type is unknown.",
    );
  }

  // --- Validate numeric options ---
  const { width, height, timestamp, quality } = options;

  if (width !== undefined && (typeof width !== "number" || width < 0 || !Number.isFinite(width))) {
    throw new TypeError("`width` must be a non-negative finite number.");
  }

  if (height !== undefined && (typeof height !== "number" || height < 0 || !Number.isFinite(height))) {
    throw new TypeError("`height` must be a non-negative finite number.");
  }

  if (timestamp !== undefined && (typeof timestamp !== "number" || timestamp < 0 || !Number.isFinite(timestamp))) {
    throw new TypeError("`timestamp` must be a non-negative finite number.");
  }

  if (quality !== undefined && (typeof quality !== "number" || quality < 0 || quality > 1)) {
    throw new TypeError("`quality` must be a number between 0 and 1.");
  }

  // --- Route by MIME type ---
  if (videoMimeSet.has(fileType)) {
    return generateVideoThumbnail(options);
  }

  if (imageMimeSet.has(fileType)) {
    return generateImageThumbnail(options);
  }

  throw new Error(
    `Unsupported file type: "${fileType}". ` +
      `Supported types: ${supportedMimeTypes.join(", ")}`,
  );
}

export default generateMediaThumbnail;

import {
  canvasToThumbnail,
  fillBackground,
  resolveDimensions,
} from "./utils.js";
import { readExifOrientation, getOrientationTransform } from "./exif.js";
import type { OutputFormat, ThumbnailOptions, ThumbnailResult } from "./types.js";

type ImageThumbnailOptions = Pick<
  ThumbnailOptions,
  | "file"
  | "width"
  | "height"
  | "maxWidth"
  | "maxHeight"
  | "maintainAspectRatio"
  | "crop"
  | "backgroundColor"
  | "outputFormat"
  | "quality"
  | "signal"
>;

/**
 * Fast path using createImageBitmap with built-in resize.
 * Only used when: no crop, no background fill, no EXIF rotation needed.
 * Falls back to the full Image + Canvas path otherwise.
 */
async function tryFastPath(
  file: Blob,
  targetWidth: number,
  targetHeight: number,
  outputFormat: OutputFormat,
  quality: number | undefined,
  signal: AbortSignal | undefined,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  if (signal?.aborted) return null;

  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: targetWidth > 0 ? targetWidth : undefined,
      resizeHeight: targetHeight > 0 ? targetHeight : undefined,
      resizeQuality: "high",
    });

    if (signal?.aborted) {
      bitmap.close();
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await canvasToThumbnail(canvas, outputFormat, quality);

    return { blob, width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

export function generateImageThumbnail(
  options: ImageThumbnailOptions,
): Promise<ThumbnailResult> {
  const {
    file,
    width = 0,
    height = 0,
    maxWidth = 0,
    maxHeight = 0,
    maintainAspectRatio = true,
    crop = false,
    backgroundColor,
    outputFormat = "image/jpeg",
    quality,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    let settled = false;

    const cleanup = (): void => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      URL.revokeObjectURL(objectUrl);
    };

    const fail = (err: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const succeed = (result: ThumbnailResult): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onAbort = (): void => {
      fail(new DOMException("The operation was aborted.", "AbortError"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    img.onload = async (): Promise<void> => {
      if (settled) return;
      try {
        // Resolve source dimensions with SVG fallback
        let srcW = img.naturalWidth || img.width;
        let srcH = img.naturalHeight || img.height;

        if (srcW <= 0 || srcH <= 0) {
          // SVG without intrinsic dimensions — use target or sensible defaults
          srcW = width > 0 ? width : maxWidth > 0 ? maxWidth : 1920;
          srcH = height > 0 ? height : maxHeight > 0 ? maxHeight : 1080;
        }

        // Read EXIF orientation for JPEG images
        const orientation = await readExifOrientation(file);
        const transform = getOrientationTransform(orientation, srcW, srcH);

        // Resolve target canvas dimensions and crop region.
        // Crop/scale is computed in the post-transform coordinate space.
        const dims = resolveDimensions({
          width,
          height,
          maxWidth,
          maxHeight,
          maintainAspectRatio,
          crop,
          sourceWidth: transform.width,
          sourceHeight: transform.height,
        });

        if (dims.width <= 0 || dims.height <= 0) {
          fail(
            new Error(
              "Resolved thumbnail dimensions are zero. Provide valid width/height or a media file with intrinsic dimensions.",
            ),
          );
          return;
        }

        // Fast path: createImageBitmap (only for simple resize, no crop/fill/EXIF)
        if (!crop && !backgroundColor && orientation === 1) {
          const fastResult = await tryFastPath(
            file,
            dims.width,
            dims.height,
            outputFormat,
            quality,
            signal,
          );
          if (fastResult) {
            succeed({
              thumbnail: fastResult.blob,
              size: fastResult.blob.size,
              width: dims.width,
              height: dims.height,
              original_size: file.size,
              original_width: srcW,
              original_height: srcH,
            });
            return;
          }
        }

        // Full path: Canvas with EXIF transform, crop, and background fill
        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail(new Error("Failed to get 2D canvas context"));
          return;
        }

        // Fill background if specified (useful for JPEG which has no alpha)
        if (backgroundColor) {
          fillBackground(ctx, canvas, backgroundColor);
        }

        if (orientation !== 1) {
          // EXIF rotation needed: draw to an intermediate canvas first,
          // then crop/scale from the intermediate canvas. This separates
          // the EXIF coordinate space from the crop/scale coordinate space,
          // preventing crop region misalignment when orientation swaps dimensions.
          const intermediate = document.createElement("canvas");
          intermediate.width = transform.width;
          intermediate.height = transform.height;
          const ictx = intermediate.getContext("2d");
          if (!ictx) {
            fail(new Error("Failed to get 2D canvas context (intermediate)"));
            return;
          }

          // Apply EXIF transform and draw the full image
          ictx.save();
          transform.apply(ictx);
          ictx.drawImage(img, 0, 0, transform.width, transform.height);
          ictx.restore();

          // Now crop/scale from the intermediate canvas to the final canvas.
          // The intermediate canvas dimensions match transform.width × transform.height,
          // which is what resolveDimensions used — so crop coordinates align.
          if (crop) {
            ctx.drawImage(
              intermediate,
              dims.sx,
              dims.sy,
              dims.sw,
              dims.sh,
              0,
              0,
              dims.width,
              dims.height,
            );
          } else {
            ctx.drawImage(intermediate, 0, 0, dims.width, dims.height);
          }

          // Release intermediate canvas memory
          intermediate.width = 0;
          intermediate.height = 0;
        } else if (crop) {
          // No EXIF rotation: crop directly from the image.
          // dims.sx/sy/sw/sh are in the image's natural coordinate space.
          ctx.drawImage(
            img,
            dims.sx,
            dims.sy,
            dims.sw,
            dims.sh,
            0,
            0,
            dims.width,
            dims.height,
          );
        } else {
          // No EXIF rotation, no crop: scale directly from the image.
          ctx.drawImage(img, 0, 0, dims.width, dims.height);
        }

        const blob = await canvasToThumbnail(canvas, outputFormat, quality);

        succeed({
          thumbnail: blob,
          size: blob.size,
          width: dims.width,
          height: dims.height,
          original_size: file.size,
          original_width: srcW,
          original_height: srcH,
        });
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };

    img.onerror = (): void => {
      fail(
        new Error(
          "Failed to load image. The file may be corrupted or in an unsupported format.",
        ),
      );
    };

    img.src = objectUrl;
  });
}

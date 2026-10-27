import { canvasToThumbnail, getAspectHeightWidth } from "./utils.js";
import type { OutputFormat, ThumbnailResult } from "./types.js";

interface ImageThumbnailOptions {
  file: File | Blob;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  outputFormat?: OutputFormat;
  quality?: number;
  signal?: AbortSignal;
}

function renderImageOnCanvas(
  image: HTMLImageElement,
  width: number,
  height: number,
  maintainAspectRatio: boolean,
): HTMLCanvasElement {
  let canvasWidth = width > 0 ? width : image.naturalWidth;
  let canvasHeight = height > 0 ? height : image.naturalHeight;

  if (maintainAspectRatio && canvasWidth > 0 && canvasHeight > 0) {
    const adjusted = getAspectHeightWidth(
      canvasWidth,
      canvasHeight,
      image.naturalWidth,
      image.naturalHeight,
    );
    canvasWidth = adjusted.width;
    canvasHeight = adjusted.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas;
}

export function generateImageThumbnail(
  options: ImageThumbnailOptions,
): Promise<ThumbnailResult> {
  const {
    file,
    width = 0,
    height = 0,
    maintainAspectRatio = true,
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

    img.onload = (): void => {
      try {
        const canvas = renderImageOnCanvas(img, width, height, maintainAspectRatio);
        const thumbWidth = canvas.width;
        const thumbHeight = canvas.height;

        canvasToThumbnail(canvas, outputFormat, quality)
          .then((blob) => {
            succeed({
              thumbnail: blob,
              size: blob.size,
              width: thumbWidth,
              height: thumbHeight,
              original_size: file.size,
              original_width: img.naturalWidth,
              original_height: img.naturalHeight,
            });
          })
          .catch(fail);
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };

    img.onerror = (): void => {
      fail(new Error("Failed to load image. The file may be corrupted or in an unsupported format."));
    };

    img.src = objectUrl;
  });
}

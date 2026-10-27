import { canvasToThumbnail, getAspectHeightWidth } from "./utils.js";
import type { OutputFormat, ThumbnailResult } from "./types.js";

interface VideoThumbnailOptions {
  file: File | Blob;
  width?: number;
  height?: number;
  timestamp?: number;
  maintainAspectRatio?: boolean;
  outputFormat?: OutputFormat;
  quality?: number;
  signal?: AbortSignal;
}

/** HTMLVideoElement cast to include requestVideoFrameCallback (not in all TS lib versions). */
type VideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
};

function renderVideoOnCanvas(
  video: HTMLVideoElement,
  width: number,
  height: number,
  maintainAspectRatio: boolean,
): HTMLCanvasElement {
  let canvasWidth = width > 0 ? width : video.videoWidth;
  let canvasHeight = height > 0 ? height : video.videoHeight;

  if (maintainAspectRatio && canvasWidth > 0 && canvasHeight > 0) {
    const adjusted = getAspectHeightWidth(
      canvasWidth,
      canvasHeight,
      video.videoWidth,
      video.videoHeight,
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
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas;
}

export function generateVideoThumbnail(
  options: VideoThumbnailOptions,
): Promise<ThumbnailResult> {
  const {
    file,
    width = 0,
    height = 0,
    timestamp = 0,
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
    const video = document.createElement("video") as VideoElementWithFrameCallback;
    video.style.display = "none";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let settled = false;

    const cleanup = (): void => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
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

    const captureFrame = (): void => {
      try {
        const canvas = renderVideoOnCanvas(video, width, height, maintainAspectRatio);
        const thumbWidth = canvas.width;
        const thumbHeight = canvas.height;

        canvasToThumbnail(canvas, outputFormat, quality)
          .then((blob) => {
            succeed({
              thumbnail: blob,
              size: blob.size,
              width: thumbWidth,
              height: thumbHeight,
              timestamp: Number(video.currentTime.toFixed(2)),
              original_size: file.size,
              total_duration: Number(video.duration?.toFixed(2) || 0),
              original_width: video.videoWidth,
              original_height: video.videoHeight,
            });
          })
          .catch(fail);
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };

    /** Use requestVideoFrameCallback when available for precise frame capture. */
    const captureWhenReady = (): void => {
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => captureFrame());
      } else {
        captureFrame();
      }
    };

    video.addEventListener("error", () => {
      const msg = video.error
        ? `Failed to load video: ${video.error.message} (code ${video.error.code})`
        : "Failed to load video. The file may be corrupted or in an unsupported format.";
      fail(new Error(msg));
    });

    video.addEventListener("loadedmetadata", () => {
      const seekTime = Math.min(Math.max(Number(timestamp) || 0, 0), video.duration || 0);

      if (seekTime > 0) {
        // Need to seek — capture after the seek completes
        video.currentTime = seekTime;
      }
      // If seekTime is 0, loadeddata handler will capture the first frame
    });

    video.addEventListener("seeked", () => {
      captureWhenReady();
    });

    video.addEventListener("loadeddata", () => {
      const seekTime = Math.min(Math.max(Number(timestamp) || 0, 0), video.duration || 0);
      // Only capture on loadeddata if we're not seeking (timestamp is 0)
      if (seekTime === 0) {
        captureWhenReady();
      }
    });

    video.src = objectUrl;
  });
}

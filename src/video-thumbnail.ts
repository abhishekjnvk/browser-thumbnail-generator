import {
  canvasToThumbnail,
  fillBackground,
  resolveDimensions,
} from "./utils.js";
import type { ThumbnailOptions, ThumbnailResult } from "./types.js";

type VideoThumbnailOptions = Pick<
  ThumbnailOptions,
  | "file"
  | "width"
  | "height"
  | "maxWidth"
  | "maxHeight"
  | "timestamp"
  | "maintainAspectRatio"
  | "crop"
  | "backgroundColor"
  | "outputFormat"
  | "quality"
  | "signal"
>;

/** HTMLVideoElement cast to include requestVideoFrameCallback (not in all TS lib versions). */
type VideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
};

/** Timeout for video seek operations (ms). Prevents hanging on stuck seeks. */
const SEEK_TIMEOUT_MS = 10_000;

export function generateVideoThumbnail(
  options: VideoThumbnailOptions,
): Promise<ThumbnailResult> {
  const {
    file,
    width = 0,
    height = 0,
    maxWidth = 0,
    maxHeight = 0,
    timestamp = 0,
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
    const video = document.createElement("video") as VideoElementWithFrameCallback;
    video.style.display = "none";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    let seekTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      if (seekTimeoutId !== undefined) {
        clearTimeout(seekTimeoutId);
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
      if (settled) return;
      try {
        const srcW = video.videoWidth;
        const srcH = video.videoHeight;

        if (srcW <= 0 || srcH <= 0) {
          fail(new Error("Video has no valid dimensions. The file may be corrupted."));
          return;
        }

        const dims = resolveDimensions({
          width,
          height,
          maxWidth,
          maxHeight,
          maintainAspectRatio,
          crop,
          sourceWidth: srcW,
          sourceHeight: srcH,
        });

        if (dims.width <= 0 || dims.height <= 0) {
          fail(new Error("Resolved thumbnail dimensions are zero."));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail(new Error("Failed to get 2D canvas context"));
          return;
        }

        if (backgroundColor) {
          fillBackground(ctx, canvas, backgroundColor);
        }

        if (crop) {
          ctx.drawImage(
            video,
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
          ctx.drawImage(video, 0, 0, dims.width, dims.height);
        }

        canvasToThumbnail(canvas, outputFormat, quality)
          .then((blob) => {
            succeed({
              thumbnail: blob,
              size: blob.size,
              width: dims.width,
              height: dims.height,
              timestamp: Number(video.currentTime.toFixed(2)),
              original_size: file.size,
              total_duration: Number(video.duration?.toFixed(2) || 0),
              original_width: srcW,
              original_height: srcH,
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
        // Need to seek — set a timeout in case seeked never fires
        seekTimeoutId = setTimeout(() => {
          // Seek timed out — try capturing the current frame anyway
          captureWhenReady();
        }, SEEK_TIMEOUT_MS);
        video.currentTime = seekTime;
      }
      // If seekTime is 0, loadeddata handler will capture the first frame
    });

    video.addEventListener("seeked", () => {
      if (seekTimeoutId !== undefined) {
        clearTimeout(seekTimeoutId);
        seekTimeoutId = undefined;
      }
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

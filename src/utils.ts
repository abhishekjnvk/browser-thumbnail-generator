import type { OutputFormat } from "./types.js";

/**
 * Calculate new dimensions that maintain the source aspect ratio
 * within the given target width/height box.
 */
export function getAspectHeightWidth(
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let width: number;
  let height: number;

  if (targetRatio > sourceRatio) {
    // Target box is wider than source — constrain by height
    height = targetHeight;
    width = Math.round(height * sourceRatio);
  } else {
    // Target box is taller than source — constrain by width
    width = targetWidth;
    height = Math.round(width / sourceRatio);
  }

  return { width, height };
}

/**
 * Convert a canvas to a Blob with the specified format and quality.
 * Resolves with null if the browser fails to encode the canvas.
 */
export function canvasToThumbnail(
  canvas: HTMLCanvasElement,
  format: OutputFormat = "image/jpeg",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          // Release canvas memory
          canvas.width = 0;
          canvas.height = 0;

          if (blob === null) {
            reject(
              new Error(
                `Failed to encode canvas to ${format}. The browser may not support this format.`,
              ),
            );
            return;
          }
          resolve(blob);
        },
        format,
        quality,
      );
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

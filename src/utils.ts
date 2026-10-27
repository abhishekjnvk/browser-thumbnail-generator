import type { OutputFormat } from "./types.js";

/**
 * Calculate new dimensions that maintain the source aspect ratio
 * within the given target width/height box.
 *
 * Returns the original dimensions unchanged if the source has
 * zero or invalid dimensions (prevents NaN propagation).
 */
export function getAspectHeightWidth(
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  // Guard against zero/NaN source dimensions (e.g. SVGs without intrinsic size)
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return {
      width: Math.max(0, Math.round(targetWidth)) || 0,
      height: Math.max(0, Math.round(targetHeight)) || 0,
    };
  }

  // Guard against zero/NaN target dimensions
  if (
    !Number.isFinite(targetWidth) ||
    !Number.isFinite(targetHeight) ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    return { width: sourceWidth, height: sourceHeight };
  }

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

export interface ResolvedDimensions {
  /** Final canvas width */
  width: number;
  /** Final canvas height */
  height: number;
  /** Source x offset for cropping (0 when not cropping) */
  sx: number;
  /** Source y offset for cropping (0 when not cropping) */
  sy: number;
  /** Source crop width (equals sourceWidth when not cropping) */
  sw: number;
  /** Source crop height (equals sourceHeight when not cropping) */
  sh: number;
}

/**
 * Resolve the final canvas dimensions and crop region from the given options.
 *
 * Priority: explicit width/height > maxWidth/maxHeight > original dimensions.
 * When `crop` is true, the source is center-cropped to fill the target box.
 * When `maintainAspectRatio` is true (and not cropping), the source is
 * letterboxed within the target box.
 */
export function resolveDimensions(options: {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  maintainAspectRatio: boolean;
  crop: boolean;
  sourceWidth: number;
  sourceHeight: number;
}): ResolvedDimensions {
  const {
    width,
    height,
    maxWidth,
    maxHeight,
    maintainAspectRatio,
    crop,
    sourceWidth,
    sourceHeight,
  } = options;

  // Guard against invalid source dimensions
  const sw = Number.isFinite(sourceWidth) && sourceWidth > 0 ? sourceWidth : 0;
  const sh = Number.isFinite(sourceHeight) && sourceHeight > 0 ? sourceHeight : 0;

  // Determine target box dimensions
  let targetW = width > 0 ? width : sw;
  let targetH = height > 0 ? height : sh;

  // Apply maxWidth/maxHeight constraints (scale down only, never up)
  if (maxWidth > 0 && targetW > maxWidth) {
    const ratio = maxWidth / targetW;
    targetW = maxWidth;
    targetH = Math.round(targetH * ratio);
  }
  if (maxHeight > 0 && targetH > maxHeight) {
    const ratio = maxHeight / targetH;
    targetH = maxHeight;
    targetW = Math.round(targetW * ratio);
  }

  // If no explicit dimensions and no source dimensions, return 0x0
  if (targetW <= 0 || targetH <= 0) {
    return { width: 0, height: 0, sx: 0, sy: 0, sw, sh };
  }

  // Crop mode: center-crop the source to fill the target box
  if (crop && sw > 0 && sh > 0) {
    const sourceRatio = sw / sh;
    const targetRatio = targetW / targetH;

    let cropW = sw;
    let cropH = sh;
    let sx = 0;
    let sy = 0;

    if (sourceRatio > targetRatio) {
      // Source is wider — crop horizontally
      cropW = Math.round(sh * targetRatio);
      sx = Math.round((sw - cropW) / 2);
    } else {
      // Source is taller — crop vertically
      cropH = Math.round(sw / targetRatio);
      sy = Math.round((sh - cropH) / 2);
    }

    return { width: targetW, height: targetH, sx, sy, sw: cropW, sh: cropH };
  }

  // Aspect-ratio mode: letterbox within target box
  if (maintainAspectRatio && sw > 0 && sh > 0) {
    const adjusted = getAspectHeightWidth(targetW, targetH, sw, sh);
    return { width: adjusted.width, height: adjusted.height, sx: 0, sy: 0, sw, sh };
  }

  // No aspect ratio maintenance — stretch to fill
  return { width: targetW, height: targetH, sx: 0, sy: 0, sw, sh };
}

/**
 * Fill the canvas background with a solid color before drawing media.
 * Useful for JPEG output where transparency is not supported.
 */
export function fillBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * Convert a canvas to a Blob with the specified format and quality.
 * Rejects if the browser fails to encode the canvas (toBlob returns null).
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

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export interface ThumbnailOptions {
  /** The image or video file to generate a thumbnail from. */
  file: File | Blob;
  /** Desired thumbnail width in pixels. Defaults to the original width. */
  width?: number;
  /** Desired thumbnail height in pixels. Defaults to the original height. */
  height?: number;
  /**
   * Maximum thumbnail width. The image will be scaled down to fit,
   * but never scaled up beyond its original size.
   */
  maxWidth?: number;
  /**
   * Maximum thumbnail height. The image will be scaled down to fit,
   * but never scaled up beyond its original size.
   */
  maxHeight?: number;
  /** Maintain the original aspect ratio when resizing. Defaults to true. */
  maintainAspectRatio?: boolean;
  /**
   * If true and both width and height are specified, the source is
   * center-cropped to fill the target dimensions (no letterboxing).
   * Defaults to false.
   */
  crop?: boolean;
  /**
   * CSS color to fill the canvas background before drawing the media.
   * Useful when the output format is JPEG (no transparency).
   * Defaults to undefined (transparent).
   */
  backgroundColor?: string;
  /** Time point in seconds to capture from a video. Defaults to 0. */
  timestamp?: number;
  /** Output image format. Defaults to "image/jpeg". */
  outputFormat?: OutputFormat;
  /** Output quality for lossy formats (0–1). Uses the browser default if omitted. */
  quality?: number;
  /** AbortSignal to cancel the operation. */
  signal?: AbortSignal;
  /**
   * Maximum allowed file size in bytes. If the file exceeds this limit,
   * the operation rejects with an error. Defaults to Infinity (no limit).
   */
  maxFileSize?: number;
}

export interface ThumbnailResult {
  /** The generated thumbnail as a Blob. */
  thumbnail: Blob;
  /** Width of the generated thumbnail in pixels. */
  width: number;
  /** Height of the generated thumbnail in pixels. */
  height: number;
  /** Size of the thumbnail Blob in bytes. */
  size: number;
  /** Size of the original file in bytes. */
  original_size: number;
  /** Original media width in pixels. */
  original_width: number;
  /** Original media height in pixels. */
  original_height: number;
  /** Total duration of the video in seconds (video only). */
  total_duration?: number;
  /** The timestamp that was captured (video only). */
  timestamp?: number;
}

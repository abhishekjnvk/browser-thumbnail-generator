export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export interface ThumbnailOptions {
  /** The image or video file to generate a thumbnail from. */
  file: File | Blob;
  /** Desired thumbnail width in pixels. Defaults to the original width. */
  width?: number;
  /** Desired thumbnail height in pixels. Defaults to the original height. */
  height?: number;
  /** Maintain the original aspect ratio when resizing. Defaults to true. */
  maintainAspectRatio?: boolean;
  /** Time point in seconds to capture from a video. Defaults to 0. */
  timestamp?: number;
  /** Output image format. Defaults to "image/jpeg". */
  outputFormat?: OutputFormat;
  /** Output quality for lossy formats (0–1). Defaults to 0.92. */
  quality?: number;
  /** AbortSignal to cancel the operation. */
  signal?: AbortSignal;
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

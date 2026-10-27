export const supportedImageMimes: string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
];

export const supportedVideoMimes: string[] = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-flv",
  "video/3gpp",
  "video/3gpp2",
  "video/x-ms-asf",
  "video/avi",
  "video/x-ms-wmv",
  "video/x-matroska",
];

export const supportedMimeTypes: string[] = [...supportedImageMimes, ...supportedVideoMimes];

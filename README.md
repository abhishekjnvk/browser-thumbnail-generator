[![npm](https://img.shields.io/npm/v/browser-thumbnail-generator.svg)](https://www.npmjs.com/package/browser-thumbnail-generator)
[![npm](https://img.shields.io/npm/l/browser-thumbnail-generator.svg)](https://github.com/abhishekjnvk/browser-thumbnail-generator)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)

# browser-thumbnail-generator

A simple and efficient library for generating thumbnails from images and videos in the browser. Zero dependencies, written in TypeScript, with full ESM/CJS support.

## Demo

[Live Preview](https://browser-thumbnail.netlify.app/)

![demo](./example/example.gif)

## Features

- Generate thumbnails from images (JPEG, PNG, GIF, BMP, WebP, AVIF, SVG, HEIC)
- Generate thumbnails from videos (MP4, WebM, OGG, MOV, AVI, MKV, and more)
- Maintain aspect ratio (letterbox) or center-crop to fill
- `maxWidth` / `maxHeight` constraints (scale down only, never upscale)
- Choose output format (JPEG, PNG, WebP) and quality
- EXIF orientation support — phone photos are automatically rotated correctly
- `createImageBitmap` fast path for faster image resizing
- `backgroundColor` option to fill transparent areas (useful for JPEG)
- `maxFileSize` guard to reject oversized files before processing
- Cancel operations with `AbortSignal`
- Full TypeScript support with type definitions
- Tree-shakeable ESM and CJS builds
- Comprehensive input validation

## Installation

```bash
npm install browser-thumbnail-generator
```

```bash
yarn add browser-thumbnail-generator
```

```bash
pnpm add browser-thumbnail-generator
```

## Usage

### Basic usage

```ts
import generateMediaThumbnail from "browser-thumbnail-generator";

const result = await generateMediaThumbnail({
  file: imageFile,       // File or Blob
  width: 200,
  height: 200,
});

const thumbnailUrl = URL.createObjectURL(result.thumbnail);
```

### All options

```ts
import generateMediaThumbnail, { type ThumbnailOptions } from "browser-thumbnail-generator";

const options: ThumbnailOptions = {
  // --- Required ---
  file: videoFile,             // File | Blob

  // --- Sizing ---
  width: 320,                  // Desired thumbnail width (optional)
  height: 240,                 // Desired thumbnail height (optional)
  maxWidth: 1920,              // Scale down to fit max width, never upscale (optional)
  maxHeight: 1080,             // Scale down to fit max height, never upscale (optional)
  maintainAspectRatio: true,   // Letterbox within target box (default: true)
  crop: false,                 // Center-crop to fill target box (default: false)

  // --- Appearance ---
  backgroundColor: "#ffffff",  // Fill canvas background before drawing (optional)
  outputFormat: "image/webp",  // "image/jpeg" | "image/png" | "image/webp" (default: "image/jpeg")
  quality: 0.8,                // 0–1 for lossy formats (optional)

  // --- Video ---
  timestamp: 5,                // Seek time in seconds (default: 0, video only)

  // --- Safety ---
  signal: abortController.signal,  // AbortSignal to cancel (optional)
  maxFileSize: 50 * 1024 * 1024,   // Reject files larger than 50MB (optional)
};

const result = await generateMediaThumbnail(options);
```

### Crop mode vs. letterbox

```ts
// Letterbox: maintain aspect ratio, empty areas are transparent (or filled with backgroundColor)
await generateMediaThumbnail({ file, width: 400, height: 400, maintainAspectRatio: true });
// Result: 400×300 thumbnail centered in a 400×400 canvas

// Crop: center-crop the source to fill the target exactly
await generateMediaThumbnail({ file, width: 400, height: 400, crop: true });
// Result: 400×400 thumbnail, edges cropped
```

### maxWidth / maxHeight

```ts
// Scale down to fit within 800×600, never upscale
await generateMediaThumbnail({ file, maxWidth: 800, maxHeight: 600 });
// A 1920×1080 video → 800×450 thumbnail
// A 400×300 image → 400×300 (unchanged, no upscaling)
```

### Cancelling a request

```ts
const controller = new AbortController();

// Cancel after 2 seconds
const timeout = setTimeout(() => controller.abort(), 2000);

try {
  const result = await generateMediaThumbnail({ file, signal: controller.signal });
  clearTimeout(timeout);
} catch (err) {
  if (err.name === "AbortError") {
    console.log("Thumbnail generation was cancelled");
  }
}
```

### Error handling

```ts
import generateMediaThumbnail from "browser-thumbnail-generator";

try {
  const result = await generateMediaThumbnail({ file });
} catch (err) {
  // TypeError: input validation errors (missing file, invalid dimensions, etc.)
  // Error: unsupported file type, failed to load media, encoding failure, etc.
  // DOMException (AbortError): operation was cancelled
  console.error(err);
}
```

## API

### `generateMediaThumbnail(options)`

Returns `Promise<ThumbnailResult>`.

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `file` | `File \| Blob` | **required** | The image or video file |
| `width` | `number` | original width | Desired thumbnail width in pixels |
| `height` | `number` | original height | Desired thumbnail height in pixels |
| `maxWidth` | `number` | no limit | Scale down to fit, never upscale |
| `maxHeight` | `number` | no limit | Scale down to fit, never upscale |
| `maintainAspectRatio` | `boolean` | `true` | Letterbox within target box |
| `crop` | `boolean` | `false` | Center-crop to fill target box |
| `backgroundColor` | `string` | transparent | CSS color to fill canvas background |
| `timestamp` | `number` | `0` | Video seek time in seconds (video only) |
| `outputFormat` | `"image/jpeg" \| "image/png" \| "image/webp"` | `"image/jpeg"` | Output image format |
| `quality` | `number` | browser default | Output quality for lossy formats (0–1) |
| `signal` | `AbortSignal` | — | Cancel the operation |
| `maxFileSize` | `number` | no limit | Reject files larger than this (bytes) |

#### Result

| Property | Type | Description |
|---|---|---|
| `thumbnail` | `Blob` | The generated thumbnail image |
| `width` | `number` | Thumbnail width in pixels |
| `height` | `number` | Thumbnail height in pixels |
| `size` | `number` | Thumbnail file size in bytes |
| `original_size` | `number` | Original file size in bytes |
| `original_width` | `number` | Original media width in pixels |
| `original_height` | `number` | Original media height in pixels |
| `total_duration` | `number?` | Video duration in seconds (video only) |
| `timestamp` | `number?` | Captured timestamp in seconds (video only) |

### `supportedMimeTypes`

Array of all supported MIME types for the `accept` attribute of file inputs.

```ts
import { supportedMimeTypes } from "browser-thumbnail-generator";

<input type="file" accept={supportedMimeTypes.join(",")} />
```

Also available: `supportedImageMimes`, `supportedVideoMimes`.

### Type exports

```ts
import type { ThumbnailOptions, ThumbnailResult, OutputFormat } from "browser-thumbnail-generator";
```

## Browser Support

Requires a browser with Canvas and `URL.createObjectURL` support.

| Feature | Minimum Browser Version |
|---|---|
| Core functionality | All modern browsers |
| `requestVideoFrameCallback` (precise video frames) | Chrome 83+, Edge 83+ |
| `createImageBitmap` fast path | Chrome 50+, Firefox 42+, Safari 15+ |
| AVIF image support | Chrome 85+, Firefox 93+, Safari 16+ |
| `AbortSignal` | Chrome 66+, Firefox 57+, Safari 12.1+ |

## Performance

- **Images**: Uses `createImageBitmap` with hardware-accelerated resize when available (no crop/EXIF/background needed). Falls back to `Image` + Canvas for complex cases.
- **Videos**: Uses `requestVideoFrameCallback` for precise frame capture in supported browsers.
- **EXIF**: Orientation is read from the first 128KB of the file — negligible overhead.

## Development

```bash
# Install dependencies
npm install

# Build (ESM + CJS + type definitions)
npm run build

# Run tests (86 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Test coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npm run typecheck

# Format
npm run format
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

[MIT](./LICENSE)

## Author

[Abhishek Kumar](https://github.com/abhishekjnvk) ([Blog](https://codecave.abhishekjnvk.in/))

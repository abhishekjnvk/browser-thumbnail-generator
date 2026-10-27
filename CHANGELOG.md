# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-10-27

### Breaking Changes

- Rewritten in TypeScript with full type definitions
- Package now ships ESM (`.js`) and CJS (`.cjs`) builds via `tsup`
- `lib/` directory replaced by `dist/` build output
- `main` field now points to `dist/index.cjs` (was `lib/index.js`)
- Minimum Node.js version: 18+

### Added

- `outputFormat` option: choose `"image/jpeg"`, `"image/png"`, or `"image/webp"`
- `quality` option: control compression quality (0–1) for lossy formats
- `signal` (AbortSignal): cancel in-flight thumbnail generation
- `maxWidth` / `maxHeight` options: scale down to fit, never upscale
- `crop` option: center-crop to fill target dimensions (no letterboxing)
- `backgroundColor` option: fill canvas background before drawing
- `maxFileSize` option: reject files exceeding a size limit
- EXIF orientation support: JPEG photos from phones are auto-rotated
- `createImageBitmap` fast path for faster image resizing
- `requestVideoFrameCallback` for precise video frame capture
- SVG dimension fallback for SVGs without intrinsic size
- New MIME types: `image/avif`, `image/heic`, `image/heif`, `video/x-matroska`
- Comprehensive input validation with descriptive error messages
- `sideEffects: false` for tree-shaking
- Proper `exports` map for ESM/CJS conditional exports

### Fixed

- Broken `.then()` rejection handlers (string passed as error handler)
- Missing `img.onerror` handler — promises hung on image load failure
- Missing `video` error event listener — promises hung on video load failure
- `canvas.toBlob` null blob not checked — now rejects with descriptive error
- `seeked` event never fired when `timestamp=0` — now uses `loadeddata`
- `setTimeout(100ms)` hack for video frame capture — replaced with `requestVideoFrameCallback`
- Object URLs leaked on error paths — centralized cleanup on all exit paths
- AbortSignal listener not removed on success (image path)
- Video seek could hang forever — added 10-second timeout fallback
- `getAspectHeightWidth` divided by zero on invalid source dimensions
- LICENSE file had wrong copyright holder ("Donald Chan" → "Abhishek Kumar")
- `package.json` license mismatch (ISC → MIT)
- Crop + EXIF orientation coordinate space bug (intermediate canvas approach)

### Development

- Build: `tsup` (ESM + CJS + DTS)
- Tests: Vitest + jsdom (86+ tests)
- Lint: ESLint 9 flat config with TypeScript rules
- Format: Prettier
- CI: GitHub Actions (typecheck, lint, format, build, test, coverage)

## [1.0.3] - 2024-01-01

### Fixed

- Fixed ecmascript import issue
- Updated example UI

## [1.0.1] - 2023-12-01

### Fixed

- Fixed thumbnail generation failure due to configuration error (issue #1)

## [1.0.0] - 2023-11-01

### Added

- Initial release
- Image thumbnail generation (JPEG, PNG, GIF, BMP, WebP, SVG)
- Video thumbnail generation (MP4, WebM, OGG, MOV, AVI, and more)
- Aspect ratio maintenance
- Video timestamp seeking
- React example app

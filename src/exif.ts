/**
 * Minimal EXIF orientation reader for JPEG files.
 * Reads the Orientation tag (0x0112) from the EXIF APP1 segment.
 *
 * Returns a value 1–8 per the EXIF spec, or 1 (normal) if not found.
 */
export async function readExifOrientation(file: Blob): Promise<number> {
  // Only JPEG files can contain EXIF data
  if (file.type !== "image/jpeg" && file.type !== "") {
    return 1;
  }

  try {
    // Read first 128KB — EXIF is always near the start of the file
    const buffer = await file.slice(0, 131072).arrayBuffer();
    const view = new DataView(buffer);

    // Check JPEG SOI marker
    if (view.getUint16(0) !== 0xffd8) return 1;

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      // Each marker segment starts with 0xFF
      if (view.getUint8(offset) !== 0xff) return 1;
      const marker = view.getUint8(offset + 1);

      // APP1 marker (EXIF)
      if (marker === 0xe1) {
        // Check for "Exif\0\0" header (6 bytes)
        if (
          view.getUint32(offset + 4) !== 0x45786966 || // "Exif"
          view.getUint8(offset + 8) !== 0x00 ||
          view.getUint8(offset + 9) !== 0x00
        ) {
          return 1;
        }

        const tiffStart = offset + 10;
        return parseTiffOrientation(view, tiffStart);
      }

      // SOS (Start of Scan) or EOI — no EXIF found
      if (marker === 0xda || marker === 0xd9) return 1;

      // Skip to next segment
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }

    return 1;
  } catch {
    return 1;
  }
}

function parseTiffOrientation(view: DataView, tiffStart: number): number {
  // Determine byte order: "II" (little-endian) or "MM" (big-endian)
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949;

  // Verify TIFF magic number (42)
  const magic = view.getUint16(tiffStart + 2, littleEndian);
  if (magic !== 42) return 1;

  // Offset to first IFD (Image File Directory)
  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifdStart = tiffStart + ifdOffset;

  // Number of entries in IFD
  const entryCount = view.getUint16(ifdStart, littleEndian);

  // Search for Orientation tag (0x0112)
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);

    if (tag === 0x0112) {
      const orientation = view.getUint16(entryOffset + 8, littleEndian);
      // Valid orientations are 1–8
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }

  return 1;
}

/**
 * Given an EXIF orientation value (1–8), return the canvas transform
 * needed to display the image correctly.
 *
 * Returns { width, height, transform } where transform is a function
 * that applies the necessary rotation/flip to a 2D context.
 */
export function getOrientationTransform(
  orientation: number,
  width: number,
  height: number,
): {
  width: number;
  height: number;
  apply: (ctx: CanvasRenderingContext2D) => void;
} {
  switch (orientation) {
    case 2:
      // Flip horizontal
      return {
        width,
        height,
        apply: (ctx) => ctx.transform(-1, 0, 0, 1, width, 0),
      };
    case 3:
      // Rotate 180°
      return {
        width,
        height,
        apply: (ctx) => ctx.transform(-1, 0, 0, -1, width, height),
      };
    case 4:
      // Flip vertical
      return {
        width,
        height,
        apply: (ctx) => ctx.transform(1, 0, 0, -1, 0, height),
      };
    case 5:
      // Transpose (flip horizontal + rotate 270° CW)
      return {
        width: height,
        height: width,
        apply: (ctx) => ctx.transform(0, 1, 1, 0, 0, 0),
      };
    case 6:
      // Rotate 90° CW
      return {
        width: height,
        height: width,
        apply: (ctx) => ctx.transform(0, 1, -1, 0, height, 0),
      };
    case 7:
      // Transverse (flip horizontal + rotate 90° CW)
      return {
        width: height,
        height: width,
        apply: (ctx) => ctx.transform(0, -1, -1, 0, height, width),
      };
    case 8:
      // Rotate 270° CW (90° CCW)
      return {
        width: height,
        height: width,
        apply: (ctx) => ctx.transform(0, -1, 1, 0, 0, width),
      };
    default:
      // Orientation 1 or unknown — no transform needed
      return {
        width,
        height,
        apply: () => {},
      };
  }
}

import { vi, beforeEach, afterEach } from "vitest";

// --- Mock URL.createObjectURL / revokeObjectURL ---
let objectUrlCounter = 0;
const objectUrlMap = new Map<string, Blob>();

URL.createObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:mock-${++objectUrlCounter}`;
  objectUrlMap.set(url, blob);
  return url;
});

URL.revokeObjectURL = vi.fn((url: string) => {
  objectUrlMap.delete(url);
});

// --- Control flag for media error simulation (images + videos) ---
let mockMediaShouldError = false;
export function setMockMediaError(shouldError: boolean): void {
  mockMediaShouldError = shouldError;
}

// --- Control flags for video behavior ---
let mockVideoSeekNeverCompletes = false;
let mockVideoHasRequestFrameCallback = false;

export function setMockVideoSeekNeverCompletes(value: boolean): void {
  mockVideoSeekNeverCompletes = value;
}

export function setMockVideoRequestFrameCallback(value: boolean): void {
  mockVideoHasRequestFrameCallback = value;
}

// --- Mock Canvas 2D Context ---
function createMockContext(): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

// --- Mock Canvas ---
function createMockCanvas(): HTMLCanvasElement {
  const ctx = createMockContext();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((contextId: string) => {
      if (contextId === "2d") return ctx;
      return null;
    }),
    toBlob: vi.fn((callback: BlobCallback, type?: string, _quality?: number) => {
      const mimeType = type || "image/png";
      const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
        type: mimeType,
      });
      setTimeout(() => callback(blob), 0);
    }),
    toDataURL: vi.fn(() => "data:image/png;base64,mock"),
  } as unknown as HTMLCanvasElement;

  return canvas;
}

// --- Mock Image ---
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  width = 800;
  height = 600;
  private _src = "";

  set src(value: string) {
    this._src = value;
    setTimeout(() => {
      if (mockMediaShouldError) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 0);
  }

  get src(): string {
    return this._src;
  }
}

// --- Mock createImageBitmap ---
interface MockImageBitmap {
  width: number;
  height: number;
  close: () => void;
}

let mockImageBitmapEnabled = true;
let mockImageBitmapWidth = 800;
let mockImageBitmapHeight = 600;

export function setMockImageBitmap(enabled: boolean, width = 800, height = 600): void {
  mockImageBitmapEnabled = enabled;
  mockImageBitmapWidth = width;
  mockImageBitmapHeight = height;
}

async function mockCreateImageBitmap(
  _blob: Blob,
  options?: ImageBitmapOptions,
): Promise<MockImageBitmap> {
  if (!mockImageBitmapEnabled) {
    throw new Error("createImageBitmap disabled in mock");
  }
  const w = options?.resizeWidth ?? mockImageBitmapWidth;
  const h = options?.resizeHeight ?? mockImageBitmapHeight;
  return {
    width: w,
    height: h,
    close: vi.fn(),
  };
}

// --- Mock Video ---
class MockVideoElement {
  videoWidth = 1920;
  videoHeight = 1080;
  duration = 10.5;
  preload = "";
  muted = false;
  playsInline = false;
  error: MediaError | null = null;
  style = { display: "" } as unknown as CSSStyleDeclaration;
  requestVideoFrameCallback: ((cb: () => void) => number) | undefined = undefined;
  private _src = "";
  private _currentTime = 0;
  private listeners = new Map<string, Set<EventListener>>();

  constructor() {
    if (mockVideoHasRequestFrameCallback) {
      this.requestVideoFrameCallback = (cb: () => void): number => {
        // Simulate async frame callback
        setTimeout(() => cb(), 0);
        return 1;
      };
    }
  }

  set src(value: string) {
    this._src = value;
    setTimeout(() => {
      if (mockMediaShouldError) {
        this.error = { message: "mock decode error", code: 4 } as MediaError;
        this._fire("error", new Event("error"));
      } else {
        this._fire("loadedmetadata", new Event("loadedmetadata"));
        this._fire("loadeddata", new Event("loadeddata"));
      }
    }, 0);
  }

  get src(): string {
    return this._src;
  }

  set currentTime(value: number) {
    this._currentTime = value;
    if (value > 0 && !mockVideoSeekNeverCompletes) {
      // Simulate async seek completion
      setTimeout(() => this._fire("seeked", new Event("seeked")), 0);
    }
  }

  get currentTime(): number {
    return this._currentTime;
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  load = vi.fn();
  removeAttribute = vi.fn();

  _fire(type: string, event: Event): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

// --- Install mocks ---
beforeEach(() => {
  objectUrlCounter = 0;
  objectUrlMap.clear();
  mockMediaShouldError = false;
  mockVideoSeekNeverCompletes = false;
  mockVideoHasRequestFrameCallback = false;
  mockImageBitmapEnabled = true;
  mockImageBitmapWidth = 800;
  mockImageBitmapHeight = 600;

  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("createImageBitmap", mockCreateImageBitmap);

  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string): HTMLElement => {
    if (tagName === "canvas") {
      return createMockCanvas() as unknown as HTMLElement;
    }
    if (tagName === "video") {
      return new MockVideoElement() as unknown as HTMLElement;
    }
    return originalCreateElement(tagName);
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

export { MockImage, MockVideoElement, createMockCanvas, objectUrlMap };

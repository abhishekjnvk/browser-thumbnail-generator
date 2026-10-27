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

// --- Control flag for video error simulation ---
let mockVideoShouldError = false;
export function setMockVideoError(shouldError: boolean): void {
  mockVideoShouldError = shouldError;
}

// --- Mock Canvas 2D Context ---
function createMockContext(): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
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
    toBlob: vi.fn(
      (callback: BlobCallback, type?: string, _quality?: number) => {
        const mimeType = type || "image/png";
        const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
          type: mimeType,
        });
        setTimeout(() => callback(blob), 0);
      },
    ),
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
      if (mockVideoShouldError) {
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
  private _src = "";
  private _currentTime = 0;
  private listeners = new Map<string, Set<EventListener>>();

  set src(value: string) {
    this._src = value;
    setTimeout(() => {
      if (mockVideoShouldError) {
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
    if (value > 0) {
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
  mockVideoShouldError = false;

  vi.stubGlobal("Image", MockImage);

  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((
    tagName: string,
  ): HTMLElement => {
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

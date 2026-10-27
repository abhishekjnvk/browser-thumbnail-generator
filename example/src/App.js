import React, { useCallback, useEffect, useRef, useState } from "react";
import generateMediaThumbnail, {
  supportedMimeTypes,
} from "browser-thumbnail-generator";
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailData, setThumbnailData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    height: 200,
    width: 200,
    timestamp: 0,
    aspectRatio: true,
    crop: false,
    outputFormat: "image/jpeg",
    quality: 0.92,
    backgroundColor: "",
  });

  const abortControllerRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError(null);
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]:
        name === "aspectRatio" || name === "crop"
          ? value === "yes"
          : name === "outputFormat" || name === "backgroundColor"
            ? value
            : value === ""
              ? 0
              : Number(value),
    }));
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const thumbnailUrlRef = useRef(null);

  const setThumbnailUrl = useCallback((blob) => {
    // Revoke the previous thumbnail URL to prevent memory leaks
    if (thumbnailUrlRef.current) {
      URL.revokeObjectURL(thumbnailUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    thumbnailUrlRef.current = url;
    setThumbnail(url);
  }, []);

  useEffect(() => {
    if (!file) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const generateThumbnail = async () => {
      setLoading(true);
      setThumbnail(null);
      setThumbnailData(null);
      setError(null);

      try {
        const res = await generateMediaThumbnail({
          file,
          height: config.height,
          width: config.width,
          timestamp: config.timestamp,
          maintainAspectRatio: config.aspectRatio,
          crop: config.crop,
          outputFormat: config.outputFormat,
          quality: config.quality,
          backgroundColor: config.backgroundColor || undefined,
          signal: controller.signal,
        });
        const { thumbnail: thumbBlob, ...rest } = res;
        setThumbnailUrl(thumbBlob);
        setThumbnailData(rest);
      } catch (err) {
        if (err.name === "AbortError") {
          // Cancelled — don't show error
        } else {
          setError(err.message || "Failed to generate thumbnail");
        }
      } finally {
        setLoading(false);
      }
    };

    generateThumbnail();

    return () => {
      controller.abort();
    };
  }, [config, file, setThumbnailUrl]);

  // Cleanup thumbnail URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
    };
  }, []);

  const convertBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "n/a";
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return i === 0
      ? `${bytes} ${sizes[i]}`
      : `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="container mt-3 text-center">
      <h3 className="mb-4">
        <code>browser-thumbnail-generator</code> Demo
      </h3>
      <a
        href="https://github.com/abhishekjnvk/browser-thumbnail-generator#readme"
        target="_blank"
        rel="noopener noreferrer"
      >
        Check out Documentation
      </a>

      <div className="row justify-content-center mt-3">
        <div className="row col-lg-8">
          <div className="col-lg-3">
            <label className="form-label">Height:</label>
            <input
              type="number"
              name="height"
              className="form-control"
              value={config.height}
              onChange={handleConfigChange}
              min={0}
            />
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Width:</label>
            <input
              type="number"
              name="width"
              className="form-control"
              value={config.width}
              onChange={handleConfigChange}
              min={0}
            />
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Aspect Ratio:</label>
            <select
              name="aspectRatio"
              className="form-control"
              value={config.aspectRatio ? "yes" : "no"}
              onChange={handleConfigChange}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Timestamp (s):</label>
            <input
              type="number"
              name="timestamp"
              className="form-control"
              value={config.timestamp}
              onChange={handleConfigChange}
              min={0}
              step={0.1}
            />
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Format:</label>
            <select
              name="outputFormat"
              className="form-control"
              value={config.outputFormat}
              onChange={handleConfigChange}
            >
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Quality:</label>
            <input
              type="number"
              name="quality"
              className="form-control"
              value={config.quality}
              onChange={handleConfigChange}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Crop:</label>
            <select
              name="crop"
              className="form-control"
              value={config.crop ? "yes" : "no"}
              onChange={handleConfigChange}
            >
              <option value="no">No (letterbox)</option>
              <option value="yes">Yes (center-crop)</option>
            </select>
          </div>
          <div className="col-lg-3 mb-2">
            <label className="form-label">Background:</label>
            <input
              type="text"
              name="backgroundColor"
              className="form-control"
              value={config.backgroundColor}
              onChange={handleConfigChange}
              placeholder="#ffffff"
            />
          </div>
          <div className="col-lg-6 mb-2">
            <label className="form-label">File:</label>
            <input
              type="file"
              accept={supportedMimeTypes.join(",")}
              className="form-control"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <button
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      {thumbnail && thumbnailData && (
        <>
          <div className="p-2 mt-3">
            <img src={thumbnail} alt="Thumbnail" className="img-fluid" />
          </div>

          <div className="mt-3">
            <h5>Thumbnail Data:</h5>
            <span className="d-block">
              <b>Original size:</b> {convertBytes(thumbnailData.original_size)}
            </span>
            <span className="d-block">
              <b>Thumbnail size:</b> {convertBytes(thumbnailData.size)}
            </span>
            <span className="d-block">
              <b>Thumbnail Height:</b> {thumbnailData.height}px
            </span>
            <span className="d-block">
              <b>Thumbnail Width:</b> {thumbnailData.width}px
            </span>
            <span className="d-block">
              <b>Original Height:</b> {thumbnailData.original_height}px
            </span>
            <span className="d-block">
              <b>Original Width:</b> {thumbnailData.original_width}px
            </span>
            {thumbnailData.total_duration !== undefined && (
              <span className="d-block">
                <b>Duration:</b> {thumbnailData.total_duration}s
              </span>
            )}
            {thumbnailData.timestamp !== undefined && (
              <span className="d-block">
                <b>Captured at:</b> {thumbnailData.timestamp}s
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;

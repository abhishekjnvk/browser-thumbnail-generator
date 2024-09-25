import React, { useEffect, useState } from "react";
import generateMediaThumbnail, { supportedMimeTypes } from "browser-thumbnail-generator";
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailData, setThumbnailData] = useState(null);
  const [config, setConfig] = useState({
    height: 200,
    width: 200,
    timestamp: 0,
    aspectRatio: true,
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === "aspectRatio" ? value === "yes" : value,
    }));
  };

  useEffect(() => {
    if (!file) return;

    const generateThumbnail = async () => {
      try {
        const param = {
          file,
          height: config.height,
          width: config.width,
          timestamp: config.timestamp,
          maintainAspectRatio: config.aspectRatio,
        };
        setThumbnail(null);
        const res = await generateMediaThumbnail(param);
        const { thumbnail, ...rest } = res;
        setThumbnail(URL.createObjectURL(thumbnail));
        setThumbnailData(rest);
      } catch (err) {
        console.error(err);
      }
    };

    generateThumbnail();
  }, [config, file]);

  const convertBytes = (bytes) => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "n/a";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return i === 0 ? `${bytes} ${sizes[i]}` : `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="container mt-3 text-center">
      <h3 className="mb-4"><code>browser-thumbnail-generator</code> Demo</h3>
        <a href="https://github.com/abhishekjnvk/browser-thumbnail-generator?tab=readme-ov-file#installation" target="_blank" rel="noopener noreferrer">
          Check out Documentation
        </a>
      <div className="row justify-content-center">
        <div className="row col-lg-6">
          <div className="col-lg-4">
            <label className="form-label">Height:</label>
            <input type="number" name="height" className="form-control" value={config.height} onChange={handleConfigChange} min={0} />
          </div>
          <div className="col-lg-4 mb-2">
            <label className="form-label">Width:</label>
            <input type="number" name="width" className="form-control" value={config.width} onChange={handleConfigChange} min={0} />
          </div>
          <div className="col-lg-4 mb-2">
            <label className="form-label">Aspect Ratio:</label>
            <select name="aspectRatio" className="form-control" value={config.aspectRatio ? "yes" : "no"} onChange={handleConfigChange}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-lg-4 mb-2">
            <label className="form-label">Timestamp:</label>
            <input type="number" name="timestamp" className="form-control" value={config.timestamp} onChange={handleConfigChange} min={0} />
          </div>
          <div className="col-lg-8 mb-2">
            <label className="form-label">File:</label>
            <input type="file" accept={supportedMimeTypes.join(",")} className="form-control" onChange={handleFileChange} />
          </div>
        </div>
      </div>
      {thumbnail && thumbnailData && (
        <>
        <div className="p-2 mt-3">
          <img src={thumbnail} alt="Thumbnail" className="img-fluid" />
        </div>
      
        <div className="mt-3">
          <h5>Thumbnail Data:</h5>
          <span className="d-block"><b>Original size:</b> {convertBytes(thumbnailData.original_size)}</span>
          <span className="d-block"><b>Thumbnail size:</b> {convertBytes(thumbnailData.size)}</span>
          <span className="d-block"><b>Thumbnail Height:</b> {thumbnailData.height}px</span>
          <span className="d-block"><b>Thumbnail Width:</b> {thumbnailData.width}px</span>
          <span className="d-block"><b>Original Height:</b> {thumbnailData.original_height}px</span>
          <span className="d-block"><b>Original Width:</b> {thumbnailData.original_width}px</span>
        </div>
        </>
      )}
    </div>
  );
};

export default App;

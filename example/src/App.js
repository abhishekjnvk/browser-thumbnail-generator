import React, { useEffect, useState } from "react";
import generateMediaThumbnail, {
  supportedMimeTypes,
} from "browser-thumbnail-generator";

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

  const handleHeightWidthChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAspectRatio = (e) => {
    let value = e.target.value;
    if (value === "yes") {
      value = true;
    } else {
      value = false;
    }

    setConfig((prev) => ({
      ...prev,
      aspectRatio: value,
    }));
  };

  useEffect(() => {
    const generateThumbnail = () => {
      const param = {
        file: file,
        height: config.height,
        width: config.width,
        timestamp: config.timestamp,
        maintainAspectRatio: Boolean(config.aspectRatio),
      };
      setThumbnail(null);
      generateMediaThumbnail(param)
        .then((res) => {
          const { thumbnail, ...rest } = res;
          setThumbnail(URL.createObjectURL(res.thumbnail));
          setThumbnailData(rest);
        })
        .catch((err) => {
          console.error(err);
        });
    };
    if (file) generateThumbnail();
  }, [config, file]);

  return (
    <div className="mt-2 text-center">
    <h3 className="my-3">
      select a video or image to generate thumbnail
    </h3>
      <span className="ms-1">
        Thumbnail Height:{" "}
        <input
          type="number"
          name="height"
          className="input"
          value={config?.height}
          onChange={handleHeightWidthChange}
          min={0}
        />
      </span>
      <span className="ms-1">
        Thumbnail width:{" "}
        <input
          type="number"
          name="width"
          className="input"
          value={config?.width}
          onChange={handleHeightWidthChange}
          min={0}
        />
      </span>
      <span className="ms-1">
        Maintain Aspect Ratio:{" "}
        <select
          name="aspectRatio"
          className="input"
          onChange={handleAspectRatio}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </span>
      <br />
      <br />
      <span className="ms-1">
        Timestamp of thumbnail (in video):{" "}
        <input
          type="number"
          name="timestamp"
          className="input"
          value={config?.timestamp}
          onChange={handleHeightWidthChange}
          min={0}
        />
      </span>
      <span className="ms-1">
        Video or Image File:{" "}
        <input
          type="file"
          accept={supportedMimeTypes?.join(",")}
          onChange={handleFileChange}
          aria-label="upload"
        />
      </span>
      <div className="mt-2">
        {thumbnail && <div className="border p-2"> <img src={thumbnail} alt="Video Thumbnail" /></div>}
        {thumbnailData ? (
          <div className="mt-2">
            Thumbnail Data: <br />
            <b>Thumbnail size</b>: {thumbnailData.size}<br />
            <b>Thumbnail height</b>: {thumbnailData.height}<br />
            <b>Thumbnail width</b>: {thumbnailData.width}<br />
            <b>Original file size</b>: {thumbnailData.original_size}<br />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default App;

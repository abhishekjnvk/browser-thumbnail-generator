import { canvasToThumbnail, getAspectHeightWidth } from "./utils.js";

const renderVideoOnCanvas = (
  videoElement,
  width,
  height,
  maintainAspectRatio
) => {
  const { videoWidth, videoHeight } = videoElement;
  let canvasWidth = Number(width) || videoWidth;
  let canvasHeight = Number(height) || videoHeight;

  if (maintainAspectRatio) {
    let { width, height } = getAspectHeightWidth(
      canvasWidth,
      canvasHeight,
      `${videoWidth}:${videoHeight}`
    );

    canvasWidth = width;
    canvasHeight = height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas;
};

const generateVideoThumbnail = ({
  file: videoFile,
  height = 0,
  width = 0,
  timestamp = 0,
  maintainAspectRatio = true,
}) => {
  return new Promise((resolve, reject) => {
    try {
      let videoTimestamp = Number(timestamp) || 0;
      const videoPlayer = document.createElement("video");
      videoPlayer.style.display = "none";
      videoPlayer.preload = "metadata"; // Preload metadata for accurate duration
      videoPlayer.src = URL.createObjectURL(videoFile);

      videoPlayer.addEventListener("loadedmetadata", () => {
        videoTimestamp = Math.min(videoTimestamp, videoPlayer.duration);
        videoPlayer.currentTime = videoTimestamp;
      });

      videoPlayer.addEventListener("seeked", () => {
        setTimeout(() => {
          // Add a delay to ensure the frame is fully rendered
          const canvas = renderVideoOnCanvas(
            videoPlayer,
            width,
            height,
            maintainAspectRatio
          );

          URL.revokeObjectURL(videoPlayer.src);
          videoPlayer.remove();
          const { height: thumbnailHeight, width: thumbnailWidth } = canvas;
          canvasToThumbnail(canvas).then((blob) => {
            let response = {
              thumbnail: blob,
              size: blob?.size,
              width: thumbnailWidth,
              height: thumbnailHeight,
              timestamp: videoTimestamp,
              original_size: videoFile?.size,

              total_duration: Number(videoPlayer.duration?.toFixed(2) || 0),
              original_width: videoPlayer.videoWidth,
              original_height: videoPlayer.videoHeight,
            };

            resolve(response);
          }, "image/jpeg");
        }, 100);
      });
    } catch (e) {
      reject(e);
    }
  });
};

export default generateVideoThumbnail;

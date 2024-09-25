import { canvasToThumbnail, getAspectHeightWidth } from "./utils.js";

const renderImageOnCanvas=(imageElement, width, height, maintainAspectRatio)=>{
  let canvasWidth = Number(width) || imageElement.width;
  let canvasHeight = Number(height) || imageElement.height;

  if (maintainAspectRatio) {
    let { width, height } = getAspectHeightWidth(
      canvasWidth,
      canvasHeight,
      `${imageElement.width}:${imageElement.height}`
    );
    canvasWidth = width;
    canvasHeight = height;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  return canvas;
}


const generateImageThumbnail = ({
  file: imageFile,
  height = 0,
  width = 0,
  maintainAspectRatio = true,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = function () {
        const canvas = renderImageOnCanvas(img, width, height, maintainAspectRatio)
        const { height: thumbnailHeight, width: thumbnailWidth } = canvas;
        URL.revokeObjectURL(img.src);
        img.remove();

        canvasToThumbnail(canvas).then((blob) => {
          let response = {
            thumbnail: blob,
            size: blob.size,
            width: thumbnailWidth,
            height: thumbnailHeight,
            original_size: imageFile.size,
            original_width: img.width,
            original_height: img.height,
          };
          resolve(response);
        }, "image/jpeg");
      };
    } catch (e) {
      reject(e);
    }
  });
};


export default generateImageThumbnail
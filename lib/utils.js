export const getAspectHeightWidth = (width, height, aspectRatio) => {
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);
  const targetAspectRatio = Number((aspectWidth / aspectHeight).toFixed(2));
  const currentAspectRatio = Number((width / height).toFixed(2));

  // Adjust the width or height to maintain the aspect ratio
  if (currentAspectRatio > targetAspectRatio) {
    // Current width is too wide, adjust width
    width = Number((height * targetAspectRatio).toFixed(2));
  } else {
    // Current height is too tall, adjust height
    height = Number((width / targetAspectRatio).toFixed(2));
  }

  return { height, width };
};


export const canvasToThumbnail = (canvas) => {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(blob);
        }, "image/jpeg");
      } catch (e) {
        reject(e);
      }
    });
  };
  
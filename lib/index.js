import { supportedImageMimes, supportedVideoMimes } from "./const";
import generateImageThumbnail from "./image-thumbnail";
import generateVideoThumbnail from "./video-thumbnail";

const imageMimeTypesMap = new Map(
  supportedImageMimes.map((type) => [type, true])
);

const videoMimeTypesMap = new Map(
  supportedVideoMimes.map((type) => [type, true])
);

const generateMediaThumbnail = async (params) => {
  const { file } = params;
  const fileType = file?.type;

  if (videoMimeTypesMap.has(fileType)) {
    return generateVideoThumbnail(params);
  }

  if (imageMimeTypesMap.has(fileType)) {
    return generateImageThumbnail(params);
  }

  throw new Error("Invalid file type");
};

export const supportedMimeTypes = [
  ...supportedImageMimes,
  ...supportedVideoMimes,
];

export default generateMediaThumbnail;
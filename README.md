
[![npm](https://img.shields.io/npm/v/browser-thumbnail-generator.svg)](https://www.npmjs.com/package/browser-thumbnail-generator)
[![npm](https://img.shields.io/npm/l/browser-thumbnail-generator.svg)](https://github.com/abhishekjnvk/browser-thumbnail-generator)

# browser-thumbnail-generator

browser-thumbnail-generator is a simple and efficient library for generating thumbnails from images and videos quickly. It is designed to be easily integrated into your projects, providing fast and reliable thumbnail generation.

## Features

- Generate thumbnails from images
- Generate thumbnails from videos
- Easy to use and integrate

## Installation

You can install browser-thumbnail-generator via:

- npm

```bash
npm install browser-thumbnail-generator
```

- yarn

```bash
yarn add browser-thumbnail-generator
```

## Usages

`generateMediaThumbnail()`

```js
import generateMediaThumbnail from 'browser-thumbnail-generator';

let params = {
  file: imageFile, // image/video file
  width: 200,
  height: 200,
  maintainAspectRatio: true
}

generateMediaThumbnail({
  file: imageFile,
  width: 200,
  height: 200,
  maintainAspectRatio: true
}).then(response => {
  const thumbnailUrl=URL.createObjectURL(response.thumbnail)
  
  console.log('Image thumbnail generated successfully!', thumbnailUrl);
});
```

Input Parameters:

```ts
{
  file: File;
  height?: number;
  width?: number;
  maintainAspectRatio?: boolean;
  timestamp?: number; //only in video
}
```

- file (File): The image file from which to generate the thumbnail. This is required.
- height (number, optional): The desired height of the thumbnail. If not provided, the original height of the image is used.
- width (number, optional): The desired width of the thumbnail. If not provided, the original width of the image is used.
- maintainAspectRatio (boolean, optional): If true, maintains the aspect ratio of the original image when resizing. Default is true.

- timestamp (number, optional, `for video only`): The time point (in seconds) in the video from which to capture the thumbnail. If not provided, the default is 0 (the start of the video).

Response Type:

```ts
Promise<{
  thumbnail: Blob;
  width: number;
  height: number;
  size: number;
  original_size: number;
  timestamp: number; // only in video
}>
```

- thumbnail (Blob): The generated thumbnail image as a Blob object.
- width (number): The width of the generated thumbnail.
- height (number): The height of the generated thumbnail.
- size (number): The size (in bytes) of the generated thumbnail.
- original_size (number): The size (in bytes) of the original image file.

---

supported mime types:

supported mime types for thumbnail generation can be imported using

```js
import { supportedMimeTypes } from "browser-thumbnail-generator";
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

[abhishekjnvk](https://github.com/abhishekjnvk)

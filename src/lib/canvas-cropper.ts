'use client';

/**
 * Crop a bounding box region [ymin, xmin, ymax, xmax] (0–1000 scale)
 * from a rendered HTMLCanvasElement with 10px padding.
 */
export async function cropCanvasBox2d(
  canvas: HTMLCanvasElement,
  box2d: [number, number, number, number],
  padding: number = 10
): Promise<Blob> {
  const [ymin, xmin, ymax, xmax] = box2d;

  // Convert 0-1000 normalized coordinates to actual canvas pixels
  const rawYmin = (ymin / 1000) * canvas.height;
  const rawXmin = (xmin / 1000) * canvas.width;
  const rawYmax = (ymax / 1000) * canvas.height;
  const rawXmax = (xmax / 1000) * canvas.width;

  // Apply padding while keeping within canvas boundaries
  const actualXmin = Math.max(0, Math.floor(rawXmin - padding));
  const actualYmin = Math.max(0, Math.floor(rawYmin - padding));
  const actualXmax = Math.min(canvas.width, Math.ceil(rawXmax + padding));
  const actualYmax = Math.min(canvas.height, Math.ceil(rawYmax + padding));

  const cropWidth = Math.max(1, actualXmax - actualXmin);
  const cropHeight = Math.max(1, actualYmax - actualYmin);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  const ctx = cropCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo context cho ảnh minh họa đã cắt');
  }

  // Draw slice from source canvas
  ctx.drawImage(
    canvas,
    actualXmin,
    actualYmin,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return new Promise((resolve, reject) => {
    cropCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Chuyển đổi ảnh sang PNG thất bại'));
      }
    }, 'image/png');
  });
}

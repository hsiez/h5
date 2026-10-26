export const MAX_PHOTO_BYTES = 8_000_000;
export const PHOTO_WIDTH = 2160;
export const PHOTO_HEIGHT = 2400;
const SUBJECT_FRACTION = 0.82;

export async function preparePhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40_000_000) throw new Error('Image dimensions are too large.');
    // Analyze transparency on a small canvas, preserving full resolution for the final draw.
    const sampleScale = Math.min(1, 512 / Math.max(image.width, image.height));
    const sample = document.createElement('canvas');
    sample.width = Math.max(1, Math.round(image.width * sampleScale));
    sample.height = Math.max(1, Math.round(image.height * sampleScale));
    const probe = sample.getContext('2d', { willReadFrequently: true });
    if (!probe) throw new Error('Could not prepare this image.');
    probe.drawImage(image, 0, 0, sample.width, sample.height);
    const data = probe.getImageData(0, 0, sample.width, sample.height).data;
    let left = sample.width, top = sample.height, right = -1, bottom = -1;
    for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
      if (data[(y * sample.width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error('This image has no visible item.');
    // Allow a source-pixel margin so translucent anti-aliased edges are not clipped.
    const margin = 2;
    const sx = Math.max(0, (left - margin) * image.width / sample.width);
    const sy = Math.max(0, (top - margin) * image.height / sample.height);
    const ex = Math.min(image.width, (right + 1 + margin) * image.width / sample.width);
    const ey = Math.min(image.height, (bottom + 1 + margin) * image.height / sample.height);
    const sw = ex - sx, sh = ey - sy;
    const scale = Math.min(PHOTO_WIDTH * SUBJECT_FRACTION / sw, PHOTO_HEIGHT * SUBJECT_FRACTION / sh);
    if (scale > 1.05) throw new Error('The saved image lacks enough detail for this framing. Upload the original photo instead.');
    const dw = sw * scale, dh = sh * scale;
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_WIDTH; canvas.height = PHOTO_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, sx, sy, sw, sh, (PHOTO_WIDTH - dw) / 2, (PHOTO_HEIGHT - dh) / 2, dw, dh);
    for (const quality of [0.95, 0.9, 0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      }
    }
    throw new Error('This image could not be reduced enough to upload.');
  } finally { image.close(); }
}

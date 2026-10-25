export const MAX_PHOTO_BYTES = 8_000_000;

export async function preparePhoto(file: File): Promise<File> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose an image under 8 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');

  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40_000_000) throw new Error('Image dimensions are too large.');
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      }
    }
    throw new Error('This image could not be reduced enough to upload.');
  } finally {
    image.close();
  }
}

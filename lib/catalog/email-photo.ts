import sharp from 'sharp';

export async function emailPhotoJpeg(input: Buffer) {
  const source = sharp(input, { limitInputPixels: 24_000_000 });
  const metadata = await source.metadata();
  const photo = metadata.hasAlpha
    ? await sharp(input, { limitInputPixels: 24_000_000 }).trim({ background: '#00000000', threshold: 10 }).toBuffer()
    : input;
  return sharp(photo, { limitInputPixels: 24_000_000 })
    .resize({ width: 696, height: 876, fit: 'inside', withoutEnlargement: true })
    .extend({ top: 12, right: 12, bottom: 12, left: 12, background: '#f4f4f1' })
    .flatten({ background: '#f4f4f1' })
    .jpeg({ quality: 92 })
    .toBuffer();
}

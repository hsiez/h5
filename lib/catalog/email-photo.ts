import sharp from 'sharp';

export async function emailPhotoJpeg(input: Buffer) {
  return sharp(input, { limitInputPixels: 24_000_000 })
    .resize({ width: 720, height: 900, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#f4f4f1' })
    .jpeg({ quality: 92 })
    .toBuffer();
}

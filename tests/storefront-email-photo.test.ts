import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { emailPhotoJpeg } from '../lib/catalog/email-photo';

describe('email photo', () => {
  it('renders a transparent item photo on an opaque light background', async () => {
    const input = await readFile(new URL('../db/assets/catalog/hat.png', import.meta.url));
    const output = await emailPhotoJpeg(input);
    const metadata = await sharp(output).metadata();
    const pixel = await sharp(output).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();

    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBeLessThanOrEqual(720);
    expect(metadata.height).toBeLessThanOrEqual(900);
    expect(metadata.hasAlpha).toBe(false);
    for (const [index, channel] of pixel.entries()) {
      expect(Math.abs(channel - [244, 244, 241][index])).toBeLessThanOrEqual(2);
    }
  });
});

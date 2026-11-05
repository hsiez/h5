export type PhotoBounds = { left: number; top: number; width: number; height: number };

export function alphaBounds(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number): PhotoBounds | null {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) return null;
  return { left: left / width * 100, top: top / height * 100,
    width: (right + 1 - left) / width * 100, height: (bottom + 1 - top) / height * 100 };
}

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const SAMPLE_RATES_V1 = [44100, 48000, 32000, 0];

export function mp3Duration(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  let offset = 0;

  // Skip ID3v2 tag if present
  if (view.byteLength > 10 && view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
    const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);
    offset = 10 + size;
  }

  // Find first sync word (0xFFE0+)
  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) === 0xFF && (view.getUint8(offset + 1) & 0xE0) === 0xE0) break;
    offset++;
  }

  if (offset >= view.byteLength - 4) return 0;

  const header = view.getUint32(offset);
  const bitrateIdx = (header >> 12) & 0x0F;
  const sampleRateIdx = (header >> 10) & 0x03;
  const bitrate = BITRATES_V1_L3[bitrateIdx];
  const sampleRate = SAMPLE_RATES_V1[sampleRateIdx];

  if (bitrate === 0 || sampleRate === 0) return 0;

  const audioBytes = buffer.byteLength - offset;
  return audioBytes / (bitrate * 125);
}

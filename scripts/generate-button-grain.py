"""Generate a seamless, high-frequency grayscale grain tile for the storefront button."""

from pathlib import Path
import random
import struct
import zlib


SIZE = 512
OUTPUT = Path(__file__).resolve().parents[1] / "public/textures/button-grain.png"


def chunk(kind: bytes, data: bytes) -> bytes:
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def main() -> None:
    random_source = random.Random(0xB0770A)
    field = [random_source.random() for _ in range(SIZE * SIZE)]
    rows = bytearray()

    for y in range(SIZE):
        rows.append(0)  # PNG's unfiltered scanline marker.
        previous_row = ((y - 1) % SIZE) * SIZE
        current_row = y * SIZE
        next_row = ((y + 1) % SIZE) * SIZE
        for x in range(SIZE):
            left = (x - 1) % SIZE
            right = (x + 1) % SIZE
            index = current_row + x
            neighbors = (
                field[previous_row + left]
                + field[previous_row + x]
                + field[previous_row + right]
                + field[current_row + left]
                + field[index]
                + field[current_row + right]
                + field[next_row + left]
                + field[next_row + x]
                + field[next_row + right]
            ) / 9
            value = max(0, min(255, round(128 + (field[index] - neighbors) * 190)))
            rows.append(value)

    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 0, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(rows), level=9))
        + chunk(b"IEND", b"")
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(png)


if __name__ == "__main__":
    main()

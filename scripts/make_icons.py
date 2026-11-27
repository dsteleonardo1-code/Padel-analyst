#!/usr/bin/env python3
"""Draw the Fondocampo app icons without third-party libraries."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "icons"


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    rows = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def draw(size: int) -> bytearray:
    pixels = bytearray(size * size * 4)
    radius = int(size * 0.2)

    def put(x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if 0 <= x < size and 0 <= y < size:
            index = (y * size + x) * 4
            pixels[index : index + 4] = bytes(color)

    def outside(x: int, y: int) -> bool:
        dx = dy = 0
        if x < radius and y < radius:
            dx, dy = radius - 1 - x, radius - 1 - y
        elif x >= size - radius and y < radius:
            dx, dy = x - (size - radius), radius - 1 - y
        elif x < radius and y >= size - radius:
            dx, dy = radius - 1 - x, y - (size - radius)
        elif x >= size - radius and y >= size - radius:
            dx, dy = x - (size - radius), y - (size - radius)
        return dx * dx + dy * dy > radius * radius

    def hline(x0: int, x1: int, y: int, color: tuple[int, int, int, int], thick: int) -> None:
        for offset in range(thick):
            for x in range(x0, x1):
                put(x, y + offset, color)

    def vline(x: int, y0: int, y1: int, color: tuple[int, int, int, int], thick: int) -> None:
        for offset in range(thick):
            for y in range(y0, y1):
                put(x + offset, y, color)

    def circle(cx: int, cy: int, r: int, color: tuple[int, int, int, int]) -> None:
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    put(x, y, color)

    sand = (244, 239, 228, 255)
    lime = (214, 255, 63, 255)
    bg = (16, 36, 28, 255)
    for y in range(size):
        for x in range(size):
            put(x, y, (0, 0, 0, 0) if outside(x, y) else bg)

    left, top = int(size * 0.22), int(size * 0.18)
    right, bottom = int(size * 0.78), int(size * 0.84)
    thick = max(2, size // 48)
    hline(left, right, top, sand, thick)
    hline(left, right, bottom, sand, thick)
    vline(left, top, bottom, sand, thick)
    vline(right - thick, top, bottom, sand, thick)
    mid_y = (top + bottom) // 2
    hline(left, right, mid_y, lime, thick)
    service = int((bottom - top) * 0.18)
    hline(left, right, top + service, lime, max(1, thick - 1))
    hline(left, right, bottom - service, lime, max(1, thick - 1))
    vline((left + right) // 2, top, top + service, lime, max(1, thick - 1))
    vline((left + right) // 2, bottom - service, bottom, lime, max(1, thick - 1))
    circle(int(size * 0.72), int(size * 0.3), max(4, size // 14), lime)
    return pixels


def main() -> None:
    for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
        write_png(ROOT / name, size, size, draw(size))


if __name__ == "__main__":
    main()

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def build_icon(size: int) -> Image.Image:
    bg = '#0F172A'
    cover = '#1E293B'
    border = '#334155'
    accent = '#38BDF8'
    accent2 = '#0EA5E9'
    text_main = '#E2E8F0'
    text_muted = '#94A3B8'

    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    pad = round(size * 0.06)
    rounded_rect(draw, (0, 0, size - 1, size - 1), radius=round(size * 0.25), fill=bg)

    book_x = round(size * 0.22)
    book_y = round(size * 0.16)
    book_w = round(size * 0.56)
    book_h = round(size * 0.68)
    rounded_rect(
        draw,
        (book_x, book_y, book_x + book_w, book_y + book_h),
        radius=round(size * 0.10),
        fill=cover,
        outline=border,
        width=max(1, round(size * 0.03)),
    )

    spine_w = round(size * 0.09)
    rounded_rect(
        draw,
        (book_x + round(size * 0.05), book_y + round(size * 0.06), book_x + round(size * 0.05) + spine_w, book_y + book_h - round(size * 0.06)),
        radius=round(size * 0.04),
        fill=accent,
    )

    line_left = book_x + round(size * 0.26)
    line_right = book_x + book_w - round(size * 0.10)
    lines = [
        (round(size * 0.34), text_main),
        (round(size * 0.46), text_muted),
        (round(size * 0.58), text_muted),
        (round(size * 0.70), accent2),
    ]
    for idx, (y_ratio_px, color) in enumerate(lines):
        y = y_ratio_px
        thickness = max(2, round(size * 0.045))
        right = line_right if idx < 3 else line_left + round((line_right - line_left) * 0.56)
        draw.line((line_left, y, right, y), fill=color, width=thickness)

    return image


def main():
    png_path = ROOT / 'icon-512.png'
    ico_path = ROOT / 'icon.ico'
    icns_path = ROOT / 'icon.icns'
    image = build_icon(512)
    image.save(png_path, format='PNG')
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    image.save(ico_path, format='ICO', sizes=sizes)
    image.save(icns_path, format='ICNS')
    print(f'Wrote {png_path}')
    print(f'Wrote {ico_path}')
    print(f'Wrote {icns_path}')


if __name__ == '__main__':
    main()

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import shutil
import os

os.makedirs('assets/backgrounds', exist_ok=True)

# 1. Copy mountains demo background
if os.path.exists('assets/demo/demo-bg.jpg'):
    shutil.copy('assets/demo/demo-bg.jpg', 'assets/backgrounds/mountains-bg.jpg')

# 2. Generate Deep Space Nebula (2560x1440)
def generate_nebula(filename="assets/backgrounds/nebula-bg.jpg"):
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (4, 4, 10))
    draw = ImageDraw.Draw(img)

    # Ambient nebula clouds using multiple colored ellipses
    nebula = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    neb_draw = ImageDraw.Draw(nebula)
    
    centers = [
        (int(w * 0.4), int(h * 0.45), 650, (140, 20, 180, 28)), # Violet
        (int(w * 0.6), int(h * 0.55), 700, (20, 90, 200, 32)),  # Deep Blue
        (int(w * 0.5), int(h * 0.5), 500, (240, 50, 140, 24)),  # Magenta
        (int(w * 0.35), int(h * 0.6), 550, (0, 180, 220, 25)),  # Cyan
    ]
    for cx, cy, rad, col in centers:
        for r in range(rad, 50, -30):
            a = int(col[3] * (1.0 - r / rad))
            neb_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(col[0], col[1], col[2], a))

    nebula = nebula.filter(ImageFilter.GaussianBlur(radius=40))
    img.paste(Image.alpha_composite(img.convert("RGBA"), nebula).convert("RGB"))

    # Rich starfield
    np.random.seed(999)
    num_stars = 600
    star_x = np.random.randint(0, w, num_stars)
    star_y = np.random.randint(0, h, num_stars)
    star_b = np.random.randint(140, 255, num_stars)
    star_draw = ImageDraw.Draw(img)
    for x, y, b in zip(star_x, star_y, star_b):
        star_draw.point((x, y), fill=(b, b, min(255, b + 30)))
        if b > 235:
            star_draw.ellipse([x-1, y-1, x+1, y+1], fill=(b, b, 255))
    
    img.save(filename, "JPEG", quality=95)
    print(f"Generated: {filename}")

# 3. Generate Cyberpunk City Skyline (2560x1440)
def generate_cyberpunk(filename="assets/backgrounds/cyberpunk-bg.jpg"):
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (8, 6, 16))
    draw = ImageDraw.Draw(img)

    # Sky gradient: dark magenta to midnight blue
    for y in range(h):
        ratio = y / h
        r = int(18 + ratio * 20)
        g = int(6 + ratio * 15)
        b = int(35 + ratio * 45)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Multiple city skyline building layers
    np.random.seed(777)
    for layer, (base_y, min_h, max_h, fill_color, neon_color) in enumerate([
        (int(h * 0.95), 250, 650, (14, 12, 28), (0, 240, 255)),
        (int(h * 0.98), 200, 500, (10, 8, 20), (255, 0, 128)),
        (h, 150, 380, (6, 5, 12), (255, 220, 0))
    ]):
        x = 0
        while x < w:
            b_width = np.random.randint(60, 160)
            b_height = np.random.randint(min_h, max_h)
            b_top = base_y - b_height
            draw.rectangle([x, b_top, min(w, x + b_width), h], fill=fill_color)

            # Glowing window matrix
            win_cols = np.random.randint(3, 7)
            win_rows = np.random.randint(8, 20)
            for r in range(win_rows):
                for c in range(win_cols):
                    if np.random.rand() > 0.65:
                        wx = x + 10 + c * 16
                        wy = b_top + 15 + r * 18
                        if wx < x + b_width - 8 and wy < base_y - 20:
                            draw.rectangle([wx, wy, wx + 6, wy + 8], fill=neon_color)
            x += b_width + np.random.randint(5, 20)

    # Neon ground fog / reflection
    fog = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fog_draw = ImageDraw.Draw(fog)
    for y in range(int(h * 0.8), h):
        progress = (y - int(h * 0.8)) / (h * 0.2)
        alpha = int(progress * 50)
        fog_draw.line([(0, y), (w, y)], fill=(0, 220, 255, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), fog).convert("RGB"))

    img.save(filename, "JPEG", quality=95)
    print(f"Generated: {filename}")

# 4. Generate Sunset Horizon (2560x1440)
def generate_sunset(filename="assets/backgrounds/sunset-bg.jpg"):
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (15, 8, 25))
    draw = ImageDraw.Draw(img)

    # Sunset gradient: purple -> burnt orange -> gold -> dark sea
    for y in range(int(h * 0.72)):
        ratio = y / (h * 0.72)
        if ratio < 0.4:
            t = ratio / 0.4
            r = int(25 + t * 90)
            g = int(10 + t * 40)
            b = int(45 - t * 15)
        elif ratio < 0.8:
            t = (ratio - 0.4) / 0.4
            r = int(115 + t * 125)
            g = int(50 + t * 75)
            b = int(30 - t * 20)
        else:
            t = (ratio - 0.8) / 0.2
            r = int(240 + t * 15)
            g = int(125 + t * 80)
            b = int(10 + t * 15)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Big glowing sunset sun
    sun_x, sun_y = w // 2, int(h * 0.65)
    sun_rad = 180
    for r in range(sun_rad + 80, 0, -10):
        alpha = int(255 * (1.0 - r / (sun_rad + 80)))
        draw.ellipse([sun_x - r, sun_y - r, sun_x + r, sun_y + r], fill=(255, min(255, 140 + r), 40))

    # Dark ocean bottom with orange reflection
    horizon_y = int(h * 0.72)
    for y in range(horizon_y, h):
        ratio = (y - horizon_y) / (h - horizon_y)
        r = int(35 * (1 - ratio) + 8 * ratio)
        g = int(18 * (1 - ratio) + 6 * ratio)
        b = int(40 * (1 - ratio) + 16 * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    img.save(filename, "JPEG", quality=95)
    print(f"Generated: {filename}")

if __name__ == "__main__":
    generate_nebula()
    generate_cyberpunk()
    generate_sunset()

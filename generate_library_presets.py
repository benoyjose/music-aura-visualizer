import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import shutil
import os

os.makedirs('assets/backgrounds', exist_ok=True)
os.makedirs('assets/logos', exist_ok=True)

# 1. Copy demo logo to presets
if os.path.exists('assets/demo/demo-logo.png'):
    shutil.copy('assets/demo/demo-logo.png', 'assets/logos/trap-emblem.png')

# 2. Generate Fire / Inferno Aura Background (2560x1440)
def generate_fire(filename="assets/backgrounds/fire-bg.jpg"):
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (10, 4, 4))
    draw = ImageDraw.Draw(img)

    for y in range(h):
        ratio = y / h
        r = int(12 + ratio * 28)
        g = int(4 + ratio * 8)
        b = int(4 + ratio * 8)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    fire_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(fire_layer)
    cx, cy = w // 2, h // 2
    for r in range(700, 50, -35):
        alpha = int(40 * (1.0 - r / 700.0))
        f_draw.ellipse([cx - r, cy - int(r*0.8), cx + r, cy + int(r*0.8)], fill=(255, int(80 + (r/700)*120), 10, alpha))
    fire_layer = fire_layer.filter(ImageFilter.GaussianBlur(radius=50))
    img.paste(Image.alpha_composite(img.convert("RGBA"), fire_layer).convert("RGB"))

    # Sparks / fire embers
    np.random.seed(555)
    num_sparks = 400
    sparks_x = np.random.randint(0, w, num_sparks)
    sparks_y = np.random.randint(0, h, num_sparks)
    for x, y in zip(sparks_x, sparks_y):
        col = (255, np.random.randint(120, 240), 20)
        draw.point((x, y), fill=col)
        if np.random.rand() > 0.7:
            draw.ellipse([x-1, y-1, x+1, y+1], fill=col)

    img.save(filename, "JPEG", quality=95)
    print(f"Generated: {filename}")

# 3. Generate Aurora Borealis / Northern Lights Background (2560x1440)
def generate_aurora(filename="assets/backgrounds/aurora-bg.jpg"):
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (4, 8, 16))
    draw = ImageDraw.Draw(img)

    # Sky
    for y in range(h):
        ratio = y / h
        r = int(4 + ratio * 10)
        g = int(8 + ratio * 20)
        b = int(18 + ratio * 30)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Aurora ribbons
    aurora = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aurora)
    
    xs = np.linspace(0, w, 200)
    for band, (col, offset_y, amp) in enumerate([
        ((0, 255, 140, 45), int(h * 0.4), 80),
        ((0, 200, 255, 38), int(h * 0.35), 100),
        ((160, 40, 255, 30), int(h * 0.45), 60),
    ]):
        ys = offset_y + amp * np.sin(xs * 0.003 + band * 1.5) + (amp * 0.4) * np.cos(xs * 0.007)
        for i in range(len(xs) - 1):
            x1, y1 = int(xs[i]), int(ys[i])
            x2, y2 = int(xs[i+1]), int(ys[i+1])
            a_draw.line([(x1, y1), (x2, y2)], fill=col, width=90)

    aurora = aurora.filter(ImageFilter.GaussianBlur(radius=60))
    img.paste(Image.alpha_composite(img.convert("RGBA"), aurora).convert("RGB"))

    # Stars
    np.random.seed(333)
    for _ in range(500):
        sx, sy = np.random.randint(0, w), np.random.randint(0, int(h * 0.75))
        draw.point((sx, sy), fill=(220, 240, 255))

    # Silhouette mountain bottom
    base_y = int(h * 0.88)
    points = [(0, h), (0, base_y)]
    peaks_x = np.linspace(0, w, 24)
    peaks_y = base_y - np.random.uniform(20, 140, len(peaks_x))
    for px, py in zip(peaks_x, peaks_y):
        points.append((int(px), int(py)))
    points.append((w, base_y))
    points.append((w, h))
    draw.polygon(points, fill=(2, 4, 8))

    img.save(filename, "JPEG", quality=95)
    print(f"Generated: {filename}")

# 4. Generate Vinyl Record Logo (800x800)
def generate_vinyl(filename="assets/logos/vinyl-record.png"):
    size = 800
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    r = 370

    # Outer black vinyl disc
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(18, 18, 20, 255), outline=(40, 40, 45, 255), width=4)

    # Grooves
    for gr in range(r - 15, 160, -8):
        draw.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], outline=(28, 28, 32, 200), width=1)

    # Center label disc (neon cyan & pink gradient feel)
    label_r = 150
    draw.ellipse([cx - label_r, cy - label_r, cx + label_r, cy + label_r], fill=(0, 240, 255, 255), outline=(255, 0, 128, 255), width=6)
    
    # Inner spindle hole
    hole_r = 24
    draw.ellipse([cx - hole_r, cy - hole_r, cx + hole_r, cy + hole_r], fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=3)

    # Stylized center star / lines
    for angle in np.linspace(0, 2*np.pi, 8, endpoint=False):
        x1 = cx + np.cos(angle) * (hole_r + 15)
        y1 = cy + np.sin(angle) * (hole_r + 15)
        x2 = cx + np.cos(angle) * (label_r - 20)
        y2 = cy + np.sin(angle) * (label_r - 20)
        draw.line([(x1, y1), (x2, y2)], fill=(20, 20, 30, 220), width=3)

    img.save(filename, "PNG")
    print(f"Generated: {filename}")

# 5. Generate Circular Soundwave Pulse Logo (800x800)
def generate_soundwave_logo(filename="assets/logos/soundwave-circle.png"):
    size = 800
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    r = 360

    # Dark background disc
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(12, 14, 22, 250), outline=(0, 255, 136, 255), width=6)

    # Radial frequency bars inside
    num_spokes = 36
    for i in range(num_spokes):
        ang = (i / num_spokes) * 2 * np.pi
        h_val = 50 + 130 * abs(np.sin(i * 0.6))
        inner = 100
        outer = inner + h_val
        x1 = cx + np.cos(ang) * inner
        y1 = cy + np.sin(ang) * inner
        x2 = cx + np.cos(ang) * outer
        y2 = cy + np.sin(ang) * outer
        draw.line([(x1, y1), (x2, y2)], fill=(0, 255, 136, 230), width=8)

    # Center circle core
    draw.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(20, 24, 36, 255), outline=(255, 255, 255, 255), width=4)
    # Inner dot
    draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(0, 255, 136, 255))

    img.save(filename, "PNG")
    print(f"Generated: {filename}")

# 6. Generate Cyberpunk Skull Logo (800x800)
def generate_cyberpunk_skull(filename="assets/logos/cyberpunk-skull.png"):
    size = 800
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    r = 360

    # Outer glowing hexagon / circle
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(15, 8, 20, 250), outline=(255, 0, 128, 255), width=7)

    # Inner decorative ring
    draw.ellipse([cx - r + 25, cy - r + 25, cx + r - 25, cy + r - 25], outline=(0, 240, 255, 160), width=3)

    # Stylized angular EDM mask/skull
    # Forehead
    draw.polygon([
        (cx - 150, cy - 130),
        (cx + 150, cy - 130),
        (cx + 180, cy - 20),
        (cx + 120, cy + 80),
        (cx + 70, cy + 180),
        (cx - 70, cy + 180),
        (cx - 120, cy + 80),
        (cx - 180, cy - 20),
    ], fill=(28, 14, 38, 255), outline=(255, 255, 255, 255))

    # Glowing eyes (inverted triangles)
    draw.polygon([(cx - 110, cy - 20), (cx - 40, cy - 20), (cx - 75, cy + 40)], fill=(0, 240, 255, 255))
    draw.polygon([(cx + 40, cy - 20), (cx + 110, cy - 20), (cx + 75, cy + 40)], fill=(0, 240, 255, 255))

    # Nose (small inverted triangle)
    draw.polygon([(cx - 20, cy + 60), (cx + 20, cy + 60), (cx, cy + 95)], fill=(255, 0, 128, 255))

    # Teeth / grille lines
    for tx in [-45, -15, 15, 45]:
        draw.line([(cx + tx, cy + 130), (cx + tx, cy + 170)], fill=(255, 255, 255, 255), width=5)

    img.save(filename, "PNG")
    print(f"Generated: {filename}")

if __name__ == "__main__":
    generate_fire()
    generate_aurora()
    generate_vinyl()
    generate_soundwave_logo()
    generate_cyberpunk_skull()

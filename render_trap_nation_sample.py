import os
import sys
import wave
import math
import subprocess
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_trap_nation_video():
    print("[Trap Nation Official Render] Starting authentic Trap Nation video render...")
    
    width, height = 1920, 1080
    fps = 60
    duration = 5 # 5 seconds = 300 frames of 60 FPS
    total_frames = fps * duration
    
    # 1. Load Audio
    audio_path = "assets/demo/demo-track.wav"
    wf = wave.open(audio_path, 'rb')
    sample_rate = wf.getframerate()
    n_channels = wf.getnchannels()
    sampwidth = wf.getsampwidth()
    
    total_samples = int(duration * sample_rate)
    raw_bytes = wf.readframes(total_samples)
    wf.close()
    
    # Parse audio samples
    if sampwidth == 2:
        samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    else:
        samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
    if n_channels > 1:
        samples = samples.reshape(-1, n_channels)[:, 0] # Left channel
        
    samples_per_frame = sample_rate / fps

    # 2. Load Authentic Assets
    bg_path = "assets/backgrounds/trap-nation-official-bg.jpg"
    if not os.path.exists(bg_path):
        bg_path = "assets/demo/demo-bg.jpg"
    bg_img = Image.open(bg_path).convert("RGB")
    bg_img = bg_img.resize((width + 80, height + 80), Image.Resampling.LANCZOS)
    
    logo_path = "assets/logos/trap-nation-official.png"
    if not os.path.exists(logo_path):
        logo_path = "assets/demo/demo-logo.png"
    logo_img = Image.open(logo_path).convert("RGBA")
    
    # Pre-generate Vignette Overlay
    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(vignette)
    for r in range(int(height * 0.4), int(height * 0.9), 8):
        alpha = int(210 * (r - height * 0.4) / (height * 0.5))
        v_draw.ellipse([width//2 - r*1.3, height//2 - r, width//2 + r*1.3, height//2 + r], outline=(0, 0, 0, alpha), width=9)

    # Ambient Particles Pool
    num_particles = 160
    particles = []
    np.random.seed(42)
    for _ in range(num_particles):
        angle = np.random.uniform(0, 2 * np.pi)
        dist = np.random.uniform(150, 680)
        speed = np.random.uniform(0.8, 2.8)
        size = np.random.uniform(1.5, 3.8)
        # White & soft cyan particles
        is_cyan = np.random.random() > 0.6
        color = (0, 220, 255) if is_cyan else (255, 255, 255)
        particles.append({'angle': angle, 'dist': dist, 'speed': speed, 'size': size, 'color': color})

    # Shockwaves Pool
    shockwaves = []

    # Typography Fonts
    font_artist = None
    font_title = None
    for font_name in ["C:/Windows/Fonts/Montserrat-Bold.ttf", "C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(font_name):
            try:
                font_artist = ImageFont.truetype(font_name, 34)
                font_title = ImageFont.truetype(font_name, 22)
                break
            except:
                pass
    if font_artist is None:
        font_artist = ImageFont.load_default()
        font_title = ImageFont.load_default()

    # Output video
    output_path = "trap_nation_official_render.mp4"
    if os.path.exists(output_path):
        try: os.remove(output_path)
        except: pass

    ffmpeg_bin = os.path.abspath("bin/ffmpeg.exe")
    ffmpeg_cmd = [
        ffmpeg_bin, "-y",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-framerate", str(fps),
        "-i", "-",
        "-ss", "0",
        "-t", str(duration),
        "-i", os.path.abspath(audio_path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-shortest",
        output_path
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    cx, cy = width // 2, int(height * 0.48)
    base_radius = 140

    print(f"[Trap Nation Official Render] Rendering {total_frames} frames to {output_path}...")

    saved_preview = False

    for f in range(total_frames):
        # Audio STFT for this frame
        start_idx = int(f * samples_per_frame)
        end_idx = min(len(samples), start_idx + 2048)
        chunk = samples[start_idx:end_idx]
        if len(chunk) < 2048:
            chunk = np.pad(chunk, (0, 2048 - len(chunk)))
        
        # Hann window
        windowed = chunk * np.hanning(len(chunk))
        fft_vals = np.abs(np.fft.rfft(windowed))
        
        # Sub-bass energy (0 to 120 Hz)
        bass_energy = np.mean(fft_vals[1:6]) * 2.5
        bass_pulse = min(1.0, max(0.0, bass_energy * 0.85))

        # Camera Shake & Zoom
        zoom = 1.0 + bass_pulse * 0.038
        shake_x = int((np.random.random() - 0.5) * 8 * bass_pulse)
        shake_y = int((np.random.random() - 0.5) * 8 * bass_pulse)

        # Base frame background
        zw, zh = int((width + 80) * zoom), int((height + 80) * zoom)
        frame_bg = bg_img.resize((zw, zh), Image.Resampling.BILINEAR)
        crop_x = (zw - width) // 2 + shake_x
        crop_y = (zh - height) // 2 + shake_y
        frame = frame_bg.crop((crop_x, crop_y, crop_x + width, crop_y + height))

        # Ground plane reflection (horizon at height * 0.68)
        refl_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        r_draw = ImageDraw.Draw(refl_layer)
        horizon_y = int(height * 0.68)
        pulse_factor = 1.0 + bass_pulse * 0.45
        for rx in range(int(500 * pulse_factor), 40, -40):
            alpha = int(22 * (1.0 - rx / (500 * pulse_factor)) * pulse_factor)
            r_draw.ellipse([cx - rx, horizon_y - 15, cx + rx, height + 100], fill=(20, 90, 210, alpha))
        refl_layer = refl_layer.filter(ImageFilter.GaussianBlur(radius=25))
        frame.paste(Image.alpha_composite(frame.convert("RGBA"), refl_layer).convert("RGB"), (0, 0))

        # Vignette
        frame.paste(vignette, (0, 0), vignette)

        draw = ImageDraw.Draw(frame, "RGBA")

        # Shockwaves trigger on heavy bass kick
        if bass_pulse > 0.58:
            shockwaves.append({'radius': base_radius + 15, 'alpha': 255})

        for sw in list(shockwaves):
            sw['radius'] += 10
            sw['alpha'] -= 8
            if sw['alpha'] <= 0 or sw['radius'] > 750:
                shockwaves.remove(sw)
            else:
                r_sw = sw['radius']
                col = (0, 220, 255, int(sw['alpha'] * 0.55))
                draw.ellipse([cx - r_sw, cy - r_sw, cx + r_sw, cy + r_sw], outline=col, width=3)

        # Floating bokeh particles
        for p in particles:
            p['dist'] += p['speed'] * (1.0 + bass_pulse * 1.4)
            # Drift slightly upward
            if p['dist'] > 850:
                p['dist'] = base_radius + np.random.uniform(5, 25)
                p['angle'] = np.random.uniform(0, 2 * np.pi)
            
            px = cx + math.cos(p['angle']) * p['dist']
            py = cy + math.sin(p['angle']) * p['dist'] - (p['dist'] * 0.12) # upward drift
            
            alpha = int(255 * max(0.0, min(1.0, 1.0 - (p['dist'] - 150) / 700)))
            r_p = p['size'] * (1.0 + bass_pulse * 0.25)
            p_col = (*p['color'], alpha)
            draw.ellipse([px - r_p, py - r_p, px + r_p, py + r_p], fill=p_col)

        # -------------------------------------------------------------
        # TRAP NATION FLUID WAVE (Continuous Solid Squircle Contour)
        # -------------------------------------------------------------
        num_points = 128
        half_n = num_points // 2
        
        # Resample FFT into half_n smoothed bins
        raw_bars = []
        for i in range(half_n):
            bin_idx = int(1 + (i / half_n) ** 1.6 * 85)
            bin_idx = min(len(fft_vals) - 1, bin_idx)
            val = fft_vals[bin_idx] * 4.2
            h_bar = max(6.0, val * 35.0)
            raw_bars.append(h_bar)

        # Gaussian smoothing across adjacent frequencies
        smoothed_bars = []
        for i in range(half_n):
            p2 = raw_bars[max(0, i - 2)]
            p1 = raw_bars[max(0, i - 1)]
            c  = raw_bars[i]
            n1 = raw_bars[min(half_n - 1, i + 1)]
            n2 = raw_bars[min(half_n - 1, i + 2)]
            smoothed_bars.append(p2 * 0.08 + p1 * 0.22 + c * 0.40 + n1 * 0.22 + n2 * 0.08)

        # Symmetrical mirrored 360-degree profile
        full_bars = smoothed_bars[::-1] + smoothed_bars

        # Helper to compute smooth Catmull-Rom spline points
        def generate_spline_points(r_scale=1.0, off_x=0, off_y=0):
            # Calculate raw control points around circle
            ctrl_pts = []
            for i in range(num_points):
                angle = (i / num_points) * 2 * math.pi - math.pi / 2
                # 4-lobe squircle resonance on sub-bass kicks
                lobe = (math.sin(angle * 2) ** 2) * (bass_pulse * 32.0)
                r = (base_radius + 4 + full_bars[i] + lobe) * r_scale
                px = cx + off_x + math.cos(angle) * r
                py = cy + off_y + math.sin(angle) * r
                ctrl_pts.append((px, py))
            
            # Catmull-Rom interpolation (subdivide each segment into 4 smooth steps)
            pts = []
            L = len(ctrl_pts)
            steps = 4
            for i in range(L):
                p0 = np.array(ctrl_pts[(i - 1 + L) % L])
                p1 = np.array(ctrl_pts[i])
                p2 = np.array(ctrl_pts[(i + 1) % L])
                p3 = np.array(ctrl_pts[(i + 2) % L])
                for s in range(steps):
                    t = s / steps
                    interp = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * (t**2) + (-p0 + 3 * p1 - 3 * p2 + p3) * (t**3))
                    pts.append((float(interp[0]), float(interp[1])))
            return pts

        # Chromatic Aberration Passes
        wave_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        w_draw = ImageDraw.Draw(wave_layer)

        # Pass 1: Red/Magenta Fringe Pass (+shift)
        red_pts = generate_spline_points(r_scale=1.018, off_x=3.8, off_y=-1.0)
        w_draw.polygon(red_pts, fill=(255, 30, 80, 180))

        # Pass 2: Cyan/Blue Fringe Pass (-shift)
        cyan_pts = generate_spline_points(r_scale=1.018, off_x=-3.8, off_y=1.0)
        w_draw.polygon(cyan_pts, fill=(0, 220, 255, 180))

        # Pass 3: Yellow/Green Outer Edge Fringe
        yellow_pts = generate_spline_points(r_scale=1.026, off_x=0, off_y=-1.5)
        w_draw.line(yellow_pts + [yellow_pts[0]], fill=(255, 235, 45, 140), width=4)

        # Pass 4: Solid Pure White Main Body
        white_pts = generate_spline_points(r_scale=1.0, off_x=0, off_y=0)
        w_draw.polygon(white_pts, fill=(255, 255, 255, 255))

        # Center Hole Mask (punch out inner disc)
        hole_mask = Image.new("L", (width, height), 255)
        hm_draw = ImageDraw.Draw(hole_mask)
        hm_draw.ellipse([cx - base_radius, cy - base_radius, cx + base_radius, cy + base_radius], fill=0)

        # Apply hole mask
        wave_layer_masked = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        wave_layer_masked.paste(wave_layer, (0, 0), mask=hole_mask)

        # Composite fluid wave onto frame
        frame.paste(wave_layer_masked, (0, 0), mask=wave_layer_masked)

        # Center Logo with Bass Bounce
        bounce = 1.0 + bass_pulse * 0.12
        r_logo = int(base_radius * bounce)
        scaled_logo = logo_img.resize((r_logo * 2, r_logo * 2), Image.Resampling.LANCZOS)
        frame.paste(scaled_logo, (cx - r_logo, cy - r_logo), mask=scaled_logo)

        # Crisp Circular Border
        draw = ImageDraw.Draw(frame, "RGBA")
        draw.ellipse([cx - r_logo, cy - r_logo, cx + r_logo, cy + r_logo], outline=(255, 255, 255, 240), width=5)

        # Typography (Trap Nation Signature Layout)
        artist_text = "SAN HOLO"
        title_text = "LIGHT"
        watermark_text = "TRAP NATION"

        # Center typography below visualizer
        ty = cy + base_radius + 90
        # Artist
        bbox_a = font_artist.getbbox(artist_text)
        w_a = bbox_a[2] - bbox_a[0]
        draw.text((cx - w_a // 2, ty), artist_text, fill=(255, 255, 255, 255), font=font_artist)

        # Title
        bbox_t = font_title.getbbox(title_text)
        w_t = bbox_t[2] - bbox_t[0]
        draw.text((cx - w_t // 2, ty + 45), title_text, fill=(255, 255, 255, 255), font=font_title)

        # Watermark
        draw.text((width - 160, height - 45), watermark_text, fill=(255, 255, 255, 110), font=font_title)

        # Save single high-res preview frame on heavy drop frame (frame 120)
        if f == 120 or (not saved_preview and bass_pulse > 0.65):
            frame.save("trap_nation_preview_frame.jpg", "JPEG", quality=95)
            shutil.copy("trap_nation_preview_frame.jpg", "C:/Users/migue/.gemini/antigravity/brain/252a107c-b2ef-4e6f-9330-6cf93147cbf0/trap_nation_preview_frame.jpg")
            print(f"[Trap Nation Official Render] Saved high-res sample preview frame at frame {f}!")
            saved_preview = True

        # Pipe frame JPEG to FFmpeg
        # Save to memory buffer
        import io
        buf = io.BytesIO()
        frame.save(buf, format="JPEG", quality=95)
        raw_jpeg = buf.getvalue()
        try:
            proc.stdin.write(raw_jpeg)
        except (BrokenPipeError, IOError):
            break

        if f % 30 == 0:
            print(f"  Frame {f}/{total_frames} ({f*100//total_frames}%)...")

    proc.stdin.close()
    proc.wait()
    print(f"[Trap Nation Official Render] SUCCESS! Rendered {output_path} with authentic fluid contour & chromatic prism rim!")

if __name__ == "__main__":
    create_trap_nation_video()

import numpy as np
import wave
import struct
import math
from PIL import Image, ImageDraw, ImageFilter

def create_demo_audio(filename="assets/demo/demo-track.wav"):
    sample_rate = 44100
    bpm = 140
    # 8 bars at 140 bpm = 32 beats = ~13.71 seconds
    beat_dur = 60.0 / bpm
    total_beats = 32
    duration = total_beats * beat_dur
    total_samples = int(duration * sample_rate)
    
    t = np.linspace(0, duration, total_samples, endpoint=False)
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    # Drum pattern:
    # Bar length = 4 beats
    # Beats 0 to 8: Intro build-up
    # Beats 8 to 32: Heavy Trap Drop with 808 sub bass
    
    # 1. Kicks & 808
    for beat in range(total_beats):
        bar_beat = beat % 4
        is_drop = beat >= 8
        
        # Kick on beat 0 and beat 2.5 (or syncopated trap kicks)
        kick_beats = [0, 2.5] if is_drop else [0]
        if is_drop and beat % 8 == 6:
            kick_beats = [0, 1.75, 2.5, 3.25]
            
        for kb in kick_beats:
            kick_time = (beat + kb) * beat_dur
            if kick_time + 0.35 >= duration:
                continue
            k_start = int(kick_time * sample_rate)
            k_len = int(0.35 * sample_rate)
            k_t = np.linspace(0, 0.35, k_len, endpoint=False)
            # Pitch drop from 160Hz to 48Hz
            freq = 48.0 + 112.0 * np.exp(-35.0 * k_t)
            kick_phase = 2.0 * np.pi * np.cumsum(freq) / sample_rate
            kick_env = np.exp(-9.0 * k_t)
            kick_sig = np.sin(kick_phase) * kick_env * 0.85
            
            # Click transient
            click_env = np.exp(-120.0 * k_t)
            click_sig = np.sin(2.0 * np.pi * 1200.0 * k_t) * click_env * 0.35
            
            k_tot = kick_sig + click_sig
            left[k_start:k_start+k_len] += k_tot
            right[k_start:k_start+k_len] += k_tot

        # 808 Sub-bass during drop
        if is_drop and bar_beat in [0, 2]:
            bass_time = beat * beat_dur
            b_start = int(bass_time * sample_rate)
            b_len = int(beat_dur * 1.8 * sample_rate)
            if b_start + b_len > total_samples:
                b_len = total_samples - b_start
            b_t = np.linspace(0, b_len / sample_rate, b_len, endpoint=False)
            
            # Sub bass note
            # Progression: F1 (43.65 Hz), G#1 (51.91 Hz), D#1 (38.89 Hz), C#1 (34.65 Hz)
            notes = [43.65, 43.65, 51.91, 51.91, 38.89, 38.89, 34.65, 38.89]
            b_freq = notes[(beat // 2) % len(notes)]
            
            # 808 glide down slightly
            freq_curve = b_freq * (1.0 + 0.15 * np.exp(-15.0 * b_t))
            phase = 2.0 * np.pi * np.cumsum(freq_curve) / sample_rate
            env = np.exp(-1.8 * b_t)
            
            # Saturate/distort for that rich EDM harmonic punch
            sub = np.sin(phase) + 0.3 * np.sin(2.0 * phase) + 0.15 * np.sin(3.0 * phase)
            sub = np.tanh(sub * 1.5) * env * 0.75
            
            left[b_start:b_start+b_len] += sub
            right[b_start:b_start+b_len] += sub

        # Snare/Clap on beat 2 of each bar (half time = beat 2)
        if bar_beat == 2 or (is_drop and bar_beat == 2):
            snare_time = beat * beat_dur
            s_start = int(snare_time * sample_rate)
            s_len = int(0.25 * sample_rate)
            if s_start + s_len < total_samples:
                s_t = np.linspace(0, 0.25, s_len, endpoint=False)
                tone = np.sin(2.0 * np.pi * 210.0 * s_t) * np.exp(-25.0 * s_t) * 0.4
                noise = (np.random.rand(s_len) * 2.0 - 1.0) * np.exp(-14.0 * s_t) * 0.5
                snare = tone + noise
                left[s_start:s_start+s_len] += snare * 0.7
                right[s_start:s_start+s_len] += snare * 0.7

    # 2. Hi-hats (every 8th note, with 16th variations during drop)
    for i in range(total_beats * 4): # 16th notes
        hat_time = i * (beat_dur / 4.0)
        h_start = int(hat_time * sample_rate)
        h_len = int(0.04 * sample_rate)
        if h_start + h_len < total_samples:
            h_t = np.linspace(0, 0.04, h_len, endpoint=False)
            noise = (np.random.rand(h_len) * 2.0 - 1.0) * np.exp(-80.0 * h_t)
            # High-pass filter simulated with derivative
            noise_hp = np.diff(noise, prepend=0) * 1.5
            vol = 0.2 if (i % 2 == 0) else 0.12
            if i >= 32 and (i % 8 == 6): # Triplet hat roll
                vol = 0.28
            left[h_start:h_start+h_len] += noise_hp * vol * 0.9
            right[h_start:h_start+h_len] += noise_hp * vol * 1.1

    # 3. Synth Chords & Melody
    # Atmospheric saw chords
    chord_freqs = [
        [174.61, 220.00, 261.63, 349.23], # F minor / major
        [207.65, 261.63, 311.13, 415.30], # G#
        [155.56, 196.00, 233.08, 311.13], # D#
        [138.59, 174.61, 207.65, 277.18], # C#
    ]
    for b in range(0, total_beats, 4):
        c_time = b * beat_dur
        c_start = int(c_time * sample_rate)
        c_len = int(4.0 * beat_dur * sample_rate)
        if c_start + c_len > total_samples:
            c_len = total_samples - c_start
        c_t = np.linspace(0, c_len / sample_rate, c_len, endpoint=False)
        chord = chord_freqs[(b // 4) % len(chord_freqs)]
        
        synth_l = np.zeros(c_len, dtype=np.float32)
        synth_r = np.zeros(c_len, dtype=np.float32)
        
        for f in chord:
            # Supersaw with detuning
            detune1 = f * 1.006
            detune2 = f * 0.994
            # Saw wave approximation
            saw1 = 2.0 * (c_t * f - np.floor(c_t * f + 0.5))
            saw2 = 2.0 * (c_t * detune1 - np.floor(c_t * detune1 + 0.5))
            saw3 = 2.0 * (c_t * detune2 - np.floor(c_t * detune2 + 0.5))
            
            synth_l += (saw1 + saw2) * 0.08
            synth_r += (saw1 + saw3) * 0.08

        # Pluck envelope with slight sidechain pump
        sidechain = 1.0 - 0.45 * np.exp(-12.0 * (c_t % beat_dur))
        synth_l *= sidechain
        synth_r *= sidechain
        
        left[c_start:c_start+c_len] += synth_l
        right[c_start:c_start+c_len] += synth_r

    # Master Limiter / Normalization
    max_val = max(np.max(np.abs(left)), np.max(np.abs(right)), 0.001)
    left = (left / max_val) * 0.95
    right = (right / max_val) * 0.95

    # Interleave to 16-bit PCM WAV
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        # Pack samples
        stereo = np.empty((total_samples * 2,), dtype=np.int16)
        stereo[0::2] = (left * 32767).astype(np.int16)
        stereo[1::2] = (right * 32767).astype(np.int16)
        wav_file.writeframes(stereo.tobytes())
        
    print(f"Generated demo audio: {filename} ({duration:.2f}s, {sample_rate}Hz stereo)")

def create_demo_background(filename="assets/demo/demo-bg.jpg"):
    # 2560 x 1440 high-res aesthetic dark mountain/cyberpunk background
    w, h = 2560, 1440
    img = Image.new("RGB", (w, h), (8, 10, 18))
    draw = ImageDraw.Draw(img)
    
    # Sky gradient: deep navy to dark purple / indigo
    for y in range(h):
        ratio = y / h
        r = int(10 + ratio * 25)
        g = int(8 + ratio * 15)
        b = int(24 + ratio * 35)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
        
    # Add stars
    np.random.seed(42)
    num_stars = 350
    star_x = np.random.randint(0, w, num_stars)
    star_y = np.random.randint(0, int(h * 0.7), num_stars)
    star_b = np.random.randint(120, 255, num_stars)
    for x, y, b in zip(star_x, star_y, star_b):
        draw.point((x, y), fill=(b, b, min(255, b + 20)))
        if b > 220: # larger stars
            draw.ellipse((x-1, y-1, x+1, y+1), fill=(b, b, 255))
            
    # Draw silhouette mountain ranges in background
    for layer, (base_y, max_height, color) in enumerate([
        (int(h * 0.82), 220, (14, 18, 30)),
        (int(h * 0.88), 160, (10, 13, 22)),
        (int(h * 0.94), 100, (6, 8, 14)),
    ]):
        points = [(0, h), (0, base_y)]
        num_peaks = 18 + layer * 6
        xs = np.linspace(0, w, num_peaks)
        np.random.seed(100 + layer)
        ys = base_y - np.random.uniform(20, max_height, num_peaks)
        for x, y in zip(xs, ys):
            points.append((int(x), int(y)))
        points.append((w, base_y))
        points.append((w, h))
        draw.polygon(points, fill=color)

    # Ambient center glow (warm/cyan aura behind the visualizer)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = w // 2, h // 2
    for r in range(450, 0, -15):
        alpha = int(12 * (1.0 - r / 450.0))
        glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(245, 170, 40, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"))
    
    # Subtle vignette
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    img.save(filename, "JPEG", quality=95)
    print(f"Generated demo background: {filename} ({w}x{h})")

def create_demo_logo(filename="assets/demo/demo-logo.png"):
    # 800 x 800 high-res stylized circular logo emblem
    size = 800
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = size // 2, size // 2
    radius = 360
    
    # Outer circular frame
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(12, 14, 20, 245), outline=(255, 200, 50, 255), width=8)
    
    # Inner decorative ring
    inner_r = radius - 20
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], outline=(255, 200, 50, 140), width=3)
    
    # Geometric EDM / Trap Nation style emblem (inverted neon triangle with stylized soundwaves)
    # Main Triangle
    t_top = cy - 140
    t_bottom = cy + 160
    t_half_w = 160
    tri_points = [
        (cx - t_half_w, t_top),
        (cx + t_half_w, t_top),
        (cx, t_bottom)
    ]
    draw.polygon(tri_points, fill=(20, 24, 34, 255), outline=(255, 215, 0, 255))
    
    # Stylized central pulse wave inside triangle
    wave_pts = [
        (cx - 100, cy - 20),
        (cx - 50, cy - 20),
        (cx - 30, cy - 80),
        (cx, cy + 60),
        (cx + 30, cy - 60),
        (cx + 50, cy - 20),
        (cx + 100, cy - 20),
    ]
    for i in range(len(wave_pts) - 1):
        draw.line([wave_pts[i], wave_pts[i+1]], fill=(255, 220, 70, 255), width=6)
        
    # Small circular core
    draw.ellipse([cx - 12, cy - 20 - 12, cx + 12, cy - 20 + 12], fill=(255, 255, 255, 255))
    
    img.save(filename, "PNG")
    print(f"Generated demo logo: {filename} ({size}x{size})")

if __name__ == "__main__":
    create_demo_audio()
    create_demo_background()
    create_demo_logo()

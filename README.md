# Music Aura Visualizer - Spectrometer Studio (8K Audio Visualizer)

A professional Windows desktop application and hardware-accelerated WebGL2 engine designed to generate high-energy, audio-reactive music videos in the iconic style of **Trap Nation**, **Drop Nation**, **Monstercat**, and modern EDM visualizers.

Capable of producing **ultra-high-definition output up to 8K (7680×4320)**, **4K UHD (3840×2160)**, and vertical **Portrait formats (1080×1920, 2160×3840, 4320×7680)** for YouTube Shorts, Instagram Reels, and TikTok.

---

## ⚡ Key Highlights

- **Multi-Resolution Output up to 8K (60 FPS)**:
  - **Landscape (16:9)**: 8K UHD (7680×4320), 4K UHD (3840×2160), 1440p QHD (2560×1440), 1080p Full HD (1920×1080), 720p HD (1280×720).
  - **Portrait (9:16)**: 8K Vertical (4320×7680), 4K Vertical (2160×3840), 1440p Vertical (1440×2560), 1080p Shorts/TikTok (1080×1920), 720p Vertical (720×1280).
  - **Square (1:1)**: 2160×2160 (4K Square), 1080×1080 (Instagram Feed).
  - **Custom Resolution**: Any width and height combination.
- **Direct YouTube Upload at Highest Quality (8K / 4K / 1080p)**:
  - **Save & Upload Options**: Save locally to disk, upload directly after rendering, or upload any previously exported video file at any time.
  - **Full YouTube Metadata**:
    - **Title**: Auto-formatted (e.g. `Artist - Track [8K 60FPS] | Audio Spectrometer Visualizer`) with character counter (`0 / 100`).
    - **Description**: Rich multi-line template with track info, high-res audio credit, streaming links, and hashtags (`0 / 5,000`).
    - **Tags**: Comma-separated tag keywords (`0 / 500`).
    - **Privacy Visibility**: Public, Unlisted, or Private.
    - **Category & COPPA**: Music category (ID 10) and Made for Kids compliance selector.
  - **Resumable Chunked Upload Protocol**: Streams large 4K / 8K video files in chunks with live percentage bar, upload speed (MB/s), uploaded bytes, and ETA timer.
  - **Direct Links**: On upload completion, provides instant direct links (`https://youtu.be/...`) and a one-click button to open YouTube Studio editor.
- **Pristine High-Resolution Audio Preservation (WAV, MP3, FLAC)**:
  - Generates the video visualizer directly from the imported audio file (whether standard MP3 or studio master 24-bit/32-bit 96kHz/192kHz WAV/FLAC).
  - Automatically probes and displays audio stream specifications (Bit Depth, Sample Rate, Channel Layout, Bitrate).
  - **Audio Export Modes**:
    - **Same Quality as Audio (Lossless Stream Copy - Bit-for-bit 100% Identical)**: Directly copies the audio bitstream (`-c:a copy`) with zero re-encoding and zero generational loss. High-res audio (24-bit 96kHz/192kHz PCM) remains intact in the output MP4!
    - **Apple Lossless (ALAC 24-bit PCM)**: Lossless studio master in MP4.
    - **Broadcast AAC (512 kbps Ultra)**: Maximum fidelity broadcast AAC.
    - **Standard YouTube AAC (320 kbps)**: Standard YouTube audio bitrate.
- **Persistent Media Library & Ready-Made Presets**:
  - **📚 Media Library Browser**: Browse all ready-made presets and previously uploaded assets in one unified, visual modal window.
  - **Ready-Made Background Presets**:
    - 🏔️ *Dark Misty Mountains*
    - 🌌 *Deep Space Nebula*
    - 🏙️ *Cyberpunk Skyline*
    - 🌅 *Sunset Horizon*
    - 🔥 *Inferno Flames*
    - 🌌 *Aurora Borealis*
    - ⬛ *Studio Dark Gradient*
  - **User-Uploaded Background Library**: Uploaded backgrounds are automatically indexed, stored in `assets/library/backgrounds/`, and remembered across sessions with thumbnail previews and one-click deletion.
  - **Drag & Drop**: Drag and drop any image file (PNG, JPG, WEBP, GIF, BMP) anywhere into the app to instantly update the background and save it to your library.
  - **Full Image Adjustments**: Real-time controls for Gaussian Blur (0–25px), Brightness/Darkness, Contrast, Saturation, Scaling Mode (Cover, Contain, Stretch), and Color Tinting.
  - **Subwoofer Camera Shake**: Bass transients dynamically zoom and shake the background image to the kick drum!

- **3-Way Center Logo & Artwork Customization**:
  - **🖼️ Custom Artwork Mode**: Upload custom square or circular album art with automatic circular cropping and bass-reactive thumping.
  - **⚡ Preset Emblem Mode**: Choose from ready-made EDM channel emblems:
    - ⚡ *Trap Emblem*
    - 💿 *Vinyl Record*
    - 🔊 *Soundwave Circle*
    - 💀 *Cyber Skull*
  - **❌ No Logo (Hollow Center) Mode**: Completely removes the center logo, leaving a hollow opening where the spectrum bars radiate outward around the empty circumference, allowing the background to show through cleanly (with optional translucent center tint).
  - **Persistent Artwork Library**: All uploaded artwork is indexed in `assets/library/logos/` with visual preview cards and delete controls.
- **Ultra-Smooth Real-Time Preview**:
  - Live interactive preview rendered at an optimized canvas viewport, running at a smooth 60+ FPS without placing heavy loads on your GPU or CPU.
  - Full playback controls: Play/Pause (Spacebar), seeking scrub bar, volume control, timecode readout.
  - Live parameter tweaks: Adjust any slider, gradient, particle count, or typography setting and see the changes reflected immediately on the live canvas.
- **Offline Deterministic 8K/4K Frame Render Pipeline**:
  - Full resolution is rendered **strictly on final output**.
  - Frame-by-frame offline STFT (Short-Time Fourier Transform) audio pre-computation ensures **zero frame drops**, zero audio desync, and perfect bass-reactive synchronization.
  - Streams rendered frames directly into **FFmpeg 7.1** using a backpressure-managed pipeline, keeping memory usage constant (~200MB) even during 8K exports.
- **Iconic Trap Nation & Drop Nation Visual Elements**:
  - **🌊 Authentic Trap Nation Continuous Fluid Wave (Squircle Contour)**:
    - Continuous smooth liquid contour wrapping seamlessly around the circular emblem.
    - **Catmull-Rom Cubic Spline**: Interpolates frequency bins into a velvet organic closed curve with zero jagged polygon edges.
    - **🌈 Chromatic Aberration / Prism Rim**: Authentic multi-color RGB dispersion fringe (red, yellow, green, cyan) outlining the perimeter of the white wave.
    - **4-Lobe Squircle Bass Resonance**: On sub-bass drops and kick transients, the contour swells outward into four rounded organic lobes, matching the iconic Trap Nation squircle look.
    - **Solid White / Gradient Fill Modes**: Pure radiant white (`#ffffff`), multi-color radial gradient, or thin laser outline.
    - **🌊 Wet Ground Horizon Reflection**: Renders a dynamic floor reflection on the lower horizon (below 68% height) mirroring the central visualizer's aura and bass hits.
  - **Central Radial Visualizer Bars**: Symmetrical mirrored spectrum bars radiating around a circular core for classic mode.
  - **Bass Camera Shake**: Dynamic camera zoom bounce and subtle vibration triggered by sub-bass 808s and kick transients.
  - **Center Logo Bass Thump**: Circular album art / channel emblem bouncing dynamically to the beat.
  - **Bass Shockwave Ripples**: Expanding glowing circular rings emitted on heavy drops.
- **Advanced Audio-Reactive Particle Engine (Trapcode / Motion Emitter Cells Architecture)**:
  - **Master Toggle & Preview Modes**:
    - Particle Enable / Disable toggle.
    - Preview Modes: `Realtime` (lightweight interactive preview) or `Video` (deterministic fixed 60 FPS offline export step).
  - **Emitter Options**:
    - **Shapes**: `Circle`, `Line`, `Point`, `Rectangle`, `Sphere` (3D), `Cuboid` (3D).
    - **Emission Modes**: `Outline` (perimeter), `Points` (discrete vertices), `Surface` (coverage), `Volume` (3D depth).
    - **Preserve Depth**: 3D perspective projection with depth-scaling and Z-sorting.
    - **Reacts to Bass**: Toggles bass-kick modulation of particle physics.
    - **Mirroring**: Symmetrical dual-sided emission (iconic Trap Nation blast effect).
  - **Bass Modulation Multipliers**:
    - Time Multiplier (Default `1.35x` with `+` / `−` steppers).
    - Birthrate Multiplier (Default `1.35x` with `+` / `−` steppers).
    - Velocity Multiplier (Default `1.50x` with `+` / `−` steppers).
  - **Transform & Emitter Size**:
    - **Match Visualizers**: Automatically locks emitter center and radius to the visualizer ring.
    - **Custom Size Toggle**: Width Multiplier (Default `0.95x`) and Height Multiplier (Default `0.95x`).
  - **Emitter Cells (Cell Type 1)**:
    - **Appearance**:
      - Geometric Shapes: `Circle`, `Circle with Outline`, `Circle with Feathered Edges`, `Vertical Line`, `Horizontal Line`, `Star`, `Triangle`, `Square`, `Octagon`, `Pentagon`.
      - **Custom Shapes**: Choose from built-in 60×60 white PNG shapes (*Sparkle*, *Diamond*, *Heart*, *Music Note*, *Ring*, *Cross*) or upload your own 60×60 white PNG!
      - Color Picker & Color Swatch palette.
      - **Red Dynamics**: Variation Range (Default `0`) & Animation Speed (Default `0 /sec`).
      - **Blue Dynamics**: Variation Range (Default `0`) & Animation Speed (Default `0 /sec`).
      - **Green Dynamics**: Variation Range (Default `0`) & Animation Speed (Default `1.00 /sec`).
      - **Opacity Dynamics**: Variation Range (Default `0.0`) & Animation Speed (Default `0.20 /sec`).
      - **Scale Dynamics**: Base Size, Variation Range (Default `0.15`), Animation Speed (Default `0.0 /sec`).
    - **Motion**:
      - **Spin**: Angular Velocity (Default `0 deg/sec`) & Variation Range (Default `0 deg/sec`).
      - **Velocity**: Base Speed (Default `22.5 px/sec`) & Variation Range (Default `15 px/sec`).
    - **Emission Settings**:
      - **Lifetime**: Duration (Default `100 sec`) & Variation Range (Default `0 sec`).
      - **Birthrate**: Cells / Sec (Default `10.0 cells/sec`).
      - **Direction**: Latitude (Default `50 deg`), Longitude (Default `15 deg`), Direction Range (Default `15 deg`).
  - **Vignette & Blur**: Cinematic background darkening with adjustable Gaussian blur and brightness.
  - **Typography Overlay**: Artist Name, Track Title, and Channel Watermark with custom font sizes, letter spacing, drop shadows, and colors.

---

## 🚀 How to Launch the Application

### Option A: Double-Click Launcher
Double-click:
```
Spectrometer Studio.bat
```

### Option B: Command Line
Open a terminal in the project directory and run:
```bash
npm start
```

---

## 🎨 Step-by-Step Usage Guide

1. **Load Media**:
   - Click **⚡ Load Demo Beat** to test the system with the included demo track, or:
   - Go to the **📁 Media** tab:
     - Click **Choose Audio** to pick any `.mp3`, `.wav`, `.flac`, `.ogg`, or `.m4a` file.
     - Click **Choose Image** or drag & drop any photo to set a custom background picture.
     - Click **Choose Logo** to set your center emblem or album artwork.
2. **Select Theme & Aspect Ratio**:
   - Choose a preset from the **Theme Preset** dropdown (e.g. *Trap Nation Classic* or *Drop Nation Cyber Dual*).
   - Click **16:9 Landscape** for YouTube widescreen, or **9:16 Shorts/Reels** for vertical mobile videos.
3. **Customize Visuals**:
   - **🎛️ Ring Tab**: Tweak bar count, height, thickness, sensitivity, and 2-stop color gradients.
   - **⚡ Effects Tab**: Dial in subwoofer camera shake, shockwave ripples, particle count, and flight speed.
   - **✍️ Text Tab**: Set the Artist Name, Song Title, and Channel watermark.
4. **Interactive Preview**:
   - Press **Spacebar** or click the yellow **Play** button to listen and watch the visualizer react in real time.
   - Drag the timeline scrubber to jump to any beat drop or section of the track.
5. **Render Full Resolution Video**:
   - Click the glowing **EXPORT VIDEO** button in the top right.
   - Select your desired output resolution (e.g., **4K UHD 3840×2160** or **8K UHD 7680×4320**).
   - Select your framerate (**60 FPS** or **30 FPS**) and video encoder (Hardware acceleration `h264_amf` / `h264_nvenc` or software `libx264`).
   - Select local destination file path to save the MP4 video locally.
   - *(Optional)* Check the box: **"Upload to YouTube after render completes"**.
   - Click **Start Rendering**. Watch the real-time progress bar, frame count, rendering speed, and elapsed/ETA timers.
   - When finished, you can play the saved MP4 video or reveal it in File Explorer.
6. **Direct YouTube Upload at Highest Quality**:
   - Click **🔴 Upload to YouTube** directly from the render completion screen, or click the **YouTube Upload** button in the header bar.
   - Connect your Google / YouTube account with 1 click.
   - Review and customize the auto-generated **Title**, rich **Description**, **Tags**, **Privacy Visibility** (Public/Unlisted/Private), and **Category**.
   - Click **Upload to YouTube Now**. The resumable upload protocol streams your video at maximum bandwidth and gives you an instant direct YouTube link upon completion!

---

## 🧪 Automated Testing

You can run the end-to-end 8K video rendering validation test anytime by running:
```bash
npm test
```
This tests the full FFmpeg 7.1 pipeline at 7680×4320 @ 60 FPS paired with 24-bit 96kHz lossless audio stream copy.

You can also run the media library persistent indexing and particle engine tests:
```bash
node tests/test_library.js
node tests/test_particles.js
```

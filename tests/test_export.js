const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testExportPipeline() {
  console.log('[Test] Starting export pipeline verification...');
  const ffmpegPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg not found at ${ffmpegPath}`);
  }

  const audioPath = path.join(__dirname, '..', 'assets', 'demo', 'test-96k-24bit.wav');
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Demo audio not found at ${audioPath}`);
  }

  const outputPath = path.join(__dirname, '..', 'test_render_8k.mp4');
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Create a sample 8K JPEG frame
  const width = 7680;
  const height = 4320;
  const fps = 60;
  const duration = 1; // 1 second = 60 frames of 8K!
  const totalFrames = fps * duration;

  console.log(`[Test] Generating 8K test video with 24-bit 96kHz Lossless Audio: ${width}x${height} @ ${fps}FPS (${totalFrames} frames)...`);

  // Let's create a minimal JPEG buffer using python or simple dummy JPEG
  const { execSync } = require('child_process');
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  execSync(`python -c "from PIL import Image, ImageDraw; img = Image.new('RGB', (${width}, ${height}), (10, 15, 25)); draw = ImageDraw.Draw(img); draw.ellipse([${cx - 200}, ${cy - 200}, ${cx + 200}, ${cy + 200}], fill=(255, 215, 0)); img.save('temp_frame.jpg', 'JPEG', quality=95)"`);

  const frameBuffer = fs.readFileSync('temp_frame.jpg');
  console.log(`[Test] Sample 8K frame JPEG size: ${(frameBuffer.length / 1024).toFixed(1)} KB`);

  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(fps),
    '-i', '-',
    '-ss', '0',
    '-t', String(duration),
    '-i', audioPath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'copy', // Stream copy preserves exact 24-bit 96kHz uncompressed PCM audio!
    '-pix_fmt', 'yuv420p',
    '-shortest',
    outputPath
  ];

  console.log(`[Test] Spawning: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
  const proc = spawn(ffmpegPath, ffmpegArgs);

  proc.stderr.on('data', (d) => {
    // console.log(d.toString());
  });

  // Pipe 120 frames into stdin
  for (let f = 0; f < totalFrames; f++) {
    const canWrite = proc.stdin.write(frameBuffer);
    if (!canWrite) {
      await new Promise(r => proc.stdin.once('drain', r));
    }
  }
  proc.stdin.end();

  await new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  if (fs.existsSync('temp_frame.jpg')) fs.unlinkSync('temp_frame.jpg');

  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath);
    console.log(`[Test] SUCCESS! Output created: ${outputPath} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    // Clean up test file
    fs.unlinkSync(outputPath);
  } else {
    throw new Error('Output file was not created!');
  }
}

testExportPipeline().catch(err => {
  console.error('[Test] FAILED:', err);
  process.exit(1);
});

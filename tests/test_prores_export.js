const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testProRes() {
  console.log('[Test] Testing ProRes_ks export pipeline...');
  const ffmpegPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  const audioPath = path.join(__dirname, '..', 'assets', 'demo', 'test-96k-24bit.wav');
  const outputPath = path.join(__dirname, '..', 'test_render_prores.mov');

  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  // Generate a test frame
  const { execSync } = require('child_process');
  execSync(`python -c "from PIL import Image, ImageDraw; img = Image.new('RGB', (1920, 1080), (20, 20, 35)); draw = ImageDraw.Draw(img); draw.rectangle([200, 200, 400, 400], fill=(0, 240, 255)); img.save('temp_prores_frame.jpg', 'JPEG', quality=95)"`);
  const frameBuffer = fs.readFileSync('temp_prores_frame.jpg');

  const args = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', '30',
    '-i', '-',
    '-ss', '0',
    '-t', '1',
    '-i', audioPath,
    '-c:v', 'prores_ks',
    '-profile:v', '3',
    '-pix_fmt', 'yuv422p10le',
    '-c:a', 'copy',
    '-shortest',
    outputPath
  ];

  const proc = spawn(ffmpegPath, args);
  for (let i = 0; i < 30; i++) {
    const ok = proc.stdin.write(frameBuffer);
    if (!ok) await new Promise(r => proc.stdin.once('drain', r));
  }
  proc.stdin.end();

  await new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error('FFmpeg failed with code ' + code));
    });
  });

  if (fs.existsSync('temp_prores_frame.jpg')) fs.unlinkSync('temp_prores_frame.jpg');

  if (fs.existsSync(outputPath)) {
    const sz = fs.statSync(outputPath).size;
    console.log(`[Test] ProRes test succeeded! File size: ${(sz / 1024).toFixed(1)} KB`);
    fs.unlinkSync(outputPath);
  } else {
    throw new Error('ProRes output file not found');
  }
}

testProRes().catch(err => {
  console.error(err);
  process.exit(1);
});

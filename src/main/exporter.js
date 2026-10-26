const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class VideoExporter {
  constructor(mainWindow, ffmpegPath) {
    this.mainWindow = mainWindow;
    this.ffmpegPath = ffmpegPath;
    this.ffmpegProcess = null;
    this.isExporting = false;
    this.outputPath = null;
    this.totalFrames = 0;
    this.writtenFrames = 0;
    this.startTime = 0;
  }

  start(config) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    const {
      outputPath,
      width,
      height,
      fps = 60,
      audioPath,
      startTime = 0,
      duration = 0,
      encoder = 'auto', // 'auto', 'libx264', 'h264_amf', 'h264_nvenc', 'libx265', 'hevc_amf'
      audioCodec = 'copy', // 'copy' (Lossless source copy), 'alac', 'flac', 'aac_512', 'aac_320'
      crf = 18,
      bitrate = '40M',
      inputFormat = 'mjpeg', // 'mjpeg' or 'raw'
      totalFrames = 0
    } = config;

    this.outputPath = outputPath;
    this.totalFrames = totalFrames;
    this.writtenFrames = 0;
    this.startTime = Date.now();
    this.isExporting = true;

    // Determine video encoder
    let chosenCodec = 'libx264';
    let encoderArgs = [];

    const targetBitrate = bitrate || (width >= 7680 ? '120M' : (width >= 3840 ? '60M' : '25M'));

    if (encoder === 'h264_amf' || encoder === 'auto') {
      chosenCodec = 'h264_amf';
      encoderArgs = ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cbr', '-b:v', targetBitrate];
    } else if (encoder === 'hevc_amf') {
      chosenCodec = 'hevc_amf';
      const hevcBitrate = bitrate || (width >= 7680 ? '80M' : (width >= 3840 ? '40M' : '18M'));
      encoderArgs = ['-c:v', 'hevc_amf', '-quality', 'quality', '-rc', 'cbr', '-b:v', hevcBitrate];
    } else if (encoder === 'h264_nvenc') {
      chosenCodec = 'h264_nvenc';
      encoderArgs = ['-c:v', 'h264_nvenc', '-preset', 'p6', '-cq', String(crf), '-b:v', bitrate];
    } else if (encoder === 'hevc_nvenc') {
      chosenCodec = 'hevc_nvenc';
      encoderArgs = ['-c:v', 'hevc_nvenc', '-preset', 'p6', '-cq', String(crf), '-b:v', bitrate];
    } else if (encoder === 'libx265') {
      chosenCodec = 'libx265';
      encoderArgs = ['-c:v', 'libx265', '-preset', 'fast', '-crf', String(crf)];
    } else if (encoder === 'prores' || encoder === 'prores_ks') {
      chosenCodec = 'prores_ks';
      encoderArgs = ['-c:v', 'prores_ks', '-profile:v', '3'];
    } else {
      chosenCodec = 'libx264';
      encoderArgs = ['-c:v', 'libx264', '-preset', 'fast', '-crf', String(crf)];
    }

    // Determine audio encoder (preserving high-resolution audio, YouTube compatible)
    let audioEncodingArgs = [];
    const isWav = audioPath && audioPath.toLowerCase().endsWith('.wav');
    const isMp4 = outputPath && outputPath.toLowerCase().endsWith('.mp4');

    if (audioCodec === 'copy') {
      if (isWav && isMp4) {
        // Standard MP4 containers do not support raw PCM streams.
        // YouTube recommends AAC-LC at 384k/512k stereo, 48kHz for high-res audio:
        audioEncodingArgs = ['-c:a', 'aac', '-b:a', '384k', '-ar', '48000'];
      } else {
        // Direct stream copy: 100% bit-for-bit lossless preservation of high-res audio in MOV/MKV, or AAC/FLAC
        audioEncodingArgs = ['-c:a', 'copy'];
      }
    } else if (audioCodec === 'alac') {
      // Apple Lossless 24-bit PCM compression in MP4
      audioEncodingArgs = ['-c:a', 'alac'];
    } else if (audioCodec === 'flac') {
      audioEncodingArgs = ['-c:a', 'flac'];
    } else if (audioCodec === 'aac_512') {
      audioEncodingArgs = ['-c:a', 'aac', '-b:a', '512k', '-ar', '48000'];
    } else {
      // High quality 320k/384k AAC (YouTube compatible)
      audioEncodingArgs = ['-c:a', 'aac', '-b:a', '384k', '-ar', '48000'];
    }

    // Input args for piped video
    let inputArgs = [];
    if (inputFormat === 'mjpeg') {
      inputArgs = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-framerate', String(fps),
        '-i', '-'
      ];
    } else {
      inputArgs = [
        '-y',
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${width}x${height}`,
        '-framerate', String(fps),
        '-i', '-'
      ];
    }

    // Audio input args
    const audioArgs = [
      '-ss', String(startTime),
      '-t', String(duration),
      '-i', audioPath
    ];

    // Video & Audio output args
    const pixFmt = chosenCodec === 'prores_ks' ? 'yuv422p10le' : 'yuv420p';
    const outputArgs = [
      ...encoderArgs,
      ...audioEncodingArgs,
      '-pix_fmt', pixFmt,
      '-shortest',
      outputPath
    ];

    const fullArgs = [...inputArgs, ...audioArgs, ...outputArgs];
    console.log(`[Exporter] Spawning FFmpeg: ${this.ffmpegPath} ${fullArgs.join(' ')}`);

    this.ffmpegProcess = spawn(this.ffmpegPath, fullArgs);

    this.ffmpegProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      // Parse progress if available (e.g. "frame=  120 fps= 45.2 ...")
      const match = msg.match(/frame=\s*(\d+)\s+fps=\s*([\d.]+)/);
      if (match) {
        const encodedFrames = parseInt(match[1], 10);
        const currentFps = parseFloat(match[2]) || 0;
        const progress = this.totalFrames > 0 ? (encodedFrames / this.totalFrames) * 100 : 0;
        const elapsed = (Date.now() - this.startTime) / 1000;
        const remainingFrames = Math.max(0, this.totalFrames - encodedFrames);
        const eta = currentFps > 0 ? remainingFrames / currentFps : 0;

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('export:progress', {
            type: 'encoding',
            encodedFrames,
            totalFrames: this.totalFrames,
            progress: Math.min(100, progress),
            fps: currentFps,
            elapsedSeconds: elapsed,
            etaSeconds: eta
          });
        }
      }
    });

    this.ffmpegProcess.on('error', (err) => {
      console.error('[Exporter] FFmpeg process error:', err);
      this.isExporting = false;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('export:error', err.message);
      }
    });

    return { success: true, chosenCodec };
  }

  writeFrame(frameBuffer) {
    if (!this.isExporting || !this.ffmpegProcess || !this.ffmpegProcess.stdin) {
      return Promise.reject(new Error('Exporter is not active'));
    }

    this.writtenFrames++;
    const buffer = Buffer.isBuffer(frameBuffer) ? frameBuffer : Buffer.from(frameBuffer);

    return new Promise((resolve, reject) => {
      const canWriteMore = this.ffmpegProcess.stdin.write(buffer, (err) => {
        if (err) return reject(err);
      });

      if (canWriteMore) {
        resolve({ writtenFrames: this.writtenFrames });
      } else {
        // Backpressure: wait for drain
        this.ffmpegProcess.stdin.once('drain', () => {
          resolve({ writtenFrames: this.writtenFrames });
        });
      }
    });
  }

  finish() {
    return new Promise((resolve, reject) => {
      if (!this.isExporting || !this.ffmpegProcess) {
        return resolve({ success: true, outputPath: this.outputPath });
      }

      this.ffmpegProcess.on('close', (code) => {
        this.isExporting = false;
        if (code === 0) {
          resolve({ success: true, outputPath: this.outputPath });
        } else {
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
        this.ffmpegProcess = null;
      });

      // Close stdin to tell FFmpeg that all frames have been sent
      if (this.ffmpegProcess.stdin && !this.ffmpegProcess.stdin.destroyed) {
        this.ffmpegProcess.stdin.end();
      }
    });
  }

  cancel() {
    this.isExporting = false;
    if (this.ffmpegProcess) {
      try {
        this.ffmpegProcess.kill('SIGKILL');
      } catch (e) {
        console.error('Error killing process', e);
      }
      this.ffmpegProcess = null;
    }

    // Try deleting partial output file if it exists
    if (this.outputPath && fs.existsSync(this.outputPath)) {
      try {
        fs.unlinkSync(this.outputPath);
      } catch (e) {
        // Ignored
      }
    }

    return { success: true, canceled: true };
  }
}

module.exports = VideoExporter;

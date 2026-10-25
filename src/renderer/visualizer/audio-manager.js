/**
 * Web Audio Manager
 * Handles both real-time playback/preview and offline frame-by-frame STFT analysis
 */

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.gainNode = null;

    this.audioBuffer = null;
    this.audioPath = null;
    this.fileName = null;

    this.isPlaying = false;
    this.isLoaded = false;
    this.duration = 0;
    this.startTime = 0;
    this.pausedAt = 0;
    this.volume = 0.85;

    // Analyzer for offline and real-time processing
    this.analyzer = new AudioFrequencyAnalyzer(44100, 2048);
    this.rawFreqArray = new Uint8Array(1024);
    this.fftMagnitudes = new Float32Array(1024);

    this.onEndedCallback = null;
  }

  initContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async loadAudioFile(filePath, arrayBuffer, fileName) {
    this.initContext();
    this.stop();

    this.audioPath = filePath;
    this.fileName = fileName;

    // Decode audio data into PCM AudioBuffer
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
    this.duration = this.audioBuffer.duration;
    this.isLoaded = true;
    this.pausedAt = 0;
    this.analyzer.reset();

    return {
      duration: this.duration,
      sampleRate: this.audioBuffer.sampleRate,
      numberOfChannels: this.audioBuffer.numberOfChannels
    };
  }

  play(seekTime = null) {
    if (!this.isLoaded || !this.audioBuffer) return;
    this.initContext();

    if (this.isPlaying) {
      this.stop();
    }

    const offset = seekTime !== null ? Math.max(0, Math.min(this.duration, seekTime)) : this.pausedAt;
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      if (this.isPlaying && this.getCurrentTime() >= this.duration - 0.1) {
        this.isPlaying = false;
        this.pausedAt = 0;
        if (this.onEndedCallback) this.onEndedCallback();
      }
    };
  }

  pause() {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.stop();
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignored
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  seek(timeInSeconds) {
    const clamped = Math.max(0, Math.min(this.duration, timeInSeconds));
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
      this.play(clamped);
    } else {
      this.pausedAt = clamped;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.pausedAt;
    const elapsed = this.audioContext.currentTime - this.startTime;
    return Math.max(0, Math.min(this.duration, elapsed));
  }

  /**
   * Real-time spectrum analysis for live preview canvas
   */
  getLiveAudioData(barCount = 128, minFreq = 25, maxFreq = 15000, smoothing = 0.82, sensitivity = 1.2) {
    if (!this.isPlaying || !this.analyserNode) {
      // Return zeroed or decaying bars
      return this.analyzer.processSpectrum(this.fftMagnitudes, barCount, minFreq, maxFreq, smoothing, 0);
    }

    this.analyserNode.getByteFrequencyData(this.rawFreqArray);

    // Normalize byte frequencies (0..255) to float magnitudes (0..1)
    for (let i = 0; i < 1024; i++) {
      this.fftMagnitudes[i] = this.rawFreqArray[i] / 255.0;
    }

    return this.analyzer.processSpectrum(this.fftMagnitudes, barCount, minFreq, maxFreq, smoothing, sensitivity);
  }

  /**
   * Pre-computes exact FFT spectrum for every frame of the export range
   * @param {number} fps e.g. 60
   * @param {number} startTime e.g. 0
   * @param {number} duration e.g. 15
   * @param {Object} visualizerParams
   * @param {Function} onProgress
   * @returns {Array<Object>} Array of audioData per frame
   */
  precomputeOfflineFrames(fps, startTime, duration, visualizerParams, onProgress) {
    if (!this.audioBuffer) {
      throw new Error('No audio buffer loaded');
    }

    const sampleRate = this.audioBuffer.sampleRate;
    const channelData = this.audioBuffer.getChannelData(0); // Left channel (or mix)
    const hasRightChannel = this.audioBuffer.numberOfChannels > 1;
    const rightData = hasRightChannel ? this.audioBuffer.getChannelData(1) : null;

    const totalFrames = Math.floor(duration * fps);
    const fftSize = 2048;
    const halfFft = fftSize / 2;
    const tempBuffer = new Float32Array(fftSize);

    const offlineAnalyzer = new AudioFrequencyAnalyzer(sampleRate, fftSize);
    const results = new Array(totalFrames);

    const barCount = visualizerParams.segmentCount || visualizerParams.barCount || 128;
    const minFreq = visualizerParams.minFrequency || visualizerParams.minFreq || 25;
    const maxFreq = visualizerParams.maxFrequency || visualizerParams.maxFreq || 15000;
    const smoothing = visualizerParams.smoothing !== undefined ? visualizerParams.smoothing : 0.82;
    const sensitivity = visualizerParams.sensitivity || 1.2;

    for (let f = 0; f < totalFrames; f++) {
      const timeSec = startTime + (f / fps);
      const centerSample = Math.floor(timeSec * sampleRate);
      const startSample = centerSample - halfFft;

      // Fill tempBuffer centered around current time
      for (let i = 0; i < fftSize; i++) {
        const sIdx = startSample + i;
        if (sIdx >= 0 && sIdx < channelData.length) {
          const l = channelData[sIdx];
          const r = rightData ? rightData[sIdx] : l;
          tempBuffer[i] = (l + r) * 0.5;
        } else {
          tempBuffer[i] = 0;
        }
      }

      // Compute FFT
      const magnitudes = offlineAnalyzer.fft.forward(tempBuffer);
      const processed = offlineAnalyzer.processSpectrum(magnitudes, barCount, minFreq, maxFreq, smoothing, sensitivity);

      // Clone bars array for this frame
      results[f] = {
        bars: new Float32Array(processed.bars),
        bassLevel: processed.bassLevel,
        kickPulse: processed.kickPulse
      };

      if (onProgress && f % 120 === 0) {
        onProgress((f / totalFrames) * 100);
      }
    }

    if (onProgress) onProgress(100);
    return results;
  }
}

if (typeof module !== 'undefined') {
  module.exports = AudioManager;
}

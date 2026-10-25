/**
 * High-performance FFT and Audio Frequency Analyzer
 * Designed for Trap Nation & Drop Nation style logarithmic spectrum rendering and beat detection
 */

class FastFourierTransform {
  constructor(bufferSize = 2048) {
    this.bufferSize = bufferSize;
    this.cosTable = new Float32Array(bufferSize / 2);
    this.sinTable = new Float32Array(bufferSize / 2);
    this.hannWindow = new Float32Array(bufferSize);

    // Precalculate sine/cosine tables and Hann window
    for (let i = 0; i < bufferSize / 2; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / bufferSize);
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / bufferSize);
    }
    for (let i = 0; i < bufferSize; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (bufferSize - 1)));
    }

    // Bit-reversal table
    this.reverseTable = new Uint32Array(bufferSize);
    let limit = 1;
    let bit = bufferSize >> 1;
    while (limit < bufferSize) {
      for (let i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit <<= 1;
      bit >>= 1;
    }

    this.real = new Float32Array(bufferSize);
    this.imag = new Float32Array(bufferSize);
    this.magnitudes = new Float32Array(bufferSize / 2);
  }

  forward(inputBuffer) {
    const n = this.bufferSize;
    // Apply window and bit reversal
    for (let i = 0; i < n; i++) {
      const rev = this.reverseTable[i];
      const val = (i < inputBuffer.length ? inputBuffer[i] : 0) * this.hannWindow[i];
      this.real[rev] = val;
      this.imag[rev] = 0.0;
    }

    // Cooley-Tukey Radix-2 FFT
    let halfSize = 1;
    while (halfSize < n) {
      const step = halfSize << 1;
      const tableStep = n / step;
      for (let i = 0; i < n; i += step) {
        for (let j = 0; j < halfSize; j++) {
          const tableIdx = j * tableStep;
          const c = this.cosTable[tableIdx];
          const s = this.sinTable[tableIdx];

          const oddIdx = i + j + halfSize;
          const tr = c * this.real[oddIdx] - s * this.imag[oddIdx];
          const ti = s * this.real[oddIdx] + c * this.imag[oddIdx];

          const evenIdx = i + j;
          this.real[oddIdx] = this.real[evenIdx] - tr;
          this.imag[oddIdx] = this.imag[evenIdx] - ti;

          this.real[evenIdx] += tr;
          this.imag[evenIdx] += ti;
        }
      }
      halfSize = step;
    }

    // Calculate magnitudes (normalized)
    const halfN = n / 2;
    for (let i = 0; i < halfN; i++) {
      const r = this.real[i];
      const im = this.imag[i];
      this.magnitudes[i] = Math.sqrt(r * r + im * im) / (halfN * 0.5);
    }

    return this.magnitudes;
  }
}

class AudioFrequencyAnalyzer {
  constructor(sampleRate = 44100, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.fft = new FastFourierTransform(bufferSize);

    // State for temporal smoothing
    this.smoothedBars = null;
    this.bassEnergyHistory = [];
    this.currentBassLevel = 0;
    this.kickPulse = 0;
  }

  reset() {
    this.smoothedBars = null;
    this.bassEnergyHistory = [];
    this.currentBassLevel = 0;
    this.kickPulse = 0;
  }

  /**
   * Maps raw FFT linear frequency bins into logarithmic spectrum bars
   * @param {Float32Array} magnitudes 
   * @param {number} barCount e.g. 64, 128, 192
   * @param {number} minFreq e.g. 25 Hz
   * @param {number} maxFreq e.g. 15000 Hz
   * @param {number} smoothing e.g. 0.8
   * @param {number} sensitivity e.g. 1.2
   */
  processSpectrum(magnitudes, barCount = 128, minFreq = 25, maxFreq = 15000, smoothing = 0.82, sensitivity = 1.2) {
    if (!this.smoothedBars || this.smoothedBars.length !== barCount) {
      this.smoothedBars = new Float32Array(barCount);
    }

    const nyquist = this.sampleRate / 2;
    const clampedMaxFreq = Math.min(maxFreq, nyquist);
    const halfN = magnitudes.length;
    const freqBinWidth = nyquist / halfN;

    const rawBars = new Float32Array(barCount);

    // Logarithmic distribution: f(i) = minFreq * (maxFreq / minFreq) ^ (i / barCount)
    const logRatio = Math.log(clampedMaxFreq / minFreq);

    for (let i = 0; i < barCount; i++) {
      const fStart = minFreq * Math.exp(logRatio * (i / barCount));
      const fEnd = minFreq * Math.exp(logRatio * ((i + 1) / barCount));

      const binStart = Math.max(0, Math.min(halfN - 1, Math.floor(fStart / freqBinWidth)));
      const binEnd = Math.max(binStart + 1, Math.min(halfN, Math.ceil(fEnd / freqBinWidth)));

      let sum = 0;
      let count = 0;
      for (let b = binStart; b < binEnd; b++) {
        sum += magnitudes[b];
        count++;
      }
      let avg = count > 0 ? sum / count : 0;

      // Equal loudness compensation curve (boost treble and very low bass slightly)
      const centerFreq = Math.sqrt(fStart * fEnd);
      let eqBoost = 1.0;
      if (centerFreq < 100) {
        eqBoost = 1.5;
      } else if (centerFreq > 3000) {
        eqBoost = 1.0 + (centerFreq - 3000) / 8000 * 2.2;
      }

      // Non-linear perceptual scaling
      let barVal = Math.pow(avg * eqBoost * sensitivity * 4.5, 0.85);
      barVal = Math.min(1.0, Math.max(0.0, barVal));
      rawBars[i] = barVal;
    }

    // Apply temporal smoothing with fast attack & smooth release
    for (let i = 0; i < barCount; i++) {
      const target = rawBars[i];
      const prev = this.smoothedBars[i];
      if (target > prev) {
        // Fast attack: jump up quickly on beat
        this.smoothedBars[i] = prev * 0.35 + target * 0.65;
      } else {
        // Smooth exponential decay
        this.smoothedBars[i] = prev * smoothing + target * (1 - smoothing);
      }
    }

    // Sub-bass & Bass kick detection (25Hz - 140Hz)
    const bassBinEnd = Math.min(halfN - 1, Math.ceil(140 / freqBinWidth));
    let bassEnergy = 0;
    for (let b = 1; b < bassBinEnd; b++) {
      bassEnergy += magnitudes[b];
    }
    bassEnergy = (bassEnergy / bassBinEnd) * sensitivity * 8.0;

    // Moving average of bass energy for dynamic thresholding
    this.bassEnergyHistory.push(bassEnergy);
    if (this.bassEnergyHistory.length > 30) {
      this.bassEnergyHistory.shift();
    }
    const avgBass = this.bassEnergyHistory.reduce((a, b) => a + b, 0) / this.bassEnergyHistory.length;

    // Bass level smoothing
    this.currentBassLevel = this.currentBassLevel * 0.7 + bassEnergy * 0.3;

    // Kick pulse trigger
    const kickRatio = avgBass > 0.05 ? bassEnergy / avgBass : 1.0;
    let targetKick = 0;
    if (kickRatio > 1.35 && bassEnergy > 0.15) {
      targetKick = Math.min(1.0, (kickRatio - 1.35) * 1.5 + (bassEnergy * 0.5));
    }
    this.kickPulse = Math.max(targetKick, this.kickPulse * 0.82);

    return {
      bars: this.smoothedBars,
      bassLevel: Math.min(1.0, this.currentBassLevel),
      kickPulse: this.kickPulse
    };
  }
}

if (typeof module !== 'undefined') {
  module.exports = { FastFourierTransform, AudioFrequencyAnalyzer };
}

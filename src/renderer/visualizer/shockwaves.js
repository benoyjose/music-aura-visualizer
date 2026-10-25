/**
 * Bass Drop Shockwave Ripple System
 * Creates expanding glowing rings on heavy kick / bass transients
 */

class ShockwaveManager {
  constructor() {
    this.ripples = [];
    this.lastSpawnTime = 0;
    this.minInterval = 0.22; // minimum seconds between shockwaves
  }

  reset() {
    this.ripples = [];
    this.lastSpawnTime = 0;
  }

  trigger(currentTime, kickPulse, centerRadius, color = '#ffd700') {
    if (kickPulse > 0.45 && (currentTime - this.lastSpawnTime) > this.minInterval) {
      this.lastSpawnTime = currentTime;
      this.ripples.push({
        birthTime: currentTime,
        startRadius: centerRadius,
        maxExpansion: centerRadius * 2.8,
        lifeDuration: 0.75, // seconds
        progress: 0,
        color
      });
    }
  }

  update(currentTime) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const elapsed = currentTime - r.birthTime;
      r.progress = elapsed / r.lifeDuration;
      if (r.progress >= 1.0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  draw(ctx, centerX, centerY, centerRadius, glowMultiplier = 1.0) {
    if (this.ripples.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      // Ease out cubic expansion
      const ease = 1 - Math.pow(1 - r.progress, 3);
      const currentRadius = r.startRadius + (r.maxExpansion * ease);
      const alpha = Math.max(0, (1 - r.progress) * 0.7);

      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, (1 - r.progress) * 4.5);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;

      if (glowMultiplier > 0.1) {
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 18 * glowMultiplier * (1 - r.progress);
      }

      ctx.stroke();
    }
    ctx.restore();
  }
}

if (typeof module !== 'undefined') {
  module.exports = ShockwaveManager;
}

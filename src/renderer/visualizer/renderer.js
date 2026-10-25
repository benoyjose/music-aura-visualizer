/**
 * Master Visualizer Renderer
 * Renders both live preview and high-resolution export frames (up to 8K)
 */

class VisualizerRenderer {
  constructor() {
    this.cachedBgImage = null;
    this.cachedBgPath = null;
    this.cachedLogoImage = null;
    this.cachedLogoPath = null;
  }

  /**
   * Calculate opacity fade with independent in/out timing & delays
   */
  calcFade(time, dur, inDelay = 0, inDur = 0, outDelay = 0, outDur = 0) {
    if (dur <= 0) return 1.0;
    let alpha = 1.0;
    // Fade In
    if (inDur > 0) {
      if (time < inDelay) alpha = 0.0;
      else if (time < inDelay + inDur) alpha = (time - inDelay) / inDur;
    }
    // Fade Out
    if (outDur > 0) {
      const outStart = dur - outDelay - outDur;
      if (time >= dur - outDelay) alpha = 0.0;
      else if (time >= outStart) alpha = Math.min(alpha, 1.0 - (time - outStart) / outDur);
    }
    return Math.max(0.0, Math.min(1.0, alpha));
  }

  /**
   * Calculate visualizer scale animation (start scale, scale up delay/time, scale down time)
   */
  calcScaleAnim(time, dur, startScale = 1.0, upDelay = 0, upTime = 0, downTime = 0) {
    let scale = 1.0;
    if (upTime > 0) {
      if (time < upDelay) scale = startScale;
      else if (time < upDelay + upTime) {
        const t = (time - upDelay) / upTime;
        scale = startScale + (1.0 - startScale) * t;
      }
    }
    if (downTime > 0 && dur > 0) {
      const downStart = dur - downTime;
      if (time >= downStart) {
        const t = (time - downStart) / downTime;
        scale = scale * Math.max(0.0, 1.0 - t);
      }
    }
    return Math.max(0.0, scale);
  }

  /**
   * Main render function
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} width 
   * @param {number} height 
   * @param {Object} state User configuration parameters
   * @param {Object} audioData { bars, bassLevel, kickPulse }
   * @param {ParticleSystem} particleSystem 
   * @param {ShockwaveManager} shockwaveManager 
   * @param {number} currentTime 
   * @param {number} duration 
   */
  render(ctx, width, height, state, audioData, particleSystem, shockwaveManager, currentTime = 0, duration = 0) {
    // Coordinate scaling factor relative to 1080p standard
    const baseScale = Math.min(width, height) / 1080;
    const isPortrait = height > width;

    // Center coordinates
    const centerX = width * 0.5;
    const centerY = isPortrait ? height * (state.portraitCenterY || 0.44) : height * 0.5;

    const bars = audioData.bars || [];
    const bassLevel = audioData.bassLevel || 0;
    const kickPulse = audioData.kickPulse || 0;

    // 0. Calculate Animations & Opacities
    const videoAlpha = this.calcFade(currentTime, duration,
      state.videoFadeInDelay || 0, state.videoFadeInTime || 0,
      state.videoFadeOutDelay || 0, state.videoFadeOutTime || 0
    );
    const bgAlpha = this.calcFade(currentTime, duration,
      state.bgFadeInDelay || 0, state.bgFadeInTime || 0,
      state.bgFadeOutDelay || 0, state.bgFadeOutTime || 0
    );
    const logoAlpha = this.calcFade(currentTime, duration,
      state.logoFadeInDelay || 0, state.logoFadeInTime || 0,
      state.logoFadeOutDelay || 0, state.logoFadeOutTime || 0
    );
    const visAlpha = this.calcFade(currentTime, duration,
      state.visFadeInDelay || 0, state.visFadeInTime || 0,
      state.visFadeOutDelay || 0, state.visFadeOutTime || 0
    );
    const scaleAnim = this.calcScaleAnim(currentTime, duration,
      state.visStartScale !== undefined ? state.visStartScale : 1.0,
      state.visScaleUpDelay || 0,
      state.visScaleUpTime || 0,
      state.visScaleDownTime || 0
    );

    // 1. Draw Background with Shake & Zoom Pulse (with Background Fade)
    if (bgAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = bgAlpha;
      this.drawBackground(ctx, width, height, state, bassLevel, kickPulse, baseScale, currentTime);
      ctx.restore();
    }

    // 2. Draw Vignette Edge Darkening
    if (state.vignette !== false) {
      this.drawVignette(ctx, width, height, state.vignetteIntensity || 0.6);
    }

    // Transform Coordinates: Positioning Offsets + Sub-bass Twitch
    let visX = centerX + ((state.posXOffset || 0) * (width * 0.01));
    let visY = centerY + ((state.posYOffset || 0) * (height * 0.01));
    const twitchStrength = (state.visTwitch || 0) * baseScale;
    if (twitchStrength > 0 && kickPulse > 0.35) {
      visX += (Math.random() - 0.5) * twitchStrength * kickPulse * 2.0;
      visY += (Math.random() - 0.5) * twitchStrength * kickPulse * 2.0;
    }

    // 3. Center Halo Pulse Aura
    this.drawCenterHalo(ctx, visX, visY, state, bassLevel, kickPulse, baseScale);

    // 4. Update & Draw Audio-Reactive Particles
    const isParticlesOn = state.particles ? state.particles.enabled !== false : state.particlesEnabled !== false;
    if (isParticlesOn && particleSystem) {
      const pRadius = (state.logoRadius || 140) * baseScale;
      particleSystem.draw(ctx, width, height, visX, visY, pRadius, state.color1, state.color2);
    }

    // 5. Draw Shockwave Ripples
    if (state.shockwavesEnabled !== false && shockwaveManager) {
      const sRadius = (state.logoRadius || 140) * baseScale;
      shockwaveManager.trigger(currentTime, kickPulse, sRadius, state.color1);
      shockwaveManager.draw(ctx, visX, visY, sRadius, state.glowIntensity);
    }

    // 6. Draw Visualizer & Center Logo with 3D Transforms, Scale Multipliers & Fades
    ctx.save();
    ctx.translate(visX, visY);

    // 3D Rotations (X pitch, Y yaw, Z roll)
    const rotX = (state.rotX || 0) * (Math.PI / 180);
    const rotY = (state.rotY || 0) * (Math.PI / 180);
    const rotZ = ((state.rotZ || 0) + (state.ringRotation || 0) + (state.visRotationAngle || 0)) * (Math.PI / 180);

    if (rotZ !== 0) ctx.rotate(rotZ);

    // Bass Scale Multiplier
    const bassScaleMultiplier = state.visScaleMultiplier !== undefined ? state.visScaleMultiplier : 1.35;
    const bassZoom = 1.0 + (kickPulse * 0.12 * bassScaleMultiplier) + (bassLevel * 0.05 * bassScaleMultiplier);

    // Independent X & Y Scale multipliers
    const sx = (state.scaleX !== undefined ? state.scaleX : 1.0) * scaleAnim * bassZoom * Math.cos(rotY);
    const sy = (state.scaleY !== undefined ? state.scaleY : 1.0) * scaleAnim * bassZoom * Math.cos(rotX);
    ctx.scale(sx, sy);

    // Draw Master Visualizer (Supports Filled, Outline, Bars, Outline Dots; Circle, Polygon, Linear)
    if (visAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = visAlpha;
      this.drawMasterVisualizer(ctx, 0, 0, state, bars, bassLevel, kickPulse, baseScale);
      ctx.restore();
    }

    // 7. Draw Center Logo / Album Art with Bass Bounce
    if (logoAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = logoAlpha;
      this.drawCenterLogo(ctx, 0, 0, state, kickPulse, baseScale, currentTime, duration);
      ctx.restore();
    }

    ctx.restore(); // Restore transform matrix

    // 8. Draw Typography (Artist Name, Track Title, Channel Watermark)
    this.drawTypography(ctx, width, height, centerX, centerY, state, baseScale, isPortrait);

    // 8b. Draw Audio-Synced Lyrics / Subtitles (Specterr Engine)
    this.drawLyrics(ctx, width, height, centerX, centerY, state, currentTime, baseScale, isPortrait);

    // 8c. Draw Animated YouTube Call-to-Action Badge (Like & Subscribe Animation)
    this.drawYouTubeCta(ctx, width, height, state, currentTime, baseScale, kickPulse);

    // 9. Overall Video Fade In & Fade Out
    if (videoAlpha < 1.0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - videoAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 10. Optional Debug Video Burn-In HUD
    if (state.renderDebugVideo) {
      this.drawDebugOverlay(ctx, width, height, state, audioData, currentTime, duration, baseScale);
    }
  }

  drawBackground(ctx, width, height, state, bassLevel, kickPulse, baseScale, currentTime = 0) {
    ctx.save();

    // Bass Camera Shake & Zoom Pulse
    const shakeIntensity = (state.bassShake || 1.0);
    const zoomPulse = 1.0 + (kickPulse * 0.045 * shakeIntensity) + (bassLevel * 0.015 * shakeIntensity);

    // Subtle random camera jitter on kick
    let shakeX = 0;
    let shakeY = 0;
    if (kickPulse > 0.3 && shakeIntensity > 0) {
      const amp = kickPulse * 7.0 * shakeIntensity * baseScale;
      shakeX = (Math.random() - 0.5) * amp;
      shakeY = (Math.random() - 0.5) * amp;
    }

    // Specterr Camera Drift (Sinusoidal subtle floating motion)
    let driftX = 0;
    let driftY = 0;
    if (state.cameraDrift) {
      const dInt = (state.driftIntensity !== undefined ? state.driftIntensity : 14) * baseScale;
      driftX = Math.sin(currentTime * 0.45) * dInt;
      driftY = Math.cos(currentTime * 0.35) * (dInt * 0.65);
    }

    // Specterr Camera Rumble (Intense earthquake vibration on heavy drops)
    let rumbleX = 0;
    let rumbleY = 0;
    const rumbleFactor = (state.cameraRumble !== undefined ? state.cameraRumble : 20) / 100.0;
    if (rumbleFactor > 0 && (kickPulse > 0.38 || bassLevel > 0.58)) {
      const rAmp = kickPulse * 16.0 * rumbleFactor * baseScale;
      rumbleX = (Math.random() - 0.5) * rAmp;
      rumbleY = (Math.random() - 0.5) * rAmp;
    }

    // Transform canvas for camera zoom, shake, drift & rumble from center
    ctx.translate(width * 0.5 + shakeX + driftX + rumbleX, height * 0.5 + shakeY + driftY + rumbleY);
    ctx.scale(zoomPulse, zoomPulse);
    ctx.translate(-width * 0.5, -height * 0.5);

    if (state.bgImage && state.bgImage.complete && state.bgImage.naturalWidth > 0) {
      const img = state.bgImage;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = width / height;
      const scaleMode = state.bgScaleMode || 'cover';

      let drawW, drawH, drawX, drawY;

      if (scaleMode === 'stretch') {
        drawW = width;
        drawH = height;
        drawX = 0;
        drawY = 0;
      } else if (scaleMode === 'contain') {
        if (imgRatio > canvasRatio) {
          drawW = width;
          drawH = width / imgRatio;
          drawX = 0;
          drawY = (height - drawH) * 0.5;
        } else {
          drawH = height;
          drawW = height * imgRatio;
          drawX = (width - drawW) * 0.5;
          drawY = 0;
        }
      } else {
        // 'cover' fill mode
        if (imgRatio > canvasRatio) {
          drawH = height;
          drawW = height * imgRatio;
          drawX = (width - drawW) * 0.5;
          drawY = 0;
        } else {
          drawW = width;
          drawH = width / imgRatio;
          drawX = 0;
          drawY = (height - drawH) * 0.5;
        }
      }

      // High-performance filter composition
      const blurPx = (state.bgBlur || 0) * baseScale;
      const brightnessVal = state.bgBrightness !== undefined ? state.bgBrightness : 0.65;
      const contrastVal = state.bgContrast !== undefined ? state.bgContrast : 1.0;
      const saturateVal = state.bgSaturate !== undefined ? state.bgSaturate : 1.0;

      let filterStr = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturateVal})`;
      if (blurPx > 0.4) {
        filterStr = `blur(${blurPx}px) ` + filterStr;
      }

      ctx.filter = filterStr;

      // Specterr Backdrop Reflection Modes (None, 2-Way Mirror, 4-Way Kaleidoscope)
      const bgRefl = state.bgReflection || 'none';
      if (bgRefl === '2-way') {
        // Left half
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width * 0.5, height);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Right mirrored half
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.beginPath();
        ctx.rect(0, 0, width * 0.5, height);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else if (bgRefl === '4-way') {
        // Top-left quadrant mirrored across 4 quadrants
        const halfW = width * 0.5;
        const halfH = height * 0.5;
        for (let qx = 0; qx < 2; qx++) {
          for (let qy = 0; qy < 2; qy++) {
            ctx.save();
            ctx.translate(qx === 0 ? 0 : width, qy === 0 ? 0 : height);
            ctx.scale(qx === 0 ? 1 : -1, qy === 0 ? 1 : -1);
            ctx.beginPath();
            ctx.rect(0, 0, halfW, halfH);
            ctx.clip();
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
          }
        }
      } else {
        ctx.drawImage(img, drawX - 10, drawY - 10, drawW + 20, drawH + 20);
      }

      ctx.filter = 'none';

      // Tint overlay if requested
      if (state.bgTint && state.bgTintAlpha > 0) {
        ctx.fillStyle = state.bgTint;
        ctx.globalAlpha = state.bgTintAlpha;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Default sleek dark gradient background
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 50 * baseScale,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, '#121624');
      grad.addColorStop(0.5, '#0b0d17');
      grad.addColorStop(1, '#05060a');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Trap Nation Ground Plane Floor Reflection
    if (state.groundReflection !== false && height <= width) {
      const horizonY = height * 0.68;
      const pulseFactor = 1.0 + kickPulse * 0.35 + bassLevel * 0.15;
      const reflGrad = ctx.createRadialGradient(
        width * 0.5, horizonY, 20 * baseScale,
        width * 0.5, horizonY + (height - horizonY) * 0.5, 450 * baseScale * pulseFactor
      );
      const auraColor = state.color1 || '#ffffff';
      reflGrad.addColorStop(0, this.hexToRgba(auraColor, 0.14 * pulseFactor));
      reflGrad.addColorStop(0.3, 'rgba(0, 160, 255, 0.08)');
      reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = reflGrad;
      ctx.fillRect(0, horizonY, width, height - horizonY);
    }

    ctx.restore();
  }

  drawVignette(ctx, width, height, intensity = 0.6) {
    ctx.save();
    const radius = Math.max(width, height) * 0.72;
    const vignette = ctx.createRadialGradient(
      width * 0.5, height * 0.5, radius * 0.35,
      width * 0.5, height * 0.5, radius
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, `rgba(0, 0, 0, ${intensity * 0.5})`);
    vignette.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawCenterHalo(ctx, centerX, centerY, state, bassLevel, kickPulse, baseScale) {
    const baseRadius = (state.logoRadius || 140) * baseScale;
    const pulseFactor = 1.0 + (kickPulse * 0.25) + (bassLevel * 0.15);
    const haloRadius = baseRadius * 1.85 * pulseFactor;

    ctx.save();
    const halo = ctx.createRadialGradient(
      centerX, centerY, baseRadius * 0.7,
      centerX, centerY, haloRadius
    );

    const primaryColor = state.color1 || '#ffd700';
    halo.addColorStop(0, this.hexToRgba(primaryColor, 0.35 * (state.glowIntensity || 1.0)));
    halo.addColorStop(0.5, this.hexToRgba(primaryColor, 0.12 * (state.glowIntensity || 1.0)));
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Universal Master Visualizer Dispatcher
   * Fully configurable:
   * - Styles: Filled, Outline, Bars, Outline Dots
   * - Shapes: Circle, Polygon, Linear
   * - Placements: Top & Bottom, Top only, Bottom only
   * - Audio Mapping: Bass, Treble, None
   * - Graph Repeat: 1x, 2x, 3x, 4x
   * - Curve Smoothing: On/Off (Catmull-Rom spline vs polyline)
   */
  drawMasterVisualizer(ctx, centerX, centerY, state, bars, bassLevel, kickPulse, baseScale) {
    if (!bars || bars.length === 0) return;

    // Check if legacy mode double-ring is explicitly selected
    if (state.visualizerStyle === 'double-ring') {
      this.drawDoubleRing(ctx, centerX, centerY, state, bars, bassLevel, kickPulse, baseScale);
      return;
    }

    ctx.save();

    // 1. Resolve configuration options
    const shape = state.visShape || (state.visualizerShape || 'circle'); // 'circle' | 'polygon' | 'linear'
    const style = state.visStyle || (state.visualizerStyle === 'bars' ? 'bars' : 'filled'); // 'filled' | 'outline' | 'bars' | 'dots'
    const placement = state.visPlacement || 'top-bottom'; // 'top-bottom' | 'top-only' | 'bottom-only'
    const audioMapping = state.audioMapping || 'bass'; // 'bass' | 'treble' | 'none'
    const graphRepeat = Math.max(1, Math.min(4, parseInt(state.graphRepeat || 1)));
    const segmentCount = Math.max(16, Math.min(512, parseInt(state.segmentCount || state.barCount || 128)));
    const curveSmoothing = state.curveSmoothing !== false;
    const polygonSides = Math.max(3, Math.min(12, parseInt(state.polygonSides || 6)));

    // Dimensions
    const baseRadius = (state.minRadius !== undefined ? state.minRadius : (state.logoRadius || 140)) * baseScale;
    const logoInset = (state.logoInset || 0) * baseScale;
    const innerRadius = Math.max(10, baseRadius + logoInset);
    const maxExcursion = (state.maxRadius !== undefined ? state.maxRadius : (state.barMaxHeight || 170)) * baseScale;
    const minHeight = (state.barMinHeight || 6) * baseScale;
    const barWidth = Math.max(2, (state.barWidth || 5) * baseScale);
    const glow = state.glowIntensity !== undefined ? state.glowIntensity : 1.0;
    const isChroma = state.chromaticAberration !== false;
    const chromaStrength = (state.chromaticIntensity !== undefined ? state.chromaticIntensity : 1.0) * baseScale;

    const color1 = state.color1 || '#ffffff';
    const color2 = state.color2 || '#ffffff';

    // 2. Resample and Map Audio Frequencies
    const ptsPerRepeat = Math.floor(segmentCount / graphRepeat);
    const mappedBlock = new Float32Array(ptsPerRepeat);
    const inCount = bars.length;

    if (audioMapping === 'none') {
      // Sequential sweep (unmirrored)
      for (let i = 0; i < ptsPerRepeat; i++) {
        const srcIdx = Math.min(inCount - 1, Math.floor((i / ptsPerRepeat) * inCount));
        mappedBlock[i] = bars[srcIdx] || 0;
      }
    } else {
      // Mirrored sweep
      const halfM = Math.floor(ptsPerRepeat / 2);
      for (let i = 0; i < halfM; i++) {
        const srcIdx = Math.min(inCount - 1, Math.floor((i / halfM) * inCount));
        const val = bars[srcIdx] || 0;
        if (audioMapping === 'bass') {
          // Bass in center, treble at edges
          mappedBlock[halfM - 1 - i] = val;
          mappedBlock[halfM + i] = val;
        } else {
          // Treble in center, bass at edges
          mappedBlock[i] = val;
          mappedBlock[ptsPerRepeat - 1 - i] = val;
        }
      }
    }

    // Invert Spectrum Option (Swap Lows and Highs)
    if (state.invertSpectrum) {
      mappedBlock.reverse();
    }

    // Gaussian smoothing across adjacent frequencies
    const smoothedBlock = new Float32Array(ptsPerRepeat);
    for (let i = 0; i < ptsPerRepeat; i++) {
      const p2 = mappedBlock[Math.max(0, i - 2)];
      const p1 = mappedBlock[Math.max(0, i - 1)];
      const c  = mappedBlock[i];
      const n1 = mappedBlock[Math.min(ptsPerRepeat - 1, i + 1)];
      const n2 = mappedBlock[Math.min(ptsPerRepeat - 1, i + 2)];
      smoothedBlock[i] = p2 * 0.08 + p1 * 0.22 + c * 0.40 + n1 * 0.22 + n2 * 0.08;
    }

    // Specterr Advanced Reflection Modes: 'none' | 'vertical' (2-way) | 'across' | '3-way' | '4-way'
    const refl = state.visReflection || (audioMapping !== 'none' ? 'vertical' : 'none');
    if (refl === 'vertical' || refl === '2-way') {
      const halfM = Math.floor(ptsPerRepeat / 2);
      for (let i = 0; i < halfM; i++) {
        smoothedBlock[ptsPerRepeat - 1 - i] = smoothedBlock[i];
      }
    } else if (refl === 'across') {
      const halfM = Math.floor(ptsPerRepeat / 2);
      for (let i = 0; i < halfM; i++) {
        smoothedBlock[halfM + i] = smoothedBlock[halfM - 1 - i];
      }
    } else if (refl === '3-way') {
      const third = Math.floor(ptsPerRepeat / 3);
      for (let i = 0; i < third; i++) {
        smoothedBlock[third + i] = smoothedBlock[i];
        smoothedBlock[third * 2 + i] = smoothedBlock[i];
      }
    } else if (refl === '4-way') {
      const quarter = Math.floor(ptsPerRepeat / 4);
      for (let i = 0; i < quarter; i++) {
        smoothedBlock[quarter * 2 - 1 - i] = smoothedBlock[i];
        smoothedBlock[quarter * 2 + i] = smoothedBlock[i];
        smoothedBlock[ptsPerRepeat - 1 - i] = smoothedBlock[i];
      }
    }

    // Assemble full repeated profile
    const fullProfile = new Float32Array(segmentCount);
    for (let r = 0; r < graphRepeat; r++) {
      for (let i = 0; i < ptsPerRepeat; i++) {
        const idx = r * ptsPerRepeat + i;
        if (idx < segmentCount) fullProfile[idx] = smoothedBlock[i];
      }
    }

    // Helper: trace Catmull-Rom or polyline path
    const tracePath = (pts, isClosed = true) => {
      ctx.beginPath();
      const len = pts.length;
      if (len === 0) return;
      ctx.moveTo(pts[0].x, pts[0].y);

      if (curveSmoothing && len >= 4) {
        // Catmull-Rom cubic spline
        for (let i = 0; i < len; i++) {
          if (!isClosed && i === len - 1) break;
          const p0 = pts[(i - 1 + len) % len];
          const p1 = pts[i];
          const p2 = pts[(i + 1) % len];
          const p3 = pts[(i + 2) % len];

          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      } else {
        // Polyline / straight segments
        for (let i = 1; i < len; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      if (isClosed) ctx.closePath();
    };

    // -------------------------------------------------------------
    // SHAPE 1 & 2: CIRCLE and POLYGON (Polar Coordinates)
    // -------------------------------------------------------------
    if (shape === 'circle' || shape === 'polygon') {
      let angleStart = -Math.PI;
      let angleRange = Math.PI * 2;
      let isClosed = true;

      if (placement === 'top-only') {
        angleStart = -Math.PI;
        angleRange = Math.PI;
        isClosed = false;
      } else if (placement === 'bottom-only') {
        angleStart = 0;
        angleRange = Math.PI;
        isClosed = false;
      }

      const angleStep = angleRange / (isClosed ? segmentCount : (segmentCount - 1));
      const polyStep = (Math.PI * 2) / polygonSides;

      const isInward = (state.visDirection === 'inward');
      const buildPoints = (scaleR = 1.0, offX = 0, offY = 0) => {
        const outerPts = [];
        const basePts = [];

        for (let i = 0; i < segmentCount; i++) {
          const angle = angleStart + i * angleStep;
          let rBase = innerRadius;

          if (shape === 'polygon') {
            const phi = ((angle + Math.PI * 2) % polyStep) - (polyStep * 0.5);
            rBase = innerRadius * (Math.cos(Math.PI / polygonSides) / Math.cos(phi));
          }

          // Sub-bass 4-lobe squircle resonance
          const lobe = Math.pow(Math.sin(angle * 2), 2) * (kickPulse * 24.0 * baseScale + bassLevel * 12.0 * baseScale);
          const val = fullProfile[i];

          let rOuter;
          if (isInward) {
            // Specterr Inward visualizer: waves radiate inward toward center hole
            const excursion = minHeight + (val * maxExcursion) + lobe;
            rOuter = Math.max(rBase * 0.12, rBase - excursion) * scaleR;
          } else {
            rOuter = (rBase + minHeight + (val * maxExcursion) + lobe) * scaleR;
          }

          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          basePts.push({ x: centerX + offX + cosA * rBase, y: centerY + offY + sinA * rBase });
          outerPts.push({ x: centerX + offX + cosA * rOuter, y: centerY + offY + sinA * rOuter });
        }
        return { outerPts, basePts };
      };

      // -------------------------------------------------------------
      // Specterr Multi-Layer Waves (Layer 2 Backdrop & Layer 3 Accent)
      // -------------------------------------------------------------
      if (state.waveLayers && state.waveLayers.layer2 && state.waveLayers.layer2.enabled) {
        const l2 = state.waveLayers.layer2;
        ctx.save();
        ctx.globalAlpha = (l2.opacity !== undefined ? l2.opacity : 0.65) * (ctx.globalAlpha || 1.0);
        const l2Scale = l2.scale !== undefined ? l2.scale : 1.15;
        const l2Color = l2.color || '#ff007f';
        const { outerPts: l2Pts } = buildPoints(l2Scale);

        if (l2.transparent) {
          ctx.lineWidth = Math.max(1.5, (l2.outlineWidth || 3) * baseScale);
          ctx.strokeStyle = l2Color;
          tracePath(l2Pts, isClosed);
          ctx.stroke();
        } else {
          tracePath(l2Pts, isClosed);
          ctx.fillStyle = l2Color;
          ctx.fill();
        }
        ctx.restore();
      }

      if (state.waveLayers && state.waveLayers.layer3 && state.waveLayers.layer3.enabled) {
        const l3 = state.waveLayers.layer3;
        ctx.save();
        ctx.globalAlpha = (l3.opacity !== undefined ? l3.opacity : 0.50) * (ctx.globalAlpha || 1.0);
        const l3Scale = l3.scale !== undefined ? l3.scale : 0.88;
        const l3Color = l3.color || '#00e5ff';
        const { outerPts: l3Pts } = buildPoints(l3Scale);

        if (l3.transparent) {
          ctx.lineWidth = Math.max(1.5, (l3.outlineWidth || 2.5) * baseScale);
          ctx.strokeStyle = l3Color;
          tracePath(l3Pts, isClosed);
          ctx.stroke();
        } else {
          tracePath(l3Pts, isClosed);
          ctx.fillStyle = l3Color;
          ctx.fill();
        }
        ctx.restore();
      }

      // RENDER STYLE: BARS
      if (style === 'bars') {
        ctx.lineWidth = barWidth;
        ctx.lineCap = state.barCap || 'round';
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 14 * glow * baseScale;
        }
        const { outerPts, basePts } = buildPoints(1.0);
        for (let i = 0; i < segmentCount; i++) {
          const t = i / segmentCount;
          ctx.strokeStyle = this.lerpColor(color1, color2, t);
          ctx.beginPath();
          ctx.moveTo(basePts[i].x, basePts[i].y);
          ctx.lineTo(outerPts[i].x, outerPts[i].y);
          ctx.stroke();
        }
      }

      // RENDER STYLE: OUTLINE DOTS
      else if (style === 'dots') {
        const dotRadius = Math.max(2, (state.dotSize || 4) * baseScale);
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 16 * glow * baseScale;
        }
        const { outerPts } = buildPoints(1.0);
        for (let i = 0; i < segmentCount; i++) {
          const t = i / segmentCount;
          ctx.fillStyle = this.lerpColor(color1, color2, t);
          ctx.beginPath();
          ctx.arc(outerPts[i].x, outerPts[i].y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // RENDER STYLE: OUTLINE
      else if (style === 'outline') {
        ctx.lineWidth = barWidth;
        ctx.lineCap = state.barCap || 'round';

        // Chromatic Aberration
        if (isChroma && chromaStrength > 0.05) {
          const shift = 3.5 * chromaStrength;
          // Red
          const { outerPts: redPts } = buildPoints(1.018, shift, -shift * 0.25);
          tracePath(redPts, isClosed);
          ctx.strokeStyle = 'rgba(255, 30, 80, 0.7)';
          ctx.stroke();
          // Cyan
          const { outerPts: cyanPts } = buildPoints(1.018, -shift, shift * 0.25);
          tracePath(cyanPts, isClosed);
          ctx.strokeStyle = 'rgba(0, 220, 255, 0.7)';
          ctx.stroke();
        }

        // Main outline
        const { outerPts: mainPts } = buildPoints(1.0, 0, 0);
        tracePath(mainPts, isClosed);
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 16 * glow * baseScale;
        }
        ctx.strokeStyle = color1;
        ctx.stroke();
      }

      // RENDER STYLE: FILLED (Authentic Trap Nation Fluid Wave / Squircle)
      else {
        // Chromatic fringe passes
        if (isChroma && chromaStrength > 0.05) {
          const shift = 3.6 * chromaStrength;
          // Red
          const { outerPts: redPts } = buildPoints(1.018, shift, -shift * 0.25);
          tracePath(redPts, isClosed);
          ctx.fillStyle = 'rgba(255, 30, 80, 0.65)';
          ctx.fill();
          // Cyan
          const { outerPts: cyanPts } = buildPoints(1.018, -shift, shift * 0.25);
          tracePath(cyanPts, isClosed);
          ctx.fillStyle = 'rgba(0, 220, 255, 0.65)';
          ctx.fill();
          // Yellow edge
          const { outerPts: yellowPts } = buildPoints(1.026, 0, -shift * 0.45);
          tracePath(yellowPts, isClosed);
          ctx.lineWidth = Math.max(2, 3.2 * baseScale);
          ctx.strokeStyle = 'rgba(255, 235, 45, 0.55)';
          ctx.stroke();
        }

        // Main solid wave
        const { outerPts: mainPts, basePts } = buildPoints(1.0, 0, 0);
        if (isClosed) {
          tracePath(mainPts, true);
        } else {
          // Open semi-circle filled to baseline
          ctx.beginPath();
          ctx.moveTo(basePts[0].x, basePts[0].y);
          for (let i = 0; i < mainPts.length; i++) ctx.lineTo(mainPts[i].x, mainPts[i].y);
          for (let i = basePts.length - 1; i >= 0; i--) ctx.lineTo(basePts[i].x, basePts[i].y);
          ctx.closePath();
        }

        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 18 * glow * baseScale;
        }

        if (state.waveFillMode === 'gradient') {
          const grad = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, innerRadius + maxExcursion);
          grad.addColorStop(0, color1);
          grad.addColorStop(1, color2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          ctx.fillStyle = color1;
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Punch out center hole cleanly
        if (isClosed && shape === 'circle') {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (isClosed && shape === 'polygon') {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          for (let i = 0; i < basePts.length; i++) {
            if (i === 0) ctx.moveTo(basePts[i].x, basePts[i].y);
            else ctx.lineTo(basePts[i].x, basePts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // -------------------------------------------------------------
    // SHAPE 3: LINEAR (Horizontal Wave / Spectrum Baseline)
    // -------------------------------------------------------------
    else if (shape === 'linear') {
      const lineW = (state.linearWidth || 1080) * baseScale;
      const xStart = centerX - lineW * 0.5;
      const stepX = lineW / (segmentCount - 1);

      let yBase = centerY;
      if (placement === 'top-only') yBase = centerY - innerRadius;
      else if (placement === 'bottom-only') yBase = centerY + innerRadius;

      const topPts = [];
      const botPts = [];
      const basePts = [];

      for (let i = 0; i < segmentCount; i++) {
        const px = xStart + i * stepX;
        const val = fullProfile[i];
        const h = minHeight + val * maxExcursion;

        basePts.push({ x: px, y: yBase });
        topPts.push({ x: px, y: yBase - h });
        botPts.push({ x: px, y: yBase + h });
      }

      if (style === 'bars') {
        ctx.lineWidth = barWidth;
        ctx.lineCap = state.barCap || 'round';
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 14 * glow * baseScale;
        }
        for (let i = 0; i < segmentCount; i++) {
          const t = i / segmentCount;
          ctx.strokeStyle = this.lerpColor(color1, color2, t);
          if (placement === 'bottom-only') {
            ctx.beginPath(); ctx.moveTo(basePts[i].x, basePts[i].y); ctx.lineTo(botPts[i].x, botPts[i].y); ctx.stroke();
          } else if (placement === 'top-only') {
            ctx.beginPath(); ctx.moveTo(basePts[i].x, basePts[i].y); ctx.lineTo(topPts[i].x, topPts[i].y); ctx.stroke();
          } else {
            // Top and Bottom dual
            ctx.beginPath(); ctx.moveTo(topPts[i].x, topPts[i].y); ctx.lineTo(botPts[i].x, botPts[i].y); ctx.stroke();
          }
        }
      } else if (style === 'dots') {
        const dotRadius = Math.max(2, (state.dotSize || 4) * baseScale);
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 16 * glow * baseScale;
        }
        for (let i = 0; i < segmentCount; i++) {
          const t = i / segmentCount;
          ctx.fillStyle = this.lerpColor(color1, color2, t);
          if (placement !== 'bottom-only') {
            ctx.beginPath(); ctx.arc(topPts[i].x, topPts[i].y, dotRadius, 0, Math.PI * 2); ctx.fill();
          }
          if (placement !== 'top-only') {
            ctx.beginPath(); ctx.arc(botPts[i].x, botPts[i].y, dotRadius, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (style === 'outline') {
        ctx.lineWidth = barWidth;
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 16 * glow * baseScale;
        }
        ctx.strokeStyle = color1;
        if (placement !== 'bottom-only') { tracePath(topPts, false); ctx.stroke(); }
        if (placement !== 'top-only') { tracePath(botPts, false); ctx.stroke(); }
      } else {
        // Filled Linear Wave
        if (glow > 0.1) {
          ctx.shadowColor = color1;
          ctx.shadowBlur = 16 * glow * baseScale;
        }
        ctx.fillStyle = color1;

        if (placement === 'top-bottom') {
          ctx.beginPath();
          ctx.moveTo(topPts[0].x, topPts[0].y);
          for (let i = 1; i < segmentCount; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
          for (let i = segmentCount - 1; i >= 0; i--) ctx.lineTo(botPts[i].x, botPts[i].y);
          ctx.closePath();
          ctx.fill();
        } else if (placement === 'top-only') {
          ctx.beginPath();
          ctx.moveTo(basePts[0].x, basePts[0].y);
          for (let i = 0; i < segmentCount; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
          ctx.lineTo(basePts[segmentCount - 1].x, basePts[segmentCount - 1].y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(basePts[0].x, basePts[0].y);
          for (let i = 0; i < segmentCount; i++) ctx.lineTo(botPts[i].x, botPts[i].y);
          ctx.lineTo(basePts[segmentCount - 1].x, basePts[segmentCount - 1].y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Trap Nation Fluid Wave (Official Continuous Organic Squircle Contour)
   * Authentic YouTube style: Solid filled white liquid wave with chromatic prism rim
   */
  drawFluidWave(ctx, centerX, centerY, state, bars, bassLevel, kickPulse, baseScale) {
    if (!bars || bars.length === 0) return;

    ctx.save();
    const innerRadius = (state.logoRadius || 140) * baseScale + ((state.barGap || 2) * baseScale);
    const maxHeight = (state.barMaxHeight || 170) * baseScale;
    const minHeight = (state.barMinHeight || 10) * baseScale;
    const glow = state.glowIntensity !== undefined ? state.glowIntensity : 1.0;
    const isChroma = state.chromaticAberration !== false;
    const chromaStrength = (state.chromaticIntensity !== undefined ? state.chromaticIntensity : 1.0) * baseScale;

    // Trap Nation Symmetrical Mirrored Profile (Left mirrors Right)
    const numPoints = 128;
    const halfPoints = numPoints / 2;
    const smoothedBars = new Float32Array(halfPoints);
    const barCount = bars.length;

    // Resample bars and apply Gaussian smoothing across adjacent frequencies
    for (let i = 0; i < halfPoints; i++) {
      const srcIdx = Math.floor((i / halfPoints) * barCount);
      const p2 = bars[Math.max(0, srcIdx - 2)] || 0;
      const p1 = bars[Math.max(0, srcIdx - 1)] || 0;
      const c = bars[srcIdx] || 0;
      const n1 = bars[Math.min(barCount - 1, srcIdx + 1)] || 0;
      const n2 = bars[Math.min(barCount - 1, srcIdx + 2)] || 0;
      smoothedBars[i] = p2 * 0.08 + p1 * 0.22 + c * 0.40 + n1 * 0.22 + n2 * 0.08;
    }

    // Mirror to full 360-degree profile
    const fullProfile = new Float32Array(numPoints);
    for (let i = 0; i < halfPoints; i++) {
      fullProfile[i] = smoothedBars[i];
      fullProfile[numPoints - 1 - i] = smoothedBars[i];
    }

    const baseRotation = (state.ringRotation || 0) * (Math.PI / 180);
    const angleStep = (Math.PI * 2) / numPoints;

    // Helper to generate coordinates for Catmull-Rom spline
    const buildContourPoints = (rScale = 1.0, extraPad = 0, offX = 0, offY = 0) => {
      const pts = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = baseRotation - (Math.PI * 0.5) + (i * angleStep);
        // Characteristic Trap Nation 4-lobe squircle resonance on kicks and sub-bass
        const lobe = Math.pow(Math.sin(angle * 2), 2) * (kickPulse * 26.0 * baseScale + bassLevel * 14.0 * baseScale);
        const val = fullProfile[i];
        const r = (innerRadius + minHeight + (val * maxHeight) + lobe + extraPad) * rScale;
        pts.push({
          x: centerX + offX + Math.cos(angle) * r,
          y: centerY + offY + Math.sin(angle) * r
        });
      }
      return pts;
    };

    // Trace smooth continuous closed Catmull-Rom spline
    const traceClosedSpline = (pts) => {
      ctx.beginPath();
      const len = pts.length;
      ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 0; i < len; i++) {
        const p0 = pts[(i - 1 + len) % len];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % len];
        const p3 = pts[(i + 2) % len];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.closePath();
    };

    // 1. Chromatic Aberration / Rainbow Prism Rim
    if (isChroma && chromaStrength > 0.05) {
      const shift = 3.6 * chromaStrength;

      // Red/Magenta Fringe Pass (+shift, -shift * 0.25)
      const redPts = buildContourPoints(1.018, 0, shift, -shift * 0.25);
      traceClosedSpline(redPts);
      ctx.fillStyle = 'rgba(255, 30, 80, 0.65)';
      ctx.fill();

      // Cyan/Blue Fringe Pass (-shift, +shift * 0.25)
      const cyanPts = buildContourPoints(1.018, 0, -shift, shift * 0.25);
      traceClosedSpline(cyanPts);
      ctx.fillStyle = 'rgba(0, 220, 255, 0.65)';
      ctx.fill();

      // Yellow/Green Fringe Outer Edge Pass
      const yellowPts = buildContourPoints(1.026, 0, 0, -shift * 0.45);
      traceClosedSpline(yellowPts);
      ctx.lineWidth = Math.max(2, 3.2 * baseScale);
      ctx.strokeStyle = 'rgba(255, 235, 45, 0.55)';
      ctx.stroke();
    }

    // 2. Main Fluid Wave Body
    const mainPts = buildContourPoints(1.0, 0, 0, 0);
    traceClosedSpline(mainPts);

    const primaryColor = state.color1 || '#ffffff';
    if (glow > 0.1) {
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 18 * glow * baseScale;
    }

    if (state.waveFillMode === 'gradient') {
      const grad = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, innerRadius + maxHeight);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, state.color2 || '#00d4ff');
      ctx.fillStyle = grad;
      ctx.fill();
    } else if (state.waveFillMode === 'outline') {
      ctx.lineWidth = Math.max(3, 5 * baseScale);
      ctx.strokeStyle = primaryColor;
      ctx.stroke();
    } else {
      // Authentic solid white contour (Trap Nation signature)
      ctx.fillStyle = primaryColor;
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // 3. Punch Out Center Disc cleanly so Emblem sits snug
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Concentric Double Ring Visualizer Mode
   */
  drawDoubleRing(ctx, centerX, centerY, state, bars, bassLevel, kickPulse, baseScale) {
    if (!bars || bars.length === 0) return;

    ctx.save();
    const innerRadius = (state.logoRadius || 140) * baseScale + ((state.barGap || 8) * baseScale);
    const maxHeight = (state.barMaxHeight || 180) * baseScale;
    const minHeight = (state.barMinHeight || 6) * baseScale;
    const glow = (state.glowIntensity || 1.0);
    const color1 = state.color1 || '#ffd700';
    const color2 = state.color2 || '#ff5500';

    const count = 96;
    const angleStep = (Math.PI * 2) / count;

    ctx.lineWidth = Math.max(2, 3.5 * baseScale);
    if (glow > 0.1) {
      ctx.shadowColor = color1;
      ctx.shadowBlur = 12 * glow * baseScale;
    }

    // Outer and Inner Rings
    const r1 = innerRadius + minHeight + bassLevel * 20 * baseScale;
    const r2 = innerRadius + minHeight + maxHeight * 0.65 + kickPulse * 30 * baseScale;

    // Connecting filaments
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const val = bars[i % bars.length] || 0;
      const extR = r1 + val * (r2 - r1);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.strokeStyle = this.lerpColor(color1, color2, val);
      ctx.beginPath();
      ctx.moveTo(centerX + cosA * r1, centerY + sinA * r1);
      ctx.lineTo(centerX + cosA * extR, centerY + sinA * extR);
      ctx.stroke();
    }

    // Concentric outline arcs
    ctx.strokeStyle = color1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawSpectrumBars(ctx, centerX, centerY, state, bars, baseScale) {
    if (!bars || bars.length === 0) return;

    ctx.save();
    const barCount = bars.length;
    const innerRadius = (state.logoRadius || 140) * baseScale + ((state.barGap || 8) * baseScale);
    const maxBarHeight = (state.barMaxHeight || 180) * baseScale;
    const minBarHeight = (state.barMinHeight || 6) * baseScale;
    const barWidth = Math.max(2, (state.barWidth || 5) * baseScale);
    const glow = (state.glowIntensity || 1.0);
    const color1 = state.color1 || '#ffd700';
    const color2 = state.color2 || '#ff5500';

    ctx.lineWidth = barWidth;
    ctx.lineCap = state.barCap || 'round';

    if (glow > 0.1) {
      ctx.shadowColor = color1;
      ctx.shadowBlur = 14 * glow * baseScale;
    }

    // Trap Nation style: Mirrored symmetry (Left mirrors Right)
    // 0 to PI on right, 0 to -PI on left
    const halfCount = Math.floor(barCount / 2);
    const angleStep = Math.PI / halfCount;
    const baseRotation = (state.ringRotation || 0) * (Math.PI / 180);

    // Create gradient
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;

      for (let i = 0; i < halfCount; i++) {
        const val = bars[i] || 0;
        const currentHeight = minBarHeight + val * maxBarHeight;

        // Angle starting from top/bottom
        // In Trap Nation, bass starts at bottom or top
        const angle = baseRotation + (Math.PI * 0.5) + (sign * i * angleStep);

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const xStart = centerX + cosA * innerRadius;
        const yStart = centerY + sinA * innerRadius;

        const xEnd = centerX + cosA * (innerRadius + currentHeight);
        const yEnd = centerY + sinA * (innerRadius + currentHeight);

        // Color interpolation between color1 and color2 along the frequency range
        const t = i / halfCount;
        const barColor = this.lerpColor(color1, color2, t);

        ctx.strokeStyle = barColor;
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawCenterLogo(ctx, centerX, centerY, state, kickPulse, baseScale, currentTime, duration) {
    ctx.save();

    const baseRadius = (state.logoRadius || 140) * baseScale;
    const bounceStrength = state.logoBounce !== undefined ? state.logoBounce : 1.0;
    // Dynamic bass bounce scale
    const bounceScale = 1.0 + (kickPulse * 0.14 * bounceStrength);
    const currentRadius = baseRadius * bounceScale;

    const borderWidth = (state.borderWidth || 6) * baseScale;
    const borderColor = state.borderColor || state.color1 || '#ffd700';
    const glow = state.glowIntensity || 1.0;

    // Specterr Logo Glow (Radiant pulsing bloom behind center emblem)
    if (state.logoGlow !== false) {
      const lgScale = (state.logoGlowScale !== undefined ? state.logoGlowScale : 1.35) + (kickPulse * 0.22);
      const lgColor = state.logoGlowColor || state.color1 || '#00e5ff';
      const lgRadius = currentRadius * lgScale;
      const grad = ctx.createRadialGradient(centerX, centerY, currentRadius * 0.72, centerX, centerY, lgRadius);
      grad.addColorStop(0, this.hexToRgba(lgColor, 0.70 * glow));
      grad.addColorStop(0.55, this.hexToRgba(lgColor, 0.25 * glow));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, lgRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing border shadow
    if (glow > 0.1) {
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 20 * glow * baseScale;
    }

    // Draw Outer Border Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Circular Progress Arc (if enabled)
    if (state.showProgressRing !== false && duration > 0) {
      const progress = Math.min(1.0, Math.max(0.0, currentTime / duration));
      const progAngle = -Math.PI * 0.5 + progress * (Math.PI * 2);

      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius + (borderWidth * 0.8), -Math.PI * 0.5, progAngle);
      ctx.lineWidth = Math.max(2, borderWidth * 0.45);
      ctx.strokeStyle = state.color2 || '#ffffff';
      ctx.stroke();
    }

    // Check Logo Mode: 'custom', 'preset', or 'none' (Hollow Ring)
    const logoMode = state.logoMode || (state.logoImage ? 'custom' : 'preset');

    if (logoMode === 'none') {
      // No Logo / Album Art: Hollow Center Mode
      if (state.hollowCoreDisc) {
        // Optional translucent dark disc
        ctx.fillStyle = state.hollowCoreDiscColor || 'rgba(12, 16, 26, 0.45)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius - (borderWidth * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Clip inner circle for logo / album art
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius - (borderWidth * 0.4), 0, Math.PI * 2);
    ctx.clip();

    if (logoMode === 'custom' && state.logoImage && state.logoImage.complete && state.logoImage.naturalWidth > 0) {
      const img = state.logoImage;
      const size = (currentRadius - borderWidth * 0.4) * 2;
      ctx.drawImage(img, centerX - size * 0.5, centerY - size * 0.5, size, size);
    } else if (state.presetLogoImage && state.presetLogoImage.complete && state.presetLogoImage.naturalWidth > 0) {
      // Use loaded preset emblem image
      const img = state.presetLogoImage;
      const size = (currentRadius - borderWidth * 0.4) * 2;
      ctx.drawImage(img, centerX - size * 0.5, centerY - size * 0.5, size, size);
    } else {
      // Default stylized EDM emblem
      ctx.fillStyle = '#0f121d';
      ctx.fillRect(centerX - currentRadius, centerY - currentRadius, currentRadius * 2, currentRadius * 2);

      // Geometric triangle / nation emblem
      ctx.beginPath();
      const triH = currentRadius * 0.85;
      const triW = currentRadius * 0.85;
      ctx.moveTo(centerX - triW * 0.5, centerY - triH * 0.35);
      ctx.lineTo(centerX + triW * 0.5, centerY - triH * 0.35);
      ctx.lineTo(centerX, centerY + triH * 0.55);
      ctx.closePath();
      ctx.fillStyle = '#171c2b';
      ctx.fill();
      ctx.lineWidth = 3 * baseScale;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      // Inner soundwave icon
      ctx.beginPath();
      ctx.moveTo(centerX - 35 * baseScale, centerY);
      ctx.lineTo(centerX - 15 * baseScale, centerY);
      ctx.lineTo(centerX - 8 * baseScale, centerY - 25 * baseScale);
      ctx.lineTo(centerX, centerY + 20 * baseScale);
      ctx.lineTo(centerX + 8 * baseScale, centerY - 18 * baseScale);
      ctx.lineTo(centerX + 15 * baseScale, centerY);
      ctx.lineTo(centerX + 35 * baseScale, centerY);
      ctx.lineWidth = 3.5 * baseScale;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  drawTypography(ctx, width, height, centerX, centerY, state, baseScale, isPortrait) {
    if (state.showText === false) return;

    ctx.save();
    const artist = (state.artistName || 'ARTIST NAME').toUpperCase();
    const title = (state.trackTitle || 'TRACK TITLE').toUpperCase();
    const watermark = (state.watermarkText || 'TRAP NATION').toUpperCase();

    // Shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 12 * baseScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3 * baseScale;
    ctx.textAlign = 'center';

    const logoR = (state.logoRadius || 140) * baseScale;
    const maxBar = (state.barMaxHeight || 180) * baseScale;

    let textStartY;
    if (isPortrait) {
      // In portrait, place text comfortably below the visualizer ring
      textStartY = centerY + logoR + maxBar * 0.45 + (60 * baseScale);
    } else {
      // In landscape, place text below the visualizer ring
      textStartY = centerY + logoR + maxBar * 0.5 + (45 * baseScale);
    }

    // 1. Artist Name (Bold & Punchy)
    const artistSize = Math.max(14, (state.artistFontSize || 36) * baseScale);
    ctx.font = `800 ${artistSize}px "Montserrat", "Segoe UI", sans-serif`;
    ctx.fillStyle = state.artistColor || '#ffffff';
    ctx.letterSpacing = `${4 * baseScale}px`;
    ctx.fillText(artist, centerX, textStartY);

    // 2. Track Title (Slightly lighter weight & contrasting color)
    const titleSize = Math.max(12, (state.titleFontSize || 26) * baseScale);
    ctx.font = `600 ${titleSize}px "Montserrat", "Segoe UI", sans-serif`;
    ctx.fillStyle = state.titleColor || state.color1 || '#ffd700';
    ctx.letterSpacing = `${3 * baseScale}px`;
    ctx.fillText(title, centerX, textStartY + (artistSize * 1.15));

    // 3. Channel Watermark / Branding Text
    if (state.showWatermark !== false && watermark) {
      const wmSize = Math.max(10, (state.watermarkFontSize || 16) * baseScale);
      ctx.font = `700 ${wmSize}px "Montserrat", "Segoe UI", sans-serif`;
      ctx.fillStyle = state.watermarkColor || 'rgba(255, 255, 255, 0.45)';
      ctx.letterSpacing = `${6 * baseScale}px`;

      let wmY;
      if (isPortrait) {
        wmY = height - (50 * baseScale);
      } else {
        wmY = height - (35 * baseScale);
      }
      ctx.fillText(watermark, centerX, wmY);
    }

    ctx.restore();
  }

  /**
   * Audio-Synced Lyrics Engine (Specterr-style)
   * Supports timestamped LRC format [mm:ss.xx] or line-by-line format
   */
  drawLyrics(ctx, width, height, centerX, centerY, state, currentTime, baseScale, isPortrait) {
    if (!state.showLyrics || !state.lyricsText) return;

    if (!this._cachedLyrics || this._lastLyricsText !== state.lyricsText) {
      this._lastLyricsText = state.lyricsText;
      this._cachedLyrics = this.parseLrc(state.lyricsText);
    }

    const lines = this._cachedLyrics;
    if (!lines || lines.length === 0) return;

    // Find active line index
    let activeIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx === -1) return;
    const activeLine = lines[activeIdx];
    const nextLine = lines[activeIdx + 1];

    // Don't show line if it ended more than 6 seconds ago and no next line
    if (!nextLine && (currentTime - activeLine.time > 6.0)) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lyricsYOffset = state.lyricsPosY !== undefined ? (state.lyricsPosY * baseScale) : (isPortrait ? 300 * baseScale : 230 * baseScale);
    const lyricsCenterY = centerY + lyricsYOffset;

    const mainFontSize = Math.max(16, (state.lyricsFontSize || 34) * baseScale);
    const lyricsColor = state.lyricsColor || '#ffffff';
    const lyricsGlow = state.lyricsGlowColor || state.color1 || '#00e5ff';

    // 1. Render Previous Line (faded above)
    if (activeIdx > 0 && lines[activeIdx - 1]) {
      const prevLine = lines[activeIdx - 1];
      const prevSize = mainFontSize * 0.68;
      ctx.font = `600 ${prevSize}px "Montserrat", "Segoe UI", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8 * baseScale;
      ctx.fillText(prevLine.text, centerX, lyricsCenterY - (mainFontSize * 1.35));
    }

    // 2. Render Active Line (Large, bold, glowing neon shadow)
    ctx.font = `800 ${mainFontSize}px "Montserrat", "Segoe UI", sans-serif`;
    ctx.shadowColor = lyricsGlow;
    ctx.shadowBlur = 24 * baseScale;
    ctx.fillStyle = lyricsColor;
    ctx.letterSpacing = `${2 * baseScale}px`;
    ctx.fillText(activeLine.text, centerX, lyricsCenterY);

    // 3. Render Upcoming Line (faded below)
    if (nextLine && (nextLine.time - currentTime < 5.0)) {
      const nextSize = mainFontSize * 0.68;
      ctx.font = `600 ${nextSize}px "Montserrat", "Segoe UI", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8 * baseScale;
      ctx.fillText(nextLine.text, centerX, lyricsCenterY + (mainFontSize * 1.35));
    }

    ctx.restore();
  }

  parseLrc(text) {
    if (!text) return [];
    const rawLines = text.split(/\r?\n/);
    const result = [];
    const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

    for (const raw of rawLines) {
      const match = raw.match(lrcRegex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
        const time = mins * 60 + secs + ms;
        const lineText = match[4].trim();
        if (lineText) result.push({ time, text: lineText });
      } else {
        const simpleMatch = raw.match(/^(\d{1,2}):(\d{2})\s+(.*)/);
        if (simpleMatch) {
          const time = parseInt(simpleMatch[1], 10) * 60 + parseInt(simpleMatch[2], 10);
          const lineText = simpleMatch[3].trim();
          if (lineText) result.push({ time, text: lineText });
        }
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Animated YouTube Call-to-Action (Like & Subscribe Animation)
   * Specterr-style animated bell, like icon, and subscribe pill
   */
  drawYouTubeCta(ctx, width, height, state, currentTime, baseScale, kickPulse) {
    if (state.showYouTubeCta === false) return;

    const startT = state.ctaStartTime !== undefined ? state.ctaStartTime : 2.0;
    const dur = state.ctaDuration !== undefined ? state.ctaDuration : 7.0;
    const endT = startT + dur;

    if (currentTime < startT || currentTime > endT) return;

    // Transition animations: slide & fade in/out
    const fadeInDur = 0.5;
    const fadeOutDur = 0.5;
    let alpha = 1.0;
    let slideY = 0;

    if (currentTime < startT + fadeInDur) {
      const t = (currentTime - startT) / fadeInDur;
      alpha = t;
      slideY = (1.0 - t) * 30 * baseScale;
    } else if (currentTime > endT - fadeOutDur) {
      const t = (endT - currentTime) / fadeOutDur;
      alpha = t;
      slideY = (1.0 - t) * 30 * baseScale;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

    // Determine dimensions & position
    const cardW = 320 * baseScale;
    const cardH = 64 * baseScale;
    const radius = 16 * baseScale;
    const pos = state.ctaPosition || 'bottom-right';

    let cardX, cardY;
    if (pos === 'bottom-left') {
      cardX = 40 * baseScale;
      cardY = height - cardH - (40 * baseScale) + slideY;
    } else if (pos === 'top-right') {
      cardX = width - cardW - (40 * baseScale);
      cardY = (40 * baseScale) - slideY;
    } else if (pos === 'center-bottom') {
      cardX = (width - cardW) * 0.5;
      cardY = height - cardH - (40 * baseScale) + slideY;
    } else {
      // 'bottom-right' (default)
      cardX = width - cardW - (40 * baseScale);
      cardY = height - cardH - (40 * baseScale) + slideY;
    }

    // 1. Glassmorphic Card Container
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18 * baseScale;
    ctx.fillStyle = 'rgba(12, 16, 26, 0.88)';
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.55)';
    ctx.lineWidth = 1.8 * baseScale;

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Animated Ringing Bell
    const bellCenterX = cardX + 34 * baseScale;
    const bellCenterY = cardY + cardH * 0.5;
    const bellAngle = Math.sin(currentTime * 14) * 0.28; // Ring oscillation

    ctx.save();
    ctx.translate(bellCenterX, bellCenterY - 4 * baseScale);
    ctx.rotate(bellAngle);
    ctx.fillStyle = '#ffd700';
    // Draw bell icon
    ctx.beginPath();
    ctx.arc(0, -2 * baseScale, 9 * baseScale, Math.PI, 0, false);
    ctx.lineTo(12 * baseScale, 10 * baseScale);
    ctx.lineTo(-12 * baseScale, 10 * baseScale);
    ctx.closePath();
    ctx.fill();
    // Clapper
    ctx.beginPath();
    ctx.arc(0, 13 * baseScale, 3.5 * baseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. YouTube "SUBSCRIBE" Red Badge Button
    const btnW = 126 * baseScale;
    const btnH = 36 * baseScale;
    const btnX = cardX + 70 * baseScale;
    const btnY = cardY + (cardH - btnH) * 0.5;

    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnW, btnH, 8 * baseScale);
    else ctx.rect(btnX, btnY, btnW, btnH);
    ctx.fill();

    // Text on Subscribe Button
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(11, 13 * baseScale)}px "Montserrat", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBSCRIBE', btnX + btnW * 0.5, btnY + btnH * 0.5);

    // 4. Pulsing "LIKE" Thumbs Up
    const likeCenterX = cardX + cardW - 42 * baseScale;
    const likeCenterY = cardY + cardH * 0.5;
    const likeScale = 1.0 + (kickPulse * 0.2);

    ctx.save();
    ctx.translate(likeCenterX, likeCenterY);
    ctx.scale(likeScale, likeScale);
    ctx.fillStyle = '#00e5ff';
    ctx.font = `bold ${Math.max(14, 18 * baseScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👍', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draw Burn-in Debug Telemetry HUD (When Render Debug Video is Enabled)
   */
  drawDebugOverlay(ctx, width, height, state, audioData, currentTime, duration, baseScale) {
    ctx.save();
    const boxW = Math.max(340, 360 * baseScale);
    const boxH = Math.max(180, 200 * baseScale);
    const pad = 14 * baseScale;
    const x = pad;
    const y = pad;

    // HUD glass card
    ctx.fillStyle = 'rgba(6, 10, 18, 0.88)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, boxW, boxH, 8 * baseScale);
    else ctx.rect(x, y, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Text formatting
    ctx.fillStyle = '#00f0ff';
    ctx.font = `bold ${Math.max(11, 13 * baseScale)}px monospace`;
    ctx.fillText('🛠️ SPECTROMETER DEBUG HUD', x + 12 * baseScale, y + 22 * baseScale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(10, 11 * baseScale)}px monospace`;
    const fps = state.exportFps || 60;
    const frame = Math.floor(currentTime * fps);
    ctx.fillText(`Resolution : ${width}x${height} (${state.aspectRatio || '16-9'}) @ ${fps}fps`, x + 12 * baseScale, y + 42 * baseScale);
    ctx.fillText(`Timecode   : ${this.formatTimecode(currentTime)} / ${this.formatTimecode(duration)} [F:${frame}]`, x + 12 * baseScale, y + 60 * baseScale);
    ctx.fillText(`Visualizer : ${state.visStyle || 'filled'} | ${state.visShape || 'circle'} | ${state.graphRepeat || 1}x Repeat`, x + 12 * baseScale, y + 78 * baseScale);
    ctx.fillText(`Audio Map  : ${state.audioMapping || 'bass'} | Sens: ${state.spectrumSensitivity || 'med'}`, x + 12 * baseScale, y + 96 * baseScale);

    // Bass & Kick Meters
    const bassPct = Math.round((audioData.bassLevel || 0) * 100);
    const kickPct = Math.round((audioData.kickPulse || 0) * 100);
    ctx.fillText(`Bass: ${bassPct}%  Kick: ${kickPct}%`, x + 12 * baseScale, y + 114 * baseScale);

    // Mini Real-Time FFT Bar Graph
    const graphX = x + 12 * baseScale;
    const graphY = y + 126 * baseScale;
    const graphW = boxW - 24 * baseScale;
    const graphH = boxH - (138 * baseScale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(graphX, graphY, graphW, graphH);

    const bars = audioData.bars || [];
    const barCount = Math.min(64, bars.length);
    const bW = graphW / Math.max(1, barCount);
    for (let i = 0; i < barCount; i++) {
      const bh = Math.min(graphH, (bars[i] || 0) * graphH);
      ctx.fillStyle = i < 8 ? '#ff0055' : (i < 24 ? '#ffd700' : '#00f0ff');
      ctx.fillRect(graphX + i * bW, graphY + graphH - bh, Math.max(1, bW - 1), bh);
    }

    ctx.restore();
  }

  formatTimecode(timeSec) {
    if (isNaN(timeSec) || timeSec < 0) timeSec = 0;
    const mins = Math.floor(timeSec / 60);
    const secs = Math.floor(timeSec % 60);
    const ms = Math.floor((timeSec % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  hexToRgba(hex, alpha = 1.0) {
    if (!hex) return `rgba(255, 215, 0, ${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  lerpColor(colorA, colorB, t) {
    const parse = (hex) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      const num = parseInt(c, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };
    try {
      const [r1, g1, b1] = parse(colorA);
      const [r2, g2, b2] = parse(colorB);
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } catch (e) {
      return colorA;
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = VisualizerRenderer;
}

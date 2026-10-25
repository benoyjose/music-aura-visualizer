/**
 * Spectrometer Studio - Professional 3D/2D Audio-Reactive Particle Engine
 * Fully configurable After Effects / Apple Motion Emitter Cells Architecture
 */

class ParticleSystem {
  constructor(config = {}) {
    // Master settings
    this.enabled = config.enabled !== false;
    this.previewMode = config.previewMode || 'realtime'; // 'realtime' | 'video'

    // Emitter Settings
    this.emitter = {
      shape: config.emitterShape || 'circle', // 'circle' | 'line' | 'point' | 'rectangle' | 'sphere' | 'cuboid'
      mode: config.emitterMode || 'outline',   // 'outline' | 'points' | 'surface' | 'volume'
      preserveDepth: !!config.preserveDepth,   // 3D perspective projection
      reactsToBass: config.reactsToBass !== false,
      mirroring: config.mirroring !== false    // Symmetrical emission (Trap Nation signature)
    };

    // Bass Modulators
    this.bass = {
      timeMultiplier: config.bassTimeMultiplier !== undefined ? config.bassTimeMultiplier : 1.35,
      birthrateMultiplier: config.bassBirthrateMultiplier !== undefined ? config.bassBirthrateMultiplier : 1.35,
      velocityMultiplier: config.bassVelocityMultiplier !== undefined ? config.bassVelocityMultiplier : 1.50
    };

    // Transform
    this.transform = {
      matchVisualizers: config.matchVisualizers !== false, // Locked to Visualizer Ring
      customSize: !!config.customSize,
      widthMultiplier: config.widthMultiplier !== undefined ? config.widthMultiplier : 0.95,
      heightMultiplier: config.heightMultiplier !== undefined ? config.heightMultiplier : 0.95
    };

    // Emitter Cells >> Cell Type 1
    this.cell = {
      // Appearance
      shape: config.cellShape || 'circle', // 'circle' | 'circle-outline' | 'circle-feathered' | 'vertical-line' | 'horizontal-line' | 'star' | 'triangle' | 'square' | 'octagon' | 'pentagon' | 'custom'
      customShapeImage: null,
      customShapeId: config.customShapeId || null,
      color: config.color || '#ffd700',
      
      // Color & Opacity Variations & Animations
      redRange: config.redRange !== undefined ? config.redRange : 0,
      redSpeed: config.redSpeed !== undefined ? config.redSpeed : 0,
      greenRange: config.greenRange !== undefined ? config.greenRange : 0,
      greenSpeed: config.greenSpeed !== undefined ? config.greenSpeed : 1.00,
      blueRange: config.blueRange !== undefined ? config.blueRange : 0,
      blueSpeed: config.blueSpeed !== undefined ? config.blueSpeed : 0,

      opacity: config.opacity !== undefined ? config.opacity : 1.0,
      opacityRange: config.opacityRange !== undefined ? config.opacityRange : 0.0,
      opacitySpeed: config.opacitySpeed !== undefined ? config.opacitySpeed : 0.20,

      scale: config.scale !== undefined ? config.scale : 3.5,
      scaleRange: config.scaleRange !== undefined ? config.scaleRange : 0.15,
      scaleSpeed: config.scaleSpeed !== undefined ? config.scaleSpeed : 0.0,

      // Motion
      spin: config.spin !== undefined ? config.spin : 0,
      spinRange: config.spinRange !== undefined ? config.spinRange : 0,
      velocity: config.velocity !== undefined ? config.velocity : 22.5,
      velocityRange: config.velocityRange !== undefined ? config.velocityRange : 15.0,

      // Emission Settings
      lifetime: config.lifetime !== undefined ? config.lifetime : 100.0,
      lifetimeRange: config.lifetimeRange !== undefined ? config.lifetimeRange : 0.0,
      birthrate: config.birthrate !== undefined ? config.birthrate : 10.0,
      latitude: config.latitude !== undefined ? config.latitude : 50.0,
      longitude: config.longitude !== undefined ? config.longitude : 15.0,
      directionRange: config.directionRange !== undefined ? config.directionRange : 15.0,

      // Specterr Enhanced Direction & Flocking Mode
      direction: config.direction || 'out', // 'out' | 'in' | 'left' | 'right' | 'up' | 'down' | 'flock'
      movementMode: config.movementMode || 'standard' // 'standard' | 'flock'
    };

    // Internal state
    this.particles = [];
    this.maxParticles = 1200;
    this.spawnAccumulator = 0;
    if (typeof document !== 'undefined') {
      this.cachedTintCanvas = document.createElement('canvas');
      this.cachedTintCanvas.width = 60;
      this.cachedTintCanvas.height = 60;
      this.cachedTintCtx = this.cachedTintCanvas.getContext('2d');
    } else {
      this.cachedTintCanvas = null;
      this.cachedTintCtx = null;
    }

    // Pre-parse base color
    this.baseRgb = this.hexToRgb(this.cell.color);
  }

  hexToRgb(hex) {
    if (!hex) return { r: 255, g: 215, b: 0 };
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  setCustomShape(img, id = null) {
    this.cell.customShapeImage = img;
    this.cell.customShapeId = id;
    if (img) {
      this.cell.shape = 'custom';
    }
  }

  reset() {
    this.particles = [];
    this.spawnAccumulator = 0;
  }

  configure(newConfig = {}) {
    if (newConfig.enabled !== undefined) this.enabled = !!newConfig.enabled;
    if (newConfig.previewMode) this.previewMode = newConfig.previewMode;

    if (newConfig.emitter) Object.assign(this.emitter, newConfig.emitter);
    if (newConfig.bass) Object.assign(this.bass, newConfig.bass);
    if (newConfig.transform) Object.assign(this.transform, newConfig.transform);
    if (newConfig.cell) {
      Object.assign(this.cell, newConfig.cell);
      if (newConfig.cell.color) {
        this.baseRgb = this.hexToRgb(newConfig.cell.color);
      }
    }
  }

  // Generate initial particle coordinates according to Emitter Shape & Mode
  getEmitterSpawnPoint(radiusX, radiusY, isMirrored = false) {
    const shape = this.emitter.shape;
    const mode = this.emitter.mode;

    let x = 0, y = 0, z = 0;
    let normalX = 0, normalY = 0, normalZ = 0;

    if (shape === 'point') {
      x = 0; y = 0; z = 0;
      const rndAngle = Math.random() * Math.PI * 2;
      normalX = Math.cos(rndAngle);
      normalY = Math.sin(rndAngle);
    } else if (shape === 'circle') {
      let angle = Math.random() * Math.PI * 2;
      if (mode === 'points') {
        const steps = 16;
        angle = (Math.floor(Math.random() * steps) / steps) * Math.PI * 2;
      }
      let r = 1.0;
      if (mode === 'surface' || mode === 'volume') {
        r = Math.sqrt(Math.random());
      }
      x = Math.cos(angle) * radiusX * r;
      y = Math.sin(angle) * radiusY * r;
      z = (mode === 'volume') ? (Math.random() * 2 - 1) * 40 : 0;
      normalX = Math.cos(angle);
      normalY = Math.sin(angle);
    } else if (shape === 'line') {
      const u = Math.random() * 2 - 1;
      x = u * radiusX;
      y = (mode === 'volume') ? (Math.random() * 2 - 1) * 20 : 0;
      z = (mode === 'volume') ? (Math.random() * 2 - 1) * 20 : 0;
      normalX = 0;
      normalY = -1;
    } else if (shape === 'rectangle') {
      if (mode === 'outline') {
        const edge = Math.floor(Math.random() * 4);
        const t = Math.random() * 2 - 1;
        if (edge === 0) { x = t * radiusX; y = -radiusY; normalY = -1; }
        else if (edge === 1) { x = radiusX; y = t * radiusY; normalX = 1; }
        else if (edge === 2) { x = t * radiusX; y = radiusY; normalY = 1; }
        else { x = -radiusX; y = t * radiusY; normalX = -1; }
      } else if (mode === 'points') {
        const corner = Math.floor(Math.random() * 4);
        x = (corner % 2 === 0 ? 1 : -1) * radiusX;
        y = (corner < 2 ? 1 : -1) * radiusY;
        normalX = Math.sign(x); normalY = Math.sign(y);
      } else {
        x = (Math.random() * 2 - 1) * radiusX;
        y = (Math.random() * 2 - 1) * radiusY;
        z = (mode === 'volume') ? (Math.random() * 2 - 1) * 50 : 0;
        normalX = Math.sign(x) || 1;
        normalY = Math.sign(y) || 0;
      }
    } else if (shape === 'sphere') {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      let r = 1.0;
      if (mode === 'volume') {
        r = Math.cbrt(Math.random());
      }
      const sinPhi = Math.sin(phi);
      normalX = sinPhi * Math.cos(theta);
      normalY = sinPhi * Math.sin(theta);
      normalZ = Math.cos(phi);
      x = normalX * radiusX * r;
      y = normalY * radiusY * r;
      z = normalZ * radiusX * r;
    } else if (shape === 'cuboid') {
      const halfX = radiusX;
      const halfY = radiusY;
      const halfZ = radiusX * 0.7;
      if (mode === 'outline' || mode === 'points') {
        x = (Math.random() > 0.5 ? 1 : -1) * halfX;
        y = (Math.random() > 0.5 ? 1 : -1) * halfY;
        z = (Math.random() > 0.5 ? 1 : -1) * halfZ;
      } else {
        x = (Math.random() * 2 - 1) * halfX;
        y = (Math.random() * 2 - 1) * halfY;
        z = (Math.random() * 2 - 1) * halfZ;
      }
      normalX = Math.sign(x) || 1;
      normalY = Math.sign(y) || 0;
      normalZ = Math.sign(z) || 0;
    }

    if (isMirrored) {
      x = -x;
      normalX = -normalX;
    }

    return { x, y, z, normalX, normalY, normalZ };
  }

  spawnParticle(radiusX, radiusY, isMirrored = false) {
    const pt = this.getEmitterSpawnPoint(radiusX, radiusY, isMirrored);

    // Direction calculation with Direction Preset or Latitude/Longitude
    const dirMode = (this.cell.direction || 'out').toLowerCase();
    let dirX = 0, dirY = 0, dirZ = 0;

    if (dirMode === 'in') {
      dirX = -pt.normalX;
      dirY = -pt.normalY;
      dirZ = -pt.normalZ;
    } else if (dirMode === 'left') {
      dirX = -1.0;
      dirY = (Math.random() - 0.5) * 0.35;
    } else if (dirMode === 'right') {
      dirX = 1.0;
      dirY = (Math.random() - 0.5) * 0.35;
    } else if (dirMode === 'up') {
      dirX = (Math.random() - 0.5) * 0.35;
      dirY = -1.0;
    } else if (dirMode === 'down') {
      dirX = (Math.random() - 0.5) * 0.35;
      dirY = 1.0;
    } else if (dirMode === 'flock') {
      // Swirling orbital direction tangent to radius
      const d = Math.hypot(pt.x, pt.y) || 1;
      dirX = -pt.y / d + (Math.random() - 0.5) * 0.4;
      dirY = pt.x / d + (Math.random() - 0.5) * 0.4;
      dirZ = (Math.random() - 0.5) * 0.2;
    } else {
      // Default: 'out' / spherical lat-long with emitter normal
      const latRad = (this.cell.latitude + (Math.random() * 2 - 1) * this.cell.directionRange) * (Math.PI / 180);
      const longRad = (this.cell.longitude + (Math.random() * 2 - 1) * this.cell.directionRange) * (Math.PI / 180);

      dirX = Math.cos(latRad) * Math.cos(longRad);
      dirY = -Math.sin(latRad);
      dirZ = Math.cos(latRad) * Math.sin(longRad);

      // Blend with emitter normal for radial burst consistency
      if (this.emitter.shape === 'circle' || this.emitter.shape === 'point') {
        dirX = pt.normalX * 0.75 + dirX * 0.25;
        dirY = pt.normalY * 0.75 + dirY * 0.25;
      }
    }

    // Velocity
    const speed = Math.max(0.1, this.cell.velocity + (Math.random() * 2 - 1) * this.cell.velocityRange);
    let vx = dirX * speed;
    let vy = dirY * speed;
    let vz = dirZ * speed;

    if (isMirrored) {
      vx = -vx;
    }

    // Lifetime
    const lifetime = Math.max(0.5, this.cell.lifetime + (Math.random() * 2 - 1) * this.cell.lifetimeRange);

    // Color Variations
    const r = Math.min(255, Math.max(0, this.baseRgb.r + (Math.random() * 2 - 1) * this.cell.redRange));
    const g = Math.min(255, Math.max(0, this.baseRgb.g + (Math.random() * 2 - 1) * this.cell.greenRange));
    const b = Math.min(255, Math.max(0, this.baseRgb.b + (Math.random() * 2 - 1) * this.cell.blueRange));

    // Opacity
    const alpha = Math.min(1.0, Math.max(0.01, this.cell.opacity + (Math.random() * 2 - 1) * this.cell.opacityRange));

    // Scale
    const scale = Math.max(0.5, this.cell.scale * (1.0 + (Math.random() * 2 - 1) * this.cell.scaleRange));

    // Spin
    const spinSpeed = (this.cell.spin + (Math.random() * 2 - 1) * this.cell.spinRange) * (Math.PI / 180);

    return {
      x: pt.x,
      y: pt.y,
      z: pt.z,
      vx,
      vy,
      vz,
      age: 0,
      lifetime,
      r,
      g,
      b,
      alpha,
      initialAlpha: alpha,
      scale,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed
    };
  }

  update(deltaTime, kickPulse = 0, bassLevel = 0, baseScale = 1.0, visualizerRadius = 140) {
    if (!this.enabled) return;

    // Simulation time-step
    let dt = (this.previewMode === 'video') ? (1.0 / 60.0) : Math.min(0.1, deltaTime);

    // Bass Modulators
    if (this.emitter.reactsToBass) {
      dt *= (1.0 + bassLevel * (this.bass.timeMultiplier - 1.0));
    }

    // Determine emitter dimensions
    let rX = visualizerRadius;
    let rY = visualizerRadius;

    if (this.transform.customSize) {
      rX *= this.transform.widthMultiplier;
      rY *= this.transform.heightMultiplier;
    } else if (!this.transform.matchVisualizers) {
      rX = 140 * baseScale * this.transform.widthMultiplier;
      rY = 140 * baseScale * this.transform.heightMultiplier;
    }

    // Effective birthrate
    let effBirthrate = this.cell.birthrate;
    if (this.emitter.reactsToBass) {
      effBirthrate *= (1.0 + kickPulse * (this.bass.birthrateMultiplier - 1.0));
    }

    // Velocity multiplier
    let velMultiplier = 1.0;
    if (this.emitter.reactsToBass) {
      velMultiplier = 1.0 + kickPulse * (this.bass.velocityMultiplier - 1.0);
    }

    // Spawn new particles according to birthrate
    this.spawnAccumulator += effBirthrate * dt;
    while (this.spawnAccumulator >= 1.0 && this.particles.length < this.maxParticles) {
      this.particles.push(this.spawnParticle(rX, rY, false));
      if (this.emitter.mirroring) {
        this.particles.push(this.spawnParticle(rX, rY, true));
      }
      this.spawnAccumulator -= 1.0;
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      // Flocking & Swarm Dynamics
      if (this.cell.direction === 'flock' || this.cell.movementMode === 'flock') {
        const dist = Math.hypot(p.x, p.y) || 1;
        // Tangential orbital force + gentle inward/outward breathing
        const tangentX = -p.y / dist;
        const tangentY = p.x / dist;
        const radialX = -p.x / dist;
        const radialY = -p.y / dist;
        const centeringForce = dist > (visualizerRadius * 2.2) ? 22.0 : -8.0;
        p.vx += (tangentX * 24.0 + radialX * centeringForce) * dt;
        p.vy += (tangentY * 24.0 + radialY * centeringForce) * dt;
      }

      // Physics displacement
      p.x += p.vx * velMultiplier * dt;
      p.y += p.vy * velMultiplier * dt;
      p.z += p.vz * velMultiplier * dt;

      // Rotation spin
      p.rotation += p.spinSpeed * dt;

      // Dynamic Color animations
      p.r = (p.r + this.cell.redSpeed * dt) % 256;
      p.g = (p.g + this.cell.greenSpeed * dt) % 256;
      p.b = (p.b + this.cell.blueSpeed * dt) % 256;

      // Scale animation
      p.scale = Math.max(0.2, p.scale + this.cell.scaleSpeed * dt);

      // Opacity animation & envelope
      const progress = p.age / p.lifetime;
      let alphaFade = 1.0;
      if (progress < 0.1) {
        alphaFade = progress / 0.1; // Fade in
      } else if (progress > 0.75) {
        alphaFade = Math.max(0, 1.0 - (progress - 0.75) / 0.25); // Fade out
      }

      p.alpha = Math.max(0, p.initialAlpha * alphaFade - (this.cell.opacitySpeed * p.age * 0.1));
    }
  }

  // Draw particle shapes onto canvas
  draw(ctx, width, height, centerX, centerY, centerRadius = 140, primaryColor = '#ffd700', secondaryColor = '#ff8800') {
    if (!this.enabled || this.particles.length === 0) return;

    ctx.save();

    const preserveDepth = this.emitter.preserveDepth;
    const fov = 450;

    // Depth sorting when preserveDepth is active
    const renderList = preserveDepth
      ? [...this.particles].sort((a, b) => b.z - a.z)
      : this.particles;

    for (let i = 0; i < renderList.length; i++) {
      const p = renderList[i];
      if (p.alpha <= 0.005) continue;

      let drawX, drawY, drawSize, drawAlpha;

      if (preserveDepth) {
        const scaleFactor = Math.max(0.1, fov / (fov + p.z));
        drawX = centerX + p.x * scaleFactor;
        drawY = centerY + p.y * scaleFactor;
        drawSize = p.scale * scaleFactor;
        drawAlpha = Math.min(1.0, p.alpha * Math.min(1.4, scaleFactor));
      } else {
        drawX = centerX + p.x;
        drawY = centerY + p.y;
        drawSize = p.scale;
        drawAlpha = p.alpha;
      }

      if (drawSize < 0.2) continue;

      ctx.save();
      ctx.translate(drawX, drawY);
      if (p.rotation) {
        ctx.rotate(p.rotation);
      }
      ctx.globalAlpha = drawAlpha;

      const fillStyle = `rgb(${Math.floor(p.r)}, ${Math.floor(p.g)}, ${Math.floor(p.b)})`;
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = fillStyle;

      const shape = this.cell.shape;

      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, drawSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'circle-outline') {
        ctx.beginPath();
        ctx.arc(0, 0, drawSize, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, drawSize * 0.35);
        ctx.stroke();
      } else if (shape === 'circle-feathered') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, drawSize * 1.8);
        grad.addColorStop(0, fillStyle);
        grad.addColorStop(0.4, fillStyle);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, drawSize * 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'vertical-line') {
        const lw = Math.max(1.2, drawSize * 0.4);
        const lh = drawSize * 2.8;
        ctx.fillRect(-lw * 0.5, -lh * 0.5, lw, lh);
      } else if (shape === 'horizontal-line') {
        const lw = drawSize * 2.8;
        const lh = Math.max(1.2, drawSize * 0.4);
        ctx.fillRect(-lw * 0.5, -lh * 0.5, lw, lh);
      } else if (shape === 'star') {
        this.drawStar(ctx, 0, 0, 5, drawSize * 1.5, drawSize * 0.65);
      } else if (shape === 'triangle') {
        this.drawPolygon(ctx, 0, 0, drawSize * 1.4, 3);
      } else if (shape === 'square') {
        ctx.fillRect(-drawSize, -drawSize, drawSize * 2, drawSize * 2);
      } else if (shape === 'pentagon') {
        this.drawPolygon(ctx, 0, 0, drawSize * 1.4, 5);
      } else if (shape === 'octagon') {
        this.drawPolygon(ctx, 0, 0, drawSize * 1.4, 8);
      } else if (shape === 'custom' && this.cell.customShapeImage) {
        // Draw custom 60x60 white PNG tinted with canvas compositing
        const s = drawSize * 2.4;
        this.cachedTintCtx.clearRect(0, 0, 60, 60);
        this.cachedTintCtx.drawImage(this.cell.customShapeImage, 0, 0, 60, 60);
        this.cachedTintCtx.globalCompositeOperation = 'source-in';
        this.cachedTintCtx.fillStyle = fillStyle;
        this.cachedTintCtx.fillRect(0, 0, 60, 60);
        this.cachedTintCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.cachedTintCanvas, -s * 0.5, -s * 0.5, s, s);
      } else {
        // Fallback default
        ctx.beginPath();
        ctx.arc(0, 0, drawSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  drawPolygon(ctx, cx, cy, r, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI * 0.5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

if (typeof module !== 'undefined') {
  module.exports = ParticleSystem;
}

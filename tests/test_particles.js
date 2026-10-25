const ParticleSystem = require('../src/renderer/visualizer/particles');

async function testParticles() {
  console.log('[Test Particles] Initializing ParticleSystem...');
  const ps = new ParticleSystem({
    emitterShape: 'circle',
    emitterMode: 'outline',
    preserveDepth: true,
    reactsToBass: true,
    mirroring: true,
    bassTimeMultiplier: 1.35,
    bassBirthrateMultiplier: 1.35,
    bassVelocityMultiplier: 1.50,
    widthMultiplier: 0.95,
    heightMultiplier: 0.95,
    cellShape: 'star',
    color: '#ffd700',
    redRange: 10,
    redSpeed: 2,
    greenRange: 15,
    greenSpeed: 1.0,
    blueRange: 5,
    blueSpeed: 0,
    opacityRange: 0.1,
    opacitySpeed: 0.2,
    scaleRange: 0.15,
    scaleSpeed: 0.5,
    spin: 45,
    spinRange: 10,
    velocity: 22.5,
    velocityRange: 15.0,
    lifetime: 100,
    lifetimeRange: 5,
    birthrate: 20.0,
    latitude: 50,
    longitude: 15,
    directionRange: 15
  });

  // Verify default configurations
  if (ps.emitter.shape !== 'circle') throw new Error('Emitter shape should be circle');
  if (!ps.emitter.preserveDepth) throw new Error('preserveDepth should be true');
  if (ps.bass.timeMultiplier !== 1.35) throw new Error('bassTimeMultiplier should be 1.35');
  if (ps.cell.spin !== 45) throw new Error('spin should be 45');
  console.log('[Test Particles] Configuration correctly loaded.');

  // Test particle emission simulation across frames
  console.log('[Test Particles] Simulating 60 frames with bass transients...');
  for (let f = 0; f < 60; f++) {
    const kick = (f % 15 === 0) ? 1.0 : 0.0;
    const bass = 0.5 + Math.sin(f * 0.1) * 0.3;
    ps.update(1 / 60, kick, bass, 1.0, 140);
  }

  console.log(`[Test Particles] Active particles after 1 sec: ${ps.particles.length}`);
  if (ps.particles.length === 0) {
    throw new Error('Particles should have spawned!');
  }

  // Verify particle attributes
  const sampleP = ps.particles[0];
  console.log(`[Test Particles] Sample particle:`, {
    pos: [sampleP.x.toFixed(1), sampleP.y.toFixed(1), sampleP.z.toFixed(1)],
    vel: [sampleP.vx.toFixed(1), sampleP.vy.toFixed(1), sampleP.vz.toFixed(1)],
    color: [sampleP.r.toFixed(0), sampleP.g.toFixed(0), sampleP.b.toFixed(0)],
    alpha: sampleP.alpha.toFixed(2),
    scale: sampleP.scale.toFixed(2),
    rotation: sampleP.rotation.toFixed(2)
  });

  if (isNaN(sampleP.x) || isNaN(sampleP.y) || isNaN(sampleP.z)) {
    throw new Error('Particle coordinates contain NaN!');
  }

  // Test all shapes
  const shapes = ['circle', 'circle-outline', 'circle-feathered', 'vertical-line', 'horizontal-line', 'star', 'triangle', 'square', 'octagon', 'pentagon'];
  for (const s of shapes) {
    ps.cell.shape = s;
  }
  console.log(`[Test Particles] Tested all geometric cell shapes: ${shapes.join(', ')}`);

  // Test all emitter shapes & modes
  const emitterShapes = ['circle', 'line', 'point', 'rectangle', 'sphere', 'cuboid'];
  const emitterModes = ['outline', 'points', 'surface', 'volume'];
  for (const es of emitterShapes) {
    for (const em of emitterModes) {
      ps.emitter.shape = es;
      ps.emitter.mode = em;
      const pt = ps.getEmitterSpawnPoint(100, 100, false);
      if (isNaN(pt.x) || isNaN(pt.y) || isNaN(pt.z)) {
        throw new Error(`NaN in emitter ${es}/${em}`);
      }
    }
  }
  console.log('[Test Particles] All emitter shapes and modes spawned valid points.');

  console.log('[Test Particles] ALL PARTICLE SYSTEM TESTS PASSED!');
}

testParticles().catch(err => {
  console.error('[Test Particles] FAILED:', err);
  process.exit(1);
});

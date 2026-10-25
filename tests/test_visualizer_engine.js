const assert = require('assert');
const VisualizerRenderer = require('../src/renderer/visualizer/renderer');
const { PresetManager } = require('../src/renderer/presets/preset-manager');

function createMockCtx() {
  const ops = [];
  const gradient = {
    addColorStop: (off, color) => ops.push({ op: 'addColorStop', off, color })
  };
  return {
    ops,
    canvas: { width: 1920, height: 1080 },
    save: () => ops.push({ op: 'save' }),
    restore: () => ops.push({ op: 'restore' }),
    beginPath: () => ops.push({ op: 'beginPath' }),
    closePath: () => ops.push({ op: 'closePath' }),
    moveTo: (x, y) => ops.push({ op: 'moveTo', x, y }),
    lineTo: (x, y) => ops.push({ op: 'lineTo', x, y }),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => ops.push({ op: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y }),
    quadraticCurveTo: (cpx, cpy, x, y) => ops.push({ op: 'quadraticCurveTo', cpx, cpy, x, y }),
    arc: (x, y, r, sa, ea) => ops.push({ op: 'arc', x, y, r, sa, ea }),
    rect: (x, y, w, h) => ops.push({ op: 'rect', x, y, w, h }),
    clip: () => ops.push({ op: 'clip' }),
    fill: () => ops.push({ op: 'fill' }),
    stroke: () => ops.push({ op: 'stroke' }),
    clearRect: (x, y, w, h) => ops.push({ op: 'clearRect', x, y, w, h }),
    fillRect: (x, y, w, h) => ops.push({ op: 'fillRect', x, y, w, h }),
    strokeRect: (x, y, w, h) => ops.push({ op: 'strokeRect', x, y, w, h }),
    fillText: (text, x, y) => ops.push({ op: 'fillText', text, x, y }),
    measureText: (text) => ({ width: text.length * 10 }),
    translate: (x, y) => ops.push({ op: 'translate', x, y }),
    rotate: (angle) => ops.push({ op: 'rotate', angle }),
    scale: (x, y) => ops.push({ op: 'scale', x, y }),
    drawImage: () => ops.push({ op: 'drawImage' }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    setLineDash: () => {},
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    lineWidth: 1,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: '#ffffff',
    font: '16px sans-serif',
    textAlign: 'center',
    textBaseline: 'middle'
  };
}

async function runTests() {
  console.log('--- Testing PresetManager ---');
  const pm = new PresetManager();
  const list = pm.getPresetList();
  console.log(`Found ${list.length} presets.`);
  assert(list.length >= 10, 'Should have at least 10 presets');

  // Verify key templates
  const trap = pm.getPreset('trap-nation');
  assert(trap && trap.visualizerStyle === 'fluid-wave', 'Trap nation preset missing');
  const bars = pm.getPreset('circular-bars');
  assert(bars && bars.visStyle === 'bars', 'Circular bars preset missing');
  const linear = pm.getPreset('linear-stroke');
  assert(linear && linear.visShape === 'linear', 'Linear stroke preset missing');
  const dots = pm.getPreset('outline-dots');
  assert(dots && dots.visStyle === 'dots', 'Outline dots preset missing');
  const poly = pm.getPreset('polygon-geometric');
  assert(poly && poly.visShape === 'polygon', 'Polygon preset missing');

  // Test custom preset save, export, import, delete
  const custom = pm.saveUserPreset('Test Custom Style', {
    visStyle: 'filled',
    visShape: 'polygon',
    polygonSides: 8,
    segmentCount: 64,
    color1: '#ff0055'
  });
  assert(custom.id.startsWith('custom_'), 'Custom preset ID invalid');
  const exported = pm.exportPresetJSON(custom.id);
  assert(exported.includes('Test Custom Style'), 'Exported JSON missing preset title');
  const imported = pm.importPresetJSON(exported);
  assert(imported.polygonSides === 8, 'Imported preset polygon sides mismatch');
  assert(pm.deleteUserPreset(custom.id) === true, 'Failed to delete custom preset');
  console.log('✓ PresetManager verification passed');

  console.log('--- Testing VisualizerRenderer Engine ---');
  const renderer = new VisualizerRenderer();

  // Test fade calculations
  assert.strictEqual(renderer.calcFade(0, 10, 0, 0, 0, 0), 1.0);
  assert(renderer.calcFade(0.5, 10, 0, 1.0, 0, 0) < 1.0, 'Fade in calculation error');
  assert(renderer.calcFade(9.5, 10, 0, 0, 0, 1.0) < 1.0, 'Fade out calculation error');

  // Test scale animation calculations
  assert.strictEqual(renderer.calcScaleAnim(5, 10, 0.5, 0, 1.0, 0), 1.0);
  assert(renderer.calcScaleAnim(0.5, 10, 0.5, 0, 1.0, 0) < 1.0);

  const mockCtx = createMockCtx();
  const dummyAudio = {
    bars: new Float32Array(128).fill(0.5),
    bassLevel: 0.8,
    kickPulse: 0.6
  };
  const dummyParticles = { draw: () => {}, render: () => {} };
  const dummyShockwaves = { draw: () => {}, render: () => {}, trigger: () => {} };

  // 1. Style: Filled, Shape: Circle
  const state1 = {
    visStyle: 'filled',
    visShape: 'circle',
    audioMapping: 'bass',
    visPlacement: 'top-bottom',
    segmentCount: 128,
    curveSmoothing: true,
    minRadius: 140,
    maxRadius: 180,
    visScaleMultiplier: 1.35,
    visTwitch: 2.0,
    color1: '#ffffff',
    color2: '#00f0ff',
    posXOffset: 5,
    posYOffset: -5,
    scaleX: 1.1,
    scaleY: 0.9,
    rotX: 10,
    rotY: -10,
    rotZ: 45
  };
  renderer.render(mockCtx, 1920, 1080, state1, dummyAudio, dummyParticles, dummyShockwaves, 2.5, 10.0);
  console.log(`✓ Filled Circle render ops: ${mockCtx.ops.length}`);

  // 2. Style: Outline, Shape: Polygon (Hexagon)
  mockCtx.ops.length = 0;
  const state2 = {
    visStyle: 'outline',
    visShape: 'polygon',
    polygonSides: 6,
    audioMapping: 'treble',
    visPlacement: 'top-only',
    segmentCount: 64,
    curveSmoothing: false,
    minRadius: 130,
    maxRadius: 170,
    color1: '#ffd700',
    color2: '#ff5500'
  };
  renderer.render(mockCtx, 1920, 1080, state2, dummyAudio, dummyParticles, dummyShockwaves, 3.0, 10.0);
  console.log(`✓ Outline Hexagon render ops: ${mockCtx.ops.length}`);

  // 3. Style: Bars, Shape: Linear
  mockCtx.ops.length = 0;
  const state3 = {
    visStyle: 'bars',
    visShape: 'linear',
    linearWidth: 1200,
    audioMapping: 'none',
    visPlacement: 'bottom-only',
    segmentCount: 96,
    curveSmoothing: true,
    graphRepeat: 2,
    color1: '#00ff88',
    color2: '#00ffee'
  };
  renderer.render(mockCtx, 1920, 1080, state3, dummyAudio, dummyParticles, dummyShockwaves, 4.0, 10.0);
  console.log(`✓ Linear Bars render ops: ${mockCtx.ops.length}`);

  // 4. Style: Dots, Shape: Circle with Debug Video Overlay
  mockCtx.ops.length = 0;
  const state4 = {
    visStyle: 'dots',
    visShape: 'circle',
    dotSize: 5.0,
    audioMapping: 'bass',
    visPlacement: 'top-bottom',
    segmentCount: 64,
    curveSmoothing: true,
    renderDebugVideo: true,
    color1: '#ff00aa',
    color2: '#9900ff'
  };
  renderer.render(mockCtx, 1920, 1080, state4, dummyAudio, dummyParticles, dummyShockwaves, 5.0, 10.0);
  console.log(`✓ Dots Circle with Debug HUD render ops: ${mockCtx.ops.length}`);

  // 5. Specterr Inward Visualizer with Multi-Layer Waves, Lyrics, and YouTube CTA
  mockCtx.ops.length = 0;
  const stateSpecterr = {
    visStyle: 'filled',
    visShape: 'circle',
    visDirection: 'inward',
    invertSpectrum: true,
    visReflection: '4-way',
    waveLayers: {
      layer2: { enabled: true, color: '#ff007f', scale: 1.15, opacity: 0.65, transparent: true, outlineWidth: 3 },
      layer3: { enabled: true, color: '#00e5ff', scale: 0.88, opacity: 0.50, transparent: false }
    },
    cameraDrift: true,
    driftIntensity: 12,
    cameraRumble: 35,
    logoGlow: true,
    logoGlowColor: '#00e5ff',
    showLyrics: true,
    lyricsText: "[00:02.00] In the dark of the night\n[00:04.50] We find our guiding light\n[00:08.00] Bass reverberates",
    showYouTubeCta: true,
    ctaStartTime: 1.0,
    ctaDuration: 6.0,
    ctaPosition: 'bottom-right'
  };
  renderer.render(mockCtx, 1920, 1080, stateSpecterr, dummyAudio, dummyParticles, dummyShockwaves, 3.5, 12.0);
  console.log(`✓ Specterr Inward Visualizer + Multi-Layer + Lyrics + CTA render ops: ${mockCtx.ops.length}`);
  assert(mockCtx.ops.length > 500, 'Specterr render should generate rich canvas operations');

  console.log('ALL VISUALIZER & PRESET TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

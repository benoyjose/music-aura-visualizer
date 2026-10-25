/**
 * Spectrometer Studio Master Application
 * Coordinates UI, AudioManager, VisualizerRenderer, ParticleSystem, Presets, and 8K Exporter
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Core Modules
  const audioManager = new AudioManager();
  const renderer = new VisualizerRenderer();
  const presetManager = new PresetManager();
  const particles = new ParticleSystem(280);
  const shockwaves = new ShockwaveManager();

  // Elements
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvasWrapper');

  // Transport elements
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const timelineScrubber = document.getElementById('timelineScrubber');
  const currentTimeLabel = document.getElementById('currentTimeLabel');
  const totalDurationLabel = document.getElementById('totalDurationLabel');
  const volumeSlider = document.getElementById('volumeSlider');
  const fpsBadge = document.getElementById('fpsBadge');
  const targetResolutionBadge = document.getElementById('targetResolutionBadge');
  const audioTrackHeaderBadge = document.getElementById('audioTrackHeaderBadge');

  // Navigation & Actions
  const btnLoadDemo = document.getElementById('btnLoadDemo');
  const presetSelect = document.getElementById('presetSelect');
  const btnOpenExportModal = document.getElementById('btnOpenExportModal');
  const btnQuickChangeBg = document.getElementById('btnQuickChangeBg');

  // Query Windows 11 DirectX 12 / D3D11 Hardware Acceleration & GPU Info
  try {
    if (window.spectrometerAPI && window.spectrometerAPI.getGpuInfo) {
      window.spectrometerAPI.getGpuInfo().then(gpuData => {
        if (gpuData && gpuData.gpuName) {
          const statusBarGpu = document.getElementById('statusBarGpuName');
          if (statusBarGpu) {
            statusBarGpu.textContent = `GPU: ${gpuData.gpuName} (${gpuData.hardwareAcceleration || 'Hardware Accelerated'})`;
          }
        }
      });
    }
  } catch (e) {
    console.warn('GPU Telemetry error:', e);
  }

  // Audio Specs & Info Elements
  const audioQualityInfoBox = document.getElementById('audioQualityInfoBox');
  const audioFormatTag = document.getElementById('audioFormatTag');
  const audioSpecsDesc = document.getElementById('audioSpecsDesc');

  // Background elements
  const btnSelectBg = document.getElementById('btnSelectBg');
  const btnRemoveBg = document.getElementById('btnRemoveBg');
  const bgFileName = document.getElementById('bgFileName');
  const bgPresetsStrip = document.getElementById('bgPresetsStrip');
  const bgScaleMode = document.getElementById('bgScaleMode');

  // Export Modal Elements
  const exportModal = document.getElementById('exportModal');
  const btnCloseExportModal = document.getElementById('btnCloseExportModal');
  const btnStartExport = document.getElementById('btnStartExport');
  const btnCancelExport = document.getElementById('btnCancelExport');
  const btnBrowseOutput = document.getElementById('btnBrowseOutput');
  const exportOutputPath = document.getElementById('exportOutputPath');
  const exportConfigView = document.getElementById('exportConfigView');
  const exportProgressView = document.getElementById('exportProgressView');
  const exportSuccessView = document.getElementById('exportSuccessView');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportPercentage = document.getElementById('exportPercentage');
  const exportStatusText = document.getElementById('exportStatusText');
  const statFrames = document.getElementById('statFrames');
  const statFps = document.getElementById('statFps');
  const statElapsed = document.getElementById('statElapsed');
  const statEta = document.getElementById('statEta');
  const btnOpenVideo = document.getElementById('btnOpenVideo');
  const btnShowFolder = document.getElementById('btnShowFolder');
  const successFilePath = document.getElementById('successFilePath');
  const exportAudioCodec = document.getElementById('exportAudioCodec');
  const summaryAudio = document.getElementById('summaryAudio');
  const summarySourceAudio = document.getElementById('summarySourceAudio');

  // Current State
  const state = {
    // Media
    bgImage: null,
    logoImage: null,
    logoMode: 'custom', // 'custom' | 'preset' | 'none'
    presetLogoImage: null,
    hollowCoreDisc: false,
    hollowCoreDiscColor: 'rgba(12, 16, 26, 0.45)',
    bgBlur: 1.5,
    bgBrightness: 0.65,
    bgContrast: 1.0,
    bgSaturate: 1.0,
    bgScaleMode: 'cover',
    bgTint: null,
    bgTintAlpha: 0,
    logoRadius: 140,
    borderWidth: 5,
    borderColor: '#ffffff',
    logoBounce: 1.3,

    // Audio Metadata
    audioMetadata: null,

    // Visualizer Customization
    visStyle: 'filled', // 'filled' | 'outline' | 'bars' | 'dots'
    visShape: 'circle', // 'circle' | 'polygon' | 'linear'
    visDirection: 'outward', // 'outward' | 'inward' (Specterr Inward Vortex)
    visReflection: 'vertical', // 'vertical' | 'none' | 'across' | '3-way' | '4-way'
    invertSpectrum: false,
    previewQuality: '720',
    waveLayers: {
      layer2: { enabled: false, color: '#ff007f', scale: 1.15, opacity: 0.65, transparent: true, outlineWidth: 3 },
      layer3: { enabled: false, color: '#00e5ff', scale: 0.88, opacity: 0.50, transparent: false }
    },
    polygonSides: 6,
    segmentCount: 128,
    curveSmoothing: true,
    minRadius: 140,
    maxRadius: 180,
    logoInset: 0,
    visRotationAngle: 0,
    linearWidth: 1100,
    audioMapping: 'bass', // 'bass' | 'treble' | 'none'
    visPlacement: 'top-bottom', // 'top-bottom' | 'top-only' | 'bottom-only'
    graphRepeat: 1,
    minFrequency: 25,
    maxFrequency: 15000,
    dotSize: 4.5,
    visualizerStyle: 'fluid-wave',
    waveFillMode: 'solid',
    chromaticAberration: true,
    chromaticIntensity: 1.0,
    groundReflection: true,
    barCount: 128,
    barMaxHeight: 180,
    barMinHeight: 10,
    barWidth: 5,
    barGap: 2,
    barCap: 'round',
    smoothing: 0.84,
    sensitivity: 1.25,
    color1: '#ffffff',
    color2: '#ffffff',
    glowIntensity: 1.15,
    showProgressRing: false,

    // Audio Reactivity & Effects
    visScaleMultiplier: 1.35,
    visTwitch: 0,
    spectrumSensitivity: 'med', // 'low' | 'med' | 'high'
    bassShake: 1.35,
    shockwavesEnabled: true,
    vignette: true,
    vignetteIntensity: 0.65,

    // Motion, Camera & Glow FX (Specterr Style)
    cameraDrift: false,
    driftIntensity: 14,
    cameraRumble: 20,
    bgReflection: 'none', // 'none' | '2-way' | '4-way'
    logoGlow: true,
    logoGlowColor: '#00e5ff',
    logoGlowScale: 1.35,

    // YouTube Like & Subscribe Elements Overlay
    showYouTubeCta: true,
    ctaStartTime: 2.0,
    ctaDuration: 7.0,
    ctaPosition: 'bottom-right',
    ctaChannelName: 'TRAP NATION',

    // Audio-Synced Lyrics Subtitles Engine
    showLyrics: false,
    lyricsText: "[00:04.00] You were the shadow to my light\n[00:08.50] Did you feel us?\n[00:12.00] Another start, you fade away\n[00:16.50] Where are you now?\n[00:20.00] Atlantis, under the sea\n[00:24.00] Where are you now?\n[00:28.00] I'm faded",
    lyricsFontSize: 34,
    lyricsColor: '#ffffff',
    lyricsGlowColor: '#00e5ff',
    lyricsPosY: 240,

    // Transform Controls
    transformPreviewMode: 'realtime', // 'realtime' | 'video'
    posXOffset: 0,
    posYOffset: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,

    // Animations & Transitions
    videoFadeInDelay: 0,
    videoFadeInTime: 0,
    videoFadeOutDelay: 0,
    videoFadeOutTime: 0,
    bgFadeInDelay: 0,
    bgFadeInTime: 0,
    bgFadeOutDelay: 0,
    bgFadeOutTime: 0,
    logoFadeInDelay: 0,
    logoFadeInTime: 0,
    logoFadeOutDelay: 0,
    logoFadeOutTime: 0,
    visFadeInDelay: 0,
    visFadeInTime: 0,
    visFadeOutDelay: 0,
    visFadeOutTime: 0,
    visStartScale: 1.0,
    visScaleUpDelay: 0,
    visScaleUpTime: 0,
    visScaleDownTime: 0,

    // Video Export & Rendering
    exportFps: 60,
    exportQualityPercent: 85,
    exportCodec: 'h264_amf',
    renderDebugVideo: false,
    aspectRatio: '16-9', // '16-9', '9-16', '1-1', '4-5', '2-1'

    // Particles System (After Effects / Apple Motion Emitter Architecture)
    particles: {
      enabled: true,
      previewMode: 'realtime', // 'realtime' | 'video'
      // Emitter
      emitterShape: 'circle',
      emitterMode: 'outline',
      preserveDepth: false,
      reactsToBass: true,
      mirroring: true,
      // Bass
      bassTimeMultiplier: 1.35,
      bassBirthrateMultiplier: 1.35,
      bassVelocityMultiplier: 1.50,
      // Transform
      matchVisualizers: true,
      customSize: false,
      widthMultiplier: 0.95,
      heightMultiplier: 0.95,
      // Cell Type 1 Appearance
      cellShape: 'circle',
      customShapeImage: null,
      customShapeId: null,
      customShapeName: '',
      color: '#ffd700',
      redRange: 0,
      redSpeed: 0,
      blueRange: 0,
      blueSpeed: 0,
      greenRange: 0,
      greenSpeed: 1.00,
      opacity: 1.0,
      opacityRange: 0.0,
      opacitySpeed: 0.20,
      scale: 3.5,
      scaleRange: 0.15,
      scaleSpeed: 0.0,
      // Cell Type 1 Motion
      spin: 0,
      spinRange: 0,
      velocity: 22.5,
      velocityRange: 15.0,
      // Cell Type 1 Emission Settings
      lifetime: 100,
      lifetimeRange: 0,
      birthrate: 10.0,
      latitude: 50,
      longitude: 15,
      directionRange: 15,
      direction: 'out', // 'out' | 'in' | 'left' | 'right' | 'up' | 'down' | 'flock'
      movementMode: 'standard' // 'standard' | 'flock'
    },
    particlesEnabled: true,

    // Typography
    showText: true,
    artistName: 'SAN HOLO',
    trackTitle: 'LIGHT',
    watermarkText: 'TRAP NATION',
    artistFontSize: 34,
    titleFontSize: 24,
    watermarkFontSize: 15,
    showWatermark: true,
    artistColor: '#ffffff',
    titleColor: '#ffffff',
    watermarkColor: 'rgba(255, 255, 255, 0.45)',

    // Composition
    aspectRatio: '16-9', // '16-9', '9-16', '1-1'
    portraitCenterY: 0.44
  };

  let isExportCanceled = false;
  let isExporting = false;
  let exportedVideoPath = '';
  let appPaths = null;

  // Frame rate calculation
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  // Set initial preview canvas dimensions (scaled by Preview Quality)
  function updatePreviewCanvasDimensions() {
    let baseW = 1280, baseH = 720;
    const aspect = state.aspectRatio || '16-9';

    if (aspect === '16-9') {
      baseW = 1280; baseH = 720;
      canvasWrapper.className = 'canvas-wrapper aspect-16-9';
    } else if (aspect === '9-16') {
      baseW = 720; baseH = 1280;
      canvasWrapper.className = 'canvas-wrapper aspect-9-16';
    } else if (aspect === '1-1') {
      baseW = 800; baseH = 800;
      canvasWrapper.className = 'canvas-wrapper aspect-1-1';
    } else if (aspect === '4-5') {
      baseW = 720; baseH = 900;
      canvasWrapper.className = 'canvas-wrapper aspect-4-5';
    } else if (aspect === '2-1') {
      baseW = 1280; baseH = 640;
      canvasWrapper.className = 'canvas-wrapper aspect-2-1';
    } else {
      baseW = 1280; baseH = 720;
      canvasWrapper.className = 'canvas-wrapper aspect-16-9';
    }

    const q = parseInt(state.previewQuality || '720');
    const scale = q / 720.0;
    previewCanvas.width = Math.round(baseW * scale);
    previewCanvas.height = Math.round(baseH * scale);
  }
  updatePreviewCanvasDimensions();

  // Full Screen Preview Toggle (F11 / Button)
  const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');
  function toggleFullscreen() {
    document.body.classList.toggle('is-fullscreen');
    updatePreviewCanvasDimensions();
  }
  if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', toggleFullscreen);
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'Escape' && document.body.classList.contains('is-fullscreen')) {
      document.body.classList.remove('is-fullscreen');
      updatePreviewCanvasDimensions();
    }
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) targetPanel.style.display = 'flex';
    });
  });

  // Aspect Ratio switching
  document.querySelectorAll('.aspect-btn[data-aspect]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aspect-btn[data-aspect]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aspectRatio = btn.getAttribute('data-aspect');
      updatePreviewCanvasDimensions();
      updateExportSummary();
    });
  });

  // Slider binding helper (supports nested dot-notation paths & callbacks)
  function bindSlider(id, stateKey, badgeId, suffix = '', callback = null) {
    const slider = document.getElementById(id);
    const badge = document.getElementById(badgeId);
    if (!slider) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      if (stateKey) {
        if (stateKey.includes('.')) {
          const parts = stateKey.split('.');
          let obj = state;
          for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
          }
          obj[parts[parts.length - 1]] = val;

          // Synchronize with active ParticleSystem instance
          if (stateKey.startsWith('particles.')) {
            const key = parts[1];
            if (key in particles.cell) particles.cell[key] = val;
            else if (key in particles.bass) particles.bass[key] = val;
            else if (key in particles.transform) particles.transform[key] = val;
          }
        } else {
          state[stateKey] = val;
        }
      }
      if (callback) callback(val);
      if (badge) badge.textContent = `${slider.value}${suffix}`;
    });
  }

  // Universal Plus/Minus Stepper Buttons Binding
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-step-target');
      const step = parseFloat(btn.getAttribute('data-step'));
      const slider = document.getElementById(targetId);
      if (slider && !isNaN(step)) {
        let val = parseFloat(slider.value) + step;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        if (!isNaN(min)) val = Math.max(min, val);
        if (!isNaN(max)) val = Math.min(max, val);
        const precision = (slider.step && slider.step.includes('.')) ? slider.step.split('.')[1].length : 2;
        slider.value = parseFloat(val.toFixed(precision));
        slider.dispatchEvent(new Event('input'));
      }
    });
  });

  // Bind core visualizer sliders
  bindSlider('bgBlur', 'bgBlur', 'bgBlurVal', ' px');
  bindSlider('bgBrightness', 'bgBrightness', 'bgBrightnessVal', '');
  bindSlider('bgContrast', 'bgContrast', 'bgContrastVal', '');
  bindSlider('bgSaturate', 'bgSaturate', 'bgSaturateVal', '');
  bindSlider('logoRadius', 'logoRadius', 'logoRadiusVal', ' px');
  bindSlider('borderWidth', 'borderWidth', 'borderWidthVal', ' px');
  bindSlider('logoBounce', 'logoBounce', 'logoBounceVal', 'x');
  bindSlider('barCount', 'barCount', 'barCountVal', '');
  bindSlider('barMaxHeight', 'barMaxHeight', 'barMaxHeightVal', ' px');
  bindSlider('barWidth', 'barWidth', 'barWidthVal', ' px');
  bindSlider('barGap', 'barGap', 'barGapVal', ' px');
  bindSlider('smoothing', 'smoothing', 'smoothingVal', '');
  bindSlider('sensitivity', 'sensitivity', 'sensitivityVal', 'x');
  bindSlider('glowIntensity', 'glowIntensity', 'glowVal', 'x');
  bindSlider('bassShake', 'bassShake', 'bassShakeVal', 'x');
  bindSlider('vignetteIntensity', 'vignetteIntensity', 'vignetteVal', '');
  bindSlider('chromaticIntensity', 'chromaticIntensity', 'chromaticIntensityVal', 'x');
  bindSlider('artistFontSize', 'artistFontSize', 'artistFontSizeVal', ' px');
  bindSlider('titleFontSize', 'titleFontSize', 'titleFontSizeVal', ' px');

  // Bind Particle System Sliders (Bass, Transform, Cells)
  bindSlider('pBassTimeMult', 'particles.bassTimeMultiplier', 'pBassTimeMultVal', 'x');
  bindSlider('pBassBirthrateMult', 'particles.bassBirthrateMultiplier', 'pBassBirthrateMultVal', 'x');
  bindSlider('pBassVelMult', 'particles.bassVelocityMultiplier', 'pBassVelMultVal', 'x');
  bindSlider('pWidthMult', 'particles.widthMultiplier', 'pWidthMultVal', 'x');
  bindSlider('pHeightMult', 'particles.heightMultiplier', 'pHeightMultVal', 'x');
  bindSlider('pRedRange', 'particles.redRange', 'pRedRangeVal', '');
  bindSlider('pRedSpeed', 'particles.redSpeed', 'pRedSpeedVal', ' /sec');
  bindSlider('pBlueRange', 'particles.blueRange', 'pBlueRangeVal', '');
  bindSlider('pBlueSpeed', 'particles.blueSpeed', 'pBlueSpeedVal', ' /sec');
  bindSlider('pGreenRange', 'particles.greenRange', 'pGreenRangeVal', '');
  bindSlider('pGreenSpeed', 'particles.greenSpeed', 'pGreenSpeedVal', ' /sec');
  bindSlider('pOpacityRange', 'particles.opacityRange', 'pOpacityRangeVal', '');
  bindSlider('pOpacitySpeed', 'particles.opacitySpeed', 'pOpacitySpeedVal', ' /sec');
  bindSlider('pBaseScale', 'particles.scale', 'pBaseScaleVal', ' px');
  bindSlider('pScaleRange', 'particles.scaleRange', 'pScaleRangeVal', '');
  bindSlider('pScaleSpeed', 'particles.scaleSpeed', 'pScaleSpeedVal', ' /sec');
  bindSlider('pSpin', 'particles.spin', 'pSpinVal', ' deg/sec');
  bindSlider('pSpinRange', 'particles.spinRange', 'pSpinRangeVal', ' deg/sec');
  bindSlider('pVelocity', 'particles.velocity', 'pVelocityVal', ' px/sec');
  bindSlider('pVelocityRange', 'particles.velocityRange', 'pVelocityRangeVal', ' px/sec');
  bindSlider('pLifetime', 'particles.lifetime', 'pLifetimeVal', ' sec');
  bindSlider('pLifetimeRange', 'particles.lifetimeRange', 'pLifetimeRangeVal', ' sec');
  bindSlider('pBirthrate', 'particles.birthrate', 'pBirthrateVal', ' cells/sec');
  bindSlider('pLatitude', 'particles.latitude', 'pLatitudeVal', ' deg');
  bindSlider('pLongitude', 'particles.longitude', 'pLongitudeVal', ' deg');
  bindSlider('pDirectionRange', 'particles.directionRange', 'pDirectionRangeVal', ' deg');

  // Checkbox toggles
  const showProgressRingEl = document.getElementById('showProgressRing');
  if (showProgressRingEl) showProgressRingEl.addEventListener('change', (e) => state.showProgressRing = e.target.checked);

  const shockwavesEnabledEl = document.getElementById('shockwavesEnabled');
  if (shockwavesEnabledEl) shockwavesEnabledEl.addEventListener('change', (e) => state.shockwavesEnabled = e.target.checked);

  const showTextEl = document.getElementById('showText');
  if (showTextEl) showTextEl.addEventListener('change', (e) => state.showText = e.target.checked);

  const showWatermarkEl = document.getElementById('showWatermark');
  if (showWatermarkEl) showWatermarkEl.addEventListener('change', (e) => state.showWatermark = e.target.checked);

  // Visualizer Style & Fill Mode Dropdowns
  const visStyleEl = document.getElementById('visStyle');
  if (visStyleEl) {
    visStyleEl.addEventListener('change', (e) => {
      state.visStyle = e.target.value;
      state.visualizerStyle = e.target.value === 'bars' ? 'bars' : 'fluid-wave';
    });
  }

  const visShapeEl = document.getElementById('visShape');
  const polygonSidesRow = document.getElementById('polygonSidesRow');
  if (visShapeEl) {
    visShapeEl.addEventListener('change', (e) => {
      state.visShape = e.target.value;
      if (polygonSidesRow) {
        polygonSidesRow.style.display = e.target.value === 'polygon' ? 'flex' : 'none';
      }
    });
  }

  const audioMappingEl = document.getElementById('audioMapping');
  if (audioMappingEl) {
    audioMappingEl.addEventListener('change', (e) => {
      state.audioMapping = e.target.value;
    });
  }

  const visPlacementEl = document.getElementById('visPlacement');
  if (visPlacementEl) {
    visPlacementEl.addEventListener('change', (e) => {
      state.visPlacement = e.target.value;
    });
  }

  const curveSmoothingEl = document.getElementById('curveSmoothing');
  if (curveSmoothingEl) {
    curveSmoothingEl.addEventListener('change', (e) => {
      state.curveSmoothing = e.target.checked;
    });
  }

  const transformPreviewModeEl = document.getElementById('transformPreviewMode');
  if (transformPreviewModeEl) {
    transformPreviewModeEl.addEventListener('change', (e) => {
      state.transformPreviewMode = e.target.value;
    });
  }

  const visualizerStyleEl = document.getElementById('visualizerStyle');
  if (visualizerStyleEl) {
    visualizerStyleEl.addEventListener('change', (e) => {
      state.visualizerStyle = e.target.value;
    });
  }

  const waveFillModeEl = document.getElementById('waveFillMode');
  if (waveFillModeEl) {
    waveFillModeEl.addEventListener('change', (e) => {
      state.waveFillMode = e.target.value;
    });
  }

  const chromaticAberrationEl = document.getElementById('chromaticAberration');
  if (chromaticAberrationEl) {
    chromaticAberrationEl.addEventListener('change', (e) => {
      state.chromaticAberration = e.target.checked;
    });
  }

  const groundReflectionEl = document.getElementById('groundReflection');
  if (groundReflectionEl) {
    groundReflectionEl.addEventListener('change', (e) => {
      state.groundReflection = e.target.checked;
    });
  }

  // Specterr Preview Quality Selector
  const previewQualitySelect = document.getElementById('previewQualitySelect');
  if (previewQualitySelect) {
    previewQualitySelect.addEventListener('change', (e) => {
      state.previewQuality = e.target.value;
      updatePreviewCanvasDimensions();
    });
  }

  // Specterr Wave Direction (Outward vs Inward Vortex)
  const btnDirOutward = document.getElementById('btnDirOutward');
  const btnDirInward = document.getElementById('btnDirInward');
  if (btnDirOutward && btnDirInward) {
    btnDirOutward.addEventListener('click', () => {
      state.visDirection = 'outward';
      btnDirOutward.classList.add('active');
      btnDirInward.classList.remove('active');
    });
    btnDirInward.addEventListener('click', () => {
      state.visDirection = 'inward';
      btnDirInward.classList.add('active');
      btnDirOutward.classList.remove('active');
    });
  }

  // Specterr Symmetry Reflection Mode
  const visReflectionEl = document.getElementById('visReflection');
  if (visReflectionEl) {
    visReflectionEl.addEventListener('change', (e) => {
      state.visReflection = e.target.value;
    });
  }

  // Invert Spectrum Toggle
  const invertSpectrumEl = document.getElementById('invertSpectrum');
  if (invertSpectrumEl) {
    invertSpectrumEl.addEventListener('change', (e) => {
      state.invertSpectrum = e.target.checked;
    });
  }

  // Specterr Multi-Layer Waves: Layer 2
  const layer2Enabled = document.getElementById('layer2Enabled');
  if (layer2Enabled) {
    layer2Enabled.addEventListener('change', (e) => {
      state.waveLayers.layer2.enabled = e.target.checked;
    });
  }
  const layer2Color = document.getElementById('layer2Color');
  const layer2ColorText = document.getElementById('layer2ColorText');
  if (layer2Color) {
    layer2Color.addEventListener('input', (e) => {
      state.waveLayers.layer2.color = e.target.value;
      if (layer2ColorText) layer2ColorText.textContent = e.target.value.toUpperCase();
    });
  }
  bindSlider('layer2Scale', null, 'layer2ScaleVal', 'x', (v) => { state.waveLayers.layer2.scale = v; });
  bindSlider('layer2Opacity', null, 'layer2OpacityVal', '', (v) => { state.waveLayers.layer2.opacity = v; });
  const layer2Transparent = document.getElementById('layer2Transparent');
  if (layer2Transparent) {
    layer2Transparent.addEventListener('change', (e) => {
      state.waveLayers.layer2.transparent = e.target.checked;
    });
  }
  bindSlider('layer2Width', null, 'layer2WidthVal', ' px', (v) => { state.waveLayers.layer2.outlineWidth = v; });

  // Specterr Multi-Layer Waves: Layer 3
  const layer3Enabled = document.getElementById('layer3Enabled');
  if (layer3Enabled) {
    layer3Enabled.addEventListener('change', (e) => {
      state.waveLayers.layer3.enabled = e.target.checked;
    });
  }
  const layer3Color = document.getElementById('layer3Color');
  const layer3ColorText = document.getElementById('layer3ColorText');
  if (layer3Color) {
    layer3Color.addEventListener('input', (e) => {
      state.waveLayers.layer3.color = e.target.value;
      if (layer3ColorText) layer3ColorText.textContent = e.target.value.toUpperCase();
    });
  }
  bindSlider('layer3Scale', null, 'layer3ScaleVal', 'x', (v) => { state.waveLayers.layer3.scale = v; });
  bindSlider('layer3Opacity', null, 'layer3OpacityVal', '', (v) => { state.waveLayers.layer3.opacity = v; });
  const layer3Transparent = document.getElementById('layer3Transparent');
  if (layer3Transparent) {
    layer3Transparent.addEventListener('change', (e) => {
      state.waveLayers.layer3.transparent = e.target.checked;
    });
  }

  // Specterr Camera Drift & Rumble
  const cameraDrift = document.getElementById('cameraDrift');
  if (cameraDrift) {
    cameraDrift.addEventListener('change', (e) => {
      state.cameraDrift = e.target.checked;
    });
  }
  bindSlider('driftIntensity', 'driftIntensity', 'driftIntensityVal', ' px');
  bindSlider('cameraRumble', 'cameraRumble', 'cameraRumbleVal', '%');

  // Specterr Backdrop Reflection
  const bgReflectionEl = document.getElementById('bgReflection');
  if (bgReflectionEl) {
    bgReflectionEl.addEventListener('change', (e) => {
      state.bgReflection = e.target.value;
    });
  }

  // Specterr Logo Glow
  const logoGlow = document.getElementById('logoGlow');
  if (logoGlow) {
    logoGlow.addEventListener('change', (e) => {
      state.logoGlow = e.target.checked;
    });
  }
  const logoGlowColor = document.getElementById('logoGlowColor');
  const logoGlowColorText = document.getElementById('logoGlowColorText');
  if (logoGlowColor) {
    logoGlowColor.addEventListener('input', (e) => {
      state.logoGlowColor = e.target.value;
      if (logoGlowColorText) logoGlowColorText.textContent = e.target.value.toUpperCase();
    });
  }
  bindSlider('logoGlowScale', 'logoGlowScale', 'logoGlowScaleVal', 'x');

  // Specterr YouTube Like & Subscribe Animation
  const showYouTubeCta = document.getElementById('showYouTubeCta');
  if (showYouTubeCta) {
    showYouTubeCta.addEventListener('change', (e) => {
      state.showYouTubeCta = e.target.checked;
    });
  }
  bindSlider('ctaStartTime', 'ctaStartTime', 'ctaStartTimeVal', 's');
  bindSlider('ctaDuration', 'ctaDuration', 'ctaDurationVal', 's');
  const ctaPosition = document.getElementById('ctaPosition');
  if (ctaPosition) {
    ctaPosition.addEventListener('change', (e) => {
      state.ctaPosition = e.target.value;
    });
  }
  const ctaChannelName = document.getElementById('ctaChannelName');
  if (ctaChannelName) {
    ctaChannelName.addEventListener('input', (e) => {
      state.ctaChannelName = e.target.value;
    });
  }

  // Specterr Audio-Synced Lyrics Subtitles Engine
  const showLyrics = document.getElementById('showLyrics');
  if (showLyrics) {
    showLyrics.addEventListener('change', (e) => {
      state.showLyrics = e.target.checked;
    });
  }
  const lyricsText = document.getElementById('lyricsText');
  if (lyricsText) {
    lyricsText.value = state.lyricsText;
    lyricsText.addEventListener('input', (e) => {
      state.lyricsText = e.target.value;
    });
  }
  const btnLoadDemoLyrics = document.getElementById('btnLoadDemoLyrics');
  if (btnLoadDemoLyrics) {
    btnLoadDemoLyrics.addEventListener('click', () => {
      const demoLrc = "[00:03.00] In the dark of the night\n[00:07.50] We find our guiding light\n[00:11.00] Bass reverberates into the sky\n[00:15.50] Feel the soundwave flying high\n[00:20.00] Never looking back again\n[00:24.50] Pure energy till the end\n[00:29.00] We are unstoppable!";
      state.lyricsText = demoLrc;
      if (lyricsText) lyricsText.value = demoLrc;
      state.showLyrics = true;
      if (showLyrics) showLyrics.checked = true;
    });
  }
  const btnClearLyrics = document.getElementById('btnClearLyrics');
  if (btnClearLyrics) {
    btnClearLyrics.addEventListener('click', () => {
      state.lyricsText = '';
      if (lyricsText) lyricsText.value = '';
    });
  }
  bindSlider('lyricsFontSize', 'lyricsFontSize', 'lyricsFontSizeVal', ' px');
  const lyricsColor = document.getElementById('lyricsColor');
  const lyricsColorText = document.getElementById('lyricsColorText');
  if (lyricsColor) {
    lyricsColor.addEventListener('input', (e) => {
      state.lyricsColor = e.target.value;
      if (lyricsColorText) lyricsColorText.textContent = e.target.value.toUpperCase();
    });
  }
  const lyricsGlowColor = document.getElementById('lyricsGlowColor');
  const lyricsGlowColorText = document.getElementById('lyricsGlowColorText');
  if (lyricsGlowColor) {
    lyricsGlowColor.addEventListener('input', (e) => {
      state.lyricsGlowColor = e.target.value;
      if (lyricsGlowColorText) lyricsGlowColorText.textContent = e.target.value.toUpperCase();
    });
  }
  bindSlider('lyricsPosY', 'lyricsPosY', 'lyricsPosYVal', ' px');

  // Specterr Particle Direction Mode Buttons (Out, In, Left, Right, Up, Down, Flock)
  document.querySelectorAll('.p-dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.p-dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dir = btn.dataset.dir || 'out';
      state.particles.direction = dir;
      state.particles.movementMode = (dir === 'flock') ? 'flock' : 'standard';
      particles.cell.direction = dir;
      particles.cell.movementMode = (dir === 'flock') ? 'flock' : 'standard';
    });
  });

  // Bind Visualizer Customization Sliders
  bindSlider('segmentCount', 'segmentCount', 'segmentCountVal', '');
  bindSlider('minRadius', 'minRadius', 'minRadiusVal', ' px');
  bindSlider('maxRadius', 'maxRadius', 'maxRadiusVal', ' px');
  bindSlider('logoInset', 'logoInset', 'logoInsetVal', ' px');
  bindSlider('visRotationAngle', 'visRotationAngle', 'visRotationAngleVal', '°');
  bindSlider('polygonSides', 'polygonSides', 'polygonSidesVal', '');
  bindSlider('graphRepeat', 'graphRepeat', 'graphRepeatVal', 'x');
  bindSlider('minFrequency', 'minFrequency', 'minFrequencyVal', ' Hz');
  bindSlider('maxFrequency', 'maxFrequency', 'maxFrequencyVal', ' Hz');

  // Bind Transform Controls Sliders
  bindSlider('posXOffset', 'posXOffset', 'posXOffsetVal', '%');
  bindSlider('posYOffset', 'posYOffset', 'posYOffsetVal', '%');
  bindSlider('scaleX', 'scaleX', 'scaleXVal', 'x');
  bindSlider('scaleY', 'scaleY', 'scaleYVal', 'x');
  bindSlider('rotX', 'rotX', 'rotXVal', '°');
  bindSlider('rotY', 'rotY', 'rotYVal', '°');
  bindSlider('rotZ', 'rotZ', 'rotZVal', '°');

  // Bind Reactivity & Effects Sliders
  bindSlider('visScaleMultiplier', 'visScaleMultiplier', 'visScaleMultiplierVal', 'x');
  bindSlider('visTwitch', 'visTwitch', 'visTwitchVal', ' px');

  // Sensitivity Presets Buttons (Low, Medium, High)
  const btnSensLow = document.getElementById('btnSensLow');
  const btnSensMed = document.getElementById('btnSensMed');
  const btnSensHigh = document.getElementById('btnSensHigh');
  const sensSlider = document.getElementById('sensitivity');

  const setSensMode = (mode, val) => {
    state.spectrumSensitivity = mode;
    state.sensitivity = val;
    if (sensSlider) {
      sensSlider.value = val;
      sensSlider.dispatchEvent(new Event('input'));
    }
    if (btnSensLow) btnSensLow.classList.toggle('active', mode === 'low');
    if (btnSensMed) btnSensMed.classList.toggle('active', mode === 'med');
    if (btnSensHigh) btnSensHigh.classList.toggle('active', mode === 'high');
  };

  if (btnSensLow) btnSensLow.addEventListener('click', () => setSensMode('low', 0.8));
  if (btnSensMed) btnSensMed.addEventListener('click', () => setSensMode('med', 1.25));
  if (btnSensHigh) btnSensHigh.addEventListener('click', () => setSensMode('high', 2.0));

  // Bind Animation & Transition Sliders (Fades & Delays)
  const bindFadePair = (delayId, timeId, valBadgeId, keyPrefix) => {
    const dEl = document.getElementById(delayId);
    const tEl = document.getElementById(timeId);
    const bEl = document.getElementById(valBadgeId);
    const update = () => {
      if (bEl && dEl && tEl) {
        bEl.textContent = `${parseFloat(dEl.value).toFixed(1)}s / ${parseFloat(tEl.value).toFixed(1)}s`;
      }
    };
    if (dEl) {
      dEl.addEventListener('input', () => {
        state[`${keyPrefix}Delay`] = parseFloat(dEl.value);
        update();
      });
    }
    if (tEl) {
      tEl.addEventListener('input', () => {
        state[`${keyPrefix}Time`] = parseFloat(tEl.value);
        update();
      });
    }
  };

  bindFadePair('videoFadeInDelay', 'videoFadeInTime', 'videoFadeInVal', 'videoFadeIn');
  bindFadePair('videoFadeOutDelay', 'videoFadeOutTime', 'videoFadeOutVal', 'videoFadeOut');
  bindFadePair('bgFadeInDelay', 'bgFadeInTime', 'bgFadeInVal', 'bgFadeIn');
  bindFadePair('bgFadeOutDelay', 'bgFadeOutTime', 'bgFadeOutVal', 'bgFadeOut');
  bindFadePair('visFadeInDelay', 'visFadeInTime', 'visFadeInVal', 'visFadeIn');
  bindFadePair('visFadeOutDelay', 'visFadeOutTime', 'visFadeOutVal', 'visFadeOut');
  bindFadePair('logoFadeInDelay', 'logoFadeInTime', 'logoFadeInVal', 'logoFadeIn');
  bindFadePair('logoFadeOutDelay', 'logoFadeOutTime', 'logoFadeOutVal', 'logoFadeOut');

  // Bind Scale Animations
  bindSlider('visStartScale', 'visStartScale', 'visStartScaleVal', 'x');
  bindSlider('visScaleUpDelay', 'visScaleUpDelay', 'visScaleUpDelayVal', 's');
  bindSlider('visScaleUpTime', 'visScaleUpTime', 'visScaleUpTimeVal', 's');
  bindSlider('visScaleDownTime', 'visScaleDownTime', 'visScaleDownTimeVal', 's');

  // Bind Quality & Debug Video
  bindSlider('exportQualityPercent', 'exportQualityPercent', 'exportQualityVal', '%');
  const chkDebugVideo = document.getElementById('renderDebugVideo');
  if (chkDebugVideo) {
    chkDebugVideo.addEventListener('change', (e) => {
      state.renderDebugVideo = e.target.checked;
    });
  }

  // Quick Color Palette Swatches
  document.querySelectorAll('[data-palette]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-palette]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pal = btn.getAttribute('data-palette');
      const palettes = {
        'trap': { c1: '#ffffff', c2: '#ffffff' },
        'drop': { c1: '#00f0ff', c2: '#ff007f' },
        'gold': { c1: '#ffd700', c2: '#ff5500' },
        'toxic': { c1: '#00ff66', c2: '#aaff00' },
        'crimson': { c1: '#ff1744', c2: '#7f0000' },
        'violet': { c1: '#9933ff', c2: '#00d4ff' }
      };
      if (palettes[pal]) {
        state.color1 = palettes[pal].c1;
        state.color2 = palettes[pal].c2;
        state.borderColor = palettes[pal].c1;
        if (color1Picker) color1Picker.value = palettes[pal].c1;
        if (color1Text) color1Text.value = palettes[pal].c1;
        if (color2Picker) color2Picker.value = palettes[pal].c2;
        if (color2Text) color2Text.value = palettes[pal].c2;
      }
    });
  });

  // Particle Engine Toggles & Dropdowns
  const chkParticles = document.getElementById('particlesEnabled');
  if (chkParticles) {
    chkParticles.addEventListener('change', (e) => {
      state.particles.enabled = e.target.checked;
      state.particlesEnabled = e.target.checked;
      particles.enabled = e.target.checked;
    });
  }

  const pPreserveDepth = document.getElementById('pPreserveDepth');
  if (pPreserveDepth) {
    pPreserveDepth.addEventListener('change', (e) => {
      state.particles.preserveDepth = e.target.checked;
      particles.emitter.preserveDepth = e.target.checked;
    });
  }

  const pReactsToBass = document.getElementById('pReactsToBass');
  if (pReactsToBass) {
    pReactsToBass.addEventListener('change', (e) => {
      state.particles.reactsToBass = e.target.checked;
      particles.emitter.reactsToBass = e.target.checked;
    });
  }

  const pMirroring = document.getElementById('pMirroring');
  if (pMirroring) {
    pMirroring.addEventListener('change', (e) => {
      state.particles.mirroring = e.target.checked;
      particles.emitter.mirroring = e.target.checked;
    });
  }

  const pMatchVisualizers = document.getElementById('pMatchVisualizers');
  if (pMatchVisualizers) {
    pMatchVisualizers.addEventListener('change', (e) => {
      state.particles.matchVisualizers = e.target.checked;
      particles.transform.matchVisualizers = e.target.checked;
    });
  }

  const pCustomSize = document.getElementById('pCustomSize');
  const pWidthRow = document.getElementById('pWidthRow');
  const pHeightRow = document.getElementById('pHeightRow');
  if (pCustomSize) {
    pCustomSize.addEventListener('change', (e) => {
      state.particles.customSize = e.target.checked;
      particles.transform.customSize = e.target.checked;
      if (pWidthRow) pWidthRow.style.display = e.target.checked ? 'block' : 'none';
      if (pHeightRow) pHeightRow.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const pPreviewMode = document.getElementById('pPreviewMode');
  if (pPreviewMode) {
    pPreviewMode.addEventListener('change', (e) => {
      state.particles.previewMode = e.target.value;
      particles.previewMode = e.target.value;
    });
  }

  const pEmitterShape = document.getElementById('pEmitterShape');
  if (pEmitterShape) {
    pEmitterShape.addEventListener('change', (e) => {
      state.particles.emitterShape = e.target.value;
      particles.emitter.shape = e.target.value;
    });
  }

  const pEmitterMode = document.getElementById('pEmitterMode');
  if (pEmitterMode) {
    pEmitterMode.addEventListener('change', (e) => {
      state.particles.emitterMode = e.target.value;
      particles.emitter.mode = e.target.value;
    });
  }

  const pCellShape = document.getElementById('pCellShape');
  const pCustomShapeControls = document.getElementById('pCustomShapeControls');
  if (pCellShape) {
    pCellShape.addEventListener('change', (e) => {
      state.particles.cellShape = e.target.value;
      particles.cell.shape = e.target.value;
      if (pCustomShapeControls) {
        pCustomShapeControls.style.display = (e.target.value === 'custom') ? 'flex' : 'none';
      }
    });
  }

  // Particle Color & Swatches
  const pColorPicker = document.getElementById('pColorPicker');
  const pColorText = document.getElementById('pColorText');
  const btnSaveColorSwatch = document.getElementById('btnSaveColorSwatch');
  const pColorSwatchesStrip = document.getElementById('pColorSwatchesStrip');

  function updateParticleColor(hex) {
    state.particles.color = hex;
    particles.cell.color = hex;
    particles.baseRgb = particles.hexToRgb(hex);
    if (pColorPicker) pColorPicker.value = hex;
    if (pColorText) pColorText.value = hex;
  }

  if (pColorPicker) {
    pColorPicker.addEventListener('input', (e) => updateParticleColor(e.target.value));
  }
  if (pColorText) {
    pColorText.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        updateParticleColor(e.target.value);
      }
    });
  }
  if (pColorSwatchesStrip) {
    pColorSwatchesStrip.addEventListener('click', (e) => {
      const btn = e.target.closest('.bg-preset-btn');
      if (btn && btn.dataset.color) {
        updateParticleColor(btn.dataset.color);
        pColorSwatchesStrip.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  }
  if (btnSaveColorSwatch && pColorSwatchesStrip) {
    btnSaveColorSwatch.addEventListener('click', () => {
      const hex = pColorPicker.value;
      const btn = document.createElement('button');
      btn.className = 'bg-preset-btn active';
      btn.dataset.color = hex;
      btn.style.padding = '3px 8px';
      btn.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hex};margin-right:4px;"></span>${hex}`;
      pColorSwatchesStrip.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
      pColorSwatchesStrip.appendChild(btn);
    });
  }

  // Custom Shape Controls in Sidebar
  const btnChooseShapeLib = document.getElementById('btnChooseShapeLib');
  const btnUploadShape = document.getElementById('btnUploadShape');
  const pActiveShapeCard = document.getElementById('pActiveShapeCard');
  const pActiveShapeThumb = document.getElementById('pActiveShapeThumb');
  const pActiveShapeName = document.getElementById('pActiveShapeName');
  const btnRemoveCustomShape = document.getElementById('btnRemoveCustomShape');

  function setActiveCustomShape(img, name, id = null) {
    state.particles.customShapeImage = img;
    state.particles.customShapeId = id;
    state.particles.customShapeName = name;
    state.particles.cellShape = 'custom';
    particles.setCustomShape(img, id);
    if (pCellShape) pCellShape.value = 'custom';
    if (pCustomShapeControls) pCustomShapeControls.style.display = 'flex';
    if (pActiveShapeCard) pActiveShapeCard.style.display = 'flex';
    if (pActiveShapeThumb) pActiveShapeThumb.src = img.src;
    if (pActiveShapeName) pActiveShapeName.textContent = name;
  }

  function clearActiveCustomShape() {
    state.particles.customShapeImage = null;
    state.particles.customShapeId = null;
    state.particles.customShapeName = '';
    state.particles.cellShape = 'circle';
    particles.cell.shape = 'circle';
    particles.cell.customShapeImage = null;
    if (pCellShape) pCellShape.value = 'circle';
    if (pCustomShapeControls) pCustomShapeControls.style.display = 'none';
    if (pActiveShapeCard) pActiveShapeCard.style.display = 'none';
  }

  if (btnChooseShapeLib) {
    btnChooseShapeLib.addEventListener('click', () => openMediaLibrary('shapes'));
  }

  if (btnUploadShape) {
    btnUploadShape.addEventListener('click', async () => {
      try {
        const res = await window.spectrometerAPI.openImageDialog('Upload Custom Particle Shape (60x60 White PNG)');
        if (res.canceled) return;
        await window.spectrometerAPI.libraryAddShape(res.filePath, res.fileName);
        const base64 = await window.spectrometerAPI.readFileAsBase64(res.filePath);
        const img = await loadImageFromBase64(base64);
        setActiveCustomShape(img, res.fileName);
      } catch (e) {
        alert('Error uploading shape: ' + e.message);
      }
    });
  }

  if (btnRemoveCustomShape) {
    btnRemoveCustomShape.addEventListener('click', clearActiveCustomShape);
  }

  // Dropdown selects
  const particlePatternEl = document.getElementById('particlePattern');
  if (particlePatternEl) {
    particlePatternEl.addEventListener('change', (e) => state.particlePattern = e.target.value);
  }
  if (bgScaleMode) {
    bgScaleMode.addEventListener('change', (e) => state.bgScaleMode = e.target.value);
  }

  // Text inputs
  document.getElementById('artistName').addEventListener('input', (e) => state.artistName = e.target.value);
  document.getElementById('trackTitle').addEventListener('input', (e) => state.trackTitle = e.target.value);
  document.getElementById('watermarkText').addEventListener('input', (e) => state.watermarkText = e.target.value);

  // Color inputs
  const color1Picker = document.getElementById('color1Picker');
  const color1Text = document.getElementById('color1Text');
  const color2Picker = document.getElementById('color2Picker');
  const color2Text = document.getElementById('color2Text');

  color1Picker.addEventListener('input', (e) => {
    state.color1 = e.target.value;
    state.borderColor = e.target.value;
    state.titleColor = e.target.value;
    color1Text.value = e.target.value;
  });
  color1Text.addEventListener('input', (e) => {
    state.color1 = e.target.value;
    state.borderColor = e.target.value;
    state.titleColor = e.target.value;
    color1Picker.value = e.target.value;
  });

  color2Picker.addEventListener('input', (e) => {
    state.color2 = e.target.value;
    color2Text.value = e.target.value;
  });
  color2Text.addEventListener('input', (e) => {
    state.color2 = e.target.value;
    color2Picker.value = e.target.value;
  });

  // Preset switching & Management
  const btnSavePreset = document.getElementById('btnSavePreset');
  const btnExportPreset = document.getElementById('btnExportPreset');
  const btnImportPreset = document.getElementById('btnImportPreset');
  const presetFileInput = document.getElementById('presetFileInput');

  function refreshPresetDropdown(selectedId) {
    if (!presetSelect) return;
    const currentVal = selectedId || presetSelect.value || 'trap-nation';
    presetSelect.innerHTML = '';

    const list = presetManager.getPresetList();
    const defGroup = document.createElement('optgroup');
    defGroup.label = 'Templates & Styles';
    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Custom User Presets';

    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = (p.isCustom ? '⭐ ' : '🎵 ') + p.name;
      if (p.isCustom) customGroup.appendChild(opt);
      else defGroup.appendChild(opt);
    });

    presetSelect.appendChild(defGroup);
    if (customGroup.children.length > 0) {
      presetSelect.appendChild(customGroup);
    }
    presetSelect.value = currentVal;
  }

  presetSelect.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });

  if (btnSavePreset) {
    btnSavePreset.addEventListener('click', () => {
      const name = prompt('Enter a name for this custom visualizer preset:', 'My Custom Preset');
      if (!name) return;
      const snapshot = {
        name,
        visStyle: state.visStyle,
        visShape: state.visShape,
        polygonSides: state.polygonSides,
        segmentCount: state.segmentCount,
        curveSmoothing: state.curveSmoothing,
        minRadius: state.minRadius,
        maxRadius: state.maxRadius,
        logoInset: state.logoInset,
        visRotationAngle: state.visRotationAngle,
        linearWidth: state.linearWidth,
        audioMapping: state.audioMapping,
        visPlacement: state.visPlacement,
        graphRepeat: state.graphRepeat,
        minFrequency: state.minFrequency,
        maxFrequency: state.maxFrequency,
        dotSize: state.dotSize,
        visualizerStyle: state.visualizerStyle,
        waveFillMode: state.waveFillMode,
        chromaticAberration: state.chromaticAberration,
        chromaticIntensity: state.chromaticIntensity,
        groundReflection: state.groundReflection,
        barCount: state.barCount,
        barMaxHeight: state.barMaxHeight,
        barMinHeight: state.barMinHeight,
        barWidth: state.barWidth,
        barGap: state.barGap,
        barCap: state.barCap,
        smoothing: state.smoothing,
        sensitivity: state.sensitivity,
        color1: state.color1,
        color2: state.color2,
        glowIntensity: state.glowIntensity,
        showProgressRing: state.showProgressRing,
        visScaleMultiplier: state.visScaleMultiplier,
        visTwitch: state.visTwitch,
        spectrumSensitivity: state.spectrumSensitivity,
        bassShake: state.bassShake,
        shockwavesEnabled: state.shockwavesEnabled,
        vignette: state.vignette,
        vignetteIntensity: state.vignetteIntensity,
        transformPreviewMode: state.transformPreviewMode,
        posXOffset: state.posXOffset,
        posYOffset: state.posYOffset,
        scaleX: state.scaleX,
        scaleY: state.scaleY,
        rotX: state.rotX,
        rotY: state.rotY,
        rotZ: state.rotZ,
        videoFadeInDelay: state.videoFadeInDelay,
        videoFadeInTime: state.videoFadeInTime,
        videoFadeOutDelay: state.videoFadeOutDelay,
        videoFadeOutTime: state.videoFadeOutTime,
        bgFadeInDelay: state.bgFadeInDelay,
        bgFadeInTime: state.bgFadeInTime,
        bgFadeOutDelay: state.bgFadeOutDelay,
        bgFadeOutTime: state.bgFadeOutTime,
        logoFadeInDelay: state.logoFadeInDelay,
        logoFadeInTime: state.logoFadeInTime,
        logoFadeOutDelay: state.logoFadeOutDelay,
        logoFadeOutTime: state.logoFadeOutTime,
        visFadeInDelay: state.visFadeInDelay,
        visFadeInTime: state.visFadeInTime,
        visFadeOutDelay: state.visFadeOutDelay,
        visFadeOutTime: state.visFadeOutTime,
        visStartScale: state.visStartScale,
        visScaleUpDelay: state.visScaleUpDelay,
        visScaleUpTime: state.visScaleUpTime,
        visScaleDownTime: state.visScaleDownTime,
        particlesEnabled: state.particlesEnabled,
        artistName: state.artistName,
        trackTitle: state.trackTitle,
        watermarkText: state.watermarkText
      };
      const saved = presetManager.saveUserPreset(name, snapshot);
      refreshPresetDropdown(saved.id);
      alert(`Preset "${name}" saved successfully!`);
    });
  }

  if (btnExportPreset) {
    btnExportPreset.addEventListener('click', () => {
      const curId = presetSelect ? presetSelect.value : 'trap-nation';
      try {
        const jsonStr = presetManager.exportPresetJSON(curId);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${curId}_preset.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('Export preset error: ' + e.message);
      }
    });
  }

  if (btnImportPreset && presetFileInput) {
    btnImportPreset.addEventListener('click', () => {
      presetFileInput.click();
    });

    presetFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = presetManager.importPresetJSON(event.target.result);
          refreshPresetDropdown(imported.id);
          applyPreset(imported.id);
          alert(`Preset "${imported.name}" imported and applied!`);
        } catch (err) {
          alert('Failed to import preset: ' + err.message);
        }
      };
      reader.readAsText(file);
      presetFileInput.value = '';
    });
  }

  function applyPreset(presetId) {
    const preset = presetManager.getPreset(presetId);
    if (!preset) return;

    Object.assign(state, preset);

    if (preset.color1) {
      color1Picker.value = preset.color1;
      color1Text.value = preset.color1;
    }
    if (preset.color2) {
      color2Picker.value = preset.color2;
      color2Text.value = preset.color2;
    }

    const setUI = (id, val, badgeId, suffix = '') => {
      const el = document.getElementById(id);
      if (el) el.value = val;
      const b = document.getElementById(badgeId);
      if (b) b.textContent = `${val}${suffix}`;
    };

    setUI('bgBlur', state.bgBlur, 'bgBlurVal', ' px');
    setUI('bgBrightness', state.bgBrightness, 'bgBrightnessVal', '');
    setUI('bgContrast', state.bgContrast || 1.0, 'bgContrastVal', '');
    setUI('bgSaturate', state.bgSaturate || 1.0, 'bgSaturateVal', '');
    setUI('logoRadius', state.logoRadius, 'logoRadiusVal', ' px');
    setUI('borderWidth', state.borderWidth, 'borderWidthVal', ' px');
    setUI('logoBounce', state.logoBounce, 'logoBounceVal', 'x');
    setUI('barCount', state.barCount, 'barCountVal', '');
    setUI('barMaxHeight', state.barMaxHeight, 'barMaxHeightVal', ' px');
    setUI('barWidth', state.barWidth, 'barWidthVal', ' px');
    setUI('barGap', state.barGap, 'barGapVal', ' px');
    setUI('smoothing', state.smoothing, 'smoothingVal', '');
    setUI('sensitivity', state.sensitivity, 'sensitivityVal', 'x');
    setUI('glowIntensity', state.glowIntensity, 'glowVal', 'x');
    setUI('bassShake', state.bassShake, 'bassShakeVal', 'x');
    setUI('vignetteIntensity', state.vignetteIntensity, 'vignetteVal', '');
    setUI('chromaticIntensity', state.chromaticIntensity || 1.0, 'chromaticIntensityVal', 'x');
    setUI('artistFontSize', state.artistFontSize, 'artistFontSizeVal', ' px');
    setUI('titleFontSize', state.titleFontSize, 'titleFontSizeVal', ' px');

    // Visualizer Customization updates
    if (state.visStyle) {
      const el = document.getElementById('visStyle');
      if (el) el.value = state.visStyle;
    }
    if (state.visShape) {
      const el = document.getElementById('visShape');
      if (el) el.value = state.visShape;
      const polyRow = document.getElementById('polygonSidesRow');
      if (polyRow) polyRow.style.display = state.visShape === 'polygon' ? 'flex' : 'none';
    }
    if (state.audioMapping) {
      const el = document.getElementById('audioMapping');
      if (el) el.value = state.audioMapping;
    }
    if (state.visPlacement) {
      const el = document.getElementById('visPlacement');
      if (el) el.value = state.visPlacement;
    }
    if (state.curveSmoothing !== undefined) {
      const el = document.getElementById('curveSmoothing');
      if (el) el.checked = !!state.curveSmoothing;
    }

    setUI('segmentCount', state.segmentCount || state.barCount || 128, 'segmentCountVal', '');
    setUI('minRadius', state.minRadius !== undefined ? state.minRadius : 140, 'minRadiusVal', ' px');
    setUI('maxRadius', state.maxRadius !== undefined ? state.maxRadius : 180, 'maxRadiusVal', ' px');
    setUI('logoInset', state.logoInset || 0, 'logoInsetVal', ' px');
    setUI('visRotationAngle', state.visRotationAngle || 0, 'visRotationAngleVal', '°');
    setUI('polygonSides', state.polygonSides || 6, 'polygonSidesVal', '');
    setUI('graphRepeat', state.graphRepeat || 1, 'graphRepeatVal', 'x');
    setUI('minFrequency', state.minFrequency || 25, 'minFrequencyVal', ' Hz');
    setUI('maxFrequency', state.maxFrequency || 15000, 'maxFrequencyVal', ' Hz');

    // Audio Reactivity & Effects
    setUI('visScaleMultiplier', state.visScaleMultiplier !== undefined ? state.visScaleMultiplier : 1.35, 'visScaleMultiplierVal', 'x');
    setUI('visTwitch', state.visTwitch || 0, 'visTwitchVal', ' px');
    if (state.spectrumSensitivity) {
      setSensMode(state.spectrumSensitivity, state.sensitivity || 1.25);
    }

    // Transform Controls
    if (state.transformPreviewMode) {
      const el = document.getElementById('transformPreviewMode');
      if (el) el.value = state.transformPreviewMode;
    }
    setUI('posXOffset', state.posXOffset || 0, 'posXOffsetVal', '%');
    setUI('posYOffset', state.posYOffset || 0, 'posYOffsetVal', '%');
    setUI('scaleX', state.scaleX !== undefined ? state.scaleX : 1.0, 'scaleXVal', 'x');
    setUI('scaleY', state.scaleY !== undefined ? state.scaleY : 1.0, 'scaleYVal', 'x');
    setUI('rotX', state.rotX || 0, 'rotXVal', '°');
    setUI('rotY', state.rotY || 0, 'rotYVal', '°');
    setUI('rotZ', state.rotZ || 0, 'rotZVal', '°');

    // Animations & Transitions
    const updateFadeUI = (delayId, timeId, valBadgeId, keyPrefix) => {
      const dEl = document.getElementById(delayId);
      const tEl = document.getElementById(timeId);
      const bEl = document.getElementById(valBadgeId);
      const dVal = state[`${keyPrefix}Delay`] || 0;
      const tVal = state[`${keyPrefix}Time`] || 0;
      if (dEl) dEl.value = dVal;
      if (tEl) tEl.value = tVal;
      if (bEl) bEl.textContent = `${dVal.toFixed(1)}s / ${tVal.toFixed(1)}s`;
    };
    updateFadeUI('videoFadeInDelay', 'videoFadeInTime', 'videoFadeInVal', 'videoFadeIn');
    updateFadeUI('videoFadeOutDelay', 'videoFadeOutTime', 'videoFadeOutVal', 'videoFadeOut');
    updateFadeUI('bgFadeInDelay', 'bgFadeInTime', 'bgFadeInVal', 'bgFadeIn');
    updateFadeUI('bgFadeOutDelay', 'bgFadeOutTime', 'bgFadeOutVal', 'bgFadeOut');
    updateFadeUI('visFadeInDelay', 'visFadeInTime', 'visFadeInVal', 'visFadeIn');
    updateFadeUI('visFadeOutDelay', 'visFadeOutTime', 'visFadeOutVal', 'visFadeOut');
    updateFadeUI('logoFadeInDelay', 'logoFadeInTime', 'logoFadeInVal', 'logoFadeIn');
    updateFadeUI('logoFadeOutDelay', 'logoFadeOutTime', 'logoFadeOutVal', 'logoFadeOut');

    setUI('visStartScale', state.visStartScale !== undefined ? state.visStartScale : 1.0, 'visStartScaleVal', 'x');
    setUI('visScaleUpDelay', state.visScaleUpDelay || 0, 'visScaleUpDelayVal', 's');
    setUI('visScaleUpTime', state.visScaleUpTime || 0, 'visScaleUpTimeVal', 's');
    setUI('visScaleDownTime', state.visScaleDownTime || 0, 'visScaleDownTimeVal', 's');

    if (preset.visualizerStyle) {
      state.visualizerStyle = preset.visualizerStyle;
      const el = document.getElementById('visualizerStyle');
      if (el) el.value = preset.visualizerStyle;
    }
    if (preset.waveFillMode) {
      state.waveFillMode = preset.waveFillMode;
      const el = document.getElementById('waveFillMode');
      if (el) el.value = preset.waveFillMode;
    }
    if (preset.chromaticAberration !== undefined) {
      state.chromaticAberration = preset.chromaticAberration;
      const el = document.getElementById('chromaticAberration');
      if (el) el.checked = preset.chromaticAberration;
    }
    if (preset.groundReflection !== undefined) {
      state.groundReflection = preset.groundReflection;
      const el = document.getElementById('groundReflection');
      if (el) el.checked = preset.groundReflection;
    }
    if (preset.showProgressRing !== undefined) {
      state.showProgressRing = preset.showProgressRing;
      const el = document.getElementById('showProgressRing');
      if (el) el.checked = preset.showProgressRing;
    }

    if (preset.color1) {
      updateParticleColor(preset.color1);
    }

    if (document.getElementById('artistName')) document.getElementById('artistName').value = state.artistName || '';
    if (document.getElementById('trackTitle')) document.getElementById('trackTitle').value = state.trackTitle || '';
    if (document.getElementById('watermarkText')) document.getElementById('watermarkText').value = state.watermarkText || '';

    // Specterr Enhanced UI Controls Sync
    if (state.visDirection) {
      const btnOut = document.getElementById('btnDirOutward');
      const btnIn = document.getElementById('btnDirInward');
      if (btnOut && btnIn) {
        btnOut.classList.toggle('active', state.visDirection === 'outward');
        btnIn.classList.toggle('active', state.visDirection === 'inward');
      }
    }
    if (state.visReflection) {
      const el = document.getElementById('visReflection');
      if (el) el.value = state.visReflection;
    }
    if (state.invertSpectrum !== undefined) {
      const el = document.getElementById('invertSpectrum');
      if (el) el.checked = !!state.invertSpectrum;
    }

    // Multi-Layer Wave Sync
    if (state.waveLayers) {
      if (state.waveLayers.layer2) {
        const l2 = state.waveLayers.layer2;
        const en = document.getElementById('layer2Enabled');
        if (en) en.checked = !!l2.enabled;
        const col = document.getElementById('layer2Color');
        if (col && l2.color) col.value = l2.color;
        setUI('layer2Scale', l2.scale || 1.15, 'layer2ScaleVal', 'x');
        setUI('layer2Opacity', l2.opacity || 0.65, 'layer2OpacityVal', '');
        const tr = document.getElementById('layer2Transparent');
        if (tr) tr.checked = !!l2.transparent;
        setUI('layer2Width', l2.outlineWidth || 3, 'layer2WidthVal', ' px');
      }
      if (state.waveLayers.layer3) {
        const l3 = state.waveLayers.layer3;
        const en = document.getElementById('layer3Enabled');
        if (en) en.checked = !!l3.enabled;
        const col = document.getElementById('layer3Color');
        if (col && l3.color) col.value = l3.color;
        setUI('layer3Scale', l3.scale || 0.88, 'layer3ScaleVal', 'x');
        setUI('layer3Opacity', l3.opacity || 0.50, 'layer3OpacityVal', '');
        const tr = document.getElementById('layer3Transparent');
        if (tr) tr.checked = !!l3.transparent;
      }
    }

    // Motion, Camera & Glow FX Sync
    if (state.cameraDrift !== undefined) {
      const el = document.getElementById('cameraDrift');
      if (el) el.checked = !!state.cameraDrift;
    }
    setUI('driftIntensity', state.driftIntensity || 14, 'driftIntensityVal', ' px');
    setUI('cameraRumble', state.cameraRumble !== undefined ? state.cameraRumble : 20, 'cameraRumbleVal', '%');
    if (state.bgReflection) {
      const el = document.getElementById('bgReflection');
      if (el) el.value = state.bgReflection;
    }
    if (state.logoGlow !== undefined) {
      const el = document.getElementById('logoGlow');
      if (el) el.checked = !!state.logoGlow;
    }
    if (state.logoGlowColor) {
      const col = document.getElementById('logoGlowColor');
      if (col) col.value = state.logoGlowColor;
    }
    setUI('logoGlowScale', state.logoGlowScale || 1.35, 'logoGlowScaleVal', 'x');

    // YouTube CTA Sync
    if (state.showYouTubeCta !== undefined) {
      const el = document.getElementById('showYouTubeCta');
      if (el) el.checked = !!state.showYouTubeCta;
    }
    setUI('ctaStartTime', state.ctaStartTime !== undefined ? state.ctaStartTime : 2.0, 'ctaStartTimeVal', 's');
    setUI('ctaDuration', state.ctaDuration !== undefined ? state.ctaDuration : 7.0, 'ctaDurationVal', 's');
    if (state.ctaPosition) {
      const el = document.getElementById('ctaPosition');
      if (el) el.value = state.ctaPosition;
    }
    if (state.ctaChannelName) {
      const el = document.getElementById('ctaChannelName');
      if (el) el.value = state.ctaChannelName;
    }

    // Lyrics Sync
    if (state.showLyrics !== undefined) {
      const el = document.getElementById('showLyrics');
      if (el) el.checked = !!state.showLyrics;
    }
    if (state.lyricsText !== undefined) {
      const el = document.getElementById('lyricsText');
      if (el) el.value = state.lyricsText;
    }
    setUI('lyricsFontSize', state.lyricsFontSize || 34, 'lyricsFontSizeVal', ' px');
    if (state.lyricsColor) {
      const col = document.getElementById('lyricsColor');
      if (col) col.value = state.lyricsColor;
    }
    if (state.lyricsGlowColor) {
      const col = document.getElementById('lyricsGlowColor');
      if (col) col.value = state.lyricsGlowColor;
    }
    setUI('lyricsPosY', state.lyricsPosY !== undefined ? state.lyricsPosY : 240, 'lyricsPosYVal', ' px');
  }

  // Initialize Preset dropdown
  refreshPresetDropdown('trap-nation');

  // Load Image helper
  function loadImageFromBase64(base64Str) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = base64Str;
    });
  }

  // =========================================================================
  // Unified Audio Loader (WAV, MP3, FLAC, M4A, etc.)
  // =========================================================================
  async function loadAudioFromPath(filePath, fileName, metadata = null) {
    try {
      const buffer = await window.spectrometerAPI.readFileAsArrayBuffer(filePath);
      await audioManager.loadAudioFile(filePath, buffer, fileName);

      document.getElementById('audioFileName').textContent = fileName;
      document.getElementById('audioDurationText').textContent = formatTime(audioManager.duration);
      document.getElementById('audioStatusBadge').textContent = 'Loaded';
      document.getElementById('audioStatusBadge').style.color = 'var(--accent-emerald)';

      // Auto-extract artist and title from filename (e.g. "Artist - Title.mp3")
      if (fileName.includes('-')) {
        const parts = fileName.replace(/\.[^/.]+$/, '').split('-');
        if (parts.length >= 2) {
          state.artistName = parts[0].trim();
          state.trackTitle = parts[1].trim();
          document.getElementById('artistName').value = state.artistName;
          document.getElementById('trackTitle').value = state.trackTitle;
        }
      }

      // Probe metadata if not provided
      if (!metadata) {
        metadata = await window.spectrometerAPI.probeAudioMetadata(filePath);
      }
      updateAudioMetadataDisplay(metadata, fileName);
      updateExportSummary();

      // Auto-play preview
      audioManager.play(0);
      updatePlayPauseButton();

    } catch (err) {
      console.error('Error loading audio:', err);
      alert('Error loading audio: ' + err.message);
    }
  }

  function updateAudioMetadataDisplay(metadata, fileName) {
    if (!metadata) return;
    state.audioMetadata = metadata;

    if (audioQualityInfoBox) {
      audioQualityInfoBox.style.display = 'flex';
    }

    const ext = fileName.split('.').pop().toUpperCase();
    if (audioFormatTag) {
      audioFormatTag.textContent = metadata.isHighRes ? `${metadata.bitDepth} ${ext}` : `${ext} AUDIO`;
      audioFormatTag.style.background = metadata.isHighRes ? 'var(--accent-emerald)' : 'var(--accent-gold)';
    }

    if (audioSpecsDesc) {
      audioSpecsDesc.textContent = metadata.description || `${metadata.bitDepth} • ${metadata.sampleRateFormatted} • ${metadata.channels}`;
    }

    if (audioTrackHeaderBadge) {
      audioTrackHeaderBadge.textContent = `🎵 ${metadata.isHighRes ? 'Hi-Res ' : ''}${ext} (${metadata.sampleRateFormatted})`;
    }
  }

  // Choose Audio Button
  document.getElementById('btnSelectAudio').addEventListener('click', async () => {
    const res = await window.spectrometerAPI.openAudioDialog();
    if (res.canceled) return;
    await loadAudioFromPath(res.filePath, res.fileName, res.metadata);
  });

  // =========================================================================
  // Background Image Handling & Customization
  // =========================================================================
  async function loadBackgroundFromPath(filePath, displayName) {
    try {
      const base64 = await window.spectrometerAPI.readFileAsBase64(filePath);
      state.bgImage = await loadImageFromBase64(base64);
      bgFileName.textContent = displayName || filePath.split(/[\\/]/).pop();
    } catch (err) {
      console.error('Error loading background:', err);
      alert('Error loading background: ' + err.message);
    }
  }

  // Choose Background Button
  btnSelectBg.addEventListener('click', async () => {
    const res = await window.spectrometerAPI.openImageDialog('Select Background Image');
    if (res.canceled) return;
    await loadBackgroundFromPath(res.filePath, res.fileName);
    clearPresetButtonsActive();
    try {
      await window.spectrometerAPI.libraryAddBackground(res.filePath, res.fileName);
    } catch (e) {
      console.warn('Library background save error:', e);
    }
  });

  // Quick Change Background from header
  if (btnQuickChangeBg) {
    btnQuickChangeBg.addEventListener('click', async () => {
      const res = await window.spectrometerAPI.openImageDialog('Select Background Image');
      if (res.canceled) return;
      await loadBackgroundFromPath(res.filePath, res.fileName);
      clearPresetButtonsActive();
      try {
        await window.spectrometerAPI.libraryAddBackground(res.filePath, res.fileName);
      } catch (e) {
        console.warn('Library background save error:', e);
      }
    });
  }

  btnRemoveBg.addEventListener('click', () => {
    state.bgImage = null;
    bgFileName.textContent = 'Default Dark Studio Gradient';
    clearPresetButtonsActive();
  });

  function clearPresetButtonsActive() {
    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
  }

  // Preset Backgrounds buttons
  document.querySelectorAll('.bg-preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      clearPresetButtonsActive();
      btn.classList.add('active');
      const bgType = btn.getAttribute('data-bg');

      if (!appPaths) {
        appPaths = await window.spectrometerAPI.getAppPaths();
      }

      if (bgType === 'gradient') {
        state.bgImage = null;
        bgFileName.textContent = 'Default Dark Studio Gradient';
        return;
      }

      const map = {
        mountains: 'mountains-bg.jpg',
        nebula: 'nebula-bg.jpg',
        cyberpunk: 'cyberpunk-bg.jpg',
        sunset: 'sunset-bg.jpg',
        fire: 'fire-bg.jpg',
        aurora: 'aurora-bg.jpg'
      };

      const filename = map[bgType] || 'mountains-bg.jpg';
      const fullPath = `${appPaths.rootDir}\\assets\\backgrounds\\${filename}`;
      await loadBackgroundFromPath(fullPath, `${btn.textContent.trim()} Background`);
    });
  });

  // =========================================================================
  // Drag and Drop Handling (Audio & Images)
  // =========================================================================
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrapper.classList.add('drag-over-active');
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrapper.classList.remove('drag-over-active');
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrapper.classList.remove('drag-over-active');

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();

      // Audio file dropped
      if (name.endsWith('.wav') || name.endsWith('.mp3') || name.endsWith('.flac') ||
          name.endsWith('.ogg') || name.endsWith('.m4a') || name.endsWith('.aac')) {
        await loadAudioFromPath(file.path, file.name);
      }
      // Image file dropped
      else if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') ||
               name.endsWith('.webp') || name.endsWith('.bmp') || name.endsWith('.gif')) {
        await loadBackgroundFromPath(file.path, file.name);
        clearPresetButtonsActive();
      }
    }
  });

  // =========================================================================
  // Logo & Emblem Customization: 3-Way Mode Switcher (Custom, Preset, No Logo)
  // =========================================================================
  const btnLogoModeCustom = document.getElementById('btnLogoModeCustom');
  const btnLogoModePreset = document.getElementById('btnLogoModePreset');
  const btnLogoModeNone = document.getElementById('btnLogoModeNone');
  const logoFileRow = document.getElementById('logoFileRow');
  const presetEmblemsRow = document.getElementById('presetEmblemsRow');
  const hollowRingControls = document.getElementById('hollowRingControls');
  const hollowCoreDisc = document.getElementById('hollowCoreDisc');
  const logoFileName = document.getElementById('logoFileName');

  function setLogoMode(mode) {
    state.logoMode = mode;

    if (btnLogoModeCustom) btnLogoModeCustom.classList.toggle('active', mode === 'custom');
    if (btnLogoModePreset) btnLogoModePreset.classList.toggle('active', mode === 'preset');
    if (btnLogoModeNone) btnLogoModeNone.classList.toggle('active', mode === 'none');

    if (mode === 'custom') {
      if (logoFileRow) logoFileRow.style.display = 'flex';
      if (presetEmblemsRow) presetEmblemsRow.style.display = 'none';
      if (hollowRingControls) hollowRingControls.style.display = 'none';
    } else if (mode === 'preset') {
      if (logoFileRow) logoFileRow.style.display = 'none';
      if (presetEmblemsRow) presetEmblemsRow.style.display = 'block';
      if (hollowRingControls) hollowRingControls.style.display = 'none';

      // Load default preset if not yet loaded
      if (!state.presetLogoImage) {
        loadPresetLogo('trap');
      }
    } else if (mode === 'none') {
      if (logoFileRow) logoFileRow.style.display = 'none';
      if (presetEmblemsRow) presetEmblemsRow.style.display = 'none';
      if (hollowRingControls) hollowRingControls.style.display = 'flex';
    }
  }

  if (btnLogoModeCustom) btnLogoModeCustom.addEventListener('click', () => setLogoMode('custom'));
  if (btnLogoModePreset) btnLogoModePreset.addEventListener('click', () => setLogoMode('preset'));
  if (btnLogoModeNone) btnLogoModeNone.addEventListener('click', () => setLogoMode('none'));

  if (hollowCoreDisc) {
    hollowCoreDisc.addEventListener('change', (e) => {
      state.hollowCoreDisc = e.target.checked;
    });
  }

  async function loadPresetLogo(emblemKey) {
    if (!appPaths) {
      appPaths = await window.spectrometerAPI.getAppPaths();
    }
    const map = {
      trap: 'trap-emblem.png',
      vinyl: 'vinyl-record.png',
      soundwave: 'soundwave-circle.png',
      skull: 'cyberpunk-skull.png'
    };
    const filename = map[emblemKey] || 'trap-emblem.png';
    const fullPath = `${appPaths.rootDir}\\assets\\logos\\${filename}`;

    try {
      const base64 = await window.spectrometerAPI.readFileAsBase64(fullPath);
      state.presetLogoImage = await loadImageFromBase64(base64);

      // Highlight active button in logo presets strip
      document.querySelectorAll('#logoPresetsStrip .bg-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-emblem') === emblemKey);
      });
    } catch (err) {
      console.error('Error loading preset emblem:', err);
    }
  }

  // Preset emblem strip buttons
  document.querySelectorAll('#logoPresetsStrip .bg-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emblemKey = btn.getAttribute('data-emblem');
      loadPresetLogo(emblemKey);
    });
  });

  // Choose Center Logo Image (Custom Art)
  document.getElementById('btnSelectLogo').addEventListener('click', async () => {
    try {
      const res = await window.spectrometerAPI.openImageDialog('Select Center Emblem Logo');
      if (res.canceled) return;
      const base64 = await window.spectrometerAPI.readFileAsBase64(res.filePath);
      state.logoImage = await loadImageFromBase64(base64);
      logoFileName.textContent = res.fileName;
      setLogoMode('custom');

      // Auto-save to user library for future sessions
      try {
        await window.spectrometerAPI.libraryAddLogo(res.filePath, res.fileName);
      } catch (e) {
        console.warn('Library logo save error:', e);
      }
    } catch (err) {
      alert('Error loading logo: ' + err.message);
    }
  });

  document.getElementById('btnRemoveLogo').addEventListener('click', () => {
    state.logoImage = null;
    state.presetLogoImage = null;
    logoFileName.textContent = 'Default Emblem';
    setLogoMode('preset');
  });

  // Load Demo Beat Assets
  async function loadDemoAssets() {
    try {
      if (!appPaths) {
        appPaths = await window.spectrometerAPI.getAppPaths();
      }
      if (!appPaths.hasDemoAssets) {
        return;
      }

      // Load demo audio & probe metadata
      await loadAudioFromPath(appPaths.demoAudio, 'demo-track.wav (Punchy Trap Beat)', appPaths.demoMetadata);

      // Load demo background
      const bgBase64 = await window.spectrometerAPI.readFileAsBase64(appPaths.demoBg);
      state.bgImage = await loadImageFromBase64(bgBase64);
      bgFileName.textContent = 'trap-nation-official-bg.jpg (Cosmic 4K Nebula)';

      // Load demo logo
      const logoBase64 = await window.spectrometerAPI.readFileAsBase64(appPaths.demoLogo);
      state.logoImage = await loadImageFromBase64(logoBase64);
      document.getElementById('logoFileName').textContent = 'demo-logo.png (Default Logo)';

      // Populate demo synced lyrics
      const demoLrc = "[00:03.00] In the dark of the night\n[00:07.50] We find our guiding light\n[00:11.00] Bass reverberates into the sky\n[00:15.50] Feel the soundwave flying high\n[00:20.00] Never looking back again\n[00:24.50] Pure energy till the end\n[00:29.00] We are unstoppable!";
      state.lyricsText = demoLrc;
      const lt = document.getElementById('lyricsText');
      if (lt) lt.value = demoLrc;

    } catch (err) {
      console.error('Error loading demo assets:', err);
    }
  }

  btnLoadDemo.addEventListener('click', loadDemoAssets);

  // Transport controls
  btnPlayPause.addEventListener('click', () => {
    if (audioManager.isPlaying) {
      audioManager.pause();
    } else {
      audioManager.play();
    }
    updatePlayPauseButton();
  });

  function updatePlayPauseButton() {
    if (audioManager.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  audioManager.onEndedCallback = () => {
    updatePlayPauseButton();
    timelineScrubber.value = 0;
    currentTimeLabel.textContent = '00:00';
  };

  timelineScrubber.addEventListener('input', () => {
    const time = (parseFloat(timelineScrubber.value) / 100) * audioManager.duration;
    audioManager.seek(time);
    currentTimeLabel.textContent = formatTime(time);
  });

  volumeSlider.addEventListener('input', () => {
    audioManager.setVolume(parseFloat(volumeSlider.value));
  });

  // Keyboard shortcut: Spacebar for play/pause
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      btnPlayPause.click();
    }
  });

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // =========================================================================
  // Live Preview Render Loop (60 FPS Lightweight Canvas)
  // =========================================================================
  function previewLoop(timestamp) {
    const deltaTime = Math.min(0.1, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    // FPS Meter
    frameCount++;
    fpsTimer += deltaTime;
    if (fpsTimer >= 0.5) {
      const currentFps = Math.round(frameCount / fpsTimer);
      if (fpsBadge) fpsBadge.textContent = `${currentFps} FPS`;
      const statusBarFps = document.getElementById('statusBarFps');
      if (statusBarFps) statusBarFps.textContent = `${currentFps.toFixed(1)} FPS`;
      frameCount = 0;
      fpsTimer = 0;
    }

    const curTime = audioManager.getCurrentTime();
    const dur = audioManager.duration || 1;

    // Update transport labels if playing
    if (audioManager.isPlaying) {
      timelineScrubber.value = (curTime / dur) * 100;
      currentTimeLabel.textContent = formatTime(curTime);
      totalDurationLabel.textContent = formatTime(dur);
    }

    // Audio frequency analysis based on current imported audio
    const audioData = audioManager.getLiveAudioData(
      state.segmentCount || state.barCount || 128,
      state.minFrequency || 25,
      state.maxFrequency || 15000,
      state.smoothing,
      state.sensitivity
    );

    // Update particles and shockwaves
    const isParticlesOn = state.particles ? state.particles.enabled !== false : state.particlesEnabled !== false;
    if (isParticlesOn) {
      const baseScale = Math.min(previewCanvas.width, previewCanvas.height) / 1080;
      const pRadius = (state.logoRadius || 140) * baseScale;
      particles.update(deltaTime, audioData.kickPulse, audioData.bassLevel, baseScale, pRadius);
    }
    if (state.shockwavesEnabled !== false) {
      shockwaves.update(curTime);
    }

    // Draw frame
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderer.render(
      previewCtx,
      previewCanvas.width,
      previewCanvas.height,
      state,
      audioData,
      particles,
      shockwaves,
      curTime,
      dur
    );

    requestAnimationFrame(previewLoop);
  }
  requestAnimationFrame(previewLoop);

  // =========================================================================
  // Export Modal & Resolution Selection
  // =========================================================================
  const exportResolutionPreset = document.getElementById('exportResolutionPreset');
  const customResGroup = document.getElementById('customResGroup');
  const customWidth = document.getElementById('customWidth');
  const customHeight = document.getElementById('customHeight');
  const exportFps = document.getElementById('exportFps');
  const exportEncoder = document.getElementById('exportEncoder');
  const exportQuality = document.getElementById('exportQuality');
  const exportRangeMode = document.getElementById('exportRangeMode');
  const customClipGroup = document.getElementById('customClipGroup');
  const exportStartTime = document.getElementById('exportStartTime');
  const exportDuration = document.getElementById('exportDuration');

  exportResolutionPreset.addEventListener('change', () => {
    if (exportResolutionPreset.value === 'custom') {
      customResGroup.style.display = 'grid';
    } else {
      customResGroup.style.display = 'none';
      const [w, h] = exportResolutionPreset.value.split('x').map(Number);
      if (w > h) {
        state.aspectRatio = '16-9';
      } else if (h > w) {
        state.aspectRatio = '9-16';
      } else {
        state.aspectRatio = '1-1';
      }
      updatePreviewCanvasDimensions();
    }
    updateExportSummary();
  });

  exportRangeMode.addEventListener('change', () => {
    customClipGroup.style.display = exportRangeMode.value === 'clip' ? 'grid' : 'none';
    updateExportSummary();
  });

  exportFps.addEventListener('change', updateExportSummary);
  exportEncoder.addEventListener('change', updateExportSummary);
  if (exportAudioCodec) {
    exportAudioCodec.addEventListener('change', updateExportSummary);
  }

  function getTargetResolution() {
    if (exportResolutionPreset.value === 'custom') {
      const w = parseInt(customWidth.value, 10) || 1920;
      const h = parseInt(customHeight.value, 10) || 1080;
      return { width: w, height: h };
    }
    const [w, h] = exportResolutionPreset.value.split('x').map(Number);
    return { width: w, height: h };
  }

  function getExportRange() {
    const totalSongDuration = audioManager.duration || 15;
    if (exportRangeMode.value === 'clip') {
      const st = Math.max(0, parseFloat(exportStartTime.value) || 0);
      const dur = Math.min(totalSongDuration - st, parseFloat(exportDuration.value) || 15);
      return { startTime: st, duration: Math.max(1, dur) };
    }
    return { startTime: 0, duration: totalSongDuration };
  }

  function updateExportSummary() {
    const { width, height } = getTargetResolution();
    const { startTime, duration } = getExportRange();
    const fps = parseInt(exportFps.value, 10);
    const totalFrames = Math.floor(duration * fps);

    // Target badge in preview stage
    let resLabel = `${width} × ${height}`;
    if (width === 7680 && height === 4320) resLabel = '8K UHD (7680×4320)';
    else if (width === 3840 && height === 2160) resLabel = '4K UHD (3840×2160)';
    else if (width === 1080 && height === 1920) resLabel = '1080p Shorts (1080×1920)';
    else if (width === 2160 && height === 3840) resLabel = '4K Shorts (2160×3840)';
    else if (width === 4320 && height === 7680) resLabel = '8K Shorts (4320×7680)';

    targetResolutionBadge.textContent = `Target: ${resLabel} @ ${fps} FPS`;

    // Modal summary fields
    document.getElementById('summaryResolution').textContent = `${width} × ${height}`;
    document.getElementById('summaryAspect').textContent = width > height ? '16:9 Landscape' : (height > width ? '9:16 Portrait' : '1:1 Square');
    document.getElementById('summaryCodec').textContent = `${fps} FPS (${exportEncoder.value})`;
    document.getElementById('summaryDuration').textContent = `${formatTime(duration)} (${totalFrames.toLocaleString()} frames)`;

    // Audio Quality summary in modal
    const audioCodecVal = exportAudioCodec ? exportAudioCodec.value : 'copy';
    if (summaryAudio) {
      if (audioCodecVal === 'copy') {
        const desc = state.audioMetadata ? state.audioMetadata.description : 'Lossless Source Copy';
        summaryAudio.textContent = `Same as Audio (${desc})`;
      } else if (audioCodecVal === 'alac') {
        summaryAudio.textContent = 'Apple Lossless ALAC (24-bit PCM)';
      } else if (audioCodecVal === 'aac_512') {
        summaryAudio.textContent = 'Broadcast AAC (512 kbps High-Res)';
      } else {
        summaryAudio.textContent = 'Standard AAC (320 kbps)';
      }
    }

    if (summarySourceAudio && state.audioMetadata) {
      summarySourceAudio.textContent = state.audioMetadata.description || 'Source Audio';
    }

    // Auto default filename
    if (!exportOutputPath.value) {
      const baseName = (state.artistName || 'Artist').replace(/[^a-z0-9]/gi, '_') + '_' + (state.trackTitle || 'Track').replace(/[^a-z0-9]/gi, '_');
      const suffix = width >= 7680 || height >= 7680 ? '8K' : (width >= 3840 || height >= 3840 ? '4K' : '1080p');
      exportOutputPath.value = `${baseName}_${suffix}_${fps}FPS.mp4`;
    }
  }

  btnOpenExportModal.addEventListener('click', () => {
    if (!audioManager.isLoaded) {
      alert('Please load an audio track first (or click "Load Demo Beat" at the top).');
      return;
    }
    updateExportSummary();
    exportConfigView.style.display = 'block';
    exportProgressView.style.display = 'none';
    exportSuccessView.style.display = 'none';
    btnStartExport.style.display = 'block';
    btnCancelExport.textContent = 'Cancel';

    exportModal.classList.add('active');
  });

  btnCloseExportModal.addEventListener('click', () => {
    if (isExporting) {
      if (!confirm('Rendering is in progress. Are you sure you want to cancel?')) return;
      cancelRendering();
    }
    exportModal.classList.remove('active');
  });

  btnBrowseOutput.addEventListener('click', async () => {
    const defaultName = exportOutputPath.value || 'Spectrometer_Video_4K.mp4';
    const res = await window.spectrometerAPI.saveVideoDialog(defaultName);
    if (!res.canceled && res.filePath) {
      exportOutputPath.value = res.filePath;
    }
  });

  // =========================================================================
  // Final Resolution 8K / 4K Video Render Pipeline
  // =========================================================================
  btnStartExport.addEventListener('click', async () => {
    const { width, height } = getTargetResolution();
    const { startTime, duration } = getExportRange();
    const fps = exportFps ? parseInt(exportFps.value, 10) : (state.exportFps || 60);
    const exportQualityPercentEl = document.getElementById('exportQualityPercent');
    const qualityPercent = exportQualityPercentEl ? parseInt(exportQualityPercentEl.value, 10) : (state.exportQualityPercent || 85);
    const crf = Math.round(32 - ((qualityPercent / 100) * 18));
    const encoder = exportEncoder ? exportEncoder.value : (state.exportCodec || 'libx264');
    const audioCodec = exportAudioCodec ? exportAudioCodec.value : 'copy';
    let outputPath = exportOutputPath.value;

    if (!outputPath || (!outputPath.toLowerCase().endsWith('.mp4') && !outputPath.toLowerCase().endsWith('.mov'))) {
      const defaultName = (encoder === 'prores' || encoder === 'prores_ks') ? 'Spectrometer_Output.mov' : 'Spectrometer_Output.mp4';
      const res = await window.spectrometerAPI.saveVideoDialog(defaultName);
      if (res.canceled || !res.filePath) return;
      outputPath = res.filePath;
      exportOutputPath.value = outputPath;
    }

    isExporting = true;
    isExportCanceled = false;
    audioManager.pause();
    updatePlayPauseButton();

    // Switch modal view to progress
    exportConfigView.style.display = 'none';
    exportProgressView.style.display = 'block';
    exportSuccessView.style.display = 'none';
    btnStartExport.style.display = 'none';
    btnCancelExport.textContent = 'Abort Export';

    exportStatusText.textContent = 'Pre-computing audio spectrum analysis...';
    exportProgressBar.style.width = '0%';
    exportPercentage.textContent = '0%';

    try {
      const totalFrames = Math.floor(duration * fps);
      statFrames.textContent = `0 / ${totalFrames.toLocaleString()}`;
      statFps.textContent = '0 FPS';
      statElapsed.textContent = '00:00';
      statEta.textContent = '--:--';

      // 1. Precompute offline FFT frames from the imported audio
      const precomputedFrames = audioManager.precomputeOfflineFrames(
        fps,
        startTime,
        duration,
        state,
        (progress) => {
          exportStatusText.textContent = `Pre-analyzing audio frequencies: ${Math.round(progress)}%`;
        }
      );

      if (isExportCanceled) return;

      // 2. Start FFmpeg process with high-res audio passthrough
      exportStatusText.textContent = `Spawning ${width}×${height} encoder pipeline...`;
      await window.spectrometerAPI.startExport({
        outputPath,
        width,
        height,
        fps,
        audioPath: audioManager.audioPath,
        audioCodec, // 'copy' guarantees exact source high-res quality
        startTime,
        duration,
        encoder,
        crf,
        bitrate: width >= 7680 ? '120M' : '50M',
        inputFormat: 'mjpeg',
        totalFrames
      });

      // 3. Create Offscreen Canvas for Full Target Resolution (up to 8K!)
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d');

      // Cloned particle system for clean deterministic export
      const exportParticles = new ParticleSystem(state.particles);
      if (state.particles && state.particles.customShapeImage) {
        exportParticles.setCustomShape(state.particles.customShapeImage, state.particles.customShapeId);
      }
      exportParticles.previewMode = 'video';
      const exportShockwaves = new ShockwaveManager();

      const startTimeMs = performance.now();
      let lastStatsUpdate = performance.now();

      // 4. Sequential Frame Rendering & Streaming Loop
      for (let f = 0; f < totalFrames; f++) {
        if (isExportCanceled) {
          cancelRendering();
          return;
        }

        const frameTime = startTime + (f / fps);
        const deltaTime = 1.0 / fps;
        const audioData = precomputedFrames[f];

        // Deterministic particle and shockwave simulation
        const isParticlesOn = state.particles ? state.particles.enabled !== false : state.particlesEnabled !== false;
        if (isParticlesOn) {
          const baseScale = Math.min(width, height) / 1080;
          const pRadius = (state.logoRadius || 140) * baseScale;
          exportParticles.update(deltaTime, audioData.kickPulse, audioData.bassLevel, baseScale, pRadius);
        }
        if (state.shockwavesEnabled !== false) {
          exportShockwaves.update(frameTime);
        }

        // Draw master frame at full target resolution
        offCtx.clearRect(0, 0, width, height);
        renderer.render(
          offCtx,
          width,
          height,
          state,
          audioData,
          exportParticles,
          exportShockwaves,
          frameTime,
          audioManager.duration
        );

        // Convert canvas frame to JPEG blob
        const blob = await new Promise((resolve) => offscreen.toBlob(resolve, 'image/jpeg', 0.96));
        const arrayBuf = await blob.arrayBuffer();

        // Write frame directly to FFmpeg stdin via IPC
        await window.spectrometerAPI.writeExportFrame(new Uint8Array(arrayBuf));

        // Periodic stats update
        const now = performance.now();
        if (now - lastStatsUpdate > 250 || f === totalFrames - 1) {
          lastStatsUpdate = now;
          const percent = ((f + 1) / totalFrames) * 100;
          const elapsedSec = (now - startTimeMs) / 1000;
          const currentSpeed = (f + 1) / Math.max(0.001, elapsedSec);
          const remainingFrames = totalFrames - (f + 1);
          const etaSec = remainingFrames / Math.max(0.1, currentSpeed);

          exportProgressBar.style.width = `${percent.toFixed(1)}%`;
          exportPercentage.textContent = `${percent.toFixed(1)}%`;
          exportStatusText.textContent = `Encoding ${width}×${height} frame ${f + 1} of ${totalFrames}...`;

          statFrames.textContent = `${(f + 1).toLocaleString()} / ${totalFrames.toLocaleString()}`;
          statFps.textContent = `${currentSpeed.toFixed(1)} FPS`;
          statElapsed.textContent = formatTime(elapsedSec);
          statEta.textContent = formatTime(etaSec);
        }
      }

      // 5. Finish export
      exportStatusText.textContent = 'Muxing final high-resolution audio & video container...';
      const finishResult = await window.spectrometerAPI.finishExport();
      exportedVideoPath = finishResult.outputPath || outputPath;

      // 6. Show Success View
      exportProgressView.style.display = 'none';
      exportSuccessView.style.display = 'block';
      successFilePath.textContent = exportedVideoPath;
      btnCancelExport.textContent = 'Close';
      isExporting = false;

      // Auto-open YouTube upload if user enabled the toggle
      const autoYt = document.getElementById('autoOpenYouTubeUpload');
      if (autoYt && autoYt.checked) {
        setTimeout(() => {
          exportModal.classList.remove('active');
          openYouTubeUploadModal(exportedVideoPath);
        }, 600);
      }

    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + err.message);
      cancelRendering();
    }
  });

  function cancelRendering() {
    isExportCanceled = true;
    isExporting = false;
    window.spectrometerAPI.cancelExport();
    exportProgressView.style.display = 'none';
    exportConfigView.style.display = 'block';
    btnStartExport.style.display = 'block';
    btnCancelExport.textContent = 'Cancel';
  }

  btnCancelExport.addEventListener('click', () => {
    if (isExporting) {
      cancelRendering();
    } else {
      exportModal.classList.remove('active');
    }
  });

  btnOpenVideo.addEventListener('click', () => {
    if (exportedVideoPath) {
      window.spectrometerAPI.openFile(exportedVideoPath);
    }
  });

  btnShowFolder.addEventListener('click', () => {
    if (exportedVideoPath) {
      window.spectrometerAPI.showItemInFolder(exportedVideoPath);
    }
  });

  // =========================================================================
  // YouTube Upload Studio Management
  // =========================================================================
  const youtubeModal = document.getElementById('youtubeModal');
  const btnOpenYouTubeModal = document.getElementById('btnOpenYouTubeModal');
  const btnCloseYouTubeModal = document.getElementById('btnCloseYouTubeModal');
  const btnCancelYtModal = document.getElementById('btnCancelYtModal');
  const btnUploadAfterRender = document.getElementById('btnUploadAfterRender');

  const btnYtConnect = document.getElementById('btnYtConnect');
  const btnYtDisconnect = document.getElementById('btnYtDisconnect');
  const btnYtConfigToggle = document.getElementById('btnYtConfigToggle');
  const ytApiSetupBox = document.getElementById('ytApiSetupBox');
  const btnSaveYtCreds = document.getElementById('btnSaveYtCreds');
  const ytClientId = document.getElementById('ytClientId');
  const ytClientSecret = document.getElementById('ytClientSecret');
  const linkGoogleConsole = document.getElementById('linkGoogleConsole');
  const ytChannelAvatar = document.getElementById('ytChannelAvatar');
  const ytChannelName = document.getElementById('ytChannelName');
  const ytChannelSub = document.getElementById('ytChannelSub');

  const ytVideoFilePath = document.getElementById('ytVideoFilePath');
  const btnBrowseYtVideo = document.getElementById('btnBrowseYtVideo');
  const ytVideoTitle = document.getElementById('ytVideoTitle');
  const ytTitleCount = document.getElementById('ytTitleCount');
  const ytVideoDescription = document.getElementById('ytVideoDescription');
  const ytDescCount = document.getElementById('ytDescCount');
  const ytVideoTags = document.getElementById('ytVideoTags');
  const ytTagsCount = document.getElementById('ytTagsCount');
  const ytPrivacyStatus = document.getElementById('ytPrivacyStatus');
  const ytCategory = document.getElementById('ytCategory');
  const ytMadeForKids = document.getElementById('ytMadeForKids');
  const btnSubmitYtUpload = document.getElementById('btnSubmitYtUpload');

  const ytUploadForm = document.getElementById('ytUploadForm');
  const ytUploadProgressBox = document.getElementById('ytUploadProgressBox');
  const ytUploadProgressBar = document.getElementById('ytUploadProgressBar');
  const ytUploadPercentage = document.getElementById('ytUploadPercentage');
  const ytUploadStatusMsg = document.getElementById('ytUploadStatusMsg');
  const ytStatBytes = document.getElementById('ytStatBytes');
  const ytStatSpeed = document.getElementById('ytStatSpeed');
  const ytStatElapsed = document.getElementById('ytStatElapsed');
  const ytStatEta = document.getElementById('ytStatEta');

  const ytUploadSuccessBox = document.getElementById('ytUploadSuccessBox');
  const ytFinalLinkInput = document.getElementById('ytFinalLinkInput');
  const btnCopyYtLink = document.getElementById('btnCopyYtLink');
  const btnWatchOnYt = document.getElementById('btnWatchOnYt');
  const btnOpenYtStudio = document.getElementById('btnOpenYtStudio');

  let currentYtVideoId = '';
  let isYtUploading = false;

  // Open YouTube Upload Modal
  function openYouTubeUploadModal(targetVideoPath = '') {
    const videoToUpload = targetVideoPath || exportedVideoPath || '';
    if (videoToUpload) {
      ytVideoFilePath.value = videoToUpload;
    }

    // Auto-populate Title if empty or default
    const artist = (state.artistName || 'Artist').trim();
    const track = (state.trackTitle || 'Track').trim();
    const [w, h] = exportResolutionPreset.value.split('x').map(Number);
    const resTag = w >= 7680 || h >= 7680 ? '8K 60FPS' : (w >= 3840 || h >= 3840 ? '4K 60FPS' : '1080p 60FPS');
    
    if (!ytVideoTitle.value || ytVideoTitle.value.includes('Artist - Track')) {
      ytVideoTitle.value = `${artist} - ${track} [${resTag}] | Audio Spectrometer Visualizer`.slice(0, 100);
    }
    updateTitleCount();

    // Auto-populate Description if empty
    if (!ytVideoDescription.value) {
      ytVideoDescription.value = 
`🎵 Track: ${artist} - ${track}
🎬 Visualizer: Generated with Spectrometer Studio (Trap & Drop Nation Style)
⚡ Video Resolution: ${w}x${h} @ ${exportFps.value} FPS
💎 Audio Quality: Master High-Resolution Lossless Audio

🎧 Stream / Download Track:
[Insert your music link here]

🔔 Subscribe to the channel for more bass-boosted EDM & Trap visualizers!

#TrapNation #DropNation #EDM #MusicVisualizer #AudioSpectrometer #8K60FPS #ElectronicMusic #BassBoosted`.trim();
    }
    updateDescCount();

    // Auto-populate Tags if empty
    if (!ytVideoTags.value) {
      ytVideoTags.value = `Trap Nation, Drop Nation, EDM, Remix, 8K 60FPS, 4K Music Video, Audio Visualizer, Bass Boosted, Spectrometer, ${artist}, ${track}`.slice(0, 500);
    }
    updateTagsCount();

    // Reset views
    ytUploadForm.style.display = 'flex';
    ytUploadProgressBox.style.display = 'none';
    ytUploadSuccessBox.style.display = 'none';
    btnSubmitYtUpload.style.display = 'block';
    btnCancelYtModal.textContent = 'Close';

    checkYouTubeChannelStatus();
    youtubeModal.classList.add('active');
  }

  // Header button & Success screen button triggers
  btnOpenYouTubeModal.addEventListener('click', () => openYouTubeUploadModal());
  if (btnUploadAfterRender) {
    btnUploadAfterRender.addEventListener('click', () => {
      exportModal.classList.remove('active');
      openYouTubeUploadModal(exportedVideoPath);
    });
  }

  // Close YouTube modal
  function closeYouTubeModal() {
    if (isYtUploading) {
      if (!confirm('Upload is in progress. Are you sure you want to cancel?')) return;
      window.spectrometerAPI.youtubeCancelUpload();
      isYtUploading = false;
    }
    youtubeModal.classList.remove('active');
  }

  btnCloseYouTubeModal.addEventListener('click', closeYouTubeModal);
  btnCancelYtModal.addEventListener('click', closeYouTubeModal);

  // Check Channel Profile & Connection Status
  async function checkYouTubeChannelStatus() {
    try {
      const profile = await window.spectrometerAPI.youtubeGetProfile();
      if (profile.connected) {
        ytChannelName.textContent = profile.title || 'Connected YouTube Channel';
        ytChannelSub.textContent = profile.subscriberCount 
          ? `${parseInt(profile.subscriberCount).toLocaleString()} Subscribers • Ready to Upload`
          : 'Ready to Upload Highest Quality Videos';
        if (profile.avatarUrl) {
          ytChannelAvatar.innerHTML = `<img src="${profile.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%;">`;
        } else {
          ytChannelAvatar.textContent = '📺';
        }
        btnYtConnect.style.display = 'none';
        btnYtDisconnect.style.display = 'block';
      } else {
        ytChannelName.textContent = 'YouTube Not Connected';
        ytChannelSub.textContent = 'Sign in to upload videos directly to your YouTube channel';
        ytChannelAvatar.textContent = '📺';
        btnYtConnect.style.display = 'block';
        btnYtDisconnect.style.display = 'none';
      }
    } catch (err) {
      console.error('Error checking YouTube status:', err);
    }
  }

  // Connect Channel
  btnYtConnect.addEventListener('click', async () => {
    try {
      const creds = await window.spectrometerAPI.youtubeGetCredentials();
      if (!creds.clientId || !creds.clientSecret) {
        ytApiSetupBox.style.display = 'flex';
        alert('Please enter your Google Cloud Client ID and Secret first to connect with your YouTube account.');
        return;
      }

      btnYtConnect.textContent = 'Opening Browser...';
      const profile = await window.spectrometerAPI.youtubeConnect();
      checkYouTubeChannelStatus();
      btnYtConnect.textContent = 'Sign In with YouTube';
    } catch (err) {
      btnYtConnect.textContent = 'Sign In with YouTube';
      alert('YouTube connection error: ' + err.message);
    }
  });

  // Disconnect Channel
  btnYtDisconnect.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out from your YouTube channel?')) {
      await window.spectrometerAPI.youtubeDisconnect();
      checkYouTubeChannelStatus();
    }
  });

  // Toggle API setup panel
  btnYtConfigToggle.addEventListener('click', async () => {
    const isVisible = ytApiSetupBox.style.display === 'flex';
    ytApiSetupBox.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      const creds = await window.spectrometerAPI.youtubeGetCredentials();
      ytClientId.value = creds.clientId || '';
      ytClientSecret.value = creds.clientSecret || '';
    }
  });

  // Save API credentials
  btnSaveYtCreds.addEventListener('click', async () => {
    const cid = ytClientId.value.trim();
    const sec = ytClientSecret.value.trim();
    if (!cid || !sec) {
      alert('Please enter both Client ID and Client Secret.');
      return;
    }
    await window.spectrometerAPI.youtubeSaveCredentials(cid, sec);
    alert('✅ YouTube API credentials saved successfully!');
    ytApiSetupBox.style.display = 'none';
  });

  linkGoogleConsole.addEventListener('click', (e) => {
    e.preventDefault();
    window.spectrometerAPI.openFile('https://console.cloud.google.com/apis/credentials');
  });

  // Browse video to upload
  btnBrowseYtVideo.addEventListener('click', async () => {
    const res = await window.spectrometerAPI.openImageDialog('Select MP4 Video to Upload');
    if (!res.canceled && res.filePath) {
      ytVideoFilePath.value = res.filePath;
    }
  });

  // Character counters
  function updateTitleCount() {
    ytTitleCount.textContent = `${ytVideoTitle.value.length} / 100`;
  }
  function updateDescCount() {
    ytDescCount.textContent = `${ytVideoDescription.value.length} / 5,000`;
  }
  function updateTagsCount() {
    ytTagsCount.textContent = `${ytVideoTags.value.length} / 500`;
  }

  ytVideoTitle.addEventListener('input', updateTitleCount);
  ytVideoDescription.addEventListener('input', updateDescCount);
  ytVideoTags.addEventListener('input', updateTagsCount);

  // Submit Upload to YouTube
  btnSubmitYtUpload.addEventListener('click', async () => {
    const filePath = ytVideoFilePath.value.trim();
    const title = ytVideoTitle.value.trim();
    const description = ytVideoDescription.value.trim();
    const tags = ytVideoTags.value.split(',').map(t => t.trim()).filter(Boolean);
    const privacyStatus = ytPrivacyStatus.value;
    const categoryId = ytCategory.value;
    const madeForKids = ytMadeForKids.value === '1';

    if (!filePath) {
      alert('Please select a video file to upload.');
      return;
    }
    if (!title) {
      alert('Please enter a video title.');
      return;
    }

    // Verify channel connection
    const profile = await window.spectrometerAPI.youtubeGetProfile();
    if (!profile.connected) {
      alert('Please connect your YouTube channel first by clicking "Sign In with YouTube".');
      return;
    }

    isYtUploading = true;
    ytUploadForm.style.display = 'none';
    ytUploadProgressBox.style.display = 'flex';
    ytUploadSuccessBox.style.display = 'none';
    btnSubmitYtUpload.style.display = 'none';
    btnCancelYtModal.textContent = 'Cancel Upload';

    ytUploadProgressBar.style.width = '0%';
    ytUploadPercentage.textContent = '0%';
    ytUploadStatusMsg.textContent = 'Initiating resumable upload to YouTube...';

    const unsubscribe = window.spectrometerAPI.onYouTubeUploadProgress((data) => {
      ytUploadProgressBar.style.width = `${data.progress.toFixed(1)}%`;
      ytUploadPercentage.textContent = `${data.progress.toFixed(1)}%`;
      ytUploadStatusMsg.textContent = `Streaming high-quality video frames to YouTube: ${data.progress.toFixed(1)}%`;

      const uploadedMB = (data.uploadedBytes / (1024 * 1024)).toFixed(1);
      const totalMB = (data.totalBytes / (1024 * 1024)).toFixed(1);
      ytStatBytes.textContent = `${uploadedMB} / ${totalMB} MB`;
      ytStatSpeed.textContent = `${data.speedMBps} MB/s`;
      ytStatElapsed.textContent = formatTime(data.elapsedSec);
      ytStatEta.textContent = formatTime(data.etaSec);
    });

    try {
      const res = await window.spectrometerAPI.youtubeUpload({
        filePath,
        title,
        description,
        tags,
        privacyStatus,
        categoryId,
        madeForKids
      });

      unsubscribe();
      isYtUploading = false;
      currentYtVideoId = res.videoId;

      // Show Success Screen
      ytUploadProgressBox.style.display = 'none';
      ytUploadSuccessBox.style.display = 'block';
      ytFinalLinkInput.value = res.videoUrl;
      btnCancelYtModal.textContent = 'Done';

    } catch (err) {
      unsubscribe();
      isYtUploading = false;
      console.error('Upload failed:', err);
      alert('YouTube upload failed: ' + err.message);
      ytUploadProgressBox.style.display = 'none';
      ytUploadForm.style.display = 'flex';
      btnSubmitYtUpload.style.display = 'block';
      btnCancelYtModal.textContent = 'Close';
    }
  });

  // Copy Link button
  btnCopyYtLink.addEventListener('click', () => {
    navigator.clipboard.writeText(ytFinalLinkInput.value);
    btnCopyYtLink.textContent = '✅ Copied!';
    setTimeout(() => btnCopyYtLink.textContent = '📋 Copy', 2000);
  });

  // Watch on YouTube button
  btnWatchOnYt.addEventListener('click', () => {
    if (ytFinalLinkInput.value) {
      window.spectrometerAPI.openFile(ytFinalLinkInput.value);
    }
  });

  // Open YouTube Studio button
  btnOpenYtStudio.addEventListener('click', () => {
    if (currentYtVideoId) {
      window.spectrometerAPI.openFile(`https://studio.youtube.com/video/${currentYtVideoId}/edit`);
    }
  });

  // =========================================================================
  // Media Library Manager (Presets & Persistent Uploads for BGs and Logos)
  // =========================================================================
  const mediaLibraryModal = document.getElementById('mediaLibraryModal');
  const btnOpenMediaLibrary = document.getElementById('btnOpenMediaLibrary');
  const btnOpenBgLib = document.getElementById('btnOpenBgLib');
  const btnOpenLogoLib = document.getElementById('btnOpenLogoLib');
  const btnCloseMediaLibraryModal = document.getElementById('btnCloseMediaLibraryModal');
  const btnCloseMediaLibraryFooter = document.getElementById('btnCloseMediaLibraryFooter');
  const libTabBtnBg = document.getElementById('libTabBtnBg');
  const libTabBtnLogo = document.getElementById('libTabBtnLogo');
  const libTabBtnShapes = document.getElementById('libTabBtnShapes');
  const libPanelBg = document.getElementById('libPanelBg');
  const libPanelLogo = document.getElementById('libPanelLogo');
  const libPanelShapes = document.getElementById('libPanelShapes');
  const btnLibUploadBg = document.getElementById('btnLibUploadBg');
  const btnLibUploadLogo = document.getElementById('btnLibUploadLogo');
  const btnLibUploadShape = document.getElementById('btnLibUploadShape');
  const btnLibSelectHollow = document.getElementById('btnLibSelectHollow');
  const libGridPresetBgs = document.getElementById('libGridPresetBgs');
  const libGridUserBgs = document.getElementById('libGridUserBgs');
  const libUserBgCount = document.getElementById('libUserBgCount');
  const libGridPresetLogos = document.getElementById('libGridPresetLogos');
  const libGridUserLogos = document.getElementById('libGridUserLogos');
  const libUserLogoCount = document.getElementById('libUserLogoCount');
  const libGridPresetShapes = document.getElementById('libGridPresetShapes');
  const libGridUserShapes = document.getElementById('libGridUserShapes');
  const libUserShapeCount = document.getElementById('libUserShapeCount');

  function openMediaLibrary(tab = 'bg') {
    if (!mediaLibraryModal) return;
    mediaLibraryModal.classList.add('active');
    switchLibraryTab(tab);
    renderMediaLibrary();
  }

  function closeMediaLibrary() {
    if (!mediaLibraryModal) return;
    mediaLibraryModal.classList.remove('active');
  }

  function switchLibraryTab(tab) {
    if (libTabBtnBg) libTabBtnBg.classList.toggle('active', tab === 'bg');
    if (libTabBtnLogo) libTabBtnLogo.classList.toggle('active', tab === 'logo');
    if (libTabBtnShapes) libTabBtnShapes.classList.toggle('active', tab === 'shapes');

    if (libPanelBg) libPanelBg.style.display = (tab === 'bg') ? 'block' : 'none';
    if (libPanelLogo) libPanelLogo.style.display = (tab === 'logo') ? 'block' : 'none';
    if (libPanelShapes) libPanelShapes.style.display = (tab === 'shapes') ? 'block' : 'none';
  }

  async function renderMediaLibrary() {
    try {
      const lib = await window.spectrometerAPI.libraryGet();

      // 1. Render Preset Backgrounds
      if (libGridPresetBgs) {
        libGridPresetBgs.innerHTML = '';
        for (const item of (lib.presetBackgrounds || [])) {
          const card = document.createElement('div');
          card.className = 'library-item-card';
          card.innerHTML = `
            <img class="library-item-thumb" src="${item.thumbnail}" alt="${item.name}" loading="lazy">
            <div class="library-item-info">
              <div class="library-item-name" title="${item.name}">${item.name}</div>
              <div class="library-item-sub">Ready-Made Preset</div>
            </div>
          `;
          card.addEventListener('click', async () => {
            await loadBackgroundFromPath(item.path, item.name);
            clearPresetButtonsActive();
            closeMediaLibrary();
          });
          libGridPresetBgs.appendChild(card);
        }
      }

      // 2. Render User Uploaded Backgrounds
      if (libGridUserBgs) {
        libGridUserBgs.innerHTML = '';
        const userBgs = lib.userBackgrounds || [];
        if (libUserBgCount) {
          libUserBgCount.textContent = `${userBgs.length} Item${userBgs.length === 1 ? '' : 's'}`;
        }

        if (userBgs.length === 0) {
          libGridUserBgs.innerHTML = `
            <div class="library-empty-notice">
              No custom backgrounds saved yet.<br>Click <strong>"➕ Upload New Background"</strong> above or drop an image into the workspace to save it here.
            </div>
          `;
        } else {
          for (const item of userBgs) {
            const card = document.createElement('div');
            card.className = 'library-item-card';
            card.innerHTML = `
              <img class="library-item-thumb" src="${item.thumbnail}" alt="${item.name}">
              <button class="library-item-del-btn" title="Delete from Library">&times;</button>
              <div class="library-item-info">
                <div class="library-item-name" title="${item.name}">${item.name}</div>
                <div class="library-item-sub">Your Upload</div>
              </div>
            `;

            // Delete button click
            const delBtn = card.querySelector('.library-item-del-btn');
            delBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (confirm(`Delete "${item.name}" from your library?`)) {
                await window.spectrometerAPI.libraryDeleteItem('background', item.id);
                await renderMediaLibrary();
              }
            });

            // Select background on card click
            card.addEventListener('click', async () => {
              await loadBackgroundFromPath(item.path, item.name);
              clearPresetButtonsActive();
              closeMediaLibrary();
            });

            libGridUserBgs.appendChild(card);
          }
        }
      }

      // 3. Render Preset Logos / Emblems
      if (libGridPresetLogos) {
        libGridPresetLogos.innerHTML = '';
        for (const item of (lib.presetLogos || [])) {
          const card = document.createElement('div');
          card.className = 'library-item-card';
          card.innerHTML = `
            <img class="library-item-thumb logo-thumb" src="${item.thumbnail}" alt="${item.name}">
            <div class="library-item-info" style="text-align: center;">
              <div class="library-item-name" title="${item.name}">${item.name}</div>
              <div class="library-item-sub">Preset Emblem</div>
            </div>
          `;
          card.addEventListener('click', async () => {
            const base64 = await window.spectrometerAPI.readFileAsBase64(item.path);
            state.presetLogoImage = await loadImageFromBase64(base64);
            setLogoMode('preset');
            closeMediaLibrary();
          });
          libGridPresetLogos.appendChild(card);
        }
      }

      // 4. Render User Uploaded Logos / Artwork
      if (libGridUserLogos) {
        libGridUserLogos.innerHTML = '';
        const userLogos = lib.userLogos || [];
        if (libUserLogoCount) {
          libUserLogoCount.textContent = `${userLogos.length} Item${userLogos.length === 1 ? '' : 's'}`;
        }

        if (userLogos.length === 0) {
          libGridUserLogos.innerHTML = `
            <div class="library-empty-notice">
              No custom artwork saved yet.<br>Click <strong>"➕ Upload New Artwork"</strong> above to save your custom logos.
            </div>
          `;
        } else {
          for (const item of userLogos) {
            const card = document.createElement('div');
            card.className = 'library-item-card';
            card.innerHTML = `
              <img class="library-item-thumb logo-thumb" src="${item.thumbnail}" alt="${item.name}">
              <button class="library-item-del-btn" title="Delete from Library">&times;</button>
              <div class="library-item-info" style="text-align: center;">
                <div class="library-item-name" title="${item.name}">${item.name}</div>
                <div class="library-item-sub">Custom Artwork</div>
              </div>
            `;

            // Delete button click
            const delBtn = card.querySelector('.library-item-del-btn');
            delBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (confirm(`Delete "${item.name}" from your artwork library?`)) {
                await window.spectrometerAPI.libraryDeleteItem('logo', item.id);
                await renderMediaLibrary();
              }
            });

            // Select logo on card click
            card.addEventListener('click', async () => {
              const base64 = await window.spectrometerAPI.readFileAsBase64(item.path);
              state.logoImage = await loadImageFromBase64(base64);
              logoFileName.textContent = item.name;
              setLogoMode('custom');
              closeMediaLibrary();
            });

            libGridUserLogos.appendChild(card);
          }
        }
      }

      // 5. Render Preset Particle Shapes (60x60 White PNGs)
      if (libGridPresetShapes) {
        libGridPresetShapes.innerHTML = '';
        for (const item of (lib.presetShapes || [])) {
          const card = document.createElement('div');
          card.className = 'library-item-card';
          card.innerHTML = `
            <img class="library-item-thumb shape-thumb" src="${item.thumbnail}" alt="${item.name}">
            <div class="library-item-info" style="text-align: center;">
              <div class="library-item-name" title="${item.name}">${item.name}</div>
              <div class="library-item-sub">Preset 60×60 Shape</div>
            </div>
          `;
          card.addEventListener('click', async () => {
            const img = await loadImageFromBase64(item.thumbnail);
            setActiveCustomShape(img, item.name, item.id);
            closeMediaLibrary();
          });
          libGridPresetShapes.appendChild(card);
        }
      }

      // 6. Render User Uploaded Shapes
      if (libGridUserShapes) {
        libGridUserShapes.innerHTML = '';
        const userShapes = lib.userShapes || [];
        if (libUserShapeCount) {
          libUserShapeCount.textContent = `${userShapes.length} Item${userShapes.length === 1 ? '' : 's'}`;
        }
        if (userShapes.length === 0) {
          libGridUserShapes.innerHTML = `
            <div class="library-empty-notice">
              No custom particle shapes saved yet.<br>Click <strong>"➕ Upload Custom Shape"</strong> above to upload 60×60 white PNG shapes.
            </div>
          `;
        } else {
          for (const item of userShapes) {
            const card = document.createElement('div');
            card.className = 'library-item-card';
            card.innerHTML = `
              <img class="library-item-thumb shape-thumb" src="${item.thumbnail}" alt="${item.name}">
              <button class="library-item-del-btn" title="Delete from Library">&times;</button>
              <div class="library-item-info" style="text-align: center;">
                <div class="library-item-name" title="${item.name}">${item.name}</div>
                <div class="library-item-sub">Custom 60×60 Shape</div>
              </div>
            `;
            const delBtn = card.querySelector('.library-item-del-btn');
            delBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (confirm(`Delete shape "${item.name}" from your library?`)) {
                await window.spectrometerAPI.libraryDeleteItem('shape', item.id);
                await renderMediaLibrary();
              }
            });
            card.addEventListener('click', async () => {
              const img = await loadImageFromBase64(item.thumbnail);
              setActiveCustomShape(img, item.name, item.id);
              closeMediaLibrary();
            });
            libGridUserShapes.appendChild(card);
          }
        }
      }

    } catch (err) {
      console.error('Error rendering media library:', err);
    }
  }

  // Open library buttons
  if (btnOpenMediaLibrary) {
    btnOpenMediaLibrary.addEventListener('click', () => openMediaLibrary('bg'));
  }
  if (btnOpenBgLib) {
    btnOpenBgLib.addEventListener('click', () => openMediaLibrary('bg'));
  }
  if (btnOpenLogoLib) {
    btnOpenLogoLib.addEventListener('click', () => openMediaLibrary('logo'));
  }
  if (btnCloseMediaLibraryModal) {
    btnCloseMediaLibraryModal.addEventListener('click', closeMediaLibrary);
  }
  if (btnCloseMediaLibraryFooter) {
    btnCloseMediaLibraryFooter.addEventListener('click', closeMediaLibrary);
  }
  if (libTabBtnBg) {
    libTabBtnBg.addEventListener('click', () => switchLibraryTab('bg'));
  }
  if (libTabBtnLogo) {
    libTabBtnLogo.addEventListener('click', () => switchLibraryTab('logo'));
  }
  if (libTabBtnShapes) {
    libTabBtnShapes.addEventListener('click', () => switchLibraryTab('shapes'));
  }

  // Upload New Shape from Library
  if (btnLibUploadShape) {
    btnLibUploadShape.addEventListener('click', async () => {
      try {
        const res = await window.spectrometerAPI.openImageDialog('Upload Particle Shape (60x60 White PNG)');
        if (res.canceled) return;
        await window.spectrometerAPI.libraryAddShape(res.filePath, res.fileName);
        const base64 = await window.spectrometerAPI.readFileAsBase64(res.filePath);
        const img = await loadImageFromBase64(base64);
        setActiveCustomShape(img, res.fileName);
        await renderMediaLibrary();
      } catch (e) {
        alert('Error uploading shape: ' + e.message);
      }
    });
  }

  // Hollow Center action in Library
  if (btnLibSelectHollow) {
    btnLibSelectHollow.addEventListener('click', () => {
      setLogoMode('none');
      closeMediaLibrary();
    });
  }

  // Upload New Background from Library
  if (btnLibUploadBg) {
    btnLibUploadBg.addEventListener('click', async () => {
      const res = await window.spectrometerAPI.openImageDialog('Upload Background to Library');
      if (res.canceled) return;
      await window.spectrometerAPI.libraryAddBackground(res.filePath, res.fileName);
      await loadBackgroundFromPath(res.filePath, res.fileName);
      clearPresetButtonsActive();
      await renderMediaLibrary();
    });
  }

  // Upload New Artwork from Library
  if (btnLibUploadLogo) {
    btnLibUploadLogo.addEventListener('click', async () => {
      const res = await window.spectrometerAPI.openImageDialog('Upload Artwork to Library');
      if (res.canceled) return;
      await window.spectrometerAPI.libraryAddLogo(res.filePath, res.fileName);
      const base64 = await window.spectrometerAPI.readFileAsBase64(res.filePath);
      state.logoImage = await loadImageFromBase64(base64);
      logoFileName.textContent = res.fileName;
      setLogoMode('custom');
      await renderMediaLibrary();
    });
  }

  // Click outside to close library modal
  if (mediaLibraryModal) {
    mediaLibraryModal.addEventListener('click', (e) => {
      if (e.target === mediaLibraryModal) {
        closeMediaLibrary();
      }
    });
  }

  // Initial check on launch
  checkYouTubeChannelStatus();

  // Auto-load demo beat on launch
  loadDemoAssets();
});

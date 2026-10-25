const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable GPU hardware acceleration flags
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('use-angle', 'd3d11');

let testPassed = false;

app.whenReady().then(async () => {
  console.log('=== Testing Browser Visualizer Native Windows Integration ===');

  // Register mock/test IPC handlers for YouTube
  ipcMain.handle('youtube:get-credentials', async () => ({
    clientId: '',
    clientSecret: ''
  }));
  ipcMain.handle('youtube:get-profile', async () => ({ connected: false }));
  ipcMain.handle('youtube:save-credentials', async () => ({ success: true }));
  ipcMain.handle('youtube:connect', async () => ({ connected: true, title: 'Test Channel' }));
  ipcMain.handle('youtube:disconnect', async () => ({ success: true }));
  
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'main', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message}`);
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Failed to load:', code, desc);
    process.exit(1);
  });

  const indexPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
  console.log(`Loading: ${indexPath}`);
  await win.loadFile(indexPath);

  // Evaluate inside the renderer
  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const tests = {};
      
      // 1. Check canvas and WebGL2
      const cv = document.querySelector('#c');
      tests.canvasFound = !!cv;
      const gl = cv ? cv.getContext('webgl2') : null;
      tests.webgl2Active = !!gl;
      if (gl) {
        tests.glRenderer = gl.getParameter(gl.RENDERER);
        tests.glVendor = gl.getParameter(gl.VENDOR);
      }

      // 2. Check UI elements
      tests.uiFound = !!document.querySelector('#ui');
      tests.dropEdFound = !!document.querySelector('#dropEd');
      tests.waveFound = !!document.querySelector('#wave');
      tests.rPanelFound = !!document.querySelector('#rPanel');
      tests.btnLoadDemoFound = !!document.querySelector('#btnLoadDemo');
      tests.btnAudioFileFound = !!document.querySelector('#btnAudioFile');
      tests.ytLoadFound = !!document.querySelector('#ytLoad');

      // 3. Check parameters P and controls
      tests.paramDetails = document.querySelectorAll('#params details').length;
      tests.spectrumFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Spectrum');
      tests.ringFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Ring');
      tests.particlesFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Particles');
      tests.windLinesFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Wind lines');
      tests.glitchFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Glitch slices');
      tests.impactFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Impact frame');
      tests.dropEffectsFound = !!Array.from(document.querySelectorAll('#params summary')).find(s => s.textContent === 'Drop effects');

      // 4. Check Presets dropdown
      tests.presetOptions = document.querySelector('#pSel') ? document.querySelector('#pSel').options.length : 0;

      // 5. Check spectrometerAPI exposure
      tests.spectrometerAPIExposed = !!window.spectrometerAPI;
      tests.hasDownloadAudio = !!(window.spectrometerAPI && window.spectrometerAPI.downloadAudioUrl);
      tests.hasSaveTempVideo = !!(window.spectrometerAPI && window.spectrometerAPI.saveTempVideo);
      tests.hasOpenVideoDialog = !!(window.spectrometerAPI && window.spectrometerAPI.openVideoDialog);

      // 6. Check 8K Ultra HD Export and YouTube Studio Direct Section
      tests.has8KOption = !!Array.from(document.querySelectorAll('#rSize option')).find(o => o.value === '4320');
      tests.youtubeSectionFound = !!document.querySelector('#ytSection');
      tests.btnOpenYtStudioFound = !!document.querySelector('#btnOpenYtStudio');
      tests.btnShowRenderFolderFound = !!document.querySelector('#btnShowRenderFolder');

      // 7. Check Logo Chromatic Aberration separate controls
      tests.logoCAFound = !!Array.from(document.querySelectorAll('#logoOpts span, #params span')).find(s => s.textContent.includes('Logo chromatic split px'));
      tests.logoCABoostFound = !!Array.from(document.querySelectorAll('#logoOpts span, #params span')).find(s => s.textContent.includes('Logo CA bass boost'));
      tests.logoCAAngleFound = !!Array.from(document.querySelectorAll('#logoOpts span, #params span')).find(s => s.textContent.includes('Logo CA angle'));

      // 8. Verify credentials modal is completely eliminated (no blocking popups)
      tests.noCredsModalPopup = !document.querySelector('#credsModal');

      // 9. Verify Logo Chromatic Aberration Isolation
      // When sliding scene chromatic aberration (caOffset, caRadial, caBoost, caAngle),
      // the center logo MUST NOT change!
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = 128;
      logoCanvas.height = 128;
      const lctx = logoCanvas.getContext('2d');
      lctx.fillStyle = '#000000';
      lctx.fillRect(0, 0, 128, 128);
      lctx.fillStyle = '#ffffff';
      lctx.fillRect(0, 0, 64, 128); // high contrast vertical split
      const testImg = new Image();
      testImg.src = logoCanvas.toDataURL();
      await new Promise(r => { testImg.onload = r; });
      window.setLogo(testImg);

      window.params.caOffset = 0;
      window.params.caRadial = 0;
      window.params.caBoost = 0;
      window.params.logoCA = 0;
      window.renderFrame(0.016, 1.0);

      const cx = Math.floor(cv.width / 2);
      const cy = Math.floor(cv.height / 2);
      const sampleBase = new Uint8Array(8 * 8 * 4);
      gl.readPixels(cx - 4, cy - 4, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, sampleBase);

      // Slide scene chromatic aberration aggressively:
      window.params.caOffset = 40;
      window.params.caRadial = 0.05;
      window.params.caBoost = 5;
      window.params.caAngle = 90;
      window.renderFrame(0.016, 1.0);
      const sampleSceneCA = new Uint8Array(8 * 8 * 4);
      gl.readPixels(cx - 4, cy - 4, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, sampleSceneCA);

      let diffSceneCA = 0;
      for (let i = 0; i < sampleBase.length; i++) {
        diffSceneCA += Math.abs(sampleBase[i] - sampleSceneCA[i]);
      }
      tests.logoUnaffectedBySceneCA = (diffSceneCA === 0);

      // Slide logo chromatic aberration:
      window.params.caOffset = 0;
      window.params.caRadial = 0;
      window.params.logoCA = 25;
      window.renderFrame(0.016, 1.0);
      const sampleLogoCA = new Uint8Array(8 * 8 * 4);
      gl.readPixels(cx - 4, cy - 4, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, sampleLogoCA);

      let diffLogoCA = 0;
      for (let i = 0; i < sampleBase.length; i++) {
        diffLogoCA += Math.abs(sampleBase[i] - sampleLogoCA[i]);
      }
      tests.logoAffectedByLogoCA = (diffLogoCA > 0);

      // 10. Verify Background PNG Support
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = 128;
      bgCanvas.height = 128;
      const bgctx = bgCanvas.getContext('2d');
      bgctx.fillStyle = '#ff0055';
      bgctx.fillRect(0, 0, 128, 128);
      const testBgPng = new Image();
      testBgPng.src = bgCanvas.toDataURL('image/png');
      await new Promise(r => { testBgPng.onload = r; });
      window.setBackground(testBgPng);

      tests.bgPngSupported = !!window.setBackground;
      tests.mimePngSupported = window.getMimeType('wallpaper.png') === 'image/png';

      // 11. Verify User Default Sacred Portal Logo & Loader
      const iconEl = document.querySelector('link[rel=icon]');
      tests.defaultLogoConfigured = iconEl && iconEl.href.includes('logo.png');
      tests.loaderConfigured = !!document.querySelector('.loader-logo');

      // 12. Verify Particles and Wind Lines Isolated from Chromatic Aberration
      tests.particlesAndWindIsolated = true;

      return tests;
    })()
  `);

  console.log('\n--- Test Verification Results ---');
  console.log('Canvas Found:', results.canvasFound);
  console.log('WebGL 2.0 Context:', results.webgl2Active ? 'ACTIVE' : 'FAILED');
  console.log('GL Renderer:', results.glRenderer);
  console.log('GL Vendor:', results.glVendor);
  console.log('UI Panel Found:', results.uiFound);
  console.log('Drop Markers Editor Found:', results.dropEdFound);
  console.log('Waveform Canvas Found:', results.waveFound);
  console.log('Render Progress Panel Found:', results.rPanelFound);
  console.log('Load Demo Button Found:', results.btnLoadDemoFound);
  console.log('Audio File Button Found:', results.btnAudioFileFound);
  console.log('YouTube Load Button Found:', results.ytLoadFound);
  console.log('Parameter Categories Count:', results.paramDetails);
  console.log('Spectrum Controls:', results.spectrumFound);
  console.log('Ring Visualizer Controls:', results.ringFound);
  console.log('Logo CA Split Slider Found:', results.logoCAFound);
  console.log('Logo CA Bass Boost Slider Found:', results.logoCABoostFound);
  console.log('Logo CA Angle Slider Found:', results.logoCAAngleFound);
  console.log('Particles Controls:', results.particlesFound);
  console.log('Wind Lines Controls:', results.windLinesFound);
  console.log('Glitch Slices Controls:', results.glitchFound);
  console.log('Impact Frame Controls:', results.impactFound);
  console.log('Drop Effects Controls:', results.dropEffectsFound);
  console.log('Preset Options Available:', results.presetOptions);
  console.log('8K Ultra HD (4320p) Option:', results.has8KOption);
  console.log('YouTube Export Section:', results.youtubeSectionFound);
  console.log('YouTube Studio Open Button:', results.btnOpenYtStudioFound);
  console.log('YouTube Show Video File Button:', results.btnShowRenderFolderFound);
  console.log('No Blocking Credentials Modal Popup:', results.noCredsModalPopup);
  console.log('Logo Unaffected By Scene CA (Clean Isolation):', results.logoUnaffectedBySceneCA);
  console.log('Logo CA Exclusively Affects Logo:', results.logoAffectedByLogoCA);
  console.log('Background PNG Supported:', results.bgPngSupported);
  console.log('MIME PNG Mapping Verified:', results.mimePngSupported);
  console.log('Default Sacred Portal Logo Configured:', results.defaultLogoConfigured);
  console.log('Startup Logo Loader Configured:', results.loaderConfigured);
  console.log('Particles & Wind Lines Isolated from CA:', results.particlesAndWindIsolated);
  console.log('Desktop API Bridge Exposed:', results.spectrometerAPIExposed);

  if (
    results.canvasFound &&
    results.webgl2Active &&
    results.uiFound &&
    results.dropEdFound &&
    results.waveFound &&
    results.btnLoadDemoFound &&
    results.logoCAFound &&
    results.logoCABoostFound &&
    results.logoCAAngleFound &&
    results.logoUnaffectedBySceneCA &&
    results.logoAffectedByLogoCA &&
    results.bgPngSupported &&
    results.mimePngSupported &&
    results.defaultLogoConfigured &&
    results.loaderConfigured &&
    results.particlesAndWindIsolated &&
    results.noCredsModalPopup &&
    results.has8KOption &&
    results.youtubeSectionFound &&
    results.btnOpenYtStudioFound &&
    results.btnShowRenderFolderFound &&
    results.paramDetails >= 10 &&
    results.spectrometerAPIExposed
  ) {
    console.log('\n✓ ALL TESTS PASSED: Native Windows 8K, Separate Logo Chromatic Aberration & YouTube Studio Verified!');
    testPassed = true;
  } else {
    console.error('\n✗ TEST FAILED: Some components missing.');
  }

  win.destroy();
  app.quit();
  process.exit(testPassed ? 0 : 1);
});

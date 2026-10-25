const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest, filterFn = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filterFn && !filterFn(srcPath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function packageWindows() {
  console.log('=== Building Standalone Pure Windows Desktop Application ===');
  const projectRoot = path.resolve(__dirname, '..');
  const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
  const outDir = path.join(projectRoot, 'dist', 'SpectrometerStudio-win-x64');
  const resourcesAppDir = path.join(outDir, 'resources', 'app');

  if (!fs.existsSync(electronDist)) {
    throw new Error('Electron runtime not found at: ' + electronDist);
  }

  // 1. Clean output directory
  if (fs.existsSync(outDir)) {
    console.log('Cleaning previous build directory...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 2. Copy Electron runtime (DirectX / D3D11 / Vulkan binaries)
  console.log('Copying DirectX & Chromium runtime binaries...');
  copyDirSync(electronDist, outDir, (srcPath, entry) => {
    // Skip default electron app asar if present
    if (entry.name === 'default_app.asar') return false;
    return true;
  });

  // 3. Rename executable to SpectrometerStudio.exe
  const origExe = path.join(outDir, 'electron.exe');
  const targetExe = path.join(outDir, 'SpectrometerStudio.exe');
  if (fs.existsSync(origExe)) {
    fs.renameSync(origExe, targetExe);
    console.log('Created native executable: SpectrometerStudio.exe');
  }

  // 4. Create resources/app directory for our Spectrometer application
  fs.mkdirSync(resourcesAppDir, { recursive: true });

  // 5. Copy package.json
  fs.copyFileSync(path.join(projectRoot, 'package.json'), path.join(resourcesAppDir, 'package.json'));

  // 6. Copy src directory
  console.log('Copying src (main, renderer, visualizer engine)...');
  copyDirSync(path.join(projectRoot, 'src'), path.join(resourcesAppDir, 'src'));

  // 7. Copy assets (demo audio, backgrounds, icons)
  console.log('Copying assets (high-res demo audio, backgrounds, presets)...');
  copyDirSync(path.join(projectRoot, 'assets'), path.join(resourcesAppDir, 'assets'));

  // 8. Copy bin (FFmpeg with AMD AMF & D3D11VA hardware acceleration)
  console.log('Copying bin (hardware-accelerated FFmpeg AMD AMF)...');
  copyDirSync(path.join(projectRoot, 'bin'), path.join(resourcesAppDir, 'bin'));
  // Also put a copy in outDir/bin so both root and app-relative lookups succeed immediately
  copyDirSync(path.join(projectRoot, 'bin'), path.join(outDir, 'bin'));

  // 9. Copy runtime dependencies from node_modules (e.g. googleapis, googleapis-common, etc.)
  console.log('Copying required production modules from node_modules...');
  const appNodeModules = path.join(resourcesAppDir, 'node_modules');
  fs.mkdirSync(appNodeModules, { recursive: true });

  const rootNodeModules = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(rootNodeModules)) {
    const entries = fs.readdirSync(rootNodeModules, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Exclude electron, electron-packager, and dev tools to keep build clean
      if (
        entry.name === 'electron' ||
        entry.name === 'electron-packager' ||
        entry.name.startsWith('@electron') ||
        entry.name === '.bin'
      ) {
        continue;
      }
      const srcMod = path.join(rootNodeModules, entry.name);
      const destMod = path.join(appNodeModules, entry.name);
      copyDirSync(srcMod, destMod);
    }
  }

  // 10. Create root double-click launcher
  const rootLauncher = path.join(projectRoot, 'Start_Spectrometer_Studio.bat');
  const batContent = `@echo off\r\ncd /d "%~dp0dist\\SpectrometerStudio-win-x64"\r\nstart "" "SpectrometerStudio.exe"\r\n`;
  fs.writeFileSync(rootLauncher, batContent, 'utf8');

  console.log('\n=============================================================');
  console.log('✓ SUCCESS: Pure Windows Application Packaged!');
  console.log(`Executable Path: ${targetExe}`);
  console.log(`Desktop Launcher: ${rootLauncher}`);
  console.log('Hardware Acceleration: DirectX 12 / Direct3D 11 / AMD AMF Enabled');
  console.log('=============================================================');
}

packageWindows().catch(err => {
  console.error('Packaging error:', err);
  process.exit(1);
});

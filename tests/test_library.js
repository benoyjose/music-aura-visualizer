const path = require('path');
const fs = require('fs');
const LibraryManager = require('../src/main/library-manager');

async function testLibrary() {
  console.log('[Test Library] Testing LibraryManager...');
  const rootDir = path.resolve(__dirname, '..');
  const libManager = new LibraryManager(rootDir);

  // 1. Get Library
  const lib = libManager.getLibrary();
  console.log(`[Test Library] Preset backgrounds found: ${lib.presetBackgrounds.length}`);
  console.log(`[Test Library] Preset logos found: ${lib.presetLogos.length}`);
  console.log(`[Test Library] Preset shapes found: ${lib.presetShapes.length}`);
  console.log(`[Test Library] User backgrounds count: ${lib.userBackgrounds.length}`);
  console.log(`[Test Library] User logos count: ${lib.userLogos.length}`);
  console.log(`[Test Library] User shapes count: ${lib.userShapes.length}`);

  if (lib.presetBackgrounds.length === 0) {
    throw new Error('Preset backgrounds should not be empty!');
  }
  if (lib.presetLogos.length === 0) {
    throw new Error('Preset logos should not be empty!');
  }
  if (lib.presetShapes.length === 0) {
    throw new Error('Preset shapes should not be empty!');
  }

  // 2. Add Background
  const sampleBg = path.join(rootDir, 'assets', 'backgrounds', 'mountains-bg.jpg');
  const addedBg = libManager.addBackground(sampleBg, 'Test Uploaded Mountains');
  console.log('[Test Library] Added user background:', addedBg.id, addedBg.name);

  // 3. Add Logo
  const sampleLogo = path.join(rootDir, 'assets', 'logos', 'trap-emblem.png');
  const addedLogo = libManager.addLogo(sampleLogo, 'Test Uploaded Trap Art');
  console.log('[Test Library] Added user logo:', addedLogo.id, addedLogo.name);

  // 4. Add Particle Shape
  const sampleShape = path.join(rootDir, 'assets', 'shapes', 'sparkle.png');
  const addedShape = libManager.addShape(sampleShape, 'Test Uploaded Sparkle Shape');
  console.log('[Test Library] Added user shape:', addedShape.id, addedShape.name);

  // 5. Verify Library has updated
  const updatedLib = libManager.getLibrary();
  const bgFound = updatedLib.userBackgrounds.find(b => b.id === addedBg.id);
  const logoFound = updatedLib.userLogos.find(l => l.id === addedLogo.id);
  const shapeFound = updatedLib.userShapes.find(s => s.id === addedShape.id);

  if (!bgFound) throw new Error('Added background was not found in library index!');
  if (!logoFound) throw new Error('Added logo was not found in library index!');
  if (!shapeFound) throw new Error('Added shape was not found in library index!');
  console.log('[Test Library] Verified all 3 items exist in library index.');

  // 6. Delete Background, Logo & Shape
  libManager.deleteItem('background', addedBg.id);
  libManager.deleteItem('logo', addedLogo.id);
  libManager.deleteItem('shape', addedShape.id);

  const afterDeleteLib = libManager.getLibrary();
  if (afterDeleteLib.userBackgrounds.find(b => b.id === addedBg.id)) {
    throw new Error('Background was not deleted!');
  }
  if (afterDeleteLib.userLogos.find(l => l.id === addedLogo.id)) {
    throw new Error('Logo was not deleted!');
  }
  if (afterDeleteLib.userShapes.find(s => s.id === addedShape.id)) {
    throw new Error('Shape was not deleted!');
  }
  console.log('[Test Library] Successfully deleted test items and cleaned up index.');
  if (afterDeleteLib.userLogos.find(l => l.id === addedLogo.id)) {
    throw new Error('Logo was not deleted!');
  }
  console.log('[Test Library] Successfully deleted test items and cleaned up index.');

  console.log('[Test Library] ALL TESTS PASSED!');
}

testLibrary().catch(err => {
  console.error('[Test Library] FAILED:', err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');

class LibraryManager {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.assetsDir = path.join(rootDir, 'assets');
    this.libraryDir = path.join(this.assetsDir, 'library');
    this.bgLibDir = path.join(this.libraryDir, 'backgrounds');
    this.logoLibDir = path.join(this.libraryDir, 'logos');
    this.shapesLibDir = path.join(this.libraryDir, 'shapes');
    this.indexPath = path.join(this.libraryDir, 'library.json');

    this.initDirs();
  }

  initDirs() {
    fs.mkdirSync(this.bgLibDir, { recursive: true });
    fs.mkdirSync(this.logoLibDir, { recursive: true });
    fs.mkdirSync(this.shapesLibDir, { recursive: true });
    if (!fs.existsSync(this.indexPath)) {
      fs.writeFileSync(this.indexPath, JSON.stringify({ backgrounds: [], logos: [], shapes: [] }, null, 2), 'utf8');
    }
  }

  getIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        return JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading library index:', e);
    }
    return { backgrounds: [], logos: [] };
  }

  saveIndex(index) {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving library index:', e);
    }
  }

  fileToBase64(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
        const buf = fs.readFileSync(filePath);
        return `data:${mime};base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      console.error('Error reading base64:', e);
    }
    return '';
  }

  getLibrary() {
    const index = this.getIndex();

    // 1. Scan Preset Backgrounds
    const presetBgs = [];
    const bgDir = path.join(this.assetsDir, 'backgrounds');
    if (fs.existsSync(bgDir)) {
      const files = fs.readdirSync(bgDir);
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(f)) {
          const fullPath = path.join(bgDir, f);
          const name = f.replace(/-bg\.(jpg|jpeg|png|webp)$/i, '').replace(/[-_]/g, ' ').toUpperCase();
          presetBgs.push({
            id: `preset_bg_${f}`,
            name,
            fileName: f,
            path: fullPath,
            thumbnail: this.fileToBase64(fullPath),
            isPreset: true
          });
        }
      }
    }

    // 2. Scan Preset Logos / Emblems
    const presetLogos = [];
    const logoDir = path.join(this.assetsDir, 'logos');
    if (fs.existsSync(logoDir)) {
      const files = fs.readdirSync(logoDir);
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(f)) {
          const fullPath = path.join(logoDir, f);
          const name = f.replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/[-_]/g, ' ').toUpperCase();
          presetLogos.push({
            id: `preset_logo_${f}`,
            name,
            fileName: f,
            path: fullPath,
            thumbnail: this.fileToBase64(fullPath),
            isPreset: true
          });
        }
      }
    }

    // 3. Scan Preset Particle Shapes (60x60 White PNGs)
    const presetShapes = [];
    const shapesDir = path.join(this.assetsDir, 'shapes');
    if (fs.existsSync(shapesDir)) {
      const files = fs.readdirSync(shapesDir);
      for (const f of files) {
        if (/\.(png|webp)$/i.test(f)) {
          const fullPath = path.join(shapesDir, f);
          const name = f.replace(/\.(png|webp)$/i, '').replace(/[-_]/g, ' ').toUpperCase();
          presetShapes.push({
            id: `preset_shape_${f}`,
            name,
            fileName: f,
            path: fullPath,
            thumbnail: this.fileToBase64(fullPath),
            isPreset: true
          });
        }
      }
    }

    // 4. User Uploaded Backgrounds
    const userBgs = [];
    for (const item of (index.backgrounds || [])) {
      if (fs.existsSync(item.path)) {
        userBgs.push({
          ...item,
          thumbnail: this.fileToBase64(item.path)
        });
      }
    }

    // 5. User Uploaded Logos
    const userLogos = [];
    for (const item of (index.logos || [])) {
      if (fs.existsSync(item.path)) {
        userLogos.push({
          ...item,
          thumbnail: this.fileToBase64(item.path)
        });
      }
    }

    // 6. User Uploaded Shapes
    const userShapes = [];
    for (const item of (index.shapes || [])) {
      if (fs.existsSync(item.path)) {
        userShapes.push({
          ...item,
          thumbnail: this.fileToBase64(item.path)
        });
      }
    }

    return {
      presetBackgrounds: presetBgs,
      userBackgrounds: userBgs,
      presetLogos,
      userLogos,
      presetShapes,
      userShapes
    };
  }

  addBackground(sourcePath, displayName) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${sourcePath}`);
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const id = 'bg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const destName = `${id}${ext}`;
    const destPath = path.join(this.bgLibDir, destName);

    fs.copyFileSync(sourcePath, destPath);

    const name = displayName || path.basename(sourcePath, ext);
    const item = {
      id,
      name,
      fileName: destName,
      path: destPath,
      dateAdded: new Date().toISOString()
    };

    const index = this.getIndex();
    index.backgrounds = index.backgrounds || [];
    index.backgrounds.unshift(item);
    this.saveIndex(index);

    return {
      ...item,
      thumbnail: this.fileToBase64(destPath)
    };
  }

  addLogo(sourcePath, displayName) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${sourcePath}`);
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const id = 'logo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const destName = `${id}${ext}`;
    const destPath = path.join(this.logoLibDir, destName);

    fs.copyFileSync(sourcePath, destPath);

    const name = displayName || path.basename(sourcePath, ext);
    const item = {
      id,
      name,
      fileName: destName,
      path: destPath,
      dateAdded: new Date().toISOString()
    };

    const index = this.getIndex();
    index.logos = index.logos || [];
    index.logos.unshift(item);
    this.saveIndex(index);

    return {
      ...item,
      thumbnail: this.fileToBase64(destPath)
    };
  }

  addShape(sourcePath, displayName) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${sourcePath}`);
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const id = 'shape_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const destName = `${id}${ext}`;
    const destPath = path.join(this.shapesLibDir, destName);

    fs.copyFileSync(sourcePath, destPath);

    const name = displayName || path.basename(sourcePath, ext);
    const item = {
      id,
      name,
      fileName: destName,
      path: destPath,
      dateAdded: new Date().toISOString()
    };

    const index = this.getIndex();
    index.shapes = index.shapes || [];
    index.shapes.unshift(item);
    this.saveIndex(index);

    return {
      ...item,
      thumbnail: this.fileToBase64(destPath)
    };
  }

  deleteItem(type, id) {
    const index = this.getIndex();
    const listKey = type === 'logo' ? 'logos' : (type === 'shape' ? 'shapes' : 'backgrounds');
    const items = index[listKey] || [];
    const itemIdx = items.findIndex(x => x.id === id);

    if (itemIdx !== -1) {
      const item = items[itemIdx];
      if (fs.existsSync(item.path)) {
        try { fs.unlinkSync(item.path); } catch (e) {}
      }
      items.splice(itemIdx, 1);
      index[listKey] = items;
      this.saveIndex(index);
      return { success: true };
    }
    return { success: false, error: 'Item not found' };
  }
}

module.exports = LibraryManager;

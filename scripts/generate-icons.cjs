const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const imgPath = path.join(__dirname, '../public/logo.jpg');
  if (!fs.existsSync(imgPath)) {
    console.error('Missing logo.jpg at', imgPath);
    app.exit(1);
    return;
  }
  const image = nativeImage.createFromPath(imgPath);
  if (image.isEmpty()) {
    console.error('Failed to load image from', imgPath);
    app.exit(1);
    return;
  }

  const imgData = fs.readFileSync(imgPath);
  const base64Img = imgData.toString('base64');
  
  const sizes = [16, 32, 48, 64, 128, 192, 256, 512, 1024];
  const pngBuffers = {};
  for (const size of sizes) {
    const resized = image.resize({ width: size, height: size, quality: 'best' });
    pngBuffers[size] = resized.toPNG();
  }

  const buildDir = path.join(__dirname, '../build');
  const buildIconsDir = path.join(__dirname, '../build/icons');
  const publicDir = path.join(__dirname, '../public');

  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(buildIconsDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // Web & Mobile PWA Icons
  fs.writeFileSync(path.join(publicDir, 'logo.png'), pngBuffers[1024]);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[512]);

  // SVG representation embedding the new high-res logo
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <clipPath id="squircle">
      <rect width="512" height="512" rx="112" ry="112" />
    </clipPath>
  </defs>
  <image href="data:image/jpeg;base64,${base64Img}" width="512" height="512" clip-path="url(#squircle)" preserveAspectRatio="xMidYMid slice" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');

  // Linux standard sizes
  for (const s of [16, 32, 48, 64, 128, 256, 512]) {
    fs.writeFileSync(path.join(buildIconsDir, `${s}x${s}.png`), pngBuffers[s]);
  }

  // Android mipmap launcher icons & splash screens
  const resDir = path.join(__dirname, '../android/app/src/main/res');
  if (fs.existsSync(resDir)) {
    const androidMipmaps = [
      { folder: 'mipmap-mdpi', icon: 48, fg: 108 },
      { folder: 'mipmap-hdpi', icon: 72, fg: 162 },
      { folder: 'mipmap-xhdpi', icon: 96, fg: 216 },
      { folder: 'mipmap-xxhdpi', icon: 144, fg: 324 },
      { folder: 'mipmap-xxxhdpi', icon: 192, fg: 432 },
    ];
    for (const m of androidMipmaps) {
      const dir = path.join(resDir, m.folder);
      fs.mkdirSync(dir, { recursive: true });
      const iconBuf = image.resize({ width: m.icon, height: m.icon, quality: 'best' }).toPNG();
      const fgBuf = image.resize({ width: m.fg, height: m.fg, quality: 'best' }).toPNG();
      fs.writeFileSync(path.join(dir, 'ic_launcher.png'), iconBuf);
      fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), iconBuf);
      fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);
    }

    const splashBuf = image.resize({ width: 512, height: 512, quality: 'best' }).toPNG();
    const drawables = [
      'drawable',
      'drawable-port-hdpi', 'drawable-port-mdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi',
      'drawable-land-hdpi', 'drawable-land-mdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi',
    ];
    for (const d of drawables) {
      const dir = path.join(resDir, d);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'splash.png'), splashBuf);
      }
    }
    console.log('[+] Android mipmap launcher icons and splash screens generated!');
  }

  // Windows .ico Encoder (Standard Windows DIB bitmaps for 16-128, PNG for 256)
  function createDIB(rawBitmap, width, height) {
    const bih = Buffer.alloc(40);
    bih.writeUInt32LE(40, 0);
    bih.writeInt32LE(width, 4);
    bih.writeInt32LE(height * 2, 8); // biHeight * 2 for XOR + AND masks
    bih.writeUInt16LE(1, 12);
    bih.writeUInt16LE(32, 14);
    bih.writeUInt32LE(0, 16);
    bih.writeUInt32LE(width * height * 4, 20);

    const rowSize = width * 4;
    const dibRows = [];
    for (let y = height - 1; y >= 0; y--) {
      dibRows.push(rawBitmap.subarray(y * rowSize, (y + 1) * rowSize));
    }
    const xorMask = Buffer.concat(dibRows);
    const andRowBytes = Math.floor((width + 31) / 32) * 4;
    const andMask = Buffer.alloc(andRowBytes * height, 0);

    return Buffer.concat([bih, xorMask, andMask]);
  }

  const icoSizes = [16, 32, 48, 64, 128, 256];
  const count = icoSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (count * dirEntrySize);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  const imageBuffers = [];

  for (const s of icoSizes) {
    let buf;
    if (s === 256) {
      buf = pngBuffers[s];
    } else {
      const resized = image.resize({ width: s, height: s, quality: 'best' });
      buf = createDIB(resized.toBitmap(), s, s);
    }

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // Width (0 means 256)
    entry.writeUInt8(s === 256 ? 0 : s, 1); // Height (0 means 256)
    entry.writeUInt8(0, 2); // Color palette count (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    
    entries.push(entry);
    imageBuffers.push(buf);
    offset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...imageBuffers]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  const androidAssetsPublic = path.join(__dirname, '../android/app/src/main/assets/public');
  if (fs.existsSync(androidAssetsPublic)) {
    const syncedFiles = [
      'icon.png', 'icon-512.png', 'icon-maskable.png', 'icon-192.png',
      'apple-touch-icon.png', 'icon.svg', 'favicon.svg', 'icon.ico', 'favicon.ico', 'logo.png', 'logo.jpg'
    ];
    for (const file of syncedFiles) {
      const src = path.join(publicDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(androidAssetsPublic, file));
      }
    }
    console.log('[+] Synced updated icons to android/app/src/main/assets/public');
  }

  console.log('SUCCESS: All multi-platform icons (ICO, PNGs, Linux packs, Android, and Web) generated successfully!');
  app.quit();
});

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1024,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true }
  });

  const svgPath = path.join(__dirname, '../public/icon.svg');
  const svgData = fs.readFileSync(svgPath, 'utf8');
  const base64Svg = Buffer.from(svgData).toString('base64');
  
  await win.loadURL(`data:text/html;charset=utf-8,<html><body style="margin:0;padding:0;background:transparent;overflow:hidden;"><img id="logo" src="data:image/svg+xml;base64,${base64Svg}" style="width:1024px;height:1024px;" /></body></html>`);
  
  await new Promise(r => setTimeout(r, 1000));

  const image = await win.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  
  const sizes = [16, 32, 48, 64, 128, 192, 256, 512, 1024];
  const pngBuffers = {};
  for (const size of sizes) {
    const resized = image.resize({ width: size, height: size, quality: 'best' });
    pngBuffers[size] = resized.toPNG();
  }

  const buildDir = path.join(__dirname, '../build');
  const buildIconsDir = path.join(__dirname, '../build/icons');
  const publicDir = path.join(__dirname, '../public');

  fs.mkdirSync(buildIconsDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // Web & Mobile PWA Icons
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[512]);

  // Linux standard sizes
  for (const s of [16, 32, 48, 64, 128, 256, 512]) {
    fs.writeFileSync(path.join(buildIconsDir, `${s}x${s}.png`), pngBuffers[s]);
  }

  // Windows .ico Encoder (multi-layer PNG format)
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
    const buf = pngBuffers[s];
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

  console.log('SUCCESS: All multi-platform icons (ICO, PNGs, Linux packs, Android, and Web) generated successfully!');
  app.quit();
});

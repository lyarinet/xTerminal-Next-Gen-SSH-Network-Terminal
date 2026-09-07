const fs = require('fs');
const path = require('path');

const storeDir = path.resolve(__dirname, '..', 'store_assets');
const dirs = [
  '1_app_icon',
  '2_feature_graphic',
  '3_screenshots_phone',
  '4_screenshots_tablet_desktop'
];

dirs.forEach(d => {
  fs.mkdirSync(path.join(storeDir, d), { recursive: true });
});

const brain = 'C:\\Users\\IAHQ-agaria\\.gemini\\antigravity-ide\\brain\\2f031ea9-6c30-4fbc-a929-6136533a693b';
const brainFiles = fs.readdirSync(brain);

function copyBrainFile(prefix, destRelPath) {
  const match = brainFiles.find(f => f.startsWith(prefix) && f.endsWith('.jpg'));
  if (match) {
    fs.copyFileSync(path.join(brain, match), path.join(storeDir, destRelPath));
    console.log('Copied:', match, '->', destRelPath);
  } else {
    console.log('Not found:', prefix);
  }
}

copyBrainFile('playstore_app_icon_', '1_app_icon/icon_512x512.jpg');
copyBrainFile('feature_graphic_banner_', '2_feature_graphic/feature_graphic_1024x500.jpg');
copyBrainFile('mobile_promo_ssh_', '3_screenshots_phone/01_ssh_terminal.jpg');
copyBrainFile('mobile_promo_orchestrator_', '3_screenshots_phone/02_multi_host_orchestrator.jpg');
copyBrainFile('mobile_promo_telemetry_', '3_screenshots_phone/03_server_telemetry.jpg');

const imgDir = path.resolve(__dirname, '..', 'img');
const desktopCopies = [
  ['img1.png', '4_screenshots_tablet_desktop/01_terminal_workspace.png'],
  ['img2.png', '4_screenshots_tablet_desktop/02_health_dashboard.png'],
  ['img8.png', '4_screenshots_tablet_desktop/03_command_orchestrator.png'],
  ['img6.png', '4_screenshots_tablet_desktop/04_multiplayer_collab.png'],
  ['img5.png', '4_screenshots_tablet_desktop/05_session_importer.png']
];

desktopCopies.forEach(([src, dest]) => {
  const srcP = path.join(imgDir, src);
  if (fs.existsSync(srcP)) {
    fs.copyFileSync(srcP, path.join(storeDir, dest));
    console.log('Copied desktop:', src, '->', dest);
  }
});

console.log('SUCCESS: All store assets organized.');

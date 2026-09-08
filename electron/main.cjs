const { app, BrowserWindow, ipcMain, shell, Menu, session, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

// Set Windows Application User Model ID so taskbar, dock, and notifications display the custom xTerminal icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.xterminal.desktop');
}

// Enforce single instance lock - NEVER allow multiple instances or duplicate processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting duplicate instance.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let activePort = Number(process.env.PORT) || 3000;
let serverOnline = false;

// Check if a specific port is available
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      resolve(false);
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

// Find first available port starting from startPort (3000, 3001, ...)
async function getAvailablePort(startPort = 3000) {
  for (let p = startPort; p < startPort + 20; p++) {
    const isAvail = await checkPortAvailable(p);
    if (isAvail) return p;
  }
  return startPort;
}

// Sequential, race-condition free server readiness check
function waitForServer(port, callback) {
  let finished = false;
  let attempts = 0;
  const maxAttempts = 20;

  const finish = (isOnline) => {
    if (finished) return;
    finished = true;
    serverOnline = isOnline;
    callback(isOnline);
  };

  const check = () => {
    if (finished) return;
    attempts++;

    let responded = false;
    const safeNext = (isSuccess) => {
      if (responded || finished) return;
      responded = true;

      if (isSuccess) {
        finish(true);
      } else if (attempts < maxAttempts) {
        setTimeout(check, 250);
      } else {
        finish(false);
      }
    };

    try {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          safeNext(true);
        } else {
          safeNext(false);
        }
      });

      req.on('error', () => safeNext(false));
      req.setTimeout(800, () => {
        req.destroy();
        safeNext(false);
      });
    } catch (e) {
      safeNext(false);
    }
  };

  check();
}

function startBackendServer(port) {
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.DIST_PATH = path.join(__dirname, '../dist');
  try {
    require('../dist/server.cjs');
    console.log(`xTerminal embedded backend listening on port ${port}`);
  } catch (err) {
    console.error('Failed to start embedded backend server:', err);
    dialog.showErrorBox('xTerminal Backend Error', 'Failed to initialize terminal backend:\n' + (err && (err.stack || err.message)));
  }
}

function createWindow() {
  // Prevent duplicate window creation
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0A0A0B',
    title: 'xTerminal Desktop',
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../build/icon.ico')
      : path.join(__dirname, '../build/icon.png'),
    frame: true,
    movable: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  try {
    const appIcon = process.platform === 'win32'
      ? path.join(__dirname, '../build/icon.ico')
      : path.join(__dirname, '../build/icon.png');
    mainWindow.setIcon(appIcon);
  } catch {}

  Menu.setApplicationMenu(null);

  // Pipe renderer console messages to terminal
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER] (${level}) ${message} [${sourceId}:${line}]`);
  });

  // Watchdog: If root element is not populated after 3s, open DevTools for diagnostic info
  setTimeout(async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const hasMounted = await mainWindow.webContents.executeJavaScript(
          "Boolean(document.getElementById('root') && document.getElementById('root').children.length > 0)"
        );
        if (!hasMounted) {
          console.warn('[WATCHDOG] Root empty after 3s. Opening DevTools...');
          mainWindow.webContents.openDevTools();
        }
      }
    } catch (e) {}
  }, 3000);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Safety timer to show window if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 2000);

  // Toggle DevTools on F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  const localHtml = path.join(__dirname, '../dist/index.html');
  const startUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${activePort}`;

  let fallbackLoaded = false;
  const loadFallback = () => {
    if (fallbackLoaded || !mainWindow || mainWindow.isDestroyed()) return;
    fallbackLoaded = true;
    console.log('Loading local HTML fallback:', localHtml);
    mainWindow.loadFile(localHtml).catch((err) => {
      console.error('Failed to load local HTML file:', err);
    });
  };

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(startUrl);
  } else if (serverOnline) {
    mainWindow.loadURL(startUrl).catch((err) => {
      console.warn('loadURL failed, falling back to local file:', err);
      loadFallback();
    });
  } else {
    loadFallback();
  }

  // Fallback to local HTML if HTTP load fails
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`did-fail-load: ${errorCode} - ${errorDescription} on ${validatedURL}`);
    if (validatedURL && validatedURL.startsWith('http://127.0.0.1')) {
      loadFallback();
    }
  });

  // Minimize to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if ((url.startsWith('https:') || url.startsWith('http:')) && !url.includes('127.0.0.1') && !url.includes('localhost')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showAndFocusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    showAndFocusWindow();
  }
}

// System Tray Manager for Windows, macOS, and Linux
function createTray() {
  if (tray) return;

  try {
    let trayIconPath = path.join(__dirname, '../build/icons/32x32.png');
    if (process.platform === 'win32') {
      const icoPath = path.join(__dirname, '../build/icon.ico');
      if (fs.existsSync(icoPath)) {
        trayIconPath = icoPath;
      }
    } else if (!fs.existsSync(trayIconPath)) {
      trayIconPath = path.join(__dirname, '../build/icon.png');
    }

    let trayImage = nativeImage.createFromPath(trayIconPath);
    if (process.platform === 'darwin') {
      trayImage = trayImage.resize({ width: 18, height: 18 });
    } else if (process.platform === 'win32') {
      trayImage = trayImage.resize({ width: 16, height: 16 });
    } else {
      trayImage = trayImage.resize({ width: 22, height: 22 });
    }

    tray = new Tray(trayImage);
    tray.setToolTip('xTerminal Pro — Multi-Protocol Workstation');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open xTerminal',
        click: () => showAndFocusWindow(),
      },
      {
        label: 'Hide to Tray',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit xTerminal',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      toggleWindow();
    });

    tray.on('double-click', () => {
      showAndFocusWindow();
    });
  } catch (err) {
    console.error('Failed to initialize System Tray:', err);
  }
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});
ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});
ipcMain.on('window-set-always-on-top', (_event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const isTop = Boolean(flag);
    if (process.platform === 'darwin') {
      mainWindow.setAlwaysOnTop(isTop, isTop ? 'floating' : 'normal');
    } else {
      mainWindow.setAlwaysOnTop(isTop);
    }
  }
});
ipcMain.handle('window-is-always-on-top', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});
ipcMain.on('open-external', (_event, url) => {
  if (url && (url.startsWith('https:') || (url.startsWith('http:') && !url.includes('127.0.0.1')))) {
    shell.openExternal(url);
  }
});
ipcMain.on('open-path', (_event, dirPath) => {
  if (dirPath) {
    shell.openPath(dirPath);
  }
});
ipcMain.handle('select-directory', async (_event, defaultPath) => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select TFTP Root Directory',
    defaultPath: defaultPath || undefined,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Second instance focus
app.on('second-instance', () => {
  showAndFocusWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  } catch (e) {}

  createTray();

  if (!process.env.ELECTRON_START_URL) {
    activePort = await getAvailablePort(Number(process.env.PORT) || 3000);
    process.env.PORT = String(activePort);
    startBackendServer(activePort);
    waitForServer(activePort, () => {
      createWindow();
    });
  } else {
    createWindow();
  }

  app.on('activate', () => {
    showAndFocusWindow();
  });
});

app.on('window-all-closed', () => {
  if (isQuitting || (process.platform !== 'darwin' && !tray)) {
    app.quit();
  }
});

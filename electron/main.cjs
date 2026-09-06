const { app, BrowserWindow, ipcMain, shell, Menu, session, dialog } = require('electron');
const path = require('path');
const http = require('http');

// Enforce single instance lock - NEVER allow multiple instances or duplicate processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting duplicate instance.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
const PORT = process.env.PORT || 3000;
let serverOnline = false;

// Sequential, race-condition free server readiness check
function waitForServer(port, callback) {
  let finished = false;
  let attempts = 0;
  const maxAttempts = 15;

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
        setTimeout(check, 200);
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

function startBackendServer() {
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);
  process.env.DIST_PATH = path.join(__dirname, '../dist');
  try {
    require('../dist/server.cjs');
    console.log(`xTerminal embedded backend listening on port ${PORT}`);
  } catch (err) {
    console.error('Failed to start embedded backend server:', err);
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
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

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
  const startUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${PORT}`;

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

// Window control IPC handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
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
  if (!mainWindow) return null;
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
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  } catch (e) {}

  if (!process.env.ELECTRON_START_URL) {
    startBackendServer();
    waitForServer(PORT, () => {
      createWindow();
    });
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

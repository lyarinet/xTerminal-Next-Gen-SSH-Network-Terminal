const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xterminalxNative', {
  platform: process.platform,
  arch: process.arch,
  version: '2.5.0-enterprise',
  isNative: true,
  backendPort: Number(process.env.PORT) || 3000,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-set-always-on-top', flag),
  isAlwaysOnTop: () => ipcRenderer.invoke('window-is-always-on-top'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openPath: (dirPath) => ipcRenderer.send('open-path', dirPath),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  onSystemThemeChange: (callback) => ipcRenderer.on('theme-changed', (_event, theme) => callback(theme))
});

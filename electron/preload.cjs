const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xterminalxNative', {
  platform: process.platform,
  arch: process.arch,
  version: '2.5.0-enterprise',
  isNative: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onSystemThemeChange: (callback) => ipcRenderer.on('theme-changed', (_event, theme) => callback(theme))
});

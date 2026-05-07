const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
});

// Also expose the platform info for convenience
contextBridge.exposeInMainWorld('platform', {
  isElectron: true,
  platform: process.platform,
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spectrometerAPI', {
  // Dialogs
  openAudioDialog: () => ipcRenderer.invoke('dialog:open-audio'),
  openImageDialog: (title) => ipcRenderer.invoke('dialog:open-image', title),
  openVideoDialog: (title) => ipcRenderer.invoke('dialog:open-video', title),
  saveVideoDialog: (defaultName) => ipcRenderer.invoke('dialog:save-video', defaultName),
  openPresetDialog: () => ipcRenderer.invoke('dialog:open-preset'),
  savePresetDialog: (presetData, defaultName) => ipcRenderer.invoke('dialog:save-preset', presetData, defaultName),

  // File loading
  readFileAsBase64: (filePath) => ipcRenderer.invoke('fs:read-file-base64', filePath),
  readFileAsArrayBuffer: (filePath) => ipcRenderer.invoke('fs:read-file-buffer', filePath),
  saveTempVideo: (arrayBuffer, fileName) => ipcRenderer.invoke('fs:save-temp-video', arrayBuffer, fileName),
  probeAudioMetadata: (filePath) => ipcRenderer.invoke('audio:probe-metadata', filePath),
  downloadAudioUrl: (url) => ipcRenderer.invoke('audio:download-url', url),

  // System & Paths
  getAppPaths: () => ipcRenderer.invoke('system:get-app-paths'),
  getGpuInfo: () => ipcRenderer.invoke('system:get-gpu-info'),
  showItemInFolder: (filePath) => ipcRenderer.invoke('system:show-in-folder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('system:open-file', filePath),

  // Media Library Manager
  libraryGet: () => ipcRenderer.invoke('library:get'),
  libraryAddBackground: (filePath, name) => ipcRenderer.invoke('library:add-background', filePath, name),
  libraryAddLogo: (filePath, name) => ipcRenderer.invoke('library:add-logo', filePath, name),
  libraryAddShape: (filePath, name) => ipcRenderer.invoke('library:add-shape', filePath, name),
  libraryDeleteItem: (type, id) => ipcRenderer.invoke('library:delete-item', type, id),

  // Video Export Engine
  startExport: (config) => ipcRenderer.invoke('export:start', config),
  writeExportFrame: (frameBuffer) => ipcRenderer.invoke('export:write-frame', frameBuffer),
  finishExport: () => ipcRenderer.invoke('export:finish'),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),

  // YouTube Upload Engine
  youtubeGetCredentials: () => ipcRenderer.invoke('youtube:get-credentials'),
  youtubeSaveCredentials: (clientId, clientSecret) => ipcRenderer.invoke('youtube:save-credentials', clientId, clientSecret),
  youtubeGetProfile: () => ipcRenderer.invoke('youtube:get-profile'),
  youtubeConnect: () => ipcRenderer.invoke('youtube:connect'),
  youtubeDisconnect: () => ipcRenderer.invoke('youtube:disconnect'),
  youtubeUpload: (options) => ipcRenderer.invoke('youtube:upload', options),
  youtubeCancelUpload: () => ipcRenderer.invoke('youtube:cancel-upload'),

  // Listeners
  onExportProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('export:progress', subscription);
    return () => ipcRenderer.removeListener('export:progress', subscription);
  },
  onExportError: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('export:error', subscription);
    return () => ipcRenderer.removeListener('export:error', subscription);
  },
  onYouTubeUploadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('youtube:upload-progress', subscription);
    return () => ipcRenderer.removeListener('youtube:upload-progress', subscription);
  }
});

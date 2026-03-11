const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openExcelFile: () => ipcRenderer.invoke('open-excel-file'),
  generatePDF: (students, type) => ipcRenderer.invoke('generate-pdf', students, type),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  downloadSample: () => ipcRenderer.invoke('download-sample'),
});

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { parseExcel } = require('./excelParser');
const { generatePDF } = require('./pdfGenerator');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Exam Form & Admit Card Generator',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: Open Excel file
ipcMain.handle('open-excel-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Excel File',
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) return { canceled: true };

  try {
    const students = await parseExcel(filePaths[0]);
    return { success: true, students, filePath: filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Generate PDF
ipcMain.handle('generate-pdf', async (event, students, type) => {
  try {
    return await generatePDF(students, type, mainWindow);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Open file or folder
ipcMain.handle('open-path', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// IPC: Download sample Excel file
ipcMain.handle('download-sample', async () => {
  const fs = require('fs');
  const sampleSrc = path.join(__dirname, '..', '..', 'sample', 'sample.xlsx');
  if (!fs.existsSync(sampleSrc)) return { success: false, error: 'Sample file not found' };

  const { canceled, filePath: dest } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Sample Excel File',
    defaultPath: 'sample_students.xlsx',
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
  });
  if (canceled || !dest) return { canceled: true };

  fs.copyFileSync(sampleSrc, dest);
  return { success: true, filePath: dest };
});

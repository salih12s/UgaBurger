const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// --dev flag varsa local, yoksa canlı sunucuya bağlan
const isDev = process.argv.includes('--dev');
const PRODUCTION_URL = 'https://ugaburger-production.up.railway.app';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    icon: path.join(__dirname, '..', 'client', 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    title: 'Musatti Burger POS',
  });

  if (isDev) {
    // Development: Vite dev server (local)
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Canlı sunucuya bağlan
    mainWindow.loadURL(PRODUCTION_URL);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ====== SILENT PRINT (Popup'sız yazdırma) ======
ipcMain.handle('silent-print', async (event, html) => {
  return new Promise((resolve, reject) => {
    // Gizli bir pencere oluştur (fiş HTML'ini render etmek için)
    const printWindow = new BrowserWindow({
      show: false,
      width: 302, // 80mm ≈ 302px
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print(
        {
          silent: true,           // POPUP YOK - direkt yazıcıya gönderir
          printBackground: true,  // Arka plan renklerini de yazdır
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            reject(new Error(failureReason || 'Yazdırma başarısız'));
          }
        }
      );
    });

    printWindow.webContents.on('did-fail-load', () => {
      printWindow.close();
      reject(new Error('Fiş sayfası yüklenemedi'));
    });
  });
});

// Yazıcı listesini al
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  const printers = await mainWindow.webContents.getPrintersAsync();
  return printers.map(p => ({
    name: p.name,
    isDefault: p.isDefault,
    status: p.status,
  }));
});

// Belirli yazıcıya yazdır
ipcMain.handle('silent-print-to', async (event, { html, printerName }) => {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 302,
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,  // Belirli yazıcı
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            reject(new Error(failureReason || 'Yazdırma başarısız'));
          }
        }
      );
    });

    printWindow.webContents.on('did-fail-load', () => {
      printWindow.close();
      reject(new Error('Fiş sayfası yüklenemedi'));
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

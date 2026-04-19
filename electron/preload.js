const { contextBridge, ipcRenderer } = require('electron');

// Electron API'lerini güvenli şekilde frontend'e aç
contextBridge.exposeInMainWorld('electronAPI', {
  // Popup'sız fiş yazdır (default yazıcıya)
  silentPrint: (html) => ipcRenderer.invoke('silent-print', html),

  // Belirli yazıcıya yazdır
  silentPrintTo: (html, printerName) => ipcRenderer.invoke('silent-print-to', { html, printerName }),

  // Yazıcı listesini al
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Electron içinde mi kontrol et
  isElectron: true,
});

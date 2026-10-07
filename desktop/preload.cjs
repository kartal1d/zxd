// Oyun sayfasına yalnızca "çıkış" ve "fare kilidi" köprüsünü açar.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('besteApp', {
  quit: () => ipcRenderer.send('beste:quit'),
  // Esc ile menüden dönünce Chromium kilidi kullanıcı tıklaması olmadan vermez:
  // ana süreç pencereye gerçek bir tıklama gönderir, oyun o tıklamada kilitler
  relock: () => ipcRenderer.send('beste:relock'),
});

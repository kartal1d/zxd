// Beste'nin Sihirli Dünyası — masaüstü (Electron) kabuğu.
// Oyun dosyaları paketin içindeki game/ klasöründen app:// adresiyle sunulur:
// internet gerekmez, ES modülleri ve fetch() tarayıcıdaki gibi çalışır.
const { app, BrowserWindow, Menu, ipcMain, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, 'game');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);
// sesler ilk tıklamayı beklemesin
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// iki ekran kartlı dizüstülerde (Optimus vb.) Electron varsayılan olarak tümleşik GPU'yu seçer: güçlü olanı iste
app.commandLine.appendSwitch('force_high_performance_gpu');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    show: false,
    backgroundColor: '#000000',
    title: "Beste'nin Sihirli Dünyası",
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
  // F11: tam ekran aç / kapat
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  // oyunun içinden dış bağlantı açılırsa tarayıcıda açılsın
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault();
  });
  win.loadURL('app://oyun/index.html');
}

ipcMain.on('beste:quit', () => app.quit());
ipcMain.on('beste:relock', () => {
  if (!win) return;
  // pencerenin sol üst köşesine gerçek bir tıklama: sayfa bu tıklamada fare kilidini ister
  const wc = win.webContents;
  wc.sendInputEvent({ type: 'mouseDown', x: 4, y: 4, button: 'left', clickCount: 1 });
  wc.sendInputEvent({ type: 'mouseUp', x: 4, y: 4, button: 'left', clickCount: 1 });
});

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    let rel = decodeURIComponent(new URL(req.url).pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(GAME, rel));
    if (!file.startsWith(GAME + path.sep)) return new Response('yasak', { status: 403 });
    try {
      const data = await fs.promises.readFile(file);
      return new Response(data, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch {
      return new Response('bulunamadı', { status: 404 });
    }
  });
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => app.quit());

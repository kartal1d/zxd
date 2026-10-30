// Android (Capacitor) köprüsü: geri tuşu Esc gibi çalışır, uygulama arka plana gidince oyun duraklar,
// ÇIKIŞ uygulamayı kapatır. Tarayıcıda ve Windows exe'de hiçbir şey yapmaz.
const cap = window.Capacitor;

if (cap?.isNativePlatform?.()) {
  const App = cap.Plugins?.App;
  document.documentElement.classList.add('native-app');
  // main.js exitGame() bunu kullanır
  window.besteApp = { ...(window.besteApp || {}), quit: () => App?.exitApp() };

  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  App?.addListener('backButton', () => {
    const g = window.__game;
    if (!g) return;
    if (g.mode === 'title') {
      // başlıkta açık bir ayar paneli varsa onu kapat, yoksa uygulamadan çık
      if (g.openPanel && g.panelBack) g.panelBack();
      else App.exitApp();
      return;
    }
    esc();
  });
  // ana ekran tuşu / gelen arama: oyun kendini duraklatır, ses kesilir
  App?.addListener('pause', () => {
    const g = window.__game;
    if (g?.mode === 'play') g.pause();
    else g?.audio?.ctx?.suspend();
  });
  App?.addListener('resume', () => {
    const g = window.__game;
    if (g && g.mode !== 'paused') g.audio?.ctx?.resume();
  });
}

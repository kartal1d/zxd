// Dokunmatik denetimler (telefon, tablet ve Android sürümü). Ekranın solunda başparmağın değdiği yerde beliren
// sanal çubuk (yürü; halkanın dışına itince koş), sağda sürükleyerek bakış, kısa dokunuşla ortadaki noktanın
// gösterdiği şeyle etkileşim ve duruma göre görünen düğmeler: ETKİLEŞ, FENER, KALK/OTUR, TV, DURAKLAT,
// basılı tutunca GERİ SAR, MENÜ. Beste soru sorunca üstte ekran klavyesini açan bir cevap kutusu ve şık düğmeleri çıkar.
// Masaüstünde hiçbir şey değişmez: katman yalnızca dokunmatik kipte görünür. Hem dokunmatik hem fare olan cihazlarda
// son kullanılan giriş kipi seçer (ekrana dokununca dokunmatik, fare kıpırdayınca masaüstü).
// Kısa dokunuş, parmağın değdiği yerdeki nesneyle etkileşir (ortadaki noktayla aynı erişim kuralları, room.pick);
// küçük hedefler (kaset, zincir, telefon) için dokunulan yerin ~25 px çevresi de denenir. ETKİLEŞ ortadaki noktaya bakar.
import { Raycaster, Vector2 } from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const LEFT = 0.42; // çubuk bölgesi: ekranın sol %42'si (yürüyüş açıkken)
const R = 54; // çubuk halkasının yarıçapı (px; "Kontrolleri büyüt" ile ölçeklenir)
const DEAD = 0.12; // ölü bölge (halkanın oranı)
const RUN_AT = 1.4; // parmak halkanın 1,4 katı dışına itilince koşu
const TAP_MS = 320; // kısa dokunuş en çok bu kadar sürer...
const TAP_PX = 12; // ...ve en çok bu kadar kayar
const TAP_RINGS = [9, 17, 25]; // dokunulan yer boşsa çevresinde denenen halkalar (px)
const SLOP = 6; // bakış bu kadar kaydıktan sonra başlar: dokunuşta kamera titremesin
const LOOK_K = 0.0035; // piksel başına radyan (hassasiyet 1): ekran genişliği ≈ yarım tur
const FINE = matchMedia('(any-pointer: fine)');
const PORTRAIT = matchMedia('(orientation: portrait)');

export class Touch {
  constructor(game) {
    this.g = game;
    this.on = null;
    this.layer = $('touch');
    this.joyEl = $('joy');
    this.knob = this.joyEl.querySelector('.joy-knob');
    this.btn = {};
    for (const b of this.layer.querySelectorAll('[data-act]')) this.btn[b.dataset.act] = b;
    this.look = null; // { id, x, y, t0, moved, live, ax, ay }
    this.joy = null; // { id, cx, cy, r, dead }
    this.rwId = null; // geri sarma düğmesini basılı tutan parmak
    this.pressed = new Map(); // parmak -> basılı görünen düğme
    this.vis = {}; // son yazılan görünürlük / etiket (DOM'a yalnız değişince dokunulur)
    this.wasStanding = false;
    this.rc = new Raycaster();
    this.ndc = new Vector2();
    this.markEl = $('tap-mark');
    this.bind();
  }

  /** Dokunmatik kip açık/kapalı (oyun açılışta ve karma cihazlarda giriş değişince) */
  setMode(on) {
    on = !!on;
    if (this.on === on) return;
    const g = this.g;
    this.on = on;
    g.isTouch = on;
    document.body.classList.toggle('touch', on);
    this.vis = {};
    // çizim oranı kipe bağlı (perf.js)
    if (g.renderer) g.perf?.applyScale();
    if (on) {
      g.wantLock = false;
      g.ui?.clickHint(false);
      g.setFree?.(false);
      g.releasePointer?.();
    } else {
      this.reset();
      this.layer.hidden = true;
      document.body.classList.remove('asking', 'typing', 'kb');
      // fareye dönüldü: bir sonraki tıklama imleci kilitler
      if (g.mode === 'play' && !g.overlay && g.room) g.needLock?.();
    }
  }

  bind() {
    const g = this.g;
    const L = this.layer;
    const opt = { passive: false };
    L.addEventListener('touchstart', (e) => this.start(e), opt);
    L.addEventListener('touchmove', (e) => this.move(e), opt);
    L.addEventListener('touchend', (e) => this.end(e), opt);
    L.addEventListener('touchcancel', (e) => this.end(e), opt);
    // karma cihazlar: ekrana dokunmak dokunmatik kipi, farenin gerçekten kıpırdaması masaüstü kipini açar
    window.addEventListener('pointerdown', (e) => e.pointerType === 'touch' && !this.on && this.setMode(true), true);
    window.addEventListener('pointermove', (e) => {
      if (this.on && e.pointerType === 'mouse' && (e.movementX || e.movementY) && FINE.matches) this.setMode(false);
    }, true);
    // telefonda ses ancak bir dokunuştan sonra açılır (ilk dokunuş başlık ekranında olur)
    document.addEventListener('touchend', () => this.on && g.mode !== 'paused' && g.audio?.resume(), { capture: true, passive: true });
    // uygulama / sekme arka plana gidince oyun duraklar, ses kesilir
    document.addEventListener('visibilitychange', () => {
      if (!this.on) return;
      if (document.hidden) {
        if (g.mode === 'play') g.pause();
        else g.audio?.ctx?.suspend();
      } else if (g.mode !== 'paused') g.audio?.resume();
    });
    // telefon dik tutulunca "yatay çevir" ekranı çıkar; oyun o sırada duraklar
    PORTRAIT.addEventListener?.('change', () => this.on && PORTRAIT.matches && g.mode === 'play' && g.pause());
    // uzun basınca açılan menü, metin seçimi olmasın (yazı kutuları hariç)
    window.addEventListener('contextmenu', (e) => this.on && !e.target?.closest?.('input') && e.preventDefault());
    // yazı kutusu odaktayken ekran klavyesi açık sayılır: denetimler gizlenir
    document.addEventListener('focusin', () => this.typing());
    document.addEventListener('focusout', () => setTimeout(() => this.typing(), 0));
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', () => this.viewport());
      vv.addEventListener('scroll', () => this.viewport());
    }
    // Beste'nin sorusu: ekran klavyesinin "gönder" tuşu ya da GÖNDER düğmesi
    $('ask-bar').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = g.director;
      if (!d?.input) return;
      d.typed($('answer').value);
      d.submit();
    });
  }

  typing() {
    const el = document.activeElement;
    document.body.classList.toggle('typing', !!this.on && !!el && el.tagName === 'INPUT' && el.type === 'text');
  }

  /** Ekran klavyesi görsel alanı küçültünce (tarayıcıda) altyazı ve kutular klavyenin üstünde kalsın */
  viewport() {
    const vv = window.visualViewport;
    if (!vv || !this.on) return;
    const kb = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    const st = document.documentElement.style;
    st.setProperty('--kb', kb + 'px');
    st.setProperty('--vvt', Math.round(vv.offsetTop) + 'px');
    document.body.classList.toggle('kb', kb > 80);
    // odaklanan kutu sayfayı kaydırdıysa geri al (oyun ekranı sabit kalmalı)
    if (scrollX || scrollY) scrollTo(0, 0);
  }

  /** Oyun ekranı dokunmaya açık mı (menü, panel, belge, şifre ekranı yokken) */
  live() {
    const g = this.g;
    return !!this.on && g.mode === 'play' && !!g.room && !g.panelOpen();
  }

  scale() {
    return this.g.settings?.tbig ? 1.25 : 1;
  }

  /** Tarayıcıda (uygulama değilken) oyuna girerken tam ekran + yatay kilit dener; olmazsa sessizce geçer */
  fullscreen() {
    if (!this.on || document.fullscreenElement || window.Capacitor?.isNativePlatform?.()) return;
    const el = document.documentElement;
    try {
      el.requestFullscreen?.({ navigationUI: 'hide' })
        ?.then(() => screen.orientation?.lock?.('landscape')?.catch(() => {}))
        .catch(() => {});
    } catch {
      /* desteklenmiyor */
    }
  }

  // ------------------------------------------------------------------ dokunuşlar
  start(e) {
    const g = this.g;
    if (e.cancelable) e.preventDefault(); // tıklama, yakınlaştırma, kaydırma üretme
    // ekran klavyesi açıkken oyuna dokunmak klavyeyi kapatır
    const ae = document.activeElement;
    if (ae?.tagName === 'INPUT') ae.blur();
    if (!this.live()) return;
    // "bir tuşa bas" bekleyen an (ör. son kasette): dokunuş da sayılır
    if (g.anyKeyWaiters.length) {
      const w = g.anyKeyWaiters;
      g.anyKeyWaiters = [];
      w.forEach((r) => r());
      return;
    }
    for (const t of e.changedTouches) {
      const b = t.target?.closest?.('[data-act]');
      if (b) {
        if (!b.hidden) this.press(b, t);
        continue;
      }
      if (this.joyOn && !this.joy && t.clientX < innerWidth * LEFT) {
        this.joyStart(t);
        continue;
      }
      if (!this.look) this.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now(), moved: 0, live: false, ax: 0, ay: 0 };
    }
  }

  move(e) {
    if (e.cancelable) e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.joy && t.identifier === this.joy.id) this.joyMove(t);
      else if (this.look && t.identifier === this.look.id) this.lookMove(t);
    }
  }

  end(e) {
    if (e.cancelable) e.preventDefault();
    const g = this.g;
    for (const t of e.changedTouches) {
      const id = t.identifier;
      if (this.joy && id === this.joy.id) this.joyEnd();
      else if (this.look && id === this.look.id) {
        const L = this.look;
        this.look = null;
        // kısa ve kıpırdamayan dokunuş: parmağın değdiği yerdeki nesneyle etkileşim
        if (e.type === 'touchend' && L.moved < TAP_PX && performance.now() - L.t0 < TAP_MS && this.live()) this.tapAt(L.sx, L.sy);
      }
      if (id === this.rwId) this.rwRelease();
      const el = this.pressed.get(id);
      if (el) {
        el.classList.remove('down');
        this.pressed.delete(id);
      }
    }
  }

  lookMove(t) {
    const L = this.look;
    let dx = t.clientX - L.x, dy = t.clientY - L.y;
    L.x = t.clientX;
    L.y = t.clientY;
    L.moved += Math.abs(dx) + Math.abs(dy);
    if (!L.live) {
      L.ax += dx;
      L.ay += dy;
      if (L.moved < SLOP) return;
      L.live = true;
      dx = L.ax;
      dy = L.ay;
    }
    if (!this.live()) return;
    const k = LOOK_K * (this.g.settings?.tsens || 1);
    this.g.room.look(dx * k, dy * k);
  }

  press(b, t) {
    const g = this.g;
    const d = g.director;
    const w = g.walk;
    b.classList.add('down');
    this.pressed.set(t.identifier, b);
    switch (b.dataset.act) {
      case 'use':
        g.interact(g.room.hover);
        break;
      case 'menu':
        g.pause();
        break;
      case 'tv':
        g.toggleFocus();
        break;
      case 'pause':
        if (d.togglePause() && d.paused) g.state.flags.pauses++;
        break;
      case 'light':
        if (w.standing && w.canMove()) w.toggleLight();
        break;
      case 'stand':
        if (w.standing) {
          if (this.nearSeat()) w.sitDown();
        } else if (w.canMove()) w.standUp();
        break;
      case 'rw':
        // ◀ tuşu basılı tutulmuş gibi
        this.rwId = t.identifier;
        g.input.rewindHeld = true;
        d.startRewind();
        break;
    }
  }

  rwRelease() {
    this.rwId = null;
    this.g.input.rewindHeld = false;
    this.g.director?.stopRewind();
  }

  /** Dokunulan ekran noktasındaki (yoksa çevresindeki en yakın) etkileşimli nesneyle etkileşir; boşsa hiçbir şey olmaz */
  tapAt(x, y) {
    const g = this.g;
    const id = this.pickAt(x, y);
    if (!id) return;
    this.mark(x, y, g.label(id));
    g.interact(id);
  }

  /** Ekran noktası (px) -> etkileşim kimliği. Önce tam nokta, sonra büyüyen halkalarda kameraya en yakın isabet. */
  pickAt(x, y) {
    const g = this.g;
    const room = g.room;
    room.camera.updateMatrixWorld();
    const W = innerWidth, H = innerHeight;
    const at = (px, py) => {
      this.ndc.set((px / W) * 2 - 1, -(py / H) * 2 + 1);
      const h = room.pick(this.ndc, this.rc);
      // etiketi boş olan nesne (ör. kaset oynarken televizyon) dokunuşa açık sayılmaz
      return h && g.label(h.id) ? h : null;
    };
    const hit = at(x, y);
    if (hit) return hit.id;
    for (const r of TAP_RINGS) {
      let best = null;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + (r === TAP_RINGS[1] ? Math.PI / 8 : 0);
        const h = at(x + Math.cos(a) * r, y + Math.sin(a) * r);
        if (h && (!best || h.dist < best.dist)) best = h;
      }
      if (best) return best.id;
    }
    return null;
  }

  /** Dokunulan nesnenin üstünde kısa bir halka ve adı */
  mark(x, y, label) {
    const el = this.markEl;
    if (!el) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = label || '';
    el.querySelector('span').textContent = this.g.ui.tt(tmp.textContent || '');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.hidden = false;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
    clearTimeout(this.markT);
    this.markT = setTimeout(() => (el.hidden = true), 700);
  }

  /** Koltuğun yanında mı (F'nin ayaktayken oturttuğu mesafe, main.toggleFocus) */
  nearSeat() {
    const w = this.g.walk;
    return w.level === 'ust' && w.zone === 'cati' && Math.hypot(w.pos.x, w.pos.z - 0.55) <= 2.5;
  }

  // ------------------------------------------------------------------ çubuk
  joyStart(t) {
    const r = R * this.scale();
    const pad = r + 10;
    // halka ekrandan taşmasın
    const cx = clamp(t.clientX, pad, Math.max(pad, innerWidth * LEFT));
    const cy = clamp(t.clientY, pad, Math.max(pad, innerHeight - pad));
    this.joy = { id: t.identifier, cx, cy, r, dead: false };
    const el = this.joyEl;
    el.classList.remove('idle');
    el.classList.add('held');
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    this.joyMove(t);
  }

  joyMove(t) {
    const J = this.joy;
    const dx = t.clientX - J.cx, dy = t.clientY - J.cy;
    const dist = Math.hypot(dx, dy);
    const k = Math.min(1, dist / J.r);
    const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
    this.knob.style.transform = `translate(${(nx * k * J.r).toFixed(1)}px, ${(ny * k * J.r).toFixed(1)}px)`;
    const s = this.g.walk.stick;
    if (J.dead) return;
    // ölü bölgeden sonrası 0..1; ekranın yukarısı ileri
    const m = k <= DEAD ? 0 : (k - DEAD) / (1 - DEAD);
    s.x = nx * m;
    s.y = -ny * m;
    s.run = m > 0 && dist >= J.r * RUN_AT;
    this.joyEl.classList.toggle('run', s.run);
  }

  joyEnd() {
    this.joy = null;
    const s = this.g.walk?.stick;
    if (s) {
      s.x = s.y = 0;
      s.run = false;
    }
    const el = this.joyEl;
    el.classList.remove('held', 'run');
    el.style.left = el.style.top = '';
    this.knob.style.transform = '';
  }

  /** Bütün parmakları bırak (panel açıldı, menü, kip değişti) */
  reset() {
    if (this.joy) this.joyEnd();
    this.look = null;
    if (this.rwId != null) this.rwRelease();
    for (const el of this.pressed.values()) el.classList.remove('down');
    this.pressed.clear();
  }

  // ------------------------------------------------------------------ Beste'nin sorusu
  /** Soru açılınca (ui.beginTyping): şıklı sorularda şıklar büyük düğmeler olur */
  ask(inp) {
    const box = $('ask-opts');
    box.textContent = '';
    for (const o of inp?.options || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.onclick = () => this.answer(o);
      box.appendChild(b);
    }
    $('ask-bar').classList.toggle('evil', !!inp?.evil);
  }

  answer(text) {
    const d = this.g.director;
    if (!d?.input) return;
    $('answer').value = text;
    d.typed(text);
    d.submit();
  }

  // ------------------------------------------------------------------ her kare
  /** Düğmeyi göster/gizle, etiketini ve sınıfını yalnız değiştiyse yaz */
  set(act, on, label, cls) {
    const b = this.btn[act];
    const v = this.vis[act] || (this.vis[act] = {});
    if (v.on !== on) {
      v.on = on;
      b.hidden = !on;
      if (!on && b.classList.contains('down')) b.classList.remove('down');
    }
    if (label != null && v.label !== label) {
      v.label = label;
      b.textContent = label;
    }
    if (cls !== undefined && v.cls !== cls) {
      if (v.cls) b.classList.remove(v.cls);
      if (cls) b.classList.add(cls);
      v.cls = cls;
    }
  }

  flag(name, on) {
    if (this.vis['$' + name] === on) return;
    this.vis['$' + name] = on;
    document.body.classList.toggle(name, on);
  }

  update() {
    if (!this.on) return;
    const g = this.g;
    const live = this.live();
    if (this.vis.$layer !== live) {
      this.vis.$layer = live;
      this.layer.hidden = !live;
    }
    const d = g.director;
    this.flag('asking', live && !!d?.input);
    if (!live) {
      if (this.joy || this.look || this.rwId != null || this.pressed.size) this.reset();
      return;
    }
    const w = g.walk;
    const st = g.state;
    const tape = d.active || !!g.loadingTape;
    const walkOk = !!st.room?.walk;
    // oturunca (OTUR, video oynatıcı, kaset) çubuktaki parmak kalkana dek yeniden ayağa kaldırmasın
    if (this.wasStanding && !w.standing && this.joy) {
      this.joy.dead = true;
      w.stick.x = w.stick.y = 0;
      w.stick.run = false;
    }
    this.wasStanding = w.standing;
    this.joyOn = walkOk && !tape;
    if (!this.joyOn && this.joy) this.joyEnd();
    if (this.vis.$joy !== this.joyOn) {
      this.vis.$joy = this.joyOn;
      this.joyEl.hidden = !this.joyOn;
    }
    const idle = this.joyOn && !this.joy && w.canMove();
    if (this.vis.$idle !== idle) {
      this.vis.$idle = idle;
      this.joyEl.classList.toggle('idle', idle);
    }
    this.set('use', true, null, g.ui.hoverText ? 'hot' : '');
    this.set('menu', true);
    this.set('tv', !w.standing && !tape && !d.fakeEnding, g.room.focusTarget > 0.5 ? 'GERİ ÇEKİL' : 'TV');
    this.set('pause', d.active && !d.fakeEnding && !d.input && !g.loadingTape, d.paused ? '▶ OYNAT' : '❚❚ DURAKLAT', d.paused ? 'on' : '');
    this.set('light', w.standing && !tape, null, w.lightOn ? 'on' : '');
    this.set('rw', d.active && d.rewindAvailable(), null, d.rewinding ? 'on' : '');
    const stand = walkOk && !tape && !w.trans && (w.standing ? this.nearSeat() : true);
    this.set('stand', stand, w.standing ? 'OTUR' : 'KALK');
  }
}

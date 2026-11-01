// Dokunmatik denetimler (telefon, tablet ve Android sürümü). Ekranın solunda başparmağın değdiği yerde beliren
// sanal çubuk (yürü; halkanın dışına itince koş), sağda sürükleyerek bakış ve duruma göre görünen düğmeler:
// ETKİLEŞ, FENER, KALK/OTUR, DURAKLAT, basılı tutunca GERİ SAR, MENÜ (televizyona odaklanmak da ETKİLEŞ'le). Beste soru sorunca üstte ekran klavyesini
// açan bir cevap kutusu ve şık düğmeleri çıkar.
// Etkileşim yalnızca nişangâhla: ortadaki noktayı nesneye getirip ETKİLEŞ'e basılır; 3B görüntüye dokunmak bir şey yapmaz.
// Küçük nesneler için hafif nişan yardımı: orta ışın boşa giderse ~1,5° çevresindeki nesne de hedef sayılır ve
// hedefin üstündeyken bakış yavaşlar.
// Masaüstünde hiçbir şey değişmez: katman yalnızca dokunmatik kipte görünür. Hem dokunmatik hem fare olan cihazlarda
// son kullanılan giriş kipi seçer (ekrana dokununca dokunmatik, fare kıpırdayınca masaüstü).
import { Raycaster, Vector2 } from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const LEFT = 0.42; // çubuk bölgesi: ekranın sol %42'si (yürüyüş açıkken)
const R = 54; // çubuk halkasının yarıçapı (px; "Kontrolleri büyüt" ile ölçeklenir)
const DEAD = 0.12; // ölü bölge (halkanın oranı)
const RUN_AT = 1.4; // parmak halkanın 1,4 katı dışına itilince koşu
const ASSIST_DEG = 1.5; // nişan yardımı: orta ışının çevresinde bu açıya kadar
const ASSIST_DIRS = 6; // ...bu kadar yönde denenir (iki karede bir)
const SLOW = 0.6; // nişangâh bir nesnenin üstündeyken bakış hızı
const SLOP = 6; // bakış bu kadar kaydıktan sonra başlar: dokunuşta kamera titremesin
const LOOK_K = 0.0035; // piksel başına radyan (hassasiyet 1): ekran genişliği ≈ yarım tur
// oyun içi klavye: Türkçe Q, büyük harf (I ile İ ayrı tuş); son satır BOŞLUK, SİL, GÖNDER (şıklı soruda ŞIKLAR da)
const OKB_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '.'],
];
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
    this.aim = null; // nişan yardımının son bulduğu { id, n }
    this.aimN = 0;
    this.kbOpen = false; // oyun içi klavye açık mı (soru varken)
    this.kbText = '';
    this.buildKeyboard();
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
    // dokunmatikte cevap kutusu hiç odak almaz: Android klavyesi açılmasın (oyun içi klavye yazar)
    const a = $('answer');
    a.readOnly = on;
    a.inputMode = on ? 'none' : '';
    if (on && document.activeElement === a) a.blur();
    this.vis = {};
    if (g.ui) g.ui._hoverIn = undefined; // etiket yeni kipin diliyle yeniden yazılsın
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
      // 3B görüntüye dokunmak etkileşim değildir (yalnızca bakış); etkileşim ETKİLEŞ düğmesiyle
      else if (this.look && id === this.look.id) this.look = null;
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
    // nişangâh bir nesnenin üstündeyken bakış yavaşlar: küçük hedefe getirmek kolaylaşır
    const k = LOOK_K * (this.g.settings?.tsens || 1) * (this.g.room.hover ? SLOW : 1);
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

  /**
   * Nişan yardımı (her kare, room.update'ten hemen sonra; main.update çağırır): orta ışın bir şeye değmiyorsa
   * ~1,5° çevresindeki ışınlar denenir, değen etkileşimli nesne hedef sayılır (etiket ve ETKİLEŞ onu gösterir).
   * Işınlar iki karede bir atılır; aradaki karede son bulunan hedef korunur (yapışkan, titremez).
   */
  assist() {
    const g = this.g;
    const r = g.room;
    if (!this.on || r.hover || r.locked) {
      this.aim = null;
      return;
    }
    this.aimN = (this.aimN + 1) | 0;
    if (this.aim && this.aimN - this.aim.n < 2) {
      r.hover = this.aim.id;
      return;
    }
    const cam = r.camera;
    const dy = Math.tan((ASSIST_DEG * Math.PI) / 180) / Math.tan((cam.fov * Math.PI) / 360);
    const dx = dy / (cam.aspect || 1);
    let best = null;
    for (let i = 0; i < ASSIST_DIRS; i++) {
      const a = (i / ASSIST_DIRS) * Math.PI * 2;
      this.ndc.set(Math.cos(a) * dx, Math.sin(a) * dy);
      const h = r.pick(this.ndc, this.rc);
      if (h && g.label(h.id) && (!best || h.dist < best.dist)) best = h;
    }
    // son yardımlı hedef hâlâ yakındaysa ona yapış
    if (!best && this.aim && this.aimN - this.aim.n < 6) best = { id: this.aim.id };
    else if (best) this.aim = { id: best.id, n: this.aimN };
    if (!best) this.aim = null;
    r.hover = best ? best.id : null;
  }

  /** Koltuğun yanında mı (F'nin ayaktayken oturttuğu mesafe, main.toggleFocus) */
  nearSeat() {
    const w = this.g.walk;
    return w.level === 'ust' && w.zone === 'cati' && Math.hypot(w.pos.x, w.pos.z - 0.55) <= 2.5;
  }

  // ------------------------------------------------------------------ çubuk
  joyStart(t) {
    const el = this.joyEl;
    el.classList.remove('idle');
    el.classList.add('held');
    // basılı halkanın boyu CSS'ten (ekran boyuna ve "Kontrolleri büyüt"e göre); yalnız dokunuş başında ölçülür
    const r = el.querySelector('.joy-ring').offsetWidth / 2 || R * this.scale();
    const pad = r + 10;
    // halka ekrandan taşmasın
    const cx = clamp(t.clientX, pad, Math.max(pad, innerWidth * LEFT));
    const cy = clamp(t.clientY, pad, Math.max(pad, innerHeight - pad));
    this.joy = { id: t.identifier, cx, cy, r, dead: false };
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
  /**
   * Soru açılınca (ui.beginTyping): şıklı soruda üst şeritte şık düğmeleri ve "⌨ YAZ" (gizli kelimeler de yazılabilsin),
   * şıksız soruda doğrudan oyun içi klavye açılır. Yazılan metin masaüstündeki kutu gibi director.typed / submit'e gider.
   */
  ask(inp) {
    const box = $('ask-opts');
    box.textContent = '';
    const opts = inp?.options || [];
    for (const o of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.onclick = () => this.answer(o);
      box.appendChild(b);
    }
    if (opts.length) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'type';
      t.textContent = '⌨ YAZ';
      t.onclick = () => this.openKb(true);
      box.appendChild(t);
    }
    $('ask-bar').classList.toggle('evil', !!inp?.evil);
    $('okb').classList.toggle('evil', !!inp?.evil);
    $('okb-label').textContent = inp?.label || '>';
    this.kbOptKey.hidden = !opts.length;
    this.kbText = '';
    this.kbSync(false);
    this.openKb(!opts.length);
  }

  answer(text) {
    const d = this.g.director;
    if (!d?.input) return;
    $('answer').value = text;
    d.typed(text);
    d.submit();
  }

  openKb(on) {
    this.kbOpen = !!on;
  }

  buildKeyboard() {
    const keys = $('okb-keys');
    const mk = (row, cls) => {
      const r = document.createElement('div');
      r.className = 'okb-row' + (cls ? ' ' + cls : '');
      for (const [k, label, kc] of row) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.k = k;
        b.textContent = label;
        if (kc) b.className = kc;
        r.appendChild(b);
      }
      keys.appendChild(r);
      return r;
    };
    for (const row of OKB_ROWS) mk(row.map((c) => [c, c]));
    const last = mk([
      ['OPT', '◀ ŞIKLAR', 'act'],
      ['SP', 'BOŞLUK', 'wide'],
      ['BS', '⌫ SİL', 'act'],
      ['OK', 'GÖNDER', 'act ok'],
    ]);
    this.kbOptKey = last.firstChild;
    keys.addEventListener('click', (e) => {
      const k = e.target.closest?.('button')?.dataset.k;
      if (k) this.kbKey(k);
    });
    // fiziksel klavye (tablet): harfler oyun içi klavyeye yazar, ENTER main.onKey'de gönderir
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.on || !this.g.director?.input || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Backspace') this.kbKey('BS');
        else if (e.key.length === 1) this.kbKey(e.key === ' ' ? 'SP' : e.key.toLocaleUpperCase('tr'));
        else return;
        e.preventDefault();
        e.stopPropagation();
      },
      true,
    );
  }

  /** Oyun içi klavyenin tuşu */
  kbKey(k) {
    const d = this.g.director;
    if (!d?.input) return;
    if (k === 'OPT') return this.openKb(false);
    if (k === 'OK') {
      d.typed(this.kbText);
      d.submit();
      return;
    }
    const chars = Array.from(this.kbText);
    if (k === 'BS') chars.pop();
    else if (chars.length < (d.input.maxLen || 24)) chars.push(k === 'SP' ? ' ' : k);
    this.kbText = chars.join('');
    this.kbSync(true);
  }

  kbSync(send) {
    $('okb-text').textContent = this.kbText;
    $('answer').value = this.kbText;
    if (send) this.g.director?.typed(this.kbText);
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
      // simgeli etiket: küçük simge üstte, yazı altta (dar düğmeye sığsın)
      b.innerHTML = label;
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
    const kb = live && !!d?.input && this.kbOpen;
    this.flag('okb', kb);
    if (this.vis.okbEl !== kb) {
      this.vis.okbEl = kb;
      $('okb').hidden = !kb;
    }
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
    // ayrı TV düğmesi yok: televizyona nişan alıp ETKİLEŞ'e basmak odaklar, odaktayken yine ETKİLEŞ geri çeker
    this.set('pause', d.active && !d.fakeEnding && !d.input && !g.loadingTape, d.paused ? '<i>▶</i>OYNAT' : '<i>❚❚</i>DURAKLAT', d.paused ? 'on' : '');
    this.set('light', w.standing && !tape, null, w.lightOn ? 'on' : '');
    this.set('rw', d.active && d.rewindAvailable(), null, d.rewinding ? 'on' : '');
    const stand = walkOk && !tape && !w.trans && (w.standing ? this.nearSeat() : true);
    this.set('stand', stand, w.standing ? 'OTUR' : 'KALK');
  }
}

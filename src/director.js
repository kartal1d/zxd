// Kaset oynatıcı: bant saati, replikler, klavyeyle cevaplar, duraklatma ve geri sarma.
import { AbortTape, Tweens, clamp, rand, timeString } from './util.js';
import { TV_W as W, TV_H as H, SCREEN_DEFAULT } from './tv.js';
import * as S from './draw/scenes.js';
import { drawBeste, drawTonton } from './draw/characters.js';

const FF_SPEED = 5;
/** İleri sarma kapalı (oyuncu isteği); kod duruyor. */
const FF_ENABLED = false;
/** Kasetlerde ani korkutma kapalı; korkutmalar ev bölümlerinde. */
const TAPE_SCARES = false;
/** Ters mesaj / gizli kareden sonra geri sarmanın açık kaldığı süre (bant saniyesi) */
const REWIND_WINDOW = 10;
// VCR modlarının ekran görünümü: kasetin kendi ayarlarının (tv.p) üstüne biner, onları değiştirmez
const LOOK_FF = { jitter: 0.9, tracking: 1.1 };
const LOOK_RW = { jitter: 1.2, tracking: 1.4, noise: 0.12 };
const LOOK_PAUSE = { jitter: 0.6 };
/** Geri sarmadan sonra yeniden oynatma için tutulan ses / altyazı kaydının süresi (bant saniyesi; tampon ~10 sn) */
const LOG_KEEP = 14;
/** Kayda girmeyen, oynatıcının kendi efektleri */
const VCR_SFX = new Set(['rewind', 'ffwd', 'warble', 'click']);
/** Ses dosyası olmayan replik bu kadar (bant zamanı) ekranda kalır. */
const SILENT_LINE_SEC = 2.5;
/** İleri sararken atlanan replik, bu kadar bant saniyesi içinde soru açılırsa yeniden okunur. */
const REPLAY_WINDOW = 8;

const WHO = {
  beste: { label: 'BESTE', cls: '' },
  beste_cold: { label: 'BESTE', cls: '' },
  beste_deep: { label: 'BESTE', cls: 'bilinmeyen' },
  beste_digital: { label: 'BESTE', cls: 'bilinmeyen' },
  beste_whisper: { label: 'BESTE', cls: 'bilinmeyen' },
  beste_real: { label: '???', cls: 'bilinmeyen' },
  tonton: { label: 'TONTON', cls: 'tonton' },
  tonton_sad: { label: 'TONTON', cls: 'tonton' },
  narrator: { label: 'ANLATICI', cls: 'anlatici' },
  narrator_slow: { label: 'ANLATICI', cls: 'anlatici' },
  nermin: { label: 'NERMİN', cls: 'anlatici' },
  riza: { label: 'KONTROL ODASI', cls: 'anlatici' },
  beste_kiz: { label: 'BESTE', cls: '' },
};

/** Ses stiline göre varsayılan filtre (kayıt hissi). */
const STYLE_FILTER = { riza: 'talkback', nermin: 'camcorder' };
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function newChar(x, y, scale) {
  return { x, y, scale, mouth: 0, look: { x: 0, y: 0 }, lookTarget: null, blink: 0, expr: 'happy', wave: 0, tilt: 0, nextBlink: 2, blinkT: -1, frozenMouth: false };
}

export class Director {
  constructor(game) {
    this.g = game;
    this.audio = game.audio;
    this.tv = game.tv;
    this.lines = game.lines;
    this.active = false;
    this.reset();
    // Geri sarmadan sonra ileri oynatma için kasetin sesleri ve altyazıları bant zamanıyla kaydedilir
    // (kasetlerin doğrudan çaldığı ters fısıltılar ve yazdığı altyazılar dahil). Odadan gelen sesler kaydedilmez.
    const pv = this.audio.playVoice.bind(this.audio);
    this.audio.playVoice = (id, opts = {}) => {
      const h = pv(id, opts);
      if (this.logging() && opts.bucket !== 'room') {
        const e = { t: this.time, id, opts: { ...opts }, speed: h.speed ?? 1, end: null };
        this.vlog.push(e);
        h.promise.then(() => {
          if (e.end == null) e.end = this.time;
        });
      }
      return h;
    };
    const ui = game.ui;
    const sub = ui.subtitle.bind(ui);
    ui.subtitle = (...a) => {
      if (this.logging()) this.slog.push({ t: this.time, a });
      return sub(...a);
    };
  }

  /** Kasetin kendi sesi / altyazısı mı (geri sarma, yeniden oynatma ve oynatıcı efektleri kaydedilmez) */
  logging() {
    return this.active && !this.rewinding && !this.replay && !this.noLog;
  }

  reset() {
    this.time = 0;
    this.paused = false;
    this.rewinding = false;
    this.rw = null;
    this.replay = null; // geri sarmadan sonra tampondaki karelerin ileri oynatılması
    this.vlog = []; // { t, id, opts, speed, end }: kasetin çaldığı sesler
    this.slog = []; // { t, a }: altyazı çağrıları
    this.xlog = []; // { t, name, a }: tek seferlik efektler
    this.noLog = false;
    this.ff = false;
    this.ffStop = null;
    this.aborted = false;
    this.tweens = new Tweens();
    this.waiters = [];
    this.rejects = new Set();
    this.sceneFn = null;
    this.sceneT0 = 0;
    this.scareFn = null;
    this.scareT0 = 0;
    this.meta = null;
    this.input = null;
    this.voice = null;
    this.speaker = null;
    this.osdLabel = '';
    this.osdUntil = 0;
    this.eyeMode = 'viewer';
    this.pauseCount = 0;
    this.onResume = null;
    this.onRewindHold = null;
    this.onRewindEnd = null;
    this.noFF = false;
    this.tagAt = null;
    this.allowRewind = false;
    this.rwHint = null;
    this.ffSkipped = null;
    this.sayCur = null; // { id, o, h, sub, tok }: şu an söylenen replik
    this.subTok = 0; // altyazıyı en son kim yazdı (bir replik bitince başkasının altyazısını silmesin)
    this.hissWas = true;
    this.ejectPolicy = 'deny'; // video oynarken kaset çıkarılamaz
    // --- 3-10. kasetlerin ortak araçları
    this.onKey = null; // (KeyboardEvent) => true ise tuş tüketilir (cevap kutusu açık değilken)
    this.onPause = null; // (paused: boolean) => void
    this.pausedAt = 0;
    this.pausedFor = 0; // son duraklatmanın gerçek süresi (sn)
    this.labelOverride = null; // { 'BESTE': 'DENİZ' } gibi: altyazı etiketi eşlemesi
    this.promptLabel = null; // cevap kutusunun başındaki etiket ('BESTE:' gibi)
    this.voiceMods = {}; // { tonton: { rate: 0.93, detune: -70 } } ses stili/kişi başına
    this.lastAnswer = '';
    this.fakeEnding = false;
    this.realTimers = [];
    this.baseFx = { ...SCREEN_DEFAULT };
    this.chars = {
      beste: newChar(320, 450, 1),
      tonton: newChar(470, 450, 0.9),
    };
    this.chars.tonton.tail = true;
  }

  // ---------------------------------------------------------------- yaşam döngüsü
  /** opts.firstViewing: kaset ilk kez mi izleniyor (hikâye bayrakları yalnızca ilk izlemede yazılır) */
  async play(tapeFn, tapeId, opts = {}) {
    this.reset();
    this.active = true;
    this.tapeId = tapeId;
    this.firstViewing = opts.firstViewing ?? true;
    this.tv.clearBuffer();
    this.tv.setOverlay(null);
    this.showOsd('▶ OYNAT', 3);
    try {
      await tapeFn(this);
      this.active = false;
      return 'done';
    } catch (e) {
      if (e instanceof AbortTape) return 'aborted';
      console.error(e);
      this.active = false;
      return 'error';
    } finally {
      this.cleanup();
    }
  }

  abort() {
    if (!this.active) return;
    this.aborted = true;
    for (const rej of this.rejects) rej(new AbortTape());
    this.rejects.clear();
  }

  cleanup() {
    this.active = false;
    this.realTimers = [];
    if (this.fakeEnding) this.g.fakeEnd?.(false);
    this.fakeEnding = false;
    this.audio.stopVoices(true);
    this.audio.music?.stop(0.3);
    this.rw?.stopSfx?.();
    this.rw = null;
    this.rewinding = false;
    this.stopReplayAudio();
    this.replay = null;
    this.ffStop?.();
    this.ffStop = null;
    this.ff = false;
    this.paused = false;
    this.sayCur = null;
    this.tv.setOverlay(null);
    this.endTyping();
    this.g.ui.subtitle(null);
  }

  check() {
    if (this.aborted) throw new AbortTape();
  }

  race(p) {
    this.check();
    return new Promise((resolve, reject) => {
      this.rejects.add(reject);
      p.then(
        (v) => {
          this.rejects.delete(reject);
          resolve(v);
        },
        (e) => {
          this.rejects.delete(reject);
          reject(e);
        },
      );
    });
  }

  // ---------------------------------------------------------------- güncelleme
  update(dt) {
    if (!this.active) return false;
    this.runRealTimers();
    const rwOk = this.rewindAvailable();
    if (rwOk !== this.rwHint) {
      this.rwHint = rwOk;
      this.g.ui?.rewindHint?.(rwOk);
    }
    if (this.rewinding) {
      this.updateRewind(dt);
      return true;
    }
    if (this.replay) {
      this.updateReplay(dt);
      return true;
    }
    if (!this.paused) {
      if (this.ff) dt *= FF_SPEED;
      this.time += dt;
      this.tweens.update(dt);
      this.resolveWaiters();
      this.updateChars(dt);
      this.updateIdle();
    }
    // tuval yalnız GPU'ya yükleneceği karelerde çizilir (tv.beginFrame: telefonda 30 Hz); arada geçen süre kayda eklenir
    if (!this.paused) this.recDt = (this.recDt || 0) + dt;
    if (this.tv.due === false) return true;
    this.drawFrame();
    // geri sarma tamponuna OSD'siz kare girer (yoksa geri sararken eski "▶ OYNAT"/sayaç yazıları üst üste biner)
    if (this.recDt) this.tv.record(this.recDt, this.meta, this.time);
    this.pruneLogs();
    this.recDt = 0;
    this.drawOsd();
    return true;
  }

  runRealTimers() {
    if (!this.realTimers.length) return;
    const now = this.g.clock;
    const due = this.realTimers.filter((r) => now >= r.at);
    if (!due.length) return;
    this.realTimers = this.realTimers.filter((r) => now < r.at);
    for (const r of due) {
      try {
        r.fn();
      } catch (e) {
        console.error(e);
      }
    }
  }

  /** Gerçek zamanda (oyun saati) sec sonra fn çalışır; kaset duraklatılmış olsa bile. Dönen fonksiyon iptal eder. */
  realTimeout(fn, sec) {
    const r = { at: this.g.clock + sec, fn };
    this.realTimers.push(r);
    return () => (this.realTimers = this.realTimers.filter((x) => x !== r));
  }

  clearRealTimers() {
    this.realTimers = [];
  }

  /** Gerçek zamanlı bekleme (duraklatma onu durdurmaz). */
  realWait(sec) {
    return this.race(new Promise((resolve) => this.realTimeout(resolve, sec)));
  }

  /** Oyuncunun ekranda baktığı nokta [x, y, w, h] (640x480 tuval) dikdörtgeninin içinde mi? */
  gazeIn(rect) {
    const gz = this.g.gazeOnTv || { x: 0, y: 0 };
    const x = ((gz.x + 1) / 2) * W;
    const y = ((1 - gz.y) / 2) * H;
    return x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3];
  }

  /** Oyuncunun ekrandaki bakış noktası (tuval koordinatı) */
  gazePoint() {
    const gz = this.g.gazeOnTv || { x: 0, y: 0 };
    return { x: ((gz.x + 1) / 2) * W, y: ((1 - gz.y) / 2) * H };
  }

  /**
   * Sahte bitiş: kaset bitmiş gibi davranır (VCR "STOP", gerçek bildirim), sec saniye (bant zamanı) sonra devam eder.
   * Bu sırada F/E sessizce yutulur, onTapeDone çağrılmaz. Sahneyi kaset kendisi çizer.
   */
  async fakeEnd(sec = 7) {
    // VCR "durdu": ileri sarma sürüyorsa biter (sahte bitiş hızla atlanamaz), OSD de görünmez
    if (this.ff) {
      this.stopFF();
      this.osdUntil = 0;
    }
    this.fakeEnding = true;
    this.g.fakeEnd?.(true);
    try {
      await this.wait(sec);
    } finally {
      this.fakeEnding = false;
      this.g.fakeEnd?.(false);
    }
  }

  resolveWaiters() {
    const done = this.waiters.filter((w) => this.time >= w.until);
    if (!done.length) return;
    this.waiters = this.waiters.filter((w) => this.time < w.until);
    done.forEach((w) => w.resolve());
  }

  drawFrame() {
    const ctx = this.tv.ctx;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (this.sceneFn) this.sceneFn(ctx, this.time - this.sceneT0, this);
    ctx.restore();
    if (this.scareFn) {
      ctx.save();
      this.scareFn(ctx, this.time - this.scareT0, this);
      ctx.restore();
    }
    if (this.input) {
      if (this.input.options) S.optionsBar(ctx, this.input.options, { evil: this.input.evil });
      S.promptBox(ctx, this.time, this.input.text, { evil: this.input.evil, label: this.input.label });
    }
  }

  drawOsd() {
    const ctx = this.tv.ctx;
    const label = this.paused ? '❚❚ DURAKLAT' : this.ff ? '▶▶ İLERİ SAR' : this.time < this.osdUntil ? this.osdLabel : '';
    if (label) S.osd(ctx, { label, counter: this.counter() });
  }

  counter() {
    // her kaset bandın biraz daha ilerisinden başlar (VCR sayacı)
    const n = parseInt(String(this.tapeId).slice(1), 10) || 1;
    return this.time + (n - 1) * 1324;
  }

  showOsd(label, sec = 2.5) {
    this.osdLabel = label;
    this.osdUntil = this.time + sec;
  }

  // ---------------------------------------------------------------- karakterler
  updateChars(dt) {
    const level = this.audio.voiceLevel();
    const gaze = this.g.gazeOnTv || { x: 0, y: 0 };
    for (const [name, c] of Object.entries(this.chars)) {
      // göz kırpma
      if (this.time > c.nextBlink && c.blinkT < 0) c.blinkT = 0;
      if (c.blinkT >= 0) {
        c.blinkT += dt;
        c.blink = Math.sin(clamp(c.blinkT / 0.16, 0, 1) * Math.PI);
        if (c.blinkT > 0.16) {
          c.blinkT = -1;
          c.blink = 0;
          c.nextBlink = this.time + rand(1.8, 4.5);
        }
      }
      // ağız
      const talking = this.speaker === name && !c.frozenMouth;
      const target = talking ? level : 0;
      c.mouth += (target - c.mouth) * Math.min(1, dt * 22);
      // bakış
      let lt = { x: 0, y: 0 };
      if (c.lookTarget) lt = c.lookTarget;
      else if (this.eyeMode === 'track' && name === 'beste') lt = { x: clamp(gaze.x, -1, 1), y: clamp(-gaze.y, -1, 1) };
      else if (this.eyeMode === 'viewer') {
        // ara sıra küçük göz hareketleri
        const k = Math.floor(this.time / 2.3 + (name === 'tonton' ? 7 : 0));
        lt = { x: (Math.sin(k * 12.9) * 0.5) * 0.4, y: (Math.cos(k * 7.1) * 0.5) * 0.25 };
      }
      const sp = this.eyeMode === 'track' ? 10 : 6;
      c.look.x += (lt.x - c.look.x) * Math.min(1, dt * sp);
      c.look.y += (lt.y - c.look.y) * Math.min(1, dt * sp);
    }
  }

  beste(ctx, over = {}) {
    drawBeste(ctx, { ...this.chars.beste, t: this.time, ...over });
  }
  tonton(ctx, over = {}) {
    drawTonton(ctx, { ...this.chars.tonton, t: this.time, ...over });
  }

  // ---------------------------------------------------------------- senaryo API
  scene(fn) {
    this.sceneFn = fn;
    this.sceneT0 = this.time;
  }

  tag(meta) {
    this.meta = meta;
    if (meta?.rev || meta?.secret) this.tagAt = this.time;
  }

  /**
   * Geri sarma her an açık değil: ters mesaj ya da gizli kare az önce geçtiyse,
   * kaset geri sarmayı dinliyorsa (onRewindHold, ör. final kapıları) ya da kaset izin verdiyse.
   */
  rewindAvailable() {
    if (!this.active || this.fakeEnding || this.paused) return false;
    if (this.allowRewind || this.onRewindHold || this.rewinding || this.replay) return true;
    if (this.meta?.rev || this.meta?.secret) return true;
    return this.tagAt != null && this.time - this.tagAt < REWIND_WINDOW;
  }

  wait(sec) {
    return this.race(new Promise((resolve) => this.waiters.push({ until: this.time + sec, resolve })));
  }

  fmt(text) {
    const name = this.g.state.name || 'arkadaşım';
    const now = new Date();
    return text
      .replaceAll('{ad}', name)
      .replaceAll('{saat}', timeString(now))
      .replaceAll('{cevap}', (this.lastAnswer || '').toLocaleUpperCase('tr').slice(0, 20))
      .replaceAll('{gun}', GUNLER[now.getDay()])
      .replaceAll('{yil}', String(now.getFullYear()));
  }

  /** Altyazı etiketi: o.label > satırdaki "w" > kaset başına eşleme > ses stilinin etiketi */
  labelFor(line, o = {}) {
    const w = WHO[line.v] || WHO.beste;
    let label = o.label ?? line.w ?? w.label;
    if (this.labelOverride && this.labelOverride[label] != null && o.label == null && line.w == null) label = this.labelOverride[label];
    return { label, cls: o.cls ?? w.cls };
  }

  /** Repliği seslendirir, altyazıyı gösterir, bitince döner. */
  async say(id, o = {}) {
    this.check();
    const line = this.lines[id];
    if (!line) {
      console.warn('replik yok', id);
      return;
    }
    const who = o.who || (line.v.startsWith('tonton') ? 'tonton' : line.v.startsWith('beste') ? 'beste' : 'narrator');
    const w = this.labelFor(line, o);
    o = { ...this.voiceMods[line.v], ...this.voiceMods[who], ...o };
    this.voice?.stop();
    const text = o.sub ?? this.fmt(line.s || line.t);
    const sub = [w.label, text, w.cls];
    this.g.ui.subtitle(...sub);
    const tok = ++this.subTok;
    this.speaker = who;
    const fast = this.g.debug?.fast;
    const filter = o.filter === undefined ? STYLE_FILTER[line.v] : o.filter;
    const file = o.file || id;
    // ses dosyası yoksa replik bant zamanında bekler (duraklatma / geri sarma onu da durdurur)
    const real = () =>
      !this.audio.buffers.has(file)
        ? this.skipVoice(SILENT_LINE_SEC, null)
        : this.audio.playVoice(file, { rate: o.rate, gain: o.gain, detune: o.detune, dest: o.dest, filter: o.dest ? null : filter });
    // ileri sarılırken (ve test kancasında) replik çalınmaz, kısa bir an altyazı görünür;
    // ileri sarma replik bitmeden bırakılırsa replik baştan gerçekten çalınır
    const h = this.ff || fast ? this.skipVoice(this.ff ? 0.6 : 0.2, this.ff && !fast ? real : null) : real();
    this.ffSkipped = this.ff ? { id, o, at: this.time } : null;
    this.voice = h;
    const cur = (this.sayCur = { id, o, h, sub, tok });
    if (this.paused || this.rewinding || this.replay) h.pause();
    try {
      await this.race(h.promise);
    } finally {
      if (this.voice === h) {
        this.voice = null;
        this.speaker = null;
      }
      if (this.sayCur === cur) this.sayCur = null;
      if (this.aborted) h.stop();
    }
    // altyazı hâlâ bu repliğinse kalkar (araya başka replik girdiyse onunkine dokunulmaz)
    if (!o.keep && this.subTok === cur.tok) this.g.ui.subtitle(null, null, null, 0.35);
    if (o.after) await this.wait(o.after);
  }

  /**
   * Bant zamanında süren sessiz replik tutamacı (ileri sarma, test kancası, ses dosyası olmayan replik).
   * real verilirse land() repliği baştan gerçek sesle çalar (ileri sarma bırakılınca).
   */
  skipVoice(sec, real) {
    let resolve;
    const h = { skip: true, inner: null, done: false, promise: new Promise((r) => (resolve = r)) };
    const finish = () => {
      if (h.done) return;
      h.done = true;
      this.waiters = this.waiters.filter((x) => x !== waiter);
      resolve();
    };
    const waiter = { until: this.time + sec, resolve: () => !h.inner && finish() };
    this.waiters.push(waiter);
    h.pause = () => h.inner?.pause();
    h.resume = () => h.inner?.resume();
    h.stop = () => {
      h.inner?.stop();
      finish();
    };
    h.land = () => {
      if (!real || h.done || h.inner) return false;
      this.waiters = this.waiters.filter((x) => x !== waiter);
      h.inner = real();
      h.inner.promise.then(finish);
      return true;
    };
    return h;
  }

  /** Beklemeden başlatılan replik (bekleme uyarıları vb.) */
  sayAsync(id, o) {
    this.say(id, o).catch(() => {});
  }

  /**
   * Odadan gelen ses (TV'den değil): duraklatma ve ileri sarma bunu durdurmaz.
   * o.pos: {x,y,z} ya da g.room.points içindeki ad ('door', 'phone', 'bulb'...); yoksa düz oda sesi.
   * o.listener: true ise oyuncunun hemen yanından (kulağına) gelir.
   */
  async sayRoom(id, o = {}) {
    this.check();
    const line = this.lines[id];
    if (!line) {
      console.warn('replik yok', id);
      return;
    }
    let pos = typeof o.pos === 'string' ? this.g.room.points[o.pos] : o.pos;
    if (o.listener) {
      const l = this.g.room.listener();
      pos = { x: l.pos.x + 0.25, y: l.pos.y, z: l.pos.z + 0.15 };
    }
    const w = this.labelFor(line, o);
    const tok = o.sub !== false ? ++this.subTok : -1;
    if (o.sub !== false) this.g.ui.subtitle(w.label, o.sub ?? this.fmt(line.s || line.t), w.cls);
    const h = this.g.debug?.fast
      ? { promise: new Promise((r) => setTimeout(r, 150)), stop() {} }
      : this.audio.playRoomVoice(o.file || id, { pos, gain: o.gain ?? 1.2, rate: o.rate ?? 1, detune: o.detune ?? 0, wet: o.wet ?? 0.35 });
    try {
      await this.race(h.promise);
    } finally {
      if (this.aborted) h.stop();
    }
    if (!o.keep && o.sub !== false && this.subTok === tok) this.g.ui.subtitle(null, null, null, 0.35);
  }

  music(mode, o) {
    this.audio.music.play(mode, o);
    if (this.paused || this.rewinding || this.ff) this.audio.music.pause();
  }
  stopMusic(fade = 0.8) {
    this.audio.music.stop(fade);
  }

  sfx(name, ...a) {
    const r = this.audio.sfx(name, ...a);
    // tek seferlik efektler yeniden oynatma için kaydedilir (döngüler canlı kasette zaten sürüyor)
    if (typeof r !== 'function' && !VCR_SFX.has(name) && this.logging()) this.xlog.push({ t: this.time, name, a });
    return r;
  }

  /** Ekran shader parametrelerini yumuşakça değiştirir. */
  fx(params, dur = 1) {
    for (const [k, v] of Object.entries(params)) {
      if (k in this.tv.p) this.tweens.add(this.tv.p, k, v, dur);
    }
  }

  setBase(params, dur = 1) {
    this.baseFx = { ...this.baseFx, ...params };
    this.fx(this.baseFx, dur);
  }

  /**
   * Ani korkutma: sahnenin üstüne bir an korkunç bir kare + yüksek ses.
   * o.face: 'beste' | 'man' | 'tonton' (hazır kareler), o.draw(ctx, t) kendi karen,
   * o.sec ekranda kalma süresi (bant zamanı; duraklatılırsa kare donar), o.sfx ses adı ('scare'),
   * o.room true ise ses arkadan, odadan gelir. İleri sarılırken atlanır (false döner).
   */
  async jumpscare(o = {}) {
    // kasetler izlenirken ani korkutma yok: korkutmalar evde yürürken olur
    if (!TAPE_SCARES || this.ff || this.aborted) return false;
    const sec = o.sec ?? 0.55;
    this.scareT0 = this.time;
    this.scareFn = o.draw || ((ctx, t) => S.scareFace(ctx, t, o.face || 'beste', o));
    this.sfx(o.sfx || 'scare', o.room ? this.g.room?.points?.behind : null);
    const p = this.tv.p;
    p.jitter = Math.max(p.jitter, 0.6);
    p.aberration = Math.max(p.aberration ?? 0, 0.012);
    this.tweens.add(p, 'jitter', this.baseFx.jitter ?? 0, sec + 0.4);
    this.tweens.add(p, 'aberration', this.baseFx.aberration ?? 0.002, sec + 0.4);
    if (!this.g.settings?.flash) this.g.room?.flickerBurst?.(0.35);
    try {
      await this.wait(sec);
    } finally {
      this.scareFn = null;
    }
    return true;
  }

  async glitch(amount = 1, dur = 0.4, sound = true) {
    const p = this.tv.p;
    p.glitch = amount;
    p.jitter = Math.max(p.jitter, amount * 2);
    p.noise = Math.max(p.noise, amount * 0.25);
    if (sound) this.sfx('glitch', dur);
    this.tweens.add(p, 'glitch', this.baseFx.glitch, dur);
    this.tweens.add(p, 'jitter', this.baseFx.jitter, dur);
    this.tweens.add(p, 'noise', this.baseFx.noise, dur);
  }

  // ---------------------------------------------------------------- klavye cevapları
  ask(o = {}) {
    this.check();
    // soru gelince ileri sarma durur; atlanan soru repliği cevap kutusu açıkken tekrar okunur
    // (ileri sarma sorudan biraz önce bırakılmış olsa da: son replik atlanmışsa soru duyulmamıştır)
    if (this.ff) this.stopFF();
    const sk = this.ffSkipped;
    const replay = sk && this.time - sk.at < REPLAY_WINDOW ? sk : null;
    this.ffSkipped = null;
    this.input = {
      text: '',
      options: o.options,
      evil: o.evil,
      idle: o.idle || [],
      idleGap: o.idleGap || 13,
      lastActivity: this.time,
      idleIdx: 0,
      maxLen: o.maxLen || 24,
      deadline: o.timeout ? this.time + o.timeout : null,
      label: o.label ?? this.promptLabel,
    };
    this.g.ui.beginTyping();
    const p = this.race(new Promise((resolve) => (this.input.resolve = resolve)));
    if (replay) this.sayAsync(replay.id, replay.o);
    return p;
  }

  typed(text) {
    if (!this.input) return;
    this.input.text = text.slice(0, this.input.maxLen);
    this.input.lastActivity = this.time;
  }

  submit() {
    const inp = this.input;
    if (!inp || this.rewinding) return;
    // geri sarmadan sonraki ileri oynatmada cevap verilirse oynatma biter, kaset canlı yerden sürer
    if (this.replay) this.endReplay();
    const text = inp.text.trim();
    if (!text) {
      this.sfx('beep', false);
      return;
    }
    // gizli kelime (KAMİL / KİBRİT, src/secrets.js): cevap sayılmaz, kaset kısa bir an tepki verir, soru sürer
    if (this.g.secrets?.onWord(text, this)) return;
    this.sfx('click');
    this.lastAnswer = text;
    this.endTyping();
    inp.resolve(text);
  }

  endTyping() {
    this.input = null;
    this.g.ui.endTyping();
  }

  updateIdle() {
    const inp = this.input;
    if (!inp) return;
    // zaman aşımı: cevap gelmezse null döner
    if (inp.deadline != null && this.time >= inp.deadline) {
      this.endTyping();
      inp.resolve(null);
      return;
    }
    if (!inp.idle.length || this.voice) return;
    if (this.time - inp.lastActivity > inp.idleGap) {
      const id = inp.idle[Math.min(inp.idleIdx, inp.idle.length - 1)];
      inp.idleIdx++;
      inp.lastActivity = this.time;
      this.sayAsync(id);
      if (inp.idleIdx >= inp.idle.length) this.glitch(0.3, 0.3, false);
    }
  }

  /**
   * Cevap eşleşene kadar sorar. match(text) -> anahtar | null.
   * Döner: { key, text }
   */
  async choose(o) {
    for (let tries = 0; ; tries++) {
      const text = await this.ask(o);
      if (text == null) return { key: null, text: null, tries, timeout: true };
      const key = o.match(text, tries);
      if (key != null) return { key, text, tries };
      if (o.maxTries && tries + 1 >= o.maxTries) return { key: null, text, tries };
      if (o.unknown) await this.say(typeof o.unknown === 'function' ? o.unknown(tries) : o.unknown);
    }
  }

  // ---------------------------------------------------------------- duraklat / geri sar
  togglePause() {
    if (!this.active || this.rewinding || this.input) return false;
    if (this.ff) this.stopFF();
    this.paused = !this.paused;
    this.sfx('click');
    // geri sarmadan sonraki ileri oynatmada duraklatma yalnız oynatıcının: kasetin duraklatma kancaları
    // (sayım, bulmaca) canlı kasete aittir, onlar çalışmaz
    const rp = this.replay;
    if (this.paused) {
      this.pausedAt = this.g.clock;
      if (!rp) this.pauseCount++;
      this.audio.pauseVoices();
      this.audio.music?.pause();
      // cızırtı kaset kapattıysa (ör. sahte bitiş) devam edince de kapalı kalır
      this.hissWas = this.audio.hissOn !== false;
      this.audio.setHiss(false);
      const m = rp ? this.tv.frameAt(rp.n)?.meta : this.meta;
      if (m?.secret) this.g.foundSecret(m.secret.id, m.secret.text);
    } else {
      this.pausedFor = this.g.clock - this.pausedAt;
      this.resumeTapeAudio();
      this.audio.setHiss(this.hissWas);
      if (!rp) {
        this.showOsd('▶ OYNAT', 2);
        this.onResume?.(this.pauseCount);
      }
    }
    this.vcrLook();
    if (!rp) this.onPause?.(this.paused);
    return true;
  }

  /** Kasetin sesini sürdürür: ileri oynatmadaysa yalnız onun kopyaları (canlı replik oynatma bitene dek bekler) */
  resumeTapeAudio() {
    if (this.replay) for (const v of this.replay.voices) v.h.resume();
    else this.audio.resumeVoices();
    this.audio.music?.resume();
  }

  /** Kaseti kod içinden duraklatır (oyuncu Boşluk'a basmış gibi). */
  forcePause() {
    if (this.paused || !this.active) return;
    if (this.input) this.endTyping();
    this.togglePause();
  }

  /** Şu anki duraklatmanın süresi (duraklatılmış değilse son duraklatmanınki). */
  pausedSecs() {
    return this.paused ? this.g.clock - this.pausedAt : this.pausedFor;
  }

  /** Ekranın VCR modu görünümü: kasetin kendi ekran ayarlarına (tv.p, tween'ler) dokunmaz. */
  vcrLook() {
    this.tv.setOverlay(this.rewinding ? LOOK_RW : this.ff ? LOOK_FF : this.paused ? LOOK_PAUSE : null);
  }

  /** Sağ ok basılıyken: bant hızlanır, replikler atlanır. Soru gelince kendiliğinden durur. */
  startFF() {
    if (!FF_ENABLED) return;
    if (!this.active || this.noFF || this.rewinding || this.paused || this.input || this.ff || this.fakeEnding) return;
    this.ff = true;
    // yarıda kesilen replik de atlanmış sayılır: hemen ardından soru açılırsa yeniden okunur
    const cur = this.sayCur;
    if (cur && cur.h === this.voice && !cur.h.done) this.ffSkipped = { id: cur.id, o: cur.o, at: this.time };
    this.voice?.stop();
    this.audio.pauseVoices();
    this.audio.music?.pause();
    this.ffStop = this.sfx('ffwd');
    this.vcrLook();
  }

  stopFF() {
    if (!this.ff) return;
    this.ff = false;
    this.ffStop?.();
    this.ffStop = null;
    // bant bir repliğin ortasında bırakıldıysa o replik baştan çalınır (sessiz geçmez)
    if (this.voice?.land?.()) {
      this.ffSkipped = null;
      if (this.paused || this.rewinding) this.voice.pause();
    }
    if (!this.paused && !this.rewinding) this.resumeTapeAudio();
    this.vcrLook();
    this.showOsd('▶ OYNAT', 1.5);
  }

  /**
   * Geri sarma (sol ok / GERİ SAR basılıyken). Tamponda geriye doğru ilk gizli kareye ya da ters mesaja
   * gelince onun başında durur, daha geriye gitmez (yoksa tamponun başında). Bırakınca kaset canlı yere
   * atlamaz: son geri sarılan kareden itibaren tampondaki kareler sesleri ve altyazılarıyla ileri oynatılır,
   * canlı ana gelince kaset kaldığı yerden sürer (startReplay).
   */
  startRewind() {
    // ters mesaj çalarken tuş bırakılıp yeniden basılırsa geri sarma mesaj bitince kesilmez
    if (this.rewinding && this.rw) this.rw.release = false;
    // sahte bitişte VCR "durdu"; ekran kapalıyken (oda sahnesi gerçek zamanlı) geri sarılmaz
    if (!this.active || this.rewinding || this.fakeEnding || this.tv.p.power < 0.05) return;
    if (!this.rewindAvailable()) return;
    if (this.ff) this.stopFF();
    // ileri oynatma sırasında yeniden geri sarılırsa oynatılan yerden başlar
    const from = this.replay ? this.replay.n : 0;
    const tEnd = this.replay ? this.replay.tEnd : this.time;
    this.stopReplayAudio();
    this.replay = null;
    this.rewinding = true;
    this.audio.pauseVoices();
    this.audio.music?.pause();
    this.rw = { n: from, acc: 0, stick: 0, held: 0, seen: new Set(), stopSfx: this.sfx('rewind'), auto: false, release: false, revPlayed: false, revH: null, tEnd, limit: this.rewindLimit(from) };
    this.vcrLook();
  }

  /** from'dan geriye ilk gizli kare / ters mesaj bölümünün en eski karesi (yoksa tamponun başı) */
  rewindLimit(from) {
    const last = Math.max(0, this.tv.count - 1);
    const key = (m) => (m?.secret ? 's:' + m.secret.id : m?.rev ? 'r:' + m.rev : null);
    for (let n = from; n <= last; n++) {
      const k = key(this.tv.frameAt(n)?.meta);
      if (!k) continue;
      let e = n;
      while (e < last && key(this.tv.frameAt(e + 1)?.meta) === k) e++;
      return e;
    }
    return last;
  }

  stopRewind(force = false) {
    if (!this.rewinding) return;
    const rw = this.rw;
    if (rw.auto && !force) {
      rw.release = true;
      return;
    }
    rw.stopSfx?.();
    // kaset zorla devam ettiriliyorsa ters mesaj kasetin sesinin üstünde sürmesin
    if (force && rw.revH && !rw.revH.done) rw.revH.stop();
    this.rw = null;
    this.rewinding = false;
    // kendi geri sarma mekaniği olan bölümlerde (onRewindHold) ve zorla devamda kaset canlı yerden sürer
    const replayed = !force && !this.onRewindHold && rw.n > 0 && this.startReplay(rw.n, rw.tEnd);
    if (!replayed && !this.paused) this.resumeTapeAudio();
    this.vcrLook();
    if (!replayed) this.showOsd('▶ OYNAT', 2);
    this.tv.kick(0.6, 0.35);
    if (force) return;
    this.onRewindEnd?.(rw.held);
    // sağ ok hâlâ basılıysa ileri sarmaya geçilir
    if (this.g.input?.ffHeld) this.startFF();
  }

  updateRewind(dt) {
    const rw = this.rw;
    if (this.g.input?.rewindHeld !== false) rw.held += dt;
    if (this.onRewindHold?.(rw.held)) return;
    // tamponun en eski karesinde ya da ilk gizli kare / ters mesajın başında durur (sayaç da orada kalır)
    const last = Math.max(0, this.tv.count - 1);
    const lim = Math.min(rw.limit ?? last, last);
    if (rw.stick > 0) rw.stick -= dt;
    else {
      rw.acc += dt * 18;
      while (rw.acc >= 1) {
        rw.acc -= 1;
        rw.n = Math.min(rw.n + 1, lim);
      }
    }
    const ctx = this.tv.ctx;
    const f = this.tv.frameAt(rw.n);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (f) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(f.canvas, 0, 0, W, H);
      ctx.restore();
    }
    const meta = f?.meta;
    const resting = rw.n >= lim;
    const atEnd = !f || (resting && rw.n >= last && !meta?.secret && !meta?.rev);
    if (atEnd) S.staticNoise(ctx, this.g.clock, 0.55);
    // geri sarma bantları (gizli karenin / mesajın başında durunca kare temiz görünür)
    if (!resting || atEnd) {
      for (let i = 0; i < 3; i++) {
        const y = (((this.g.clock * (180 + i * 70)) % (H + 60)) - 30) | 0;
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(0, y, W, 6 + i * 3);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(0, y + 8, W, 3);
      }
    }
    if (meta?.secret && !rw.seen.has(meta.secret.id)) {
      rw.seen.add(meta.secret.id);
      rw.stick = 1.6;
      this.sfx('warble');
      this.g.foundSecret(meta.secret.id, meta.secret.text);
    }
    if (rw.stick > 0 && meta?.secret?.text) S.bigText(ctx, meta.secret.text, { font: `52px ${S.FONT_OSD}` });
    if (meta?.rev && !rw.revPlayed) this.playReversed(rw, meta.rev);
    if (rw.revPlayed && rw.auto) S.realGirl(ctx, this.g.clock, { alpha: 0.55 + Math.sin(this.g.clock * 7) * 0.15 });
    S.osd(ctx, { label: '◀◀ GERİ SAR', counter: this.counter() - rw.n / 12 });
  }

  // ---------------------------------------------------------------- geri sarmadan sonra ileri oynatma
  /**
   * Tampondaki n. kareden canlı ana (tEnd) kadar ileri oynatma: kareler bant zamanlarıyla, o aralıkta çalan
   * replikler (yarıda kalanlar doğru ofsetten), efektler ve altyazılar kayıttan yeniden çalınır. Kasetin
   * betiği bu sırada donuk kalır (hiçbir soru, bayrak, korkutma yeniden çalışmaz); sonra kaldığı yerden sürer.
   */
  startReplay(n, tEnd = this.time) {
    const f = this.tv.frameAt(n);
    if (!f || f.t == null || f.t >= tEnd - 0.04) return false;
    const t0 = f.t;
    const rp = (this.replay = { n, t: t0, t0, tEnd, voices: [] });
    // t0'da süren replikler kaldıkları yerden
    for (const e of this.vlog) if (e.t <= t0 && (e.end == null || e.end > t0)) this.replayVoice(e, t0 - e.t);
    // t0 anındaki altyazı
    let sub = null;
    for (const e of this.slog) if (e.t <= t0) sub = e;
    this.noLog = true;
    try {
      if (sub) this.g.ui.subtitle(...sub.a);
      else this.g.ui.subtitle(null);
    } finally {
      this.noLog = false;
    }
    if (!this.paused) this.audio.music?.resume();
    else for (const v of rp.voices) v.h.pause();
    return true;
  }

  replayVoice(e, off) {
    const rp = this.replay;
    this.noLog = true;
    let h;
    try {
      h = this.audio.playVoice(e.id, e.opts);
    } finally {
      this.noLog = false;
    }
    if (off > 0.02 && h.buf) {
      h.pause();
      h.offset = off * (e.speed || 1);
      h.resume();
    }
    if (this.paused) h.pause();
    rp.voices.push({ e, h });
  }

  stopReplayAudio() {
    const rp = this.replay;
    if (!rp) return;
    for (const v of rp.voices) v.h.stop();
    rp.voices = [];
  }

  updateReplay(dt) {
    const rp = this.replay;
    if (!this.paused) {
      const prev = rp.t;
      rp.t = Math.min(rp.tEnd, rp.t + dt);
      for (const e of this.vlog) if (e.t > prev && e.t <= rp.t) this.replayVoice(e, rp.t - e.t);
      this.noLog = true;
      try {
        for (const e of this.slog) if (e.t > prev && e.t <= rp.t) this.g.ui.subtitle(...e.a);
        for (const e of this.xlog) if (e.t > prev && e.t <= rp.t) this.audio.sfx(e.name, ...e.a);
      } finally {
        this.noLog = false;
      }
      // canlı kasette erken kesilen replikler kopyada da kesilir
      for (const v of rp.voices) if (v.e.end != null && v.e.end <= rp.t && !v.h.done) v.h.stop();
      rp.voices = rp.voices.filter((v) => !v.h.done);
      while (rp.n > 0) {
        const nf = this.tv.frameAt(rp.n - 1);
        if (nf && nf.t != null && nf.t <= rp.t + 1e-6) rp.n--;
        else break;
      }
    }
    const f = this.tv.frameAt(rp.n);
    const m = f?.meta;
    // ileri oynatırken görülen gizli kare de sayılır (zaten bulunduysa ikinci kez verilmez)
    if (m?.secret) this.g.foundSecret(m.secret.id, m.secret.text);
    if (rp.t >= rp.tEnd - 1e-6) {
      this.endReplay();
      return;
    }
    if (this.tv.due === false) return;
    const ctx = this.tv.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (f) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(f.canvas, 0, 0, W, H);
      ctx.restore();
    }
    const counter = this.counter() - (rp.tEnd - rp.t);
    if (this.paused) S.osd(ctx, { label: '❚❚ DURAKLAT', counter });
    else if (rp.t - rp.t0 < 1.5) S.osd(ctx, { label: '▶ OYNAT', counter });
  }

  /** İleri oynatma canlı ana ulaştı: kopyalar susar, kasetin kendi sesi ve altyazısı kaldığı yerden sürer */
  endReplay() {
    this.stopReplayAudio();
    this.replay = null;
    if (!this.paused) this.resumeTapeAudio();
    let sub = null;
    for (const e of this.slog) if (e.t <= this.time) sub = e;
    this.noLog = true;
    try {
      const cur = this.sayCur;
      if (cur && !cur.h.done) {
        this.subTok = cur.tok;
        this.g.ui.subtitle(...cur.sub);
      } else if (sub) this.g.ui.subtitle(...sub.a);
      else this.g.ui.subtitle(null);
    } finally {
      this.noLog = false;
    }
    this.vcrLook();
  }

  /** Eski kayıtları atar (tampon ~10 sn; sürmekte olan replikler kalır) */
  pruneLogs() {
    const lim = this.time - LOG_KEEP;
    if (this.vlog.length && this.vlog[0].t < lim) this.vlog = this.vlog.filter((e) => e.t >= lim || e.end == null || e.end > lim);
    if (this.xlog.length && this.xlog[0].t < lim) this.xlog = this.xlog.filter((e) => e.t >= lim);
    if (this.slog.length > 1 && this.slog[1].t < lim) {
      // en son altyazı durumu (lim'den önceki son kayıt) kalır
      let k = 0;
      while (k + 1 < this.slog.length && this.slog[k + 1].t < lim) k++;
      this.slog = this.slog.slice(k);
    }
  }

  /** Geri sararken ters kaydedilmiş mesajın düz hâli çalınır; bitene kadar geri sarma sürer. */
  playReversed(rw, id) {
    rw.revPlayed = true;
    rw.auto = true;
    rw.stick = 99;
    const line = this.lines[id];
    const tok = ++this.subTok;
    this.g.ui.subtitle('???', line?.t ?? '', 'bilinmeyen');
    this.g.foundSecret('ters-' + id, null);
    const h = (rw.revH = this.audio.playVoice(id, { gain: 1.2 }));
    h.promise.then(() => {
      // altyazı başkası yazmadıysa: kaset hâlâ aynı repliğin ortasındaysa onun altyazısı geri gelir
      if (this.subTok === tok) {
        const cur = this.sayCur;
        if (this.active && cur && !cur.h.done) {
          this.subTok = cur.tok;
          this.g.ui.subtitle(...cur.sub);
        } else this.g.ui.subtitle(null, null, null, 0.8);
      }
      if (this.rw !== rw) return;
      rw.auto = false;
      rw.stick = 0;
      if (rw.release || !this.g.input?.rewindHeld) this.stopRewind();
    });
  }

  tryEject() {
    if (!this.active) return true;
    if (typeof this.ejectPolicy === 'function') return this.ejectPolicy();
    return this.ejectPolicy === 'allow';
  }
}

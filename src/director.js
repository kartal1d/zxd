// Kaset oynatıcı: bant saati, replikler, klavyeyle cevaplar, duraklatma ve geri sarma.
import { AbortTape, Tweens, clamp, rand, timeString } from './util.js';
import { TV_W as W, TV_H as H, SCREEN_DEFAULT } from './tv.js';
import * as S from './draw/scenes.js';
import { drawBeste, drawTonton } from './draw/characters.js';

const FF_SPEED = 5;

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
  }

  reset() {
    this.time = 0;
    this.paused = false;
    this.rewinding = false;
    this.rw = null;
    this.ff = false;
    this.ffStop = null;
    this.aborted = false;
    this.tweens = new Tweens();
    this.waiters = [];
    this.rejects = new Set();
    this.sceneFn = null;
    this.sceneT0 = 0;
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
    this.ffSkipped = null;
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
    this.ffStop?.();
    this.ffStop = null;
    this.ff = false;
    this.paused = false;
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
    if (this.rewinding) {
      this.updateRewind(dt);
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
    this.drawFrame();
    if (!this.paused) this.tv.record(dt, this.meta);
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
    if (this.input) {
      if (this.input.options) S.optionsBar(ctx, this.input.options, { evil: this.input.evil });
      S.promptBox(ctx, this.time, this.input.text, { evil: this.input.evil, label: this.input.label });
    }
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
    this.g.ui.subtitle(w.label, text, w.cls);
    this.speaker = who;
    // ileri sarılırken (ve test kancasında) replik çalınmaz, kısa bir an altyazı görünür
    const skip = this.ff || this.g.debug?.fast;
    this.ffSkipped = this.ff ? { id, o } : null;
    const filter = o.filter === undefined ? STYLE_FILTER[line.v] : o.filter;
    const h = skip ? { promise: this.wait(this.ff ? 0.6 : 0.2), pause() {}, resume() {}, stop() {} } : this.audio.playVoice(o.file || id, { rate: o.rate, gain: o.gain, detune: o.detune, dest: o.dest, filter: o.dest ? null : filter });
    this.voice = h;
    if (this.paused || this.rewinding) h.pause();
    try {
      await this.race(h.promise);
    } finally {
      if (this.voice === h) {
        this.voice = null;
        this.speaker = null;
      }
      if (this.aborted) h.stop();
    }
    if (!o.keep) this.g.ui.subtitle(null, null, null, 0.35);
    if (o.after) await this.wait(o.after);
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
    if (o.sub !== false) this.g.ui.subtitle(w.label, o.sub ?? this.fmt(line.s || line.t), w.cls);
    const h = this.g.debug?.fast
      ? { promise: new Promise((r) => setTimeout(r, 150)), stop() {} }
      : this.audio.playRoomVoice(o.file || id, { pos, gain: o.gain ?? 1.2, rate: o.rate ?? 1, detune: o.detune ?? 0, wet: o.wet ?? 0.35 });
    try {
      await this.race(h.promise);
    } finally {
      if (this.aborted) h.stop();
    }
    if (!o.keep && o.sub !== false) this.g.ui.subtitle(null, null, null, 0.35);
  }

  music(mode, o) {
    this.audio.music.play(mode, o);
    if (this.paused || this.rewinding || this.ff) this.audio.music.pause();
  }
  stopMusic(fade = 0.8) {
    this.audio.music.stop(fade);
  }

  sfx(name, ...a) {
    return this.audio.sfx(name, ...a);
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
    let replay = null;
    if (this.ff) {
      this.stopFF();
      replay = this.ffSkipped;
    }
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
    if (!inp) return;
    const text = inp.text.trim();
    if (!text) {
      this.sfx('beep', false);
      return;
    }
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
    if (this.paused) {
      this.pausedAt = this.g.clock;
      this.pauseCount++;
      this.audio.pauseVoices();
      this.audio.music?.pause();
      this.audio.setHiss(false);
      this.tv.p.jitter = 0.6;
      if (this.meta?.secret) this.g.foundSecret(this.meta.secret.id, this.meta.secret.text);
    } else {
      this.pausedFor = this.g.clock - this.pausedAt;
      this.audio.resumeVoices();
      this.audio.music?.resume();
      this.audio.setHiss(true);
      this.tv.p.jitter = this.baseFx.jitter;
      this.showOsd('▶ OYNAT', 2);
      this.onResume?.(this.pauseCount);
    }
    this.onPause?.(this.paused);
    return true;
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

  /** Sağ ok basılıyken: bant hızlanır, replikler atlanır. Soru gelince kendiliğinden durur. */
  startFF() {
    if (!this.active || this.noFF || this.rewinding || this.paused || this.input || this.ff) return;
    this.ff = true;
    this.voice?.stop();
    this.audio.pauseVoices();
    this.audio.music?.pause();
    this.ffStop = this.sfx('ffwd');
    this.tv.p.jitter = 0.9;
    this.tv.p.tracking = 1.1;
  }

  stopFF() {
    if (!this.ff) return;
    this.ff = false;
    this.ffStop?.();
    this.ffStop = null;
    this.tv.p.jitter = this.baseFx.jitter;
    this.tv.p.tracking = this.baseFx.tracking;
    if (!this.paused && !this.rewinding) {
      this.audio.resumeVoices();
      this.audio.music?.resume();
    }
    this.showOsd('▶ OYNAT', 1.5);
  }

  startRewind() {
    if (!this.active || this.rewinding) return;
    if (this.ff) this.stopFF();
    this.rewinding = true;
    this.audio.pauseVoices();
    this.audio.music?.pause();
    this.rw = { n: 0, acc: 0, stick: 0, held: 0, seen: new Set(), stopSfx: this.sfx('rewind'), auto: false, release: false, revPlayed: false };
    this.tv.p.jitter = 1.2;
    this.tv.p.tracking = 1.4;
    this.tv.p.noise = 0.12;
  }

  stopRewind(force = false) {
    if (!this.rewinding) return;
    if (this.rw.auto && !force) {
      this.rw.release = true;
      return;
    }
    this.rw.stopSfx?.();
    const held = this.rw.held;
    this.rw = null;
    this.rewinding = false;
    this.tv.p.jitter = this.baseFx.jitter;
    this.tv.p.tracking = this.baseFx.tracking;
    this.tv.p.noise = this.baseFx.noise;
    if (!this.paused) {
      this.audio.resumeVoices();
      this.audio.music?.resume();
    }
    this.showOsd('▶ OYNAT', 2);
    this.glitch(0.6, 0.35, false);
    if (!force) this.onRewindEnd?.(held);
  }

  updateRewind(dt) {
    const rw = this.rw;
    if (this.g.input?.rewindHeld !== false) rw.held += dt;
    if (this.onRewindHold?.(rw.held)) return;
    if (rw.stick > 0) rw.stick -= dt;
    else {
      rw.acc += dt * 18;
      while (rw.acc >= 1) {
        rw.acc -= 1;
        rw.n++;
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
    const atEnd = !f || rw.n >= this.tv.count - 1;
    if (atEnd) S.staticNoise(ctx, this.time, 0.55);
    // geri sarma bantları
    for (let i = 0; i < 3; i++) {
      const y = (((this.g.clock * (180 + i * 70)) % (H + 60)) - 30) | 0;
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(0, y, W, 6 + i * 3);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(0, y + 8, W, 3);
    }
    const meta = f?.meta;
    if (meta?.secret && !rw.seen.has(meta.secret.id)) {
      rw.seen.add(meta.secret.id);
      rw.stick = 1.6;
      this.sfx('warble');
      this.g.foundSecret(meta.secret.id, meta.secret.text);
    }
    if (rw.stick > 0 && meta?.secret?.text) S.bigText(ctx, meta.secret.text, { font: `52px ${S.FONT_OSD}` });
    if (meta?.rev && !rw.revPlayed) {
      rw.revPlayed = true;
      rw.auto = true;
      rw.stick = 99;
      const line = this.lines[meta.rev];
      this.g.ui.subtitle('???', line.t, 'bilinmeyen');
      this.g.foundSecret('ters-' + meta.rev, null);
      const h = this.audio.playVoice(meta.rev, { gain: 1.2 });
      h.promise.then(() => {
        this.g.ui.subtitle(null, null, null, 0.8);
        if (!this.rw) return;
        this.rw.auto = false;
        this.rw.stick = 0;
        if (this.rw.release || !this.g.input.rewindHeld) this.stopRewind();
      });
    }
    if (rw.revPlayed && rw.auto) S.realGirl(ctx, this.g.clock, { alpha: 0.55 + Math.sin(this.g.clock * 7) * 0.15 });
    S.osd(ctx, { label: '◀◀ GERİ SAR', counter: this.counter() - rw.n / 12 });
  }

  tryEject() {
    if (!this.active) return true;
    if (typeof this.ejectPolicy === 'function') return this.ejectPolicy();
    return this.ejectPolicy === 'allow';
  }
}

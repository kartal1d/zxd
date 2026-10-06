import { clamp, rand } from './util.js';

const VOICE_DIR = 'assets/audio/voice/';

/** Bölümlere göre VHS ses zinciri ayarları. */
export const TAPE_FX = {
  off: { hp: 150, lp: 5200, drive: 0.1, echo: 0, echoTime: 0.03, wow: 1, rate: 1, hiss: 0 },
  t1: { hp: 150, lp: 5400, drive: 0.12, echo: 0, echoTime: 0.03, wow: 1, rate: 1, hiss: 0.014 },
  t2: { hp: 230, lp: 4200, drive: 0.3, echo: 0.42, echoTime: 0.034, wow: 1.8, rate: 0.97, hiss: 0.024 },
  t3: { hp: 110, lp: 3300, drive: 0.65, echo: 0.35, echoTime: 0.011, wow: 2.8, rate: 0.94, hiss: 0.04 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.level = 0;
    this.voices = new Set();
    this.roomVoices = new Set();
    this.fx = { ...TAPE_FX.off };
  }

  /** AudioContext'i hazırlar (askıda olabilir; ilk tıklamada resume edilir). */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.noiseBuf = this.makeNoise(3);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeIR(2.6, 2.2);
    this.reverbOut = ctx.createGain();
    this.reverbOut.gain.value = 0.5;
    this.reverb.connect(this.reverbOut).connect(this.master);

    this.room = ctx.createGain();
    this.room.connect(this.master);

    // ---- Televizyon zinciri ----
    this.tvIn = ctx.createGain();
    this.voiceIn = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.anaData = new Float32Array(this.analyser.fftSize);
    this.voiceIn.connect(this.analyser);
    this.voiceIn.connect(this.tvIn);
    this.musicIn = ctx.createGain();
    this.musicIn.connect(this.tvIn);

    this.hp = ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.wow = ctx.createDelay(0.1);
    this.wow.delayTime.value = 0.012;
    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = '2x';
    this.tvPan = this.makePanner(0, 0.9, -1.5);
    this.tvVol = ctx.createGain();

    this.tvIn.connect(this.hp).connect(this.lp).connect(this.wow).connect(this.shaper).connect(this.tvVol).connect(this.tvPan);
    this.tvPan.connect(this.master);
    const tvSend = ctx.createGain();
    tvSend.gain.value = 0.22;
    this.tvPan.connect(tvSend).connect(this.reverb);

    // metalik yankı (ikinci kaset) — kısa geri beslemeli gecikme
    this.echo = ctx.createDelay(0.5);
    this.echoFb = ctx.createGain();
    this.echoOut = ctx.createGain();
    this.shaper.connect(this.echo);
    this.echo.connect(this.echoFb).connect(this.echo);
    this.echo.connect(this.echoOut).connect(this.tvVol);

    // wow & flutter
    this.wowLfo = ctx.createOscillator();
    this.wowLfo.frequency.value = 0.55;
    this.wowDepth = ctx.createGain();
    this.wowLfo.connect(this.wowDepth).connect(this.wow.delayTime);
    this.flutLfo = ctx.createOscillator();
    this.flutLfo.frequency.value = 6.8;
    this.flutDepth = ctx.createGain();
    this.flutLfo.connect(this.flutDepth).connect(this.wow.delayTime);
    this.wowLfo.start();
    this.flutLfo.start();

    // bant cızırtısı
    this.hiss = this.loopNoise();
    const hissBp = ctx.createBiquadFilter();
    hissBp.type = 'bandpass';
    hissBp.frequency.value = 3800;
    hissBp.Q.value = 0.4;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    this.hiss.connect(hissBp).connect(this.hissGain).connect(this.tvPan);

    this.music = new Music(this);
    this.setTapeFx('off', 0);
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolume(v) {
    if (this.master) this.master.gain.setTargetAtTime(v, this.now, 0.05);
  }

  setTapeFx(name, ramp = 1.5, overrides = {}) {
    if (!this.ctx) return;
    const f = (this.fx = { ...TAPE_FX[name], ...overrides });
    const t = this.now;
    const tc = Math.max(ramp / 3, 0.01);
    this.hp.frequency.setTargetAtTime(f.hp, t, tc);
    this.lp.frequency.setTargetAtTime(f.lp, t, tc);
    this.echo.delayTime.setTargetAtTime(f.echoTime, t, tc);
    this.echoFb.gain.setTargetAtTime(f.echo * 0.85, t, tc);
    this.echoOut.gain.setTargetAtTime(f.echo, t, tc);
    this.wowDepth.gain.setTargetAtTime(0.0011 * f.wow, t, tc);
    this.flutDepth.gain.setTargetAtTime(0.00025 * f.wow, t, tc);
    this.shaper.curve = this.makeCurve(f.drive);
  }

  setHiss(on) {
    if (!this.ctx) return;
    this.hissGain.gain.setTargetAtTime(on ? this.fx.hiss : 0, this.now, 0.15);
  }

  setTvPosition(x, y, z) {
    if (!this.ctx) return;
    setPos(this.tvPan, x, y, z);
  }

  setListener(pos, fwd, up) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      const t = this.now;
      l.positionX.setTargetAtTime(pos.x, t, 0.02);
      l.positionY.setTargetAtTime(pos.y, t, 0.02);
      l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(fwd.x, t, 0.02);
      l.forwardY.setTargetAtTime(fwd.y, t, 0.02);
      l.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02);
      l.upY.setTargetAtTime(up.y, t, 0.02);
      l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  // ---------------------------------------------------------------- yükleme
  async loadVoices(onProgress) {
    let manifest = {};
    try {
      manifest = await (await fetch(VOICE_DIR + 'manifest.json')).json();
    } catch (e) {
      console.warn('Ses listesi okunamadı', e);
    }
    const ids = [];
    for (const [id, m] of Object.entries(manifest)) {
      ids.push(id);
      if (m.rev) ids.push(id + '_rev');
    }
    let done = 0;
    const queue = ids.slice();
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        try {
          const res = await fetch(VOICE_DIR + id + '.mp3');
          const arr = await res.arrayBuffer();
          const buf = await new Promise((ok, fail) => this.ctx.decodeAudioData(arr, ok, fail));
          this.buffers.set(id, buf);
        } catch (e) {
          console.warn('Ses yüklenemedi:', id, e);
        }
        done++;
        onProgress?.(done / ids.length);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  duration(id) {
    return this.buffers.get(id)?.duration ?? 0;
  }

  // ---------------------------------------------------------------- sesler
  /**
   * opts.bucket === 'room': odadan gelen ses; kaset duraklatma / ileri sarma bunu etkilemez.
   * opts.filter: 'talkback' (kontrol odası hoparlörü) | 'camcorder' (1998 kamera kaydı)
   */
  playVoice(id, opts = {}) {
    const buf = this.buffers.get(id);
    const room = opts.bucket === 'room';
    const h = new VoiceHandle(this, buf, {
      rate: (opts.rate ?? 1) * (room ? 1 : this.fx.rate),
      gain: opts.gain ?? 1,
      detune: opts.detune ?? 0,
      dest: opts.dest ?? (opts.filter ? this.filterDest(opts.filter) : room ? this.room : this.voiceIn),
    });
    const set = room ? this.roomVoices : this.voices;
    set.add(h);
    h.promise.then(() => set.delete(h));
    return h;
  }

  /** Odada belirli bir noktadan gelen ses (duraklatmadan etkilenmez). */
  playRoomVoice(id, { pos, gain = 1, rate = 1, detune = 0, wet = 0.4 } = {}) {
    const dest = pos ? this.at(pos.x, pos.y, pos.z, wet) : this.room;
    return this.playVoice(id, { bucket: 'room', dest, gain, rate, detune });
  }

  filterDest(name) {
    this._filters = this._filters || {};
    if (this._filters[name]) return this._filters[name];
    const ctx = this.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    if (name === 'talkback') {
      hp.frequency.value = 300;
      lp.frequency.value = 3000;
      const sh = ctx.createWaveShaper();
      sh.curve = this.makeCurve(0.45);
      hp.connect(lp).connect(sh).connect(this.voiceIn);
    } else {
      // camcorder: dar bantlı, hafif oda yankılı
      hp.frequency.value = 180;
      lp.frequency.value = 5500;
      hp.connect(lp).connect(this.voiceIn);
      const send = ctx.createGain();
      send.gain.value = 0.25;
      lp.connect(send).connect(this.reverb);
    }
    this._filters[name] = hp;
    return hp;
  }

  pauseVoices() {
    for (const v of this.voices) v.pause();
  }
  resumeVoices() {
    for (const v of this.voices) v.resume();
  }
  /** all = true: odadaki sesler de durur (kaset iptali, ana menü). */
  stopVoices(all = true) {
    for (const v of [...this.voices]) v.stop();
    if (all) for (const v of [...this.roomVoices]) v.stop();
  }

  /** Dudak senkronu için ses seviyesi (0..1). */
  voiceLevel() {
    if (!this.ctx) return 0;
    this.analyser.getFloatTimeDomainData(this.anaData);
    let s = 0;
    for (let i = 0; i < this.anaData.length; i++) s += this.anaData[i] * this.anaData[i];
    const r = Math.sqrt(s / this.anaData.length);
    const target = clamp((r - 0.01) * 7, 0, 1);
    this.level += (target - this.level) * (target > this.level ? 0.6 : 0.25);
    return this.level;
  }

  // ---------------------------------------------------------------- yardımcılar
  makeNoise(sec) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  makeIR(sec, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  makeCurve(drive) {
    const k = 1 + drive * 12;
    const n = 1024;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return c;
  }

  makePanner(x, y, z) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1.2;
    p.rolloffFactor = 0.9;
    setPos(p, x, y, z);
    return p;
  }

  /** Odada belirli bir konumda çalan ses için çıkış düğümü. */
  at(x, y, z, wet = 0.35) {
    const p = this.makePanner(x, y, z);
    p.connect(this.master);
    const s = this.ctx.createGain();
    s.gain.value = wet;
    p.connect(s).connect(this.reverb);
    setTimeout(() => {
      p.disconnect();
      s.disconnect();
    }, 12000);
    return p;
  }

  loopNoise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.start();
    return src;
  }

  noiseBurst(dest, t, dur, { type = 'bandpass', freq = 2000, q = 0.7, gain = 0.4, attack = 0.005, rate = 1 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.05);
    return { src, f, g };
  }

  tone(dest, t, freq, dur, { type = 'sine', gain = 0.3, attack = 0.004, detune = 0, endFreq = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return { o, g };
  }

  // ---------------------------------------------------------------- efektler
  sfx(name, ...args) {
    if (!this.ctx) return;
    const fn = SFX[name];
    if (fn) return fn.call(this, this.now, ...args);
    console.warn('bilinmeyen efekt', name);
  }

  /** Tarayıcıda Türkçe ses varsa ismi fısıldatır (isteğe bağlı ürkütücü dokunuş). */
  speakName(name) {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !name) return;
      const v = synth.getVoices().find((x) => /^tr/i.test(x.lang));
      if (!v) return;
      const u = new SpeechSynthesisUtterance(name);
      u.voice = v;
      u.lang = v.lang;
      u.rate = 0.7;
      u.pitch = 1.6;
      u.volume = 0.5;
      synth.speak(u);
    } catch {
      /* desteklenmiyor */
    }
  }
}

/** Sürekli çalan ses döngüsü: make(ctx, out) kaynakları döndürür; dönen fonksiyon sesi kısıp durdurur. */
function loop(dest, gain, make) {
  const ctx = this.ctx;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, this.now);
  out.gain.linearRampToValueAtTime(gain, this.now + 0.4);
  out.connect(dest);
  const srcs = make(ctx, out);
  return () => {
    const now = this.now;
    out.gain.cancelScheduledValues(now);
    out.gain.setTargetAtTime(0, now, 0.05);
    setTimeout(() => {
      for (const s of srcs) {
        try {
          s.stop();
        } catch {
          /* zaten durdu */
        }
      }
      out.disconnect();
    }, 400);
  };
}

function setPos(p, x, y, z) {
  if (p.positionX) {
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
  } else p.setPosition(x, y, z);
}

class VoiceHandle {
  constructor(engine, buf, opts) {
    this.e = engine;
    this.buf = buf;
    this.opts = opts;
    this.offset = 0;
    this.playing = false;
    this.done = false;
    this.promise = new Promise((r) => (this._resolve = r));
    if (!buf) {
      // ses dosyası yoksa altyazı süresi kadar bekle
      this.fake = setTimeout(() => this.finish(), 2500);
      return;
    }
    this.gain = engine.ctx.createGain();
    this.gain.gain.value = opts.gain;
    this.gain.connect(opts.dest);
    this.start();
  }
  start() {
    const ctx = this.e.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.buf;
    s.playbackRate.value = this.opts.rate;
    s.detune.value = this.opts.detune;
    s.connect(this.gain);
    s.onended = () => {
      if (this.src === s && this.playing) this.finish();
    };
    s.start(0, this.offset);
    this.startedAt = ctx.currentTime;
    this.src = s;
    this.playing = true;
  }
  pause() {
    if (!this.playing) return;
    this.offset += (this.e.ctx.currentTime - this.startedAt) * this.opts.rate;
    this.playing = false;
    const s = this.src;
    this.src = null;
    try {
      s.stop();
    } catch {
      /* zaten durdu */
    }
  }
  resume() {
    if (this.playing || this.done || !this.buf) return;
    if (this.offset >= this.buf.duration - 0.02) return this.finish();
    this.start();
  }
  stop() {
    if (this.done) return;
    this.playing = false;
    try {
      this.src?.stop();
    } catch {
      /* zaten durdu */
    }
    this.finish();
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.playing = false;
    clearTimeout(this.fake);
    if (this.gain) setTimeout(() => this.gain.disconnect(), 200);
    this._resolve();
  }
}

// ======================================================================== müzik
const THEME = [
  [64, 1], [67, 1], [72, 1], [67, 1], [69, 1], [67, 1], [64, 2],
  [65, 1], [69, 1], [74, 1], [69, 1], [67, 4],
  [64, 1], [67, 1], [72, 1], [76, 1], [74, 1], [72, 1], [69, 2],
  [67, 1], [64, 1], [62, 1], [67, 1], [60, 4],
];
const BASS_ROOTS = [48, 45, 50, 43, 48, 41, 43, 48];
// "İyi ki doğdun" (Happy Birthday, kamu malı). null = es. 3/4 ölçü, ilk iki vuruş es + öncü notalar.
const BIRTHDAY = [
  [null, 2], [67, 0.75], [67, 0.25],
  [69, 1], [67, 1], [72, 1], [71, 2], [67, 0.75], [67, 0.25],
  [69, 1], [67, 1], [74, 1], [72, 2], [67, 0.75], [67, 0.25],
  [79, 1], [76, 1], [72, 1], [71, 1], [69, 1], [77, 0.75], [77, 0.25],
  [76, 1], [72, 1], [74, 1], [72, 3],
];
const SONGS = {
  theme: { notes: THEME, roots: BASS_ROOTS, meter: 4 },
  birthday: { notes: BIRTHDAY, roots: [48, 48, 43, 43, 48, 48, 41, 48, 48], meter: 3 },
};
const MINOR = { 4: 3, 9: 8, 11: 10 }; // Mi->Mib, La->Lab, Si->Sib (do minör)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Music {
  constructor(e) {
    this.e = e;
    this.out = e.ctx.createGain();
    this.out.connect(e.musicIn);
    this.timer = null;
  }

  /**
   * mode: 'jingle' (açılış, ksilofon + bas + davul), 'box' (müzik kutusu), 'creepy' (minör, yavaşlayan),
   *       'birthday' (İyi ki doğdun, ksilofon + bas, bir kez çalar).
   * o.song: 'theme' | 'birthday' (varsayılan moda göre), o.loop, o.tempo, o.detune, o.drift, o.minor, o.gain
   */
  play(mode, o = {}) {
    this.stop(0.05);
    const ctx = this.e.ctx;
    this.mode = mode;
    this.song = SONGS[o.song || (mode === 'birthday' ? 'birthday' : 'theme')];
    this.o = {
      tempo: mode === 'jingle' ? 152 : mode === 'creepy' ? 58 : mode === 'birthday' ? 104 : 96,
      loop: mode !== 'jingle' && mode !== 'birthday',
      minor: mode === 'creepy',
      detune: mode === 'creepy' ? -220 : 0,
      drift: mode === 'creepy' ? 0.012 : 0,
      gain: 0.32,
      ...o,
    };
    this.bus = ctx.createGain();
    this.bus.gain.value = this.o.gain;
    this.bus.connect(this.out);
    this.idx = 0;
    this.beat = 0;
    this.next = ctx.currentTime + 0.08;
    this.paused = false;
    this.playing = true;
    this.timer = setInterval(() => this.tick(), 40);
    this.tick();
    return new Promise((r) => (this._done = r));
  }

  tick() {
    if (this.paused || !this.playing) return;
    const ctx = this.e.ctx;
    const notes = this.song.notes;
    const meter = this.song.meter;
    while (this.next < ctx.currentTime + 0.25) {
      if (this.idx >= notes.length) {
        if (!this.o.loop) {
          const end = this.next + 0.8;
          setTimeout(() => this.finish(), (end - ctx.currentTime) * 1000);
          clearInterval(this.timer);
          this.timer = null;
          return;
        }
        this.idx = 0;
      }
      const [m0, beats] = notes[this.idx];
      const spb = (60 / this.o.tempo) * (1 + this.o.drift * this.beat);
      const dur = beats * spb;
      let m = m0;
      if (m != null && this.o.minor && MINOR[m % 12] !== undefined) m = m - (m % 12) + MINOR[m % 12];
      const det = this.o.detune + (this.o.minor ? rand(-18, 18) : 0);
      if (m != null) this.note(this.next, m, dur, det);
      // bas: her ölçünün başında (4/4: kök + beşli, 3/4: um-pa-pa)
      if (Math.abs(this.beat % meter) < 1e-6) {
        const bar = Math.floor(this.beat / meter) % this.song.roots.length;
        let r = this.song.roots[bar];
        if (this.o.minor && MINOR[r % 12] !== undefined) r = r - (r % 12) + MINOR[r % 12];
        if (meter === 4) {
          this.bass(this.next, r, spb * 2, det);
          this.bass(this.next + spb * 2, r + 7, spb * 2, det);
        } else {
          this.bass(this.next, r, spb, det);
          this.bass(this.next + spb, r + 7, spb * 0.8, det);
          this.bass(this.next + spb * 2, r + 7, spb * 0.8, det);
        }
      }
      if (this.mode === 'jingle') this.drums(this.next, beats, spb);
      this.next += dur;
      this.beat += beats;
      this.idx++;
    }
  }

  note(t, m, dur, det) {
    const e = this.e;
    const f = mtof(m) * Math.pow(2, det / 1200);
    if (this.mode === 'jingle' || this.mode === 'birthday') {
      e.tone(this.bus, t, f, 0.55, { gain: 0.5 });
      e.tone(this.bus, t, f * 3.93, 0.12, { gain: 0.12 });
      e.tone(this.bus, t, f * 2, Math.min(dur, 0.4), { type: 'triangle', gain: 0.08 });
    } else {
      e.tone(this.bus, t, f * 2, 1.8, { gain: 0.42, attack: 0.002 });
      e.tone(this.bus, t, f * 4.01, 0.9, { gain: 0.1, attack: 0.002 });
      e.tone(this.bus, t, f * 8.3, 0.25, { gain: 0.035, attack: 0.001 });
    }
  }

  bass(t, m, dur, det) {
    const f = mtof(m) * Math.pow(2, det / 1200);
    if (this.mode === 'jingle' || this.mode === 'birthday') this.e.tone(this.bus, t, f, dur * 0.9, { type: 'triangle', gain: 0.35, attack: 0.01 });
    else if (this.mode === 'creepy') this.e.tone(this.bus, t, f / 2, dur * 1.4, { type: 'sine', gain: 0.25, attack: 0.3 });
  }

  drums(t, beats, spb) {
    const e = this.e;
    for (let b = 0; b < beats; b++) {
      const tt = t + b * spb;
      e.tone(this.bus, tt, 120, 0.18, { gain: 0.35, endFreq: 45 });
      e.noiseBurst(this.bus, tt + spb / 2, 0.05, { type: 'highpass', freq: 7000, gain: 0.12 });
    }
  }

  pause() {
    if (!this.playing || this.paused) return;
    this.paused = true;
    this.bus.gain.setTargetAtTime(0, this.e.now, 0.03);
  }

  resume() {
    if (!this.playing || !this.paused) return;
    this.paused = false;
    this.bus.gain.setTargetAtTime(this.o.gain, this.e.now, 0.05);
    this.next = Math.max(this.next, this.e.now + 0.05);
    if (!this.timer && this.idx < this.song.notes.length) this.timer = setInterval(() => this.tick(), 40);
  }

  stop(fade = 0.6) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, this.e.now, fade / 3);
      setTimeout(() => b.disconnect(), fade * 1000 + 300);
    }
    this.finish();
  }

  finish() {
    this.playing = false;
    const d = this._done;
    this._done = null;
    d?.();
  }
}

// ======================================================================== ses efektleri
const SFX = {
  click(t) {
    this.tone(this.room, t, 1800, 0.03, { type: 'square', gain: 0.05 });
  },
  static(t, dur = 0.5, gain = 0.35) {
    this.noiseBurst(this.tvPan, t, dur, { freq: 3200, q: 0.4, gain, attack: 0.002 });
  },
  tvOn(t) {
    SFX.static.call(this, t, 0.35, 0.3);
    this.tone(this.tvPan, t, 15600, 1.2, { gain: 0.012 });
    this.tone(this.tvPan, t, 60, 0.4, { gain: 0.3, type: 'sine' });
  },
  tvOff(t) {
    this.tone(this.tvPan, t, 900, 0.25, { gain: 0.12, endFreq: 80 });
    this.noiseBurst(this.tvPan, t, 0.12, { type: 'lowpass', freq: 600, gain: 0.4 });
  },
  vcrInsert(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.2);
    this.noiseBurst(d, t, 0.09, { type: 'lowpass', freq: 900, gain: 0.7 });
    this.tone(d, t + 0.02, 1100, 0.04, { type: 'square', gain: 0.06 });
    this.tone(d, t + 0.25, 95, 1.3, { type: 'sawtooth', gain: 0.05, attack: 0.1 });
    this.noiseBurst(d, t + 1.05, 0.1, { type: 'lowpass', freq: 700, gain: 0.6 });
    this.tone(d, t + 1.07, 70, 0.12, { gain: 0.4 });
  },
  vcrEject(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.2);
    this.tone(d, t, 85, 0.9, { type: 'sawtooth', gain: 0.05, attack: 0.05 });
    this.noiseBurst(d, t + 0.8, 0.1, { type: 'lowpass', freq: 800, gain: 0.6 });
    this.tone(d, t + 0.82, 1300, 0.03, { type: 'square', gain: 0.05 });
  },
  vcrStuck(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.2);
    for (let i = 0; i < 3; i++) this.noiseBurst(d, t + i * 0.14, 0.06, { type: 'lowpass', freq: 600, gain: 0.5 });
    this.tone(d, t, 80, 0.5, { type: 'sawtooth', gain: 0.04 });
  },
  rewind(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.linearRampToValueAtTime(640, t + 1.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.1);
    o.connect(bp).connect(g).connect(this.tvPan);
    o.start(t);
    const n = this.noiseBurst(this.tvPan, t, 60, { freq: 5000, q: 0.5, gain: 0.05, attack: 0.05 });
    return () => {
      const now = this.now;
      g.gain.setTargetAtTime(0, now, 0.03);
      n.g.gain.cancelScheduledValues(now);
      n.g.gain.setTargetAtTime(0, now, 0.03);
      o.stop(now + 0.2);
      n.src.stop(now + 0.2);
    };
  },
  ffwd(t) {
    // ileri sarma: geri sarmadan daha tiz, hızla yükselen motor sesi
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(1100, t + 1.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.1);
    o.connect(bp).connect(g).connect(this.tvPan);
    o.start(t);
    const n = this.noiseBurst(this.tvPan, t, 60, { freq: 6500, q: 0.6, gain: 0.04, attack: 0.05 });
    return () => {
      const now = this.now;
      g.gain.setTargetAtTime(0, now, 0.03);
      n.g.gain.cancelScheduledValues(now);
      n.g.gain.setTargetAtTime(0, now, 0.03);
      o.stop(now + 0.2);
      n.src.stop(now + 0.2);
    };
  },
  warble(t) {
    this.tone(this.tvPan, t, 300, 0.9, { type: 'sine', gain: 0.15, endFreq: 140 });
    this.tone(this.tvPan, t, 303, 0.9, { type: 'sine', gain: 0.15, endFreq: 133 });
  },
  paper(t) {
    for (let i = 0; i < 3; i++) this.noiseBurst(this.room, t + i * 0.07 + rand(0, 0.03), 0.09, { freq: 2600 + rand(-600, 600), q: 0.8, gain: 0.18 });
  },
  pickup(t) {
    this.noiseBurst(this.room, t, 0.12, { freq: 1500, q: 0.5, gain: 0.2 });
    this.tone(this.room, t + 0.05, 220, 0.08, { type: 'triangle', gain: 0.1 });
  },
  beep(t, ok = true) {
    if (ok) this.tone(this.room, t, 1046, 0.08, { type: 'square', gain: 0.05 });
    else this.tone(this.room, t, 140, 0.35, { type: 'square', gain: 0.07 });
  },
  boxOpen(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z);
    [523, 1310, 2207, 3400].forEach((f, i) => this.tone(d, t + 0.05, f, 0.6 - i * 0.1, { gain: 0.08 }));
    this.noiseBurst(d, t, 0.05, { type: 'highpass', freq: 3000, gain: 0.4 });
    this.noiseBurst(d, t + 0.3, 0.25, { type: 'lowpass', freq: 400, gain: 0.3 });
  },
  boxClick(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.5);
    this.noiseBurst(d, t, 0.04, { type: 'highpass', freq: 2500, gain: 0.5 });
    this.tone(d, t + 0.1, 880, 0.2, { type: 'square', gain: 0.04 });
  },
  thud(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.6);
    this.tone(d, t, 75, 0.35, { gain: 0.6, endFreq: 40 });
    this.noiseBurst(d, t, 0.2, { type: 'lowpass', freq: 350, gain: 0.5 });
  },
  knock(t, pos, n = 3, gap = 0.42) {
    const d = this.at(pos.x, pos.y, pos.z, 0.5);
    for (let i = 0; i < n; i++) {
      const tt = t + i * gap + rand(-0.03, 0.03);
      this.noiseBurst(d, tt, 0.12, { type: 'lowpass', freq: 420, gain: 0.9, attack: 0.001 });
      this.tone(d, tt, 115, 0.16, { gain: 0.5, attack: 0.001 });
    }
  },
  // ---------------------------------------------------------------- 3-9. kaset efektleri
  /** Film makası: kesik + yapışkan bant */
  splice(t) {
    this.noiseBurst(this.tvIn, t, 0.03, { type: 'highpass', freq: 4000, gain: 0.6, attack: 0.001 });
    this.tone(this.tvIn, t, 2400, 0.02, { type: 'square', gain: 0.08 });
    this.noiseBurst(this.tvIn, t + 0.05, 0.25, { freq: 900, q: 0.6, gain: 0.15 });
  },
  /** Kumaş kayması (çarşaf), pos verilirse odada */
  clothSlide(t, pos, dur = 1.4) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.4) : this.room;
    const n = this.noiseBurst(d, t, dur, { type: 'bandpass', freq: 1200, q: 0.4, gain: 0.22, attack: 0.25 });
    n.f.frequency.setValueAtTime(700, t);
    n.f.frequency.linearRampToValueAtTime(1800, t + dur);
  },
  /** Ahşap sürtünmesi (mobilya itilir) */
  woodScrape(t, pos, dur = 1.6) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.5) : this.room;
    for (let i = 0; i < 10; i++) this.noiseBurst(d, t + (i * dur) / 10, dur / 8, { type: 'bandpass', freq: 320 + rand(-60, 60), q: 3, gain: 0.35 });
    this.tone(d, t, 70, dur, { type: 'sawtooth', gain: 0.05, attack: 0.1 });
  },
  /** Eski çift çalan telefon zili. Durdurmak için dönen fonksiyonu çağır. */
  phoneRing(t, pos, rings = 6) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.35) : this.room;
    const nodes = [];
    for (let r = 0; r < rings; r++) {
      const base = t + r * 3;
      for (const off of [0, 0.4]) {
        nodes.push(this.tone(d, base + off, 1150, 0.35, { type: 'square', gain: 0.07, attack: 0.002 }));
        nodes.push(this.tone(d, base + off, 1480, 0.35, { type: 'square', gain: 0.05, attack: 0.002 }));
        // zil titreşimi
        for (let k = 0; k < 7; k++) nodes.push(this.noiseBurst(d, base + off + k * 0.05, 0.03, { type: 'highpass', freq: 3000, gain: 0.08 }));
      }
    }
    return () => {
      const now = this.now;
      for (const n of nodes) {
        try {
          n.g.gain.cancelScheduledValues(now);
          n.g.gain.setTargetAtTime(0, now, 0.01);
        } catch {
          /* bitti */
        }
      }
    };
  },
  /** Döner kadranlı telefonda bir rakam çevirme (n = rakam, 0 = 10 tık) */
  rotaryDial(t, n = 5, dest) {
    const d = dest || this.tvIn;
    const clicks = n === 0 ? 10 : n;
    this.noiseBurst(d, t, 0.25, { type: 'bandpass', freq: 600, q: 1, gain: 0.15, attack: 0.05 });
    for (let i = 0; i < clicks; i++) this.noiseBurst(d, t + 0.3 + i * 0.07, 0.02, { type: 'highpass', freq: 2500, gain: 0.35, attack: 0.001 });
    return 0.3 + clicks * 0.07 + 0.1;
  },
  hangup(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.3) : this.tvIn;
    this.noiseBurst(d, t, 0.08, { type: 'lowpass', freq: 900, gain: 0.7, attack: 0.001 });
    this.tone(d, t + 0.01, 1300, 0.06, { type: 'triangle', gain: 0.06 });
  },
  phonePickup(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.3) : this.room;
    this.noiseBurst(d, t, 0.1, { type: 'lowpass', freq: 1100, gain: 0.5, attack: 0.002 });
    this.tone(d, t + 0.05, 1600, 0.05, { type: 'triangle', gain: 0.05 });
  },
  /** Çalıyor sesi (arayan taraf), n kez */
  ringback(t, n = 3, dest) {
    const d = dest || this.room;
    for (let i = 0; i < n; i++) this.tone(d, t + i * 4, 425, 1.5, { gain: 0.06, attack: 0.02 });
    return n * 4;
  },
  /** Meşgul sesi */
  busy(t, n = 6, dest) {
    const d = dest || this.room;
    for (let i = 0; i < n; i++) this.tone(d, t + i * 0.5, 425, 0.25, { gain: 0.07, attack: 0.01 });
    return n * 0.5;
  },
  pencil(t, dur = 1.2) {
    for (let i = 0; i < dur / 0.09; i++) this.noiseBurst(this.tvIn, t + i * 0.09 + rand(0, 0.03), 0.06, { freq: 4200 + rand(-800, 800), q: 1.5, gain: 0.12 });
  },
  talkShowSting(t) {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(this.tvIn, t + i * 0.09, f, 0.5, { gain: 0.16 }));
    this.noiseBurst(this.tvIn, t + 0.36, 0.4, { type: 'highpass', freq: 6000, gain: 0.1 });
  },
  match(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.3) : this.tvIn;
    this.noiseBurst(d, t, 0.15, { type: 'highpass', freq: 2500, gain: 0.5, attack: 0.002 });
    this.noiseBurst(d, t + 0.12, 0.6, { type: 'bandpass', freq: 1200, q: 0.5, gain: 0.15, attack: 0.05 });
  },
  /** Mum üfleme; pos verilirse odada (ör. sandalyenin arkasından) */
  blow(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.2) : this.tvIn;
    const n = this.noiseBurst(d, t, 0.9, { type: 'bandpass', freq: 800, q: 0.7, gain: 0.45, attack: 0.08 });
    n.f.frequency.setValueAtTime(1400, t);
    n.f.frequency.exponentialRampToValueAtTime(400, t + 0.9);
  },
  whoosh(t, dest) {
    const n = this.noiseBurst(dest || this.tvIn, t, 0.7, { type: 'bandpass', freq: 400, q: 0.8, gain: 0.35, attack: 0.2 });
    n.f.frequency.setValueAtTime(300, t);
    n.f.frequency.exponentialRampToValueAtTime(2600, t + 0.6);
  },
  /** Bant kopması / sıkışması */
  tapeSnap(t) {
    this.tone(this.tvIn, t, 900, 0.4, { type: 'sawtooth', gain: 0.1, endFreq: 60 });
    this.noiseBurst(this.tvIn, t + 0.05, 0.3, { type: 'lowpass', freq: 800, gain: 0.5 });
  },
  /** Kapı kolu tıkırdatması (pos: kapı) */
  handle(t, pos, n = 3) {
    const d = this.at(pos.x, pos.y, pos.z, 0.45);
    for (let i = 0; i < n; i++) {
      this.noiseBurst(d, t + i * 0.22, 0.05, { type: 'highpass', freq: 2200, gain: 0.45, attack: 0.001 });
      this.tone(d, t + i * 0.22 + 0.02, 640, 0.08, { type: 'square', gain: 0.03 });
    }
  },
  /** Döşeme tahtası gıcırtısı (pos'ta) */
  footCreak(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.45);
    this.tone(d, t, 210 + rand(-30, 30), 0.5, { type: 'sawtooth', gain: 0.06, endFreq: 150, attack: 0.05 });
    this.noiseBurst(d, t, 0.3, { type: 'bandpass', freq: 500, q: 4, gain: 0.25 });
    this.noiseBurst(d, t + 0.02, 0.12, { type: 'lowpass', freq: 250, gain: 0.4 });
  },
  /** Sandık kapağı açılması (pos'ta) */
  chestLid(t, pos) {
    SFX.creak.call(this, t, pos, 1.4);
    this.noiseBurst(this.at(pos.x, pos.y, pos.z, 0.4), t + 1.35, 0.15, { type: 'lowpass', freq: 400, gain: 0.6 });
  },
  /** Dinleyicinin kulağına nefes (pos: dinleyicinin hemen yanı) */
  breath(t, pos, n = 2) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.05) : this.room;
    for (let i = 0; i < n; i++) {
      const tt = t + i * 1.6;
      this.noiseBurst(d, tt, 0.9, { type: 'bandpass', freq: 900, q: 0.6, gain: 0.25, attack: 0.35 });
      this.noiseBurst(d, tt + 1.0, 0.5, { type: 'bandpass', freq: 600, q: 0.6, gain: 0.12, attack: 0.1 });
    }
  },
  /** Video kafası uğultusu (sürekli). Durdurmak için dönen fonksiyonu çağır. */
  deckHum(t, gain = 0.03) {
    return loop.call(this, this.tvIn, gain, (ctx, out) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 50;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      o.connect(f).connect(out);
      o.start(t);
      return [o];
    });
  },
  clap(t) {
    this.noiseBurst(this.tvIn, t, 0.08, { type: 'highpass', freq: 1500, gain: 0.9, attack: 0.001 });
    this.tone(this.tvIn, t, 180, 0.06, { gain: 0.3, attack: 0.001 });
  },
  deckClunk(t) {
    this.noiseBurst(this.tvIn, t, 0.08, { type: 'lowpass', freq: 700, gain: 0.7, attack: 0.001 });
    this.tone(this.tvIn, t, 90, 0.12, { gain: 0.35, attack: 0.001 });
  },
  /** Kafada bant arama sesi (hızlı ileri/geri) */
  tapeSearch(t, dur = 1.2) {
    this.tone(this.tvIn, t, 500, dur, { type: 'sawtooth', gain: 0.04, endFreq: 1400, attack: 0.05 });
    this.noiseBurst(this.tvIn, t, dur, { freq: 5000, q: 0.5, gain: 0.05, attack: 0.05 });
  },
  typewriter(t, n = 8) {
    for (let i = 0; i < n; i++) this.noiseBurst(this.tvIn, t + i * 0.11 + rand(0, 0.04), 0.03, { type: 'highpass', freq: 2000, gain: 0.45, attack: 0.001 });
    this.tone(this.tvIn, t + n * 0.12, 1800, 0.25, { gain: 0.05 });
  },
  leaderBeep(t) {
    this.tone(this.tvIn, t, 1000, 0.08, { gain: 0.15, attack: 0.002 });
  },
  /** Kuş cıvıltısı döngüsü (kamera kaydı arka planı) */
  birds(t, gain = 0.06) {
    let alive = true;
    const out = this.ctx.createGain();
    out.gain.value = gain;
    out.connect(this.tvIn);
    const chirp = () => {
      if (!alive) return;
      const tt = this.now + 0.05;
      const f = 2600 + rand(-600, 900);
      for (let i = 0; i < 2 + Math.floor(rand(0, 3)); i++) this.tone(out, tt + i * 0.09, f, 0.07, { gain: 0.4, endFreq: f * 1.25, attack: 0.005 });
      setTimeout(chirp, rand(250, 1400));
    };
    chirp();
    return () => {
      alive = false;
      out.gain.setTargetAtTime(0, this.now, 0.02);
    };
  },
  /** Rüzgâr döngüsü (TV'den) */
  wind(t, gain = 0.05) {
    return loop.call(this, this.tvIn, gain, (ctx, out) => {
      const src = this.loopNoise();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      src.connect(f).connect(out);
      return [src];
    });
  },
  /** Uzak trafik uğultusu (TV'den) */
  traffic(t, gain = 0.035) {
    return loop.call(this, this.tvIn, gain, (ctx, out) => {
      const src = this.loopNoise();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      src.connect(f).connect(out);
      return [src];
    });
  },
  /** Programın jenerik melodisi, uzaktan ve yavaşça ıslıkla (pos verilirse odada) */
  whistle(t, pos, speed = 0.6) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.6) : this.tvIn;
    const notes = [64, 67, 72, 67, 69, 67, 64, 65, 69, 74, 69, 67];
    let tt = t;
    for (const m of notes) {
      const f = 440 * Math.pow(2, (m + 12 - 69) / 12);
      const dur = 0.42 / speed;
      this.tone(d, tt, f, dur, { type: 'sine', gain: 0.07, attack: 0.06 });
      this.tone(d, tt, f * 1.004, dur, { type: 'sine', gain: 0.03, attack: 0.08 });
      tt += dur;
    }
    return tt - t;
  },
  creakTv(t) {
    SFX.creak.call(this, t, null, 1.6, this.tvIn);
  },
  cartoonPop(t) {
    this.tone(this.tvIn, t, 380, 0.18, { type: 'sine', gain: 0.25, endFreq: 980 });
    this.tone(this.tvIn, t + 0.05, 1200, 0.1, { type: 'triangle', gain: 0.08 });
  },
  creak(t, pos, dur = 2.6, dest = null) {
    const ctx = this.ctx;
    const d = dest || this.at(pos.x, pos.y, pos.z, 0.5);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.linearRampToValueAtTime(170, t + dur * 0.6);
    o.frequency.linearRampToValueAtTime(130, t + dur);
    const am = ctx.createOscillator();
    am.type = 'square';
    am.frequency.value = 17;
    const amg = ctx.createGain();
    amg.gain.value = 0.5;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 950;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.3);
    g.gain.setValueAtTime(0.25, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const vca = ctx.createGain();
    vca.gain.value = 0.5;
    am.connect(amg).connect(vca.gain);
    o.connect(bp).connect(vca).connect(g).connect(d);
    o.start(t);
    am.start(t);
    o.stop(t + dur + 0.1);
    am.stop(t + dur + 0.1);
  },
  meowPain(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(980, t + 0.35);
    o.frequency.linearRampToValueAtTime(1150, t + 0.6);
    o.frequency.exponentialRampToValueAtTime(300, t + 1.25);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1300, t + 0.4);
    f1.frequency.linearRampToValueAtTime(800, t + 1.2);
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 6;
    f2.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.06);
    g.gain.setValueAtTime(0.9, t + 1.1);
    g.gain.linearRampToValueAtTime(0, t + 1.28);
    o.connect(f1).connect(g);
    o.connect(f2).connect(g);
    g.connect(this.tvIn);
    o.start(t);
    o.stop(t + 1.3);
  },
  sting(t, dest) {
    const out = dest || this.tvIn;
    [55, 58.3, 77.8, 116.5, 233].forEach((f) => this.tone(out, t, f, 2.4, { type: 'sawtooth', gain: 0.08, attack: 0.01 }));
    this.noiseBurst(out, t, 1.8, { type: 'lowpass', freq: 1200, gain: 0.5, attack: 0.005 });
    this.tone(out, t, 90, 1.2, { gain: 0.6, endFreq: 30 });
  },
  boom(t) {
    this.tone(this.room, t, 60, 1.6, { gain: 0.7, endFreq: 25 });
    this.noiseBurst(this.room, t, 1.2, { type: 'lowpass', freq: 220, gain: 0.6 });
  },
  heartbeat(t, n = 6, gap = 0.85) {
    for (let i = 0; i < n; i++) {
      const tt = t + i * gap;
      this.tone(this.room, tt, 55, 0.18, { gain: 0.5 });
      this.tone(this.room, tt + 0.22, 48, 0.2, { gain: 0.38 });
    }
  },
  bsod(t) {
    this.tone(this.tvPan, t, 880, 0.3, { type: 'square', gain: 0.08 });
    this.tone(this.tvPan, t + 0.35, 660, 0.45, { type: 'square', gain: 0.08 });
  },
  pop(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.3) : this.room;
    this.noiseBurst(d, t, 0.05, { type: 'highpass', freq: 1500, gain: 0.35 });
  },
  glitch(t, dur = 0.4) {
    for (let i = 0; i < 6; i++) {
      this.tone(this.tvIn, t + i * (dur / 6), rand(200, 2400), dur / 7, { type: 'square', gain: 0.05 });
    }
    this.noiseBurst(this.tvIn, t, dur, { freq: 1800, q: 0.3, gain: 0.25 });
  },
};

/** Odadaki sürekli sesler: rüzgâr, ampul vızıltısı, uğultu. */
export class Ambience {
  constructor(e) {
    this.e = e;
    const ctx = e.ctx;
    // rüzgâr
    const wind = e.loopNoise();
    this.windLp = ctx.createBiquadFilter();
    this.windLp.type = 'lowpass';
    this.windLp.frequency.value = 400;
    this.windLp.Q.value = 3;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    wind.connect(this.windLp).connect(this.windGain).connect(e.at(1.2, 1.6, -2.6, 0.2));
    // ampul vızıltısı
    const bz = ctx.createOscillator();
    bz.type = 'sawtooth';
    bz.frequency.value = 100;
    const bzf = ctx.createBiquadFilter();
    bzf.type = 'bandpass';
    bzf.frequency.value = 300;
    bzf.Q.value = 3;
    this.buzzGain = ctx.createGain();
    this.buzzGain.gain.value = 0.006;
    this.buzzPan = e.makePanner(0, 2.2, -0.3);
    this.buzzPan.connect(e.master);
    bz.connect(bzf).connect(this.buzzGain).connect(this.buzzPan);
    bz.start();
    // korku uğultusu
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 180;
    [41, 41.6, 61.7].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(dl);
      o.start();
    });
    dl.connect(this.droneGain).connect(e.master);
  }
  update(time, bulb) {
    const e = this.e;
    this.windLp.frequency.setTargetAtTime(380 + Math.sin(time * 0.31) * 160 + Math.sin(time * 0.87) * 90, e.now, 0.2);
    this.buzzGain.gain.setTargetAtTime(0.002 + bulb * 0.007, e.now, 0.02);
  }
  setDrone(v, ramp = 3) {
    this.droneGain.gain.setTargetAtTime(v, this.e.now, ramp / 3);
  }
  setWind(v) {
    this.windGain.gain.setTargetAtTime(v, this.e.now, 1);
  }
}

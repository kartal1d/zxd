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
  playVoice(id, opts = {}) {
    const buf = this.buffers.get(id);
    const h = new VoiceHandle(this, buf, {
      rate: (opts.rate ?? 1) * this.fx.rate,
      gain: opts.gain ?? 1,
      detune: opts.detune ?? 0,
      dest: opts.dest ?? this.voiceIn,
    });
    this.voices.add(h);
    h.promise.then(() => this.voices.delete(h));
    return h;
  }

  pauseVoices() {
    for (const v of this.voices) v.pause();
  }
  resumeVoices() {
    for (const v of this.voices) v.resume();
  }
  stopVoices() {
    for (const v of [...this.voices]) v.stop();
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
   * mode: 'jingle' (açılış, ksilofon + bas + davul), 'box' (müzik kutusu), 'creepy' (minör, yavaşlayan)
   */
  play(mode, o = {}) {
    this.stop(0.05);
    const ctx = this.e.ctx;
    this.mode = mode;
    this.o = {
      tempo: mode === 'jingle' ? 152 : mode === 'creepy' ? 58 : 96,
      loop: mode !== 'jingle',
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
    while (this.next < ctx.currentTime + 0.25) {
      if (this.idx >= THEME.length) {
        if (!this.o.loop) {
          const end = this.next + 0.8;
          setTimeout(() => this.finish(), (end - ctx.currentTime) * 1000);
          clearInterval(this.timer);
          this.timer = null;
          return;
        }
        this.idx = 0;
      }
      const [m0, beats] = THEME[this.idx];
      const spb = (60 / this.o.tempo) * (1 + this.o.drift * this.beat);
      const dur = beats * spb;
      let m = m0;
      if (this.o.minor && MINOR[m % 12] !== undefined) m = m - (m % 12) + MINOR[m % 12];
      const det = this.o.detune + (this.o.minor ? rand(-18, 18) : 0);
      this.note(this.next, m, dur, det);
      // bas: her ölçünün başında
      if (this.beat % 4 === 0) {
        const bar = Math.floor(this.beat / 4) % 8;
        let r = BASS_ROOTS[bar];
        if (this.o.minor && MINOR[r % 12] !== undefined) r = r - (r % 12) + MINOR[r % 12];
        this.bass(this.next, r, spb * 2, det);
        this.bass(this.next + spb * 2, r + 7, spb * 2, det);
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
    if (this.mode === 'jingle') {
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
    if (this.mode === 'jingle') this.e.tone(this.bus, t, f, dur * 0.9, { type: 'triangle', gain: 0.35, attack: 0.01 });
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
    if (!this.timer && this.idx < THEME.length) this.timer = setInterval(() => this.tick(), 40);
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
  knock(t, pos, n = 3) {
    const d = this.at(pos.x, pos.y, pos.z, 0.5);
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.42 + rand(-0.03, 0.03);
      this.noiseBurst(d, tt, 0.12, { type: 'lowpass', freq: 420, gain: 0.9, attack: 0.001 });
      this.tone(d, tt, 115, 0.16, { gain: 0.5, attack: 0.001 });
    }
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

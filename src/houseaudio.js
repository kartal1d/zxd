// Alt kat ve bahçe sesleri: ayak sesleri, kapılar, damlalar, cırcır böcekleri ve oda başına ortam döngüleri.
// Efektler AudioEngine.sfx() üzerinden çağrılır (engine.extraSfx); HouseAmbience oda değişince sesleri yumuşakça geçirir.
import { rand } from './util.js';

/** 'this' = AudioEngine (SFX ile aynı imza: (t, ...args)) */
export const HOUSE_SFX = {
  /** Ayak sesi: surface 'wood' | 'stair' | 'tile' | 'grass' */
  step(t, pos, surface = 'wood', run = false, gain = 0.5) {
    const d = this.at(pos.x, pos.y, pos.z, surface === 'grass' ? 0.05 : 0.25);
    const k = gain * (run ? 1.15 : 1);
    if (surface === 'grass') {
      this.noiseBurst(d, t, 0.16, { type: 'bandpass', freq: 2600 + rand(-500, 500), q: 0.7, gain: 0.22 * k, attack: 0.02 });
      this.noiseBurst(d, t + 0.05, 0.12, { type: 'lowpass', freq: 500, gain: 0.18 * k });
      return;
    }
    if (surface === 'tile') {
      this.noiseBurst(d, t, 0.05, { type: 'highpass', freq: 2200, gain: 0.32 * k, attack: 0.001 });
      this.tone(d, t, 260 + rand(-30, 30), 0.07, { type: 'triangle', gain: 0.12 * k, attack: 0.001 });
      this.noiseBurst(d, t + 0.06, 0.05, { type: 'bandpass', freq: 1400, gain: 0.12 * k });
      return;
    }
    // ahşap
    this.tone(d, t, 105 + rand(-12, 12), 0.13, { gain: 0.45 * k, endFreq: 60, attack: 0.002 });
    this.noiseBurst(d, t, 0.09, { type: 'bandpass', freq: 850 + rand(-150, 150), q: 1.1, gain: 0.28 * k, attack: 0.002 });
    if (surface === 'stair' && Math.random() < 1 / 3) {
      this.tone(d, t + 0.05, 230 + rand(-40, 40), 0.45, { type: 'sawtooth', gain: 0.04 * k, endFreq: 160, attack: 0.05 });
      this.noiseBurst(d, t + 0.05, 0.3, { type: 'bandpass', freq: 520, q: 4, gain: 0.18 * k });
    }
  },
  /** Kapı çarpması: derin vuruş + ahşap çatırtı + menteşe/kilit tıkırtısı */
  doorSlam(t, pos, gain = 1) {
    const d = this.at(pos.x, pos.y, pos.z, 0.7);
    this.tone(d, t, 62, 0.9, { gain: 0.95 * gain, endFreq: 28, attack: 0.001 });
    this.noiseBurst(d, t, 0.5, { type: 'lowpass', freq: 380, gain: 0.95 * gain, attack: 0.001 });
    this.noiseBurst(d, t, 0.09, { type: 'bandpass', freq: 1100, q: 0.9, gain: 0.8 * gain, attack: 0.001 });
    for (let i = 0; i < 5; i++) this.noiseBurst(d, t + 0.08 + i * 0.05 + rand(0, 0.02), 0.03, { type: 'highpass', freq: 2600, gain: 0.35 * gain * (1 - i / 6), attack: 0.001 });
    this.noiseBurst(this.room, t, 0.6, { type: 'lowpass', freq: 120, gain: 0.5 * gain });
  },
  /** Mandal oturması */
  latch(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.4);
    this.noiseBurst(d, t, 0.03, { type: 'highpass', freq: 3000, gain: 0.45, attack: 0.001 });
    this.tone(d, t + 0.01, 1900, 0.05, { type: 'square', gain: 0.03 });
    this.noiseBurst(d, t + 0.08, 0.05, { type: 'lowpass', freq: 700, gain: 0.4, attack: 0.001 });
  },
  /** Anahtar kilitte döner */
  keyTurn(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.35);
    this.noiseBurst(d, t, 0.25, { type: 'bandpass', freq: 3200, q: 2, gain: 0.12, attack: 0.04 });
    this.noiseBurst(d, t + 0.28, 0.04, { type: 'highpass', freq: 2400, gain: 0.55, attack: 0.001 });
    this.tone(d, t + 0.29, 1450, 0.06, { type: 'square', gain: 0.04 });
    this.noiseBurst(d, t + 0.45, 0.06, { type: 'lowpass', freq: 900, gain: 0.5, attack: 0.001 });
  },
  /** Dikişli Tonton'un küçük, lastik ciyaklaması */
  squeak(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.3);
    const o = this.tone(d, t, 900, 0.32, { type: 'triangle', gain: 0.14, attack: 0.02 });
    o.o.frequency.setValueAtTime(900, t);
    o.o.frequency.linearRampToValueAtTime(1650, t + 0.12);
    o.o.frequency.linearRampToValueAtTime(1100, t + 0.3);
    this.noiseBurst(d, t, 0.25, { type: 'bandpass', freq: 1500, q: 3, gain: 0.05 });
  },
  /** Konumlu, sürekli televizyon karıncası. Durdurmak için dönen fonksiyonu çağır. */
  staticAt(t, pos, dur = 60, gain = 0.5) {
    const d = this.at(pos.x, pos.y, pos.z, 0.3);
    const n = this.noiseBurst(d, t, dur, { freq: 3000, q: 0.35, gain, attack: 0.02 });
    return () => {
      const now = this.now;
      try {
        n.g.gain.cancelScheduledValues(now);
        n.g.gain.setTargetAtTime(0, now, 0.02);
        n.src.stop(now + 0.15);
      } catch {
        /* bitti */
      }
    };
  },
  /** Su damlası */
  drip(t, pos, gain = 0.12) {
    const d = this.at(pos.x, pos.y, pos.z, 0.6);
    const f = 1500 + rand(-250, 400);
    this.tone(d, t, f, 0.09, { gain, endFreq: f * 0.55, attack: 0.002 });
    this.tone(d, t + 0.015, f * 2.1, 0.05, { gain: gain * 0.3, attack: 0.002 });
  },
  /** Salıncak zinciri gıcırtısı */
  swingCreak(t, pos, gain = 0.08) {
    const d = this.at(pos.x, pos.y, pos.z, 0.2);
    const o = this.tone(d, t, 640 + rand(-60, 60), 0.55, { type: 'sawtooth', gain, attack: 0.08 });
    o.o.frequency.linearRampToValueAtTime(820, t + 0.5);
    this.noiseBurst(d, t, 0.45, { type: 'bandpass', freq: 1800, q: 6, gain: gain * 1.5, attack: 0.06 });
  },
  /** Kapının ardında yavaşlatılmış jenerik: müzik kutusu. Durdurmak için dönen fonksiyonu çağır. */
  musicBox(t, pos, speed = 0.55, loops = 3) {
    const d = this.at(pos.x, pos.y, pos.z, 0.5);
    const out = this.ctx.createGain();
    out.gain.value = 1;
    out.connect(d);
    const notes = [64, 67, 72, 67, 69, 67, 64, 65, 69, 74, 69, 67];
    let tt = t;
    for (let l = 0; l < loops; l++)
      for (const m of notes) {
        const f = 440 * Math.pow(2, (m + 12 - 69) / 12);
        const dur = 0.36 / speed;
        this.tone(out, tt, f, dur * 1.6, { type: 'sine', gain: 0.05, attack: 0.002 });
        this.tone(out, tt, f * 3.01, dur * 0.6, { type: 'sine', gain: 0.012, attack: 0.002 });
        tt += dur * (1 + rand(0, 0.12));
      }
    return () => {
      out.gain.setTargetAtTime(0, this.now, 0.03);
      setTimeout(() => out.disconnect(), 300);
    };
  },
  /** Duvarın içinde boru vuruşu */
  pipeKnock(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.6);
    for (let i = 0; i < 2 + Math.floor(rand(0, 2)); i++) {
      const tt = t + i * rand(0.12, 0.3);
      this.tone(d, tt, 190 + rand(-20, 30), 0.35, { type: 'triangle', gain: 0.16, endFreq: 150, attack: 0.001 });
      this.noiseBurst(d, tt, 0.06, { type: 'bandpass', freq: 900, q: 2, gain: 0.25, attack: 0.001 });
    }
  },
  /** Video kaydedici mekanizması (konumlu) */
  deckClunkAt(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.3);
    this.noiseBurst(d, t, 0.08, { type: 'lowpass', freq: 700, gain: 0.7, attack: 0.001 });
    this.tone(d, t, 90, 0.12, { gain: 0.35, attack: 0.001 });
    this.tone(d, t + 0.15, 75, 0.6, { type: 'sawtooth', gain: 0.03, attack: 0.08 });
  },
  /** Konumlu tv açılışı (alt kattaki televizyon, monitörler) */
  tvOnAt(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.25);
    this.noiseBurst(d, t, 0.3, { freq: 3200, q: 0.4, gain: 0.25, attack: 0.002 });
    this.tone(d, t, 15600, 1.0, { gain: 0.01 });
    this.tone(d, t, 60, 0.35, { gain: 0.3 });
  },
  tvOffAt(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.25);
    this.tone(d, t, 900, 0.25, { gain: 0.12, endFreq: 80 });
    this.noiseBurst(d, t, 0.12, { type: 'lowpass', freq: 600, gain: 0.4 });
  },
  /** Uzaktan köpek havlaması */
  dogBark(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.5);
    for (let i = 0; i < 2; i++) {
      const tt = t + i * 0.42;
      const o = this.tone(d, tt, 520, 0.2, { type: 'sawtooth', gain: 0.05, endFreq: 260, attack: 0.01 });
      o.o.detune.value = rand(-40, 40);
      this.noiseBurst(d, tt, 0.16, { type: 'bandpass', freq: 900, q: 1.5, gain: 0.08 });
    }
  },
  /** Kuru dal kırılması */
  twigSnap(t, pos) {
    const d = this.at(pos.x, pos.y, pos.z, 0.3);
    this.noiseBurst(d, t, 0.04, { type: 'highpass', freq: 1800, gain: 0.7, attack: 0.0005 });
    this.noiseBurst(d, t + 0.05, 0.03, { type: 'highpass', freq: 2400, gain: 0.4, attack: 0.0005 });
    this.tone(d, t, 320, 0.05, { type: 'square', gain: 0.05, attack: 0.0005 });
  },
  /** Telesekreterin bip sesi */
  machineBeep(t, pos) {
    const d = pos ? this.at(pos.x, pos.y, pos.z, 0.2) : this.room;
    this.tone(d, t, 1000, 0.32, { type: 'sine', gain: 0.09, attack: 0.005 });
  },
  /** Telesekreter bandının cızırtısı (dur saniye) */
  machineHiss(t, pos, dur = 4) {
    const d = this.at(pos.x, pos.y, pos.z, 0.15);
    this.noiseBurst(d, t, dur, { type: 'bandpass', freq: 3600, q: 0.5, gain: 0.05, attack: 0.1 });
    this.tone(d, t, 55, dur, { type: 'sawtooth', gain: 0.008, attack: 0.1 });
  },
};

/** Ortam döngüsü yardımcıları */
function noiseLoop(e, filterType, freq, q, dest) {
  const src = e.loopNoise();
  const f = e.ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = e.ctx.createGain();
  g.gain.value = 0;
  src.connect(f).connect(g).connect(dest);
  return { src, f, g };
}

function panner(e, x, y, z, wet = 0.25) {
  const p = e.makePanner(x, y, z);
  p.connect(e.master);
  if (wet > 0) {
    const s = e.ctx.createGain();
    s.gain.value = wet;
    p.connect(s).connect(e.reverb);
  }
  return p;
}

/**
 * Alt kat ve bahçenin sürekli sesleri. Döngüler ilk inişte kurulur (tavanda kalan oyuncu için CPU harcanmaz).
 * setZone(z) her döngünün kazancını 1 sn'de yeni odaya göre ayarlar.
 */
export class HouseAmbience {
  constructor(e, pts) {
    this.e = e;
    this.pts = pts; // { clock, fridge, sink, tub, pipe, desk, salonTv, stairFoot }
    this.zone = 'cati';
    this.built = false;
    this.outdoor = false;
    this.deckOff = false;
    this.whineOff = false;
    this.nextTick = 0;
    this.nextDrip = 0;
    this.nextTub = 0;
    this.nextPipe = 0;
    this.gardenVisited = false;
  }

  build() {
    if (this.built || !this.e.ctx) return;
    this.built = true;
    const e = this.e;
    const ctx = e.ctx;
    const P = this.pts;
    this.clockPan = panner(e, P.clock.x, P.clock.y, P.clock.z, 0.3);
    this.clockGain = ctx.createGain();
    this.clockGain.gain.value = 0;
    this.clockGain.connect(this.clockPan);
    // buzdolabı uğultusu
    this.fridgePan = panner(e, P.fridge.x, P.fridge.y, P.fridge.z, 0.2);
    this.fridge = ctx.createGain();
    this.fridge.gain.value = 0;
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 420;
    fl.connect(this.fridge).connect(this.fridgePan);
    for (const [f, a] of [[60, 0.5], [120, 0.35], [180, 0.15]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = a;
      o.connect(g).connect(fl);
      o.start();
    }
    // cırcır böcekleri: iki ses, yavaş darbelerle açılıp kapanan tiz titreşim
    this.cricketLp = ctx.createBiquadFilter();
    this.cricketLp.type = 'lowpass';
    this.cricketLp.frequency.value = 12000;
    this.crickets = ctx.createGain();
    this.crickets.gain.value = 0;
    this.cricketLp.connect(this.crickets).connect(e.master);
    for (const [f, trill, pulse, pan] of [[4300, 32, 1.3, -0.6], [4720, 27, 0.9, 0.7]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const am = ctx.createGain();
      am.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = trill;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      const env = ctx.createGain();
      env.gain.value = 0;
      const lfo2 = ctx.createOscillator();
      lfo2.type = 'square';
      lfo2.frequency.value = pulse;
      const lfo2G = ctx.createGain();
      lfo2G.gain.value = 0.5;
      lfo.connect(lfoG).connect(am.gain);
      lfo2.connect(lfo2G).connect(env.gain);
      const st = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (st.pan) st.pan.value = pan;
      o.connect(am).connect(env).connect(st).connect(this.cricketLp);
      // tepe değeri 0.5'lik kare dalga + 0.5 sabit: 0..1
      const c1 = ctx.createConstantSource ? ctx.createConstantSource() : null;
      if (c1) {
        c1.offset.value = 0.5;
        c1.connect(am.gain);
        const c2 = ctx.createConstantSource();
        c2.offset.value = 0.5;
        c2.connect(env.gain);
        c1.start();
        c2.start();
      }
      for (const n of [o, lfo, lfo2]) n.start();
    }
    // çam rüzgârı
    this.pineWind = noiseLoop(e, 'lowpass', 520, 1.2, e.master);
    // merdiven dibinden gelen hava akımı
    this.draughtPan = panner(e, P.stairFoot.x, P.stairFoot.y, P.stairFoot.z, 0.2);
    this.draught = noiseLoop(e, 'bandpass', 420, 0.8, this.draughtPan);
    // montaj: fan ve video kafası uğultusu
    this.deskPan = panner(e, P.desk.x, P.desk.y, P.desk.z, 0.2);
    this.fan = noiseLoop(e, 'bandpass', 300, 1.2, this.deskPan);
    this.deck = ctx.createGain();
    this.deck.gain.value = 0;
    const dlo = ctx.createOscillator();
    dlo.type = 'sawtooth';
    dlo.frequency.value = 50;
    const dlf = ctx.createBiquadFilter();
    dlf.type = 'lowpass';
    dlf.frequency.value = 260;
    dlo.connect(dlf).connect(this.deck).connect(this.deskPan);
    dlo.start();
    // salondaki televizyonun tiz vınlaması
    this.whinePan = panner(e, P.salonTv.x, P.salonTv.y, P.salonTv.z, 0);
    this.whine = ctx.createGain();
    this.whine.gain.value = 0;
    const wo = ctx.createOscillator();
    wo.frequency.value = 7800;
    wo.connect(this.whine).connect(this.whinePan);
    wo.start();
  }

  ramp(node, v, sec = 1) {
    if (!node) return;
    const p = node.gain || node.g?.gain;
    p.setTargetAtTime(v, this.e.now, sec / 3);
  }

  setZone(z) {
    this.zone = z;
    if (z === 'cati') {
      if (!this.built) return;
    } else this.build();
    if (!this.built) return;
    const ground = ['giris', 'hol', 'salon', 'montaj', 'mutfak', 'banyo'].includes(z);
    const g = {
      clock: { giris: 0.6, hol: 0.45, salon: 0.18, merdiven: 0.2, sahanlik: 0.1, mutfak: 0.12, montaj: 0.1, banyo: 0.1 }[z] || 0,
      fridge: { mutfak: 0.03, hol: 0.008, giris: 0.004, montaj: 0.004 }[z] || 0,
      crickets: z === 'bahce' ? 0.05 : z === 'mutfak' ? 0.05 * 0.3 * (this.outdoor ? 2 : 1) : 0,
      wind: z === 'bahce' ? 0.06 : 0,
      draught: z === 'sahanlik' || z === 'merdiven' ? 0.02 : ['giris', 'hol'].includes(z) ? 0.01 : 0,
      fan: z === 'montaj' ? 0.012 : 0,
      deck: z === 'montaj' && !this.deckOff ? 0.02 : 0,
      whine: z === 'salon' && !this.whineOff ? 0.004 : 0,
    };
    this.ramp(this.clockGain, g.clock);
    this.ramp(this.fridge, g.fridge);
    this.ramp(this.crickets, g.crickets);
    this.cricketLp.frequency.setTargetAtTime(z === 'bahce' ? 12000 : 700, this.e.now, 0.3);
    this.ramp(this.pineWind.g, g.wind);
    this.ramp(this.draught.g, g.draught);
    this.ramp(this.fan.g, g.fan);
    this.ramp(this.deck, g.deck);
    this.ramp(this.whine, g.whine);
    this.ground = ground;
    if (z === 'bahce' && !this.gardenVisited) {
      this.gardenVisited = true;
      setTimeout(() => this.e.sfx('dogBark', { x: -14, y: -2, z: -30 }), 2500);
    }
  }

  /** Arka kapı açıkken mutfaktaki cırcır böcekleri iki kat */
  setOutdoor(open) {
    this.outdoor = open;
    if (this.zone === 'mutfak') this.setZone('mutfak');
  }

  /** Bahçe sesleri (S6 sessizliği): v 0..1 çarpan */
  muteGarden(mute, sec = 0.5) {
    if (!this.built) return;
    const z = this.zone;
    this.ramp(this.crickets, mute ? 0 : z === 'bahce' ? 0.05 : 0, sec);
    this.ramp(this.pineWind.g, mute ? 0.01 : z === 'bahce' ? 0.06 : 0, sec);
  }

  setDeck(on) {
    this.deckOff = !on;
    if (this.zone === 'montaj') this.setZone('montaj');
  }
  setWhine(on) {
    this.whineOff = !on;
    if (this.zone === 'salon') this.setZone('salon');
  }

  /** zamanlı olaylar: saat tıkırtısı, damlalar, boru vuruşu */
  update(clock) {
    if (!this.built || this.zone === 'cati') return;
    const e = this.e;
    const z = this.zone;
    if (clock >= this.nextTick) {
      this.nextTick = Math.floor(clock) + 1;
      const t = e.now;
      e.noiseBurst(this.clockGain, t, 0.025, { type: 'highpass', freq: 3500, gain: 0.5, attack: 0.001 });
      e.tone(this.clockGain, t, (Math.floor(clock) % 2 ? 2300 : 2000), 0.02, { type: 'square', gain: 0.05, attack: 0.001 });
    }
    if (z === 'mutfak' && clock >= this.nextDrip) {
      this.nextDrip = clock + 1.7;
      e.sfx('drip', this.pts.sink, 0.08);
    }
    if (z === 'banyo') {
      if (clock >= this.nextTub) {
        this.nextTub = clock + 2.3;
        e.sfx('drip', this.pts.tub, 0.1);
      }
      if (!this.nextPipe) this.nextPipe = clock + rand(8, 16);
      if (clock >= this.nextPipe) {
        this.nextPipe = clock + rand(25, 40);
        e.sfx('pipeKnock', this.pts.pipe);
      }
    }
  }
}

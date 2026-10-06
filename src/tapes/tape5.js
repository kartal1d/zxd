// KASET 5 — "Bugün Sen Beste'sin!" (soğuk ayna: yer değiştirme, sessizlik, bakış ve sahte bitiş)
import * as S from '../draw/scenes.js';
import * as K from '../draw/scenes5.js';
import { has, norm, clamp } from '../util.js';
import { parseNum } from './common.js';
import { SCREEN_DEFAULT } from '../tv.js';

const BASE = { saturation: 0.7, tintR: 0.9, tintG: 0.97, tintB: 1.1, noise: 0.08, tracking: 0.3, jitter: 0.22, aberration: 1.3, glitch: 0, roll: 0, pixel: 0, brightness: 1.5 };
const AFTER = { saturation: 0.35, noise: 0.14, tracking: 0.36, jitter: 0.26, aberration: 1.5, tintR: 0.92, tintG: 0.97, tintB: 1.06 };
const BRIGHT = { brightness: 1.85, saturation: 1.0, tintR: 1, tintG: 1, tintB: 1, noise: 0.035, tracking: 0.08, jitter: 0.08, aberration: 0.5 };
const FX = { wow: 1.6, hiss: 0.018, lp: 4800, drive: 0.16, echo: 0.12, echoTime: 0.045 };
const FX_AFTER = { hp: 200, lp: 3900, drive: 0.2, echo: 0.05, echoTime: 0.03, wow: 2.2, rate: 1, hiss: 0.032 };
const BOX = { tempo: 90, detune: -90, gain: 0.12 };

/** Bakış bölgeleri (640x480 TV tuvali, yakın planda): Beste'nin yüzü ve ayna. */
const FACE = [140, 70, 190, 190];
const MIRROR = [420, 80, 180, 320];
const WIDE = { x: 320, y: 240, z: 1 };
const CLOSE = { x: 203, y: 287, z: 1.6 };
const MIRROR_SHOT = { x: 322, y: 282, z: 2.3 };
const NIGHT_CLOSE = { x: 236, y: 250, z: 1.6 };
const WORD = 'SÖYLEME';
const IDLE = ['b1_idle1', 'b1_idle2'];

const plain = (txt) => String(txt ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
const words = (txt) => norm(txt).split(' ').filter(Boolean);
const backwards = (txt) => [...norm(txt)].reverse().join('');
/** "bilmiyorum", "hatırlamıyorum", "unuttum" (yanlış sayılır) */
const dontKnow = (txt) => !txt || has(txt, 'bilmiyo', 'bilmem', 'unuttum', 'unutmusum', 'hatirlamiyo', 'hatirlamam', 'emin degil');

/** Soyadı sorusunda reddetme */
function refuses(txt) {
  return has(txt, 'soyleme', 'soylemiyorum', 'soylemicem', 'soylemiycem', 'hayir', 'bilmiyorum', 'bilmem', 'gizli', 'asla', 'olmaz', 'demem', 'demeyecegim') || words(txt).some((w) => ['yok', 'sir', 'sirri', 'sirrim', 'pas'].includes(w));
}
/** Gerçek Beste'nin sorusu: tersten yazılmış söz mü, düz yazılmış mı? */
function classify(txt) {
  if (txt == null) return 'timeout';
  const r = backwards(txt);
  if (['evet', 'bulacagim', 'bulurum', 'soz', 'tamam', 'gelecegim'].some((w) => r.includes(w))) return 'yes';
  if (r.includes('hayir')) return 'no';
  if (has(txt, 'evet', 'bulacagim', 'bulucam', 'bulurum', 'soz', 'tamam')) return 'forward';
  return 'other';
}

export async function tape5(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const NAME = (st.name || 'Arkadaşım').toLocaleUpperCase('tr');
  const SH = K.SHOW;
  const M = SH.mirror;
  const NM = K.NIGHT_MIRROR;

  const v = {
    cam: { ...WIDE },
    mic: 0,
    lower: null,
    demoUntil: -1,
    ref: { lag: 0, over: null, realGirl: false, noMic: false },
    fog: 0,
    write: { text: WORD, shown: 0, x: M.cx, y: 346, size: 22, mirrored: true },
    writeHand: false,
    cracks: 0,
    flip: 0,
    note: { entries: [], focus: null },
  };
  // gösteri sonrası (gece, şifonyer yakın planı)
  const A = { solo: true, rs: 0.72, talk: false, lookX: 0, tilt: 0, fog: 0, ev: 0, writing: false, palm: 0, bx: 760, walk: false, stepT0: -9, stepDur: 0.34, cam: { ...WIDE } };
  // örnek, oyuncunun okuyabileceği yönde yazılır: gerçek kız, çizgi filmin aksine, bizim için tersten yazmayı bilir
  const EV = { text: 'EVET → TEVE', shown: 0, x: NM.cx, y: 292, size: 32, mirrored: false };
  const loops = new Set();
  let saidNow = false;
  let caught = false;

  g.audio.setTapeFx('t1', 0.1, FX);
  g.audio.setHiss(true);
  d.setBase(BASE, 0.1);
  d.eyeMode = 'viewer';
  let ejectTries = 0;
  d.ejectPolicy = () => {
    ejectTries++;
    if (!d.voice && ejectTries <= 3) d.sayAsync('b2_eject');
    d.glitch(0.5, 0.35);
    return false;
  };

  // ---------------------------------------------------------------- poz geçmişi (yansımanın gecikmesi için)
  const hist = [];
  const cur = () => ({ t: d.time, expr: B.expr, wave: B.wave, look: { x: B.look.x, y: B.look.y }, mouth: B.mouth, blink: B.blink, tilt: B.tilt, mic: v.mic });
  function record() {
    const last = hist[hist.length - 1];
    if (last && last.t === d.time) return;
    hist.push(cur());
    while (hist.length > 2 && hist[1].t < d.time - 2) hist.shift();
  }
  function poseAt(lag) {
    if (!lag || !hist.length) return cur();
    const at = d.time - lag;
    let p = hist[0];
    for (const h of hist) {
      if (h.t <= at) p = h;
      else break;
    }
    return p;
  }
  const refPose = () => ({ ...poseAt(v.ref.lag), ...(v.ref.over || {}) });

  // ---------------------------------------------------------------- küçük yerel sesler (TV'den)
  const au = g.audio;
  function tvNoise(dur, o) {
    try {
      if (au?.ctx) au.noiseBurst(au.tvIn, au.now, dur, o);
    } catch {
      /* ses yok */
    }
  }
  function tvTone(f, dur, o) {
    try {
      if (au?.ctx) au.tone(au.tvIn, au.now, f, dur, o);
    } catch {
      /* ses yok */
    }
  }
  const step = (gain = 0.4) => {
    tvNoise(0.07, { type: 'lowpass', freq: 650, gain, attack: 0.002 });
    tvTone(150, 0.08, { gain: gain * 0.5, endFreq: 85 });
  };
  const squeak = () => tvTone(1500 + Math.random() * 400, 0.1, { gain: 0.018, endFreq: 1900 + Math.random() * 300 });
  const crackSfx = () => {
    tvNoise(0.05, { type: 'highpass', freq: 3500, gain: 0.55, attack: 0.001 });
    tvNoise(0.35, { type: 'bandpass', freq: 2400, q: 2, gain: 0.18 });
    tvTone(2900, 0.06, { type: 'triangle', gain: 0.05 });
  };
  const fogBreath = () => tvNoise(1.1, { type: 'bandpass', freq: 700, q: 0.6, gain: 0.12, attack: 0.4 });

  // ---------------------------------------------------------------- bakış: ayna yazısı ve "bana bak"
  const gz = { active: false, last: null, t0: 0, away: 0, returned: true, lastReact: -99, looks: 0 };
  function gazeTick() {
    const now = d.time;
    const dt = gz.last == null ? 0 : clamp(now - gz.last, 0, 0.1);
    gz.last = now;
    if (!gz.active || d.paused || dt <= 0) return;
    const inMirror = d.gazeIn(MIRROR);
    const inFace = d.gazeIn(FACE);
    const n = [...WORD].length;
    const auto = now - gz.t0 > 20; // dokunmatik ve hiç bakmayan oyuncu için yazı kendiliğinden devam eder
    if (v.write.shown < n) {
      if (inMirror) v.write.shown = Math.min(n, v.write.shown + dt / 0.6);
      else if (auto) v.write.shown = Math.min(n, v.write.shown + dt / 1.2);
      if ((inMirror || auto) && Math.random() < dt * 5) squeak();
    }
    v.writeHand = v.write.shown < n && (inMirror || auto);
    if (inFace) {
      gz.away = 0;
      gz.returned = true;
    } else gz.away += dt;
    if (gz.looks < 3 && gz.away > 0.6 && (gz.returned || now - gz.lastReact > 6) && !d.voice) {
      gz.looks++;
      gz.returned = false;
      gz.away = 0;
      gz.lastReact = now;
      lookReact(gz.looks);
    }
  }
  function lookReact(n) {
    v.cracks = n;
    crackSfx();
    d.sayAsync('k5_look' + n);
    if (n < 3) {
      d.glitch(0.25, 0.25, false);
      return;
    }
    // üçüncüsü: kırmızı parlama, resim bir an ters döner
    d.fx(lowFlash ? { tintR: 1.2, tintG: 0.75, tintB: 0.75 } : { tintR: 1.7, tintG: 0.45, tintB: 0.45 }, 0.04);
    d.realTimeout(() => d.fx({ tintR: BASE.tintR, tintG: BASE.tintG, tintB: BASE.tintB }, 0.7), lowFlash ? 0.5 : 0.22);
    d.glitch(0.7, 0.4, false);
    d.sfx('heartbeat', 3, 0.7);
    v.flip = 2;
  }

  // ---------------------------------------------------------------- sahneler
  const refRoom = (cc) => {
    const p = refPose();
    d.beste(cc, { ...p, x: 532, y: 252, scale: 0.42, flip: true, lookTarget: null });
  };
  const bedroom = (c, t) => {
    record();
    K.bedroomMirror(c, t, { mirror: { figure: refRoom } });
    d.beste(c);
    if (d.time < v.demoUntil && Math.floor(d.time * 4) % 2 === 0) S.promptBox(c, t, '', { label: 'BESTE:' });
  };

  const refShow = (cc) => {
    const p = refPose();
    const R = SH.ref;
    cc.save();
    cc.translate(R.x, 0);
    cc.scale(-1, 1);
    cc.translate(-R.x, 0);
    K.seated(cc, { ...p, x: R.x, scale: R.scale }, { seatY: R.seatY, mic: v.ref.noMic ? null : p.mic, notebook: !v.ref.noMic });
    cc.restore();
    if (v.writeHand) K.writingHand(cc, K.writingTip(cc, v.write, d.time), 0.6, d.time);
  };
  const show = (c, t) => {
    record();
    gazeTick();
    c.save();
    if (v.flip > 0) {
      // iki kare yatay ters
      v.flip--;
      c.translate(640, 0);
      c.scale(-1, 1);
    }
    K.camera(c, v.cam, () => {
      K.talkShow(c, t, { host: NAME });
      K.standFrame(c, M, t);
      K.mirrorGlass(c, t, {
        ...M,
        bg: 'stage',
        figure: refShow,
        realGirl: v.ref.realGirl,
        fog: v.fog,
        fogX: M.cx,
        fogY: 338,
        fogRX: 52,
        fogRY: 32,
        writings: [v.write],
        cracks: v.cracks,
        crackSeed: 11,
      });
      K.ovalFrame(c, M, { k: 0.75 });
      K.chair(c, SH.guestX, SH.seatY, SH.scale, '#6fb3ff');
      K.nameCard(c, SH.guestX, SH.seatY - 7, 'BESTE', 0.9);
      K.chair(c, SH.hostX, SH.seatY, SH.scale, '#ff8fb8');
      K.seated(c, { ...B, t: d.time, x: SH.hostX, scale: SH.scale }, { seatY: SH.seatY, mic: v.mic, notebook: true, swing: 0.4 });
    });
    c.restore();
    if (v.lower) K.lowerThird(c, t, v.lower);
  };
  const noteScene = (c, t) => {
    record();
    K.notebook(c, t, v.note);
  };
  const spliceScene = (c, t) => {
    K.spliceLeader(c, t, { dim: lowFlash });
    S.osd(c, { label: '', counter: d.counter() + (t > 0.3 ? 41 : 0) });
  };

  const refNight = (cc) => {
    if (A.solo) {
      const s = A.rs;
      d.beste(cc, { x: NM.cx, y: 198 + 205 * s, scale: s, flip: true, expr: A.talk ? 'neutral' : 'sad', wave: 0, look: { x: A.lookX, y: 0.05 }, tilt: A.tilt, lookTarget: null });
      if (A.writing) K.writingHand(cc, K.writingTip(cc, EV, d.time), 0.95, d.time);
    } else {
      const p = refPose();
      const s = 0.55;
      d.beste(cc, { ...p, x: NM.cx + (A.bx - NM.cx) * 0.3, y: 214 + 205 * s - bob() * 0.5, scale: s, flip: true, lookTarget: null });
    }
  };
  const bob = () => (A.walk ? Math.sin(clamp((d.time - A.stepT0) / A.stepDur, 0, 1) * Math.PI) * 8 : 0);
  const night = (c, t) => {
    record();
    EV.shown = A.ev;
    K.camera(c, A.cam, () => {
      K.dresserCloseup(c, t, {
        mirror: {
          figure: refNight,
          fog: A.fog,
          fogX: NM.cx,
          fogY: 290,
          fogRX: 108,
          fogRY: 46,
          writings: [EV],
          palm: A.palm > 0 ? { x: NM.cx - 66, y: 236, s: 1.25 * A.palm } : null,
        },
      });
      if (A.walk || !A.solo) d.beste(c, { x: A.bx, y: 478 - bob(), scale: 1.05 });
    });
  };

  // ---------------------------------------------------------------- yardımcılar
  const music = () => d.music('box', BOX);
  async function lower(role, name, side, hold = 3.2) {
    const L = { role, name, side, p: 0 };
    v.lower = L;
    d.tweens.add(L, 'p', 1, 0.35);
    await d.wait(hold);
    d.tweens.add(L, 'p', 0, 0.3);
    await d.wait(0.3);
    if (v.lower === L) v.lower = null;
  }
  /** Defter ara planı: i. satıra cevabı yazar. */
  async function writeNote(i, text, o = {}) {
    const prev = d.sceneFn;
    const e = { text: plain(text), p: 0 };
    v.note.entries[i] = e;
    v.note.focus = i;
    d.scene(noteScene);
    const dur = clamp(0.35 + e.text.length * 0.08, 0.6, 1.6) * (o.part || 1);
    d.sfx('pencil', dur);
    d.tweens.add(e, 'p', o.part || 1, dur, (x) => x);
    await d.wait(dur + 0.35);
    v.note.focus = null;
    if (!o.stay) d.scene(prev);
    return e;
  }
  /** Yanlış cevabın üstünü çizip doğrusunu yazar. */
  async function fixNote(i, fix) {
    const prev = d.sceneFn;
    const e = v.note.entries[i];
    d.scene(noteScene);
    v.note.focus = i;
    e.strike = 0;
    d.sfx('pencil', 0.5);
    d.tweens.add(e, 'strike', 1, 0.4, (x) => x);
    await d.wait(0.5);
    e.fix = fix;
    e.fixP = 0;
    d.sfx('pencil', 0.4);
    d.tweens.add(e, 'fixP', 1, 0.45, (x) => x);
    await d.wait(0.8);
    v.note.focus = null;
    d.scene(prev);
  }
  /** Ayna yazısını tamamlar (cevap erken geldiyse). */
  async function finishWriting() {
    const n = [...WORD].length;
    while (v.write.shown < n) {
      v.writeHand = true;
      v.write.shown = Math.min(n, v.write.shown + 0.12);
      if (Math.random() < 0.4) squeak();
      await d.wait(0.05);
    }
    v.writeHand = false;
  }
  /** Yaş sorusunda üçüncü yanlış: yanlışın üstü çizilir, kırmızı 7, sonra kalem kenara durmadan 7 yazar; oda ampulü titrer. */
  async function sevens() {
    const prev = d.sceneFn;
    const e = v.note.entries[0];
    d.scene(noteScene);
    v.note.focus = 0;
    e.strike = 0;
    d.sfx('pencil', 0.45);
    d.tweens.add(e, 'strike', 1, 0.35, (x) => x);
    await d.wait(0.45);
    e.fix = '7';
    e.fixP = 0;
    d.tweens.add(e, 'fixP', 1, 0.35, (x) => x);
    await d.wait(0.6);
    v.note.focus = 'margin';
    v.note.margin = 0;
    d.sfx('pencil', 2.4);
    d.sfx('heartbeat', 4, 0.55);
    const bulb0 = g.room.bulbBase ?? 1;
    g.room.flickerBurst(lowFlash ? 0.3 : 2.4);
    if (!lowFlash) g.room.setBulb(bulb0 * 0.35, 0.2);
    d.tweens.add(v.note, 'margin', 14, 2.4, (x) => x);
    await d.wait(2.5);
    if (!lowFlash) g.room.setBulb(bulb0, 1.2);
    v.note.focus = null;
    await d.wait(0.7);
    d.scene(prev);
  }
  async function realSay(id, o) {
    A.talk = true;
    try {
      await d.say(id, o);
    } finally {
      A.talk = false;
    }
  }

  try {
    // ================================================================ açılış
    d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
    await d.wait(1.2);
    d.sfx('static', 0.45);
    d.scene((c, t) => {
      S.titleCard(c, t, { decay: 0.35 });
      K.swapBadge(c, t);
    });
    d.music('jingle', { tempo: 128, detune: -60, gain: 0.27 });
    await d.wait(1.2);
    await d.say('n_show');
    await d.wait(1.0);
    d.scene((c, t) => {
      S.titleCard(c, t, { episode: '5. Bölüm', title: "Bugün Sen Beste'sin!", decay: 0.35 });
      K.swapBadge(c, t);
    });
    await d.say('k5_title');
    await d.wait(2.6);
    d.stopMusic(0.5);

    // ================================================================ yatak odası: dolabın yerinde ayna
    Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 1, lookTarget: null, tilt: 0 });
    d.sfx('static', 0.2, 0.2);
    d.scene(bedroom);
    music();
    await d.wait(0.6);
    await d.say('k5_hello');
    B.wave = 0;
    B.lookTarget = { x: 0.9, y: -0.3 }; // aynaya bir bakış
    await d.wait(0.6);
    B.lookTarget = null;
    d.tweens.add(B, 'tilt', 0.12, 0.4);
    await d.say('k5_rules');
    d.tweens.add(B, 'tilt', 0, 0.3);
    // yer değiştirme: altyazıda oyuncunun adı, cevap kutusunda BESTE
    d.labelOverride = { BESTE: NAME };
    d.promptLabel = 'BESTE:';
    d.sfx('whoosh');
    d.glitch(0.15, 0.2, false);
    const r2 = d.say('k5_rules2');
    await d.wait(1.1);
    v.demoUntil = d.time + 2.0;
    d.sfx('cartoonPop');
    await Promise.all([r2, d.wait(2.1)]);
    B.wave = 1;
    await d.wait(0.6);
    B.wave = 0;

    // ================================================================ söyleşi stüdyosu
    d.stopMusic(0.3);
    d.sfx('static', 0.2, 0.2);
    Object.assign(B, { expr: 'happy', wave: 0, lookTarget: null, tilt: 0 });
    v.mic = 0;
    d.scene(show);
    d.sfx('talkShowSting');
    await d.wait(0.9);
    music();
    const host = lower('SUNUCU', NAME, 'left', 3.4);
    B.wave = 1;
    await d.say('k5_interview');
    B.wave = 0;
    await host;
    const guest = lower('KONUK', 'BESTE', 'right', 3.0);
    B.lookTarget = { x: 0.85, y: 0.2 };
    await d.wait(1.0);
    B.lookTarget = null;
    await guest;
    // boş defter
    d.sfx('paper');
    d.scene(noteScene);
    await Promise.all([d.say('k5_notebook'), d.wait(2.2)]);
    d.scene(show);
    await d.wait(0.4);

    // ---- 1. soru: yaş (yansıma 0.6 sn geriden gelir)
    v.ref.lag = 0.6;
    B.wave = 1;
    d.tweens.add(B, 'tilt', -0.14, 0.5);
    const qa = d.say('k5_q_age');
    await d.wait(0.9);
    B.wave = 0;
    d.tweens.add(B, 'tilt', 0.1, 0.6);
    await qa;
    d.tweens.add(B, 'tilt', 0, 0.5);
    // Doğru cevap 7 (elmalar). Yanlışta iki ipucu; üçüncü yanlışta (ya da "bilmiyorum"larla) Beste doğrusunu söyler
    // ve defterde bir şey olur: kalem kenara durmadan kırmızı yediler yazar, çatı katının ampulü titrer.
    let age = (await d.ask({ idle: IDLE, maxLen: 16 })) || '';
    if (first) st.answers.age = plain(age); // forma oyuncunun ilk cevabı geçer
    await writeNote(0, age);
    let ageWrong = 0;
    while (parseNum(age) !== 7 && ageWrong < 2) {
      ageWrong++;
      B.lookTarget = { x: 0, y: 0 };
      d.tweens.add(B, 'tilt', 0.18, 0.3);
      if (ageWrong === 1) await d.say(dontKnow(age) ? 'k5_age_dunno' : 'k5_age_hint1');
      else {
        B.expr = 'neutral';
        d.stopMusic(0.3);
        await d.say('k5_age_hint2');
      }
      d.tweens.add(B, 'tilt', 0, 0.3);
      B.lookTarget = null;
      age = (await d.ask({ idle: IDLE, maxLen: 16 })) || '';
    }
    if (parseNum(age) === 7) {
      if (ageWrong) {
        B.expr = 'happy';
        await fixNote(0, '7');
        if (ageWrong >= 2) music();
      }
      B.wave = 1;
      await d.say('k5_age_right');
      B.wave = 0;
    } else {
      // üçüncü yanlış: gerçek cevap + olay
      d.stopMusic(0.05);
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      d.fx({ saturation: 0.4 }, 0.2);
      await d.wait(0.6);
      const truth = d.say('k5_age_wrong');
      await d.wait(2.4);
      B.expr = 'void';
      v.ref.over = { expr: 'void', look: { x: 0, y: 0 } };
      d.glitch(0.8, 0.45);
      await d.wait(0.45);
      B.expr = 'frozen';
      v.ref.over = null;
      await truth;
      await d.wait(0.3);
      await sevens();
      d.fx({ saturation: BASE.saturation }, 0.3);
      B.expr = 'happy';
      B.lookTarget = null;
      music();
      await d.wait(0.4);
      B.wave = 1;
      await d.say('k5_age_right');
      B.wave = 0;
    }
    await d.wait(0.5);

    // ---- 2. soru: renk (Beste el sallar, yansıma sallamaz; gizli kare)
    v.ref.lag = 0;
    v.ref.over = { wave: 0 };
    B.wave = 1;
    const qc = d.say('k5_q_color');
    await d.wait(1.0);
    v.ref.realGirl = true;
    d.tag({ secret: { id: 'ayna', text: 'BEN BURADAYIM' } });
    await d.wait(0.2);
    v.ref.realGirl = false;
    d.tag(null);
    await qc;
    await d.wait(0.4);
    B.wave = 0;
    const color = (await d.ask({ idle: IDLE, maxLen: 16 })) || '';
    if (first) st.answers.color = plain(color);
    await writeNote(1, color);
    if (has(color, 'sari')) {
      d.stopMusic(0.05);
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      d.fx({ saturation: 0.4 }, 0.15);
      await d.wait(0.8);
      await d.say('k5_color_yellow');
      await d.wait(1.0);
      d.fx({ saturation: BASE.saturation }, 0.3);
      B.expr = 'happy';
      B.lookTarget = null;
      music();
    } else {
      d.tweens.add(B, 'tilt', 0.16, 0.3);
      await d.say('k5_color_any');
      d.tweens.add(B, 'tilt', 0, 0.3);
    }
    v.ref.over = null;
    await d.wait(0.5);

    // ---- sahte sükûnet: kamera bir an aynaya kesilir, yansıma oturuyor... ve cama yapışır (ani korkutma 1)
    B.wave = 1;
    await d.wait(1.2);
    B.wave = 0;
    Object.assign(v.cam, MIRROR_SHOT);
    v.ref.over = { look: { x: 0, y: 0 }, expr: 'neutral' };
    await d.wait(1.3);
    d.stopMusic(0.01);
    await d.jumpscare({ sec: 0.5, room: true, draw: (c, t) => K.mirrorScare(c, t, { kind: 'reflection' }) });
    Object.assign(v.cam, WIDE);
    v.ref.over = null;
    music();
    await d.wait(0.7);

    // ---- 3. soru: anne (Beste boş sandalyeye bakar, yansıma kameraya; anne lafında yüzü üzülür)
    B.lookTarget = { x: 0.85, y: 0.2 };
    v.ref.over = { look: { x: 0, y: 0 } };
    await d.wait(0.6);
    const qm = d.say('k5_q_mother');
    await d.wait(0.35);
    v.ref.over = { look: { x: 0, y: 0 }, expr: 'sad' };
    await qm;
    const mother = (await d.ask({ idle: IDLE, maxLen: 16 })) || '';
    if (first) st.answers.mother = plain(mother);
    await writeNote(2, mother);
    d.stopMusic(0.6);
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    const unknown = has(mother, 'bilmiyo', 'bilmem', 'unuttum', 'hatirlamiyo', 'hatirlamam') || words(mother).includes('yok');
    await d.say(unknown ? 'k5_mother_unknown' : 'k5_mother_any');
    await d.wait(1.0);

    // ================================================================ son soru: soyadı
    v.ref.over = { expr: 'neutral', look: { x: 0, y: 0 }, wave: 0 };
    v.ref.noMic = true;
    B.expr = 'frozen';
    B.lookTarget = null;
    d.eyeMode = 'track';
    d.tweens.add(v.cam, 'x', CLOSE.x, 3.2);
    d.tweens.add(v.cam, 'y', CLOSE.y, 3.2);
    d.tweens.add(v.cam, 'z', CLOSE.z, 3.2);
    d.tweens.add(v, 'mic', 1, 2.6);
    d.setBase({ aberration: 2.0 }, 3);
    await d.wait(3.4);
    v.flip = 2;
    d.sfx('glitch', 0.08);
    await d.say('k5_q_surname');
    // yansıma cama nefes verir, buğuya yazmaya başlar
    fogBreath();
    d.tweens.add(v, 'fog', 1, 2.5);
    gz.t0 = d.time;
    gz.last = null;
    gz.active = true;
    let sur;
    try {
      sur = await d.ask({ timeout: 32, idle: ['k5_idle1', 'k5_idle2', 'k5_idle3'], idleGap: 9, maxLen: 20 });
    } finally {
      gz.active = false;
      v.writeHand = false;
    }
    const path = sur == null ? 'silence' : has(sur, 'aydin') ? 'aydin' : refuses(sur) ? 'refuse' : 'fake';

    if (path === 'aydin') {
      // defterde yazmaya başlar... ve kurgucu keser
      await writeNote(3, sur, { part: 0.45, stay: true });
      d.stopMusic(0.01);
      d.sfx('splice');
      d.scene(spliceScene);
      if (!lowFlash) d.fx({ brightness: 1.7 }, 0.05);
      await Promise.all([d.say('k5_nermin_cut'), d.wait(1.6)]);
      d.fx({ brightness: BASE.brightness }, 0.1);
      d.sfx('splice');
      // kıkırdamanın ortasına geri dönüş, bir saniyelik izleme kayması
      d.scene(show);
      B.expr = 'frozen';
      d.fx({ tracking: 1.6, jitter: 0.9, roll: 0.03 }, 0.03);
      const al = d.say('k5_almost');
      await d.wait(1.0);
      d.fx({ tracking: BASE.tracking, jitter: BASE.jitter, roll: 0 }, 0.3);
      await al;
      saidNow = true;
      if (first) {
        st.flags.saidSurnameEarly = true;
        st.flags.surname5 = 'soyledi';
      }
    } else if (path === 'fake') {
      await writeNote(3, sur);
      await d.wait(0.3);
      await d.say('k5_fake');
      if (first) {
        st.answers.fakeSurname = plain(sur);
        st.flags.surname5 = 'uydurdu';
      }
    } else {
      if (path === 'refuse') {
        await d.say('k5_refuse');
        await d.wait(0.3);
      }
      // Beste aynaya döner, yazıyı yüksek sesle (anlamsız diye) okur
      await finishWriting();
      B.lookTarget = { x: 1, y: 0.1 };
      d.tweens.add(B, 'tilt', 0.14, 0.4);
      await d.wait(0.6);
      await d.say('k5_read_mirror');
      d.tweens.add(B, 'tilt', 0, 0.3);
      B.lookTarget = null;
      if (path === 'silence') {
        await d.wait(0.4);
        await d.say('k5_silence');
      }
      if (first) st.flags.surname5 = path === 'silence' ? 'sessiz' : 'reddetti';
    }
    await d.wait(0.8);

    // ================================================================ veda ve "bitiş"
    d.tweens.add(v.cam, 'x', WIDE.x, 1.4);
    d.tweens.add(v.cam, 'y', WIDE.y, 1.4);
    d.tweens.add(v.cam, 'z', WIDE.z, 1.4);
    d.tweens.add(v, 'mic', 0, 1.2);
    d.tweens.add(v, 'fog', 0, 3.5);
    d.setBase({ aberration: BASE.aberration }, 1.2);
    v.ref.over = null;
    v.ref.noMic = false;
    v.ref.lag = 0;
    d.eyeMode = 'viewer';
    B.expr = 'happy';
    B.lookTarget = null;
    music();
    await d.wait(1.5);
    B.wave = 1;
    await d.say('k5_bye');
    await d.wait(0.6);
    B.wave = 0;
    d.stopMusic(0.3);

    // parlak, tertemiz jenerik (bilerek güven verici)
    d.sfx('static', 0.25, 0.2);
    d.fx(BRIGHT, 0.15);
    d.scene((c, t) => S.endCard(c, t));
    d.music('jingle', { tempo: 128, detune: -60, gain: 0.24 });
    await d.say('n_outro');
    await d.wait(2.2);
    d.stopMusic(0.4);
    d.fx(d.baseFx, 0.1);
    d.scene((c, t) => S.staticNoise(c, t, 1));
    d.sfx('static', 1.4, 0.25);
    await d.wait(1.5);

    // ================================================================ SAHTE BİTİŞ: boşta bekleyen TV'nin birebir kopyası
    d.noFF = true;
    d.stopFF();
    au.setHiss(false);
    au.setTapeFx('off', 0.5);
    // boştaki TV'nin olağan görüntüsü (soğuk ayna renkleri olmadan)
    d.fx({ ...SCREEN_DEFAULT, tintR: 1, tintG: 1, tintB: 1 }, 0.05);
    d.scene((c) => S.blueScreen(c, g.clock, { text: 'VİDEO 1', sub: '', clock: true }));
    d.onPause = (paused) => {
      // gerçek boştaki TV duraklatılamaz: "❚❚" görünür, Beste fısıldar
      if (paused && d.fakeEnding && !caught) {
        caught = true;
        d.sayRoom('k5_fake_caught', { pos: 'tv', gain: 0.9, wet: 0.1 }).catch(() => {});
      }
    };
    await d.fakeEnd(7);
    d.onPause = null;
    d.sfx('vcrInsert', P.vcr); // hiçbir şey takılmadı
    d.scene(() => {});
    await d.wait(0.5);
    d.showOsd('▶ OYNAT', 3);
    d.noFF = false;
    au.setTapeFx('t2', 0.3, FX_AFTER);
    au.setHiss(true);
    d.setBase(AFTER, 0.1);
    await d.wait(1.4);

    // ================================================================ GÖSTERİDEN SONRA: kaydın altındaki kayıt
    d.sfx('static', 0.25, 0.15);
    d.eyeMode = 'viewer';
    Object.assign(B, { expr: 'frozen', wave: 0, lookTarget: null, tilt: 0, x: 760, y: 478, scale: 1.05 });
    v.ref = { lag: 0, over: null, realGirl: false, noMic: false };
    d.scene(night);
    await d.wait(2.4);
    // yansıma cama yaklaşır
    d.tweens.add(A, 'rs', 0.95, 2.6);
    d.tweens.add(A, 'palm', 1, 1.6);
    await d.wait(2.8);
    fogBreath();
    d.tweens.add(A, 'fog', 0.55, 1.5);
    await realSay('k5_real1');
    await d.wait(0.4);
    await realSay('k5_real2');
    if (saidNow) {
      await d.wait(0.3);
      await realSay('k5_real_said');
    }
    await d.wait(0.4);
    // buğuya örnek: EVET → TEVE (ayna harfleriyle)
    d.tweens.add(A, 'fog', 1, 1.0);
    const ask1 = realSay('k5_real_ask');
    await d.wait(0.6);
    A.writing = true;
    const evn = [...EV.text].length;
    for (let i = 0; i < evn * 4; i++) {
      A.ev = (i + 1) / 4;
      if (i % 2 === 0) squeak();
      await d.wait(0.045);
    }
    A.ev = evn;
    A.writing = false;
    await ask1;

    let res = classify(await d.ask({ label: '???', idle: ['k5_real_idle'], idleGap: 12, timeout: 50, maxLen: 24 }));
    if (res === 'forward') {
      A.lookX = -0.9; // sağa, kapıya doğru kaygıyla bakar
      await realSay('k5_real_again');
      A.lookX = 0;
      res = classify(await d.ask({ label: '???', idle: ['k5_real_idle'], idleGap: 12, timeout: 40, maxLen: 24 }));
      if (res === 'forward') res = 'heard';
    }
    let friend = false;
    if (res === 'yes') {
      friend = true;
      await realSay('k5_real_yes');
    } else if (res === 'heard') {
      // çizgi film duydu: aynada bir an gerçek kızın yerinde o belirir (ani korkutma), sonra sesi ekran dışından gelir
      A.lookX = -1;
      await d.wait(0.5);
      await d.jumpscare({ sec: 0.45, draw: (c, t) => K.mirrorScare(c, t, { kind: 'cartoon' }) });
      d.glitch(0.5, 0.3, false);
      await d.say('k5_heard');
      d.tweens.add(A, 'rs', 0.82, 0.4);
    } else {
      await realSay('k5_real_no');
    }
    if (first) st.flags.mirrorFriend = friend;
    await d.wait(0.5);
    d.sfx('creak', P.giftbox, 1.2); // odada, kutuların orada
    await realSay('k5_real3');
    await d.wait(0.3);

    // ---- çizgi film ayak sesleri: yansıma kusursuz kopyaya döner
    A.lookX = -1;
    for (const gain of [0.12, 0.18, 0.26]) {
      step(gain);
      await d.wait(0.45);
    }
    d.glitch(0.6, 0.25);
    d.tweens.add(A, 'fog', 0, 2.2);
    d.tweens.add(A, 'palm', 0, 0.3);
    A.solo = false;
    A.walk = true;
    d.eyeMode = 'track';
    while (A.bx > 150) {
      A.stepT0 = d.time;
      const to = Math.max(150, A.bx - 68);
      d.tweens.add(A, 'bx', to, A.stepDur, (x) => x);
      step(0.32);
      await d.wait(A.stepDur);
      A.bx = to;
    }
    A.walk = false;
    await d.wait(0.5);
    if (friend) {
      await d.say('k5_huh');
      await d.wait(0.4);
    }
    await d.say('k5_back');
    const who = (await d.ask({ evil: true, idle: ['b1_idle3'], idleGap: 12, maxLen: 24 })) || '';
    const mirrorWho = has(who, 'ayna', 'kiz', 'beste', 'gercek', 'yansima') || words(who).includes('o');
    const noOne = !mirrorWho && has(who, 'kimse', 'hic', 'hayir', 'yok', 'kendimle');
    if (noOne) {
      B.expr = 'happy';
      await d.say('k5_who_noone');
    } else await d.say('k5_who_mirror');
    // bir saniye: yansıma gülümser, Beste gülümsemez (ikisi de görünsün diye sert bir yakın plan)
    Object.assign(A.cam, NIGHT_CLOSE);
    v.ref.over = { expr: 'happy', look: { x: 0, y: 0 } };
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(1.0);

    // ---- sert kesme: karlanma... ve karın içinden sırıtan yansıma (ani korkutma 2)
    d.scene((c, t) => S.staticNoise(c, t, 1));
    d.sfx('static', 2.4, 0.3);
    await d.wait(1.1);
    await d.jumpscare({ sec: 0.42, room: true, draw: (c, t) => K.mirrorScare(c, t, { kind: 'grin' }) });
    await d.wait(1.3);
  } finally {
    for (const stop of loops) stop?.();
    loops.clear();
    d.onPause = null;
    d.noFF = false;
    B.tilt = 0;
  }
  return ejectTries;
}

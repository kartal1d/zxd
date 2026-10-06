// KASET 9 — "HAM KAYIT — Çamlık 14.05.98" (çizgi film yok: Nermin'in kurgu odası)
// Kendine özgü mekanik: DOĞRUSAL OLMAYAN KURGU MASASI. Oyuncu klip numaralarını yazarak klipleri istediği sırayla açar.
// Dört klip izlenince çizgi film kurgu odasını ele geçirir: yüzüne Beste'nin çizilmiş yüzü takılı yüzsüz adam.
import * as S from '../draw/scenes.js';
import * as E from '../draw/scenes9.js';
import { has, norm, digits } from '../util.js';

/** Kurgu odası: neredeyse siyah-beyaz monitör yeşili, profesyonel ve temiz */
const SUITE = { saturation: 0.12, tintR: 0.85, tintG: 1.05, tintB: 0.9, noise: 0.05, tracking: 0.1, jitter: 0.08, aberration: 0.4, glitch: 0, roll: 0, pixel: 0 };
/** Doğal kamera: çizgisiz, el titremesi */
const CAM = { saturation: 0.6, tintR: 1.08, tintG: 1.0, tintB: 0.85, noise: 0.12, tracking: 0.12, jitter: 0.3, aberration: 0.6, glitch: 0, roll: 0, pixel: 0 };
const PAPER = { saturation: 0.5, tintR: 1.12, tintG: 1.02, tintB: 0.78, noise: 0.06, tracking: 0.05, jitter: 0.04, aberration: 0.3, glitch: 0, roll: 0, pixel: 0 };
const REC = { saturation: 0, tintR: 1, tintG: 1, tintB: 1, noise: 0.1, tracking: 0.12, jitter: 0.06, aberration: 0.5, glitch: 0, roll: 0, pixel: 0 };
/** 10. kasetin kırmızısı: final onun devamı gibi hissettirir */
const RED = { saturation: 0.55, noise: 0.11, tracking: 0.55, jitter: 0.45, aberration: 2.2, tintR: 1.25, tintG: 0.55, tintB: 0.5, glitch: 0.04, roll: 0, pixel: 0 };

const DONT = ['bilmiyorum', 'bilmiyom', 'bilmem', 'hatirlamiyorum', 'hatirlamiyom', 'hatirlamam', 'unuttum', 'unutdum', 'fikrim yok', 'bilemedim', 'emin degilim'];
const dontKnow = (txt) => !txt || has(txt, ...DONT);

/** Klip numarası: 1-4 | 7 (gizli) | null */
function parseClip(txt) {
  const n = norm(txt);
  const dg = digits(txt);
  if (dg.length === 1 && '12347'.includes(dg)) return +dg;
  if (dg.length) return null;
  if (has(txt, 'ses', 'kayit', 'studyo', 'stüdyo', 'kabin')) return 1;
  if (has(txt, 'camlik', 'çamlık', 'cekim', 'dis', 'orman', 'agac')) return 2;
  if (has(txt, 'form', 'bilgi', 'oyuncu')) return 3;
  if (n === 'n' || has(txt, 'nermin', 'kisisel')) return 4;
  if (has(txt, 'yedi', 'yedinci')) return 7;
  return null;
}

/** Arka planda başlatılan sözün reddi (kaset iptali) yakalanmamış hata sayılmasın */
const later = (p) => {
  p.catch(() => {});
  return p;
};

export async function tape9(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const NAME = (st.name || 'Arkadaşım').toLocaleUpperCase('tr');
  const bulbOn = (g.room.bulbBase ?? 1) > 0.05;
  const flick = (sec) => bulbOn && !lowFlash && g.room.flickerBurst(sec);

  const v = { watched: new Set(), seven: false, monitor: 'static', flash: null, mode: 'list', k: 0, deck: 'dur', gone: false };

  const drawB = (c, over = {}) => d.beste(c, over);
  const tc = () => E.tcString(d.time);
  const level = () => (g.debug?.fast ? (d.voice ? 0.5 + 0.35 * Math.sin(d.time * 21) : 0) : g.audio.level || 0);
  const lineDur = (id) => {
    if (g.debug?.fast) return 0.2;
    if (d.ff) return 0.6;
    const du = g.audio.duration?.(id) || 0;
    return du ? du / (g.audio.fx?.rate || 1) : 2.5;
  };
  const look = (base, fx = 't1', over = {}) => {
    d.setBase(base, 0.15);
    g.audio.setTapeFx(fx, 0.1, { hiss: 0.007, ...over });
    g.audio.setHiss(true);
  };

  // ---------------------------------------------------------------- ortam sesleri (duraklatınca susar)
  const loops = { want: {}, stop: {} };
  const loopOn = (name, ...a) => {
    loops.want[name] = a;
    if (!d.paused && !loops.stop[name]) loops.stop[name] = d.sfx(name, ...a);
  };
  const loopOff = (name) => {
    delete loops.want[name];
    loops.stop[name]?.();
    delete loops.stop[name];
  };
  const loopsPause = (paused) => {
    for (const n of Object.keys(loops.want)) {
      if (paused) {
        loops.stop[n]?.();
        delete loops.stop[n];
      } else if (!loops.stop[n]) loops.stop[n] = d.sfx(n, ...loops.want[n]);
    }
  };
  d.onPause = loopsPause;

  g.audio.setTapeFx('t1', 0.1, { hiss: 0.007 });
  g.audio.setHiss(true);
  d.setBase(SUITE, 0.1);
  d.eyeMode = 'viewer';
  d.chars.beste.expr = 'happy';

  const menuScene = (c, t) => {
    E.editSuite(c, t, { watched: [...v.watched], monitor: v.flash || v.monitor, mode: v.mode, k: v.k, tc: tc(), level: level(), deck: v.deck, jog: t * (v.deck === 'ara' ? 6 : 0.5) });
  };

  try {
    await intro();
    await mainLoop();
  } finally {
    for (const n of Object.keys(loops.want)) loopOff(n);
    d.onPause = null;
  }

  // ================================================================ açılış: lider ve künye
  async function intro() {
    d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
    await d.wait(1.0);
    d.sfx('static', 0.3, 0.3);
    const ld = { n: 5, t0: d.time };
    d.scene((c) => {
      E.leader(c, d.time - ld.t0, { n: ld.n, frac: (d.time - ld.t0) % 1 });
      E.timecode(c, tc());
    });
    d.sfx('deckClunk');
    loopOn('deckHum', 0.022);
    for (const n of [5, 4, 3, 2]) {
      ld.n = n;
      ld.t0 = d.time;
      if (n === 2) d.sfx('leaderBeep');
      await d.wait(0.9);
    }
    d.scene((c) => {
      c.fillStyle = '#050606';
      c.fillRect(0, 0, 640, 480);
      E.timecode(c, tc());
    });
    await d.wait(0.9);
    const t0 = d.time;
    d.scene((c) => {
      E.slateCard(c, d.time - t0, {});
      E.timecode(c, tc());
    });
    d.sfx('typewriter', 14);
    await d.wait(0.8);
    await d.say('k9_intro');
    await d.wait(0.3);
    await d.say('k9_intro2');
    await d.wait(0.7);
  }

  // ================================================================ menü
  /** Menüdeki önizleme monitörü bir an başka bir şey gösterir. */
  async function flashMonitor(kind, sec = 0.35) {
    v.flash = kind;
    await d.wait(sec);
    v.flash = null;
  }

  async function mainLoop() {
    d.scene(menuScene);
    d.sfx('deckClunk');
    await d.wait(0.6);
    await d.say('k9_menu_open');
    let wrong = 0;
    let truthN = 0;
    let stuck = 0;
    for (;;) {
      const allDone = [1, 2, 3, 4].every((n) => v.watched.has(n));
      if (allDone) break;
      d.scene(menuScene);
      v.deck = 'dur';
      const txt = await d.ask({ evil: true, label: 'KLİP NO:', idle: ['k9_menu_idle', 'k9_menu_idle2'], idleGap: 20, maxLen: 20 });
      let n = parseClip(txt);
      if (n === 4 && v.watched.has(4)) {
        d.sfx('beep', false);
        d.showOsd('KLİP SİLİNDİ', 1.8);
        continue;
      }
      if (n == null) {
        // R1: üç yanlış (ya da "bilmiyorum") -> gerçek, bir de ürpertici bir olay
        wrong++;
        stuck++;
        d.sfx('beep', false);
        d.showOsd('KLİP YOK', 1.6);
        if (wrong === 2) await d.say('k9_menu_hint');
        else if (wrong >= 3) {
          wrong = 0;
          await menuTruth(truthN++);
        }
        // takılan oyuncuyu Nermin kurtarır: sıradaki izlenmemiş klibi o seçer
        if (stuck >= 6) {
          stuck = 0;
          n = [1, 2, 3, 4].find((x) => !v.watched.has(x));
          await d.say('k9_menu_auto');
        } else continue;
      }
      wrong = 0;
      stuck = 0;
      await playClip(n);
    }
    await hijack();
  }

  /** R1 gerçeği: numarayı Nermin açıkça söyler; her seferinde farklı bir olay. */
  async function menuTruth(n) {
    const k = n % 3;
    if (k === 0) {
      // arkandan fısıltı, monitörde bir an gri adam
      await d.say('k9_menu_t1');
      await d.wait(0.5);
      const m = later(flashMonitor('man', 0.5));
      await d.sayRoom('k9_menu_w1', { pos: 'behind', gain: 1.1 });
      await m;
    } else if (k === 1) {
      // ampul titrer, gerçek kapı üç kez vurulur, monitörde boş yüzlü Beste
      await d.say('k9_menu_t2');
      await d.wait(0.4);
      flick(1.1);
      d.sfx('knock', P.door, 3, 0.7);
      d.sfx('sting');
      await flashMonitor('void', 0.6);
      await d.wait(1.6);
    } else {
      // görüntü yırtılır, kulağının dibinde fısıltı
      await d.say('k9_menu_t3');
      await d.wait(0.4);
      d.glitch(1, 0.6);
      later(flashMonitor('man', 0.25));
      d.sfx('sting');
      await d.sayRoom('k9_menu_w2', { listener: true, gain: 1.0 });
    }
    await d.wait(0.4);
  }

  async function playClip(n) {
    d.sfx('deckClunk');
    d.sfx('tapeSearch', 1.0);
    v.deck = 'ara';
    await d.wait(1.1);
    v.deck = 'oynat';
    d.sfx('deckClunk');
    if (n === 1) await clip1();
    else if (n === 2) await clip2();
    else if (n === 3) await clip3();
    else if (n === 4) await clip4();
    else await clip7();
    if (n <= 4) v.watched.add(n);
    // masaya dön
    for (const k of Object.keys(loops.want)) if (k !== 'deckHum') loopOff(k);
    d.tag(null);
    d.scene((c) => {
      c.fillStyle = '#000';
      c.fillRect(0, 0, 640, 480);
    });
    d.sfx('deckClunk');
    look(SUITE, 't1');
    loopOn('deckHum', 0.022);
    v.deck = 'dur';
    await d.wait(0.7);
    d.scene(menuScene);
    d.sfx('deckClunk');
    await d.wait(0.5);
  }

  // ================================================================ KLİP 1: ses kaydı
  async function clip1() {
    look({ ...SUITE, noise: 0.07 }, 't1');
    const vs = { take: '', talk: false, flat: false, pan: 0, sheet: false, splice: false };
    d.scene((c, t) => {
      if (vs.splice) E.spliceFlash(c, t);
      else if (vs.sheet) E.boothRules(c, t, { pan: vs.pan });
      else E.voiceSession(c, t, { take: vs.take, talk: vs.talk, flat: vs.flat, level: level() });
      E.timecode(c, E.tcString(d.time, 3600 + 120));
    });
    const control = async (id) => {
      vs.talk = true;
      d.sfx('click');
      await d.say(id);
      vs.talk = false;
      d.sfx('click');
    };
    await d.wait(1.2);
    vs.take = 'TAKE 1';
    await control('k9_c1_r1');
    await d.wait(0.6);
    // Tüm oyunun ilk cümlesi: çizgi film bu kayıttan yapıldı
    await d.say('b1_hello', { filter: null });
    await d.wait(0.8);
    await control('k9_c1_r2');
    vs.take = 'TAKE 2';
    await d.wait(0.5);
    await d.say('k9_c1_take2');
    await d.wait(0.6);
    await control('k9_c1_r3');
    vs.take = 'TAKE 3';
    await d.wait(0.6);
    await d.say('k9_c1_take3');
    await d.wait(0.7);
    await control('k9_c1_r4');
    // kamera kabin duvarındaki kâğıda kayar
    await d.wait(0.5);
    vs.sheet = true;
    vs.pan = 0;
    d.tweens.add(vs, 'pan', 1, 2.0);
    await d.wait(4.8);
    d.tweens.add(vs, 'pan', 0, 1.5);
    await d.wait(1.5);
    vs.sheet = false;
    vs.take = 'TAKE 4';
    await d.wait(0.4);
    await control('k9_c1_r5');
    await d.wait(0.5);
    await d.say('k9_c1_full');
    // makas: kelime ortasında kesilir
    vs.flat = true;
    vs.splice = true;
    d.sfx('splice');
    await d.wait(0.26);
    vs.splice = false;
    await d.wait(1.8);
    await d.say('k9_c1_kiz1');
    await d.wait(0.3);
    await d.say('k9_c1_n1');
    await d.wait(0.4);
    await d.say('k9_c1_kiz2');
    // sahte sakinlik, sonra camın ardındaki çizgi film kızı
    await d.wait(2.4);
    await d.jumpscare({ draw: (c, t) => E.scareBooth(c, t, drawB), sec: 0.55, room: true });
    await d.glitch(0.8, 0.5);
    await d.wait(1.6);
    await d.say('k9_c1_n2', { filter: null });
    await d.wait(1.0);
  }

  // ================================================================ KLİP 2: Çamlık, 14.05.98
  async function clip2() {
    look(CAM, 't1', { lp: 4800, hiss: 0.012 });
    loopOff('deckHum');
    const yil = new Date().getFullYear();
    const cs = {
      stage: 'slate', open: 1, hidden: false, stamp: false, frozen: null, stamp0: E.HMS(13, 41, 5), stampT0: 0,
      tcBase: 3600 + 49 * 60 + 30, tcT0: 0, tear: 0, snow: 0, jolt: 0, hand: 0, carve: false, barkT0: 0,
      // oyuncular
      nx: 128, ny: 376, npose: 'stand', nback: false, nvis: true,
      gvis: true, gx: 228, gy: 358, gh: 68, gpose: 'rope', gwalk: null, glean: 0,
      yel: null, fig: 0, rope: false, basket: null, cat: true,
      rx: 566, ry: 248, rh: 56, rvis: true, rpose: 'cup', rwalk: null, rflip: false,
      nwalk: null, nflip: false,
      running: false, runP: 0, yWalking: false, walkP: 0, leaving: false, leaveX: 0, crossing: false, crossN: 0, crossR: 0,
    };
    const stampSec = () => cs.frozen ?? cs.stamp0 + (d.time - cs.stampT0);
    const camScene = (c, t) => {
      c.save();
      if (cs.jolt > 0) {
        c.translate((Math.random() - 0.5) * 60 * cs.jolt, (Math.random() - 0.5) * 46 * cs.jolt);
        c.rotate((Math.random() - 0.5) * 0.08 * cs.jolt);
      }
      if (cs.stage === 'slate') {
        const f = cs.hidden ? { title: 'ÇEKİM 4', scene: '—', take: '4', date: String(yil), dir: NAME, cam: '' } : {};
        E.slate(c, t, { open: cs.open, f });
      } else if (cs.stage === 'bark') {
        E.rawBark(c, d.time, { carve: cs.carve });
      } else {
        const jump = Math.max(0, Math.cos(d.time * 6.2)) * 5;
        if (cs.running) {
          cs.gx = 350 - 218 * cs.runP;
          cs.gy = 392 - 152 * cs.runP;
          cs.gh = 72 - 34 * cs.runP;
          cs.gwalk = d.time * 14;
        }
        if (cs.yel && cs.yWalking) cs.yel = { x: 138 + 170 * cs.walkP, y: 242, h: 34, alpha: 1, walk: d.time * 5 };
        if (cs.leaving) {
          cs.nx = cs.leaveX;
          cs.nwalk = d.time * 8;
        }
        if (cs.crossing) {
          cs.nx = cs.crossN;
          cs.rx = cs.crossR;
          cs.nwalk = d.time * 7;
          cs.rwalk = d.time * 7 + 1;
        }
        const people = [];
        if (cs.nvis) people.push({ who: 'nermin', x: cs.nx, y: cs.ny, h: 108, pose: cs.npose, back: cs.nback, walk: cs.nwalk, flip: cs.nflip });
        if (cs.rvis) people.push({ who: 'riza', x: cs.rx, y: cs.ry, h: cs.rh, pose: cs.rpose, mega: true, walk: cs.rwalk, flip: cs.rflip });
        if (cs.gvis) people.push({ who: 'girl', x: cs.gx, y: cs.gy - (cs.gpose === 'rope' ? jump : 0), h: cs.gh, pose: cs.gpose, rope: cs.gpose === 'rope', walk: cs.gwalk, lean: cs.glean, plush: cs.stage === 'game' });
        E.rawClearing(c, d.time, {
          people,
          basket: cs.basket,
          rope: cs.rope ? { x: 362, y: 402 } : null,
          cat: cs.cat,
          yellow: cs.yel,
          figure: cs.fig > 0.01 ? { x: 520, y: 224, h: 100, alpha: cs.fig } : null,
        });
      }
      c.restore();
      E.grabHand(c, cs.hand, t);
      E.camFx(c, d.time, { stamp: cs.stamp ? E.stampString(stampSec()) : null });
      if (cs.stage !== 'slate') E.timecode(c, E.tcString(d.time - cs.tcT0, cs.tcBase));
      E.dropout(c, cs.tear, d.time, cs.snow);
    };
    const cut = (osd, tcBase) => {
      d.sfx('tapeSearch', 0.5);
      d.sfx('static', 0.25, 0.25);
      d.glitch(0.7, 0.4, false);
      if (osd) d.showOsd(osd, 2.2);
      cs.tcBase = tcBase;
      cs.tcT0 = d.time;
    };

    // --- klaket
    d.scene(camScene);
    await d.wait(1.0);
    d.tweens.add(cs, 'open', 0, 0.16);
    await d.wait(0.16);
    d.sfx('clap');
    cs.hidden = true;
    d.tag({ secret: { id: 'klaket', text: 'SIRADAKİ ÇEKİM' } });
    await d.wait(0.2);
    cs.hidden = false;
    d.tag(null);
    await d.wait(1.0);

    // --- 13:41 öğle arası
    cs.stage = 'picnic';
    cs.stamp = true;
    cs.stampT0 = d.time;
    cs.tcT0 = d.time;
    d.sfx('static', 0.2, 0.2);
    loopOn('birds', 0.06);
    loopOn('wind', 0.04);
    loopOn('traffic', 0.022);
    await d.wait(1.6);
    await d.say('k9_c2_riza');
    await d.wait(0.5);
    await d.say('k9_c2_kiz1');
    await d.wait(0.3);
    await d.say('k9_c2_n1');
    await d.wait(0.5);
    await d.say('k9_c2_kiz2');
    await d.wait(0.3);
    await d.say('k9_c2_n2');
    await d.wait(0.6);
    await d.say('k9_c2_kiz3');
    await d.wait(0.8);

    // --- 13:58 saklambaç
    cut('▶▶ 13:58', 3600 + 50 * 60 + 20);
    cs.stage = 'game';
    cs.stamp0 = E.HMS(13, 58, 48);
    cs.stampT0 = d.time;
    Object.assign(cs, { nx: 300, ny: 374, npose: 'eyes', nback: true, rvis: false, cat: true, gx: 350, gy: 392, gh: 72, gpose: 'stand', gwalk: null, glean: 0, basket: { x: 372, y: 410 } });
    await d.wait(1.4);
    // ip ağacın dibine düşer, kız dalların arasına koşar
    cs.rope = true;
    cs.gpose = 'stand';
    d.sfx('thud');
    await d.wait(0.5);
    cs.gpose = 'run';
    cs.glean = -0.2;
    cs.running = true;
    cs.runP = 0;
    d.tweens.add(cs, 'runP', 1, 2.8);
    await d.wait(2.9);
    cs.running = false;
    cs.gvis = false;
    cs.yel = { x: 138, y: 242, h: 36, alpha: 1 };
    d.tweens.add(cs, 'fig', 0.4, 3.0);
    await d.wait(1.6);
    await d.say('k9_c2_n3');
    await d.wait(0.5);
    // ağaçların arasından, Tape 1'deki yavaş anlatıcı sayımı bitirir
    await d.say('n_count_end', { label: '???', filter: 'camcorder', gain: 0.8 });
    await d.wait(0.6);
    // sarı şekil el sallar ve ona doğru yürür
    cs.yel = { x: 138, y: 242, h: 36, alpha: 1, pose: 'wave' };
    await d.wait(0.7);
    const kiz4 = later(d.say('k9_c2_kiz4', { gain: 0.35, filter: 'camcorder' }));
    cs.yWalking = true;
    cs.walkP = 0;
    d.tweens.add(cs, 'walkP', 1, 5.2);
    await d.wait(3.4);
    cs.yWalking = false;
    // bant kopar: sesi de yarıda kesilir
    d.voice?.stop();
    await kiz4;
    d.sfx('static', 1.3, 0.5);
    d.sfx('tapeSnap');
    d.tweens.add(cs, 'tear', 1, 0.25);
    d.tweens.add(cs, 'snow', 0.9, 0.3);
    await d.wait(0.55);
    cs.yel = null;
    cs.fig = 0;
    cs.frozen = E.HMS(13, 59, 12);
    loopOff('birds');
    await d.wait(0.5);
    d.tweens.add(cs, 'snow', 0, 0.35);
    d.tweens.add(cs, 'tear', 0, 0.45);
    await d.wait(0.5);
    // dört saniye hiçbir şey
    await d.wait(4.0);
    await d.say('k9_c2_n4');
    await d.wait(0.9);
    await d.say('k9_c2_n5');
    cs.nback = false;
    cs.npose = 'stand';
    cs.nwalk = 0;
    cs.nflip = true;
    cs.leaveX = cs.nx;
    cs.leaving = true;
    d.tweens.add(cs, 'leaveX', -80, 2.4);
    await d.wait(2.4);
    cs.leaving = false;
    cs.nvis = false;

    // --- 14:12 arama (damga hâlâ donuk)
    cut('▶▶ 14:12', 3600 + 50 * 60 + 41);
    cs.stage = 'search';
    Object.assign(cs, { nvis: true, nx: -50, ny: 340, npose: 'cup', nback: false, nflip: false, nwalk: 0, rvis: true, rx: 690, ry: 292, rh: 96, rpose: 'cup', rflip: true, rwalk: 0 });
    cs.crossN = -50;
    cs.crossR = 690;
    cs.crossing = true;
    d.tweens.add(cs, 'crossN', 700, 6.5);
    d.tweens.add(cs, 'crossR', -60, 7.5);
    await d.wait(0.8);
    await d.say('k9_c2_n6');
    await d.wait(0.8);
    // Rıza'nın sözüyle bir el kameraya yapışır; kare sarsılır ama kayıt durmaz
    const rz = later(d.say('k9_c2_riza2'));
    await d.wait(0.7);
    cs.jolt = 1;
    d.tweens.add(cs, 'hand', 1, 0.2);
    d.sfx('thud');
    d.glitch(0.6, 0.4, false);
    await d.wait(0.35);
    d.tweens.add(cs, 'hand', 0, 0.6);
    d.tweens.add(cs, 'jolt', 0, 0.5);
    await rz;
    await d.wait(0.3);
    await d.say('k9_c2_n7');
    await d.wait(1.0);
    cs.crossing = false;

    // --- 14:31 ağaç
    cut('▶▶ 14:31', 3600 + 51 * 60 + 2);
    cs.stage = 'bark';
    cs.carve = false;
    cs.barkT0 = d.time;
    const t0 = d.time;
    loopOff('traffic');
    d.scene((c, t) => {
      // iki kare arasında oyma beliriverir: 01:51:07:24 -> 01:51:08:00
      cs.carve = d.time - t0 >= 6.0;
      camScene(c, t);
    });
    await d.wait(1.2);
    d.sayAsync('k9_c2_far1', { gain: 0.22 });
    await d.wait(2.4);
    d.sayAsync('k9_c2_far2', { gain: 0.22 });
    await d.wait(2.4);
    await d.wait(Math.max(0, t0 + 6.05 - d.time));
    await d.wait(1.0);
    d.sfx('whistle', null, 0.55);
    await d.wait(2.6);
    await d.say('k9_c2_tree', { filter: null });
    await d.wait(0.8);
  }

  // ================================================================ KLİP 3: oyuncu bilgi formu
  async function clip3() {
    look(PAPER, 't1', { hiss: 0.01 });
    loopOff('deckHum');
    const ans = st.answers || {};
    const fl = st.flags || {};
    const cap = (s, n = 16) => String(s ?? '').trim().toLocaleUpperCase('tr').slice(0, n);
    const fake = cap(ans.fakeSurname, 10);
    const rowVals = [
      { value: 'BESTE' },
      { value: cap(ans.age) || '7' },
      fl.caughtLie ? { value: '03.02.1991' } : { value: '14.05.1998', color: '#c0361e' },
      { value: cap(ans.color) || 'SARI' },
      { value: cap(ans.mother) || '?' },
      { value: '364 27 27' },
      { value: cap(fake ? `${NAME.slice(0, 6)} ${fake}` : NAME) },
      { value: cap(ans.wish) || '—' },
    ];
    const noteTexts = [];
    if (fl.still === true) noteTexts.push('Kıpırdamadı.');
    else if (fl.still === false) noteTexts.push('Kıpırdadı.');
    if (fl.tail === 'uydu') noteTexts.push("Tonton'un kuyruğu: turuncu.");
    else if (fl.tail === 'direndi') noteTexts.push("Tonton'un kuyruğu: gri.");
    if (fl.rope) noteTexts.push('Sepete ip koydu.');
    if (ans.stranger === 'gider') noteTexts.push('Yabancıyla gider.');
    else if (ans.stranger === 'gitmez') noteTexts.push('Yabancıyla gitmez.');
    if (fl.promisedFind) noteTexts.push('Söz verdi.');
    if (fl.peeked) noteTexts.push('Sayarken gözünü açtı.');
    if (!noteTexts.length) noteTexts.push('Bakıyor.');
    const form = {
      scroll: 0,
      rows: rowVals.map((r) => ({ ...r, k: 0 })),
      notes: noteTexts.map((text) => ({ text, k: 0 })),
      sur: fl.saidSurnameEarly ? { text: 'AY', state: 'prefix', k: 1 } : { text: '', state: 'empty', k: 1 },
    };
    d.scene((c, t) => E.talentForm(c, t, form));
    d.sfx('paper');
    await d.wait(1.2);
    const reveal = async (obj) => {
      const len = obj.value?.length ?? obj.text.length;
      const dur = 0.3 + len * 0.07;
      d.sfx('typewriter', Math.max(2, Math.min(8, len)));
      d.tweens.add(obj, 'k', 1, dur);
      await d.wait(dur + 0.25);
    };
    for (let i = 0; i < 4; i++) await reveal(form.rows[i]);
    d.tweens.add(form, 'scroll', 170, 1.2);
    await d.wait(1.3);
    for (let i = 4; i < form.rows.length; i++) await reveal(form.rows[i]);
    d.tweens.add(form, 'scroll', 190 + form.notes.length * 36, 1.5);
    await d.wait(1.6);
    for (const n of form.notes) await reveal(n);
    await d.wait(1.0);
    d.tweens.add(form, 'scroll', 0, 1.8);
    await d.wait(1.0);
    await d.say('k9_c3_b1');
    await d.wait(0.5);
    await d.say('k9_c3_b2');

    // isteğe bağlı: soyadı kutusu (üç yanlışta gerçek + olay)
    const SUR = form.sur;
    const write = async (txt, state = 'typed') => {
      SUR.text = txt;
      SUR.state = state;
      SUR.k = 0;
      d.sfx('typewriter', Math.max(2, Math.min(6, txt.length)));
      d.tweens.add(SUR, 'k', 1, 0.25 + txt.length * 0.07);
      await d.wait(0.45 + txt.length * 0.07);
    };
    const inkRuns = async () => {
      SUR.state = 'ink';
      SUR.k = 0;
      d.tweens.add(SUR, 'k', 1, 1.6);
      d.glitch(0.9, 0.6);
      d.sfx('static', 0.5, 0.3);
      await d.wait(1.7);
      SUR.text = '';
      SUR.state = 'empty';
      SUR.k = 1;
    };
    let wrong = 0;
    for (;;) {
      const a = await d.ask({ evil: true, label: 'SOYADI:', maxLen: 16, timeout: 15 });
      if (a == null) {
        await d.say('k9_c3_wait');
        break;
      }
      if (norm(a).includes('aydin')) {
        await write(cap(a));
        await d.wait(0.5);
        await inkRuns();
        await d.say('k9_c3_typed');
        if (first) st.flags.saidSurnameEarly = true;
        break;
      }
      wrong++;
      await write(cap(a));
      await d.wait(0.3);
      SUR.state = 'crossed';
      d.sfx('pencil', 0.5);
      await d.wait(0.7);
      if (wrong === 1) {
        await d.say(dontKnow(a) ? 'k9_c3_dunno' : 'k9_c3_other');
      } else if (wrong === 2) {
        await d.say('k9_c3_hint');
      } else {
        // R1: gerçek. Kutu kendi kendine yazılır, arkandan bir kız fısıldar, ışık titrer, sonra mürekkep akar.
        SUR.text = '';
        SUR.state = 'empty';
        await d.wait(0.4);
        const w = later(d.sayRoom('k9_c3_truth', { pos: 'behind', gain: 1.0 }));
        await d.wait(0.5);
        flick(1.0);
        d.glitch(0.7, 0.5);
        await write('AYDIN');
        await w;
        await d.wait(0.4);
        await inkRuns();
        await d.say('k9_c3_typed');
        break;
      }
      SUR.text = fl.saidSurnameEarly ? 'AY' : '';
      SUR.state = fl.saidSurnameEarly ? 'prefix' : 'empty';
      SUR.k = 1;
    }
    await d.wait(1.0);
  }

  // ================================================================ KLİP 4: N. — KİŞİSEL
  async function clip4() {
    look(REC, 't1', { hiss: 0.011 });
    loopOff('deckHum');
    const rs = { rec: true, beam: 0.06, solid: false };
    d.scene((c, t) => E.recBlack(c, t, rs));
    await d.wait(1.8);
    const NV = { filter: null, rate: 0.95 };
    const p = later(d.say('k9_c4_n1', NV));
    await d.wait(1.6);
    d.sfx('footCreak', P.behind);
    await p;
    await d.wait(0.7);
    for (const id of ['k9_c4_n2', 'k9_c4_n3', 'k9_c4_n4', 'k9_c4_n5', 'k9_c4_n6']) {
      await d.say(id, NV);
      await d.wait(0.6);
    }
    d.tweens.add(rs, 'beam', 0.1, 4);
    await d.say('k9_c4_n7', NV);
    await d.wait(0.5);
    // çizgi filminin derin sesi kaydın üstüne biner
    d.glitch(0.5, 0.5);
    flick(0.7);
    await d.say('k9_c4_b');
    await d.wait(0.25);
    await d.say('k9_c4_n8', NV);
    // sakinlik, sonra merceğin önünde boş gözlü yüz
    await d.wait(1.5);
    await d.jumpscare({ draw: (c, t) => E.scareLens(c, t, drawB), sec: 0.45, room: true });
    rs.rec = false;
    d.sfx('static', 0.3, 0.3);
    await d.wait(3.0);
    d.sfx('deckClunk');
  }

  // ================================================================ GİZLİ KLİP 7
  async function clip7() {
    look({ ...CAM, saturation: 0.35, noise: 0.14, jitter: 0.12 }, 't1', { hiss: 0.012 });
    loopOff('deckHum');
    if (first) st.flags.sawClip7 = true;
    v.seven = true;
    const pv = { step: 0, giggle: 0 };
    d.scene((c, t) => E.povTrees(c, t, pv));
    d.tag({ secret: { id: 'yedinci', text: 'BEN DE BURADAYDIM' } });
    loopOn('wind', 0.045);
    await d.wait(0.8);
    // uzakta Nermin yediye kadar sayıyor (kendi söziyle karışmasın diye ayrı kanaldan)
    const far = !g.debug?.fast && g.audio.buffers?.has('k9_c2_n3') ? g.audio.playVoice('k9_c2_n3', { gain: 0.2, filter: 'camcorder' }) : null;
    g.ui.subtitle('NERMİN', '(çok uzaktan) 1... 2... 3... 4...', 'anlatici');
    await d.wait(1.2);
    pv.giggle = 1;
    await d.say('k9_c7_giggle', { gain: 0.8, keep: false });
    pv.giggle = 0;
    d.tweens.add(pv, 'step', 1, 2.2);
    await d.wait(2.4);
    far?.stop();
    g.ui.subtitle(null, null, null, 0.2);
    d.tag(null);
    d.scene((c) => {
      c.fillStyle = '#000';
      c.fillRect(0, 0, 640, 480);
    });
    await d.wait(1.5);
  }

  // ================================================================ ele geçirme
  async function hijack() {
    // 1) monitör kızarır, klip listesinin harfleri "14.05 · 7 · ?" olur
    d.sfx('tapeSearch', 1.4);
    v.monitor = 'red';
    v.mode = 'scramble';
    v.k = 0;
    v.deck = 'ara';
    d.tweens.add(v, 'k', 1, 1.6);
    d.setBase({ ...SUITE, saturation: 0.3, tintR: 1.12, tintG: 0.8, tintB: 0.75, noise: 0.08, jitter: 0.12 }, 1.2);
    g.audio.setTapeFx('t2', 0.8, { hiss: 0.014 });
    d.sfx('glitch', 0.8);
    await d.say('k9_hijack1');
    v.mode = 'final';
    d.sfx('sting');
    await d.wait(1.4);

    // 2) deck kendi kendine çalar: Nermin'in hiç işaretlemediği dokuz saniye
    d.sfx('deckClunk');
    d.setBase(CAM, 0.3);
    g.audio.setTapeFx('t1', 0.3, { hiss: 0.012 });
    const mf = { k: 0 };
    d.eyeMode = 'track';
    B.lookTarget = null;
    B.expr = 'happy';
    d.scene((c, t) => {
      E.maskFinal(c, d.time, drawB, { k: mf.k });
      E.camFx(c, d.time, { stamp: E.stampString(E.HMS(13, 59, 12)) });
      E.timecode(c, '01:52:11:03');
    });
    loopOn('wind', 0.04);
    await d.wait(2.4);
    await d.say('k9_hijack2');
    await d.wait(1.0);
    // 3) çamın arkasından yalnızca o çıkar
    d.tweens.add(mf, 'k', 0.2, 2.2);
    d.sfx('footCreak', P.behind);
    await d.wait(2.6);
    d.tweens.add(mf, 'k', 0.72, 3.4);
    await d.wait(3.5);
    // 4) Tape 1'in ilk cümlesi: maskenin ağzı oynar
    const dur = lineDur('b1_hello');
    d.tweens.add(mf, 'k', 1, dur + 0.1);
    await d.say('b1_hello');
    // 5) sert kesme: tek kırmızı kare, sonra kırmızı boşluk
    loopOff('wind');
    Object.assign(B, { x: 320, y: 690, scale: 1.75, expr: 'void', lookTarget: null, wave: 0, tilt: 0 });
    const vc = { corrupt: 0.6 };
    d.scene((c, t) => {
      S.bgVoid(c, t);
      S.corrupt(c, (cc) => d.beste(cc), vc.corrupt, d.time);
    });
    d.setBase(RED, 0.05);
    g.audio.setTapeFx('t3', 0.1);
    g.audio.setHiss(true);
    g.room.setMood?.('t3');
    await d.jumpscare({ draw: (c, t) => E.scareMask(c, t, drawB), sec: 0.45, room: true });
    d.sfx('static', 0.4, 0.4);
    await d.wait(0.8);

    // 6) kırmızı boşluk: ne olacağını söyler, hazır olup olmadığını sorar
    await d.say('k9_ask_ready');
    await d.ask({ evil: true, timeout: 15 });
    await d.say('k9_ready_any');
    await d.wait(0.4);
    const lt = later(d.say('k9_light'));
    await d.wait(1.0);
    flick(1.0);
    await lt;
    await d.wait(0.8);

    // 7) üç saniyelik kar: ters fısıltı
    d.sfx('static', 3.2, 0.35);
    const revText = [...(g.lines.k9_ters?.t || '')].reverse().join('');
    d.scene((c, t) => {
      S.realGirl(c, t, { alpha: 0.4, flip: true });
      S.staticNoise(c, t, 0.4);
      if (Math.floor(t * 2) % 2) S.bigText(c, '◀◀', { color: '#ffffff', font: `64px ${S.FONT_OSD}`, y: 80 });
    });
    d.tag({ rev: 'k9_ters' });
    await Promise.all([d.say('k9_ters', { file: 'k9_ters_rev', sub: revText }), d.wait(3)]);
    d.tag(null);
    d.scene((c, t) => S.staticNoise(c, t, 1));
    d.sfx('static', 1.6, 0.4);
    await d.wait(1.8);
  }
}

// KASET 7 — "Bir Daha!" (birinci kasetin kopyasının kopyası)
// Her tur birinci kaseti kısaltarak yeniden oynatır, bir şey değişir, görüntü çürür ("Ne değişti?").
// Kopya görüntü veremeyecek kadar aşınınca Beste yalnızca bir ses olur ve GERÇEK kapındaki vuruşları sayar.
// Pürüzsüz son turda arkası dönüktür; döndüğünde yüzü yoktur. Takılan bandı yalnızca geri sarmak kurtarır.
import * as S from '../draw/scenes.js';
import * as K from '../draw/scenes7.js';
import { has, norm } from '../util.js';
import { parseNum } from './common.js';

// ---------------------------------------------------------------- kuşak kaybı: ekran görünümleri
const CLEAN = { roll: 0, pixel: 0, glitch: 0, brightness: 1.5, tintR: 1, tintG: 1, tintB: 1, scan: 0.16, vignette: 0.9 };
const LOOK = {
  copy1: { ...CLEAN, saturation: 0.9, noise: 0.07, tracking: 0.25, jitter: 0.16, aberration: 0.8 },
  copy2: { ...CLEAN, saturation: 0.6, noise: 0.11, tracking: 0.45, jitter: 0.28, aberration: 1.6, tintB: 0.95 },
  copy3: { ...CLEAN, saturation: 0.3, noise: 0.16, tracking: 0.7, jitter: 0.42, aberration: 2.4, pixel: 2, tintB: 0.9 },
  worn: { ...CLEAN, saturation: 0.15, noise: 0.24, tracking: 1.0, jitter: 0.6, aberration: 2.6 },
  // birinci kasetten bile temiz: bu kendi başına yanlış
  pristine: { ...CLEAN, saturation: 1.05, noise: 0.02, tracking: 0, jitter: 0, aberration: 0.2, scan: 0.1 },
  stuck: { ...CLEAN, saturation: 0.45, noise: 0.12, tracking: 0.8, jitter: 0.55, aberration: 2.0 },
  black: { ...CLEAN, saturation: 1, noise: 0.015, tracking: 0, jitter: 0, aberration: 0.15 },
};
/** Tekrar kullanılan 1. kaset sesleri: tur tur yavaşlar, pesleşir (yeni kayıt yok) */
const VOICE = [null, { rate: 1, detune: 0 }, { rate: 0.94, detune: -60 }, { rate: 0.88, detune: -150 }, { rate: 1, detune: 0 }];
/** Ses zinciri (wow = bant dalgalanması) */
const AUDIO = [
  null,
  ['t1', { hiss: 0.02 }],
  ['t2', { rate: 1, echo: 0.16, wow: 2.4, hiss: 0.03 }],
  ['t3', { rate: 1, echo: 0.2, wow: 6.5, hiss: 0.045 }],
  ['t1', { hiss: 0.004, wow: 0.6 }],
];
const JINGLE = [null, { tempo: 152 }, { tempo: 128, detune: -80 }, { tempo: 100, detune: -200 }];
const BOX = [null, { gain: 0.13 }, { tempo: 84, detune: -80, gain: 0.12 }, { tempo: 66, detune: -200, gain: 0.11 }, { gain: 0.13 }];
const NERMIN_SUB = 'Seni hatırlıyorum, Nermin! Sen benim arkadaşımsın. Seni hiç unutmadım.';

// ---------------------------------------------------------------- cevap sınıflandırma
const DONT = ['bilmiyorum', 'bilmiyom', 'bilmem', 'hatirlamiyorum', 'hatirlamiyom', 'hatirlamam', 'unuttum', 'unutdum', 'fikrim yok', 'bilemedim', 'emin degilim'];
const words = (txt) => norm(txt).split(' ').filter(Boolean);
/** "bilmiyorum", "hatırlamıyorum", "unuttum" yanlış cevap sayılır */
const dontKnow = (txt) => !txt || has(txt, ...DONT);

/** 1. tur: sekiz elma ya da Nermin'in adı */
function classify1(txt) {
  if (dontKnow(txt)) return null;
  if (has(txt, 'elma', 'sekiz', 'fazla', 'agac', 'apple') || parseNum(txt) === 8) return 'apple';
  if (has(txt, 'isim', 'ismim', 'ad', 'adim', 'nermin', 'hala', 'halam')) return 'name';
  return null;
}
/** 2. tur: Tonton yok */
function classify2(txt) {
  if (dontKnow(txt)) return null;
  return has(txt, 'tonton', 'kedi', 'yok', 'eksik', 'kayip', 'arkadas', 'kedisi', 'pisi') ? 'tonton' : null;
}
/** 3. tur: adam saklanmadı */
function classify3(txt) {
  if (dontKnow(txt)) return null;
  if (words(txt).includes('o')) return 'man';
  return has(txt, 'adam', 'amca', 'siluet', 'golge', 'biri', 'gri', 'saklanmadi', 'kaybolmadi', 'kalmis', 'agac', 'yuzsuz', 'kisi', 'insan') ? 'man' : null;
}
/** Son tur: arkası dönük / sen değiştin / hiçbir şey */
function classifyFinal(txt) {
  if (dontKnow(txt)) return null;
  if (has(txt, 'arka', 'donmus', 'dondu', 'donuk', 'yuz', 'ters', 'bakmiyor', 'sirt', 'duvar')) return 'back';
  const w = words(txt);
  if (['ben', 'sen', 'biz', 'degistim', 'degistin', 'degistik'].some((x) => w.includes(x))) return 'you';
  return null;
}
const knock0 = (txt) => !dontKnow(txt) && (parseNum(txt) === 0 || has(txt, 'hic', 'sifir', 'calmadi', 'yok', 'kol', 'dondu', 'acildi', 'acti'));

export async function tape7(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const T = d.chars.tonton;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const YEAR = new Date().getFullYear();
  const v = {
    loop: 1,
    tonton: true,
    shadow: 0,
    pamuk: false,
    counted: null,
    t8: null,
    ring: 0,
    man: 0,
    manNear: 0,
    manTilt: 0,
    tear: 0,
    turn: 0,
  };
  const ans = {};
  let stuck = false;
  let escaped = false;

  // ---------------------------------------------------------------- yardımcılar
  const quiet = (p) => {
    p.catch(() => {});
    return p;
  };
  const sceneT = () => d.time - d.sceneT0;
  /** Tekrar kullanılan 1. kaset repliği: turun hızı ve perdesiyle */
  const old = (id, o = {}) => d.say(id, { ...VOICE[v.loop], ...o });
  const voiceDur = (id, rate = 1) => {
    if (g.debug?.fast) return 0.2;
    const b = g.audio.duration?.(id) || 0;
    if (b > 0) return b / ((g.audio.fx?.rate || 1) * rate);
    return 2.5;
  };
  const tapeFx = ([name, over], ramp = 0.4) => {
    g.audio.setTapeFx(name, ramp, over);
    g.audio.setHiss(true);
  };
  const bulb = (val, dur) => {
    if (!st.room?.lightOff) g.room.setBulb(val, dur);
  };
  const flicker = (sec) => {
    if (!lowFlash) g.room.flickerBurst(sec);
  };
  const hop = () => {
    const y0 = B.y;
    d.tweens.add(B, 'y', y0 - 18, 0.14);
    d.realTimeout(() => d.tweens.add(B, 'y', y0, 0.2), 0.16);
  };
  /** Oda altyazısı (konuşan yok): '[kapı çalınıyor]' */
  const caption = (text, sec) => {
    const tok = ++d.subTok;
    g.ui.subtitle(null, text, '');
    d.realTimeout(() => {
      if (d.subTok === tok) g.ui.subtitle(null, null, null, 0.3);
    }, sec);
  };
  /** VHS dikey kayması: görüntü bir kez yukarı yuvarlanır */
  const rollSlip = (dur = 0.6) => {
    const p = d.tv.p;
    p.roll = 0;
    d.tweens.add(p, 'roll', 1, dur, (x) => x);
    d.wait(dur + 0.02).then(
      () => (d.tv.p.roll = 0),
      () => {},
    );
  };
  // geri sarma motor sesi: duraklatınca susar, devam edince geri gelir
  let loopName = null;
  let loopStop = null;
  const startLoop = (name) => {
    stopLoop();
    loopName = name;
    if (!d.paused) loopStop = d.sfx(name);
  };
  const stopLoop = () => {
    loopStop?.();
    loopStop = null;
    loopName = null;
  };
  d.onPause = (paused) => {
    if (!loopName) return;
    if (paused) {
      loopStop?.();
      loopStop = null;
    } else if (!loopStop) loopStop = d.sfx(loopName);
  };
  let ejectTries = 0;
  d.ejectPolicy = () => {
    ejectTries++;
    if (!d.voice && ejectTries <= 3) d.sayAsync('b2_eject');
    d.glitch(0.5, 0.35);
    return false;
  };

  // ---------------------------------------------------------------- sahneler
  const tearable = (fn) => (c, t) => (v.tear > 0.02 ? S.corrupt(c, (cc) => fn(cc, t), v.tear, d.time) : fn(c, t));
  const bedroom = (c, t) => {
    S.bgBedroom(c, t);
    if (v.tonton) d.tonton(c);
    else if (v.shadow > 0) K.emptyShadow(c, 470, 455, v.shadow);
    if (v.pamuk) K.stuffing(c, 470, 452, t);
    d.beste(c);
  };
  const garden = (c, t) => {
    K.garden8(c, t, { counted: v.counted, t8: v.t8, ring: v.ring });
    d.beste(c, { x: 116, y: 462, scale: 0.82 });
  };
  const picnic = (c, t) => {
    S.bgPicnic(c, t, {});
    d.beste(c);
  };
  const forest = (c, t) => {
    S.bgForest(c, t, { dark: 0.12 });
    if (v.man > 0) K.forestMan(c, t, { near: v.manNear, tilt: v.manTilt, alpha: v.man });
    d.beste(c);
  };
  const title = (decay, episode = true) => (c, t) => S.titleCard(c, t, episode ? { episode: '1. Bölüm', title: 'Beste ile Tanışalım!', decay } : { decay });
  const pristine = (c, t) => {
    S.bgBedroom(c, t);
    K.turnBeste(c, { ...B, t: d.time }, v.turn);
  };

  /**
   * Bandın kendi çizdiği otomatik geri sarma: önceki sahne geriye doğru oynar, şeritler, '◀◀', geri sayan sayaç.
   * Oyuncu kontrol etmez. o.rev: bu karelerin altında ters fısıltı (geri sarınca düzü duyulur).
   */
  async function autoRewind(sec, o = {}) {
    const prev = d.sceneFn;
    const T0 = sceneT();
    const c0 = d.counter();
    d.osdUntil = 0;
    d.stopMusic(0.05);
    startLoop('rewind');
    d.fx({ tracking: 1.3, jitter: 1.1 }, 0.15);
    d.scene((c, t) => {
      prev?.(c, Math.max(0, T0 - t * 3), d);
      K.rewindOverlay(c, d.time, { counter: c0 - t * 45 });
    });
    try {
      if (o.rev) {
        d.tag({ rev: o.rev });
        const revText = [...(g.lines[o.rev]?.t || '')].reverse().join('');
        const line = quiet(d.say(o.rev, { file: o.rev + '_rev', gain: 0.45, sub: revText, filter: null }));
        await d.wait(sec);
        await line;
      } else await d.wait(sec);
    } finally {
      d.tag(null);
      stopLoop();
    }
    d.fx(d.baseFx, 0.25);
  }

  /** Soru karesi: bant geri sarıldı, turun başındaki an */
  function questionScene(n) {
    d.sfx('static', 0.12, 0.15);
    v.tear = 0;
    if (n === 3) {
      Object.assign(B, { x: 210, y: 470, scale: 0.78, expr: 'neutral', wave: 0, lookTarget: null });
      d.scene(tearable(forest));
    } else {
      Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 0, lookTarget: null, tilt: n === 2 ? 0.06 : 0 });
      v.tonton = n === 1;
      v.shadow = n === 1 ? 0 : 0.8;
      d.scene(tearable(bedroom));
    }
    d.showOsd('▶ OYNAT', 1.5);
    d.music('box', { ...BOX[n], gain: 0.07 });
  }

  /** Yanlış cevapta farkın olduğu ~12 sn'lik parça yeniden oynar */
  async function replay(frag, n) {
    await autoRewind(1.1);
    d.showOsd('▶ OYNAT', 2);
    d.music('box', BOX[n]);
    await frag();
    await autoRewind(0.7);
    questionScene(n);
    await d.wait(0.3);
  }

  /**
   * "Ne değişti?" sorusu. Doğru: tepki. 1. yanlış: k7_wrong + parça yeniden oynar. 2. yanlış: ipucu.
   * 3. yanlış (ya da "bilmiyorum"): Beste cevabı söyler ve bir olay olur, kaset doğru cevaplanmış gibi sürer.
   */
  async function loopQuestion(o) {
    await d.say(o.ask);
    let wrong = 0;
    for (;;) {
      // bekleme uyarıları da 1. kasetin sesleri: turun aşınmışlığıyla çalar
      d.voiceMods = { beste: VOICE[v.loop] };
      const txt = await d.ask({ idle: o.idle, maxLen: 24 });
      d.voiceMods = {};
      const k = o.classify(txt);
      if (k) {
        ans[o.key] = txt;
        await o.right(k);
        return k;
      }
      wrong++;
      if (wrong >= 3) {
        ans[o.key] = txt;
        await o.truth();
        return 'truth';
      }
      if (wrong === 1) {
        await d.say('k7_wrong');
        await o.replay();
        await d.say(o.reask);
      } else await d.say(o.hint);
    }
  }

  // ---------------------------------------------------------------- 1. kasetin kısaltılmış parçaları
  /** Bahçe: sekiz elma, Beste yediye kadar sayar, sekizinci sayı sessizce belirir */
  async function gardenFrag() {
    v.counted = null;
    v.t8 = null;
    v.ring = 0;
    d.sfx('static', 0.15, 0.15);
    d.scene(tearable(garden));
    B.expr = 'happy';
    B.lookTarget = { x: 0.8, y: -0.6 };
    await old('b1_count_intro');
    B.lookTarget = null;
    const line = quiet(old('b1_count_help'));
    const step = 0.42 / VOICE[v.loop].rate;
    for (let i = 1; i <= 7; i++) {
      v.counted = i;
      await d.wait(step);
    }
    await d.wait(0.45);
    v.counted = 8;
    v.t8 = sceneT();
    await line;
    await d.wait(1.0);
  }

  /** Tonton'suz oda: Beste boş yeri tanıştırır, miyav boş yerden gelir */
  async function bedroomFrag2() {
    Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 1, lookTarget: null, tilt: 0.04 });
    v.tonton = false;
    v.shadow = 0.8;
    d.sfx('static', 0.15, 0.15);
    d.scene(tearable(bedroom));
    await d.wait(0.4);
    B.lookTarget = { x: 0.9, y: 0.3 };
    await old('b1_tonton_intro');
    B.wave = 0;
    await d.wait(0.3);
    v.shadow = 1;
    await old('t1_hello', { gain: 0.8 });
    await d.wait(0.3);
  }

  /** Orman: adam açıkta durur, kaybolmaz. full: gizli kare 'yil' de yanıp söner */
  async function forestFrag(full) {
    Object.assign(B, { x: 210, y: 470, scale: 0.78, expr: 'happy', wave: 0, lookTarget: null, tilt: 0 });
    v.man = 1;
    d.sfx('static', 0.2, 0.2);
    d.scene(tearable(forest));
    await old('n_forest');
    const fl = quiet(old('b1_forest'));
    if (full) {
      await d.wait(Math.max(0.15, voiceDur('b1_forest', VOICE[v.loop].rate) * 0.45));
      // GİZLİ: oymanın altında ikinci bir satır, bu yıl
      const prev = d.sceneFn;
      d.scene((c, t) => S.treeCarving(c, t, { bottom: 'HÂLÂ BURADA ' + YEAR }));
      d.tag({ secret: { id: 'yil', text: 'HÂLÂ BURADAYIM' } });
      await d.wait(0.3);
      d.tag(null);
      d.scene(prev);
    }
    await fl;
    await d.wait(0.4);
  }

  // ---------------------------------------------------------------- doğruyu söyleme olayları (3. yanlış)
  /** 1. tur: sekiz sayılır, Beste'nin yüzü boşluğa döner, görüntü yırtılır */
  async function truth1() {
    d.stopMusic(0.1);
    B.expr = 'neutral';
    await d.say('k7_giveup');
    v.counted = 8;
    v.t8 = null;
    v.ring = 1;
    d.sfx('static', 0.15, 0.15);
    d.scene(tearable(garden));
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    const line = quiet(d.say('k7_truth_apple'));
    await d.wait(Math.max(0.1, voiceDur('k7_truth_apple') * 0.55));
    B.expr = 'void';
    d.sfx('boom');
    v.tear = 0.8;
    d.tweens.add(v, 'tear', 0, 1.3);
    d.glitch(0.9, 0.6);
    await line;
    await d.wait(0.9);
    d.sfx('click');
    B.expr = 'happy';
    B.lookTarget = null;
    v.ring = 0;
    v.tear = 0;
  }

  /** 2. tur: Tonton'un miyavı televizyondan değil, oyuncunun arkasından gelir */
  async function truth2() {
    d.stopMusic(0.1);
    B.expr = 'neutral';
    await d.say('k7_giveup');
    B.lookTarget = { x: 0.9, y: 0.3 };
    v.shadow = 1;
    await d.say('k7_truth_tonton');
    await d.wait(0.7);
    await d.sayRoom('t1_hello', { pos: 'behind', rate: 0.82, detune: -260, gain: 1.1 });
    // Beste sese doğru değil, sana bakar
    B.lookTarget = { x: 0, y: 0 };
    B.expr = 'frozen';
    await d.wait(1.4);
    B.expr = 'happy';
    B.lookTarget = null;
  }

  /** 3. tur: adam bir anda öne sıçrar ve orada kalır; tavan arası ampulü titrer, kalp atışı */
  async function truth3() {
    d.stopMusic(0.1);
    await d.say('k7_giveup');
    const line = quiet(d.say('k7_truth_man'));
    await d.wait(Math.max(0.1, voiceDur('k7_truth_man') * 0.35));
    d.sfx('sting');
    v.manNear = 1;
    v.manTilt = 0.32;
    d.glitch(0.7, 0.4);
    flicker(1.1);
    d.sfx('heartbeat', 4, 0.8);
    await line;
    await d.wait(1.0);
  }

  try {
    // ================================================================ AÇILIŞ: tıpatıp 1. kaset
    tapeFx(AUDIO[1], 0.1);
    d.setBase(LOOK.copy1, 0.1);
    d.eyeMode = 'viewer';
    // sayaç (7. kasetin bant konumu) bunun 1. kaset olmadığını söyleyen tek şey
    d.showOsd('▶ OYNAT', 5);
    // ampul hâlâ ölü: jenerik başlayınca kendiliğinden geri gelir
    bulb(0, 0.05);
    d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
    await d.wait(1.6);
    d.sfx('static', 0.4);
    d.scene((c, t) => S.warning(c, t));
    await d.wait(4.5);
    d.sfx('static', 0.3);
    d.scene(title(0, false));
    d.music('jingle', { gain: 0.3, ...JINGLE[1] });
    lightReturns();
    await d.wait(1.2);
    await d.say('n_show');
    await d.wait(1.8);
    d.scene(title(0));
    await d.say('n_t1_title');
    await d.wait(3.2);

    // ================================================================ 1. TUR: sekiz elma, "Nermin"
    v.loop = 1;
    Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 1, lookTarget: null, tilt: 0, frozenMouth: false });
    Object.assign(T, { x: 470, y: 455, scale: 0.9, expr: 'happy', tail: true, stitched: false, tailColor: null, tremble: 0, lookTarget: null, frozenMouth: false });
    v.tonton = true;
    d.scene(tearable(bedroom));
    d.sfx('static', 0.2, 0.2);
    d.music('box', BOX[1]);
    await d.wait(0.5);
    await old('b1_hello');
    B.wave = 0;
    B.lookTarget = { x: 0.9, y: 0 };
    await old('b1_tonton_intro');
    B.lookTarget = null;
    T.lookTarget = { x: -0.8, y: 0 };
    await d.wait(0.3);
    T.lookTarget = null;
    await old('t1_hello', { after: 0.4 });
    // isim sorulmaz: kaset kimi hatırlıyorsa onu söyler (bu kopyayı en son halası izlemiş)
    B.wave = 1;
    {
      const nl = quiet(old('b1_name_known', { sub: NERMIN_SUB }));
      await d.wait(Math.min(0.9, voiceDur('b1_name_known') * 0.3));
      d.glitch(0.22, 0.2, false);
      await nl;
    }
    B.wave = 0;
    await d.wait(0.5);
    await gardenFrag();
    await d.wait(0.4);
    await autoRewind(2.4);

    // ---- SORU 1
    questionScene(1);
    await d.wait(0.5);
    await loopQuestion({
      key: 'change1',
      ask: 'k7_ask_change1',
      reask: 'k7_ask_change2',
      idle: ['b1_idle1', 'b1_idle2'],
      classify: classify1,
      hint: 'k7_hint1',
      replay: () => replay(gardenFrag, 1),
      truth: truth1,
      right: async (k) => {
        if (k === 'apple') {
          hop();
          d.sfx('cartoonPop');
          B.wave = 1;
          const rl = quiet(d.say('k7_right_apple'));
          await d.wait(Math.max(0.1, voiceDur('k7_right_apple') * 0.62));
          // "Ben hep yedi derim." gülümseme donar
          B.wave = 0;
          B.expr = 'frozen';
          B.lookTarget = { x: 0, y: 0 };
          await rl;
          await d.wait(0.5);
          B.expr = 'happy';
          B.lookTarget = null;
        } else {
          if (first) st.flags.k7Nermin = true;
          d.stopMusic(0.05);
          B.expr = 'frozen';
          B.lookTarget = { x: 0, y: 0 };
          await d.say('k7_right_name');
          await d.glitch(0.4, 0.3);
          await d.wait(0.4);
          B.expr = 'happy';
          B.lookTarget = null;
        }
      },
    });
    await d.wait(0.4);

    // ================================================================ 2. TUR: Tonton yok
    B.wave = 1;
    hop();
    await d.say('k7_again');
    B.wave = 0;
    v.loop = 2;
    d.stopMusic(0.05);
    tapeFx(AUDIO[2]);
    d.setBase(LOOK.copy2, 0.3);
    // bir saniyelik uyarı kartı: zaman atlaması
    d.sfx('static', 0.25, 0.2);
    d.scene((c, t) => S.warning(c, t));
    await d.wait(1.0);
    d.sfx('static', 0.2, 0.2);
    d.scene(title(0.3));
    d.music('jingle', { gain: 0.28, ...JINGLE[2] });
    await d.wait(0.6);
    rollSlip(0.55);
    await old('n_t1_title');
    await d.wait(1.6);
    d.music('box', BOX[2]);
    await bedroomFrag2();
    // GİZLİ: Tonton'un durması gereken yerde bir yığın pamuk ve tek düğme göz
    await d.wait(0.35);
    v.pamuk = true;
    d.tag({ secret: { id: 'pamuk', text: 'KUYRUĞUM NEREDE?' } });
    await d.wait(0.25);
    v.pamuk = false;
    d.tag(null);
    await d.wait(0.5);
    B.lookTarget = null;
    // piknik (kopya sepet sorusunu atlıyor)
    d.sfx('static', 0.15, 0.15);
    Object.assign(B, { x: 230, y: 455, scale: 1, tilt: 0.04 });
    d.scene(tearable(picnic));
    await old('b1_picnic');
    // cevap kutusu açılmaz; Beste gülümseyerek bekler... (yanlış sakinlik)
    await d.wait(1.8);
    // KORKUTMA 1: boşluktan dikişli Tonton
    await d.jumpscare({ draw: (c, t) => K.tontonScare(c, t), sec: 0.45 });
    d.stopMusic(0.05);
    d.sfx('static', 0.3, 0.3);
    // otomatik geri sarma; şeritlerin altında, kısık sesle ters bir fısıltı
    await autoRewind(2.2, { rev: 'k7_ters' });

    // ---- SORU 2
    questionScene(2);
    rollSlip(0.5);
    await d.wait(0.5);
    await loopQuestion({
      key: 'change2',
      ask: 'k7_ask_change2',
      reask: 'k7_ask_change2',
      idle: ['b1_idle2'],
      classify: classify2,
      hint: 'k7_hint2',
      replay: () => replay(bedroomFrag2, 2),
      truth: truth2,
      right: async () => {
        d.stopMusic(0.2);
        B.expr = 'neutral';
        B.lookTarget = { x: 0.9, y: 0.3 };
        v.shadow = 1;
        await d.say('k7_right_tonton');
        await d.wait(0.5);
        B.lookTarget = null;
      },
    });
    await d.wait(0.4);

    // ================================================================ 3. TUR: adam saklanmıyor
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    d.stopMusic(0.05);
    await d.say('k7_again2');
    v.loop = 3;
    tapeFx(AUDIO[3]);
    d.setBase(LOOK.copy3, 0.3);
    d.sfx('static', 0.3, 0.2);
    d.scene(title(0.6));
    d.music('jingle', { gain: 0.26, ...JINGLE[3] });
    await d.wait(0.7);
    rollSlip(0.7);
    await old('n_t1_title');
    await d.wait(1.4);
    d.music('box', BOX[3]);
    await forestFrag(true);
    // Tonton'un sesi var, kendisi yok
    B.lookTarget = { x: 0.6, y: 0 };
    await old('t1_forest');
    B.lookTarget = { x: 0.5, y: 0.1 };
    await old('b1_forest_noone');
    B.lookTarget = { x: 0, y: 0 };
    B.expr = 'frozen';
    d.stopMusic(0.05);
    d.tweens.add(v, 'manTilt', 0.26, 3.5);
    await old('b1_forest_noone2');
    await d.wait(1.2);
    rollSlip(0.6);
    B.expr = 'neutral';
    B.lookTarget = null;
    await d.wait(0.8);
    await autoRewind(2.0);

    // ---- SORU 3
    questionScene(3);
    await d.wait(0.5);
    await loopQuestion({
      key: 'change3',
      ask: 'k7_ask_change3',
      reask: 'k7_ask_change3',
      idle: ['b1_idle3'],
      classify: classify3,
      hint: 'k7_hint3',
      replay: () => replay(() => forestFrag(false), 3),
      truth: truth3,
      right: async () => {
        d.stopMusic(0.2);
        d.tweens.add(v, 'manTilt', 0.36, 2.5);
        await d.say('k7_right_man');
        await d.wait(0.6);
      },
    });
    await d.wait(0.5);

    // ================================================================ KOPYA ÖLÜYOR: GERÇEK KAPI
    // otomatik geri sarma yarıda takılır, görüntü vazgeçer
    {
      d.stopMusic(0.1);
      const prev = d.sceneFn;
      const c0 = d.counter();
      const T0 = sceneT();
      const sv = { s: 0 };
      d.osdUntil = 0;
      startLoop('rewind');
      d.fx({ tracking: 1.3, jitter: 1.1 }, 0.15);
      d.scene((c, t) => {
        prev?.(c, Math.max(0, T0 - t * 3 * (1 - sv.s)), d);
        K.rewindOverlay(c, d.time, { counter: c0 - t * 45 * (1 - sv.s * 0.9), stall: sv.s, blink: true });
      });
      try {
        await d.wait(1.3);
        d.tweens.add(sv, 's', 1, 1.1);
        await d.wait(1.1);
      } finally {
        stopLoop();
      }
      d.sfx('vcrStuck', P.vcr);
      await d.wait(0.6);
    }
    // ileri sarma burada işlemez (oda gerçek zamanlı); duraklatma sessizliktir
    d.stopFF();
    d.noFF = true;
    v.loop = 4;
    tapeFx(['t3', { rate: 1, wow: 4, hiss: 0.09, lp: 2600 }], 1);
    d.setBase(LOOK.worn, 0.6);
    const worn = { snow: 0.55 };
    d.scene((c, t) => K.wornCopy(c, t, { snow: worn.snow }));
    d.tweens.add(worn, 'snow', 0.9, 2.2);
    d.sfx('static', 1.6, 0.22);
    await d.wait(2.6);
    await d.say('k7_snow');
    await d.wait(1.6);
    const knocks = [];
    const knockSeries = async (n, gap) => {
      d.sfx('knock', P.door, n, gap);
      caption('[kapı çalınıyor]', n * gap + 0.9);
      await d.wait(n * gap + 0.9);
    };

    // ---- 1: üç vuruş
    await knockSeries(3, 0.5);
    await d.wait(0.7);
    await d.say('k7_knock1');
    {
      const a = await d.ask({ idle: ['b1_idle3'], maxLen: 14 });
      knocks.push(a);
      if (!dontKnow(a) && parseNum(a) === 3) await d.say('k7_k1_ok');
      else {
        await d.say('k7_k1_no');
        // OLAY: "Dikkatli dinle." Kapı yeniden çalınır, daha yavaş; ampul titrer
        await d.wait(0.6);
        flicker(0.5);
        await knockSeries(3, 0.85);
      }
    }
    await d.wait(2.0);

    // ---- 2: yedi yavaş vuruş
    await knockSeries(7, 0.9);
    await d.wait(0.5);
    await d.say('k7_knock2');
    {
      const a = await d.ask({ idle: ['b1_idle3'], maxLen: 14 });
      knocks.push(a);
      if (!dontKnow(a) && parseNum(a) === 7) await d.say('k7_k2_ok');
      else {
        await d.say('k7_k2_no');
        // OLAY: biri, tam arkanda, fısıltıyla sayar
        await d.wait(0.9);
        await d.sayRoom('k7_room_yedi', { pos: 'behind', gain: 1.2, rate: 0.95 });
        await d.wait(0.8);
      }
    }

    // ---- 3: dört saniye sessizlik, vuruş yok: kapı kolu döner
    await d.wait(4.0);
    d.sfx('handle', P.door, 4);
    caption('[kapı kolu tıkırdıyor]', 2.2);
    bulb(0.7, 1);
    await d.wait(2.4);
    await d.say('k7_knock3');
    {
      const a = await d.ask({ idle: ['b1_idle3'], maxLen: 18 });
      knocks.push(a);
      if (knock0(a)) await d.say('k7_k3_ok');
      else {
        await d.say('k7_k3_no');
        // OLAY: kapı, hiç açılmadan, ağırlık verilmiş gibi gıcırdar; ampul bir an daha kısılır
        await d.wait(0.5);
        d.sfx('creak', P.door, 1.8);
        bulb(0.45, 0.4);
        await d.wait(1.9);
        bulb(0.7, 1.2);
      }
    }
    ans.knocks = knocks;
    await d.wait(0.6);
    await d.say('k7_dontopen');
    // yanlış sakinlik: yalnızca cızırtı...
    await d.wait(3.0);
    // KORKUTMA 2: kar bir an çekilir: anahtar deliğinden bakan bir göz (ses arkandan, kapıdan)
    await d.jumpscare({ draw: (c, t) => K.keyholeEye(c, t), sec: 0.5, room: true });
    d.sfx('static', 0.5, 0.3);
    await d.wait(1.6);
    d.noFF = false;

    // ================================================================ PÜRÜZSÜZ SON TUR
    await d.say('k7_again3');
    d.sfx('splice');
    tapeFx(AUDIO[4], 0.1);
    d.setBase(LOOK.pristine, 0.05);
    bulb(1, 2.5);
    Object.assign(B, { x: 320, y: 460, scale: 1.04, expr: 'happy', wave: 0, lookTarget: null, tilt: 0 });
    v.turn = 0;
    v.tonton = false;
    d.osdUntil = 0;
    d.scene(pristine);
    d.music('box', BOX[4]);
    await d.wait(1.4);
    // duvara dönük, normal hızda
    await old('b1_hello');
    await d.wait(0.6);
    d.stopMusic(1.2);
    await d.wait(4.0);
    await d.say('k7_ask_final');
    let fin = await d.ask({ evil: true, maxLen: 24 });
    let fk = classifyFinal(fin);
    if (!fk) {
      await d.say('k7_hint4');
      fin = await d.ask({ evil: true, maxLen: 24 });
      fk = classifyFinal(fin);
    }
    ans.final = fin;
    if (fk === 'you') await d.say('k7_final_you');
    // üç basamaklı dönüş, sonra yüzsüz yüz kameranın dibinde
    await d.wait(0.8);
    v.turn = 1;
    d.sfx('creakTv');
    await d.wait(0.45);
    v.turn = 2;
    d.sfx('creakTv');
    await d.wait(0.45);
    v.turn = 3;
    // KORKUTMA 3
    await d.jumpscare({ draw: (c, t) => K.blankScare(c, t), sec: 0.55 });
    flicker(0.5);
    await d.wait(1.0);
    await d.say('k7_final_right');
    d.sfx('sting');
    d.glitch(0.5, 0.4);
    await d.wait(1.6);

    // ================================================================ TAKILDI: "Bir daha. Bir daha. Bir daha."
    d.stopFF();
    d.noFF = true;
    d.sfx('splice');
    tapeFx(['t3', { rate: 1, wow: 5, hiss: 0.05 }], 0.1);
    d.setBase(LOOK.stuck, 0.05);
    const sv = { mode: 'warn', j: 1, fade: 0, skip: 0, cycle: 0, counter: d.counter() };
    d.scene((c, t) => (sv.mode === 'warn' ? K.jitterWarning(c, t, { j: sv.j }) : K.stuckTitle(c, t, sv)));
    await d.say('k7_loop5');
    await d.wait(0.3);
    sv.mode = 'title';
    d.sfx('static', 0.3, 0.2);
    d.tweens.add(sv, 'fade', 1, 2.4);
    d.music('jingle', { tempo: 152, gain: 0.26, loop: true });
    {
      const m = g.audio.music;
      if (m?.o) {
        d.tweens.add(m.o, 'tempo', 30, 22, (x) => x);
        d.tweens.add(m.o, 'detune', -320, 22, (x) => x);
      }
    }
    await d.wait(1.2);
    await d.say('k7_title');
    // GİZLİ ÇIKIŞ: sol ok 1.5 sn basılı tutulursa bant geri sarılıp kurtulur
    stuck = true;
    d.onRewindHold = (held) => {
      if (!stuck || escaped) return false;
      if (held >= 1.5 && g.input?.rewindHeld) {
        escaped = true;
        d.stopRewind(true);
        return true;
      }
      return false;
    };
    const t0 = d.time;
    let nextSkip = d.time + 3.4;
    let again = false;
    while (!escaped && d.time - t0 < 25) {
      await d.wait(0.1);
      if (escaped) break;
      // kart bir an geriye sıçrar, yeniden belirir: döngü
      if (d.time >= nextSkip) {
        nextSkip = d.time + 3.2 + Math.random() * 1.2;
        sv.skip = 1;
        sv.cycle++;
        d.tweens.add(sv, 'skip', 0, 0.5);
        sv.fade = 0.55;
        d.tweens.add(sv, 'fade', 1, 1.2);
        d.sfx('warble');
      }
      if (!again && d.time - t0 > 12) {
        again = true;
        d.sayAsync('k7_loop5', { rate: 0.86, gain: 0.7 });
      }
    }
    stuck = false;
    d.onRewindHold = null;

    if (escaped) {
      // gerçek Beste, düz konuşur; ekran tertemiz kararır
      d.stopMusic(0.05);
      g.audio.stopVoices?.(false);
      d.osdUntil = 0;
      d.setBase(LOOK.black, 0.05);
      g.audio.setHiss(false);
      d.scene((c) => K.cleanBlack(c));
      await d.wait(1.2);
      await d.say('k7_rewound', { gain: 0.85 });
      if (first) st.flags.k7Rewound = true;
      await d.wait(1.4);
    } else {
      // bant kopar: keskin bir tık, makaralar boşa döner, görüntü aşağı yırtılır
      d.sfx('tapeSnap');
      const m = g.audio.music;
      if (m?.o) d.tweens.add(m.o, 'detune', -1400, 0.6);
      d.realTimeout(() => d.stopMusic(0.3), 0.5);
      const last = d.sceneFn;
      d.scene((c, t) => K.tearDown(c, t, (cc) => last(cc, t)));
      rollSlip(1.1);
      d.glitch(0.8, 1.0);
      await d.wait(1.6);
    }

    // ---- sıcak-soğuk: kar üstünde
    d.scene((c, t) => S.staticNoise(c, t, 1));
    d.setBase(LOOK.stuck, 0.3);
    g.audio.setHiss(true);
    d.sfx('static', 1.4, 0.25);
    await d.wait(1.2);
    await d.say('k7_hc_intro');
    await d.wait(2.2);
    d.noFF = false;
    if (first) st.answers.k7 = { ...ans };
    if (st.room) st.room.bulbDead = false;
  } finally {
    stopLoop();
    d.onPause = null;
    d.onRewindHold = null;
    d.voiceMods = {};
    d.noFF = false;
  }
  return ejectTries;

  /** Jenerik başlarken tavan arasının ölü ampulü kendiliğinden yanar (gösteri ışığını senin için açtı) */
  function lightReturns() {
    st.room = st.room || {};
    st.room.bulbDead = false;
    if (st.room.lightOff) return;
    if (g.room.moon) g.room.tweens?.add?.(g.room.moon, 'intensity', 0.5, 1.5);
    if (lowFlash) {
      g.room.setBulb(1, 1.2);
      return;
    }
    g.room.setBulb(1, 0.4);
    g.room.flickerBurst(0.3);
    d.realTimeout(() => g.room.flickerBurst(0.25), 0.75);
    d.realTimeout(() => g.room.flickerBurst(0.35), 1.6);
  }
}

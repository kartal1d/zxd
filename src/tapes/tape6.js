// KASET 6 — "İyi ki Doğdun Beste!" (mum ışığı: yalanı bir belgeyle yakalamak; odanın ışığını alan doğum günü)
import * as S from '../draw/scenes.js';
import * as K from '../draw/scenes6.js';
import { drawBeste, drawTonton } from '../draw/characters.js';
import { has, norm, digits } from '../util.js';
import { parseNum } from './common.js';

const BASE = { saturation: 0.55, tintR: 1.15, tintG: 0.92, tintB: 0.75, noise: 0.09, tracking: 0.32, jitter: 0.25, aberration: 1.4, glitch: 0, roll: 0, pixel: 0, brightness: 1.5 };
const DARK = { saturation: 0.5, tintR: 1.25, tintG: 0.8, tintB: 0.55, noise: 0.12, tracking: 0.36, jitter: 0.26, aberration: 1.5 };
const RED = { tintR: 1.3, tintG: 0.6, tintB: 0.55 };
const RED_SOFT = { tintR: 1.2, tintG: 0.78, tintB: 0.66 };
const TINT = { tintR: BASE.tintR, tintG: BASE.tintG, tintB: BASE.tintB };
const TINT_DARK = { tintR: DARK.tintR, tintG: DARK.tintG, tintB: DARK.tintB };
const FX = { echo: 0.18, wow: 2.0, lp: 4400, hiss: 0.026, rate: 0.98 };
const FX_DARK = { echo: 0.3, wow: 2.5, lp: 3300, hiss: 0.034, rate: 0.96 };
/** Müzik kutusunda yavaş, akort dışı "İyi ki doğdun" */
const BOX = { song: 'birthday', tempo: 92, detune: -120, gain: 0.11, loop: true };
const PLAQUE = 'İYİ Kİ DOĞDUN BESTE';

// ---------------------------------------------------------------- cevap sınıflandırma
const DONT = ['bilmiyorum', 'bilmiyom', 'bilmem', 'hatirlamiyorum', 'hatirlamiyom', 'hatirlamam', 'unuttum', 'unutdum', 'fikrim yok', 'bilemedim', 'emin degilim', 'bilmiyoz'];
const words = (txt) => norm(txt).split(' ').filter(Boolean);
/** "bilmiyorum", "hatırlamıyorum", "unuttum" yanlış cevap sayılır */
const dontKnow = (txt) => !txt || has(txt, ...DONT);
/** Okul kartındaki doğum tarihi (03.02.1991): "3 Şubat", "0302", "3.2.1991"... */
const febDigits = (txt) => /^(0302|302|32|0203)/.test(digits(txt));
const isFeb = (txt) => has(txt, 'subat') || febDigits(txt);

/** "Bugün kimin doğum günü?" */
function classifyWho(txt, name) {
  if (dontKnow(txt)) return 'wrong';
  if (isFeb(txt) || has(txt, 'yalan', 'degil')) return 'catch';
  const w = words(txt);
  const nm = norm(name || '');
  if (w.includes('benim') || w.includes('ben') || (nm.length > 1 && w.includes(nm) && nm !== 'beste')) return 'player';
  if (has(txt, 'senin', 'sen', 'beste', 'onun', 'kizin')) return 'beste';
  return 'wrong';
}
/** "Benim doğum günüm ne zaman?" */
function classifyDate(txt) {
  if (dontKnow(txt)) return 'wrong';
  if (isFeb(txt)) return 'catch';
  const dg = digits(txt);
  if (has(txt, 'bugun', 'bu gun', 'mayis', 'simdi') || dg.startsWith('14') || dg.includes('1405')) return 'today';
  return 'wrong';
}
/** Dilek: onu kurtarmak mı, gitmesini istemek mi, sıradan bir dilek mi */
function classifyWish(txt) {
  const w = words(txt);
  const who = has(txt, 'beste', 'kiz', 'onu');
  if (who && (has(txt, 'kurtul', 'kurtar', 'evine', 'don', 'bulun', 'kac', 'ozgur') || w.includes('eve'))) return 'save';
  if (has(txt, 'gitsin', 'defol', 'yok ol', 'yansin', 'kaybol') || w.some((x) => x === 'git' || x === 'yan')) return 'gone';
  return 'any';
}
/** Pastaya krema ile yazılacak düz metin (büyük harf, en çok 18 karakter) */
function icing(txt) {
  const s = String(txt || '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('tr')
    .slice(0, 18)
    .trim();
  return s || '...';
}
/** Ses dosyası yoksa heceden süre tahmini */
function syllables(t) {
  return (String(t).toLocaleLowerCase('tr').match(/[aeıioöuü]/g) || []).length;
}

export async function tape6(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const T = d.chars.tonton;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const NAME = (st.name || 'Arkadaşım').toLocaleUpperCase('tr');
  const PT = K.PARTY;
  const v = {
    still: false,
    ft: 0,
    besteFront: true,
    cake: { lit: 0 },
    close: { lit: 7, plaque: PLAQUE },
    match: null,
    cardGlow: null,
    cardGlowA: 0,
    cal14: 0,
    calAll: 0,
    calThu: false,
    dark: 0,
    glow: 150,
    man: 0,
    manSit: false,
    curl: 0,
    countdown: null,
    quiz: 0,
    tear: 0,
    red: 0,
    confettiT: null,
  };
  let caught = false;
  let bulbKilled = false;
  const moon0 = g.room.moon?.intensity;

  g.audio.setTapeFx('t2', 0.1, FX);
  g.audio.setHiss(true);
  d.setBase(BASE, 0.1);
  d.eyeMode = 'viewer';
  d.voiceMods = { tonton: { rate: 0.93, detune: -70 } };
  let ejectTries = 0;
  d.ejectPolicy = () => {
    ejectTries++;
    if (!d.voice && ejectTries <= 3) d.sayAsync('b2_eject');
    d.glitch(0.5, 0.35);
    return false;
  };

  Object.assign(B, { ...PT.besteFront, expr: 'happy', wave: 0, tilt: 0, lookTarget: null, frozenMouth: false });
  Object.assign(T, { ...PT.tonton, stitched: true, tail: true, frozenMouth: true, expr: 'happy', tremble: 0, lookTarget: null, tailColor: null, hatTilt: -0.12 });

  // ---------------------------------------------------------------- yardımcılar
  const sceneT = () => d.time - d.sceneT0;
  const quiet = (p) => {
    p.catch(() => {});
    return p;
  };
  const voiceDur = (id) => {
    const b = g.audio.duration?.(id) || 0;
    if (b > 0) return b / (g.audio.fx?.rate || 1);
    return syllables(g.lines[id]?.t || '') * 0.19 + 0.4;
  };
  const au = g.audio;
  /** TV'den kısa gürültü (sekizinci mumun cızırtısı, krema sıkma) */
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
  const hop = () => {
    const y0 = B.y;
    d.tweens.add(B, 'y', y0 - 20, 0.14);
    d.realTimeout(() => d.tweens.add(B, 'y', y0, 0.2), 0.16);
  };
  const glowCard = (which, sec = 4) => {
    v.cardGlow = which;
    v.cardGlowA = 1;
    d.tweens.add(v, 'cardGlowA', 0, sec);
  };

  // ---------------------------------------------------------------- çizim
  const drawB = (c) => {
    const s = { ...B, t: d.time };
    drawBeste(c, s);
    K.besteHat(c, s);
  };
  const drawT = (c) => {
    // dikişli Tonton kıpırdamaz (zaman donuk), ağzı hiç açılmaz
    const s = { ...T, t: 0, mouth: 0 };
    drawTonton(c, s);
    K.tontonHat(c, s);
  };
  const party = (c, t) => {
    const tt = v.still ? v.ft : t;
    K.bgParty(c, t, {
      name: NAME,
      still: v.still,
      ft: v.ft,
      drawTonton: drawT,
      drawBeste: drawB,
      besteFront: v.besteFront,
      cake: v.cake,
      cardGlow: v.cardGlow,
      cardGlowA: v.cardGlowA,
      cal14: v.cal14,
      dark: v.dark,
      glow: v.glow,
      man: v.man,
      manSit: v.manSit,
      curl: v.curl,
      besteLight: v.dark > 0 ? { x: B.x, y: B.y, scale: B.scale } : null,
      countdown: v.countdown,
    });
    if (v.quiz > 0) K.quizCard(c, tt, { p: v.quiz, banner: 'DOĞUM GÜNÜ YARIŞMASI' });
    if (v.confettiT != null && !v.still) K.confetti(c, d.time, v.confettiT);
    if (v.red > 0) K.redEdge(c, v.red);
  };
  const partyScene = (c, t) => (v.tear > 0.02 ? S.corrupt(c, (cc) => party(cc, t), v.tear, d.time) : party(c, t));
  const cakeScene = (c, t) => {
    K.cakeClose(c, t, { ...v.close, match: v.match });
    if (v.confettiT != null) K.confetti(c, d.time, v.confettiT);
    if (v.red > 0) K.redEdge(c, v.red);
  };
  const calScene = (c, t) => K.calendarClose(c, t, { all14: v.calAll, thu: v.calThu });

  // ================================================================ açılış: parti şapkalı jenerik
  d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
  await d.wait(1.4);
  d.sfx('static', 0.4);
  d.scene((c, t) => {
    S.titleCard(c, t, { episode: '6. Bölüm', title: 'İyi ki Doğdun Beste!', decay: 0.5 });
    K.titleHats(c, t);
  });
  d.music('box', { ...BOX, gain: 0.16 });
  await d.wait(1.4);
  await d.say('k6_title', { rate: 0.96 });
  await d.wait(3.0);

  // ================================================================ parti odası
  d.sfx('static', 0.25, 0.2);
  d.scene(partyScene);
  d.music('box', BOX);
  await d.wait(0.7);
  // süreklilik çatlağı: etiket bir an hâlâ oyuncunun adı (5. kasetten kalma), sonra BESTE'ye döner
  B.wave = 1;
  {
    let done = false;
    const hello = d.say('k6_hello', { label: NAME });
    quiet(hello).finally(() => (done = true));
    await d.wait(1.0);
    if (!done) {
      const l = g.lines.k6_hello;
      g.ui.subtitle('BESTE', d.fmt(l.s || l.t), '');
      d.glitch(0.35, 0.18);
    }
    await hello;
  }
  B.wave = 0;
  await d.wait(0.3);

  // ---- SORU: "Bugün kimin doğum günü?" (üç yanlışta gerçek + kapı çalınır)
  await d.say('k6_ask_who');
  for (let wrong = 0; ; ) {
    const txt = await d.ask({ idle: ['b1_idle1', 'b1_idle2'], maxLen: 24 });
    const k = classifyWho(txt, st.name);
    if (k === 'catch') {
      if (first) st.answers.bdayText = txt;
      await catchLie(txt);
      break;
    }
    if (k === 'beste') {
      B.wave = 1;
      v.confettiT = d.time;
      d.sfx('cartoonPop');
      await d.say('k6_who_right');
      B.wave = 0;
      break;
    }
    if (k === 'player') {
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      await d.say('k6_who_player');
      await d.wait(0.4);
      B.expr = 'happy';
      B.lookTarget = null;
      B.wave = 1;
      v.confettiT = d.time;
      await d.say('k6_who_right');
      B.wave = 0;
      break;
    }
    wrong++;
    if (wrong >= 3) {
      await truthWho();
      break;
    }
    if (wrong === 1) {
      hop();
      d.sfx('cartoonPop');
      await d.say('k6_who_hint1');
    } else {
      glowCard('beste', 5);
      await d.say('k6_who_hint2');
    }
  }
  v.confettiT = null;
  await calendar();

  // ---- misafirler, Tonton'un "şarkısı"
  {
    const gl = quiet(d.say('k6_guests'));
    B.wave = 1;
    await d.wait(1.7);
    B.wave = 0;
    B.lookTarget = { x: 0.9, y: -0.3 };
    await d.wait(1.2);
    glowCard('ad', 3.5);
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(1.3);
    B.lookTarget = { x: 0.5, y: -0.4 };
    await gl;
    B.lookTarget = null;
  }
  await d.wait(0.3);
  d.music('box', { ...BOX, tempo: 80, detune: -190, gain: 0.09 });
  await d.say('k6_tonton');
  await d.wait(0.8);

  // ================================================================ mumlar
  d.sfx('match');
  for (let i = 1; i <= 7; i++) {
    v.cake.lit = i;
    await d.wait(0.2);
  }
  await d.wait(0.6);
  d.sfx('static', 0.15, 0.15);
  v.close = { lit: 7, plaque: PLAQUE };
  d.scene(cakeScene);
  d.music('box', BOX);
  await d.wait(0.6);
  await d.say('k6_ask_candles');
  for (let wrong = 0; ; ) {
    const txt = await d.ask({ idle: ['b1_idle2'], maxLen: 16 });
    if (!dontKnow(txt) && parseNum(txt) === 7) {
      v.confettiT = d.time;
      d.sfx('cartoonPop');
      await d.say('k6_candles_right');
      break;
    }
    wrong++;
    if (wrong >= 3) {
      await truthCandles();
      break;
    }
    await d.say(wrong === 1 ? 'k6_candles_hint1' : 'k6_candles_hint2');
  }
  v.confettiT = null;
  await d.say('k6_candles_eight');
  // boşluğa gri, sekizinci bir mum belirir
  v.close.eighth = 'unlit';
  v.close.pop8 = sceneT();
  d.sfx('cartoonPop');
  await d.wait(0.7);

  // ---- sekizinci mum (açık soru: evet / hayır)
  await d.say('k6_ask_light');
  const lightTxt = await d.ask({ idle: ['b1_idle2'], maxLen: 20 });
  const refuse = has(lightTxt, 'hayir', 'yakmam', 'yakmayacagim', 'yakmicam', 'yakmiycam', 'istemem', 'istemiyorum', 'yok', 'olmaz');
  if (first) st.flags.lit8 = !refuse;
  if (!refuse) {
    // kibrit çakılır, mum yanar... ve bir saniye sonra kendiliğinden söner. Rüzgâr yok, diğerleri kıpırdamaz.
    v.match = { p: 0, fire: false };
    d.tweens.add(v.match, 'p', 1, 0.6);
    await d.wait(0.65);
    d.sfx('match');
    v.match.fire = true;
    await d.wait(0.55);
    v.close.eighth = 'lit';
    v.close.eighthT = sceneT();
    d.tweens.add(v.match, 'p', 0, 0.5);
    await d.wait(0.55);
    v.match = null;
    await d.wait(0.5);
    tvNoise(0.3, { type: 'highpass', freq: 4200, gain: 0.12, attack: 0.01 });
    v.close.eighth = 'out';
    v.close.smoke8 = sceneT();
    await d.wait(1.0);
    await d.say('k6_light_yes');
  } else {
    await d.say('k6_light_no');
    // yine de sekizinci yuvadan ince gri bir duman yükselir
    v.close.smoke8 = sceneT();
    await d.wait(0.6);
  }

  // ---- KORKUTMA 1: duman kıvrılır, sessizlik... ve Beste kameranın dibinde
  d.stopMusic(0.8);
  await d.wait(2.3);
  await d.jumpscare({ draw: (c, t) => K.besteScare(c, t), sec: 0.55 });
  d.sfx('static', 0.25, 0.25);

  // ================================================================ doğum günü bilgi yarışması
  v.besteFront = false;
  Object.assign(B, { ...PT.besteBehind, expr: 'happy', wave: 0, lookTarget: null });
  v.cake = { lit: 7, eighth: 'out' };
  v.quiz = 0;
  d.scene(partyScene);
  d.music('box', { ...BOX, tempo: 100, detune: -80 });
  d.sfx('talkShowSting');
  d.tweens.add(v, 'quiz', 1, 0.8);
  await d.wait(0.5);
  B.wave = 1;
  await d.say('k6_quiz');
  B.wave = 0;
  await d.wait(0.4);
  await reversedBurst();
  // sanki hiçbir şey olmamış gibi yarışma kartına dönülür
  d.scene(partyScene);
  d.music('box', { ...BOX, tempo: 100, detune: -80 });
  await d.wait(0.3);
  await d.say('k6_ask_date');
  for (let wrong = 0; ; ) {
    const txt = await d.ask({ idle: ['b1_idle2', 'b1_idle3'], maxLen: 24 });
    const k = classifyDate(txt);
    if (k === 'catch') {
      if (first) st.answers.bdayText = txt;
      if (caught) {
        // yalanı zaten yakaladın: ikinci kez duymak istemiyor
        d.stopMusic(0.05);
        B.expr = 'frozen';
        B.lookTarget = { x: 0, y: 0 };
        d.glitch(0.6, 0.4);
        await d.say('k6_date_again');
        await d.wait(0.5);
        d.sfx('click');
        B.expr = 'happy';
        B.lookTarget = null;
        d.music('box', BOX);
      } else await catchLie(txt);
      break;
    }
    if (k === 'today') {
      if (first) st.answers.bdayText = txt;
      v.confettiT = d.time;
      d.sfx('cartoonPop');
      B.wave = 1;
      await d.say('k6_date_today');
      B.wave = 0;
      break;
    }
    wrong++;
    if (wrong >= 3) {
      await truthDate();
      break;
    }
    if (wrong === 1) await d.say(dontKnow(txt) ? 'k6_date_hint1' : 'b_unknown');
    else {
      v.cal14 = 1;
      await d.say('k6_date_hint2');
    }
  }
  if (first) {
    st.flags.caughtLie = caught;
    st.answers.bday = caught ? '03.02.1991' : '14.05.1998';
  }
  d.tweens.add(v, 'quiz', 0, 0.4);
  await d.wait(0.6);
  v.confettiT = null;

  // ================================================================ dilek
  d.sfx('static', 0.15, 0.15);
  v.close = { lit: 7, eighth: 'out', plaque: '', plaqueP: 0 };
  d.scene(cakeScene);
  await d.wait(0.5);
  await d.say('k6_wish');
  const wishTxt = await d.ask({ idle: ['b1_idle1', 'b1_idle2'], maxLen: 24 });
  const WISH = icing(wishTxt);
  if (first) st.answers.wish = WISH;
  // pembe kremayla pastaya yazılır
  v.close.plaque = WISH;
  d.tweens.add(v.close, 'plaqueP', 1, 1.4, (x) => x);
  for (let i = 0; i < 4; i++) {
    tvNoise(0.3, { type: 'bandpass', freq: 900 + i * 120, q: 1.2, gain: 0.06, attack: 0.05 });
    await d.wait(0.36);
  }
  await d.wait(0.4);
  const wk = classifyWish(wishTxt);
  await d.say(wk === 'save' ? 'k6_wish_save' : wk === 'gone' ? 'k6_wish_gone' : 'k6_wish_any');
  if (!caught) {
    // yalanı yakalamayanlar da öğrenir: fısıltıyla bir "sır"
    d.stopMusic(0.8);
    await d.wait(1.0);
    await revealLine('k6_reveal_soft');
  }
  await d.wait(0.6);

  // ================================================================ mumları üfle
  d.sfx('static', 0.15, 0.15);
  v.cake = { lit: 7, eighth: 'out' };
  Object.assign(B, { ...PT.besteBehind, expr: 'happy', wave: 0, lookTarget: null });
  d.scene(partyScene);
  d.music('box', { ...BOX, tempo: 104, detune: -60 });
  {
    const bl = quiet(d.say('k6_blow'));
    const bd = voiceDur('k6_blow');
    await d.wait(bd * 0.42);
    for (const n of [1, 2, 3]) {
      v.countdown = { n, t0: sceneT() };
      d.sfx('cartoonPop');
      await d.wait(Math.max(0.3, bd * 0.14));
    }
    v.countdown = { n: 'ÜFLE!', t0: sceneT() };
    await bl;
  }
  d.stopMusic(0.3);
  const blowTxt = await d.ask({ options: ['ÜFLE'], idle: ['b1_idle1'], timeout: 25, maxLen: 16 });
  v.countdown = null;
  if (blowTxt == null) {
    // 25 sn cevap yok: senin yerine o üfler, sonuç aynı
    await d.say('k6_blow_self');
    await d.wait(0.3);
  }
  if (first) st.flags.blewCandles = blowTxt != null;
  // nefes TV'den değil, oyuncunun arkasından (sandalyenin arkasından) gelir
  d.sfx('blow', P.behind);
  await d.wait(0.6);
  // GERÇEK tavan arası ampulü patlar ve söner
  g.room.setFlicker(false);
  g.room.setBulb(0, 0.05);
  d.sfx('pop', P.bulb);
  tvNoise(0.05, { type: 'highpass', freq: 2500, gain: 0.0 });
  if (g.room.moon) g.room.tweens.add(g.room.moon, 'intensity', 0.3, 0.3);
  bulbKilled = true;
  if (first) st.room.bulbDead = true;
  // ekrandaki yedi mum hâlâ yanıyor; parti odası karanlık, Beste alttan aydınlanıyor
  v.dark = 1;
  v.glow = 150;
  d.setBase(DARK, 0.15);
  g.audio.setTapeFx('t2', 1, FX_DARK);
  g.ambience?.setDrone?.(0.05, 4);
  d.eyeMode = 'track';
  await d.wait(2.0);
  await d.say('k6_wrong_candles');
  await d.say('b_laugh_cold');
  await d.wait(0.8);
  await d.say('k6_dark');
  await d.wait(1.2);

  // ================================================================ son misafir
  v.man = 1;
  d.tweens.add(v, 'glow', 440, 7.5);
  d.tweens.add(v, 'curl', 1, 9);
  await d.wait(6.8);
  d.sfx('heartbeat', 2, 0.9);
  await d.wait(2.0);
  B.lookTarget = { x: 0.9, y: 0.15 };
  await d.say('k6_last_guest');
  // GİZLİ: bir an adam, oyuncunun adı yazılı küçük sandalyede oturuyor
  await d.wait(0.3);
  v.manSit = true;
  d.tag({ secret: { id: 'misafir', text: 'SENİN YERİN' } });
  await d.wait(0.3);
  v.manSit = false;
  d.tag(null);
  await d.wait(1.3);
  B.lookTarget = { x: 0, y: 0 };
  await d.say('k6_self_blow');
  // Beste eğilip üfler: mumlar söner, ekran neredeyse kapkara
  d.tweens.add(B, 'scale', B.scale * 1.05, 0.3);
  d.sfx('whoosh');
  await d.wait(0.4);
  v.cake = { ...v.cake, out: true, smokeAll: sceneT() };
  d.scene((c, t) => K.nearBlack(c, t, { eyes: { x: B.x, y: B.y - 205 * B.scale, scale: B.scale, lx: B.look.x, ly: B.look.y }, smokeT: 0 }));
  g.ambience?.setDrone?.(0.08, 3);
  await d.wait(1.8);
  await d.say('k6_gift');
  await d.wait(1.6);

  // ---- bozulmuş jenerik
  d.sfx('static', 0.3, 0.2);
  d.scene((c, t) => S.endCard(c, t, { decay: true }));
  d.music('box', { ...BOX, tempo: 66, detune: -320, gain: 0.08, loop: false });
  await d.say('n_outro2');
  await d.wait(2.2);
  d.stopMusic(0.6);
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 2.4, 0.25);
  await d.wait(1.7);
  // KORKUTMA 3: kar bitti sanırken, yüzsüz misafir isim kartınla kameranın dibinde (ses arkandan)
  await d.jumpscare({ draw: (c, t) => K.manScare(c, t, { name: NAME }), sec: 0.6, room: true });
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 1.2, 0.3);
  g.ambience?.setDrone?.(0, 3);
  await d.wait(1.4);
  // tekrar izlemede (7. kasetten sonra) ampul geri gelir; ilk izlemede tavan arası karanlık kalır
  if (bulbKilled && !st.room.bulbDead) {
    g.room.flickerBurst(0.8);
    g.room.setBulb(st.room.lightOff ? 0 : 1, 0.6);
    if (g.room.moon && moon0 != null) g.room.tweens.add(g.room.moon, 'intensity', moon0, 1);
  }
  return ejectTries;

  // ================================================================ alt bölümler
  /** "Bugün kimin doğum günü?" sorusunda üçüncü yanlış: gerçek + gerçek kapı çalınır */
  async function truthWho() {
    d.stopMusic(0.1);
    B.expr = 'frozen';
    B.wave = 0;
    B.lookTarget = { x: 0, y: 0 };
    v.cardGlow = 'beste';
    v.cardGlowA = 1;
    await d.say('k6_who_truth');
    await d.wait(0.5);
    // OLAY: tavan arasının gerçek kapısı üç kez çalınır; Beste sese doğru bakar
    d.sfx('knock', P.door, 3, 0.62);
    await d.wait(0.5);
    B.lookTarget = { x: -0.95, y: -0.1 };
    await d.wait(1.9);
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k6_knock');
    await d.wait(0.6);
    d.tweens.add(v, 'cardGlowA', 0, 1);
    B.expr = 'happy';
    B.lookTarget = null;
    d.music('box', BOX);
  }

  /** Takvim: oyuncunun gerçek günü, "burada her gün Perşembe, her gün 14 Mayıs" */
  async function calendar() {
    const thu = new Date().getDay() === 4;
    d.sfx('static', 0.15, 0.15);
    v.calAll = 0;
    v.calThu = false;
    d.scene(calScene);
    d.stopMusic(0.4);
    const id = thu ? 'k6_calendar_thu' : 'k6_calendar';
    const line = quiet(d.say(id));
    const dur = voiceDur(id);
    d.tweens.add(v, 'calAll', 1, Math.max(1.5, dur * 0.85), (x) => x);
    await d.wait(thu ? dur * 0.3 : dur * 0.5);
    v.calThu = true;
    tvTone(98, 0.6, { type: 'sine', gain: 0.12, endFreq: 70 });
    await line;
    await d.wait(1.0);
    v.cal14 = 1; // odadaki küçük takvimde de artık her gün 14
    d.sfx('static', 0.15, 0.15);
    d.scene(partyScene);
    d.music('box', BOX);
    await d.wait(0.4);
  }

  /** Sekiz mum sorusunda üçüncü yanlış: birlikte sayılır + arkandan "Sekiz." */
  async function truthCandles() {
    v.close.nums = 0;
    v.close.numT = [];
    const line = quiet(d.say('k6_candles_wrong'));
    await d.wait(Math.min(1.0, voiceDur('k6_candles_wrong') * 0.18));
    for (let i = 1; i <= 7; i++) {
      v.close.numT.push(sceneT());
      v.close.nums = i;
      d.sfx('cartoonPop');
      await d.wait(0.42);
    }
    await line;
    // OLAY: boş yuvanın üstünde kırmızı bir 8 belirir, oyuncunun arkasından biri sayar, ampul titrer
    d.stopMusic(0.1);
    await d.wait(0.6);
    v.close.num8 = sceneT();
    g.room.flickerBurst(1.0);
    await d.sayRoom('k6_room_sekiz', { pos: 'behind', gain: 1.25, rate: 0.95 });
    await d.wait(1.4);
    v.close.nums = 0;
    v.close.num8 = null;
    d.music('box', BOX);
  }

  /** "Ne zaman?" sorusunda üçüncü yanlış: gerçek (onun gerçeği) + yüzü boşluğa döner, görüntü yırtılır */
  async function truthDate() {
    d.stopMusic(0.1);
    B.expr = 'frozen';
    B.wave = 0;
    B.lookTarget = { x: 0, y: 0 };
    v.cal14 = 1;
    await d.say('k6_date_truth');
    B.expr = 'void';
    d.sfx('boom');
    d.fx(lowFlash ? RED_SOFT : RED, 0.05);
    v.red = 1;
    v.tear = 0.85;
    d.glitch(0.9, 0.8);
    d.tweens.add(v, 'tear', 0, 1.0);
    await d.wait(1.0);
    d.fx(TINT, 0.6);
    d.tweens.add(v, 'red', 0, 0.6);
    await d.wait(1.0);
    d.sfx('click');
    B.expr = 'happy';
    B.lookTarget = null;
    d.music('box', BOX);
  }

  /** Ters mesaj: soru gelmeden önce iki saniyelik karla karışık kare (gerçek kız, ters fısıltı) */
  async function reversedBurst() {
    d.stopMusic(0.05);
    d.sfx('static', 0.6, 0.35);
    const t0 = d.time;
    const revText = [...g.lines.k6_ters.t].reverse().join('');
    d.scene((c, t) => {
      S.realGirl(c, t, { alpha: 0.45, flip: true });
      S.staticNoise(c, t, 0.4);
    });
    d.fx({ tracking: 0.9, jitter: 0.7 }, 0.1);
    d.tag({ rev: 'k6_ters' });
    await d.say('k6_ters', { file: 'k6_ters_rev', sub: revText });
    if (d.time - t0 < 2) await d.wait(2 - (d.time - t0));
    d.tag(null);
    d.fx(d.baseFx, 0.2);
    d.sfx('static', 0.3, 0.3);
  }

  /** "Ormanda." anında: kırmızı ton + bir an Çamlık (KORKUTMA 2) */
  async function revealLine(id) {
    const line = quiet(d.say(id));
    await d.wait(Math.max(0.15, voiceDur(id) - 1.05));
    d.fx(lowFlash ? RED_SOFT : RED, 0.04);
    v.red = 0.8;
    d.glitch(0.8, 0.5);
    await d.jumpscare({ draw: (c, t) => K.forestFlash(c, t), sec: 0.45 });
    v.tear = 0.3;
    d.tweens.add(v, 'tear', 0, 0.5);
    await d.wait(0.4);
    d.fx(v.dark > 0 ? TINT_DARK : TINT, 0.35);
    d.tweens.add(v, 'red', 0, 0.5);
    await line;
  }

  /** YALAN YAKALANDI: müzik batar, parti donar, "Sen bunu nereden biliyorsun?" ve itiraf */
  async function catchLie(txt) {
    caught = true;
    if (first) st.flags.caughtLie = true;
    // müzik batar (akort -1200 sente kayar) ve ölür
    const m = g.audio.music;
    if (m?.playing && m.o) {
      d.tweens.add(m.o, 'detune', -1200, 0.6);
      d.tweens.add(m.o, 'tempo', 40, 0.6);
    }
    tvTone(240, 0.9, { type: 'sawtooth', gain: 0.04, endFreq: 38 });
    d.realTimeout(() => d.stopMusic(0.4), 0.65);
    // her şey donar; alevler kıpırtısız üçgenler olur
    v.ft = sceneT();
    v.still = true;
    v.confettiT = null;
    B.expr = 'frozen';
    B.wave = 0;
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(2.0);
    await d.say(has(txt, 'subat') || febDigits(txt) ? 'k6_caught1' : 'k6_caught1_lie');
    await d.wait(0.6);
    await d.say('k6_caught2');
    // açık soru (kötü kutu, bekleme repliği yok; 20 sn sessizlikte kapanır)
    const how = await d.ask({ evil: true, timeout: 20, maxLen: 24 });
    if (how && has(how, 'kart', 'okul', 'kimlik', 'kutu', 'nermin', 'hala', 'hediye', 'etiket', 'yazi', 'kagit')) await d.say('k6_caught_card');
    else await d.say('k6_caught_any');
    await d.wait(0.5);
    await revealLine('k6_reveal');
    await d.wait(0.7);
    // gülümsemesi bir "tık" sesiyle geri gelir, hiçbir şey olmamış gibi devam eder
    d.sfx('click');
    B.expr = 'happy';
    B.lookTarget = null;
    v.still = false;
    await d.wait(0.5);
    d.music('box', BOX);
  }
}

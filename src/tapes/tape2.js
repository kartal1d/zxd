// KASET 2 — "Tonton Kedi'nin Kaybolan Kuyruğu" (çatlaklar başlıyor)
import * as S from '../draw/scenes.js';
import { drawPhoto, drawRealHand } from '../draw/characters.js';
import { has } from '../util.js';
import { parseNum } from './common.js';

export async function tape2(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const T = d.chars.tonton;
  const v = { shown: 0, highlight: null, night: 0, hand: 0, grip: 0, pull: 0, tontonGone: false, rev: false };

  g.audio.setTapeFx('t2', 0.1);
  g.audio.setHiss(true);
  d.setBase({ saturation: 0.62, noise: 0.075, tracking: 0.32, jitter: 0.24, aberration: 1.1, tintR: 1, tintG: 0.96, tintB: 0.9 }, 0.1);
  d.eyeMode = 'track';

  let ejectTries = 0;
  d.ejectPolicy = () => {
    ejectTries++;
    if (!d.voice) d.sayAsync('b2_eject');
    d.glitch(0.6, 0.4);
    return false;
  };
  let pauseReacted = 0;
  d.onResume = (n) => {
    // ilk duraklatmada gözler sana kilitlenir, sonrakilerde yorum yapar
    B.lookTarget = { x: 0, y: 0 };
    setTimeout(() => (B.lookTarget = null), 3500);
    if (n >= 2 && pauseReacted < 2 && !d.voice && !d.input) {
      pauseReacted++;
      d.sayAsync('b2_paused_again');
    }
  };

  // ---- açılış: yavaşlamış jenerik
  d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
  await d.wait(1.2);
  d.sfx('static', 0.5);
  d.scene((c, t) => S.titleCard(c, t, { episode: '2. Bölüm', title: "Tonton Kedi'nin Kaybolan Kuyruğu", decay: 0.3 }));
  d.music('jingle', { tempo: 128, detune: -120, gain: 0.26 });
  await d.wait(1.5);
  await d.say('n_t2_title', { rate: 0.95 });
  await d.wait(4.5);
  d.stopMusic(0.6);

  // ---- oda: sabit gülümseme, takip eden gözler
  Object.assign(B, { x: 290, y: 455, scale: 1, expr: 'frozen', wave: 0, lookTarget: null });
  Object.assign(T, { x: 480, y: 455, scale: 0.9, expr: 'sad', tail: false, tremble: 0.35, lookTarget: null });
  const room = (c, t) => {
    S.bgBedroom(c, t, { highlight: v.highlight, night: v.night, window: v.night > 0.3 ? 'night' : 'day', faceInWindow: v.face });
    if (!v.tontonGone) d.tonton(c, { x: T.x + v.pull * 260, y: T.y - v.pull * 240 });
    d.beste(c);
    if (v.hand > 0) {
      const hx = 780 - v.hand * 210 + v.pull * 260;
      const hy = -170 + v.hand * 360 - v.pull * 300;
      drawRealHand(c, hx, hy, 0.9, Math.PI - 0.5, v.grip, d.time);
    }
  };
  d.scene(room);
  d.music('box', { tempo: 82, detune: -40, gain: 0.12 });
  await d.wait(0.8);
  await d.say('b2_welcome');
  await d.wait(0.5);
  await d.say('b2_problem');
  T.lookTarget = { x: 0, y: 0.3 };
  await d.say('t2_sad');
  T.lookTarget = null;
  await d.say('b2_help');

  // ---- arama
  const found = new Set();
  let searchWrong = 0;
  for (;;) {
    const r = await d.choose({
      options: ['DOLAP', 'YATAK', 'KUTU'],
      idle: ['b1_idle2', 'b1_idle3'],
      match: (txt) =>
        has(txt, 'dolap', 'gardirop', 'elbise') ? 'closet' : has(txt, 'yatak', 'yatag', 'alti', 'bed') ? 'bed' : has(txt, 'kutu', 'oyuncak', 'box', 'sandik') ? 'box' : 'unk',
    });
    let key = r.key;
    if (key !== 'box') {
      searchWrong++;
      if (searchWrong >= 3) {
        // 3 yanlış: gerçek cevap + kapıya vuruş ve ışık titremesi
        await d.say('b2_search_truth');
        d.sfx('knock', g.room.points.door, 3, 0.35);
        g.room?.flickerBurst?.(1.2);
        d.glitch(0.7, 0.4);
        await d.wait(1.6);
        key = 'box';
      }
    }
    if (key === 'unk' || key == null) {
      await d.say('b2_search_unknown');
      if (searchWrong === 2) await d.say('b2_search_hint');
      continue;
    }
    v.highlight = key;
    await d.wait(0.6);
    v.highlight = null;
    d.sfx('static', 0.15, 0.15);
    if (key === 'closet') {
      d.scene((c, t) => S.searchCloset(c, t, { drawPhoto }));
      d.tag({ secret: { id: 'fotograf', text: 'O BENİM' } });
      await d.say('b2_closet');
      d.tag(null);
      await d.say('b2_closet2');
      found.add('closet');
    } else if (key === 'bed') {
      const ev = { eyes: 1 };
      d.scene((c, t) => S.searchBed(c, t, ev));
      await d.say('b2_bed');
      await d.wait(0.4);
      d.tweens.add(ev, 'eyes', 0, 0.15);
      await d.wait(0.6);
      await d.say('b2_bed2');
    } else {
      d.scene((c, t) => S.searchBox(c, t, { tail: true, bloody: true }));
      await d.say('b2_box');
      await d.wait(0.8);
      d.sfx('static', 0.15, 0.15);
      d.scene(room);
      T.tail = false;
      await d.say('b2_box_cold');
      T.tremble = 0.8;
      T.lookTarget = { x: -0.8, y: 0 };
      await d.say('t2_box');
      T.lookTarget = null;
      break;
    }
    d.sfx('static', 0.15, 0.15);
    d.scene(room);
    await d.wait(0.5);
    if (searchWrong === 2) await d.say('b2_search_hint');
  }

  // ---- kurallar
  d.sfx('static', 0.2, 0.15);
  Object.assign(B, { x: 540, y: 455, scale: 0.85 });
  d.scene((c, t) => {
    S.bgRules(c, t, { shown: v.shown, highlight: v.highlight });
    d.beste(c);
  });
  await d.say('b2_rules_intro');
  const read = d.say('b2_rules_read');
  for (let i = 1; i <= 4; i++) {
    v.shown = i;
    await d.wait(i === 1 ? 0.3 : 2.1);
  }
  await read;
  await d.say('b2_rules_ask');
  let ruleOk = false;
  for (let w = 0; !ruleOk; ) {
    const rule = await d.choose({
      idle: ['b1_idle2', 'b1_idle3'],
      match: (txt) => (has(txt, 'durdur', 'durma', 'kaset', 'stop', 'dondur') || parseNum(txt) === 3 ? 'right' : 'wrong'),
    });
    v.highlight = 2;
    if (rule.key === 'right') {
      ruleOk = true;
      await d.say('b2_rules_right');
    } else if (++w === 1) await d.say('b2_rules_hint1');
    else if (w === 2) await d.say('b2_rules_hint2');
    else {
      // 3 yanlış: gerçek cevap + arkandan fısıltı, Beste'nin yüzü boşalır
      ruleOk = true;
      B.expr = 'void';
      d.glitch(0.9, 0.5);
      await d.say('b2_rules_truth');
      await d.sayRoom('b2_rules_whisper', { pos: 'behind', listener: true });
      B.expr = 'frozen';
    }
  }
  v.highlight = null;
  if (d.pauseCount > 0 || st.flags.pauses > 0) {
    d.stopMusic(0.05);
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(1.0);
    await d.say('b2_paused');
    await d.glitch(0.5, 0.3);
    B.lookTarget = null;
  }

  // ---- Tonton kuralları çiğnedi
  d.stopMusic(0.8);
  d.sfx('static', 0.25, 0.2);
  Object.assign(B, { x: 250, y: 455, scale: 1 });
  Object.assign(T, { x: 470, y: 455, tremble: 1, expr: 'scared' });
  d.scene(room);
  d.tweens.add(v, 'night', 0.85, 3);
  d.setBase({ saturation: 0.45, noise: 0.09 }, 3);
  await d.wait(1.0);
  await d.say('b2_tonton_broke');
  await d.say('t2_plead');
  await d.wait(0.6);
  await d.say('b2_ask_punish');
  const punish = await d.choose({
    options: ['AFFEDİLİR', 'CEZALANDIRILIR'],
    evil: true,
    idle: ['b1_idle3'],
    match: (txt) => (has(txt, 'ceza', 'cezalandir', 'dov', 'dayak', 'kapat', 'hapis', 'kilit', 'yok et', 'gonder', 'atil') ? 'punish' : 'wrong'),
  });
  st.flags.punish = punish.key;
  if (punish.key === 'wrong') {
    B.expr = 'angry';
    d.fx({ tintR: 1.3, tintG: 0.6, tintB: 0.6, saturation: 0.9 }, 0.1);
    d.glitch(1, 0.5);
    await d.say('b2_wrong_deep');
    d.fx({ tintR: 1, tintG: 0.96, tintB: 0.9, saturation: 0.45 }, 0.8);
    B.expr = 'frozen';
  } else {
    await d.say('b2_right_cold');
  }

  // ---- gerçek el
  T.lookTarget = { x: 0, y: 0 };
  await d.say('t2_help');
  d.tweens.add(v, 'hand', 1, 2.2);
  await d.wait(2.3);
  v.grip = 0;
  d.tweens.add(v, 'grip', 0.9, 0.25);
  d.sfx('meowPain');
  await d.wait(0.3);
  d.tweens.add(v, 'pull', 1.4, 0.7, (x) => x * x);
  d.glitch(0.8, 0.6, false);
  await d.wait(0.8);
  v.tontonGone = true;
  v.hand = 0;
  v.pull = 0;
  g.audio.setHiss(true);
  // ani sessizlik, sonra JUMPSCARE: sahte sakinlikte Beste'nin yüzü ekranı doldurur
  await d.wait(2.4);
  d.stopMusic(0.02);
  if (await d.jumpscare({ face: 'beste', sec: 0.5, room: true })) await d.wait(1.4);
  else await d.wait(1.0);
  B.lookTarget = null;

  // ---- "uzun bir yolculuk" ve şarkı
  d.music('box', { tempo: 64, detune: -160, gain: 0.16 });
  await d.say('b2_after');
  d.stopMusic(0.3);
  d.music('creepy', { gain: 0.22 });
  const swayStart = d.time;
  const sway = setInterval(() => (B.tilt = Math.sin((d.time - swayStart) * 1.6) * 0.12), 30);
  try {
    await d.say('b2_song');
    await d.wait(1.5);
  } finally {
    clearInterval(sway);
    B.tilt = 0;
  }
  d.stopMusic(1.5);

  // ---- ters çalınan mesaj (geri sarınca anlaşılır)
  d.sfx('static', 0.6, 0.3);
  const revText = [...g.lines.b2_real.t].reverse().join('');
  d.scene((c, t) => {
    S.realGirl(c, t, { alpha: 0.4, flip: true });
    S.staticNoise(c, t, 0.35);
    if (Math.floor(t * 2) % 2) S.bigText(c, '◀◀', { color: '#ffffff', font: `64px ${S.FONT_OSD}`, y: 80 });
  });
  d.tag({ rev: 'b2_real' });
  await d.say('b2_real', { file: 'b2_real_rev', sub: revText });
  d.tag(null);
  d.sfx('static', 0.4, 0.3);
  d.scene((c, t) => S.staticNoise(c, t, 1));
  await d.wait(1.2);

  // ---- veda
  Object.assign(B, { x: 320, y: 455, scale: 1, expr: 'frozen' });
  d.scene((c, t) => {
    S.bgBedroom(c, t, { night: 1, window: 'night', faceInWindow: true });
    d.beste(c);
  });
  d.tag({ secret: { id: 'pencere', text: 'DIŞARIDA' } });
  await d.say('b2_bye');
  d.tag(null);
  await d.wait(1.0);
  d.sfx('static', 0.3, 0.2);
  d.scene((c, t) => S.endCard(c, t, { decay: true }));
  await d.say('n_outro2');
  await d.wait(1.5);
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 1.5, 0.25);
  await d.wait(1.6);
  return ejectTries;
}

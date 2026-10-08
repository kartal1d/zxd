// GİZLİ KASET 1 — "Kamera Arkası" (KAMİL kelimesiyle açılır, src/secrets.js)
// Kâmil'in kendi el kamerası, Çamlık 14.05.1998. Her şey kameranın arkasından: tripoddaki çekim kamerası, Nermin'in
// sesi, saklambaç. Ağaçların arasından sekizi sayan ses (anlatıcı) Kâmil'dir; Gri Amca odur. Beste'yi "kameranın
// arkasına" saklar. Sonunda kamera döner ve oyuncunun tavan arasını koltuğun arkasından çeker. Son: 'kamera'.
// Ani korkutma yok. İki soru; her birinde 3 yanlışta bir olay olur ve gerçek söylenir (ekranda da yazar).
import * as S from '../draw/scenes.js';
import * as E from '../draw/scenes9.js';
import * as G from '../draw/scenesG.js';
import { has, norm } from '../util.js';
import { parseNum } from './common.js';

/** Kâmil'in el kamerası: doğal renk, el titremesi */
const CAM = { saturation: 0.55, tintR: 1.08, tintG: 1.0, tintB: 0.86, noise: 0.13, tracking: 0.14, jitter: 0.32, aberration: 0.6, glitch: 0, roll: 0, pixel: 0 };
/** Bugünün tavan arası: soğuk, karanlık */
const NOW = { saturation: 0.3, tintR: 0.92, tintG: 0.98, tintB: 1.12, noise: 0.14, tracking: 0.12, jitter: 0.1, aberration: 0.7, glitch: 0, roll: 0, pixel: 0 };
const later = (p) => {
  p?.catch?.(() => {});
  return p;
};
const pad = (n) => String(n).padStart(2, '0');

export async function gizli1(d) {
  const g = d.g;
  const st = g.state;
  const P = g.room.points;
  const B = d.chars.beste;
  const flash = () => !!g.settings?.flash;
  const bulbOn = () => (g.room.bulbBase ?? 1) > 0.05;
  const now = new Date();
  const today = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(2)}`;
  const v = { open: 1, stage: 'black', fig: 0, zoom: 0, eyes: false, girl: 'rope', gx: 228, gy: 358, step: 0, giggle: 0, yellow: 0, tear: 0, snow: 0, attic: 0, reveal: null, stampT: '13:41' };

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
  d.onPause = (paused) => {
    for (const n of Object.keys(loops.want)) {
      if (paused) {
        loops.stop[n]?.();
        delete loops.stop[n];
      } else if (!loops.stop[n]) loops.stop[n] = d.sfx(n, ...loops.want[n]);
    }
  };

  g.audio.setTapeFx('t1', 0.1, { hiss: 0.01 });
  g.audio.setHiss(true);
  d.setBase(CAM, 0.1);
  d.eyeMode = 'viewer';

  const cut = () => {
    d.sfx('tapeSearch', 0.4);
    d.sfx('static', 0.25, 0.25);
    d.glitch(0.6, 0.4, false);
  };

  // açıklık: tripoddaki kamera arkadan, Kâmil biraz geride, elinde kendi kamerası
  const clearing = (c, t) => {
    c.save();
    const z = 1 + v.zoom * 0.5;
    c.translate(498, 226);
    c.scale(z, z);
    c.translate(-498, -226);
    const people = [{ who: 'nermin', x: 300, y: 374, h: 108, pose: v.eyes ? 'eyes' : 'stand', back: v.eyes }];
    if (v.girl) people.push({ who: 'girl', x: v.gx, y: v.gy, h: 68, pose: v.girl, rope: v.girl === 'rope', plush: v.eyes });
    if (!v.eyes) people.push({ who: 'riza', x: 566, y: 248, h: 56, pose: 'cup', mega: true });
    E.rawClearing(c, d.time, {
      people,
      cat: true,
      figure: v.fig > 0.01 ? { x: 498, y: 226, h: 104, alpha: v.fig } : null,
    });
    c.restore();
    if (v.zoom < 0.3) G.tripodBack(c, t);
    E.camFx(c, d.time, { stamp: `${v.stampT} 14.05.98` });
    G.viewfinder(c, t, { label: 'K.' });
    if (v.reveal) S.bigText(c, v.reveal, { font: `96px ${S.FONT_OSD}`, color: 'rgba(242,236,208,.9)', y: 150 });
  };

  try {
    // ================================================================ REC, künye
    d.scene((c, t) => {
      E.recBlack(c, t, { beam: 0 });
      E.camFx(c, d.time, {});
    });
    await d.wait(1.4);
    await d.say('gz1_k1', { filter: 'camcorder' });
    await d.wait(0.5);
    d.scene((c, t) => {
      E.slate(c, t, { open: v.open, f: { prod: 'ŞAHSİ KAYIT', title: 'KAMERA ARKASI', scene: '—', take: '1', date: '14.05.98', dir: 'YÖN: —', cam: 'KAMERA: KÂMİL' } });
      E.camFx(c, d.time, {});
    });
    await d.wait(1.6);
    d.tweens.add(v, 'open', 0, 0.16);
    await d.wait(0.16);
    d.sfx('clap');
    await d.wait(1.0);

    // ================================================================ 13:41 öğle arası, tripodun arkası
    cut();
    d.scene(clearing);
    loopOn('birds', 0.06);
    loopOn('wind', 0.04);
    await d.wait(1.4);
    await d.say('gz1_k2', { filter: 'camcorder', gain: 0.9 });
    await d.wait(0.4);
    await d.say('k9_c2_riza', { gain: 0.6 });
    await d.wait(0.3);
    await d.say('gz1_k3', { filter: 'camcorder', gain: 0.85 });
    await d.wait(0.6);
    await d.say('k9_c2_kiz3', { gain: 0.6 });
    await d.wait(0.4);

    // ================================================================ 13:58 saklambaç: Nermin yediye kadar sayar
    cut();
    v.stampT = '13:58';
    Object.assign(v, { eyes: true, girl: 'stand', gx: 350, gy: 392 });
    await d.wait(1.0);
    v.girl = null;
    d.tweens.add(v, 'fig', 0.45, 3);
    await d.say('k9_c2_n3', { gain: 0.65 });
    await d.wait(0.6);
    // görüntü burada durur: Kâmil izleyene döner
    await askEight();

    // ================================================================ ağaçların arasından: Kâmil'in bakışı
    cut();
    v.reveal = null;
    v.stampT = '13:59';
    d.scene((c, t) => {
      E.povTrees(c, d.time, { step: v.step, giggle: v.giggle });
      G.yellowNear(c, d.time, v.yellow);
      E.camFx(c, d.time, { stamp: `${v.stampT} 14.05.98` });
      if (v.yellow < 0.9) G.viewfinder(c, t, { label: 'K.' });
      E.dropout(c, v.tear, d.time, v.snow);
    });
    await d.wait(1.0);
    await d.say('n_count_end', { label: 'KÂMİL', filter: 'camcorder', gain: 0.8 });
    await d.wait(0.5);
    v.giggle = 1;
    await d.say('k9_c7_giggle', { gain: 0.5, filter: 'camcorder' });
    v.giggle = 0;
    await d.wait(0.6);
    d.tweens.add(v, 'yellow', 0.18, 2);
    await d.say('k9_c2_kiz4', { gain: 0.55, filter: 'camcorder' });
    await d.wait(0.4);
    await d.say('gz1_k4', { filter: 'camcorder', gain: 0.8 });
    d.tweens.add(v, 'yellow', 0.38, 3);
    await d.wait(0.4);
    await d.say('gz1_kiz1', { gain: 0.65, filter: 'camcorder' });
    await d.wait(0.3);
    await d.say('gz1_k5', { filter: 'camcorder', gain: 0.8 });
    await d.wait(0.5);
    // uzaktan Nermin
    await d.say('k9_c2_n4', { gain: 0.32 });
    await d.wait(0.6);
    await d.say('gz1_k6', { filter: 'camcorder', gain: 0.75 });
    await d.wait(0.4);
    // sarı şekil objektife kadar yürür, görüntüyü kaplar, bant yırtılır
    loopOff('birds');
    d.tweens.add(v, 'yellow', 1, 3.2);
    d.sfx('warble');
    await d.wait(3.0);
    d.tweens.add(v, 'tear', 1, 0.6);
    d.tweens.add(v, 'snow', 0.9, 0.8);
    d.sfx('static', 1.2, 0.3);
    d.glitch(1, 0.8);
    await d.wait(1.2);
    loopOff('wind');

    // ================================================================ kameranın arkası: çizgi film
    Object.assign(B, { x: 320, y: 450, scale: 1, expr: 'happy', lookTarget: null });
    d.setBase({ ...CAM, saturation: 0.9 }, 0.3);
    d.scene((c, t) => {
      S.bgBedroom(c, t);
      d.beste(c);
      E.camFx(c, d.time, { stamp: '14:02 14.05.98' });
      G.viewfinder(c, t, { label: 'K.' });
      E.dropout(c, Math.max(0, 0.4 - t * 0.3), d.time, Math.max(0, 0.5 - t * 0.4));
    });
    await d.wait(1.2);
    B.wave = 1;
    await d.say('b1_hello', { rate: 0.94 });
    B.wave = 0;
    await d.wait(1.0);
    d.sfx('static', 0.4, 0.25);
    d.scene((c, t) => E.recBlack(c, t, { beam: 0.05 }));
    d.setBase(CAM, 0.2);
    await d.wait(1.2);
    await d.say('gz1_k7', { filter: 'camcorder' });
    await d.wait(0.5);
    await d.say('gz1_k8', { filter: 'camcorder' });
    await d.wait(0.8);

    // ================================================================ bugün: kamera döner
    cut();
    d.setBase(NOW, 0.4);
    v.attic = 0.12;
    const stamp = () => `${today} ${d.fmt('{saat}')}`;
    d.scene((c, t) => {
      G.atticBehind(c, t, { alpha: v.attic, stamp: stamp() });
      E.camFx(c, d.time, {});
      G.viewfinder(c, t, { label: 'K.' });
    });
    g.ambience?.setDrone?.(0.05, 4);
    await d.wait(1.6);
    await askWho();
    d.tweens.add(v, 'attic', 1, 2.5);
    await d.wait(2.4);
    await d.say('gz1_end1', { filter: 'camcorder', rate: 0.95 });
    await d.wait(1.8);

    // ekran kapanır; koltuğun arkasında, karanlıkta, kırmızı bir ışık yanıp söner
    d.noFF = true;
    d.stopFF();
    g.audio.setHiss(false);
    d.sfx('tvOff');
    d.tweens.add(d.tv.p, 'power', 0, 0.45);
    g.secrets.showCamera();
    if (bulbOn()) g.room.setBulb(0.12, 1.5);
    await d.wait(1.6);
    g.ui.show('vcr-hint', false);
    g.room.lookAt('behind', 3);
    await d.wait(3.4);
    d.sfx('deckClunkAt', P.behind);
    await d.wait(0.8);
    await d.sayRoom('gz1_end2', { pos: 'behind', gain: 0.9 });
    await d.wait(2.5);
    g.ambience?.setDrone?.(0, 3);
    st.ending = 'kamera';
  } finally {
    for (const n of Object.keys(loops.want)) loopOff(n);
    d.onPause = null;
  }

  // ---------------------------------------------------------------- soru 1: Nermin yediye kadar saydı, Kâmil kaçtan başladı?
  async function askEight() {
    await d.say('gz1_q1', { filter: 'camcorder' });
    let wrong = 0;
    for (;;) {
      const ans = await d.ask({ idle: ['gz1_q1_h1'], idleGap: 16 });
      if (ans == null) continue;
      const n = parseNum(ans);
      if (n === 8 || has(ans, 'sekiz') || wrong >= 5) break;
      wrong++;
      d.glitch(0.7, 0.4);
      if (wrong === 3) {
        // olay: ağaçların arasındaki gri şekil netleşir, görüntü ona yaklaşır, kalp atışı
        d.sfx('heartbeat', 4, 0.9);
        d.tweens.add(v, 'fig', 0.95, 1.2);
        d.tweens.add(v, 'zoom', 1, 2.4);
        if (bulbOn() && !flash()) g.room.flickerBurst(0.6);
        await d.wait(2.6);
        v.reveal = '8';
        await d.say('gz1_q1_truth');
        d.tweens.add(v, 'zoom', 0, 1.2);
        d.tweens.add(v, 'fig', 0.45, 1.2);
      } else if (wrong < 3) await d.say(wrong === 1 ? 'gz1_q1_h1' : 'gz1_q1_h2', wrong === 1 ? { filter: 'camcorder' } : {});
      else await d.say('gz1_q1_wrong', { filter: 'camcorder' });
    }
    v.reveal = '8';
    await d.say('gz1_q1_ok', { filter: 'camcorder' });
    await d.wait(0.4);
  }

  // ---------------------------------------------------------------- soru 2: şimdi kameranın önünde kim var?
  async function askWho() {
    await d.say('gz1_q2', { filter: 'camcorder' });
    const name = norm(st.name || '');
    const isMe = (ans) => has(ans, 'ben', 'benim', 'sen', 'sensin', 'izleyen', 'izleyici', 'oyuncu', 'koltuktaki', 'biz') || (name.length > 1 && norm(ans).split(' ').includes(name));
    let wrong = 0;
    for (;;) {
      const ans = await d.ask({ idle: ['gz1_q2_h1'], idleGap: 16 });
      if (ans == null) continue;
      if (isMe(ans) || wrong >= 5) break;
      wrong++;
      d.glitch(0.6, 0.4);
      d.tweens.add(v, 'attic', Math.min(0.85, 0.12 + wrong * 0.2), 1.2);
      if (has(ans, 'kamil', 'kâmil', 'gri', 'amca') && wrong !== 3) {
        await d.say('gz1_q2_kamil', { filter: 'camcorder' });
        continue;
      }
      if (wrong === 3) {
        // olay: odada, tam arkandan, bir kameranın kaset kapağı kapanır; ampul kısılır
        d.sfx('deckClunkAt', P.behind);
        if (bulbOn()) g.room.setBulb(0.35, 0.8);
        await d.wait(1.4);
        await d.say('gz1_q2_truth');
      } else if (wrong < 3) await d.say(wrong === 1 ? 'gz1_q2_h1' : 'gz1_q2_h2', wrong === 1 ? { filter: 'camcorder' } : {});
      else await d.say('gz1_q1_wrong', { filter: 'camcorder' });
    }
    await d.say('gz1_q2_ok', { filter: 'camcorder' });
  }
}

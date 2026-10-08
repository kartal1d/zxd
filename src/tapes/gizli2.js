// GİZLİ KASET 2 — "Kül" (KİBRİT kelimesiyle açılır, src/secrets.js)
// Nermin'in son kaseti: 03.02.1999 gecesi, Beste'nin sekizinci yaş günü. Ana kasetleri bahçede, bir varilde yakmaya
// çalışır; plastik erir, bant yanmaz. Anlar: kaset izlendiği yerde yaşar, izlendiği yerde yanar. Kibriti mumların
// yanına bırakmıştır. Sonunda oyuncu kibriti çakar ("yak"), tavan arası alev alır, Beste sonunda özgürdür. Son: 'kul'.
// Ani korkutma yok. İki soru; her birinde 3 yanlışta bir olay olur ve gerçek söylenir.
import * as E from '../draw/scenes9.js';
import * as G from '../draw/scenesG.js';
import { has } from '../util.js';
import { parseNum, YES } from './common.js';

/** Gece el kamerası: koyu, sıcak ateş ışığı */
const NIGHT = { saturation: 0.6, tintR: 1.12, tintG: 0.96, tintB: 0.82, noise: 0.16, tracking: 0.16, jitter: 0.26, aberration: 0.7, glitch: 0, roll: 0, pixel: 0 };
const later = (p) => {
  p?.catch?.(() => {});
  return p;
};

export async function gizli2(d) {
  const g = d.g;
  const st = g.state;
  const P = g.room.points;
  const flash = () => !!g.settings?.flash;
  const bulbOn = () => (g.room.bulbBase ?? 1) > 0.05;
  const v = { fire: 0.55, flare: 0, stack: 6, hand: 0, reels: false, face: 0, matchbox: false, swing: 0.4, close: false, reveal: false, tilt: 0, burn: 0, candle: 0, crackle: false, stampT: '23:48' };

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
  /** Çıtırtı: bant zamanında, rastgele kısa hışırtılar */
  const crackle = async () => {
    while (v.crackle) {
      d.sfx('static', 0.03 + Math.random() * 0.06, 0.05 + Math.random() * 0.08 * v.fire);
      await d.wait(0.12 + Math.random() * 0.45);
    }
  };

  g.audio.setTapeFx('t1', 0.1, { hiss: 0.012 });
  g.audio.setHiss(true);
  d.setBase(NIGHT, 0.1);

  const fireScene = (c, t) => {
    c.save();
    if (v.tilt) {
      c.translate(320, 240);
      c.rotate(v.tilt);
      c.translate(-320, -240 + v.tilt * 120);
    }
    if (v.close) G.labelClose(c, d.time, { reveal: v.reveal });
    else G.nightFire(c, d.time, v);
    c.restore();
    if (v.candle > 0.01) {
      // tek bir mum alevi, kendi kendine söner (6. kasetteki gibi)
      c.save();
      c.globalAlpha = v.candle;
      c.fillStyle = '#e8e0d0';
      c.fillRect(312, 300, 16, 70);
      c.fillStyle = '#ffc860';
      c.beginPath();
      c.ellipse(320, 286 + Math.sin(d.time * 20) * 1.5, 7, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    G.burnHoles(c, d.time, v.burn);
    E.camFx(c, d.time, { stamp: v.burn < 0.3 ? `${v.stampT} 03.02.99` : null });
  };

  try {
    // ================================================================ REC
    d.scene((c, t) => {
      E.recBlack(c, t, { beam: 0 });
      E.camFx(c, d.time, { stamp: '23:47 03.02.99' });
    });
    await d.wait(1.4);
    await d.say('gz2_n1');
    await d.wait(0.5);

    // ================================================================ bahçe, varil
    d.sfx('static', 0.25, 0.25);
    d.glitch(0.5, 0.3, false);
    d.scene(fireScene);
    loopOn('wind', 0.05);
    v.crackle = true;
    later(crackle());
    await d.wait(1.6);
    await d.say('gz2_n2');
    await d.wait(0.5);
    // kasetler tek tek ateşe
    for (let i = 0; i < 3; i++) {
      d.tweens.add(v, 'hand', 1, 0.5);
      await d.wait(0.7);
      v.stack--;
      d.tweens.add(v, 'hand', 0, 0.4);
      d.sfx('whoosh');
      v.flare = 0.8;
      d.tweens.add(v, 'flare', 0, 1.2);
      d.tweens.add(v, 'fire', Math.min(1, v.fire + 0.15), 0.8);
      await d.wait(0.6);
      if (i === 0) await d.say('gz2_n3');
    }
    await d.say('gz2_n4');
    v.stack = 0;
    d.sfx('whoosh');
    v.flare = 1;
    d.tweens.add(v, 'flare', 0, 2);
    d.tweens.add(v, 'fire', 1, 1);
    await d.wait(2.0);
    // alevlerin içinden çizgi film sesi; bir an alevlerde iki göz boşluğu
    d.tweens.add(v, 'face', 1, 1.5);
    await d.say('gz2_b1', { filter: 'camcorder', gain: 0.85 });
    await d.wait(0.4);
    await d.say('gz2_n5');
    await d.wait(0.3);
    await d.say('gz2_b2', { filter: 'camcorder', gain: 0.85 });
    d.tweens.add(v, 'face', 0, 1.2);
    await d.wait(0.8);
    v.reels = true;
    await d.say('gz2_n6');
    await d.wait(0.8);

    // ================================================================ soru 1: ateşten çıkan kaset
    d.sfx('thud', P.tv);
    v.close = true;
    await d.wait(1.2);
    await askLabel();
    v.close = false;
    await d.wait(0.6);

    // ================================================================ gerçek Beste, Nermin anlar
    d.tweens.add(v, 'fire', 0.35, 4);
    v.stampT = '00:12';
    await d.say('gz2_r1', { gain: 0.8 });
    await d.wait(0.8);
    await d.say('gz2_n7');
    await d.wait(1.2);
    await d.say('gz2_n8');
    await d.wait(0.5);
    v.matchbox = true;
    await d.say('gz2_n9');
    await d.wait(0.5);
    await d.say('gz2_n10');
    await d.wait(0.8);

    // ================================================================ soru 2: yak
    await askBurn();

    // ================================================================ kibrit çakılır: bant izlendiği yerde yanar
    v.crackle = false;
    loopOff('wind');
    d.noFF = true;
    d.stopFF();
    const l = g.room.listener();
    d.sfx('match', { x: l.pos.x + 0.2, y: l.pos.y - 0.35, z: l.pos.z - 0.15 });
    g.secrets.match(true);
    await d.wait(1.4);
    d.tweens.add(v, 'burn', 0.85, 7);
    d.fx({ jitter: 0.6, tracking: 0.6 }, 2);
    await d.say('gz2_tape_end', { rate: 0.8 });
    await d.wait(1.2);
    g.secrets.fire(0.35);
    d.sfx('whoosh');
    await d.wait(2.5);
    g.audio.setHiss(false);
    d.sfx('tvOff');
    d.tweens.add(d.tv.p, 'power', 0, 0.45);
    g.secrets.match(false);
    g.secrets.fire(0.7);
    await d.wait(1.2);
    g.ui.show('vcr-hint', false);
    await d.sayRoom('gz2_end1', { pos: 'behind', gain: 1.1 });
    await d.wait(1.0);
    g.secrets.fire(1);
    d.sfx('whoosh');
    await d.sayRoom('gz2_end2', { listener: true, gain: 1.1 });
    await d.wait(0.8);
    // kapı aralanır, merdivenin ışığı sıcak
    const R = g.room;
    if (R.corridorLight) {
      R.corridorLight.color.set(0xffa060);
      R.tweens.add(R.corridorLight, 'intensity', 4, 2.5);
    }
    if (R.spill) R.tweens.add(R.spill, 'intensity', 1, 2);
    R.openDoor(0.45, 3);
    d.sfx('creak', P.door, 3);
    g.room.lookAt('door', 2.6);
    await d.wait(1.5);
    await d.sayRoom('gz2_end3', { pos: 'door', gain: 1.0 });
    await d.wait(2.5);
    st.ending = 'kul';
  } finally {
    v.crackle = false;
    for (const n of Object.keys(loops.want)) loopOff(n);
    d.onPause = null;
  }

  // ---------------------------------------------------------------- soru 1: hangi kaset?
  async function askLabel() {
    await d.say('gz2_q1');
    let wrong = 0;
    for (;;) {
      const ans = await d.ask({ idle: ['gz2_q1_h1'], idleGap: 16 });
      if (ans == null) continue;
      if (parseNum(ans) === 1 || has(ans, 'bir', 'birinci', 'ilk', 'tanis', 'tanisalim') || wrong >= 5) break;
      wrong++;
      d.glitch(0.6, 0.4);
      if (wrong === 3) {
        // olay: kamera yere düşer, salıncak gıcırdar; sonra biri kamerayı kaldırır
        d.sfx('thud', P.tv);
        d.tweens.add(v, 'tilt', 1.35, 0.35);
        await d.wait(0.5);
        v.close = false;
        v.swing = 2;
        d.sfx('swingCreak', P.window, 0.06);
        await d.wait(1.6);
        d.tweens.add(v, 'tilt', 0, 0.8);
        await d.wait(0.9);
        v.swing = 0.4;
        v.close = true;
        v.reveal = true;
        await d.say('gz2_q1_truth');
      } else if (wrong < 3) await d.say(wrong === 1 ? 'gz2_q1_h1' : 'gz2_q1_h2');
      else await d.say('gz2_q1_wrong');
    }
    v.reveal = true;
    await d.say('gz2_q1_ok');
    await d.wait(0.4);
  }

  // ---------------------------------------------------------------- soru 2: kibriti çak
  async function askBurn() {
    await d.say('gz2_q2');
    const ok = (ans) => has(ans, 'yak', 'yakiyorum', 'yakarim', 'yaktim', 'cak', 'cakiyorum', 'kibrit', 'tutustur', 'ates', 'yansin', ...YES, 'olur', 'tamam');
    let wrong = 0;
    for (;;) {
      const ans = await d.ask({ idle: ['gz2_q2_h1'], idleGap: 15 });
      if (ans == null) continue;
      if (ok(ans) || wrong >= 5) break;
      wrong++;
      d.glitch(0.5, 0.4);
      if (wrong === 3) {
        // olay: ekranda tek bir mum yanar ve kendiliğinden söner; arkandan biri üfler
        v.candle = 1;
        await d.wait(1.6);
        d.sfx('blow', P.behind);
        d.tweens.add(v, 'candle', 0, 0.5);
        if (bulbOn() && !flash()) g.room.flickerBurst(0.5);
        await d.wait(1.2);
        await d.say('gz2_q2_truth');
      } else if (wrong < 3) await d.say(wrong === 1 ? 'gz2_q2_h1' : 'gz2_q2_h2');
      else await d.say('gz2_q2_wrong');
    }
  }
}

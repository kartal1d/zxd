// KASET 10 — "Zamanın Sonu" (final ve kaçış)
// Üç kapı, iki son. Kapıda 3 yanlışta Beste gerçeği söyler (kapının üstünde yazar) ve bir olay olur.
// Kapılarda sol ok basılı tutulursa ters mesaj ve geri sayım: 4.5 sn tutmak iyi sona götürür.
import * as S from '../draw/scenes.js';
import * as SC from '../draw/scenes10.js';
import { has, digits } from '../util.js';
import { parseNum, YES, NO, repeatText } from './common.js';

const HOLD_GOOD = 4.5; // iyi sona götüren basılı tutma süresi (sn); geri sayım bu sürede biter
const later = (p) => {
  p?.catch?.(() => {});
  return p;
};

export async function tape10(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const first = d.firstViewing;
  const flash = () => !!g.settings?.flash;
  const v = { open: [false, false, false], reveal: [null, null, null], active: -1, exit: false, nameFlash: 0, corrupt: 0.6, doorsPhase: false, good: false, teased: false, strip: null, man: 0, bulbPopped: false };

  g.audio.setTapeFx('t3', 0.1);
  g.audio.setHiss(true);
  d.setBase({ saturation: 0.55, noise: 0.11, tracking: 0.55, jitter: 0.45, aberration: 2.2, tintR: 1.25, tintG: 0.55, tintB: 0.5, glitch: 0.04 }, 0.1);
  d.eyeMode = 'track';
  d.ejectPolicy = () => {
    if (!d.voice) d.sayAsync('b2_eject');
    d.glitch(0.9, 0.5);
    if (!flash()) g.room.flickerBurst(0.8);
    return false;
  };
  g.room.setMood('t3');
  g.ambience.setDrone(0.05, 6);

  // ---- bozulmuş jenerik
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 1.4, 0.3);
  await d.wait(1.4);
  d.scene((c, t) => {
    S.titleCard(c, t * 0.3, { episode: '10. Bölüm', title: 'Zamanın Sonu', decay: 1 });
    S.staticNoise(c, t, 0.25);
  });
  d.music('creepy', { tempo: 44, gain: 0.2 });
  await d.wait(0.8);
  await d.say('k10_title', { rate: 0.9 });
  await d.wait(1.5);
  d.stopMusic(0.2);
  d.sfx('sting');

  // ---- dijital Beste, yakın plan
  Object.assign(B, { x: 320, y: 690, scale: 1.75, expr: 'void', lookTarget: null });
  const face = (c, t) => {
    S.bgVoid(c, t);
    S.corrupt(c, (cc) => d.beste(cc), v.corrupt, d.time);
    if (v.nameFlash > 0) {
      S.bigText(c, repeatText(st.name || 'ARKADAŞIM', 3), { color: `rgba(255,60,60,${v.nameFlash})`, font: `46px ${S.FONT_OSD}`, y: 60 });
      S.bigText(c, repeatText(st.name || 'ARKADAŞIM', 3), { color: `rgba(255,60,60,${v.nameFlash})`, font: `46px ${S.FONT_OSD}`, y: 420 });
    }
  };
  d.scene(face);
  g.ambience.setDrone(0.09, 4);
  await d.wait(1.0);
  await d.say('b3_open');
  await d.wait(0.4);
  await d.say('k10_form'); // Kaset 9'da doldurulan formun bedeli
  await d.wait(0.6);
  await d.say('b3_ask_outside');
  const outside = await d.ask({ evil: true, idle: ['b1_idle3'] });
  if (has(outside, ...YES)) await d.say('b3_yes');
  else if (has(outside, ...NO)) await d.say('b3_no');
  else await d.say('b3_other');

  // YALANCI SAKİNLİK, sonra ani korkutma: gri adam objektife eğilir (cevap kutusu kapalı)
  await d.wait(2.0);
  await d.jumpscare({ draw: (c, t) => SC.greyLoom(c, t), sec: 0.5 });
  d.glitch(0.8, 0.5);
  await d.wait(1.0);

  // ---- saat ve isim
  v.nameFlash = 0.8;
  d.tweens.add(v, 'nameFlash', 0, 3);
  await d.say('b3_time');
  await d.wait(0.4);

  // ---- ışıklar
  const lights = d.say('b3_lights');
  await d.wait(1.2);
  if (!flash()) g.room.setFlicker(true);
  else g.room.setBulb(0.4, 1);
  await lights;
  await d.wait(1.5);
  d.sfx('heartbeat', 8, 0.8);

  // GİZLİ: karın içinde bir yüz
  d.scene((c, t) => {
    S.staticNoise(c, t, 1);
    c.globalAlpha = 0.5;
    S.realGirl(c, t, { alpha: 0.6 });
    c.globalAlpha = 1;
    S.staticNoise(c, t, 0.6);
  });
  d.tag({ secret: { id: 'yuz', text: 'BENİ BUL' } });
  d.sfx('static', 0.35, 0.3);
  await d.wait(0.3);
  d.tag(null);
  d.scene(face);

  await d.say('b3_lock');

  // ---- üç kapı
  // Sol ok tutma: yalnızca g.input.rewindHeld iken sayılır (ters mesajın otomatik geri sarması tek başına iyi sonu tetikleyemez)
  const hold = { t: 0, prev: 0, peak: 0, real: false, count: false };
  const resetHold = () => Object.assign(hold, { t: 0, prev: 0, peak: 0, count: false });
  d.onRewindHold = (held) => {
    if (!v.doorsPhase || v.good) return false;
    if (held < hold.prev) hold.prev = 0;
    const dt = held - hold.prev;
    hold.prev = held;
    if (!g.input?.rewindHeld) {
      hold.t = 0;
      hold.count = false;
      return false;
    }
    hold.t += dt;
    hold.peak = Math.max(hold.peak, hold.t);
    if (hold.t > 0.6 && !hold.real) {
      hold.real = true;
      later(d.sayRoom('k10_real_hold', { pos: 'behind', gain: 1.1 }));
    }
    if (hold.t > 1.4 && !hold.count) {
      hold.count = true;
      d.sfx('warble');
      later(d.sayRoom('k10_countback', { listener: true, rate: 1.6, gain: 1.15 }));
    }
    if (hold.t > HOLD_GOOD) {
      v.good = true;
      const inp = d.input;
      d.stopRewind(true);
      d.voice?.stop();
      d.endTyping();
      inp?.resolve('__GERI_SAR__');
      return true;
    }
    return false;
  };
  d.onRewindEnd = () => {
    if (v.doorsPhase && !v.good && !v.teased && hold.peak > 0.4) {
      v.teased = true;
      d.sayAsync('b3_rewind_no');
    }
    resetHold();
  };

  const early = !!st.flags.saidSurnameEarly;
  const doorsDraw = (c, t) => {
    const strip = v.active === 2 && early ? (v.open[2] ? 'SOYADI: AYDIN' : 'SOYADI: AY____') : null;
    SC.doorsFrame(c, t, { open: v.open, reveal: v.reveal, active: v.active, exitButton: v.exit, strip });
    if (v.nameFlash > 0) S.bigText(c, repeatText(st.name || 'ARKADAŞIM', 3), { color: `rgba(255,60,60,${v.nameFlash})`, font: `40px ${S.FONT_OSD}`, y: 60 });
  };
  d.scene(doorsDraw);
  v.doorsPhase = true;
  // kapı sahnesinin her karesi ters mesajı taşır: geri sararken 'Bırakma. Geri sar. Bırakma.' çıkar
  d.tag({ rev: 'k10_ters' });
  if (st.flags.peeked) {
    await d.say('k10_peeked');
    await d.wait(0.4);
  }
  // kapı I belirirken ters dosya çok kısık, sahnenin altında çalar
  if (!g.debug?.fast && g.audio.buffers?.has('k10_ters_rev')) later(g.audio.playVoice('k10_ters_rev', { gain: 0.22 })?.promise);
  d.sfx('static', 0.5, 0.15);
  await d.wait(2.4);

  /** 3 yanlışta gerçeğin yanında olan olay (her kapıda farklı) */
  const EVENTS = [
    async () => {
      // kapı I: gerçek tavan arası kapısına vurulur
      d.glitch(0.8, 0.5);
      d.sfx('knock', g.room.points.door, 3, 0.55);
      await d.wait(2.4);
    },
    async () => {
      // kapı II: mumlu Beste yüzü ani korkutma
      await d.wait(0.5);
      await d.jumpscare({ draw: (c, t) => SC.candleFace(c, t), sec: 0.6 });
      d.glitch(1, 0.6);
      await d.wait(0.9);
    },
    async () => {
      // kapı III: ampul patlar, arkandan fısıltı
      d.sfx('pop', g.room.points.bulb);
      v.bulbPopped = true;
      g.room.setFlicker(false);
      g.room.setBulb(0, 0.05);
      d.glitch(0.9, 0.5);
      await d.wait(0.9);
      await d.sayRoom('k10_h3_behind', { pos: 'behind', gain: 1.25 });
      await d.wait(0.5);
    },
  ];
  const QUESTIONS = [
    {
      line: 'b3_q1',
      truth: 'b3_truth1',
      answer: '14.05',
      hints: ['k10_h1a', 'k10_h1b'],
      right: 'k10_right1',
      ok: (txt) => {
        const dg = digits(txt);
        return dg.includes('1405') || dg.startsWith('145') || dg.includes('14598') || (dg.includes('14') && has(txt, 'mayis')) || (has(txt, 'on dort') && has(txt, 'mayis')) || (has(txt, 'on dort') && has(txt, 'sifir bes'));
      },
    },
    { line: 'b3_q2', truth: 'b3_truth2', answer: '7', hints: ['k10_h2a', 'k10_h2b'], right: 'k10_right2', ok: (txt) => parseNum(txt) === 7 },
    { line: early ? 'k10_q3_again' : 'b3_q3', truth: 'b3_truth3', answer: 'AYDIN', hints: ['k10_h3a', 'k10_h3b'], right: 'b3_right2', ok: (txt) => has(txt, 'aydin', 'aydın') },
  ];
  for (let i = 0; i < 3 && !v.good; i++) {
    const Q = QUESTIONS[i];
    v.active = i;
    await d.say(Q.line);
    let wrongHere = 0;
    for (;;) {
      if (v.good) break;
      const ans = await d.ask({ evil: true });
      if (ans === '__GERI_SAR__' || v.good) break;
      // gerçek söylendikten sonra yine yazamazsa kapı yine de açılır (takılma yok)
      const pass = ans != null && (Q.ok(ans) || wrongHere >= 5);
      if (pass) {
        v.open[i] = true;
        d.sfx('creakTv');
        await d.say(Q.ok(ans) ? Q.right : 'b3_right2');
        if (i === 2 && first) st.flags.saidSurname = true;
        break;
      }
      wrongHere++;
      if (!flash()) g.room.flickerBurst(1.2);
      d.glitch(1, 0.6);
      if (wrongHere === 3) {
        // üçüncü yanlışta: olay, sonra Beste gerçeği söyler ve cevap kapının üstünde yazar
        await EVENTS[i]();
        if (v.good) break;
        v.reveal[i] = Q.answer;
        await d.say(Q.truth);
      } else if (wrongHere < 3) {
        if (wrongHere === 2) {
          v.nameFlash = 1;
          d.tweens.add(v, 'nameFlash', 0, 3);
        }
        await d.say(Q.hints[wrongHere - 1]);
      } else await d.say(wrongHere % 2 ? 'b3_wrong' : 'b3_wrong2');
    }
  }
  v.doorsPhase = false;
  v.active = -1;
  d.onRewindHold = null;
  d.onRewindEnd = null;
  d.tag(null);

  if (v.good) return goodEnding(d, v);
  return badEnding(d, v);
}

async function badEnding(d, v) {
  const g = d.g;
  const st = g.state;
  v.exit = true;
  await d.wait(0.5);
  await d.say('b3_exit');
  // ÇIKIŞ yazılmalı; 'sobe' yalnızca bulan söyler, burada işe yaramaz ve rota değişmez
  for (;;) {
    const r = await d.choose({
      evil: true,
      match: (txt) => (has(txt, 'sobe') ? 'sobe' : has(txt, 'cikis', 'çıkış', 'exit', 'cik') ? 'exit' : null),
      unknown: 'b_unknown_cold',
    });
    if (r.key === 'exit') break;
    if (r.key === 'sobe') await d.say('k10_sobe_bad');
  }
  d.stopMusic(0.1);
  await d.glitch(1, 0.8);
  d.sfx('bsod');
  d.scene((c, t) => S.bsod(c, t, { door: true }));
  d.setBase({ saturation: 1, tintR: 1, tintG: 1, tintB: 1, glitch: 0, noise: 0.05, tracking: 0.2, aberration: 0.8 }, 0.05);
  await d.race(g.waitAnyKey(9));

  // ekran kapanır, ışıklar söner; bundan sonra ileri sarılamaz (oda sahnesi gerçek zamanlı)
  d.noFF = true;
  d.stopFF();
  g.audio.setHiss(false);
  d.sfx('tvOff');
  d.tweens.add(d.tv.p, 'power', 0, 0.45);
  g.room.setFlicker(false);
  g.room.setBulb(0, 0.1);
  if (!v.bulbPopped) d.sfx('pop', g.room.points.bulb);
  g.ambience.setDrone(0, 2);
  await d.wait(3.2);
  g.ui.show('vcr-hint', false);
  g.room.lookAt('door', 2.6);
  await d.wait(0.8);
  g.room.doorGlow(1);
  await d.wait(1.0);
  d.sfx('knock', g.room.points.door, 3);
  await d.wait(2.4);
  const door = g.room.points.door;
  const at = () => g.audio.at(door.x, door.y, door.z, 0.5);
  await d.say('b3_final_whisper', { dest: at(), gain: 1.4 });
  await d.wait(0.6);
  g.room.showGirl(true);
  g.room.openDoor(0.45, 3.5);
  d.sfx('creak', door, 3.2);
  await d.wait(2.2);
  await d.say('b3_final_name', { dest: at(), gain: 1.4 });
  g.audio.speakName(st.name);
  await d.wait(1.6);
  // ebe artık sensin: önce fısıltı, sonra koridordan programın ıslığı
  await d.say('k10_bad_ebe', { dest: at(), gain: 1.3 });
  await d.wait(0.8);
  const dur = d.sfx('whistle', door, 0.7) || 7;
  await d.wait(dur + 1.2);
  // son kare: ıslık kesilir, sessizlik, sonra kız aniden öne atılır
  await d.wait(1.4);
  d.sfx('scare', g.room.points.behind);
  if (!d.g.settings?.flash) g.room.flickerBurst(0.4);
  const girl = g.room.girl;
  if (girl?.visible) d.tweens.add(girl.position, 'z', girl.position.z - 0.95, 0.14);
  await d.wait(1.4);
  st.ending = 'bad';
}

async function goodEnding(d, v) {
  const g = d.g;
  const st = g.state;
  d.stopMusic(0.05);
  g.audio.stopVoices();
  // bant kendi kendine geri sarılıyor
  const stop = d.sfx('rewind');
  d.scene((c, t) => {
    S.doors(c, t, { open: v.open });
    S.staticNoise(c, t, Math.min(1, t * 0.4));
    S.osd(c, { label: '◀◀ GERİ SAR', counter: d.counter() - t * 40 });
  });
  d.fx({ tracking: 2, jitter: 2, glitch: 0.6 }, 0.5);
  await d.say('b3_good_scream', { rate: 0.9 });
  await d.wait(1.2);
  stop?.();
  g.room.setFlicker(false);
  g.room.setMood('calm');
  g.ambience.setDrone(0, 3);
  d.setBase({ saturation: 0.7, tintR: 1, tintG: 1, tintB: 1, glitch: 0, noise: 0.07, tracking: 0.15, jitter: 0.1, aberration: 0.5, pixel: 0 }, 1.5);
  d.scene((c, t) => {
    S.realGirl(c, t, { alpha: Math.min(1, t * 0.3) });
    SC.manBehind(c, v.man);
    S.staticNoise(c, t, 0.12 + v.man * 0.3);
  });
  await d.wait(2.0);

  // önceki kasetlerde yaptıkların: oyun, herkes bulununca biter
  const st_ = st.flags || {};
  for (const [flag, id] of [
    ['caughtLie', 'k10_good_bday'],
    ['promisedFind', 'k10_good_promise'],
    ['mirrorFriend', 'k10_good_mirror'],
  ]) {
    if (st_[flag]) {
      await d.say(id);
      await d.wait(0.6);
    }
  }

  // yumuşak istek: "sobe" de. Üç yanlışta Beste söyler ve gri adam bir an belirir
  await d.say('k10_good_ask');
  let wrongG = 0;
  let told = false;
  for (;;) {
    const ans = await d.ask({ idle: ['k10_good_hint'], idleGap: 16 });
    if (ans == null) continue;
    if (told || has(ans, 'sobe')) break;
    wrongG++;
    if (wrongG >= 3) {
      d.glitch(1, 0.7);
      d.tweens.add(v, 'man', 1, 0.2);
      d.sfx('heartbeat', 3, 0.9);
      await d.wait(0.9);
      d.tweens.add(v, 'man', 0, 0.12);
      await d.wait(0.3);
      await d.say('k10_good_truth');
      told = true;
    } else await d.say('k10_good_hint');
  }
  await d.say('k10_good_sobe');
  await d.wait(0.8);
  await d.say('b3_good_real');
  await d.wait(1.5);
  d.noFF = true;
  d.stopFF();
  g.audio.setHiss(false);
  d.sfx('tvOff');
  d.tweens.add(d.tv.p, 'power', 0, 0.6);
  await d.wait(1.2);
  g.ui.show('vcr-hint', false);
  g.room.dawn();
  // şafakta Tonton rafa geri döner, turuncu kuyruğu yerinde
  const R = g.room;
  if (R.plush && R.plushShelfPos) {
    R.plush.position.copy(R.plushShelfPos);
    R.plush.rotation.set(0, Math.PI / 2 - 0.3, 0);
  }
  if (R.plushTail) R.plushTail.visible = true;
  await d.wait(2.0);
  g.room.lookAt('door', 3);
  await d.wait(2.4);
  d.sfx('boxClick', g.room.points.door);
  g.room.openDoor(0.35, 3);
  await d.wait(3.5);
  st.ending = 'good';
}

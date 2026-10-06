// KASET 10 — "Zamanın Sonu" (final ve kaçış)
import * as S from '../draw/scenes.js';
import { has, digits, norm } from '../util.js';
import { parseNum, YES, NO, repeatText } from './common.js';

export async function tape10(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const v = { open: [false, false, false], reveal: [null, null, null], active: -1, exit: false, nameFlash: 0, corrupt: 0.6, face: 0, doorsPhase: false, good: false, teased: false };

  g.audio.setTapeFx('t3', 0.1);
  g.audio.setHiss(true);
  d.setBase({ saturation: 0.55, noise: 0.11, tracking: 0.55, jitter: 0.45, aberration: 2.2, tintR: 1.25, tintG: 0.55, tintB: 0.5, glitch: 0.04 }, 0.1);
  d.eyeMode = 'track';
  d.ejectPolicy = () => {
    if (!d.voice) d.sayAsync('b2_eject');
    d.glitch(0.9, 0.5);
    g.room.flickerBurst(0.8);
    return false;
  };
  g.room.setMood('t3');
  g.ambience.setDrone(0.05, 6);

  // ---- bozulmuş jenerik
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 1.4, 0.3);
  await d.wait(1.4);
  d.scene((c, t) => {
    S.titleCard(c, t * 0.3, { episode: '3. Bölüm', title: 'Zamanın Sonu', decay: 1 });
    S.staticNoise(c, t, 0.25);
  });
  d.music('creepy', { tempo: 44, gain: 0.2 });
  await d.wait(0.8);
  await d.say('n_t3_title', { rate: 0.9 });
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
  await d.wait(0.6);
  await d.say('b3_ask_outside');
  const outside = await d.ask({ evil: true, idle: ['b1_idle3'] });
  if (has(outside, ...YES)) await d.say('b3_yes');
  else if (has(outside, ...NO)) await d.say('b3_no');
  else await d.say('b3_other');
  await d.wait(0.5);

  // ---- saat ve isim
  v.nameFlash = 0.8;
  d.tweens.add(v, 'nameFlash', 0, 3);
  await d.say('b3_time');
  await d.wait(0.4);

  // ---- ışıklar
  const lights = d.say('b3_lights');
  await d.wait(1.2);
  g.room.setFlicker(true);
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
  d.onRewindHold = (held) => {
    if (!v.doorsPhase || v.good) return false;
    if (held > 3.2) {
      v.good = true;
      const inp = d.input;
      d.stopRewind(true);
      d.endTyping();
      inp?.resolve('__GERI_SAR__');
      return true;
    }
    return false;
  };
  d.onRewindEnd = (held) => {
    if (v.doorsPhase && !v.good && !v.teased && held > 0.4) {
      v.teased = true;
      d.sayAsync('b3_rewind_no');
    }
  };
  d.scene((c, t) => {
    S.doors(c, t, { open: v.open, reveal: v.reveal, active: v.active, exitButton: v.exit });
    if (v.nameFlash > 0) S.bigText(c, repeatText(st.name || 'ARKADAŞIM', 3), { color: `rgba(255,60,60,${v.nameFlash})`, font: `40px ${S.FONT_OSD}`, y: 60 });
  });
  v.doorsPhase = true;

  const QUESTIONS = [
    {
      line: 'b3_q1',
      truth: 'b3_truth1',
      answer: '1405',
      ok: (txt) => {
        const dg = digits(txt);
        return dg.includes('1405') || dg.startsWith('145') || dg.includes('14598') || (dg.includes('14') && has(txt, 'mayis'));
      },
    },
    { line: 'b3_q2', truth: 'b3_truth2', answer: '7', ok: (txt) => parseNum(txt) === 7 },
    { line: 'b3_q3', truth: 'b3_truth3', answer: 'AYDIN', ok: (txt) => has(txt, 'aydin', 'aydın') },
  ];
  let wrong = 0;
  for (let i = 0; i < 3 && !v.good; i++) {
    v.active = i;
    await d.say(QUESTIONS[i].line);
    let wrongHere = 0;
    for (;;) {
      if (v.good) break;
      const ans = await d.ask({ evil: true });
      if (ans === '__GERI_SAR__') break;
      if (QUESTIONS[i].ok(ans)) {
        v.open[i] = true;
        d.sfx('creakTv');
        await d.say(i === 2 ? 'b3_right2' : 'b3_right');
        if (i === 2) st.flags.saidSurname = true;
        break;
      }
      wrong++;
      wrongHere++;
      g.room.flickerBurst(1.2);
      d.glitch(1, 0.6);
      if (wrongHere === 3) {
        // üçüncü yanlışta Beste gerçeği söyler, cevap kapının üstünde yazar
        v.reveal[i] = QUESTIONS[i].answer;
        await d.say(QUESTIONS[i].truth);
      } else if (wrong % 2 === 0) {
        v.nameFlash = 1;
        d.tweens.add(v, 'nameFlash', 0, 3);
        await d.say('b3_wrong2');
      } else await d.say('b3_wrong');
    }
  }
  v.doorsPhase = false;
  v.active = -1;
  d.onRewindHold = null;
  d.onRewindEnd = null;

  if (v.good) return goodEnding(d, v);
  return badEnding(d, v);
}

async function badEnding(d, v) {
  const g = d.g;
  const st = g.state;
  v.exit = true;
  await d.wait(0.5);
  await d.say('b3_exit');
  await d.choose({
    evil: true,
    match: (txt) => (has(txt, 'cikis', 'çıkış', 'exit', 'cik') ? 'exit' : null),
    unknown: 'b_unknown_cold',
  });
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
  d.sfx('pop', g.room.points.bulb);
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
  await d.say('b3_final_whisper', { dest: g.audio.at(door.x, door.y, door.z, 0.5), gain: 1.4 });
  await d.wait(0.6);
  g.room.showGirl(true);
  g.room.openDoor(0.45, 3.5);
  d.sfx('creak', door, 3.2);
  await d.wait(2.2);
  await d.say('b3_final_name', { dest: g.audio.at(door.x, door.y, door.z, 0.5), gain: 1.4 });
  g.audio.speakName(st.name);
  await d.wait(2.0);
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
    S.staticNoise(c, t, 0.12);
  });
  await d.wait(2.0);
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
  await d.wait(2.0);
  g.room.lookAt('door', 3);
  await d.wait(2.4);
  d.sfx('boxClick', g.room.points.door);
  g.room.openDoor(0.35, 3);
  await d.wait(3.5);
  st.ending = 'good';
}

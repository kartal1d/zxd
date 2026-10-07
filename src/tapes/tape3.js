// KASET 3 — "Tonton Kedi Geri Döndü!" (fazla parlak neşe, dikişli Tonton, Heykel oyunu)
// Kendine özgü mekanik: KIPIRDAMAMA. Müzik durunca oyuncunun bedeni izlenir (fare/bakış, tuş, dokunma).
import * as S from '../draw/scenes.js';
import * as S3 from '../draw/scenes3.js';
import { has, norm, rand } from '../util.js';
import { TAPE_FX } from '../audio.js';
import { SCREEN_DEFAULT } from '../tv.js';

/** Kasetin "restore edilmiş" fazla parlak görüntüsü */
const BASE = { saturation: 1.25, tintR: 1.04, tintG: 1.0, tintB: 0.94, noise: 0.05, tracking: 0.15, jitter: 0.12, aberration: 0.7, glitch: 0 };
/** Heykel anı: görüntü "gerçek" kareye oturur, gri ve kıpırtısız */
const FREEZE = { saturation: 0.28, tintR: 1, tintG: 1, tintB: 1, noise: 0.03, tracking: 0, jitter: 0, aberration: 0.25 };
const HISS = TAPE_FX.t1.hiss;
const FREEZE_SEC = [5, 6, 11];
const WORRY = ['yardim', 'kac', 'kos', 'git', 'ne oldu', 'iyi misin', 'canin', 'uzgun', 'aci', 'korku', 'kork', 'imdat', 'kurtar', 'neredeydin', 'nereye'];
const BEHIND_YES = ['evet', 'vardi', 'var', 'adam', 'amca', 'biri', 'siluet', 'gri', 'golge', 'agac', 'uzun', 'gordum', 'gördüm', 'yes'];

/** Arka planda başlatılan sözün reddi (kaset iptali) yakalanmamış hata sayılmasın */
const later = (p) => {
  p.catch(() => {});
  return p;
};

export async function tape3(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const T = d.chars.tonton;
  const first = d.firstViewing;
  const v = {
    warnFlip: false,
    tailBox: false,
    dusk: 0,
    // heykel
    phase: 'dance', // 'dance' | 'hold' (müzik durdu, poz donuk) | 'freeze' (gri kare, adam görünür)
    dance: 0,
    waveMode: 'up',
    freezeAt: 0,
    man: null,
    reacted: [false, false, false],
  };

  g.audio.setTapeFx('t1', 0.1);
  g.audio.setHiss(true);
  d.setBase(BASE, 0.1);
  d.eyeMode = 'viewer';
  // dikişli Tonton: aynı ses, biraz yavaş ve kalın
  d.voiceMods = { tonton: { rate: 0.93, detune: -70 } };
  Object.assign(T, { stitched: true, frozenMouth: true, tail: true, headTilt: 0, headTurn: 0, still: false, tremble: 0, expr: 'happy', tailColor: null });

  const lineDur = (id, rate = 1) => {
    if (g.debug?.fast) return 0.2;
    if (d.ff) return 0.6;
    const du = g.audio.duration?.(id) || 0;
    return du ? du / (rate * (g.audio.fx?.rate || 1)) : 2.5;
  };
  const drawB = (c, over = {}) => {
    d.beste(c, over);
    S3.wideSmile(c, { ...B, t: d.time, ...over });
  };
  const drawT = (c, over = {}) => S3.drawStitchedTonton(c, { ...T, t: d.time, ...over });
  const sway = (c, x, y, a, fn) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.translate(-x, -y);
    fn();
    c.restore();
  };

  // ================================================================ açılış: mavi ekran, uyarı, jenerik
  d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
  await d.wait(1.2);
  d.sfx('static', 0.4);
  const WARN = ['Bu kaset yalnızca evde, YALNIZ', 'izlenmek içindir.', '', 'Kasetin kopyalanması, kiralanması', 've yayınlanması yasaktır.', '', 'YILDIZ ÇOCUK YAPIM  ©  1998'];
  d.scene((c, t) => (v.warnFlip ? S3.warningFlip(c) : S.warning(c, t, { lines: WARN })));
  await d.wait(3.0);
  // GİZLİ: uyarı kartının bütün yazısı bir anlığına değişir
  v.warnFlip = true;
  d.tag({ secret: { id: 'arkana', text: 'ARKANA BAKMA' } });
  await d.wait(0.2);
  v.warnFlip = false;
  d.tag(null);
  await d.wait(1.3);

  // 2. kaset hiç olmamış gibi: tam hızda jenerik
  d.sfx('static', 0.3);
  d.scene((c, t) => S.titleCard(c, t));
  d.music('jingle', { tempo: 152, detune: 0, gain: 0.3 });
  await d.wait(1.2);
  await d.say('n_show');
  await d.wait(1.6);
  d.scene((c, t) => S.titleCard(c, t, { episode: '3. Bölüm', title: 'Tonton Kedi Geri Döndü!' }));
  await d.say('k3_title');
  await d.wait(2.8);

  // ================================================================ Beste'nin odası: Tonton döndü
  Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 1, lookTarget: null, tilt: 0 });
  Object.assign(T, { x: 780, y: 455, scale: 0.9 });
  const bedroom = (c, t) => {
    S.bgBedroom(c, t, { calendar: true, window: v.dusk > 0 ? 'night' : 'day', night: v.dusk });
    drawT(c);
    if (v.tailBox) S3.dashBox(c, t, S3.tailRect(T));
    drawB(c);
  };
  d.scene(bedroom);
  d.sfx('static', 0.2, 0.2);
  d.music('box', { tempo: 104, gain: 0.13 });
  await d.wait(0.5);
  await d.say('k3_hello');
  B.wave = 0;
  await d.say('k3_surprise');
  d.sfx('cartoonPop');
  d.tweens.add(T, 'x', 470, 0.55);
  B.lookTarget = { x: 0.9, y: 0 };
  await d.wait(0.75);
  B.wave = 1;
  await d.say('k3_tonton_back');
  B.wave = 0;
  // Beste kuyruğa gururla bakar
  B.lookTarget = { x: 0.95, y: 0.45 };
  await d.say('k3_tonton_tail');
  B.lookTarget = null;

  // ---------------------------------------------------------------- YANKI: Tonton yazdığını "tekrar eder"
  d.sfx('static', 0.12, 0.12);
  Object.assign(B, { x: 205, scale: 1 });
  Object.assign(T, { x: 430, scale: 1.05 });
  await d.wait(0.4);
  await d.say('k3_ask_welcome');
  const hello = (await d.ask({ idle: ['b1_idle1', 'b1_idle2'], maxLen: 20 })) || '';
  const echo = (hello || '').toLocaleUpperCase('tr').slice(0, 20);
  await d.wait(0.5);
  {
    // ses "Hoş geldin" der, altyazı senin yazdığını; dikişli ağız hiç açılmaz, baş her tekrarda 10 derece eğilir
    const dur = lineDur('k3_tonton_echo', 0.93);
    const p = later(d.say('k3_tonton_echo', { sub: `${echo}...`, keep: true }));
    for (let i = 0; i < 3; i++) {
      T.headTilt = -0.1745 * (i + 1);
      if (i) g.ui.subtitle('TONTON', Array.from({ length: i + 1 }, () => echo + '...').join(' '), 'tonton');
      await d.wait(dur / 3);
    }
    await p;
    g.ui.subtitle(null, null, null, 0.35);
  }
  await d.wait(0.4);
  if (has(hello, ...WORRY)) {
    // gülümsemesi bir replik boyunca düşer
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k3_echo_cold');
    B.expr = 'happy';
    B.lookTarget = null;
    d.tweens.add(T, 'headTilt', 0, 1.2);
  } else {
    d.tweens.add(T, 'headTilt', 0, 1.6);
    B.tilt = 0.08;
    await d.say('k3_echo_laugh');
    B.tilt = 0;
  }

  // ---------------------------------------------------------------- GASLIGHT: kuyruk ne renk?
  v.tailBox = true;
  await d.say('k3_ask_tail');
  const orange = (txt) => {
    // "gri değil" = yalana uymak; "turuncu değil" / "gri" = direnmek
    if (/ (gri|kul|gumus)[a-z]* degil/.test(' ' + norm(txt) + ' ')) return true;
    return has(txt, 'turuncu', 'turunc', 'portakal', 'oranj', 'orange') && !has(txt, 'degil', 'gri', 'kul', 'gumus');
  };
  let tail;
  const a1 = await d.ask({ idle: ['b1_idle2'], maxLen: 24 });
  if (orange(a1)) tail = 'uydu';
  else {
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k3_tail_wrong');
    B.expr = 'happy';
    B.lookTarget = null;
    await d.say('k3_tail_again');
    const a2 = await d.ask({ idle: ['b1_idle2'], maxLen: 24 });
    tail = orange(a2) ? 'uydu' : 'direndi';
  }
  if (tail === 'uydu') {
    // görüntü bir an yalana "uyar": kuyruk iki kare turuncu
    T.tailColor = '#f59a3c';
    const p = later(d.say('k3_tail_right'));
    await d.wait(0.1);
    T.tailColor = null;
    await p;
  } else {
    // iki kez direnen: müzik bir saniye kesilir, yüz donar, tek kelime
    d.stopMusic(0.02);
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(0.25);
    await d.say('k3_tail_insist');
    await d.wait(0.8);
    B.expr = 'happy';
    B.lookTarget = null;
    d.music('box', { tempo: 104, gain: 0.13 });
    await d.say('k3_tail_moveon');
  }
  v.tailBox = false;
  if (first) st.flags.tail = tail;

  // ================================================================ HEYKEL
  d.stopMusic(0.4);
  d.sfx('static', 0.15, 0.15);
  Object.assign(B, { x: 150, y: 458, scale: 0.85, wave: 0, expr: 'happy', lookTarget: null, tilt: 0 });
  Object.assign(T, { x: 410, y: 458, scale: 0.8, headTilt: 0, headTurn: 0, still: false, tremble: 0 });
  // heykel pozlarının bakışı: ilk ikisinde yana bakar (kıpırdarsan gözbebekleri sana döner), üçüncüde sana
  const GAZE = [{ x: -0.75, y: -0.55 }, { x: 0.8, y: -0.4 }, { x: 0, y: 0 }];

  // -- kıpırdama algılayıcı: yalnızca donma pencerelerinde çalışır
  const mv = { active: false, idx: -1, moved: [false, false, false], hist: [], last: null };
  const onMoved = (i) => {
    if (v.reacted[i]) return;
    v.reacted[i] = true;
    if (i < 2) {
      // Beste'nin gözbebekleri sana döner; başka hiçbir şey kıpırdamaz
      B.look = { x: 0, y: 0 };
      B.lookTarget = { x: 0, y: 0 };
      d.sayAsync('k3_moved');
    } else {
      // ekrandaki tek hareket: adamın başı 15 derece eğilir
      if (v.man) d.tweens.add(v.man, 'tilt', 0.26, 0.6);
      d.sayAsync('k3_moved_last');
    }
  };
  const hit = () => {
    if (!mv.active) return;
    mv.moved[mv.idx] = true;
    onMoved(mv.idx);
  };
  const onTouch = () => hit();
  const watchStart = (i) => {
    mv.idx = i;
    mv.hist = [];
    mv.last = { yaw: g.room.yaw, pitch: g.room.pitch };
    mv.active = true;
    window.addEventListener('touchstart', onTouch, { passive: true });
  };
  const watchStop = () => {
    mv.active = false;
    window.removeEventListener('touchstart', onTouch);
  };
  /** Her karede: 0,5 sn içinde biriken bakış değişimi 0,06 radyanı geçerse kıpırdadın. */
  const sample = () => {
    if (!mv.active) return;
    const r = g.room;
    const now = g.clock;
    const a = Math.abs(r.yaw - mv.last.yaw) + Math.abs(r.pitch - mv.last.pitch);
    mv.last = { yaw: r.yaw, pitch: r.pitch };
    if (a > 0) mv.hist.push({ t: now, a });
    while (mv.hist.length && now - mv.hist[0].t > 0.5) mv.hist.shift();
    let sum = 0;
    for (const h of mv.hist) sum += h.a;
    if (sum > 0.06) hit();
  };
  // herhangi bir tuş (Boşluk dahil) kıpırdamak sayılır; tuş tüketilmez, duraklatma yine çalışır
  d.onKey = () => {
    hit();
    return false;
  };

  const heykel = (c) => {
    sample();
    const live = v.phase === 'dance';
    const pt = live ? d.time : v.freezeAt;
    const k = v.dance;
    const beat = pt * (126 / 60) * Math.PI;
    S3.gardenHeykel(c, pt, { man: v.phase === 'freeze' ? v.man : null });
    const tb = Math.abs(Math.sin(beat + 0.9)) * 12 * k;
    sway(c, T.x, T.y, Math.sin(beat * 0.5 + 0.9) * 0.13 * k, () =>
      drawT(c, { y: T.y - tb, t: pt, headTilt: T.headTilt + Math.sin(beat + 0.4) * 0.16 * k, still: T.still || !live }),
    );
    const bb = Math.abs(Math.sin(beat)) * 14 * k;
    const wave = v.waveMode === 'alt' ? Math.floor(pt * (126 / 60) * 0.5) % 2 : B.wave;
    const over = { y: B.y - bb, t: pt, wave, tilt: B.tilt + Math.sin(beat * 0.5 + 1) * 0.08 * k };
    if (!live) over.blink = 0;
    if (v.phase === 'freeze') over.mouth = 0;
    sway(c, B.x, B.y, Math.sin(beat * 0.5) * 0.1 * k, () => drawB(c, over));
  };
  d.scene(heykel);
  d.music('box', { tempo: 104, gain: 0.12 });

  let still = true;
  try {
    await d.wait(0.4);
    B.wave = 1;
    await d.say('k3_game_intro');
    B.wave = 0;
    {
      const dur = lineDur('k3_game_rule');
      const p = later(d.say('k3_game_rule'));
      await d.wait(dur * 0.72);
      B.lookTarget = { x: 0, y: 0 }; // "Ben görürüm!"
      await p;
      await d.wait(0.4);
      B.lookTarget = null;
    }
    await d.say('k3_ready');
    const ready = (await d.ask({ idle: ['b1_idle1'], maxLen: 20 })) || '';
    const words = norm(ready).split(' ');
    if (has(ready, 'hayir', 'degil', 'istemiyor') || words.some((w) => ['yok', 'bekle', 'dur', 'yoo'].includes(w))) {
      B.expr = 'neutral';
      await d.say('k3_ready_no');
      B.expr = 'happy';
    } else {
      B.wave = 1;
      await d.say('k3_ready_yes');
    }

    for (let i = 0; i < 3; i++) {
      // ---- dans: müzik kutusu hızlı, ikisi de sallanır
      v.phase = 'dance';
      v.man = null;
      B.expr = 'happy';
      B.lookTarget = null;
      B.wave = i === 2 ? 0 : 1;
      v.waveMode = i === 1 ? 'alt' : 'up';
      d.music('box', { tempo: 126, gain: 0.15 });
      d.tweens.add(v, 'dance', 1, 0.3);
      if (i > 0) await d.say('k3_dance');
      await d.wait(rand(6, 9));

      // ---- müzik ölü gibi durur, poz donar, "Heykel!"
      d.stopMusic(0.02);
      v.phase = 'hold';
      v.freezeAt = d.time;
      B.look = { ...GAZE[i] };
      B.lookTarget = { ...GAZE[i] };
      if (i < 2) await d.say('k3_freeze');
      // üçüncüsünü anlatıcının yavaş sesi söyler, ağzı Beste oynatır; etiket ANLATICI kalır
      else await d.say('k3_freeze_last', { who: 'beste' });

      // ---- DONMA: gri kare, adam yalnızca burada var
      d.stopFF();
      d.noFF = true;
      v.phase = 'freeze';
      B.expr = 'frozen';
      v.man = { stage: i + 1, tilt: 0 };
      d.setBase(FREEZE, 0.01);
      g.audio.setTapeFx('t1', 0.05, { hiss: HISS * (i < 2 ? 0.3 : 0.05) });
      g.audio.setHiss(true);
      watchStart(i);
      if (i < 2) await d.wait(FREEZE_SEC[i]);
      else {
        d.tag({ rev: 'k3_ters' });
        d.sfx('heartbeat', 2, 1.2);
        await d.wait(1.2);
        // çok kısık, ters çalınan fısıltı (geri sarınca düz duyulur)
        let wh = null;
        if (!g.debug?.fast && !d.ff) {
          wh = g.audio.playVoice('k3_ters_rev', { gain: 0.35 });
          if (d.paused || d.rewinding) wh.pause();
        }
        try {
          await d.wait(FREEZE_SEC[2] - 1.2);
        } finally {
          wh?.stop();
        }
        d.tag(null);
      }
      watchStop();

      // ---- müzik döner, adam yok olur
      v.man = null;
      v.phase = 'dance';
      d.noFF = false;
      d.setBase(BASE, 0.01);
      g.audio.setTapeFx('t1', 0.05);
      g.audio.setHiss(true);
    }
    still = !mv.moved.some(Boolean);
    if (first) st.flags.still = still;

    // son kısa dans, sonra oyun biter
    B.expr = 'happy';
    B.lookTarget = null;
    B.wave = 1;
    v.waveMode = 'up';
    d.music('box', { tempo: 126, gain: 0.15 });
    await d.say('k3_dance');
    await d.wait(1.5);
    // JUMPSCARE: sahte sakinlik. Üçüncü donmada en yakındaki adam, müzik tam neşeliyken ekranı doldurur
    if (!d.ff) d.stopMusic(0.02);
    if (await d.jumpscare({ draw: S3.scareGreyMan, sec: 0.55, room: true })) {
      // adam yok, Beste hiçbir şey olmamış gibi gülümsemeye devam eder
      B.expr = 'happy';
      await d.wait(0.9);
      d.music('box', { tempo: 126, gain: 0.15 });
    }
    await d.wait(1.2);
  } finally {
    watchStop();
    d.onKey = null;
    d.noFF = false;
    d.tag(null);
    // kaset donma anında iptal edilirse ekran gri kalmasın
    if (d.aborted) for (const [k, val] of Object.entries(SCREEN_DEFAULT)) if (k in d.tv.p) d.tv.p[k] = val;
  }
  d.stopMusic(0.5);
  d.tweens.add(v, 'dance', 0, 0.6);
  await d.wait(0.6);
  B.wave = 0;
  d.setBase({ ...BASE, saturation: 1.1 }, 1.5);

  // ---------------------------------------------------------------- Arkamızda biri var mıydı?
  d.music('box', { tempo: 104, gain: 0.08 });
  B.wave = 1;
  await d.say('k3_game_end');
  B.wave = 0;
  await d.wait(0.3);
  await d.say('k3_ask_behind');
  const behind = (await d.ask({ idle: ['b1_idle2', 'b1_idle3'], maxLen: 24 })) || '';
  if (has(behind, ...BEHIND_YES)) {
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k3_behind_yes');
    B.lookTarget = null;
    T.tremble = 0.7;
    T.expr = 'sad';
    await d.wait(0.3);
    await d.say('k3_tonton_saw');
    // Beste başını yavaşça Tonton'a çevirir, donuk sırıtışla
    d.stopMusic(0.4);
    B.expr = 'frozen';
    B.lookTarget = { x: 0.95, y: 0.05 };
    d.tweens.add(B, 'tilt', 0.16, 1.4);
    await d.wait(1.6);
    await d.say('k3_tonton_hush');
    // Tonton anında kaskatı kesilir
    T.tremble = 0;
    T.expr = 'neutral';
    T.still = true;
    await d.wait(1.1);
    d.tweens.add(B, 'tilt', 0, 0.25);
    B.expr = 'happy';
    B.lookTarget = null;
    await d.wait(0.4);
  } else {
    await d.say('k3_behind_no');
  }
  // kararı: kıpırdadın mı?
  d.stopMusic(0.3);
  B.expr = still ? 'frozen' : 'neutral';
  B.lookTarget = { x: 0, y: 0 };
  await d.wait(0.5);
  await d.say(still ? 'k3_still' : 'k3_not_still');
  await d.wait(0.6);
  B.expr = 'happy';
  B.lookTarget = null;

  // ================================================================ HAFTANIN SİHİRLİ SÖZÜ
  const W = { shown: 0, popAt: [], flash: 0, flip: 0, back: '', confetti: null, typed: null };
  d.sfx('static', 0.15, 0.15);
  d.sfx('talkShowSting');
  // köşede küçük Beste, aynalanmış: el sallayan kolu karta uzanır
  Object.assign(B, { x: 566, y: 398, scale: 0.6, flip: true, wave: 1, expr: 'happy', lookTarget: { x: 0.85, y: -0.25 }, tilt: 0 });
  d.scene((c, t) => {
    S3.wordCard(c, t, { letters: 'SOBE', shown: W.shown, popAt: W.popAt, now: d.time, flash: W.flash, flip: W.flip, back: W.back, confetti: W.confetti });
    drawB(c);
    if (W.typed != null) S.promptBox(c, d.time, W.typed, {});
  });
  d.music('jingle', { tempo: 152, gain: 0.22 });
  await d.wait(0.7);
  await d.say('k3_word_intro');
  d.stopMusic(0.5);
  d.music('box', { tempo: 104, gain: 0.1 });
  B.wave = 0;
  {
    // harfler Beste hecelerken tek tek patlar
    const dur = lineDur('k3_word_spell');
    const p = later(d.say('k3_word_spell'));
    await d.wait(dur * 0.33);
    for (let i = 0; i < 4; i++) {
      W.shown = i + 1;
      W.popAt[i] = d.time;
      d.sfx('cartoonPop');
      if (i < 3) await d.wait(Math.max(0.05, dur * 0.06));
    }
    await p;
  }
  B.wave = 1;
  await d.say('k3_word_ask');
  B.wave = 0;
  const isSobe = (txt) => /sobe+/.test(norm(txt).replace(/ /g, ''));
  let gotIt = false;
  for (let tries = 0; tries < 3; tries++) {
    const ans = (await d.ask({ idle: ['b1_idle1'], maxLen: 16 })) || '';
    if (isSobe(ans)) {
      gotIt = true;
      break;
    }
    if (tries < 2) {
      W.flash = 1;
      d.tweens.add(W, 'flash', 0, 2.2);
      await d.say(tries === 0 ? 'k3_word_wrong' : 'k3_word_wrong2');
    }
  }
  if (gotIt) {
    W.confetti = d.time;
    d.sfx('clap');
    d.sfx('cartoonPop');
    B.wave = 1;
    await d.say('k3_word_right');
  } else {
    // üçüncü yanlışta Beste kutuya kendisi yazar
    const p = later(d.say('k3_word_help'));
    W.typed = '';
    await d.wait(0.5);
    for (const ch of 'SOBE') {
      W.typed += ch;
      d.sfx('click');
      await d.wait(0.3);
    }
    await d.wait(0.3);
    d.sfx('beep', true);
    W.confetti = d.time;
    // OLAY: son harf yazılınca tavan arasındaki ampul titrer, Beste'nin yüzü boşalır, arkadan fısıltı gelir
    B.expr = 'void';
    d.glitch(0.9, 0.5);
    if (!g.settings?.flash) g.room?.flickerBurst?.(1.0);
    await p;
    await d.wait(0.2);
    B.expr = 'happy';
    await later(d.sayRoom('k3_word_whisper', { pos: 'behind', gain: 1.15 }));
    await d.wait(0.3);
    W.typed = null;
  }
  st.clues.sobe = true;
  B.wave = 0;
  await d.wait(0.9);

  // ---- müzik durur, yüz donar, konfeti kesilir, kart yavaşça döner... ve makas
  d.stopMusic(0.02);
  W.confetti = null;
  B.expr = 'frozen';
  B.lookTarget = { x: 0, y: 0 };
  await d.wait(1.0);
  {
    const dur = lineDur('k3_word_cold');
    const cutAt = g.debug?.fast ? 0.2 : Math.max(1.4, dur - 0.42);
    const p = later(d.say('k3_word_cold', { sub: 'Ama sakın yüksek sesle söyleme. Yoksa o da duyar. Ve sobelenen ki—', keep: true }));
    const t0 = d.time;
    const flipDur = Math.max(0.5, cutAt * 0.32);
    await d.wait(cutAt * 0.2);
    d.tweens.add(W, 'flip', 1, flipDur);
    await d.wait(flipDur * 0.85);
    // GİZLİ: kartın arkası
    W.back = 'O DUYDU';
    d.tag({ secret: { id: 'oduydu', text: 'O DUYDU' } });
    await d.wait(0.25);
    W.back = '';
    d.tag(null);
    const rest = cutAt - (d.time - t0);
    if (rest > 0) await d.wait(rest);
    // KURGU MAKASI: altı kare beyaz lider, kuru tık, ses düşer, sayaç 37 sn ileri atlar
    d.voice?.stop();
    g.ui.subtitle(null);
    d.sfx('splice');
    g.audio.setHiss(false);
    d.scene((c, t) => S3.spliceLeader(c, t, { dim: g.settings?.flash }));
    await d.wait(0.24);
    await p;
    d.scene(() => {});
    await d.wait(0.08);
    d.time += 37;
  }
  g.audio.setHiss(true);
  d.showOsd('▶ OYNAT', 2.2);

  // ================================================================ veda (alacakaranlık)
  Object.assign(B, { x: 250, y: 455, scale: 1, flip: false, expr: 'happy', wave: 0, lookTarget: null, tilt: 0 });
  Object.assign(T, { x: 470, y: 455, scale: 0.9, still: true, headTurn: -0.85, headTilt: 0, tremble: 0, expr: 'neutral', tailColor: null });
  v.dusk = 0.3;
  d.scene(bedroom);
  d.glitch(0.35, 0.3, false);
  d.music('box', { tempo: 96, detune: -30, gain: 0.12 });
  await d.wait(0.8);
  B.wave = 1;
  B.lookTarget = { x: 0.9, y: 0 };
  await d.say('k3_bye');
  B.wave = 0;
  await d.wait(0.6);
  // başı dönmeden, tek karede izleyiciye çevrilir
  T.headTurn = 0;
  await d.wait(0.5);
  await d.say('k3_tonton_bye');
  await d.wait(0.3);
  B.expr = 'neutral';
  await d.wait(0.9);
  B.expr = 'happy';
  B.lookTarget = null;
  B.wave = 1;
  await d.say('k3_bye_next');
  B.wave = 0;
  await d.wait(0.4);

  // ---- parlak kapanış
  d.stopMusic(0.3);
  d.sfx('static', 0.3, 0.2);
  d.setBase(BASE, 0.3);
  d.scene((c, t) => S.endCard(c, t));
  d.music('jingle', { tempo: 152, gain: 0.22 });
  await d.say('n_outro');
  await d.wait(1.1);
  // JUMPSCARE: neşeli jenerik ortasında dikişli Tonton tek kare yüzünü gösterir
  if (await d.jumpscare({ face: 'tonton', sec: 0.4 })) await d.wait(0.9);
  else await d.wait(1.3);
  d.stopMusic(0.4);
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 2.0, 0.25);
  await d.wait(2.0);
  d.scene(() => {});
  await d.wait(0.8);
  // kasetten sonra odadaki çarşaflı eşya bir metre yaklaşmış olacak (bağlayıcı odada uygular)
  if (first) st.room = { ...(st.room || {}), sheetMoved: true };
}

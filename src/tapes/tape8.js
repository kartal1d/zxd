// KASET 8 — "Ebe Sensin!" (gece Çamlık; saklambacın gerçek kuralları ve ağaçların arasındaki adamın adı: EBE)
// Kendine özgü mekanik: DURAKLATMAK = GÖZLERİNİ KAPATMAK. Bant donukken oda gerçek zamanda sayar:
// kapıdan sandalyene yürüyen bir ses, Tape 1'in "Sekiz. Dokuz. On." dosyasıyla kulağının dibinde biter.
// Duraklatılmış kare de canlıdır (oyun saatiyle çizilir): Beste başını kameraya çevirir, beşinci kural belirir.
import * as S from '../draw/scenes.js';
import * as S3 from '../draw/scenes3.js';
import * as E from '../draw/scenes8.js';
import { has, norm, clamp, smooth, lerp } from '../util.js';
import { SCREEN_DEFAULT } from '../tv.js';

/** Gece görüntüsü: soluk, mavi, izli */
const NIGHT = { saturation: 0.4, tintR: 0.72, tintG: 0.85, tintB: 1.25, noise: 0.12, tracking: 0.45, jitter: 0.35, aberration: 1.6, glitch: 0, roll: 0, pixel: 0, brightness: 1.5 };
/** Sayımdan sonra orman daha karanlık */
const NIGHT_DEEP = { saturation: 0.34, noise: 0.13, tracking: 0.5 };
/** Sabah: fazla parlak, fazla neşeli */
const MORNING = { saturation: 1.15, tintR: 1.03, tintG: 1.0, tintB: 0.95, noise: 0.06, tracking: 0.12, jitter: 0.1, aberration: 0.6, glitch: 0 };
const FX = { echo: 0.2, wow: 1.6, lp: 4300, hiss: 0.026, rate: 0.98 };

/** Oda sayımı (duraklatmanın başından itibaren gerçek saniye) */
const COUNT = { a: 2.0, secret: 3.5, creak: 6.5, lid: 7.0, b: 8.0, breath: 10.0, end: 10.5, realWait: 20, realNow: 26 };
/** Duraklatmayı bekleme: uyarılar ve kendiliğinden duraklama (bant saniyesi) */
const NAG = { p1: 12, p2: 24, p3: 36, force: 44 };
/** Duraklatılmış karede tahtadaki tebeşir adamın adımları (R.fig: 0 köşede ... 4 yok) */
const WALK = [
  { x: 440, y: 64, k: 1, tilt: 0 },
  { x: 432, y: 66, k: 1.18, tilt: 0.1 },
  { x: 402, y: 72, k: 1.55, tilt: 0.2 },
  { x: 345, y: 82, k: 2.1, tilt: 0.34 },
  null,
];
/** Gerçek Beste'nin fısıltısı: sol duvardaki raf tarafı */
const SHELF = { x: -2.4, y: 0.8, z: -0.1 };
const MOON = { x: 566, y: 62, r: 110, a: 0.85 };

const DONT = ['bilmiyorum', 'bilmiyom', 'bilmem', 'hatirlamiyorum', 'hatirlamiyom', 'hatirlamam', 'unuttum', 'unutdum', 'fikrim yok', 'bilemedim', 'emin degilim'];
/** "bilmiyorum", "hatırlamıyorum", "unuttum" yanlış sayılır */
const dontKnow = (txt) => !txt || has(txt, ...DONT);
const words = (txt) => norm(txt).split(' ').filter(Boolean);
const isSobe = (txt) => /sobe/.test(norm(txt).replace(/ /g, ''));

/** Arka planda başlatılan sözün reddi (kaset iptali) yakalanmamış hata sayılmasın */
const later = (p) => {
  p.catch(() => {});
  return p;
};

export async function tape8(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const NAME = (st.name || 'Arkadaşım').toLocaleUpperCase('tr');
  // ampul: 6. kasette söndüyse karanlık kalır (karartma/titreme yalnızca yanıyorsa)
  const bulb0 = g.room.bulbBase ?? 1;
  const bulbOn = bulb0 > 0.05;
  const bulb = (k, dur = 1) => bulbOn && g.room.setBulb(bulb0 * k, dur);
  const flick = (sec) => bulbOn && !lowFlash && g.room.flickerBurst(sec);

  const v = {
    // el feneri: vurduğu yer (tx, ty), yarıçap br, güç pow; sweep: ormanı kendi kendine tarar
    tx: 440, ty: 300, br: 62, pow: 1, sweep: true, cx: 440, cy: 300,
    aim: 0, bloom: 0, bx: 320, by: 240, flick: 0,
    dark: 0.8,
    tear: 0,
    // tahta
    shown: 0, highlight: null, red3: 0, label: 0, figTilt: 0, figGone: false, man: 0, gone: false,
    // arama
    dropped: false, stumpMan: false, zoom: 1, zx: 320, zy: 240,
  };
  // gözlerini kapat (duraklatma) durumu
  const R = { armed: false, closed: false, counting: false, countDone: false, at: 0, fig: 0, round: -1, resolve: null, timers: [], handles: new Set(), pose: null };

  const lineDur = (id) => {
    if (g.debug?.fast) return 0.2;
    if (d.ff) return 0.6;
    const du = g.audio.duration?.(id) || 0;
    return du ? du / (g.audio.fx?.rate || 1) : 2.5;
  };
  const drawB = (c, over = {}) => d.beste(c, over);
  /** Beste'nin el feneri tutan elinin ekrandaki yeri */
  const handPos = (sc = B.scale) => ({ x: B.x + (B.flip ? -1 : 1) * 58 * sc, y: B.y - 72 * sc });
  const faceSpot = (sc = B.scale, a = 0.72) => ({ x: B.x, y: B.y - 165 * sc, r: 120 * sc + 20, a });
  /** Fenerin ışığını bir noktaya kaydırır (taramayı bırakır) */
  const beamTo = (x, y, dur = 0.5, r = null) => {
    if (v.sweep) {
      v.tx = v.cx;
      v.ty = v.cy;
      v.sweep = false;
    }
    d.tweens.add(v, 'tx', x, dur);
    d.tweens.add(v, 'ty', y, dur);
    if (r != null) d.tweens.add(v, 'br', r, dur);
  };
  /** Fenerin titreyen gücü (v.flick > 0 iken kesik kesik) */
  const beamPow = () => {
    if (v.flick <= 0) return v.pow;
    const k = Math.floor(g.clock * 22);
    return v.pow * (((k * 7919) % 10) / 10 > 0.45 ? 1 : 0.12);
  };
  const fxLayer = (c) => {
    if (v.bloom > 0) E.bloom(c, v.bx, v.by, v.bloom, lowFlash);
    if (v.tear > 0) E.tear(c, v.tear, d.time);
  };
  /** Fener objektife döner: beyaz parlama */
  async function bloomFlash(peak = 1) {
    v.aim = 1;
    d.sfx('whoosh');
    d.tweens.add(v, 'bloom', peak, 0.16);
    await d.wait(0.3);
    d.tweens.add(v, 'bloom', 0, 0.55);
    await d.wait(0.3);
    v.aim = 0;
  }

  // ---------------------------------------------------------------- ortam sesi (duraklatınca susar)
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

  // ---------------------------------------------------------------- odadaki sayım (gerçek zaman, duraklatma onu durdurmaz)
  /** Odadan gelen ses; erken açılırsa hemen kesilebilsin diye tutamacı saklanır. */
  function roomVoice(id, o = {}) {
    const line = g.lines[id];
    if (!line) {
      console.warn('replik yok', id);
      return { promise: Promise.resolve(), stop() {} };
    }
    const tok = ++d.subTok;
    g.ui.subtitle(o.label ?? line.w ?? '???', d.fmt(line.s || line.t), 'bilinmeyen');
    let h;
    if (g.debug?.fast || !g.audio.buffers?.has(id)) {
      // ses dosyası yoksa (ya da test kipinde) altyazı kadar bekler
      let res;
      const promise = new Promise((r) => (res = r));
      const to = setTimeout(res, g.debug?.fast ? 150 : 2500);
      h = { promise, stop: () => (clearTimeout(to), res()) };
    } else h = g.audio.playRoomVoice(id, { pos: o.pos, gain: o.gain ?? 1.2, rate: o.rate ?? 1, wet: o.wet ?? 0.35 });
    R.handles.add(h);
    h.promise.then(() => {
      R.handles.delete(h);
      if (d.subTok === tok) g.ui.subtitle(null, null, null, 0.35);
    });
    return h;
  }
  const sched = (sec, fn) => R.timers.push(d.realTimeout(() => R.counting && fn(), sec));

  function startCount() {
    R.counting = true;
    R.countDone = false;
    R.at = g.clock;
    R.fig = 0;
    R.pose = { look: { ...B.look }, tilt: B.tilt || 0, expr: B.expr === 'void' || B.expr === 'angry' ? 'happy' : B.expr };
    bulb(0.3, 1.2);
    const l = g.room.listener().pos;
    const L = { x: l.x, y: l.y, z: l.z };
    const door = P.door;
    const chair = { x: 0.05, y: 1.1, z: 0.55 };
    const mid = { x: (door.x + chair.x) / 2, y: 0.05, z: (door.z + chair.z) / 2 };
    // +0.8 sn: ölü sessizlik. Sonra kapıdan sandalyeye, sandalyeden kulağa.
    sched(COUNT.a, () => {
      R.fig = 1;
      roomVoice('k8_count_a', { pos: door, gain: 0.6, wet: 0.5 });
    });
    // GİZLİ: beşinci kural göründüğü an (d.tag değil: duraklatılmış kare banda kaydedilmez, geri sarınca da görünmez)
    sched(COUNT.secret, () => g.foundSecret('kural5', 'EBE HİÇ ÖLMEZ'));
    sched(COUNT.creak, () => {
      R.fig = 2;
      d.sfx('footCreak', mid);
    });
    sched(COUNT.lid, () => {
      d.sfx('chestLid', P.chest);
      g.room.attic?.openChest?.();
    });
    sched(COUNT.b, () => {
      R.fig = 3;
      roomVoice('k8_count_b', { pos: { x: chair.x + 0.12, y: 1.15, z: chair.z }, gain: 1.0, wet: 0.25 });
    });
    sched(COUNT.breath, () => d.sfx('breath', { x: L.x - 0.04, y: L.y + 0.05, z: L.z + 0.3 }, 1));
    sched(COUNT.end, () => {
      R.fig = 4;
      // Tape 1'in aynı dosyası, sağ kulağın dibinde
      const h = roomVoice('n_count_end', { pos: { x: L.x + 0.25, y: L.y, z: L.z + 0.15 }, gain: 1.1, wet: 0.04, label: '???' });
      h.promise.then(() => R.counting && (R.countDone = true));
    });
    // uzun süre kapalı tutana ödül: gerçek Beste, o göremezken konuşur
    sched(COUNT.realWait, () => roomVoice('k8_real_wait', { pos: SHELF, gain: 0.9 }));
    sched(COUNT.realNow, () => roomVoice('k8_real_now', { pos: SHELF, gain: 0.9 }));
    for (const s of [42, 72, 102, 132]) sched(s, () => g.ui.toast('Gözlerini açmak için kaseti oynat: BOŞLUK.', 4));
    // test kipinde kimse Boşluk'a basmaz: sayım bitince kaset kendisi devam eder
    if (g.debug?.fast && !g.debug.k8manual) sched(12.5, () => d.paused && d.togglePause());
  }

  function stopCount() {
    R.counting = false;
    for (const c of R.timers) c();
    R.timers = [];
    for (const h of [...R.handles]) h.stop();
    R.handles.clear();
  }

  d.onPause = (paused) => {
    loopsPause(paused);
    if (!R.armed) return;
    if (paused) {
      // gözler kapandı: kasetteki ses yarıda kalır, oda saymaya başlar
      R.closed = true;
      d.voice?.stop();
      startCount();
    } else {
      // gözler açıldı: odadaki her ses anında kesilir
      const full = R.countDone;
      const secs = g.clock - R.at;
      stopCount();
      R.armed = false;
      R.resolve?.({ full, secs });
    }
  };

  const RULE_Y = (i) => E.BOARD.ruleY + i * E.BOARD.gap;
  const chalk = (sec = 0.5) => d.sfx('pencil', sec);
  /** Arama: dört saklanma yeri (fenerin vurduğu nokta, yakın plan, replik) */
  const SPOTS = {
    tree: { x: 92, y: 288, line: 'k8_tree', draw: (c, t) => E.closeCarving(c, t, { name: NAME }) },
    bush: { x: 528, y: 372, line: 'k8_bush', draw: (c, t) => E.closeShoe(c, t) },
    stump: { x: 395, y: 352, line: 'k8_stump', draw: (c, t) => E.closeStump(c, t) },
    basket: { x: 250, y: 418, draw: (c, t) => E.closeBasket(c, t) },
  };
  /** Arama sahnesi: karanlık orman, fener yerde ya da senin elinde */
  const seekScene = (c, t) => {
    c.save();
    if (v.zoom > 1.001) {
      c.translate(v.zx, v.zy);
      c.scale(v.zoom, v.zoom);
      c.translate(-v.zx, -v.zy);
    }
    E.forest(c, t, { dark: 0.88, basket: true, tonton: true, stumpMan: v.stumpMan });
    const spots = [MOON, { x: 598, y: 440, r: 90, a: 0.25 }];
    if (v.dropped) {
      spots.push({ x: 330, y: 446, r: 170, a: 0.55 });
      E.lights(c, { amount: v.dark, spots });
      E.droppedLight(c, 330, 446, g.clock);
    } else {
      // fener artık senin elinde: ışık aşağıdan, ekranın dışından gelir
      const wx = Math.sin(t * 1.3) * 7 + Math.sin(t * 3.3) * 2;
      const wy = Math.cos(t * 1.1) * 5;
      E.lights(c, { amount: v.dark, beam: { sx: 420, sy: 560, tx: v.tx + wx, ty: v.ty + wy, r: v.br, pow: beamPow() }, spots });
    }
    c.restore();
    fxLayer(c);
  };

  // ---------------------------------------------------------------- kaset ayarları
  g.audio.setTapeFx('t2', 0.1, FX);
  g.audio.setHiss(true);
  d.setBase(NIGHT, 0.1);
  d.eyeMode = 'viewer';
  let ejectTries = 0;
  d.ejectPolicy = () => {
    ejectTries++;
    if (!d.voice && ejectTries <= 3) d.sayAsync('b2_eject');
    d.glitch(0.5, 0.35);
    return false;
  };

  try {
    // ============================================================== açılış: mavi ekran, donmuş gece jeneriği
    d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
    await d.wait(1.4);
    d.sfx('static', 0.4);
    // jingle yok; yıldızlar dönmüyor, gökkuşağı gri
    d.scene((c) => E.nightTitle(c, { episode: '8. Bölüm', title: 'Ebe Sensin!' }));
    bulb(0.5, 3);
    await d.wait(1.6);
    await d.say('k8_title');
    await d.wait(2.4);

    // ============================================================== gece Çamlık: el feneri, yüzüstü Tonton
    Object.assign(B, { x: 236, y: 468, scale: 0.8, flip: false, expr: 'happy', wave: 0, tilt: 0, lookTarget: { x: 0.7, y: -0.3 } });
    const openScene = (c, t) => {
      E.forest(c, t, { dark: 0.78, tonton: true });
      drawB(c);
      const h = handPos();
      let tx = v.tx, ty = v.ty;
      if (v.sweep) {
        tx = 450 + Math.sin(t * 0.42) * 150;
        ty = 330 + Math.sin(t * 0.84 + 1) * 80;
      }
      v.cx = tx;
      v.cy = ty;
      const spots = [MOON, faceSpot(), { x: 598, y: 440, r: 90, a: 0.3 }];
      if (v.aim > 0.5) {
        v.bx = h.x;
        v.by = h.y;
        E.lights(c, { amount: v.dark, spots: [...spots, { x: h.x, y: h.y, r: 140, a: 0.9 }] });
        E.flashlight(c, h.x, h.y, 0, B.scale, { front: true });
      } else {
        const ang = Math.atan2(ty - h.y, tx - h.x);
        const lens = { x: h.x + Math.cos(ang) * 31 * B.scale, y: h.y + Math.sin(ang) * 31 * B.scale };
        E.lights(c, { amount: v.dark, beam: { sx: lens.x, sy: lens.y, tx, ty, r: v.br, pow: beamPow() }, spots });
        E.flashlight(c, h.x, h.y, ang, B.scale);
      }
      fxLayer(c);
    };
    d.scene(openScene);
    d.sfx('static', 0.2, 0.2);
    loopOn('wind', 0.03);
    await d.wait(1.4);
    // fener sana döner, "Merhaba" der gibi
    {
      const p = later(d.say('k8_hello'));
      await d.wait(0.5);
      B.lookTarget = { x: 0, y: 0 };
      await bloomFlash(0.9);
      B.lookTarget = null;
      await p;
    }
    await d.wait(0.4);
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_ask_promise');
    await askPromise();
    await d.wait(0.4);
    B.wave = 1;
    B.lookTarget = null;
    await d.say('k8_rules_intro');
    B.wave = 0;

    // ============================================================== SAKLAMBAÇ KURALLARI (karanlıkta bir kara tahta)
    // fener objektife döner; parlamanın tepesinde tahtaya geçilir
    v.aim = 1;
    d.sfx('whoosh');
    d.tweens.add(v, 'bloom', 1, 0.16);
    await d.wait(0.22);
    Object.assign(B, { x: 580, y: 462, scale: 0.74, flip: true, expr: 'happy', wave: 0, tilt: 0, lookTarget: { x: 0.85, y: -0.3 } });
    Object.assign(v, { sweep: false, tx: 250, ty: 110, br: 150, pow: 1, dark: 0.8 });
    const boardScene = (c, t) => {
      const pl = d.paused && R.counting; // yalnızca duraklatılmış karede görünen katman
      const pt = pl ? g.clock - R.at : 0;
      E.rulesBoard(c, t, { shown: v.shown, highlight: v.highlight, red3: v.red3, label: v.label, figTilt: v.figTilt, figure: !(pl || v.figGone) });
      if (v.man > 0) S3.drawGreyMan(c, 530, 330, 250, { alpha: v.man, headTilt: 0.22 });
      let sc = B.scale;
      let over = {};
      if (pl) {
        // donmuş karede baş yavaşça kameraya döner, gözler boşalır, biraz yaklaşır
        const turn = smooth(clamp((pt - 1.5) / 3.5, 0, 1));
        sc = B.scale * (1 + 0.07 * smooth(clamp(pt / 12, 0, 1)));
        over = {
          scale: sc,
          look: { x: lerp(R.pose.look.x, 0, turn), y: lerp(R.pose.look.y, 0, turn) },
          tilt: R.pose.tilt - turn * 0.42,
          expr: pt > 5.6 ? 'void' : turn > 0.35 ? 'frozen' : R.pose.expr,
          blink: 0,
          mouth: 0,
          wave: 0,
        };
      }
      const h = handPos(sc);
      let pow = beamPow();
      if (pl) pow *= 1 - 0.72 * smooth(clamp(pt / 10, 0, 1));
      const spots = [MOON];
      if (!v.gone) {
        drawB(c, over);
        spots.push(faceSpot(sc, v.pow > 0.5 ? 0.72 : 0.5));
      }
      let lens = null;
      let ang = 0;
      if (!v.gone && v.aim > 0.5) {
        v.bx = h.x;
        v.by = h.y;
        spots.push({ x: h.x, y: h.y, r: 140, a: 0.9 });
        E.lights(c, { amount: v.dark, spots });
      } else if (!v.gone) {
        ang = Math.atan2(v.ty - h.y, v.tx - h.x);
        lens = { x: h.x + Math.cos(ang) * 31 * sc, y: h.y + Math.sin(ang) * 31 * sc };
        E.lights(c, { amount: v.dark, beam: { sx: lens.x, sy: lens.y, tx: v.tx, ty: v.ty, r: v.br, pow }, spots });
      } else {
        // Beste yok: feneri yerde, ışığı sana dönük
        spots.push({ x: 548, y: 452, r: 170, a: 0.55 });
        E.lights(c, { amount: v.dark, spots });
        E.droppedLight(c, 548, 452, g.clock);
      }
      if (pl) E.boardPausedLayer(c, { fifth: clamp((pt - 3) / 3, 0, 1), walk: WALK[R.fig] && { ...WALK[R.fig], tilt: WALK[R.fig].tilt + v.figTilt, alpha: 0.62 } });
      if (!v.gone) E.flashlight(c, h.x, h.y, ang, sc, { front: v.aim > 0.5 });
      fxLayer(c);
    };
    d.scene(boardScene);
    d.tweens.add(v, 'bloom', 0, 0.6);
    await d.wait(0.35);
    v.aim = 0;
    await d.wait(0.5);
    {
      const dur = lineDur('k8_rules_a');
      const p = later(d.say('k8_rules_a'));
      v.shown = 1;
      chalk();
      beamTo(230, RULE_Y(0), 0.4, 150);
      await d.wait(dur * 0.48);
      v.shown = Math.max(v.shown, 2);
      chalk();
      beamTo(240, RULE_Y(1), 0.4);
      await p;
    }
    {
      const dur = lineDur('k8_rules_b');
      const p = later(d.say('k8_rules_b'));
      v.shown = 3;
      chalk();
      beamTo(240, RULE_Y(2), 0.4);
      await d.wait(dur * 0.48);
      v.shown = 4;
      chalk();
      beamTo(250, RULE_Y(3), 0.4);
      await p;
    }
    v.shown = 4;
    await d.wait(0.4);
    // ---- soru: üçüncü kural (fener kapalı, karanlıkta)
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_rules_dark');
    d.sfx('click');
    v.pow = 0;
    d.tweens.add(v, 'dark', 0.9, 0.3);
    await d.wait(0.5);
    await d.say('k8_rules_ask');
    await askRule3();
    d.tweens.add(v, 'dark', 0.8, 0.4);
    v.highlight = null;

    // ---- bilmece: ağaçların arasındaki amcanın adı
    await d.wait(0.5);
    B.lookTarget = { x: 0.6, y: -0.6 };
    beamTo(E.BOARD.fig.x, 130, 0.8, 95);
    await d.say('k8_ebe_riddle');
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_ask_ebe');
    await askEbe();
    st.clues.ebe = true;
    // ---- yanlış sakinlik, sonra tebeşir adam tahtadan atlar
    beamTo(250, 200, 0.9, 190);
    B.expr = 'happy';
    B.lookTarget = null;
    await d.wait(1.3);
    await d.jumpscare({ draw: (c, t) => E.chalkScare(c, t), sec: 0.5 });
    v.figTilt = 0.38; // tebeşir adamın başı artık sana dönük
    await d.wait(0.9);

    // ============================================================== GÖZLERİNİ KAPAT (duraklat = göz kapat)
    B.wave = 1;
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_you_ebe');
    B.wave = 0;
    B.lookTarget = null;
    let outcome = 'full';
    for (let round = 0; ; round++) {
      const r = await eyesRound(round);
      if (r.full) break;
      // erken açtın: sayım yarıda kesildi
      bulb(0.5, 0.5);
      B.lookTarget = { x: 0, y: 0 };
      B.wave = 0;
      if (round === 0) {
        B.expr = 'angry';
        d.glitch(0.7, 0.4);
        await d.say('k8_peek');
        B.expr = 'happy';
        B.lookTarget = null;
        continue;
      }
      B.expr = 'void';
      d.glitch(1, 0.6);
      await d.say('k8_peek2');
      if (first) st.flags.peeked = true;
      outcome = 'burned';
      break;
    }
    R.armed = false;
    if (outcome === 'full') {
      // gözlerini açtın: Beste saklanmış, tebeşir adam tahtadan inmiş; ses her yerden
      v.gone = true;
      v.figGone = true;
      d.tweens.add(v, 'dark', 0.86, 0.3);
      d.glitch(0.25, 0.3, false);
      await d.wait(1.6);
      await d.say('k8_pause_truth1');
      await d.wait(0.5);
      await d.say('k8_pause_truth2');
      await d.wait(1.0);
    } else {
      await d.wait(0.8);
    }

    // ============================================================== ARA: Beste yok, feneri yerde
    d.sfx('static', 0.25, 0.2);
    d.setBase(NIGHT_DEEP, 1.0);
    Object.assign(v, { sweep: false, tx: 330, ty: 400, br: 70, pow: 1, dark: 0.87, dropped: true, aim: 0, gone: false });
    d.scene(seekScene);
    await d.wait(2.6);
    // ---- feneri yerden alırsın: ışık kalkarken objektifin dibinde biri
    d.sfx('pickup');
    v.dropped = false;
    v.tx = 330;
    v.ty = 420;
    beamTo(320, 200, 0.35);
    await d.wait(0.2);
    await d.jumpscare({ draw: (c, t) => E.beamFace(c, t), sec: 0.48, room: true });
    beamTo(300, 380, 0.7, 75);
    await d.wait(1.4);

    // ============================================================== SOBELE: Beste'nin sesi karanlıktan
    d.music('creepy', { tempo: 50, gain: 0.17 });
    await d.say('k8_hidden');
    await d.say('k8_seek_ask');
    const matchSpot = (txt) => {
      if (has(txt, 'agac')) return 'tree';
      if (has(txt, 'cali')) return 'bush';
      if (has(txt, 'kutuk')) return 'stump';
      if (has(txt, 'sepet', 'piknik') || words(txt).includes('ip')) return 'basket';
      return null;
    };
    const picked = new Set();
    for (let n = 0; n < 3; n++) {
      const r = await d.choose({
        options: ['AĞAÇ', 'ÇALI', 'KÜTÜK', 'SEPET'],
        idle: ['b1_idle2'],
        match: (txt) => {
          const k = matchSpot(txt);
          return k && !picked.has(k) ? k : null;
        },
        unknown: 'k8_seek_unknown',
        maxTries: 4,
      });
      // sabırsız / bilmeyen oyuncu: fener kendiliğinden bir sonraki yere gider
      if (!r.key) r.key = ['tree', 'bush', 'stump', 'basket'].find((k) => !picked.has(k));
      picked.add(r.key);
      await visit(r.key);
      if (n === 0) await stumpGlimpse();
    }

    // ============================================================== ARKANA BAK (yalnızca ses; kamera dönmez)
    d.stopMusic(1.6);
    beamTo(330, 440, 2.2, 60);
    await d.wait(0.8);
    await d.say('k8_where');
    await d.wait(0.9);
    loopOff('wind');
    await d.say('k8_behind');
    {
      const l = g.room.listener().pos;
      d.sfx('footCreak', { x: l.x + 0.1, y: 0.05, z: l.z + 0.7 });
      await d.wait(0.7);
      d.sfx('breath', { x: l.x - 0.05, y: l.y + 0.05, z: l.z + 0.28 }, 1);
      if (bulbOn && !lowFlash) flick(0.35);
      else d.glitch(0.3, 0.3, false);
      v.flick = 1;
      await d.wait(0.5);
      v.flick = 0;
      await d.wait(2.0);
    }
    // ---- KORKUTMA: yüzü içeriden cama yapışmış
    d.setBase({ aberration: 3.0 }, 0.05);
    const pressed = (c, t) => E.pressedFace(c, t, drawB, {});
    await d.jumpscare({ draw: (c, t) => E.pressedFace(c, t, drawB, { scare: true }), sec: 0.6 });
    d.scene(pressed);
    await d.wait(0.5);
    await d.say('k8_here');
    await d.say('k8_ask_sobe');
    const sobe = await d.ask({ evil: true, timeout: 20, idle: ['k8_sobe_idle'], idleGap: 8, maxLen: 16 });
    await d.say(sobe && isSobe(sobe) ? 'k8_sobe_yes' : 'k8_sobe_no');
    await d.wait(1.5);
    // tek kelime, sağ kulağının hemen arkasından; ekran aynı karede kararır
    d.scene(() => {});
    g.audio.setHiss(false);
    await d.sayRoom('k8_ebe_sobe', { listener: true, gain: 1.3 });
    await d.wait(3.0);

    // ============================================================== SABAH
    // ---- karın içinde ters fısıltı (geri sarınca düz duyulur)
    g.audio.setHiss(true);
    d.setBase(NIGHT, 0.05);
    d.sfx('static', 0.6, 0.3);
    const revText = [...(g.lines.k8_ters?.t || '')].reverse().join('');
    d.scene((c, t) => {
      S.realGirl(c, t, { alpha: 0.4, flip: true });
      S.staticNoise(c, t, 0.4);
      if (Math.floor(t * 2) % 2) S.bigText(c, '◀◀', { color: '#ffffff', font: `64px ${S.FONT_OSD}`, y: 80 });
    });
    d.tag({ rev: 'k8_ters' });
    await d.say('k8_ters', { file: 'k8_ters_rev', sub: revText });
    d.tag(null);
    d.sfx('static', 0.3, 0.3);
    await d.wait(0.4);
    // ---- sert kesme: fazla parlak bir sabah, sanki pijama partisiydi
    bulb(1, 0.4);
    g.audio.setTapeFx('t1', 0.05);
    d.setBase(MORNING, 0.05);
    Object.assign(B, { x: 300, y: 455, scale: 1, flip: false, expr: 'happy', wave: 1, tilt: 0, lookTarget: null });
    d.scene((c, t) => {
      S.bgBedroom(c, t, { window: 'day' });
      drawB(c);
    });
    d.music('box', { tempo: 96, gain: 0.13 });
    await d.wait(0.6);
    await d.say('k8_morning');
    B.wave = 0;
    await d.wait(0.3);
    d.stopMusic(0.02);
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(0.7);
    await d.say('k8_bye');
    await d.wait(0.6);
    // ---- KURGU MAKASI, sonra kurgu masasının uğultusu ve Nermin
    d.voice?.stop();
    d.sfx('splice');
    g.audio.setHiss(false);
    d.scene((c, t) => E.splice(c, t, { dim: lowFlash }));
    await d.wait(0.24);
    d.scene(() => {});
    loopOn('deckHum', 0.03);
    await d.wait(1.4);
    await d.say('k8_nermin');
    await d.wait(1.4);
    loopOff('deckHum');
    // son: kar. Jenerik yok, program bitmedi.
    g.audio.setHiss(true);
    d.sfx('static', 1.8, 0.25);
    d.scene((c, t) => S.staticNoise(c, t, 1));
    await d.wait(2.2);
    d.scene(() => {});
    await d.wait(0.6);
    // kasetten sonra sandığın kapağı açık, dibi kalkık kalır: bunu oyun (finds.js, 8. kaset çıkışı) kurar
    return ejectTries;
  } finally {
    d.onPause = null;
    stopCount();
    R.armed = false;
    for (const n of Object.keys(loops.want)) loopOff(n);
    d.tag(null);
    if (d.aborted) {
      // kaset yarıda kalırsa oda ışığı ve ekran eski hâline döner
      if (bulbOn) g.room.setBulb(bulb0, 0.6);
      g.room.attic?.apply?.(st); // sayım sırasında açılan sandık kapağı, kaset yarıda kalırsa kapanır
      for (const [k, val] of Object.entries(SCREEN_DEFAULT)) if (k in d.tv.p) d.tv.p[k] = val;
    }
  }

  // ================================================================ alt bölümler
  /** Bir tur "gözlerini kapat": oyuncu duraklatıp açınca biter. { full: sayım bitti mi, secs } */
  function eyesRound(round) {
    R.round = round;
    R.closed = false;
    R.armed = true;
    const done = d.race(new Promise((res) => (R.resolve = res)));
    later(nagger(round));
    return done;
  }

  /** Duraklatmayı bekleme: anlatım, giderek sertleşen uyarılar, 44. saniyede kaset kendini durdurur. */
  async function nagger(round) {
    const alive = () => R.round === round && R.armed && !R.closed;
    if (round === 0) {
      B.lookTarget = { x: 0, y: 0 };
      await d.say('k8_how');
      if (!alive()) return;
      B.lookTarget = null;
      await d.say('k8_allowed');
      if (!alive()) return;
    }
    // Beste tahtanın yanında bekler, sana gülümser; ara sıra ağaçlara bakar
    beamTo(250, 205, 0.8, 190);
    const t0 = d.time;
    const at = async (sec) => {
      const w = t0 + sec - d.time;
      if (w > 0) await d.wait(w);
      return alive();
    };
    if (!(await at(NAG.p1 * 0.5))) return;
    B.lookTarget = { x: -0.9, y: -0.4 };
    if (!(await at(NAG.p1))) return;
    B.lookTarget = { x: 0, y: 0 };
    B.wave = 1;
    await d.say('k8_idle_p1');
    B.wave = 0;
    if (!(await at(NAG.p1 + 5))) return;
    B.lookTarget = { x: -0.9, y: -0.4 };
    if (!(await at(NAG.p2))) return;
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_idle_p2');
    if (!(await at(NAG.p3))) return;
    B.expr = 'frozen';
    // fener objektife: "kapat"
    later(bloomFlash(0.7));
    await d.say('k8_idle_p3');
    if (!(await at(NAG.force))) return;
    // kaset kendi kendini durdurur (OSD, tık sesi; senin elin değmeden)
    while (alive()) {
      d.forcePause();
      if (d.paused) break;
      await d.wait(1);
    }
  }

  /** "İlk gün sana bir söz vermiştim. Neydi?" (R1: iki ipucu, üçüncü yanlışta gerçek + kapı çalınır) */
  async function askPromise() {
    const ok = (txt) => !dontKnow(txt) && has(txt, 'saklan', 'sakla', 'bul', 'bulur', 'saklambac', 'sobe', 'sira');
    for (let wrong = 0; ; ) {
      const a = await d.ask({ idle: ['k8_idle', 'b1_idle3'], idleGap: 13, maxLen: 30 });
      if (ok(a)) {
        B.expr = 'happy';
        B.lookTarget = { x: 0, y: 0 };
        await d.say('k8_promise_right');
        B.lookTarget = null;
        return;
      }
      wrong++;
      if (wrong === 1) {
        B.expr = 'neutral';
        await d.say('k8_promise_hint1');
        B.expr = 'happy';
      } else if (wrong === 2) {
        B.tilt = 0.1;
        await d.say('k8_promise_hint2');
        B.tilt = 0;
      } else {
        await truthPromise();
        return;
      }
    }
  }

  /** Gerçek: "Sen saklanırsın, ben bulurum." Olay: senin (gerçek) kapın yavaşça üç kez çalınır, ampul ürperir. */
  async function truthPromise() {
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_promise_remind');
    await d.wait(0.6);
    flick(0.5);
    d.sfx('knock', P.door, 3, 0.8);
    // Beste de duyar: başı ve feneri senin kapına doğru döner
    B.lookTarget = { x: -0.95, y: 0.05 };
    beamTo(20, 330, 0.5, 70);
    await d.wait(2.8);
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_promise_kept');
    await d.wait(0.3);
    B.expr = 'happy';
    B.lookTarget = null;
    v.sweep = true;
  }

  /** "Üçüncü kural neydi?" (R1: iki ipucu, üçüncü yanlışta gerçek + tahta kendini kırmızıyla yazar, yüz boşalır) */
  async function askRule3() {
    const ok = (txt) => !dontKnow(txt) && (has(txt, 'sobelenen', 'sobelen', 'ilk', 'sobe', 'ebe olur') || (has(txt, 'ebe') && has(txt, 'olur')));
    for (let wrong = 0; ; ) {
      const a = await d.ask({ idle: ['b1_idle2', 'b1_idle3'], maxLen: 30 });
      if (ok(a)) {
        d.sfx('click');
        v.pow = 1;
        v.highlight = 2;
        beamTo(240, RULE_Y(2), 0.3, 150);
        await d.say('k8_rules_right');
        return;
      }
      wrong++;
      if (wrong === 1) await d.say('k8_rules_hint1');
      else if (wrong === 2) {
        B.expr = 'neutral';
        await d.say('k8_rules_hint2');
        B.expr = 'happy';
      } else {
        await truthRules();
        return;
      }
    }
  }

  async function truthRules() {
    // fener titreyerek yanar, görüntü yırtılır, Beste'nin yüzü boşalır, 3. kural kendiliğinden kırmızıyla yazılır
    d.sfx('click');
    v.pow = 1;
    v.flick = 1;
    beamTo(240, RULE_Y(2), 0.2, 150);
    B.expr = 'void';
    B.lookTarget = { x: 0, y: 0 };
    v.tear = 1;
    d.tweens.add(v, 'tear', 0, 1.1);
    d.glitch(0.9, 0.6);
    await d.wait(0.5);
    v.flick = 0;
    chalk(1.6);
    d.tweens.add(v, 'red3', 1, 1.6);
    await d.say('k8_rules_wrong');
    await d.say('k8_rules_chalk');
    await d.wait(0.4);
    B.expr = 'happy';
    B.lookTarget = null;
  }

  /** "Bu kim?" — EBE (R1: bilmecenin kendi iki ipucu, üçüncü yanlışta gerçek + gri adam bir an ışıkta) */
  async function askEbe() {
    let wrong = 0;
    let post = 0;
    let truth = false;
    for (;;) {
      const a = await d.ask({ idle: ['b1_idle2', 'b1_idle3'], maxLen: 20 });
      if (has(a, 'ebe')) break;
      if (truth) {
        // gerçek söylendikten sonra: bir kez daha ister, sonra yine de devam eder
        if (++post >= 2) break;
        await d.say('k8_ebe_again');
        continue;
      }
      wrong++;
      if (wrong === 1) await d.say('k8_ebe_hint1');
      else if (wrong === 2) await d.say('k8_ebe_hint2');
      else {
        await truthEbe();
        truth = true;
      }
    }
    if (v.label < 1) {
      // tebeşir kendiliğinden yazar
      chalk(1.0);
      d.tweens.add(v, 'label', 1, 1.0);
      await d.wait(1.0);
    }
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    await d.say('k8_ebe_right');
    B.expr = 'happy';
    B.wave = 1;
    B.tilt = 0.08;
    await d.say('k8_ebe_world');
    B.wave = 0;
    B.tilt = 0;
  }

  async function truthEbe() {
    B.expr = 'neutral';
    B.lookTarget = { x: 0, y: 0 };
    const p = later(d.say('k8_ebe_truth'));
    await d.wait(0.6);
    // fener titrer ve bir anlığına sağa, ağaçların arasına kayar: orada biri duruyor
    v.flick = 1;
    d.sfx('sting');
    beamTo(532, 190, 0.18, 85);
    v.man = 0.95;
    await d.wait(0.7);
    v.man = 0;
    v.flick = 0;
    beamTo(E.BOARD.fig.x, 150, 0.35, 95);
    // adı tahtaya kimse dokunmadan yazılır
    chalk(1.2);
    d.tweens.add(v, 'label', 1, 1.2);
    await p;
  }

  /** Fenerle bir yere bakmak: ışık oraya kayar, görüntü yaklaşır, yakın plan. */
  async function visit(key) {
    const sp = SPOTS[key];
    beamTo(sp.x, sp.y, 0.7, 70);
    await d.wait(0.75);
    v.zx = sp.x;
    v.zy = sp.y;
    d.tweens.add(v, 'zoom', 2.4, 0.55);
    await d.wait(0.55);
    d.sfx('static', 0.12, 0.12);
    d.scene((c, t) => E.closeLit(c, t, sp.draw, { r: 215 }));
    v.zoom = 1;
    await d.wait(0.6);
    if (key === 'basket') await d.say(st.flags?.rope ? 'k8_basket_rope' : 'k8_basket_norope');
    else await d.say(sp.line);
    await d.wait(0.9);
    d.sfx('static', 0.12, 0.12);
    d.scene(seekScene);
    await d.wait(0.4);
  }

  /** GİZLİ: birinci ve ikinci seçim arasında, ışık kütüğün üstünden geçerken arkasına çömelmiş adam. */
  async function stumpGlimpse() {
    await d.wait(0.5);
    beamTo(400, 325, 0.5, 70);
    await d.wait(0.45);
    v.stumpMan = true;
    d.tag({ secret: { id: 'oyuncu', text: 'BEN DE OYNUYORUM' } });
    await d.wait(0.25);
    v.stumpMan = false;
    d.tag(null);
    beamTo(300, 380, 0.9);
    await d.wait(0.6);
  }
}

// KASET 4 — "Kaybolursan Ne Yaparsın?" (sarı dublaj: güvenlik dersi, telefon şarkısı ve odada çalan telefon)
import * as S from '../draw/scenes.js';
import * as K from '../draw/scenes4.js';
import { has, norm, digits } from '../util.js';

const HOME = '364 27 27';
const TITLE = 'KAYBOLURSAM NE YAPARIM?';
const RULES = ['1. Olduğun yerde kal.', '2. Yabancılarla gitme.', '3. Ev telefonunu ezberle.'];
const VERSE1 = ['Ormanda bir amca gelse,', "'Gel, saklambaç oynayalım' dese,", 'hiç düşünmem, hemen derim:', `Ben seninle ${K.SLOT}!`];
const SONG = ['364 · 27 · 27!', 'Kaybolursan ara bizi,', "burası Beste'nin evi!"];
const TURNED = [`Ben seninle ${K.SLOT}!`, '364 · 51 · 80!', 'Kaybolursan ben ararım.', 'burası artık senin evin.'];
const DIAL = [3, 6, 4, 5, 1, 8, 0];
const GROUP_AT = [0, 5, 9]; // SONG'da rakam gruplarının hece ağırlığı başlangıçları

// Konumlar (her sahne Beste'yi kendi yerinde çizer; yıldız geçişinde iki sahne aynı anda görünür)
const AT_CLASS = { x: 548, y: 458, scale: 0.85 };
const AT_PHONE = { x: 236, y: 440, scale: 0.9 };
const AT_FOREST = { x: 150, y: 470, scale: 0.78 };
const AT_ROOM = { x: 250, y: 455, scale: 1 };
const TONTON_DESK = { x: 128, y: 476, scale: 0.72, stitched: true, tail: true, t: 0, blink: 0, tremble: 0, expr: 'happy', mouth: 0, look: { x: 0, y: 0 } };

const BASE = { saturation: 0.85, noise: 0.07, tracking: 0.26, jitter: 0.2, aberration: 1.0, tintR: 1, tintG: 0.97, tintB: 0.82, roll: 0, glitch: 0, pixel: 0 };
const FX = { wow: 1.5, hiss: 0.02, lp: 5000, drive: 0.16 };
const FX_TURNED = { wow: 2.6, hiss: 0.026, lp: 4300, drive: 0.24, rate: 0.98 };

const words = (txt) => norm(txt).split(' ').filter(Boolean);
const hasWord = (txt, ...ws) => words(txt).some((w) => ws.includes(w));

/** Şarkıdaki boşluk: yabancıyla gider mi, gitmez mi? */
function strangerKey(txt) {
  if (has(txt, 'gelmem', 'gelmeyece', 'gelemem', 'gelmiyorum', 'gitmem', 'gitmeyece', 'gidemem', 'gitmiyorum', 'oynamam', 'oynamiyorum', 'hayir', 'asla', 'olmaz', 'istemem', 'istemiyorum', 'kacarim', 'kacar', 'bagiririm', 'bagir', 'polis', 'annem', 'babam', 'imdat', 'yardim') || hasWord(txt, 'yok', 'no'))
    return 'ok';
  if (has(txt, 'gelirim', 'gelecegim', 'geliyorum', 'giderim', 'gidecegim', 'gidiyorum', 'oynarim', 'oynayalim', 'evet', 'tamam', 'olur') || hasWord(txt, 'gel', 'gelir', 'git', 'yes')) return 'go';
  return null;
}

export async function tape4(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const P = g.room.points;
  const first = d.firstViewing;
  const lowFlash = !!g.settings?.flash;
  const now = new Date();
  const kara = K.newKaraoke();
  const v = {
    shown: 0,
    hl: null,
    write: null,
    smudge: 0,
    ptr: { x: 300, y: 98 },
    tapT: -9,
    sway: 0,
    dig: null,
    digSync: false,
    digJumped: [false, false, false],
    holding: false,
    lift: 1,
    freeze: null,
    blank: false,
    clock: { h: now.getHours(), m: now.getMinutes() },
    zoom: 1,
    tTilt: 0,
  };
  const phone = { on: false, n: 0, lastAt: -99, stop: null, cancel: null, pausedRings: 0 };
  const loops = new Set();

  g.audio.setTapeFx('t1', 0.1, FX);
  g.audio.setHiss(true);
  d.setBase(BASE, 0.1);
  d.eyeMode = 'viewer';
  d.voiceMods = { tonton: { rate: 0.93, detune: -70 } };

  // ---------------------------------------------------------------- yardımcılar
  /** Sesin süresi (karaoke yıldızı için); ses yoksa heceden tahmin. */
  const voiceDur = (id, rate = 1) => {
    const b = g.audio.duration?.(id) || 0;
    if (b > 0) return b / (rate * (g.audio.fx?.rate || 1));
    const line = g.lines[id];
    return (line ? K.countSyllables(line.t) : 10) * 0.2 + 0.4;
  };
  /** Repliği söyletirken karaoke yıldızını from..to heceleri boyunca zıplatır. */
  async function sing(id, from, to, o = {}) {
    kara.from = from;
    kara.anim = { t0: d.time, dur: voiceDur(id, o.rate), from, to };
    try {
      await d.say(id, o);
    } finally {
      kara.anim = null;
      kara.sung = to;
    }
  }
  /** Cevap kutusu açılırken panel yukarı kayar. */
  async function askKara(o) {
    d.tweens.add(kara, 'lift', 1, 0.3);
    try {
      return await d.ask(o);
    } finally {
      d.tweens.add(kara, 'lift', 0, 0.3);
    }
  }
  async function writeRule(i) {
    v.write = { i, p: 0 };
    d.sfx('pencil', 0.9);
    d.tweens.add(v.write, 'p', 1, 0.9, (x) => x);
    await d.wait(0.95);
    v.write = null;
    v.shown = i + 1;
  }
  const aim = (x, y) => {
    v.ptr = { x, y };
    v.tapT = d.time;
  };
  /** Rakam gruplarını yıldız üstlerinden geçerken patlatır / zıplatır. */
  function digitSync() {
    if (!v.digSync || !v.dig) return;
    GROUP_AT.forEach((w, gi) => {
      if (kara.sung < w + 0.01 || v.digJumped[gi]) return;
      v.digJumped[gi] = true;
      if (v.dig.pop[gi] == null) {
        v.dig.pop[gi] = d.time;
        d.sfx('cartoonPop');
      } else v.dig.jump[gi] = d.time;
    });
  }
  /** Rakam kartında bir rakamı (rakam indeksi) bozularak değiştirir. */
  async function swapDigit(ci, ch) {
    v.dig.glitch = ci;
    d.sfx('glitch', 0.14);
    await d.wait(0.2);
    const arr = [...v.dig.text];
    for (let i = 0, k = -1; i < arr.length; i++)
      if (arr[i] !== ' ' && ++k === ci) {
        arr[i] = ch;
        break;
      }
    v.dig.text = arr.join('');
    v.dig.turned.add(ci);
    await d.wait(0.22);
    v.dig.glitch = -1;
    await d.wait(0.18);
  }
  /** Karaoke satırını harf harf siler ve yeniden yazar (ortak baş kısım kalır). */
  async function rewriteLine(li, to, step = 0.055) {
    const from = kara.lines[li];
    let p = 0;
    while (p < from.length && p < to.length && from[p] === to[p]) p++;
    for (let n = from.length - 1; n >= p; n--) {
      kara.lines[li] = from.slice(0, n);
      kara.cursor = { li, ci: n };
      if (n % 3 === 0) d.sfx('glitch', 0.04);
      await d.wait(step);
    }
    for (let n = p + 1; n <= to.length; n++) {
      kara.lines[li] = to.slice(0, n);
      kara.cursor = { li, ci: n };
      if (n % 3 === 0) d.sfx('glitch', 0.04);
      await d.wait(step);
    }
    kara.cursor = null;
    await d.wait(0.3);
  }
  async function rewriteSlot(to) {
    const from = kara.slot.text;
    kara.slot = { mode: 'turn', text: from, t0: d.time };
    let p = 0;
    while (p < from.length && p < to.length && from[p] === to[p]) p++;
    for (let n = from.length - 1; n >= p; n--) {
      kara.slot.text = from.slice(0, n);
      d.sfx('glitch', 0.07);
      await d.wait(0.18);
    }
    for (let n = p + 1; n <= to.length; n++) {
      kara.slot.text = to.slice(0, n);
      d.sfx('glitch', 0.07);
      await d.wait(0.22);
    }
    d.glitch(0.45, 0.35);
  }

  // ---- odadaki telefon: gerçek zamanda çalar (kaset duraklatılsa da)
  function ring() {
    if (!phone.on) return;
    phone.pausedRings = d.paused ? phone.pausedRings + 1 : 0;
    if (phone.pausedRings <= 5) {
      phone.stop = d.sfx('phoneRing', P.phone, 1);
      phone.n++;
      phone.lastAt = g.clock;
      if (phone.n === 1) g.room.flickerBurst(lowFlash ? 0.05 : 0.3);
    }
    phone.cancel = d.realTimeout(ring, 3);
  }
  function startPhone() {
    phone.on = true;
    phone.n = 0;
    ring();
  }
  function stopPhone(cut) {
    phone.on = false;
    phone.cancel?.();
    phone.cancel = null;
    if (cut) phone.stop?.();
    phone.stop = null;
  }
  async function untilRing(n) {
    while (phone.on && phone.n < n) await d.wait(0.05);
  }
  /** Zil tam çalarken (çift çalışın ortasında) bekler. */
  async function untilMidRing() {
    for (let i = 0; i < 400 && phone.on; i++) {
      const since = g.clock - phone.lastAt;
      if (since > 0.1 && since < 0.55) return;
      await d.wait(0.02);
    }
  }

  // ---------------------------------------------------------------- sahneler
  const classroom = (c, t) => {
    if (v.sway) B.tilt = Math.sin(d.time * 2.4) * 0.06 * v.sway;
    S.bgRules(c, t, { title: ' ', rules: RULES, shown: v.shown, highlight: v.hl });
    K.boardTitle(c, TITLE);
    if (v.write) K.chalkWrite(c, RULES[v.write.i], v.write.i, v.write.p);
    if (v.smudge > 0) K.chalkSmudge(c, RULES[0], 0, v.smudge);
    d.tonton(c, TONTON_DESK);
    K.schoolDesk(c, TONTON_DESK.x, TONTON_DESK.y);
    d.beste(c, AT_CLASS);
    K.pointer(c, { ...AT_CLASS, tilt: B.tilt }, v.ptr, d.time, v.tapT);
    K.karaoke(c, d.time, kara);
  };

  const phoneSet = (c, t) => {
    const frozen = v.freeze != null;
    const ft = frozen ? v.freeze : d.time;
    if (v.sway && !frozen) B.tilt = Math.sin(d.time * 2.4) * 0.06 * v.sway;
    K.bgPhoneSet(c, ft, { clock: v.clock });
    K.cartoonPhone(c, ft, { off: v.holding });
    const over = frozen ? { ...AT_PHONE, t: ft, blink: 0 } : AT_PHONE;
    if (v.holding) K.besteOnPhone(c, AT_PHONE, (cc) => d.beste(cc, over), { lift: v.lift });
    else d.beste(c, over);
    K.bigDigits(c, ft, v.dig);
    K.karaoke(c, d.time, kara);
    digitSync();
    if (v.blank) {
      // dikey kaymada görünen siyah boşluk bandı
      c.fillStyle = '#000';
      c.fillRect(0, 0, 640, 12);
      c.fillRect(0, 470, 640, 10);
    }
  };

  const forest = (c, t) => {
    const z = v.zoom, cx = AT_FOREST.x + 40, cy = AT_FOREST.y - 150;
    c.save();
    c.translate(cx, cy);
    c.scale(z, z);
    c.translate(-cx, -cy);
    K.duskForest(c, t);
    d.beste(c, { ...AT_FOREST, t: 0.4, blink: 0 });
    c.restore();
  };

  const bedroom = (c, t) => {
    K.duskBedroom(c, t);
    c.save();
    c.translate(470, 455);
    c.rotate(v.tTilt);
    c.translate(-470, -455);
    d.tonton(c, { x: 470, y: 455, scale: 0.9, stitched: true, tail: true, tremble: 0, expr: 'happy' });
    c.restore();
    d.beste(c, AT_ROOM);
  };

  try {
    // ================================================================ açılış
    d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
    await d.wait(1.2);
    d.sfx('static', 0.45);
    d.scene((c, t) => {
      S.titleCard(c, t, { decay: 0.15 });
      K.lessonBadge(c, t);
    });
    d.music('jingle', { tempo: 140, detune: -40, gain: 0.28 });
    await d.wait(1.2);
    await d.say('n_show');
    await d.wait(1.0);
    d.scene((c, t) => {
      S.titleCard(c, t, { episode: '4. Bölüm', title: 'Kaybolursan Ne Yaparsın?', decay: 0.15 });
      K.lessonBadge(c, t);
    });
    await d.say('k4_title');
    await d.wait(2.6);
    d.stopMusic(0.5);

    // ================================================================ sınıf: üç kural
    Object.assign(B, { expr: 'happy', wave: 0, lookTarget: null, tilt: 0 });
    d.sfx('static', 0.2, 0.2);
    d.scene(classroom);
    d.music('box', { tempo: 100, detune: -40, gain: 0.12 });
    await d.wait(0.6);
    B.wave = 1;
    await d.say('k4_hello');
    B.wave = 0;
    aim(330, 96);
    await d.say('k4_lesson');
    await writeRule(0);
    aim(380, 160);
    v.hl = 0;
    await d.say('k4_rule1');
    v.hl = null;

    // tebeşir bulaşır; araya geriye konuşan kız girer (geri sarınca anlaşılır)
    d.stopMusic(0.3);
    d.sfx('whoosh');
    d.tweens.add(v, 'smudge', 1, 0.9);
    await d.wait(1.1);
    d.sfx('static', 0.5, 0.35);
    d.scene((c, t) => {
      S.realGirl(c, t, { alpha: 0.4, flip: true });
      S.staticNoise(c, t, 0.4);
      if (Math.floor(t * 2) % 2) S.bigText(c, '◀◀', { color: '#ffffff', font: `64px ${S.FONT_OSD}`, y: 80 });
    });
    d.tag({ rev: 'k4_ters' });
    const revText = [...(g.lines.k4_ters?.t || '')].reverse().join('');
    await Promise.all([d.say('k4_ters', { file: 'k4_ters_rev', sub: revText }), d.wait(3)]);
    d.tag(null);
    d.sfx('static', 0.3, 0.3);
    v.smudge = 0;
    d.scene(classroom);
    d.music('box', { tempo: 100, detune: -40, gain: 0.12 });
    await d.wait(0.6);

    await writeRule(1);
    aim(390, 204);
    v.hl = 1;
    await d.say('k4_rule2');
    await writeRule(2);
    aim(400, 248);
    v.hl = 2;
    B.wave = 1;
    await d.say('k4_rule3');
    B.wave = 0;
    v.hl = null;

    // ================================================================ karaoke 1: yabancı amca
    Object.assign(kara, { lines: [...VERSE1], slot: { mode: 'empty' }, sung: -1, from: 0, jitter: 0.6, header: '♪ ŞARKI ZAMANI ♪', x0: 14, w: 470, font: 24, lh: 34 });
    d.tweens.add(kara, 'show', 1, 0.6);
    d.sfx('cartoonPop');
    aim(250, 330);
    B.wave = 1;
    await d.say('k4_sing_intro');
    B.wave = 0;
    d.music('box', { tempo: 100, detune: -40, gain: 0.17 });
    v.sway = 1;
    await d.wait(0.7);
    await sing('k4_v1', 0, K.karaokeWeights(VERSE1).total);
    g.audio.music?.pause(); // müzik boşlukta durur
    v.sway = 0;
    B.tilt = 0;
    let typed = '';
    let key = null;
    let truth = false;
    for (let unk = 0; ; unk++) {
      const pAsk = askKara({ idle: ['b1_idle1', 'b1_idle2'], maxLen: 20 });
      g.audio.music?.pause(); // soru ileri sarmayı durdurunca müzik geri açılmasın
      typed = await pAsk;
      key = strangerKey(typed);
      if (key) break;
      if (unk >= 2) {
        key = 'ok'; // üçüncü anlaşılmayan (ya da "bilmiyorum") cevapta Beste gerçeği söyler, kapı vurulur
        truth = true;
        break;
      }
      kara.slot = { mode: 'hint', t0: d.time };
      await d.say(unk === 0 ? 'k4_v1_hint' : 'k4_v1_hint2');
    }
    if (key === 'ok') {
      if (truth) {
        // OLAY: tavan arasının gerçek kapısı üç kez vurulur; Beste duymamış gibi bekler
        kara.slot = { mode: 'hint', t0: d.time };
        d.sfx('knock', P.door, 3, 0.45);
        await d.wait(1.7);
      }
      kara.slot = { mode: 'fill', text: 'GELMEM', t0: d.time };
      d.sfx('cartoonPop');
      g.audio.music?.resume();
      B.wave = 1;
      await d.say(truth ? 'k4_v1_truth' : 'k4_v1_ok');
      B.wave = 0;
      // çatlak: bir an soğuk
      d.stopMusic(0.1);
      B.expr = 'neutral';
      B.lookTarget = { x: 0, y: 0 };
      d.fx({ saturation: 0.45 }, 0.3);
      await d.wait(0.7);
      await d.say('k4_v1_ok2');
      await d.wait(0.8);
      d.fx({ saturation: BASE.saturation }, 0.2);
      B.expr = 'happy';
      B.lookTarget = null;
    } else {
      // bölümün en kötü cümlesi, düz bir sesle
      kara.slot = { mode: 'wrong', text: (typed.trim().split(/\s+/)[0] || typed).toLocaleUpperCase('tr').slice(0, 8), t0: d.time, strike: 0 };
      d.stopMusic(0.02);
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      d.fx({ saturation: 0.3 }, 0.1);
      await d.wait(1.0);
      await d.say('k4_v1_go');
      await d.wait(1.3);
      d.fx({ saturation: BASE.saturation }, 0.15);
      B.expr = 'happy';
      B.lookTarget = null;
      d.tweens.add(kara.slot, 'strike', 1, 0.4);
      d.sfx('cartoonPop');
      const l = d.say('k4_v1_go2');
      await d.wait(1.2);
      kara.slot = { mode: 'fill', text: 'GELMEM', t0: d.time };
      d.music('box', { tempo: 100, detune: -40, gain: 0.15 });
      await l;
    }
    if (first) {
      st.answers = st.answers || {};
      st.answers.stranger = key === 'go' ? 'gider' : 'gitmez';
    }
    await d.wait(0.6);
    d.tweens.add(kara, 'show', 0, 0.4);
    await d.wait(0.45);

    // ================================================================ karaoke 2: telefon şarkısı
    v.dig = { text: HOME, pop: [], jump: [], hidden: false, flash: 0, card: 0, turned: new Set(), glitch: -1, size: 76, y: 90, bounce: 1 };
    v.digJumped = [false, false, false];
    Object.assign(kara, { lines: [...SONG], slot: null, sung: -1, from: 0, jitter: 1.4, header: '♪ TELEFON ŞARKISI ♪', x0: 34, w: 572, font: 25, lh: 32, show: 0, lift: 0 });
    B.expr = 'happy';
    const wipe = { p: 0 };
    d.sfx('whoosh');
    d.scene((c, t) => {
      classroom(c, t);
      K.starWipe(c, t, wipe.p, phoneSet);
    });
    d.tweens.add(wipe, 'p', 1, 0.9);
    await d.wait(0.95);
    d.scene(phoneSet);
    if (!g.audio.music?.playing) d.music('box', { tempo: 100, detune: -40, gain: 0.15 });
    d.tweens.add(kara, 'show', 1, 0.5);
    v.digSync = true;
    v.sway = 1;
    const w2 = K.karaokeWeights(SONG).total;
    await d.wait(0.6);
    await sing('k4_song', 0, w2);
    await d.wait(0.4);
    v.dig.pulse7 = true;
    B.wave = 1;
    await d.say('k4_song_why');
    v.dig.pulse7 = false;
    B.wave = 0;
    kara.sung = -1;
    v.digJumped = [false, false, false];
    await d.wait(0.3);
    await sing('k4_song', 0, w2);
    v.sway = 0;
    B.tilt = 0;
    v.digSync = false;
    await d.wait(0.5);

    // numarayı ezbere yaz (rakamlar saklanır)
    d.tweens.add(kara, 'show', 0, 0.4);
    v.dig.hidden = true;
    d.sfx('cartoonPop');
    await d.say('k4_ask_number');
    for (let wrong = 0; ; ) {
      const txt = await d.ask({ idle: ['b1_idle1', 'b1_idle2'], maxLen: 16 });
      if (digits(txt).includes('3642727')) {
        v.dig.hidden = false;
        v.dig.jump = [d.time, d.time + 0.12, d.time + 0.24];
        d.sfx('cartoonPop');
        B.wave = 1;
        await d.say('k4_num_right');
        B.wave = 0;
        break;
      }
      wrong++;
      if (wrong >= 3) {
        // OLAY: tavan arasının ampulü titrer, resim yırtılır, Beste'nin yüzü bir an boşalır
        if (!lowFlash) g.room.flickerBurst(1.2);
        d.glitch(1, 0.6);
        B.expr = 'void';
        await d.wait(0.7);
        B.expr = 'happy';
        // üçüncü yanlışta cevap: rakamlar 4 sn kocaman kalır
        v.dig.hidden = false;
        v.dig.card = 1;
        d.tweens.add(v.dig, 'size', 112, 0.4);
        d.tweens.add(v.dig, 'y', 200, 0.4);
        await Promise.all([d.say('k4_num_help'), d.wait(4)]);
        d.tweens.add(v.dig, 'size', 76, 0.5);
        d.tweens.add(v.dig, 'y', 90, 0.5);
        d.tweens.add(v.dig, 'card', 0, 0.5);
        await d.wait(0.5);
        break;
      }
      v.dig.hidden = false;
      v.dig.flash = 1;
      d.tweens.add(v.dig, 'flash', 0, 1.0);
      const l = d.say('k4_num_wrong');
      await d.wait(1.0);
      v.dig.hidden = true;
      await l;
    }
    st.clues.phone = true;
    await d.wait(0.5);

    // ================================================================ dönen nakarat
    kara.lines = [`Ben seninle ${K.SLOT}!`, ...SONG];
    Object.assign(kara, { slot: { mode: 'fill', text: 'GELMEM', t0: d.time - 5 }, sung: -1, from: 0, header: '♪ HEP BİRLİKTE ♪', font: 25, lh: 32 });
    d.tweens.add(kara, 'show', 1, 0.5);
    B.wave = 1;
    await d.say('k4_song_last');
    B.wave = 0;
    // aynı ezgi yarım ton pes, yüz gülümsemenin ortasında donar
    d.music('box', { tempo: 100, detune: -140, gain: 0.15, drift: 0.003 });
    g.audio.setTapeFx('t1', 2, FX_TURNED);
    B.expr = 'frozen';
    B.lookTarget = { x: 0, y: 0 };
    kara.jitter = 2.6;
    v.blank = true;
    d.setBase({ saturation: 0.5 }, 3);
    // yavaş dikey kayma: resim yukarı süzülür (sözler ekranın ortasında okunur kalır, rakamlar alta sarar)
    d.fx({ roll: -0.06 }, 9);
    await d.wait(1.4);
    await swapDigit(3, '5');
    await swapDigit(4, '1');
    await swapDigit(5, '8');
    await swapDigit(6, '0');
    await rewriteLine(1, TURNED[1]);
    await rewriteLine(2, TURNED[2]);
    await rewriteLine(3, TURNED[3]);
    await d.wait(0.4);
    await rewriteSlot('GELİRİM');
    kara.dull = 1;
    kara.star = '#9aa39a';
    kara.hi = '#c4cfba';
    await d.wait(0.6);
    const w3 = K.karaokeWeights(TURNED);
    d.fx({ roll: -0.3 }, 7);
    await sing('k4_song_turn', w3.starts[1], w3.total);
    d.stopMusic(0.05);
    await d.wait(0.6);
    d.fx({ roll: 0 }, 0.05);
    v.blank = false;
    d.glitch(0.5, 0.3);
    d.tweens.add(kara, 'show', 0, 0.3);
    await d.wait(0.8);

    // bu numara kimin?
    B.expr = 'neutral';
    B.lookTarget = null;
    d.eyeMode = 'track';
    await d.say('k4_ask_whose');
    const who = await d.ask({ idle: ['b1_idle3'], maxLen: 24 });
    const mine = has(who, 'hala', 'benim', 'bizim', 'tavan', 'burasi', 'senin', 'cati', 'evim', 'evin', 'evimiz') || hasWord(who, 'ev', 'ben', 'bura');
    await d.say(mine ? 'k4_whose_mine' : 'k4_whose');
    await d.wait(0.5);

    // ================================================================ ÇAĞRI
    d.noFF = true;
    d.stopFF();
    d.sfx('hangup'); // ahize kalkar
    v.holding = true;
    v.lift = 0.2;
    d.tweens.add(v, 'lift', 1, 0.45);
    await d.wait(0.8);
    const dial = { rot: 0, digit: null, finger: 0, typed: '', pattern: '364 51 80' };
    const dialScene = (c, t) => K.dialCloseup(c, t, dial);
    d.sfx('static', 0.12, 0.12);
    d.scene(dialScene);
    d.sfx('ringback', 1, g.audio.tvIn); // çevir sesi
    await d.wait(1.5);
    for (let i = 0; i < DIAL.length; i++) {
      const n = DIAL[i];
      dial.digit = n;
      d.tweens.add(dial, 'finger', 1, 0.15);
      await d.wait(0.16);
      const dur = d.sfx('rotaryDial', n) || 0.4 + (n || 10) * 0.07;
      d.tweens.add(dial, 'rot', K.dialTravel(n), 0.3);
      await d.wait(0.3);
      dial.typed += String(n);
      d.tweens.add(dial, 'finger', 0, 0.14);
      d.tweens.add(dial, 'rot', 0, Math.max(0.1, dur - 0.4), (x) => x);
      await d.wait(Math.max(0.12, dur - 0.3));
      if (i === 4) {
        // GİZLİ: bir an, sandalyenin arkasından çekilmiş tavan arası
        d.tag({ secret: { id: 'telefon', text: 'AÇSANA' } });
        d.scene((c, t) => K.atticFromBehind(c, t));
        await d.wait(0.25);
        d.tag(null);
        d.scene(dialScene);
      }
      await d.wait(0.12);
    }
    await d.wait(0.3);

    // donmuş kare: yalnızca ağız ve gözler kıpırdar, renk yeşile kayar
    v.freeze = d.time;
    d.scene(phoneSet);
    B.expr = 'neutral';
    B.lookTarget = null;
    d.eyeMode = 'track';
    d.fx({ jitter: 0.03, tracking: 0.02, tintR: 0.9, tintG: 1.05, tintB: 0.9 }, 4);
    await d.wait(1.5);
    startPhone();
    // JUMPSCARE: ilk zil çalarken resim kesilir (yalnızca zil kalır), sonra gerçek kızın yüzü ekrana yapışır
    await d.wait(0.9);
    d.scene((c) => {
      c.fillStyle = '#000';
      c.fillRect(0, 0, 640, 480);
    });
    d.sfx('static', 0.1, 0.2);
    await d.wait(0.7);
    await d.jumpscare({ draw: K.scareRealGirl, sec: 0.65, room: true });
    d.scene(phoneSet);
    await untilRing(2);
    await d.say('k4_call1');
    await untilRing(4);
    await d.say('k4_call2');
    await d.wait(0.3);
    await d.say('k4_call_ask');
    const why = await d.ask({ evil: true, timeout: 15, maxLen: 24 });
    await d.say(why != null && has(why, 'kork') ? 'k4_call_scared' : 'k4_call_any');
    await untilRing(phone.n + 2);
    await d.wait(0.9);
    B.frozenMouth = true;
    await d.say('k4_call_whisper', { gain: 1.8 });
    B.frozenMouth = false;
    await d.wait(0.5);
    // ahizeyi yavaşça indirir; TV'deki tık ve odadaki zil aynı karede kesilir
    d.tweens.add(v, 'lift', 0.15, 2.6);
    await d.wait(2.7);
    await untilMidRing();
    d.sfx('hangup');
    stopPhone(true);
    v.holding = false;
    await d.wait(2.5);

    // neşeye geri dönüş: sanki hiçbir şey olmamış
    v.freeze = null;
    d.setBase(BASE, 0.08);
    g.audio.setTapeFx('t1', 0.1, FX);
    v.dig.text = HOME;
    v.dig.turned = new Set();
    B.expr = 'happy';
    B.lookTarget = null;
    d.eyeMode = 'viewer';
    B.wave = 1;
    d.music('box', { tempo: 100, detune: -40, gain: 0.14 });
    d.sfx('cartoonPop');
    await d.say('b_laugh');
    await d.say('k4_call_joke');
    B.wave = 0;
    d.noFF = false;
    await d.wait(0.8);

    // ================================================================ Çamlık, alacakaranlık: olduğun yerde kal
    d.stopMusic(0.4);
    d.sfx('static', 0.3, 0.25);
    Object.assign(B, { expr: 'neutral', lookTarget: { x: 0, y: 0 }, wave: 0, tilt: 0 });
    d.eyeMode = 'viewer';
    d.scene(forest);
    const wind = d.sfx('wind', 0.035);
    if (wind) loops.add(wind);
    await d.wait(1.8);
    const posterLine = d.say('k4_poster');
    await d.wait(1.3);
    d.sfx('static', 0.12, 0.12);
    d.scene((c, t) => K.posterCloseup(c, t));
    await posterLine;
    await d.wait(1.6);
    d.sfx('static', 0.12, 0.12);
    d.scene(forest);
    await d.wait(0.8);
    d.tweens.add(v, 'zoom', 1.3, 8);
    await d.say('k4_stay');
    await d.wait(1.0);
    await d.say('k4_ask_find');
    const fa = await d.ask({ idle: ['b1_idle2'], maxLen: 24 });
    let fk = 'other';
    if (has(fa, 'evet', 'gelecegim', 'gelicem', 'gelcem', 'gelirim', 'geliyorum', 'tabii', 'tabi', 'soz', 'bulurum', 'bulacagim', 'tamam', 'olur', 'elbette', 'kesinlikle', 'gelecem')) fk = 'yes';
    else if (has(fa, 'hayir', 'gelmem', 'gelmeyecegim', 'gelemem', 'gelmiyorum', 'istemiyorum', 'istemem', 'asla', 'bulamam', 'olmaz') || hasWord(fa, 'yok', 'no')) fk = 'no';
    if (fk === 'no') {
      d.fx({ saturation: 0.55 }, 1.2);
      await d.wait(0.6);
      await d.say('k4_find_no');
      d.fx({ saturation: BASE.saturation }, 1.0);
    } else {
      B.expr = 'happy';
      await d.say(fk === 'yes' ? 'k4_find_yes' : 'k4_find_other');
    }
    if (first) st.flags.promisedFind = fk !== 'no';
    await d.wait(1.2);
    d.tweens.add(v, 'zoom', 1, 0.6);
    await d.wait(0.6);
    wind?.();
    loops.delete(wind);

    // ================================================================ veda
    d.sfx('static', 0.25, 0.2);
    Object.assign(B, { expr: 'happy', lookTarget: null, wave: 1 });
    d.scene(bedroom);
    d.music('box', { tempo: 96, detune: -40, gain: 0.12 });
    await d.wait(0.4);
    await d.say('k4_bye');
    B.wave = 0;
    B.lookTarget = { x: 0.9, y: 0.1 };
    const echo = d.say('k4_tonton_bye');
    // her "ararsın"da kafası biraz daha yana düşer
    for (const [tilt, gap] of [[0.06, 1.2], [0.13, 0.8], [0.21, 0.8]]) {
      d.tweens.add(v, 'tTilt', tilt, 0.25);
      await d.wait(gap);
    }
    await echo;
    B.lookTarget = { x: 0, y: 0 };
    await d.wait(1.0);
    B.lookTarget = null;

    // jenerik; kararırken odadaki telefon bir kez çalar ve susar
    d.stopMusic(0.2);
    d.sfx('static', 0.3, 0.2);
    const end = { fade: 0 };
    d.scene((c, t) => {
      S.endCard(c, t);
      K.fadeBlack(c, end.fade);
    });
    d.music('jingle', { tempo: 140, detune: -40, gain: 0.22 });
    await d.say('n_outro');
    await d.wait(1.6);
    d.stopMusic(1.4);
    d.tweens.add(end, 'fade', 1, 1.8);
    await d.wait(0.9);
    d.sfx('phoneRing', P.phone, 1);
    await d.wait(2.6);
    // JUMPSCARE: zil susar, karanlıkta bir an sessizlik, sonra yüz
    await d.wait(0.9);
    await d.jumpscare({ face: 'beste', sec: 0.4, room: true });
    d.scene((c, t) => S.staticNoise(c, t, 1));
    d.sfx('static', 1.5, 0.25);
    await d.wait(1.6);
  } finally {
    stopPhone(true);
    for (const stop of loops) stop?.();
    loops.clear();
    B.frozenMouth = false;
    B.tilt = 0;
    d.noFF = false;
  }
}

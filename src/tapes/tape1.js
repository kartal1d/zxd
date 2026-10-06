// KASET 1 — "Beste ile Tanışalım!" (masum başlangıç)
import * as S from '../draw/scenes.js';
import { drawSilhouette } from '../draw/characters.js';
import { has, norm, titleCase } from '../util.js';
import { parseNum } from './common.js';

export async function tape1(d) {
  const g = d.g;
  const st = g.state;
  const B = d.chars.beste;
  const T = d.chars.tonton;
  const v = { counted: null, taken: new Set(), basket: [], sil: 0, dark: 0, shoe: 0 };

  g.audio.setTapeFx('t1', 0.1);
  g.audio.setHiss(true);
  d.setBase({ saturation: 1.05, noise: 0.045, tracking: 0.12, jitter: 0.12, aberration: 0.6, tintR: 1, tintG: 1, tintB: 1 }, 0.1);
  d.eyeMode = 'viewer';

  // ---- açılış: mavi ekran, uyarı, jenerik
  d.scene((c, t) => S.blueScreen(c, t, { text: '' }));
  await d.wait(1.6);
  d.sfx('static', 0.4);
  d.scene((c, t) => S.warning(c, t));
  await d.wait(4.5);
  d.sfx('static', 0.3);
  d.scene((c, t) => S.titleCard(c, t));
  d.music('jingle', { gain: 0.3 });
  await d.wait(1.2);
  await d.say('n_show');
  await d.wait(1.8);
  d.scene((c, t) => S.titleCard(c, t, { episode: '1. Bölüm', title: 'Beste ile Tanışalım!' }));
  await d.say('n_t1_title');
  await d.wait(3.2);

  // ---- Beste'nin odası
  Object.assign(B, { x: 250, y: 455, scale: 1, expr: 'happy', wave: 1 });
  Object.assign(T, { x: 470, y: 455, scale: 0.9, expr: 'happy', tail: true, tremble: 0 });
  d.scene((c, t) => {
    S.bgBedroom(c, t);
    d.tonton(c);
    d.beste(c);
  });
  d.sfx('static', 0.2, 0.2);
  d.music('box', { gain: 0.13 });
  await d.wait(0.5);
  await d.say('b1_hello');
  B.wave = 0;
  B.lookTarget = { x: 0.9, y: 0 };
  await d.say('b1_tonton_intro');
  B.lookTarget = null;
  T.lookTarget = { x: -0.8, y: 0 };
  await d.wait(0.3);
  T.lookTarget = null;
  await d.say('t1_hello', { after: 0.4 });

  // ---- isim (kaset tekrar izlenirse Beste adını hatırlar)
  if (st.name) {
    B.wave = 1;
    await d.say('b1_name_known');
    B.wave = 0;
  } else await askName();
  async function askName() {
    await d.say('b1_ask_name');
    let name = '';
    for (;;) {
      const r = await d.ask({ idle: ['b1_idle1', 'b1_idle2', 'b1_idle3'], maxLen: 18 });
      name = titleCase(r).slice(0, 18);
      if (has(name, 'tonton')) {
        await d.say('b1_name_tonton');
        continue;
      }
      break;
    }
    st.name = name;
    g.save();
    if (norm(name) === 'beste') {
      B.expr = 'frozen';
      d.stopMusic(0.05);
      await d.say('b1_name_same');
      await d.glitch(0.5, 0.3);
      B.expr = 'happy';
      d.music('box', { gain: 0.13 });
    } else {
      B.wave = 1;
      await d.say('b1_name_nice');
      B.wave = 0;
    }
  }

  // ---- bahçe: elmaları say
  d.sfx('static', 0.15, 0.15);
  d.scene((c, t) => {
    S.bgGarden(c, t, { counted: v.counted });
    d.beste(c, { x: 116, y: 462, scale: 0.82 });
  });
  B.lookTarget = { x: 0.8, y: -0.6 };
  await d.say('b1_count_intro');
  B.lookTarget = null;
  const count = await d.choose({
    idle: ['b1_idle1', 'b1_idle2'],
    match: (txt, tries) => (parseNum(txt) === 7 ? 'right' : tries >= 1 ? 'help' : null),
    unknown: 'b1_count_wrong',
  });
  if (count.key === 'right') {
    v.counted = 7;
    await d.say('b1_count_right');
  } else {
    const line = d.say('b1_count_help');
    for (let i = 1; i <= 7; i++) {
      v.counted = i;
      await d.wait(0.42);
    }
    await line;
  }
  st.clues.yas = true;

  // ---- piknik sepeti
  d.sfx('static', 0.15, 0.15);
  v.counted = null;
  Object.assign(B, { x: 230, y: 455, scale: 1 });
  d.scene((c, t) => {
    S.bgPicnic(c, t, { taken: v.taken, basket: v.basket });
    d.beste(c);
  });
  await d.say('b1_picnic');
  const ITEMS = {
    elma: ['elma', 'apple'],
    sandvic: ['sandvic', 'sandavic', 'sanvic', 'sandvi', 'tost', 'peynir', 'ekmek'],
    limonata: ['limonata', 'limon', 'su', 'icecek'],
    kurabiye: ['kurabiye', 'kurabiy', 'biskuvi', 'cookie'],
    ip: ['ip', 'halat', 'urgan'],
  };
  const matchItem = (txt) => {
    for (const [k, words] of Object.entries(ITEMS)) if (has(txt, ...words)) return k;
    return null;
  };
  while (v.basket.length < 3) {
    const r = await d.choose({
      options: ['ELMA', 'SANDVİÇ', 'LİMONATA', 'KURABİYE', 'İP'],
      idle: ['b1_idle1', 'b1_idle2', 'b1_idle3'],
      match: matchItem,
      unknown: 'b1_unknown_item',
    });
    if (v.taken.has(r.key)) {
      await d.say('b1_already');
      continue;
    }
    v.taken.add(r.key);
    v.basket.push(r.key);
    d.sfx('cartoonPop');
    if (r.key === 'elma') await d.say('b1_apple');
    else if (r.key === 'sandvic') await d.say('b1_sandwich');
    else if (r.key === 'limonata') await d.say('b1_lemonade');
    else if (r.key === 'kurabiye') {
      await d.say('b1_cookie');
      await d.say('t1_cookie', { sub: 'Miyav! Kurabiye, kurabiye!' });
    } else if (r.key === 'ip') {
      st.flags.rope = true;
      d.stopMusic(0.02);
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      d.fx({ saturation: 0.35 }, 0.15);
      await d.wait(0.8);
      await d.say('b1_rope_cold');
      await d.wait(1.2);
      d.fx({ saturation: 1.05 }, 0.2);
      B.expr = 'happy';
      B.lookTarget = null;
      await d.say('b1_rope_ok');
      d.music('box', { gain: 0.13 });
    }
  }
  await d.say('b1_basket_full');

  // ---- Çamlık Ormanı
  d.stopMusic(0.6);
  d.sfx('static', 0.25, 0.2);
  Object.assign(B, { x: 210, y: 470, scale: 0.78 });
  Object.assign(T, { x: 330, y: 470, scale: 0.68 });
  d.scene((c, t) => {
    S.bgForest(c, t, { basket: v.basket, silhouette: v.sil, silX: 470, drawSilhouette, shoe: v.shoe, dark: v.dark });
    d.tonton(c);
    d.beste(c);
  });
  d.music('box', { gain: 0.12, tempo: 88 });
  await d.say('n_forest');
  const forestLine = d.say('b1_forest');
  await d.wait(3.6);
  // GİZLİ: ağaçların arasında gri siluet, bir an
  v.sil = 0.9;
  d.tag({ secret: { id: 'siluet', text: 'BENİ GÖRDÜN' } });
  await d.wait(0.34);
  v.sil = 0;
  d.tag(null);
  await forestLine;
  T.expr = 'scared';
  T.lookTarget = { x: 0.9, y: -0.4 };
  await d.say('t1_forest');
  B.lookTarget = { x: -0.5, y: 0 };
  await d.say('b1_forest_noone');
  B.lookTarget = { x: 0, y: 0 };
  B.expr = 'frozen';
  d.stopMusic(0.05);
  await d.say('b1_forest_noone2');
  await d.wait(0.6);
  B.expr = 'happy';
  B.lookTarget = null;
  T.expr = 'happy';
  T.lookTarget = null;
  d.music('box', { gain: 0.12, tempo: 88 });

  // ---- saklambaç
  await d.say('b1_hide_intro');
  let besteHidden = true;
  d.scene((c, t) => {
    S.bgForest(c, t, { basket: v.basket, silhouette: v.sil, silX: 430, drawSilhouette, shoe: v.shoe, dark: v.dark });
    d.tonton(c, { expr: 'happy', blink: 1 });
    if (!besteHidden) d.beste(c);
  });
  d.tweens.add(v, 'dark', 0.85, 6);
  await d.say('t1_count', { sub: 'Bir... iki... üç... dört... beş... altı... yedi...' });
  d.stopMusic(0.05);
  await d.wait(1.6);
  await d.say('n_count_end');
  d.tweens.add(v, 'dark', 0, 0.6);
  await d.wait(0.6);
  d.music('box', { gain: 0.1, tempo: 88 });
  await d.say('b1_hide_where');

  // ağaçtaki oyma (kutunun şifresi): ileri sarma durur, görüntü sakinleşir, uzun süre ekranda kalır
  const showCarving = async (line, sec) => {
    const prev = d.sceneFn;
    d.stopFF();
    d.fx({ noise: 0.015, tracking: 0, jitter: 0.02, aberration: 0.15 }, 0.2);
    d.scene((c, t) => S.treeCarving(c, t));
    if (line) await d.say(line);
    await d.wait(sec);
    d.fx(d.baseFx, 0.4);
    d.scene(prev);
    st.clues.tarih = true;
  };
  let sawTree = false;
  let wrong = 0;
  for (;;) {
    const r = await d.choose({
      options: ['AĞAÇ', 'ÇALI', 'KÜTÜK'],
      idle: ['b1_idle1', 'b1_idle2'],
      match: (txt) => (has(txt, 'agac', 'agaç', 'tree') ? 'tree' : has(txt, 'cali', 'çalı', 'bush', 'cal') ? 'bush' : has(txt, 'kutuk', 'kütük', 'kutu', 'stump') ? 'stump' : null),
      unknown: 'b1_hide_unknown',
    });
    if (r.key === 'stump') {
      besteHidden = false;
      Object.assign(B, { x: 395, y: 400, scale: 0.6, wave: 1 });
      d.sfx('cartoonPop');
      await d.say('b1_hide_found');
      B.wave = 0;
      break;
    }
    wrong++;
    if (r.key === 'tree') {
      sawTree = true;
      await showCarving('b1_hide_tree', 3.5);
    } else {
      // GİZLİ: çalının altında gri bir ayakkabı
      const line = d.say('b1_hide_bush');
      await d.wait(1.0);
      v.shoe = 1;
      d.tag({ secret: { id: 'ayakkabi', text: 'ARKANDAYIM' } });
      await d.wait(0.25);
      v.shoe = 0;
      d.tag(null);
      await line;
    }
    if (wrong >= 2) {
      besteHidden = false;
      Object.assign(B, { x: 395, y: 400, scale: 0.6 });
      d.sfx('cartoonPop');
      await d.say('b1_hide_giveup');
      B.expr = 'frozen';
      B.lookTarget = { x: 0, y: 0 };
      await d.say('b1_hide_giveup2');
      B.expr = 'happy';
      B.lookTarget = null;
      break;
    }
  }
  if (!sawTree) {
    // ağaç seçilmediyse oyma bir an araya girer (ipucu kaybolmasın)
    await d.wait(0.6);
    d.sfx('glitch', 0.3);
    d.tag({ secret: { id: 'oyma', text: '1405' } });
    await showCarving(null, 3.5);
    d.tag(null);
  }

  // ---- kapanış
  Object.assign(B, { x: 250, y: 455, scale: 1 });
  Object.assign(T, { x: 470, y: 455, scale: 0.9 });
  d.scene((c, t) => {
    S.bgBedroom(c, t, { window: 'night' });
    d.tonton(c);
    d.beste(c);
  });
  B.wave = 1;
  await d.say('b1_bye');
  await d.say('t1_bye');
  B.wave = 0;
  await d.wait(0.4);
  d.stopMusic(0.02);
  B.expr = 'frozen';
  B.lookTarget = { x: 0, y: 0 };
  await d.wait(0.7);
  await d.say('b1_bye_cold');
  await d.wait(0.9);
  B.expr = 'happy';
  B.lookTarget = null;
  await d.say('b1_bye_joke');
  if (st.flags.rope) {
    await d.glitch(0.6, 0.3);
    await d.say('b1_rope_bye');
  }

  d.sfx('static', 0.3, 0.2);
  d.scene((c, t) => S.endCard(c, t));
  d.music('jingle', { gain: 0.22 });
  await d.say('n_outro');
  await d.wait(2.4);
  d.stopMusic(0.4);

  // GİZLİ: jenerikten sonra karla karışık tek kare
  d.scene((c, t) => S.staticNoise(c, t, 1));
  d.sfx('static', 2.2, 0.25);
  await d.wait(0.9);
  d.tag({ secret: { id: 'yardim', text: 'YARDIM ET' } });
  d.scene((c, t) => {
    S.staticNoise(c, t, 0.7);
    S.bigText(c, 'YARDIM ET', { color: '#ffffff', font: `700 92px ${S.FONT_HAND}` });
  });
  await d.wait(0.14);
  d.tag(null);
  d.scene((c, t) => S.staticNoise(c, t, 1));
  await d.wait(1.4);
}

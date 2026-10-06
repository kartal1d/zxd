// KASET 7 — "Bir Daha!" sahneleri: kopyanın kopyası (8 elmalı bahçe, Tonton'un yerindeki pamuk,
// ormanda saklanmayan adam), bandın kendi çizdiği otomatik geri sarma, aşınmış kopya (kar),
// arkası dönük / yüzsüz Beste, korkutma kareleri (dikişli Tonton, anahtar deliğindeki göz, boş yüz).
import { rr, fill, stroke, bgGarden, bgBedroom, staticNoise, osd, warning, titleCard, APPLES, OUT, FONT_CARTOON, FONT_OSD } from './scenes.js';
import { drawBeste, drawTonton } from './characters.js';
import { drawGreyMan } from './scenes3.js';
import { hash, clamp } from '../util.js';

const W = 640;
const H = 480;
const TAU = Math.PI * 2;
const SKIN = '#ffd9b8';

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
const easeOutBack = (p) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
function scanlines(ctx, t, a = 0.25) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  for (let y = Math.floor(t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}
function vignette(ctx, color = '0,0,0', a = 0.7, r0 = 140) {
  const g = ctx.createRadialGradient(W / 2, H / 2, r0, W / 2, H / 2, 430);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ 1. tur: sekiz elmalı bahçe
/** Birinci kasetteki yedi elma + ortada bir tane daha (sekizinci) */
export const APPLES8 = [...APPLES, [312, 146]];

/**
 * Bahçe, sekiz elmayla. o.counted: 1..8 sayılan elmalar (sekizinci sayı kırmızı ve sessizce belirir),
 * o.t8: sekizinci sayının belirdiği sahne zamanı (zıplama), o.ring 0..1: sekizinci elmanın etrafında halka.
 */
export function garden8(ctx, t, o = {}) {
  bgGarden(ctx, t, { apples: APPLES8, counted: o.counted == null ? null : Math.min(o.counted, 7) });
  const [x, y] = APPLES8[7];
  if (o.ring > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(o.ring, 0, 1);
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = '#ff2020';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 26 + Math.sin(t * 8) * 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if (o.counted >= 8) {
    const p = clamp((t - (o.t8 ?? -9)) / 0.35, 0, 1);
    const s = o.t8 == null ? 1 : easeOutBack(p);
    ctx.save();
    ctx.translate(x, y - 30);
    ctx.scale(s, s);
    ctx.font = `800 26px ${FONT_CARTOON}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText('8', 0, 0);
    ctx.fillStyle = '#d01010';
    ctx.fillText('8', 0, 0);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 2. tur: Tonton'un yeri
/** Tonton'un durması gereken yerde, yerde kalmış gölge (Tonton yok) */
export function emptyShadow(ctx, x, y, a = 1) {
  ctx.fillStyle = `rgba(40,20,10,${0.22 * a})`;
  ellipse(ctx, x, y - 2, 46, 9);
  ctx.fill();
}

/** GİZLİ KARE 'pamuk': küçük bir yığın beyaz dolgu ve tek bir düğme göz */
export function stuffing(ctx, x, y, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.4, 1.4);
  emptyShadow(ctx, 0, 6, 1.4);
  const tufts = [[-30, -6, 16], [-12, -14, 20], [10, -10, 18], [28, -4, 14], [-2, -26, 15], [18, -24, 11], [-22, -22, 10]];
  for (const [tx, ty, r] of tufts) {
    ellipse(ctx, tx, ty, r * 1.15, r * 0.9, hash(tx) * 2);
    ctx.fillStyle = '#f4f1ea';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(90,80,70,.55)';
    ctx.stroke();
  }
  // lif çizgileri
  ctx.strokeStyle = 'rgba(120,110,100,.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const a = hash(i + 4) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12, -14 + Math.sin(a) * 8);
    ctx.quadraticCurveTo(Math.cos(a) * 26, -18 + Math.sin(a) * 14, Math.cos(a) * 34, -12 + Math.sin(a) * 16);
    ctx.stroke();
  }
  // turuncu tüy tutamı
  ctx.fillStyle = '#f59a3c';
  ellipse(ctx, 36, -12, 7, 4, 0.6);
  ctx.fill();
  // tek düğme göz
  ctx.translate(-4, -16);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  fill(ctx, '#1a1a1e');
  stroke(ctx, 2.5);
  ctx.fillStyle = '#4a4a52';
  for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#d9d2c0';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-3, -3);
  ctx.lineTo(3, 3);
  ctx.moveTo(3, -3);
  ctx.lineTo(-3, 3);
  ctx.moveTo(3, 3);
  ctx.quadraticCurveTo(14, 8, 20, 4);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ 3. tur: saklanmayan adam
/**
 * Ormandaki gri adam, AÇIKTA, ön ağaçların önünde (kaybolmaz). o.near: öne sıçramış hâli.
 * o.tilt baş eğikliği.
 */
export function forestMan(ctx, t, o = {}) {
  const near = o.near || 0;
  const x = 470 + (400 - 470) * near;
  const y = 344 + (424 - 344) * near;
  const h = 214 + (330 - 214) * near;
  ctx.fillStyle = 'rgba(10,20,10,.25)';
  ellipse(ctx, x, y, 34 * (h / 214), 6 * (h / 214));
  ctx.fill();
  drawGreyMan(ctx, x, y, h, { headTilt: o.tilt || 0, alpha: o.alpha ?? 1 });
}

// ------------------------------------------------------------------ bandın kendi geri sarması
/**
 * Kasetin kendi çizdiği "otomatik geri sarma": beyaz şeritler, kayık satırlar, '◀◀' ve geri sayan sayaç.
 * o.counter: gösterilecek sayaç, o.stall 0..1: bant yavaşlıyor / takılıyor.
 */
export function rewindOverlay(ctx, t, o = {}) {
  const sp = 1 - clamp(o.stall || 0, 0, 0.92);
  // kayık satır blokları
  for (let i = 0; i < 7; i++) {
    const y = (hash(i + Math.floor(t * 12 * sp)) * H) | 0;
    const h = 6 + hash(i * 7 + Math.floor(t * 12 * sp)) * 22;
    const dx = (hash(i * 3 + Math.floor(t * 20 * sp)) - 0.5) * 70;
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
  }
  // şeritler
  for (let i = 0; i < 4; i++) {
    const y = (((t * (240 + i * 90) * sp + i * 137) % (H + 60)) - 30) | 0;
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(0, y, W, 5 + i * 3);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, y + 7 + i * 3, W, 3);
  }
  // alt kenarda gürültü bandı
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 40; i++) ctx.fillRect(hash(i + t * 50) * W, H - 34 + hash(i * 5 + t) * 30, 30 + hash(i) * 60, 2);
  if (o.label !== false && (o.blink == null || Math.floor(t * 2.5) % 2 === 0)) osd(ctx, { label: '◀◀ GERİ SAR', counter: o.counter });
  else osd(ctx, { counter: o.counter });
}

// ------------------------------------------------------------------ aşınmış kopya
/**
 * Kopya artık görüntü veremiyor: zar zor seçilen yatak odası çizgileri üstünde yoğun kar,
 * yuvarlanan izleme bantları. o.snow 0..1, o.ghost: odanın görünürlüğü.
 */
export function wornCopy(ctx, t, o = {}) {
  bgBedroom(ctx, t * 0.2, { night: 0.7, window: 'night' });
  ctx.fillStyle = `rgba(12,12,16,${1 - (o.ghost ?? 0.45)})`;
  ctx.fillRect(0, 0, W, H);
  staticNoise(ctx, t, o.snow ?? 0.9);
  // izleme bantları
  for (let i = 0; i < 3; i++) {
    const y = (((t * (38 + i * 21) + i * 170) % (H + 80)) - 40) | 0;
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(0, y, W, 14 + i * 6);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, y + 16 + i * 6, W, 4);
  }
  // dikey kayan siyah çubuk (görüntü tutmuyor)
  const by = ((t * 23) % (H + 120)) - 60;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(0, by, W, 26);
}

// ------------------------------------------------------------------ arkası dönük / dönen Beste
/** Beste'nin baş merkezi (çizim koordinatı) ve ölçeği: yüz gölgeleri için */
function headFrame(s) {
  const t = s.t || 0;
  const breathe = s.expr === 'frozen' || s.expr === 'void' ? 0 : Math.sin(t * 2.2) * 1.5;
  return { x: s.x, y: s.y + (breathe - 205) * s.scale, k: s.scale };
}

/** Yüzsüz yüzün hafif gölgeleri: göz olması gereken yerde iki sığ çukur (gri adamınki gibi) */
export function blankShade(ctx, s, a = 1) {
  const f = headFrame(s);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.k, f.k);
  ctx.rotate(s.tilt || 0);
  ctx.fillStyle = `rgba(120,70,50,${0.1 * a})`;
  ellipse(ctx, -22, 4, 13, 7);
  ctx.fill();
  ellipse(ctx, 22, 4, 13, 7);
  ctx.fill();
  ctx.fillStyle = `rgba(120,70,50,${0.06 * a})`;
  ellipse(ctx, 0, 34, 16, 3);
  ctx.fill();
  // tenin parlaklığı: pürüzsüz, plastik gibi
  ctx.fillStyle = `rgba(255,255,255,${0.12 * a})`;
  ellipse(ctx, -18, -2, 22, 12, -0.4);
  ctx.fill();
  ctx.restore();
}

/**
 * Beste'nin dönüşü, üç basamaklı kare: 0 arkası dönük, 1 baş yana kayıyor (kulak ve yanak),
 * 2 yarım dönmüş (yüzsüz, dar), 3 tam karşıdan (yüzsüz).
 */
export function turnBeste(ctx, s, step = 0) {
  if (step <= 0) {
    drawBeste(ctx, { ...s, back: true });
    return;
  }
  if (step === 1) {
    drawBeste(ctx, { ...s, back: true, tilt: 0.06 });
    const f = headFrame(s);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    ctx.rotate(0.06);
    ctx.beginPath();
    ctx.arc(0, -6, 68, 0, TAU);
    ctx.clip();
    ellipse(ctx, 50, 14, 26, 48);
    ctx.fillStyle = SKIN;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    ellipse(ctx, 40, 8, 10, 12);
    fill(ctx, SKIN);
    stroke(ctx, 3.5);
    ctx.restore();
    return;
  }
  ctx.save();
  if (step === 2) {
    ctx.translate(s.x, 0);
    ctx.scale(0.8, 1);
    ctx.translate(-s.x, 0);
  }
  const ss = { ...s, expr: 'blank', mouth: 0, tilt: step === 2 ? 0.1 : s.tilt || 0 };
  drawBeste(ctx, ss);
  blankShade(ctx, ss);
  ctx.restore();
}

// ------------------------------------------------------------------ korkutma kareleri
/** KORKUTMA 1 (2. tur): boş yerde aniden dikişli Tonton, ağız dikişi patlamış, pamuk taşıyor */
export function tontonScare(ctx, t) {
  const k = 4.3 + Math.min(t, 0.5) * 0.7;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 20;
  const jy = (hash(Math.floor(t * 40) + 5) - 0.5) * 14;
  ctx.fillStyle = '#140505';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2 + jx, cy = 238 + jy;
  drawTonton(ctx, { x: cx, y: cy + 104 * k, scale: k, stitched: true, expr: 'scared', tail: false, t: 0, mouth: 0, look: { x: 0, y: 0 }, blink: 0 });
  // sağ düğme göz kopmuş: boş yuva, iplikte sallanan düğme
  ctx.save();
  ctx.translate(cx, cy);
  const ex = 17 * k, ey = -4 * k;
  ctx.fillStyle = '#050101';
  ellipse(ctx, ex, ey, 11 * k, 10 * k);
  ctx.fill();
  const sw = Math.sin(t * 14) * 10;
  ctx.strokeStyle = '#d9d2c0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.quadraticCurveTo(ex + 20, ey + 60, ex + 24 + sw, ey + 120);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex + 24 + sw, ey + 140, 22, 0, TAU);
  fill(ctx, '#1a1a1e');
  stroke(ctx, 4);
  // ağız: dikiş yırtılmış, dolgu dışarı taşıyor
  const my = 30 * k;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(-90, my - 10);
  ctx.quadraticCurveTo(0, my + 70, 90, my - 10);
  ctx.quadraticCurveTo(0, my + 20, -90, my - 10);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const r = 26 + hash(i) * 22;
    ellipse(ctx, Math.cos(a) * -70, my + 22 + Math.sin(a) * 18, r, r * 0.75, hash(i + 3));
    ctx.fillStyle = '#efe9df';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(80,70,60,.6)';
    ctx.stroke();
  }
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 20, my - 18);
    ctx.lineTo(i * 20 + 8, my - 2);
    ctx.stroke();
  }
  ctx.restore();
  vignette(ctx, '120,0,0', 0.6);
  scanlines(ctx, t);
}

/** KORKUTMA 2 (kapı sesleri): kar bir an açılır, kapının anahtar deliğinden bakan kocaman bir göz */
export function keyholeEye(ctx, t) {
  const k = 1 + Math.min(t, 0.6) * 0.15;
  const dart = Math.floor(t * 7);
  const lx = (hash(dart) - 0.5) * 36, ly = (hash(dart + 9) - 0.5) * 16;
  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, 214);
  ctx.scale(k, k);
  // anahtar deliği
  ctx.beginPath();
  ctx.arc(0, -40, 132, 0, TAU);
  ctx.moveTo(-56, 60);
  ctx.lineTo(56, 60);
  ctx.lineTo(110, 290);
  ctx.lineTo(-110, 290);
  ctx.closePath();
  ctx.clip();
  const sg = ctx.createRadialGradient(0, -40, 20, 0, -40, 200);
  sg.addColorStop(0, '#e9c3a4');
  sg.addColorStop(1, '#5a3a2a');
  ctx.fillStyle = sg;
  ctx.fillRect(-200, -200, 400, 520);
  // göz akı, kılcal damarlar
  ellipse(ctx, 0, -40, 118, 70);
  ctx.fillStyle = '#f3efe6';
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,30,30,.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = hash(i + 2) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 112, -40 + Math.sin(a) * 64);
    ctx.quadraticCurveTo(Math.cos(a + 0.2) * 80, -40 + Math.sin(a + 0.3) * 40, Math.cos(a) * 58, -40 + Math.sin(a) * 30);
    ctx.stroke();
  }
  // iris ve küçücük bebek
  ctx.beginPath();
  ctx.arc(lx, -40 + ly, 50, 0, TAU);
  ctx.fillStyle = '#3b2b1d';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(lx, -40 + ly, 11, 0, TAU);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(lx - 18, -58 + ly, 7, 0, TAU);
  ctx.fill();
  // kirpikli göz kapakları
  ctx.fillStyle = '#7a5038';
  ctx.beginPath();
  ctx.moveTo(-140, -150);
  ctx.lineTo(140, -150);
  ctx.lineTo(140, -50);
  ctx.quadraticCurveTo(0, -150, -140, -50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-140, 80);
  ctx.lineTo(140, 80);
  ctx.lineTo(140, -30);
  ctx.quadraticCurveTo(0, 48, -140, -30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#120a06';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-124, -64);
  ctx.quadraticCurveTo(0, -140, 124, -64);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let i = -6; i <= 6; i++) {
    const x = i * 18;
    const y = -102 + Math.abs(i) * Math.abs(i) * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + i * 3, y - 24);
    ctx.stroke();
  }
  ctx.restore();
  // anahtar deliğinin metal kenarı
  ctx.save();
  ctx.translate(W / 2, 214);
  ctx.scale(k, k);
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, -40, 136, Math.PI - 1.13, 1.13 + TAU);
  ctx.lineTo(114, 294);
  ctx.lineTo(-114, 294);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  vignette(ctx, '0,0,0', 0.8, 120);
  staticNoise(ctx, t, 0.18);
  scanlines(ctx, t, 0.3);
}

/** KORKUTMA 3 (pürüzsüz son tur): kameranın dibinde yüzsüz Beste */
export function blankScare(ctx, t) {
  const k = 3.3 + Math.min(t, 0.6) * 0.8;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 14;
  const jy = (hash(Math.floor(t * 40) + 3) - 0.5) * 10;
  ctx.fillStyle = '#0c0a0c';
  ctx.fillRect(0, 0, W, H);
  const s = { x: W / 2 + jx, y: 252 + 199 * k + jy, scale: k, expr: 'blank', mouth: 0, look: { x: 0, y: 0 }, blink: 0, t: 0, wave: 0, tilt: -0.05 };
  drawBeste(ctx, s);
  blankShade(ctx, s, 1.6);
  // soğuk, düz ışık: renkleri çeker
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = 'rgba(128,128,128,.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, '0,0,0', 0.85, 120);
  scanlines(ctx, t, 0.22);
}

// ------------------------------------------------------------------ takılan son tur
/** Titreyen uyarı kartı */
export function jitterWarning(ctx, t, o = {}) {
  const j = o.j ?? 1;
  ctx.save();
  ctx.translate((hash(Math.floor(t * 24)) - 0.5) * 16 * j, (hash(Math.floor(t * 24) + 4) - 0.5) * 10 * j);
  warning(ctx, t);
  ctx.restore();
  if (j > 0.5 && hash(Math.floor(t * 9)) > 0.6) {
    const y = hash(Math.floor(t * 9) + 1) * H;
    ctx.drawImage(ctx.canvas, 0, y, W, 30, 30 * j, y, W, 30);
  }
}

/**
 * '7. Bölüm — Bir Daha!' kartı karanlıktan belirir (o.fade 0..1). Her döngüde (o.cycle) gökkuşağının altında
 * duran yüzsüz küçük Beste biraz daha büyür; geri sıçramada (o.skip) bant kendi '◀◀' yazısını gösterir.
 */
export function stuckTitle(ctx, t, o = {}) {
  titleCard(ctx, t * 0.35, { episode: '7. Bölüm', title: 'Bir Daha!', decay: 0.8 });
  if (o.cycle > 0) {
    const sc = Math.min(0.4, 0.14 + o.cycle * 0.045);
    const s = { x: W / 2, y: 474, scale: sc, expr: 'blank', mouth: 0, look: { x: 0, y: 0 }, blink: 0, t: 0, wave: 0, tilt: 0 };
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawBeste(ctx, s);
    blankShade(ctx, s, 1.4);
    ctx.restore();
  }
  const f = clamp(o.fade ?? 1, 0, 1);
  if (f < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - f})`;
    ctx.fillRect(0, 0, W, H);
  }
  // görüntü bir an geri sıçrar
  if (o.skip > 0) {
    for (let i = 0; i < 5; i++) {
      const y = (hash(i + Math.floor(t * 30)) * H) | 0;
      ctx.drawImage(ctx.canvas, 0, y, W, 24, (hash(i * 3 + t) - 0.5) * 80 * o.skip, y, W, 24);
    }
    ctx.fillStyle = `rgba(255,255,255,${0.18 * o.skip})`;
    ctx.fillRect(0, ((t * 700) % H) | 0, W, 8);
    if (o.skip > 0.4) osd(ctx, { label: '◀◀', counter: o.counter });
  }
}

/** Bant kopar: görüntü aşağı doğru yırtılıp kayar, yerini kar alır. draw(ctx) son kare. */
export function tearDown(ctx, t, draw) {
  const c = tearDown.c || (tearDown.c = document.createElement('canvas'));
  c.width = W;
  c.height = H;
  const cc = c.getContext('2d');
  cc.fillStyle = '#000';
  cc.fillRect(0, 0, W, H);
  draw(cc);
  const p = clamp(t / 1.3, 0, 1);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const rows = 24;
  for (let i = 0; i < rows; i++) {
    const sy = (i * H) / rows;
    const sh = H / rows + 1;
    const drop = p * p * H * (1.1 + hash(i) * 0.9);
    const dx = (hash(i * 7 + Math.floor(t * 20)) - 0.5) * 140 * p;
    ctx.drawImage(c, 0, sy, W, sh, dx, sy + drop, W, sh);
  }
  // yırtık çizgisi
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillRect(0, (p * H * 0.9) | 0, W, 3);
  staticNoise(ctx, t, Math.min(1, 0.15 + p * 0.95));
}

/** Kesintisiz kapkara (geri sarıp kurtulunca) */
export function cleanBlack(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
}

export { rr };

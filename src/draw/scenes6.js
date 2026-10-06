// KASET 6 — "İyi ki Doğdun Beste!" sahneleri: parti odası, pasta yakın planı, yarışma kartı,
// sandalyenin arkasındaki misafir, mum ışığı karanlığı.
import { rr, fill, stroke, star, shade, mixHex, bgBedroom, pine, OUT, FONT_CARTOON, FONT_HAND, FONT_OSD } from './scenes.js';
import { drawBeste } from './characters.js';
import { drawGreyMan } from './scenes3.js';
import { hash, clamp } from '../util.js';

const W = 640;
const H = 480;
const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
const easeOutBack = (p) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

// ------------------------------------------------------------------ yerleşim (parti odası)
export const PARTY = {
  table: { x0: 140, x1: 600, top: 318, hem: 398 },
  cake: { x: 365, y: 320, s: 0.62 },
  // masanın arkasındaki sandalyeler (alt kısımları masanın arkasında kalır)
  back: [
    { id: 'scrA', x: 184, color: '#9fe3c4' },
    { id: 'tonton', x: 260, color: '#ffd23f', label: 'TONTON' },
    { id: 'beste', x: 365, color: '#ff9fc4', label: 'BESTE' },
    { id: 'scrB', x: 470, color: '#b7a6ff' },
  ],
  backY: 336,
  backS: 0.8,
  // oyuncunun sandalyesi: önde, sağda, kameraya dönük
  ad: { x: 560, y: 472, s: 1.12, color: '#7fc8ff' },
  tonton: { x: 260, y: 306, scale: 0.7 },
  besteBehind: { x: 365, y: 352, scale: 0.92 },
  besteFront: { x: 108, y: 466, scale: 0.9 },
  glow: { x: 365, y: 236 },
};

// ------------------------------------------------------------------ parti şapkası
function hatShape(ctx, w, h, colors, t = 0) {
  // koni
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(0, w * 0.18, -w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = colors[0];
  ctx.fill();
  // çizgiler
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = w * 0.16;
  for (let i = -3; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-w, -i * h * 0.28);
    ctx.lineTo(w, -i * h * 0.28 - h * 0.45);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(0, w * 0.18, -w / 2, 0);
  ctx.closePath();
  stroke(ctx, Math.max(2, w * 0.07));
  // ponpon
  ctx.beginPath();
  ctx.arc(Math.sin(t * 3) * w * 0.03, -h, w * 0.16, 0, TAU);
  fill(ctx, colors[2] || '#ffffff');
  stroke(ctx, Math.max(1.5, w * 0.05));
}

/** Jenerikteki dönen yıldızlara parti şapkası (S.titleCard'daki yörüngeyle aynı hesap). */
export function titleHats(ctx, t) {
  const cols = [['#ff6fa8', '#ffe14d'], ['#4aa8ff', '#ffffff'], ['#5ed35e', '#ffe14d']];
  for (let i = 0; i < 9; i++) {
    const a = t * 0.4 + (i * Math.PI * 2) / 9;
    const x = W / 2 + Math.cos(a) * 250, y = 210 + Math.sin(a) * 140;
    const r = 14 + (i % 3) * 5;
    const rot = t + i;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(0, -r * 0.8);
    hatShape(ctx, r * 1.25, r * 1.65, cols[i % 3], t + i);
    ctx.restore();
  }
}

/** Beste'nin başına parti şapkası (drawBeste ile aynı dönüşümler). */
export function besteHat(ctx, s) {
  if (s.back) return;
  const t = s.t || 0;
  const breathe = s.expr === 'frozen' || s.expr === 'void' ? 0 : Math.sin(t * 2.2) * 1.5;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  ctx.translate(0, breathe - 205);
  ctx.rotate(s.tilt || 0);
  // lastik
  ctx.strokeStyle = 'rgba(42,23,18,.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -58);
  ctx.quadraticCurveTo(-58, 10, -40, 58);
  ctx.moveTo(34, -52);
  ctx.quadraticCurveTo(58, 10, 40, 58);
  ctx.stroke();
  ctx.translate(8, -58);
  ctx.rotate(0.16);
  hatShape(ctx, 58, 74, ['#ff6fa8', '#ffe14d', '#ffffff'], t);
  ctx.restore();
}

/** Dikişli Tonton'un başına parti şapkası (drawTonton dönüşümleri). */
export function tontonHat(ctx, s) {
  const t = s.t || 0;
  const breathe = Math.sin(t * 2.6) * 1.2;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(s.scale, s.scale);
  ctx.translate(0, -104 + breathe);
  ctx.rotate(s.hatTilt ?? -0.12);
  ctx.translate(-2, -36);
  hatShape(ctx, 40, 56, ['#4aa8ff', '#ffffff', '#ffe14d'], t);
  ctx.restore();
}

// ------------------------------------------------------------------ süsler
function bunting(ctx, t, x0, y0, x1, y1, sag, n, still) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag]);
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  const cols = ['#ff6fa8', '#ffe14d', '#4aa8ff', '#5ed35e', '#ff9f3a'];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const sw = still ? 0 : Math.sin(t * 1.6 + i * 0.9) * 2.5;
    const mx = (ax + bx) / 2 + sw, my = (ay + by) / 2 + 30;
    ctx.beginPath();
    ctx.moveTo(ax + 3, ay);
    ctx.lineTo(bx - 3, by);
    ctx.lineTo(mx, my);
    ctx.closePath();
    fill(ctx, cols[i % cols.length]);
    stroke(ctx, 2.2);
  }
}

function balloon(ctx, t, x, y, r, color, tieX, tieY, still, k = 0) {
  const bob = still ? 0 : Math.sin(t * 1.3 + k) * 4;
  const sway = still ? 0 : Math.sin(t * 0.9 + k * 2) * 3;
  const bx = x + sway, by = y + bob;
  // ip
  ctx.strokeStyle = 'rgba(42,23,18,.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by + r * 1.18);
  ctx.bezierCurveTo(bx - 10, by + r * 1.18 + 40, tieX + 12, tieY - 40, tieX, tieY);
  ctx.stroke();
  // balon
  ctx.beginPath();
  ctx.moveTo(bx, by + r * 1.15);
  ctx.bezierCurveTo(bx - r * 1.25, by + r * 0.6, bx - r * 1.05, by - r * 1.1, bx, by - r * 1.1);
  ctx.bezierCurveTo(bx + r * 1.05, by - r * 1.1, bx + r * 1.25, by + r * 0.6, bx, by + r * 1.15);
  ctx.closePath();
  fill(ctx, color);
  stroke(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(bx - 5, by + r * 1.3);
  ctx.lineTo(bx + 5, by + r * 1.3);
  ctx.lineTo(bx, by + r * 1.12);
  ctx.closePath();
  fill(ctx, color);
  stroke(ctx, 2);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ellipse(ctx, bx - r * 0.38, by - r * 0.45, r * 0.18, r * 0.3, 0.5);
  ctx.fill();
}

/** Yerde sönmüş, buruşmuş balon */
function deflated(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.beginPath();
  ctx.moveTo(-34, 2);
  ctx.bezierCurveTo(-30, -16, -6, -10, 4, -14);
  ctx.bezierCurveTo(18, -18, 30, -6, 26, 4);
  ctx.bezierCurveTo(10, 12, -16, 10, -34, 2);
  ctx.closePath();
  fill(ctx, mixHex(color, '#5a3f2e', 0.25));
  stroke(ctx, 3);
  ctx.strokeStyle = 'rgba(42,23,18,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.quadraticCurveTo(-6, 4, 6, -4);
  ctx.moveTo(4, -9);
  ctx.quadraticCurveTo(12, -4, 18, -8);
  ctx.stroke();
  // düğüm ve ip
  ctx.beginPath();
  ctx.moveTo(26, 2);
  ctx.lineTo(34, -2);
  ctx.lineTo(34, 7);
  ctx.closePath();
  fill(ctx, mixHex(color, '#5a3f2e', 0.25));
  stroke(ctx, 2);
  ctx.strokeStyle = 'rgba(42,23,18,.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(34, 2);
  ctx.bezierCurveTo(54, 10, 48, -8, 74, 4);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ sandalye ve isim kartı
/**
 * Küçük çocuk sandalyesi, önden. (x, y) ayakların ortası (yer), s ölçek.
 * o.label: kart yazısı, o.scribble: karalanmış kart, o.cardGlow: kartın etrafında parıltı
 */
export function kidChair(ctx, x, y, s, o = {}) {
  const col = o.color || '#ffd23f';
  const dark = mixHex(col, '#2a1712', 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  // arka ayaklar ve sırt dikmeleri
  for (const sx of [-30, 30]) {
    rr(ctx, sx - 5, -176, 10, 176, 3);
    fill(ctx, dark);
    stroke(ctx, 3);
  }
  // sırt: üst tahta ve orta çıta
  rr(ctx, -38, -184, 76, 22, 7);
  fill(ctx, col);
  stroke(ctx, 3.5);
  rr(ctx, -30, -140, 60, 10, 3);
  fill(ctx, col);
  stroke(ctx, 3);
  // oturak
  ctx.beginPath();
  ctx.moveTo(-40, -74);
  ctx.lineTo(40, -74);
  ctx.lineTo(46, -62);
  ctx.lineTo(-46, -62);
  ctx.closePath();
  fill(ctx, mixHex(col, '#ffffff', 0.25));
  stroke(ctx, 3);
  rr(ctx, -46, -62, 92, 10, 2);
  fill(ctx, col);
  stroke(ctx, 3);
  // ön ayaklar
  for (const sx of [-38, 38]) {
    rr(ctx, sx - 6, -54, 12, 54, 3);
    fill(ctx, col);
    stroke(ctx, 3);
  }
  ctx.restore();
  if (o.label != null || o.scribble) nameCard(ctx, x, y - 162 * s, s, o);
}

/** Sandalye sırtından iki iple sarkan isim kartı. (x, y): üst tahtanın ortası */
export function nameCard(ctx, x, y, s, o = {}) {
  const w = 74 * s, h = 34 * s;
  const cy = y + 8 * s;
  const sw = o.swing || 0;
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(sw);
  if (o.cardGlow > 0) {
    ctx.save();
    ctx.shadowColor = `rgba(255,240,170,${o.cardGlow})`;
    ctx.shadowBlur = 22 * s;
    rr(ctx, -w / 2, 0, w, h, 4 * s);
    fill(ctx, `rgba(255,250,220,${o.cardGlow})`);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(42,23,18,.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, -6 * s);
  ctx.lineTo(-w * 0.32, 4 * s);
  ctx.moveTo(w * 0.32, -6 * s);
  ctx.lineTo(w * 0.32, 4 * s);
  ctx.stroke();
  ctx.translate(0, 2 * s);
  rr(ctx, -w / 2, 0, w, h, 4 * s);
  fill(ctx, '#fffdf2');
  stroke(ctx, 2.2 * s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (o.scribble) {
    // altında belli belirsiz bir isim, üstünde kara boya karalaması
    ctx.font = `800 ${16 * s}px ${FONT_CARTOON}`;
    ctx.fillStyle = 'rgba(232,50,60,.55)';
    ctx.fillText(o.ghost || 'ELİF', 0, h / 2 + 1);
    ctx.strokeStyle = 'rgba(18,14,16,.92)';
    ctx.lineWidth = 3.4 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const k0 = o.seed || 1;
    for (let i = 0; i < 9; i++) {
      const px = -w * 0.4 + (i / 8) * w * 0.8;
      const py = h * 0.3 + hash(k0 + i) * h * 0.42;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    for (let i = 8; i >= 0; i--) {
      const px = -w * 0.38 + (i / 8) * w * 0.78;
      const py = h * 0.22 + hash(k0 + i + 20) * h * 0.56;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else {
    let size = 18 * s;
    ctx.font = `800 ${size}px ${FONT_CARTOON}`;
    const tw = ctx.measureText(o.label).width;
    if (tw > w - 10 * s) {
      size *= (w - 10 * s) / tw;
      ctx.font = `800 ${size}px ${FONT_CARTOON}`;
    }
    ctx.fillStyle = o.labelColor || '#e8323c';
    ctx.fillText(o.label, 0, h / 2 + 1.5 * s);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ pasta
const SLOTS = 8;
/** Mum yuvalarının pasta üstündeki konumu (pastanın kendi koordinatında). Yuva 4 boş: sekizinci mumun yeri. */
export const EMPTY_SLOT = 4;
function slotPos(i) {
  const u = (i + 0.5) / SLOTS - 0.5;
  return { x: u * 196, y: Math.abs(u) * -8 - 2 };
}

function flame(ctx, x, y, s, t, k, still, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (still) {
    // donmuş alev: kıpırtısız, düz bir üçgen
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y);
    ctx.lineTo(x, y - 20 * s);
    ctx.lineTo(x + 5 * s, y);
    ctx.closePath();
    fill(ctx, '#ffcf5a');
    ctx.lineWidth = 1.2 * s;
    ctx.strokeStyle = '#c8661c';
    ctx.stroke();
    ctx.restore();
    return;
  }
  const fl = 1 + Math.sin(t * 13 + k * 1.7) * 0.12 + Math.sin(t * 23 + k * 3.1) * 0.07;
  const sway = Math.sin(t * 7 + k * 2.3) * 1.8 * s;
  const h = 19 * s * fl;
  const w = 6.2 * s;
  // hale
  const g = ctx.createRadialGradient(x, y - h * 0.45, 1, x, y - h * 0.45, h * 1.5);
  g.addColorStop(0, 'rgba(255,214,120,.55)');
  g.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - h * 1.6, y - h * 2, h * 3.2, h * 3);
  const drop = (sc, col) => {
    ctx.beginPath();
    ctx.moveTo(x, y + 1 * s);
    ctx.bezierCurveTo(x - w * sc, y - h * 0.15 * sc, x - w * 0.6 * sc + sway * 0.5, y - h * 0.6 * sc, x + sway, y - h * sc);
    ctx.bezierCurveTo(x + w * 0.6 * sc + sway * 0.5, y - h * 0.6 * sc, x + w * sc, y - h * 0.15 * sc, x, y + 1 * s);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  };
  drop(1, '#ff9a2e');
  drop(0.62, '#ffe48a');
  drop(0.3, '#fffbe6');
  ctx.restore();
}

/** Mumun söndüğü yerden yükselen ince gri duman kıvrımı. age: saniye */
function smoke(ctx, x, y, s, age, t) {
  if (age < 0) return;
  const a = clamp(1 - age / 6, 0, 1) * clamp(age * 3, 0, 1);
  if (a <= 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(200,200,205,${0.75 * a})`;
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const len = Math.min(26, 6 + age * 14);
  for (let k = 0; k <= len; k++) {
    const yy = y - k * 3.2 * s;
    const xx = x + Math.sin(k * 0.42 - t * 2.4) * (1 + k * 0.32) * s;
    k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
}

function candle(ctx, x, y, s, i, eighth) {
  const w = 8 * s, h = 38 * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h, w, h);
  ctx.fillStyle = eighth ? '#d9d6cf' : ['#ffffff', '#fff3a6', '#bfe6ff'][i % 3];
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = eighth ? '#8d8f94' : ['#ff6fa8', '#4aa8ff', '#ff6fa8'][i % 3];
  ctx.lineWidth = 3 * s;
  for (let k = -2; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(x - w, y - k * 9 * s);
    ctx.lineTo(x + w, y - k * 9 * s - 8 * s);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h, w, h);
  stroke(ctx, Math.max(1.2, 2 * s));
  // fitil
  ctx.strokeStyle = '#2a1712';
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + 1.5 * s, y - h - 4 * s, x + 0.5 * s, y - h - 6 * s);
  ctx.stroke();
}

/**
 * Pembe pasta. (x, y): pastanın tabanının ortası, s ölçek (1 = 240 px genişlik).
 * o.lit: yanan mum sayısı (0..7), o.out: true -> hepsi söndü, o.still: alevler donuk üçgen,
 * o.eighth: null | 'unlit' | 'lit' | 'out', o.eighthT: son durum değişiminin zamanı (t),
 * o.smoke8: sekizinci yuvadan duman başlangıcı (t) | null, o.smokeAll: tüm mumlardan duman başlangıcı (t) | null,
 * o.nums: mumların üstünde beliren sayılar (0..7), o.plaque: plaket yazısı, o.plaqueP: yazılma oranı,
 * o.pop8: sekizinci mumun belirme zamanı (t)
 */
export function drawCake(ctx, x, y, s, t, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const W2 = 120 * s, BH = 92 * s, TY = -BH, RY = 22 * s;
  // tabak
  ellipse(ctx, 0, 2 * s, W2 + 22 * s, 16 * s);
  fill(ctx, '#f4f1ea');
  stroke(ctx, 3 * s);
  // gövde
  ctx.beginPath();
  ctx.moveTo(-W2, TY);
  ctx.lineTo(-W2, 0);
  ctx.ellipse(0, 0, W2, RY * 0.7, 0, Math.PI, 0, true);
  ctx.lineTo(W2, TY);
  ctx.closePath();
  fill(ctx, '#ff9fc4');
  stroke(ctx, 3.5 * s);
  // krem şerit
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-W2, TY);
  ctx.lineTo(-W2, 0);
  ctx.ellipse(0, 0, W2, RY * 0.7, 0, Math.PI, 0, true);
  ctx.lineTo(W2, TY);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#ffd0e2';
  ctx.fillRect(-W2, -BH * 0.42, W2 * 2, BH * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 18; i++) {
    const px = -W2 + 10 * s + hash(i * 3.3) * (W2 * 2 - 20 * s);
    const py = -BH * 0.2 + hash(i * 7.1) * BH * 0.18;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hash(i) * 3);
    ctx.fillStyle = ['#ffe14d', '#4aa8ff', '#5ed35e', '#ffffff'][i % 4];
    ctx.fillRect(-3 * s, -1 * s, 6 * s, 2.4 * s);
    ctx.restore();
  }
  ctx.restore();
  // üst krema ve damlalar
  ctx.beginPath();
  ctx.moveTo(-W2, TY);
  for (let i = 0; i <= 12; i++) {
    const px = -W2 + (i / 12) * W2 * 2;
    const drip = (i % 2 ? 14 : 24 + hash(i) * 10) * s;
    const yy = TY + Math.sqrt(Math.max(0, 1 - (px / W2) ** 2)) * RY * 0.9;
    ctx.lineTo(px, yy + drip);
    ctx.quadraticCurveTo(px + W2 / 12, yy + drip + 8 * s, px + (W2 / 6) * 0.98, yy + 4 * s);
  }
  ctx.lineTo(W2, TY);
  ctx.closePath();
  fill(ctx, '#ffffff');
  stroke(ctx, 3 * s);
  ellipse(ctx, 0, TY, W2, RY);
  fill(ctx, '#fff4f8');
  stroke(ctx, 3.5 * s);
  // plaket
  if (o.plaque != null) plaque(ctx, s, -BH * 0.52, o.plaque, o.plaqueP ?? 1, o.plaqueFont);
  // boş yuvada bir delik
  const e = slotPos(EMPTY_SLOT);
  if (!o.eighth) {
    ellipse(ctx, e.x, TY + e.y, 3.2 * s, 1.6 * s);
    fill(ctx, '#7a5a5e');
  }
  // mumlar
  let lit = 0;
  for (let i = 0; i < SLOTS; i++) {
    const p = slotPos(i);
    const cx = p.x, cy = TY + p.y;
    if (i === EMPTY_SLOT) {
      if (o.eighth) {
        let sc = 1;
        if (o.pop8 != null) sc = clamp(easeOutBack(clamp((t - o.pop8) / 0.35, 0, 1)), 0, 1.3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(0.07);
        ctx.scale(sc, sc);
        candle(ctx, 0, 0, s, i, true);
        ctx.restore();
        if (o.eighth === 'lit') flame(ctx, cx + 2.6 * s, cy - 44 * s, s * 0.95, t, 99, false, clamp((t - (o.eighthT || 0)) * 5, 0, 1));
      }
      continue;
    }
    candle(ctx, cx, cy, s, i, false);
    if (!o.out && lit < (o.lit ?? 7)) flame(ctx, cx, cy - 44 * s, s, t, i, o.still, o.flameA ?? 1);
    lit++;
  }
  // duman
  if (o.smoke8 != null) smoke(ctx, e.x + 2 * s, TY + e.y - 46 * s, s, t - o.smoke8, t);
  if (o.smokeAll != null)
    for (let i = 0; i < SLOTS; i++) {
      if (i === EMPTY_SLOT) continue;
      const p = slotPos(i);
      smoke(ctx, p.x, TY + p.y - 46 * s, s, t - o.smokeAll - i * 0.05, t + i);
    }
  // GERÇEK: boş yuvanın üstünde kırmızı, titrek bir 8 (oyuncunun arkasından 'Sekiz.' fısıltısıyla)
  if (o.num8 != null && t >= o.num8) {
    const age = t - o.num8;
    const a = clamp(age * 4, 0, 1) * clamp(2.4 - age * 0.6, 0, 1);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(e.x + (hash(Math.floor(t * 24)) - 0.5) * 3 * s, TY + e.y - 76 * s);
      ctx.scale(1 + age * 0.05, 1 + age * 0.05);
      ctx.font = `800 ${21 * s}px ${FONT_CARTOON}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * s;
      ctx.strokeStyle = '#1a0306';
      ctx.strokeText('8', 0, 0);
      ctx.fillStyle = '#c8202c';
      ctx.fillText('8', 0, 0);
      ctx.restore();
    }
  }
  // sayılar (yanlış sayınca mumların üstünde birer birer)
  if (o.nums) {
    let k = 0;
    for (let i = 0; i < SLOTS && k < o.nums; i++) {
      if (i === EMPTY_SLOT) continue;
      k++;
      const p = slotPos(i);
      const age = o.numT ? t - o.numT[k - 1] : 1;
      const sc = clamp(easeOutBack(clamp(age / 0.3, 0, 1)), 0, 1.4);
      ctx.save();
      ctx.translate(p.x, TY + p.y - 76 * s);
      ctx.scale(sc, sc);
      ctx.font = `800 ${18 * s}px ${FONT_CARTOON}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * s;
      ctx.strokeStyle = OUT;
      ctx.strokeText(String(k), 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(k), 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Pastanın önündeki beyaz şeker plaket; üstüne pembe kremayla yazı. */
function plaque(ctx, s, cy, text, p, fontPx) {
  const pw = 176 * s, ph = 38 * s;
  rr(ctx, -pw / 2, cy - ph / 2, pw, ph, ph / 2);
  fill(ctx, '#fffaf0');
  stroke(ctx, 2.6 * s);
  const shown = text.slice(0, Math.ceil(text.length * clamp(p, 0, 1)));
  if (!shown) return;
  let size = (fontPx || 24) * s;
  ctx.font = `700 ${size}px ${FONT_HAND}`;
  const full = ctx.measureText(text).width;
  if (full > pw - 22 * s) {
    size *= (pw - 22 * s) / full;
    ctx.font = `700 ${size}px ${FONT_HAND}`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const x0 = -ctx.measureText(text).width / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = '#d63f7e';
  ctx.strokeText(shown, x0, cy + 1 * s);
  ctx.fillStyle = '#ff8fbf';
  ctx.fillText(shown, x0, cy + 1 * s);
  // krema tüpünün ucu
  if (p < 1) {
    const tx = x0 + ctx.measureText(shown).width;
    ctx.fillStyle = '#ff8fbf';
    ctx.beginPath();
    ctx.arc(tx + 3 * s, cy - 2 * s, 3 * s, 0, TAU);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ parti masası
function table(ctx, t) {
  const T = PARTY.table;
  // üst yüzey
  ctx.beginPath();
  ctx.moveTo(T.x0 + 18, T.top - 16);
  ctx.lineTo(T.x1 - 18, T.top - 16);
  ctx.lineTo(T.x1, T.top);
  ctx.lineTo(T.x0, T.top);
  ctx.closePath();
  fill(ctx, '#fff4f8');
  stroke(ctx, 3);
  // örtü: fistolu etek, puantiye
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(T.x0, T.top);
  ctx.lineTo(T.x1, T.top);
  ctx.lineTo(T.x1, T.hem);
  const n = 12;
  for (let i = n; i > 0; i--) {
    const xa = T.x0 + ((i - 1) / n) * (T.x1 - T.x0);
    const xb = T.x0 + (i / n) * (T.x1 - T.x0);
    ctx.quadraticCurveTo((xa + xb) / 2, T.hem + 14, xa, T.hem);
  }
  ctx.closePath();
  ctx.fillStyle = '#ff8fb8';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let yy = T.top + 14; yy < T.hem + 14; yy += 22)
    for (let xx = T.x0 + ((yy / 22) % 2 ? 12 : 0); xx < T.x1; xx += 26) {
      ctx.beginPath();
      ctx.arc(xx, yy, 4, 0, TAU);
      ctx.fill();
    }
  ctx.fillStyle = 'rgba(120,20,60,.12)';
  ctx.fillRect(T.x0, T.top, T.x1 - T.x0, 10);
  ctx.restore();
  stroke(ctx, 3.5);
  ctx.restore();
}

function partyProps(ctx, t) {
  // tabaklar, bardaklar, düdükler
  const T = PARTY.table;
  for (const [x, c] of [[226, '#4aa8ff'], [516, '#ffe14d']]) {
    ellipse(ctx, x, T.top - 7, 20, 5);
    fill(ctx, '#ffffff');
    stroke(ctx, 2);
    // karton bardak
    ctx.beginPath();
    ctx.moveTo(x + 14, T.top - 30);
    ctx.lineTo(x + 30, T.top - 30);
    ctx.lineTo(x + 27, T.top - 8);
    ctx.lineTo(x + 17, T.top - 8);
    ctx.closePath();
    fill(ctx, c);
    stroke(ctx, 2);
  }
  // parti düdüğü (kıvrık)
  ctx.save();
  ctx.translate(560, T.top - 12);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, -6, 7, 0.4, Math.PI * 1.8);
  ctx.stroke();
  ctx.strokeStyle = '#ff6fa8';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ gri adam
const MAN_TOP = 'rgb(138,138,146)';
const MAN_MID = 'rgb(104,105,113)';
const MAN_LINE = 'rgba(40,40,48,.55)';
function manFill(ctx, y0, y1, a = 1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, MAN_TOP);
  g.addColorStop(0.75, MAN_MID);
  g.addColorStop(1, `rgba(70,72,80,${0.75 * a})`);
  return g;
}
/** Kalın, kenarı koyu bir uzuv (gri adam için) */
function manLimb(ctx, pts, w, col) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = MAN_LINE;
  ctx.lineWidth = w + 3;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}
function manFingers(ctx, hx, y, dir, len0, spread = 6.5) {
  for (let f = 0; f < 4; f++) {
    const sp = (f - 1.5) * spread;
    const len = len0 + (f === 1 || f === 2 ? 12 : 0);
    ctx.beginPath();
    ctx.moveTo(hx + sp, y);
    ctx.quadraticCurveTo(hx + sp * 1.25 + dir * 2, y + len * 0.45, hx + sp * 1.45 + dir * 3, y + len);
    ctx.strokeStyle = MAN_LINE;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = MAN_TOP;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

/**
 * Sandalyenin arkasında ayakta duran gri adam. Başı kadrajın üstünde kalır.
 * (x, railY): sandalye sırtının üst tahtası; ellerini oraya koyar.
 * part: 'body' (sandalyenin arkasında) | 'hands' (parmaklar sırtın önüne sarkar)
 */
export function greyManStanding(ctx, x, railY, part, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const hand = [x - 46, x + 46];
  const g = manFill(ctx, -40, H);
  if (part === 'body') {
    // ince, uzun gövde: omuzlar kadrajın üstünde, kalça sandalyenin arkasında
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 58, -40);
    ctx.quadraticCurveTo(x, -52, x + 58, -40);
    ctx.quadraticCurveTo(x + 40, 90, x + 30, 250);
    ctx.lineTo(x + 26, H + 10);
    ctx.lineTo(x + 5, H + 10);
    ctx.lineTo(x, 330);
    ctx.lineTo(x - 5, H + 10);
    ctx.lineTo(x - 26, H + 10);
    ctx.lineTo(x - 30, 250);
    ctx.quadraticCurveTo(x - 40, 90, x - 58, -40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = MAN_LINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // kollar: omuzdan dışarı, sonra sırta doğru içeri kıvrılır (gövdeden ayrı görünür)
    manLimb(ctx, [[x - 60, -30], [x - 104, railY * 0.55], [hand[0], railY - 8]], 13, g);
    manLimb(ctx, [[x + 60, -30], [x + 104, railY * 0.55], [hand[1], railY - 8]], 13, g);
  } else {
    // eller: avuç tahtanın üstünde, uzun parmaklar önden aşağı sarkar
    for (const [i, hx] of hand.entries()) {
      const dir = i ? 1 : -1;
      ellipse(ctx, hx, railY - 5, 16, 9, dir * 0.12);
      ctx.fillStyle = MAN_TOP;
      ctx.fill();
      ctx.strokeStyle = MAN_LINE;
      ctx.lineWidth = 2;
      ctx.stroke();
      manFingers(ctx, hx, railY - 2, dir, 40 + (o.curl || 0) * 6);
    }
  }
  ctx.restore();
}

/** GİZLİ kare: gri adam, oyuncunun küçük sandalyesine sığmayan bir halde oturuyor; isim kartı göğsünde. */
export function greyManSitting(ctx, x, y, s, label) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seatY = y - 68 * s;
  const g = manFill(ctx, 20, y);
  // gövde: öne eğik, omuzlar kalkık
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 50, seatY - 236);
  ctx.quadraticCurveTo(x, seatY - 250, x + 50, seatY - 236);
  ctx.quadraticCurveTo(x + 40, seatY - 120, x + 34, seatY - 4);
  ctx.lineTo(x - 34, seatY - 4);
  ctx.quadraticCurveTo(x - 40, seatY - 120, x - 50, seatY - 236);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = MAN_LINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // boyun ve baş (yüzsüz), hafif yana eğik
  ctx.fillStyle = MAN_TOP;
  ctx.fillRect(x - 8, seatY - 268, 16, 36);
  ctx.save();
  ctx.translate(x, seatY - 296);
  ctx.rotate(0.22);
  ellipse(ctx, 0, 0, 24, 33);
  ctx.fill();
  ctx.strokeStyle = MAN_LINE;
  ctx.stroke();
  ctx.restore();
  // bacaklar: dizler göğüs hizasına kalkık, kaval kemikleri yere iner
  for (const dir of [-1, 1]) manLimb(ctx, [[x + dir * 20, seatY - 8], [x + dir * 70, seatY - 140], [x + dir * 84, y + 2]], 20, g);
  // ayaklar
  for (const dir of [-1, 1]) {
    ellipse(ctx, x + dir * 92, y + 2, 20, 7);
    ctx.fillStyle = MAN_MID;
    ctx.fill();
  }
  // kollar: dizlerin üstüne uzanır, parmaklar kaval kemiklerinden sarkar
  for (const dir of [-1, 1]) {
    manLimb(ctx, [[x + dir * 46, seatY - 226], [x + dir * 104, seatY - 196], [x + dir * 74, seatY - 150]], 11, g);
    manFingers(ctx, x + dir * 74, seatY - 150, dir, 44, 5.5);
  }
  ctx.restore();
  // göğsündeki isim kartı
  nameCard(ctx, x, seatY - 190, 1.0, { label });
}

/** Masanın üstünde katlanmış yer kartı. (x, y): masanın üst kenarı */
export function tentCard(ctx, x, y, o = {}) {
  const w = 62, h = 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h - 3);
  ctx.lineTo(w / 2 - 3, -h - 3);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(-w / 2, 0);
  ctx.closePath();
  fill(ctx, '#fffdf2');
  stroke(ctx, 2.2);
  ctx.strokeStyle = 'rgba(42,23,18,.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h - 3);
  ctx.lineTo(w / 2 - 3, -h - 3);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (o.scribble) {
    ctx.font = `800 14px ${FONT_CARTOON}`;
    ctx.fillStyle = 'rgba(232,50,60,.32)';
    ctx.fillText(o.ghost || 'ELİF', 0, -h / 2);
    ctx.strokeStyle = 'rgba(18,14,16,.92)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const k0 = o.seed || 1;
    for (let i = 0; i < 9; i++) {
      const px = -w * 0.4 + (i / 8) * w * 0.8;
      const py = -h * 0.85 + hash(k0 + i) * h * 0.55;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    for (let i = 8; i >= 0; i--) ctx.lineTo(-w * 0.38 + (i / 8) * w * 0.78, -h * 0.9 + hash(k0 + i + 20) * h * 0.7);
    ctx.stroke();
  } else {
    let size = 15;
    ctx.font = `800 ${size}px ${FONT_CARTOON}`;
    const tw = ctx.measureText(o.label).width;
    if (tw > w - 8) ctx.font = `800 ${(size * (w - 8)) / tw}px ${FONT_CARTOON}`;
    ctx.fillStyle = '#e8323c';
    ctx.fillText(o.label, 0, -h / 2 + 0.5);
  }
  ctx.restore();
}

/** Takvim yakın planı (MAYIS 1998, pazartesiden başlar). o.all14: 0..1 her gün 14 olur, o.thu: perşembe sütunu */
export function calendarClose(ctx, t, o = {}) {
  ctx.fillStyle = '#a9dcf7';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let y = 20; y < H; y += 40)
    for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
    }
  ctx.save();
  ctx.translate(W / 2, 250);
  ctx.rotate(-0.025);
  // çivi ve ip
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-60, -196);
  ctx.lineTo(0, -232);
  ctx.lineTo(60, -196);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -232, 5, 0, TAU);
  fill(ctx, '#c8323c');
  stroke(ctx, 2);
  rr(ctx, -230, -200, 460, 410, 6);
  fill(ctx, '#ffffff');
  stroke(ctx, 5);
  ctx.fillStyle = '#e8323c';
  ctx.fillRect(-226, -196, 452, 62);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 40px ${FONT_CARTOON}`;
  ctx.fillText('MAYIS 1998', 0, -163);
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const cw = 62, x0 = -3 * cw, y0 = -112;
  ctx.font = `700 21px ${FONT_CARTOON}`;
  days.forEach((d, i) => {
    ctx.fillStyle = i === 3 && o.thu ? '#e8323c' : i >= 5 ? '#e8323c' : '#555';
    ctx.fillText(d, x0 + i * cw, y0);
  });
  if (o.thu) {
    ctx.fillStyle = `rgba(255,80,80,${0.12 + Math.sin(t * 5) * 0.06})`;
    ctx.fillRect(x0 + 3 * cw - cw / 2 + 2, y0 + 14, cw - 4, 290);
  }
  const all = clamp(o.all14 || 0, 0, 1);
  for (let d = 1; d <= 31; d++) {
    const cell = d + 3; // 1 Mayıs 1998 cuma
    const col = cell % 7, row = Math.floor(cell / 7);
    const cx = x0 + col * cw, cy = y0 + 42 + row * 52;
    // her gün sırayla 14'e döner
    const flip = all > 0 && hash(d * 1.7) < all * 1.15;
    const txt = flip ? '14' : String(d);
    ctx.font = `800 ${flip ? 30 : 28}px ${FONT_CARTOON}`;
    ctx.fillStyle = flip ? '#b0202a' : col >= 5 ? '#e8323c' : '#333';
    const jx = flip ? (hash(d + Math.floor(t * 12)) - 0.5) * 2 : 0;
    ctx.fillText(txt, cx + jx, cy);
    if (d === 14 || flip) {
      ctx.strokeStyle = '#e8323c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 25, 21, -0.1, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ parti odası
/**
 * o: { name, still, ft (donmuş zaman), dark 0..1, glow (ışık yarıçapı), cake {...drawCake seçenekleri},
 *      drawTonton(ctx), drawBeste(ctx) (masanın arkasında ya da önünde), besteFront: bool,
 *      man: 0..1 (sandalyenin arkasındaki adam), manSit: bool (gizli kare), cal14: 0..1, cardGlow: 'ad' | null,
 *      cardGlowA, countdown: {n, t0}, besteLight: {x, y, scale} (alttan aydınlatma için) }
 */
export function bgParty(ctx, t, o = {}) {
  const ft = o.still ? (o.ft ?? t) : t;
  bgBedroom(ctx, ft, { calendar: true, window: 'night', night: 0.32 });
  // takvim: bütün günler 14
  if (o.cal14 > 0) calendarAll14(ctx, o.cal14, ft);
  bunting(ctx, ft, -10, 18, 330, 30, 26, 8, o.still);
  bunting(ctx, ft, 300, 30, 650, 14, 30, 8, o.still);
  // balonlar: dolaba, pencereye ve sandalyeye bağlı
  balloon(ctx, ft, 160, 128, 24, '#ff6fa8', 190, 255, o.still, 0);
  balloon(ctx, ft, 448, 108, 26, '#4aa8ff', 470, 248, o.still, 1.3);
  balloon(ctx, ft, 612, 150, 22, '#ffe14d', 600, 300, o.still, 2.6);

  const P = PARTY;
  // masanın arkasındaki sandalyeler
  for (const c of P.back) kidChair(ctx, c.x, P.backY, P.backS, c.id === 'beste' ? { color: c.color, label: 'BESTE', cardGlow: o.cardGlow === 'beste' ? (o.cardGlowA ?? 1) : 0 } : { color: c.color });
  if (o.drawTonton) o.drawTonton(ctx);
  if (o.drawBeste && !o.besteFront) o.drawBeste(ctx);
  table(ctx, ft);
  partyProps(ctx, ft);
  drawCake(ctx, P.cake.x, P.cake.y, P.cake.s, t, { still: o.still, ...(o.cake || {}) });
  // masadaki yer kartları
  for (const c of P.back) {
    if (c.id === 'beste') continue;
    tentCard(ctx, c.x, P.table.top - 4, c.label ? { label: c.label } : { scribble: true, seed: c.x, ghost: c.id === 'scrA' ? 'ELİF' : 'MERT' });
  }
  // oyuncunun sandalyesi ve arkasındaki misafir
  const A = P.ad;
  const railY = A.y - 176 * A.s;
  if (o.manSit) greyManSitting(ctx, A.x, A.y, A.s, o.name);
  else if (o.man > 0) greyManStanding(ctx, A.x, railY, 'body', { alpha: o.man });
  if (!o.manSit) kidChair(ctx, A.x, A.y, A.s, { color: A.color, label: o.name, cardGlow: o.cardGlow === 'ad' ? (o.cardGlowA ?? 1) : 0 });
  else kidChairLegsOnly(ctx, A.x, A.y, A.s, A.color);
  if (!o.manSit && o.man > 0) greyManStanding(ctx, A.x, railY, 'hands', { alpha: o.man, curl: o.curl || 0 });
  deflated(ctx, 300, 452, '#5ed35e');
  if (o.drawBeste && o.besteFront) o.drawBeste(ctx);
  // karanlık: yalnızca mum ışığı
  if (o.dark > 0) candleDark(ctx, ft, o);
  if (o.countdown) countdown(ctx, t, o.countdown);
}

/** Oturan adam için yalnızca sandalyenin ön ayakları ve oturağı (gövde arkada kalır) */
function kidChairLegsOnly(ctx, x, y, s, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -46, -62, 92, 10, 2);
  fill(ctx, col);
  stroke(ctx, 3);
  for (const sx of [-38, 38]) {
    rr(ctx, sx - 6, -54, 12, 54, 3);
    fill(ctx, col);
    stroke(ctx, 3);
  }
  ctx.restore();
}

function calendarAll14(ctx, a, t) {
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.translate(372, 52);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 23, 68, 66);
  ctx.fillStyle = '#333';
  ctx.font = `9px ${FONT_OSD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#e8323c';
  ctx.lineWidth = 1.4;
  for (let d = 1; d <= 31; d++) {
    const cell = d + 4;
    const cx = 7 + (cell % 7) * 10, cy = 30 + Math.floor(cell / 7) * 11;
    ctx.fillText('14', cx, cy);
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // takvimin etrafında hafif bir parıltı
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1) * (0.4 + Math.sin(t * 6) * 0.2);
  ctx.strokeStyle = '#ff5050';
  ctx.lineWidth = 3;
  ctx.strokeRect(367, 47, 84, 102);
  ctx.restore();
}

/** Mum ışığı dışındaki her yer karanlık. o.glow: ışık yarıçapı, o.dark: karanlık miktarı */
function candleDark(ctx, t, o) {
  const P = PARTY.glow;
  const flick = o.still ? 1 : 1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 17) * 0.02;
  const r = (o.glow ?? 150) * flick;
  const d = clamp(o.dark, 0, 1);
  ctx.save();
  // sıcak hale
  ctx.globalCompositeOperation = 'multiply';
  const warm = ctx.createRadialGradient(P.x, P.y, 10, P.x, P.y, r * 1.2);
  warm.addColorStop(0, 'rgba(255,214,150,1)');
  warm.addColorStop(1, 'rgba(255,170,110,1)');
  ctx.globalAlpha = d * 0.6;
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  const g = ctx.createRadialGradient(P.x, P.y, r * 0.2, P.x, P.y, r);
  g.addColorStop(0, `rgba(5,2,8,0)`);
  g.addColorStop(0.45, `rgba(5,2,8,${0.5 * d})`);
  g.addColorStop(1, `rgba(5,2,8,${0.9 * d})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Beste aşağıdan aydınlanır: başının üstü karanlık, çenesinin altı turuncu
  if (o.besteLight && d > 0) {
    const b = o.besteLight;
    const top = b.y - 290 * b.scale, chin = b.y - 150 * b.scale;
    const cx = b.x, cy = top - 30 * b.scale;
    const rad = chin - cy;
    const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    lg.addColorStop(0, `rgba(5,2,8,${0.85 * d})`);
    lg.addColorStop(0.5, `rgba(5,2,8,${0.55 * d})`);
    lg.addColorStop(1, 'rgba(5,2,8,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const up = ctx.createRadialGradient(cx, chin + 10, 4, cx, chin + 10, 80 * b.scale);
    up.addColorStop(0, `rgba(120,60,10,${0.4 * d})`);
    up.addColorStop(1, 'rgba(120,60,10,0)');
    ctx.fillStyle = up;
    ctx.fillRect(cx - 80 * b.scale, chin + 10 - 80 * b.scale, 160 * b.scale, 160 * b.scale);
    ctx.restore();
  }
}

function countdown(ctx, t, c) {
  const age = t - c.t0;
  if (age < 0 || age > 1.6) return;
  const sc = clamp(easeOutBack(clamp(age / 0.3, 0, 1)), 0, 1.4) * (1 + Math.max(0, age - 1.0) * 0.4);
  const a = clamp(1.6 - age, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2 + 140, 120);
  ctx.scale(sc, sc);
  ctx.rotate(-0.08);
  ctx.font = `800 ${c.n === 'ÜFLE!' ? 66 : 96}px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = OUT;
  ctx.strokeText(String(c.n), 0, 0);
  ctx.fillStyle = c.n === 'ÜFLE!' ? '#ff6fa8' : '#ffe14d';
  ctx.fillText(String(c.n), 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ konfeti
export function confetti(ctx, t, t0) {
  const age = t - t0;
  if (age < 0 || age > 3) return;
  const cols = ['#ff6fa8', '#ffe14d', '#4aa8ff', '#5ed35e', '#ffffff', '#ff9f3a'];
  for (let i = 0; i < 70; i++) {
    const vx = (hash(i) - 0.5) * 520;
    const vy = -260 - hash(i + 9) * 260;
    const x = 320 + vx * age;
    const y = 300 + vy * age + 380 * age * age;
    if (y > H + 10) continue;
    ctx.save();
    ctx.globalAlpha = clamp(3 - age, 0, 1);
    ctx.translate(x, y);
    ctx.rotate(age * (4 + hash(i + 3) * 8));
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ pasta yakın planı
/**
 * o: drawCake seçenekleri + { match: {p, fire}, dark, icing (plaket yazısı), still }
 */
export function cakeClose(ctx, t, o = {}) {
  const ft = o.still ? (o.ft ?? t) : t;
  // duvar
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, '#5a3a4a');
  g.addColorStop(1, '#8a5a68');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 20; y < 300; y += 40)
    for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
    }
  // arkada bulanık bir flama
  bunting(ctx, ft, -20, 10, 660, 6, 34, 9, o.still);
  // masa örtüsü
  ctx.fillStyle = '#ff8fb8';
  ctx.fillRect(0, 330, W, 150);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let y = 346; y < H; y += 26)
    for (let x = (y / 26) % 2 ? 14 : 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
    }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.lineTo(W, 330);
  ctx.stroke();
  // pasta
  drawCake(ctx, 320, 440, 2.05, t, o);
  // kibrit
  if (o.match) drawMatch(ctx, t, o.match);
  if (o.dark > 0) {
    const r = 260;
    const rg = ctx.createRadialGradient(320, 190, 30, 320, 190, r);
    rg.addColorStop(0, 'rgba(5,2,8,0)');
    rg.addColorStop(1, `rgba(5,2,8,${0.85 * o.dark})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMatch(ctx, t, m) {
  const slot = slotPos(EMPTY_SLOT);
  const tipX = 320 + slot.x * 2.05 + 30, tipY = 440 - 92 * 2.05 + slot.y * 2.05 - 96;
  const p = clamp(m.p, 0, 1);
  const x = tipX + (1 - p) * 260, y = tipY + (1 - p) * 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55);
  rr(ctx, 0, -5, 150, 10, 3);
  fill(ctx, '#e8c48a');
  stroke(ctx, 3);
  ellipse(ctx, -2, 0, 11, 9);
  fill(ctx, m.burnt ? '#2a1a14' : '#c8323c');
  stroke(ctx, 3);
  ctx.restore();
  if (m.fire) flame(ctx, x - 6, y - 4, 1.5, t, 7, false, 1);
}

// ------------------------------------------------------------------ yarışma kartı
/** Yıldız biçiminde dönerek gelen 'SORU 1' kartı. o.p 0..1 */
export function quizCard(ctx, t, o = {}) {
  const p = clamp(o.p ?? 1, 0, 1);
  if (p <= 0) return;
  const x = o.x ?? 170, y = o.y ?? 168;
  const k = o.s ?? 1;
  const sc = easeOutBack(p) * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((1 - p) * -Math.PI * 2.2 + Math.sin(t * 2) * 0.04);
  ctx.scale(sc, sc);
  // ışın
  ctx.save();
  ctx.rotate(t * 0.6);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -170);
    ctx.lineTo(18, -170);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(255,240,170,.28)' : 'rgba(255,111,168,.22)';
    ctx.fill();
  }
  ctx.restore();
  star(ctx, 0, 0, 122, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 7, OUT);
  star(ctx, 0, 0, 102, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff3a6';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 40px ${FONT_CARTOON}`;
  ctx.lineWidth = 9;
  ctx.strokeStyle = OUT;
  ctx.strokeText(o.text || 'SORU 1', 0, 8);
  ctx.fillStyle = '#ff4b8b';
  ctx.fillText(o.text || 'SORU 1', 0, 8);
  ctx.restore();
  // alt şerit
  if (p > 0.7 && o.banner) {
    const a = clamp((p - 0.7) / 0.3, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y + 128 * k);
    ctx.scale(k, k);
    ctx.rotate(-0.04);
    ctx.font = `800 19px ${FONT_CARTOON}`;
    const w = ctx.measureText(o.banner).width + 40;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 16, -14);
    ctx.lineTo(w / 2 + 16, -14);
    ctx.lineTo(w / 2 + 4, 0);
    ctx.lineTo(w / 2 + 16, 14);
    ctx.lineTo(-w / 2 - 16, 14);
    ctx.lineTo(-w / 2 - 4, 0);
    ctx.closePath();
    fill(ctx, '#4aa8ff');
    stroke(ctx, 3);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.banner, 0, 1);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ son kare
/** Neredeyse kapkara: iki beyaz göz parıltısı, pastanın silik dış çizgisi, mumlardan duman. */
export function nearBlack(ctx, t, o = {}) {
  ctx.fillStyle = '#030204';
  ctx.fillRect(0, 0, W, H);
  const P = PARTY;
  // pastanın dış çizgisi
  ctx.save();
  ctx.globalAlpha = 0.22 * (o.outline ?? 1);
  ctx.translate(P.cake.x, P.cake.y);
  const s = P.cake.s;
  ctx.strokeStyle = '#ffb27a';
  ctx.lineWidth = 2;
  ellipse(ctx, 0, -92 * s, 120 * s, 22 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-120 * s, -92 * s);
  ctx.lineTo(-120 * s, 0);
  ctx.ellipse(0, 0, 120 * s, 15 * s, 0, Math.PI, 0, true);
  ctx.lineTo(120 * s, -92 * s);
  ctx.stroke();
  ctx.restore();
  // duman
  if (o.smokeT != null) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < SLOTS; i++) {
      if (i === EMPTY_SLOT) continue;
      const p = slotPos(i);
      smoke(ctx, P.cake.x + p.x * s, P.cake.y - 92 * s + p.y * s - 26 * s, s, t - o.smokeT, t + i);
    }
    ctx.restore();
  }
  // göz parıltıları
  if (o.eyes) {
    const ex = o.eyes.x, ey = o.eyes.y, sc = o.eyes.scale;
    const blink = Math.floor(t * 0.5) % 7 === 6 ? 0.2 : 1;
    for (const side of [-1, 1]) {
      const gx = ex + side * 23 * sc + (o.eyes.lx || 0) * 5 * sc, gy = ey + (o.eyes.ly || 0) * 6 * sc;
      const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 12 * sc);
      hg.addColorStop(0, 'rgba(255,255,255,.25)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(gx - 12 * sc, gy - 12 * sc, 24 * sc, 24 * sc);
      ctx.fillStyle = 'rgba(255,255,255,.97)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 3.6 * sc, 3.6 * sc * blink, 0, 0, TAU);
      ctx.fill();
    }
  }
}

/** Sinir bozucu kırmızı an: hafif kırmızı çerçeve */
export function redEdge(ctx, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420);
  g.addColorStop(0, 'rgba(120,0,0,0)');
  g.addColorStop(1, `rgba(120,0,0,${0.55 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ ani korkutma kareleri
function scanlines(ctx, t, a = 0.25) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  for (let y = Math.floor(t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}
function redVignette(ctx, a = 0.6) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 110, W / 2, H / 2, 420);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(110,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * KORKUTMA 1: Beste'nin yüzü kameranın dibinde, alttan mum ışığıyla; boş siyah gözler, parti şapkası.
 * t saniye (0..~0.6): yüz bir an daha yaklaşır ve titrer.
 */
export function besteScare(ctx, t, o = {}) {
  const k = 3.3 + Math.min(t, 0.6) * 1.1;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 18;
  const jy = (hash(Math.floor(t * 40) + 5) - 0.5) * 12;
  ctx.fillStyle = '#0a0304';
  ctx.fillRect(0, 0, W, H);
  const s = { x: W / 2 + jx, y: 268 + 205 * k + jy, scale: k, expr: 'void', mouth: 0, look: { x: 0, y: 0.2 }, blink: 0, t: 0, wave: 0, tilt: 0.07 };
  drawBeste(ctx, s);
  besteHat(ctx, s);
  // alttan aydınlatma: alnı karanlık, çenesi turuncu
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(6,2,6,.92)');
  g.addColorStop(0.42, 'rgba(6,2,6,.45)');
  g.addColorStop(0.75, 'rgba(6,2,6,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const up = ctx.createRadialGradient(W / 2, H + 60, 20, W / 2, H + 60, 340);
  up.addColorStop(0, 'rgba(170,80,10,.55)');
  up.addColorStop(1, 'rgba(170,80,10,0)');
  ctx.fillStyle = up;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // önde, kadrajın altında üç büyük alev
  flame(ctx, 150, 500, 4.2, t * 2, 1, false, 0.9);
  flame(ctx, 330, 520, 5.2, t * 2, 4, false, 0.9);
  flame(ctx, 500, 500, 4.2, t * 2, 6, false, 0.9);
  redVignette(ctx, 0.55);
  scanlines(ctx, t);
}

/**
 * KORKUTMA 2 ("Ormanda."): karanlık Çamlık, ağaçta 14.05 oyması, ağaçların arasından eğilen gri adam.
 */
export function forestFlash(ctx, t, o = {}) {
  const jx = (hash(Math.floor(t * 30)) - 0.5) * 14;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#240306');
  g.addColorStop(1, '#070102');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) pine(ctx, 20 + i * 68 + (hash(i) - 0.5) * 30, 420 + hash(i + 4) * 20, 260 + hash(i + 9) * 120, '#160a0b');
  ctx.fillStyle = '#0c0405';
  ctx.fillRect(0, 410, W, 70);
  drawGreyMan(ctx, 400 + jx, H + 30, 470 + Math.min(t, 0.5) * 90, { headTilt: 0.42, reach: { x: 200, y: 300 }, alpha: o.alpha ?? 1 });
  // ön planda ağaç gövdesi ve oyma (14.05)
  rr(ctx, 14, -20, 196, H + 40, 12);
  fill(ctx, '#3a1d0e');
  stroke(ctx, 5, '#120604');
  ctx.strokeStyle = 'rgba(10,4,2,.6)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(30 + i * 30, -20);
    ctx.bezierCurveTo(26 + i * 32, 160, 36 + i * 28, 320, 28 + i * 30, H + 20);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(112, 220);
  ctx.rotate(-0.06);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 54px ${FONT_CARTOON}`;
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#120604';
  ctx.strokeText('14.05', 0, 0);
  ctx.fillStyle = '#e8b8a0';
  ctx.fillText('14.05', 0, 0);
  ctx.restore();
  redVignette(ctx, 0.7);
  scanlines(ctx, t, 0.3);
}

/**
 * KORKUTMA 3 (jenerikten sonra): yüzsüz gri baş kameranın dibinde, başında yamuk bir parti şapkası,
 * uzun parmaklarıyla oyuncunun isim kartını tutuyor.
 */
export function manScare(ctx, t, o = {}) {
  const k = 1 + Math.min(t, 0.6) * 0.3;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 16;
  const jy = (hash(Math.floor(t * 40) + 3) - 0.5) * 10;
  ctx.fillStyle = '#040405';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + jx, 236 + jy);
  ctx.scale(k, k);
  ctx.rotate(0.2);
  // boyun ve omuzlar
  ctx.fillStyle = MAN_MID;
  ctx.fillRect(-46, 160, 92, 160);
  ellipse(ctx, 0, 330, 260, 90);
  ctx.fill();
  // baş: yüzsüz, alttan soluk ışık
  const hg = ctx.createRadialGradient(0, 120, 20, 0, 0, 300);
  hg.addColorStop(0, '#a4a4ab');
  hg.addColorStop(0.6, '#77777f');
  hg.addColorStop(1, '#3d3d44');
  ellipse(ctx, 0, 0, 168, 228);
  ctx.fillStyle = hg;
  ctx.fill();
  // göz olması gereken yerde iki hafif çukur, ağız yerinde düz bir gölge
  ctx.fillStyle = 'rgba(30,30,36,.13)';
  ellipse(ctx, -54, -14, 30, 16);
  ctx.fill();
  ellipse(ctx, 54, -14, 30, 16);
  ctx.fill();
  // yamuk parti şapkası
  ctx.save();
  ctx.translate(70, -200);
  ctx.rotate(0.55);
  hatShape(ctx, 110, 140, ['#ff6fa8', '#ffe14d', '#ffffff'], 0);
  ctx.restore();
  ctx.restore();
  // isim kartı ve uzun parmaklar
  const cy = 330 + jy;
  nameCard(ctx, W / 2 + jx * 0.5, cy, 2.3, { label: o.name || 'ARKADAŞIM' });
  for (const dir of [-1, 1]) {
    const hx = W / 2 + jx * 0.5 + dir * 96;
    ellipse(ctx, hx, cy + 18, 22, 30, dir * 0.3);
    ctx.fillStyle = MAN_TOP;
    ctx.fill();
    manFingers(ctx, hx - dir * 4, cy + 4, -dir, 58, 9);
  }
  redVignette(ctx, 0.5);
  scanlines(ctx, t);
}

export { shade };

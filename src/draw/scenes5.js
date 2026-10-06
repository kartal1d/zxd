// 5. kaset sahneleri: soğuk ayna. Yatak odasındaki şifonyer aynası, söyleşi stüdyosu (iki sandalye, yıldızlı fon,
// mikrofon, isim kartı), oturan Beste, ayna camı (yansıma, buğu, ayna yazısı, çatlaklar), not defteri, kurgu makası,
// gece şifonyer yakın planı.
import { rr, fill, stroke, star, mixHex, bgBedroom, realGirl, OUT, FONT_CARTOON, FONT_OSD, FONT_HAND } from './scenes.js';
import { drawBeste } from './characters.js';
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const SKIN = '#ffd9b8';
const lerp = (a, b, t) => a + (b - a) * t;

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
/** Kalın, dış çizgili uzuv (characters.js ile aynı görünüm). */
function limb(ctx, pts, w, color) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 8;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
const offs = {};
/** Yeniden kullanılan ekran boyu ara tuval. */
function off(name) {
  let o = offs[name];
  if (!o) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    o = offs[name] = { c, x: c.getContext('2d') };
  }
  return o;
}

// ------------------------------------------------------------------ kamera
/** Sahneyi (cx, cy) noktası ekran ortasına gelecek şekilde z kat yakınlaştırarak çizer. */
export function camera(ctx, cam, draw) {
  ctx.save();
  if (cam && cam.z !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
  }
  draw();
  ctx.restore();
}

// ------------------------------------------------------------------ jenerik rozeti
/** Jenerikte dönen, ayna biçimli "YER DEĞİŞTİRMECE!" rozeti. */
export function swapBadge(ctx, t) {
  ctx.save();
  ctx.translate(548, 84);
  ctx.rotate(0.16 + Math.sin(t * 2) * 0.05);
  const s = 1 + Math.sin(t * 4) * 0.03;
  ctx.scale(s, s);
  ellipse(ctx, 0, 0, 70, 54);
  fill(ctx, '#e9c46a');
  stroke(ctx, 4);
  ellipse(ctx, 0, 0, 58, 43);
  const g = ctx.createLinearGradient(-50, -40, 50, 40);
  g.addColorStop(0, '#d9f1ff');
  g.addColorStop(1, '#7fb6e6');
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-34, -22);
  ctx.lineTo(-18, -34);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 17px ${FONT_CARTOON}`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.fillStyle = '#ffffff';
  ctx.strokeText('YER', 0, -12);
  ctx.fillText('YER', 0, -12);
  ctx.font = `800 13px ${FONT_CARTOON}`;
  ctx.strokeText('DEĞİŞTİRMECE!', 0, 8);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('DEĞİŞTİRMECE!', 0, 8);
  // iki yöne ok
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 26);
  ctx.lineTo(20, 26);
  ctx.moveTo(-14, 21);
  ctx.lineTo(-20, 26);
  ctx.lineTo(-14, 31);
  ctx.moveTo(14, 21);
  ctx.lineTo(20, 26);
  ctx.lineTo(14, 31);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ oturan Beste
/** Pozdaki elin (yerel koordinatta) yeri: 'R' sağ el (el sallarken havada), 'L' sol el. */
export function handPos(s, side = 'R') {
  const t = s.t || 0;
  const breathe = s.expr === 'frozen' || s.expr === 'void' ? 0 : Math.sin(t * 2.2) * 1.5;
  const shoulderY = -140 + breathe;
  if (side === 'L') return { x: -58, y: shoulderY + 66 };
  if ((s.wave || 0) > 0.01) {
    const ex = 62, ey = shoulderY - 26;
    const a = 0.25 + Math.sin(t * 9) * 0.5;
    return { x: ex + Math.sin(a) * 36, y: ey - Math.cos(a) * 36 };
  }
  return { x: 58, y: shoulderY + 66 };
}

/** El mikrofonu (yerel koordinatta): baş (hx, hy) yarıçap r, sap ele (gx, gy) iner. */
function mic(ctx, gx, gy, hx, hy, r) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = r * 0.95 + 6;
  ctx.beginPath();
  ctx.moveTo(gx, gy + 8);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#3a3d48';
  ctx.lineWidth = r * 0.95;
  ctx.stroke();
  // kırmızı bilezik
  const bx = lerp(hx, gx, 0.32), by = lerp(hy, gy, 0.32);
  circle(ctx, bx, by, r * 0.62);
  fill(ctx, '#e8323c');
  stroke(ctx, 2.5);
  // ızgaralı top
  circle(ctx, hx, hy, r);
  const g = ctx.createRadialGradient(hx - r * 0.35, hy - r * 0.4, r * 0.1, hx, hy, r);
  g.addColorStop(0, '#f4f6fa');
  g.addColorStop(1, '#8b93a3');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,40,60,.45)';
  ctx.lineWidth = 1.2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + i * r * 0.3, hy - r);
    ctx.lineTo(hx + i * r * 0.3, hy + r);
    ctx.moveTo(hx - r, hy + i * r * 0.3);
    ctx.lineTo(hx + r, hy + i * r * 0.3);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, hx, hy, r);
  stroke(ctx, 3);
  // kavrayan el
  circle(ctx, gx, gy, 10);
  fill(ctx, SKIN);
  stroke(ctx, 3.5);
}

/** Küçük not defteri (yerel koordinatta, sol elde). */
function smallNotebook(ctx, x, y) {
  ctx.save();
  ctx.translate(x - 4, y - 10);
  ctx.rotate(-0.25);
  rr(ctx, -16, -20, 32, 40, 3);
  fill(ctx, '#3f7fd0');
  stroke(ctx, 3);
  star(ctx, 0, 0, 8, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 1.5);
  ctx.fillStyle = '#f7f1dc';
  ctx.fillRect(14, -18, 3, 36);
  ctx.restore();
  circle(ctx, x, y, 10);
  fill(ctx, SKIN);
  stroke(ctx, 3.5);
}

/**
 * Sandalyede oturan Beste. s = drawBeste durumu (x, scale, expr, wave, look, mouth, blink, tilt, t...).
 * o.seatY: oturağın üst yüzeyi (ekran y). o.mic: mikrofon yönü 0 (karşıdaki konuğa) .. 1 (kameraya), null ise yok.
 * o.notebook: sol elde not defteri. o.legs === false ise bacaklar çizilmez.
 */
export function seated(ctx, s, o = {}) {
  const sc = s.scale || 1;
  const oy = o.seatY + 42 * sc;
  ctx.save();
  ctx.translate(s.x, oy);
  ctx.scale(sc, sc);
  // ayakta duran bacaklar oturağın altında kalsın
  ctx.save();
  ctx.beginPath();
  ctx.rect(-160, -420, 320, 384);
  ctx.clip();
  drawBeste(ctx, { ...s, x: 0, y: 0, scale: 1, flip: false });
  ctx.restore();
  if (o.legs !== false) {
    // oturağın kenarından sarkan bacaklar
    for (const side of [-1, 1]) {
      const sw = Math.sin((s.t || 0) * 1.7 + side) * (o.swing || 0) * 4;
      limb(ctx, [[side * 15, -38], [side * 17 + sw, 8]], 13, SKIN);
      ellipse(ctx, side * 21 + sw, 13, 16, 8.5);
      ctx.fillStyle = '#d42c2c';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUT;
      ctx.stroke();
    }
  }
  if (o.notebook) {
    const h = handPos(s, 'L');
    smallNotebook(ctx, h.x, h.y);
  }
  if (o.mic != null) {
    const h = handPos(s, 'R');
    const a = clamp(o.mic, 0, 1);
    let hx, hy;
    if ((s.wave || 0) > 0.01) {
      hx = h.x + 10;
      hy = h.y - 30;
    } else {
      hx = lerp(h.x + 22, 38, a);
      hy = lerp(h.y - 24, -104, a);
    }
    mic(ctx, h.x, h.y, hx, hy, lerp(10, 18, a));
  }
  ctx.restore();
}

/** Ayna içindeki yansıma için: el yazısı yazan bilek ve parmak (dünya koordinatında). */
export function writingHand(ctx, tip, s = 1, t = 0) {
  const ex = tip.x + 16 * s, ey = tip.y + 64 * s;
  limb(ctx, [[ex, ey], [tip.x + 3 * s, tip.y + 12 * s]], 11 * s, SKIN);
  ctx.save();
  ctx.translate(tip.x + 3 * s, tip.y + 12 * s);
  ctx.rotate(-0.15 + Math.sin(t * 9) * 0.04);
  ellipse(ctx, 0, 0, 9 * s, 8 * s);
  fill(ctx, SKIN);
  ctx.lineWidth = 3 * s;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // uzanan işaret parmağı
  rr(ctx, -3 * s, -18 * s, 6 * s, 16 * s, 3 * s);
  fill(ctx, SKIN);
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ söyleşi stüdyosu
export const SHOW = {
  hostX: 150,
  guestX: 480,
  seatY: 380,
  scale: 0.875,
  mirror: { cx: 322, cy: 287, rx: 55, ry: 99 },
  ref: { x: 322, seatY: 398, scale: 0.6 },
};

/** Söyleşi dekoru: perde, ışıklı kemer, kocaman yıldız, tabela, parlak sahne zemini. o.host: tabeladaki ad. */
export function talkShow(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, '#1d2766');
  g.addColorStop(1, '#2e2163');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, W + 80, 450);
  // perde kıvrımları
  for (let x = -40; x < W + 40; x += 36) {
    const lg = ctx.createLinearGradient(x, 0, x + 36, 0);
    lg.addColorStop(0, 'rgba(0,0,0,.22)');
    lg.addColorStop(0.5, 'rgba(255,255,255,.06)');
    lg.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = lg;
    ctx.fillRect(x, -40, 36, 450);
  }
  // spot ışık konileri
  for (const [x0, x1] of [[40, 150], [600, 480]]) {
    const cg = ctx.createLinearGradient(x0, 0, x1, 400);
    cg.addColorStop(0, 'rgba(255,250,210,.28)');
    cg.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(x0 - 16, -10);
    ctx.lineTo(x0 + 16, -10);
    ctx.lineTo(x1 + 90, 410);
    ctx.lineTo(x1 - 90, 410);
    ctx.closePath();
    ctx.fill();
  }
  // ışıklı kemer
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const x = 320 + Math.cos(a) * 270, y = 360 + Math.sin(a) * 270;
    const on = (i + Math.floor(t * 6)) % 3 !== 0;
    if (on) {
      const hg = ctx.createRadialGradient(x, y, 1, x, y, 14);
      hg.addColorStop(0, 'rgba(255,230,140,.55)');
      hg.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(x - 14, y - 14, 28, 28);
    }
    circle(ctx, x, y, 5);
    fill(ctx, on ? '#fff3a6' : '#7d6c3a');
    stroke(ctx, 2);
  }
  // kocaman yıldız
  ctx.save();
  ctx.translate(322, 118);
  ctx.rotate(Math.sin(t * 0.8) * 0.06);
  const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
  sg.addColorStop(0, 'rgba(255,220,90,.35)');
  sg.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-110, -110, 220, 220);
  star(ctx, 0, 0, 62, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 5, '#a0560f');
  star(ctx, -6, -6, 30, 0);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fill();
  ctx.restore();
  for (const [x, y, r] of [[120, 120, 14], [520, 112, 16], [70, 220, 10], [580, 210, 11], [200, 60, 9], [450, 52, 10]]) {
    star(ctx, x, y, r, t * 0.5 + x);
    fill(ctx, '#fff3a6');
    stroke(ctx, 2.5);
  }
  // tabela
  const label = `${o.host || 'BESTE'} İLE SÖYLEŞİ`;
  ctx.font = `800 26px ${FONT_CARTOON}`;
  const tw = Math.min(ctx.measureText(label).width, 300);
  ctx.save();
  ctx.translate(322, 30);
  rr(ctx, -tw / 2 - 26, -20, tw + 52, 40, 12);
  fill(ctx, '#e8323c');
  stroke(ctx, 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = OUT;
  ctx.strokeText(label, 0, 2, 300);
  ctx.fillStyle = '#fffbe6';
  ctx.fillText(label, 0, 2, 300);
  ctx.restore();
  // sahne zemini
  const fg = ctx.createLinearGradient(0, 398, 0, H + 40);
  fg.addColorStop(0, '#3b2c74');
  fg.addColorStop(1, '#170f33');
  ctx.fillStyle = fg;
  ctx.fillRect(-40, 398, W + 80, H);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 410; y < H + 40; y += 18) ctx.fillRect(-40, y, W + 80, 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-40, 396, W + 80, 5);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.strokeRect(-42, 396, W + 84, 5);
}

/** Küçük çocuk sandalyesi (önden). */
export function chair(ctx, x, seatY, s, color) {
  ctx.save();
  ctx.translate(x, seatY);
  ctx.scale(s, s);
  // arkalık
  rr(ctx, -44, -112, 88, 108, 18);
  fill(ctx, color);
  stroke(ctx, 4);
  rr(ctx, -30, -98, 60, 44, 12);
  fill(ctx, mixHex(color, '#ffffff', 0.35));
  stroke(ctx, 3);
  star(ctx, 0, -76, 12, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2.5);
  // ayaklar
  for (const lx of [-40, 34]) {
    rr(ctx, lx, 4, 7, 62, 3);
    fill(ctx, mixHex(color, '#000000', 0.3));
    stroke(ctx, 3);
  }
  // oturak
  rr(ctx, -52, -8, 104, 18, 8);
  fill(ctx, mixHex(color, '#000000', 0.12));
  stroke(ctx, 4);
  ctx.restore();
}

/** Oturağın üstünde duran çadır isim kartı. */
export function nameCard(ctx, x, y, text, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.font = `800 22px ${FONT_CARTOON}`;
  const w = Math.max(64, ctx.measureText(text).width + 22);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w / 2 - 5, -32);
  ctx.lineTo(-w / 2 + 5, -32);
  ctx.closePath();
  fill(ctx, '#fffdf2');
  stroke(ctx, 3);
  ctx.fillStyle = '#e8323c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -15);
  ctx.restore();
}

/** Ayaklı ayna çerçevesi (söyleşi dekoru). */
export function standFrame(ctx, m, t) {
  const { cx, cy, rx, ry } = m;
  // ayaklar
  for (const side of [-1, 1]) {
    rr(ctx, cx + side * (rx + 4) - 5, cy - 10, 10, ry + 64, 4);
    fill(ctx, '#c79a5a');
    stroke(ctx, 3);
    ellipse(ctx, cx + side * (rx + 4), cy + ry + 56, 18, 6);
    fill(ctx, '#8a6232');
    stroke(ctx, 3);
  }
  circle(ctx, cx - rx - 4, cy, 7);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2.5);
  circle(ctx, cx + rx + 4, cy, 7);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2.5);
}

/** Oval aynanın oymalı çerçevesi. */
export function ovalFrame(ctx, m, o = {}) {
  const { cx, cy, rx, ry } = m;
  const k = o.k || 1;
  ellipse(ctx, cx, cy, rx + 10 * k, ry + 10 * k);
  ctx.lineWidth = 14 * k;
  ctx.strokeStyle = o.color || '#e2b866';
  ctx.stroke();
  ellipse(ctx, cx, cy, rx + 17 * k, ry + 17 * k);
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ellipse(ctx, cx, cy, rx + 2 * k, ry + 2 * k);
  ctx.stroke();
  // tepedeki oyma süs
  ctx.save();
  ctx.translate(cx, cy - ry - 14 * k);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.moveTo(-26, 6);
  ctx.quadraticCurveTo(-14, -16, 0, -6);
  ctx.quadraticCurveTo(14, -16, 26, 6);
  ctx.closePath();
  fill(ctx, o.color || '#e2b866');
  stroke(ctx, 3);
  star(ctx, 0, -10, 9, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2.5);
  ctx.restore();
}

// ------------------------------------------------------------------ ayna camı
/** Ayna yazısının harf aralıkları (yansıma kendi tarafından yazar: bizden bakınca sağdan sola, harfler ters). */
function writingLayout(ctx, w) {
  ctx.font = `700 ${w.size}px ${FONT_HAND}`;
  const chars = [...w.text];
  const pre = [0];
  for (let i = 1; i <= chars.length; i++) pre.push(ctx.measureText(chars.slice(0, i).join('')).width);
  return { chars, pre, total: pre[chars.length] };
}

/** Yazan parmağın ucu (dünya koordinatı): w = { text, shown, x, y, size, mirrored } */
export function writingTip(ctx, w, t = 0) {
  const L = writingLayout(ctx, w);
  const n = L.chars.length;
  const sh = clamp(w.shown, 0, n);
  const k = Math.min(Math.floor(sh), n - 1);
  const p = sh >= n ? 1 : sh - k;
  const lx = L.pre[k] + (L.pre[k + 1] - L.pre[k]) * p;
  const x = w.mirrored === false ? w.x - L.total / 2 + lx : w.x + L.total / 2 - lx;
  const y = w.y + Math.sin(p * Math.PI * 3 + t * 2) * w.size * 0.22 - w.size * 0.05;
  return { x, y };
}

/** Bir yazıyı (kısmen) çizer: tamamlanmış harfler + yazılmakta olan harfin bir kısmı. */
function drawWriting(ctx, w, color) {
  const L = writingLayout(ctx, w);
  const n = L.chars.length;
  const sh = clamp(w.shown, 0, n);
  const full = Math.floor(sh);
  const part = sh - full;
  ctx.save();
  ctx.translate(w.x, w.y);
  if (w.mirrored !== false) ctx.scale(-1, 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const x0 = -L.total / 2;
  if (full > 0) ctx.fillText(L.chars.slice(0, full).join(''), x0, 0);
  if (part > 0 && full < n) {
    const lx = x0 + L.pre[full];
    const lw = L.pre[full + 1] - L.pre[full];
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx - 2, -w.size, lw * part + 2, w.size * 2);
    ctx.clip();
    ctx.fillText(L.chars[full], lx, 0);
    ctx.restore();
  }
  ctx.restore();
}

function crackRays(cx, cy, rx, ry, stage, seed) {
  const px = cx + rx * 0.3, py = cy - ry * 0.28;
  const rays = [];
  const count = [0, 5, 9, 14][Math.min(3, stage)];
  for (let i = 0; i < count; i++) {
    const a = hash(seed + i * 3.1) * Math.PI * 2;
    const len = (0.45 + hash(seed + i * 7.7) * 0.9) * Math.max(rx, ry) * (i < 5 ? 0.8 : 1.1);
    const pts = [[px, py]];
    let x = px, y = py;
    const segs = 4 + Math.floor(hash(seed + i) * 3);
    for (let k = 1; k <= segs; k++) {
      const aa = a + (hash(seed + i * 13 + k) - 0.5) * 0.7;
      x += Math.cos(aa) * (len / segs);
      y += Math.sin(aa) * (len / segs);
      pts.push([x, y]);
    }
    rays.push(pts);
  }
  return { px, py, rays };
}

/**
 * Aynanın camı. o = { cx, cy, rx, ry, bg: 'stage'|'room'|'night', figure(cc) (yansıma; ara tuvalde çizilip mavimsi
 * boyanır), alpha, realGirl (gizli kare), fog 0..1, fogX, fogY, fogRX, fogRY, writings: [{text, shown, x, y, size,
 * mirrored}], cracks 0..3, crackSeed, palm {x,y,s} (cama dayanmış avuç) }
 */
export function mirrorGlass(ctx, t, o) {
  const { cx, cy, rx, ry } = o;
  const T = ctx.getTransform();
  ctx.save();
  ellipse(ctx, cx, cy, rx, ry);
  ctx.save();
  ctx.clip();
  // camın içindeki (yansıyan) uzay
  const bg = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  if (o.bg === 'night') {
    bg.addColorStop(0, '#2b3a5c');
    bg.addColorStop(1, '#0e1426');
  } else if (o.bg === 'room') {
    bg.addColorStop(0, '#c9e6f6');
    bg.addColorStop(1, '#7ea4c4');
  } else {
    bg.addColorStop(0, '#7f95c9');
    bg.addColorStop(1, '#2c3566');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  if (o.bg === 'night') {
    // ters dönmüş pencerenin soluk ışığı
    ctx.fillStyle = 'rgba(190,210,255,.13)';
    ctx.fillRect(cx + rx * 0.35, cy - ry * 0.75, rx * 0.5, ry * 0.6);
    ctx.fillStyle = 'rgba(10,14,30,.5)';
    ctx.fillRect(cx + rx * 0.58, cy - ry * 0.75, rx * 0.04, ry * 0.6);
    ctx.fillRect(cx + rx * 0.35, cy - ry * 0.47, rx * 0.5, ry * 0.03);
  } else if (o.bg === 'room') {
    // yansıyan duvar kâğıdı
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let y = cy - ry; y < cy + ry; y += 22)
      for (let x = cx - rx + ((y / 22) % 2 ? 11 : 0); x < cx + rx; x += 22) {
        circle(ctx, x, y, 2.5);
        ctx.fill();
      }
  }
  if (o.realGirl) {
    // GİZLİ: yansımanın yerinde gerçek kız
    ctx.save();
    ctx.translate(cx, cy);
    const k = (ry * 2.2) / H;
    ctx.scale(k, k);
    ctx.translate(-W / 2, -230);
    realGirl(ctx, t, { alpha: 1 });
    ctx.restore();
  } else if (o.figure) {
    const A = off('ref');
    const c2 = A.x;
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, W, H);
    c2.setTransform(T);
    o.figure(c2);
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.globalCompositeOperation = 'source-atop';
    c2.fillStyle = o.tint || 'rgba(90,150,255,.38)';
    c2.fillRect(0, 0, W, H);
    c2.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = o.alpha ?? 0.7;
    ctx.drawImage(A.c, 0, 0);
    ctx.restore();
  }
  // avuç izi
  if (o.palm) {
    const { x, y, s } = o.palm;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(230,240,255,.35)';
    ellipse(ctx, 0, 0, 22, 26);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,222,200,.55)';
    ellipse(ctx, 0, 6, 13, 14);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      rr(ctx, -12 + i * 7, -22 + Math.abs(i - 1.5) * 3, 5.5, 18, 3);
      ctx.fill();
    }
    rr(ctx, 12, -2, 14, 5.5, 3);
    ctx.fill();
    ctx.restore();
  }
  // buğu ve buğuya parmakla yazılmış yazılar
  if ((o.fog || 0) > 0.01) {
    const F = off('fog');
    const f = F.x;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, W, H);
    f.setTransform(T);
    const fx = o.fogX ?? cx, fy = o.fogY ?? cy;
    const frx = (o.fogRX ?? rx * 0.8) * (0.4 + 0.6 * o.fog), fry = (o.fogRY ?? ry * 0.3) * (0.4 + 0.6 * o.fog);
    f.save();
    f.translate(fx, fy);
    f.scale(frx, fry);
    const fg = f.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    fg.addColorStop(0, 'rgba(232,240,250,.9)');
    fg.addColorStop(0.65, 'rgba(225,235,248,.75)');
    fg.addColorStop(1, 'rgba(225,235,248,0)');
    f.fillStyle = fg;
    f.beginPath();
    f.arc(0, 0, 1, 0, Math.PI * 2);
    f.fill();
    f.restore();
    // damlacıklar
    f.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) {
      const a = hash(i * 3.3) * Math.PI * 2, r = Math.sqrt(hash(i * 7.1));
      circle(f, fx + Math.cos(a) * frx * r * 0.85, fy + Math.sin(a) * fry * r * 0.85, 0.8 + hash(i) * 1.4);
      f.fill();
    }
    // yazılar buğuyu siler
    f.globalCompositeOperation = 'destination-out';
    for (const w of o.writings || []) if (w.shown > 0) drawWriting(f, w, 'rgba(0,0,0,1)');
    f.globalCompositeOperation = 'source-over';
    // silinen çizgilerden süzülen damlalar
    for (const w of o.writings || []) {
      if (w.shown < 1) continue;
      const L = writingLayout(f, w);
      for (let i = 0; i < Math.min(Math.floor(w.shown), L.chars.length); i++) {
        if (hash(i * 5.7 + w.text.length) < 0.45) continue;
        const lx = w.mirrored === false ? w.x - L.total / 2 + (L.pre[i] + L.pre[i + 1]) / 2 : w.x + L.total / 2 - (L.pre[i] + L.pre[i + 1]) / 2;
        f.fillStyle = 'rgba(30,45,80,.45)';
        f.fillRect(lx - 1, w.y + w.size * 0.35, 2, w.size * (0.3 + hash(i) * 0.5));
      }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(o.fog, 0, 1);
    ctx.drawImage(F.c, 0, 0);
    ctx.restore();
    // silinmiş çizgilerin koyu izi (okunabilsin)
    ctx.save();
    ctx.globalAlpha = 0.55 * clamp(o.fog, 0, 1);
    for (const w of o.writings || []) if (w.shown > 0) drawWriting(ctx, w, '#16234a');
    ctx.restore();
  }
  // cam parıltısı
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = Math.max(3, rx * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.62, cy - ry * 0.25);
  ctx.lineTo(cx - rx * 0.18, cy - ry * 0.72);
  ctx.moveTo(cx - rx * 0.66, cy - ry * 0.02);
  ctx.lineTo(cx - rx * 0.05, cy - ry * 0.78);
  ctx.stroke();
  // çatlaklar
  if ((o.cracks || 0) > 0) {
    const cr = crackRays(cx, cy, rx, ry, o.cracks, o.crackSeed || 3);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [lw, col] of [[Math.max(2.2, rx * 0.035), 'rgba(10,14,30,.7)'], [Math.max(1, rx * 0.014), 'rgba(255,255,255,.85)']]) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      for (const pts of cr.rays) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
      if (o.cracks >= 2) {
        ctx.beginPath();
        ctx.ellipse(cr.px, cr.py, rx * 0.16, rx * 0.13, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (o.cracks >= 3) {
        ctx.beginPath();
        ctx.ellipse(cr.px, cr.py, rx * 0.36, rx * 0.3, -0.2, 0.3, 5.6);
        ctx.stroke();
      }
    }
    if (o.cracks >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.moveTo(cr.px, cr.py);
      for (const pts of cr.rays.slice(0, 3)) ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ yatak odası, dolabın yerinde şifonyer aynası
export const ROOM_MIRROR = { cx: 545, cy: 168, rx: 52, ry: 70 };

/** Şifonyer (çekmeceli küçük dolap) */
function dresser(ctx, x, y, w, h, night = 0) {
  const body = mixHex('#e4a96b', '#5c3d28', night);
  rr(ctx, x, y, w, h, 6);
  fill(ctx, body);
  stroke(ctx, 4);
  rr(ctx, x - 8, y - 10, w + 16, 14, 5);
  fill(ctx, mixHex('#c98b4e', '#4a3020', night));
  stroke(ctx, 4);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const dy = y + 10 + i * ((h - 16) / n);
    rr(ctx, x + 10, dy, w - 20, (h - 16) / n - 8, 4);
    fill(ctx, mixHex('#efbb80', '#6a4630', night));
    stroke(ctx, 3);
    circle(ctx, x + w / 2, dy + ((h - 16) / n - 8) / 2, 5);
    fill(ctx, '#ffd23f');
    stroke(ctx, 2);
  }
}

/**
 * Yatak odası: dolabın yerinde şifonyer ve oval ayna. o.night, o.window, o.mirror (mirrorGlass seçenekleri, cx/cy/rx/ry hariç)
 */
export function bedroomMirror(ctx, t, o = {}) {
  const night = o.night || 0;
  bgBedroom(ctx, t, { night, window: o.window, calendar: o.calendar });
  // dolabı duvar kâğıdıyla örtüp şifonyer koy
  ctx.save();
  ctx.beginPath();
  ctx.rect(458, 88, 172, 246);
  ctx.clip();
  ctx.fillStyle = mixHex('#a9dcf7', '#3c4a6a', night);
  ctx.fillRect(458, 88, 172, 246);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let y = 20; y < 340; y += 40)
    for (let x = 20; x < W; x += 40) {
      circle(ctx, x, y, 5);
      ctx.fill();
    }
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.fillRect(458, 334, 172, 8);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(458, 334);
  ctx.lineTo(630, 334);
  ctx.moveTo(458, 342);
  ctx.lineTo(630, 342);
  ctx.stroke();
  const m = ROOM_MIRROR;
  // aynanın ayağı
  rr(ctx, m.cx - 10, m.cy + m.ry + 8, 20, 26, 3);
  fill(ctx, '#c79a5a');
  stroke(ctx, 3);
  dresser(ctx, 478, 262, 134, 82, night);
  mirrorGlass(ctx, t, { ...m, bg: 'room', ...(o.mirror || {}) });
  ovalFrame(ctx, m, { k: 0.6 });
  // şifonyerin üstünde saç fırçası ve yıldızlı toka
  ctx.save();
  ctx.translate(500, 250);
  ctx.rotate(-0.2);
  rr(ctx, -4, -3, 26, 6, 3);
  fill(ctx, '#ff8fb8');
  stroke(ctx, 2.5);
  ellipse(ctx, -10, 0, 10, 7);
  fill(ctx, '#ff8fb8');
  stroke(ctx, 2.5);
  ctx.restore();
  star(ctx, 592, 246, 8, 0.2);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2);
}

// ------------------------------------------------------------------ gece, şifonyer yakın planı (gösteri sonrası)
export const NIGHT_MIRROR = { cx: 380, cy: 206, rx: 124, ry: 160 };

export function dresserCloseup(ctx, t, o = {}) {
  const wall = ctx.createLinearGradient(0, 0, 0, 400);
  wall.addColorStop(0, '#34405f');
  wall.addColorStop(1, '#1d2439');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  for (let y = 24; y < 400; y += 48)
    for (let x = (y / 48) % 2 > 1 ? 24 : 0; x < W; x += 48) {
      circle(ctx, x, y, 6);
      ctx.fill();
    }
  // soldaki pencere ve ay ışığı
  rr(ctx, -20, 40, 100, 200, 6);
  fill(ctx, '#ffffff');
  stroke(ctx, 4);
  const sky = ctx.createLinearGradient(0, 50, 0, 230);
  sky.addColorStop(0, '#070b20');
  sky.addColorStop(1, '#1b2340');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, 50, 80, 180);
  circle(ctx, 40, 92, 13);
  fill(ctx, '#f0f0d0');
  ctx.fillStyle = OUT;
  ctx.fillRect(-10, 136, 80, 4);
  ctx.beginPath();
  ctx.moveTo(86, 32);
  ctx.quadraticCurveTo(116, 120, 92, 250);
  ctx.lineTo(74, 250);
  ctx.lineTo(74, 32);
  ctx.closePath();
  fill(ctx, '#a35f7e');
  stroke(ctx, 3);
  const beam = ctx.createLinearGradient(60, 120, 380, 420);
  beam.addColorStop(0, 'rgba(200,215,255,.16)');
  beam.addColorStop(1, 'rgba(200,215,255,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(70, 60);
  ctx.lineTo(70, 240);
  ctx.lineTo(420, 480);
  ctx.lineTo(560, 480);
  ctx.closePath();
  ctx.fill();
  const m = NIGHT_MIRROR;
  // aynanın taşıyıcısı
  rr(ctx, m.cx - 14, m.cy + m.ry + 6, 28, 30, 4);
  fill(ctx, '#6b4a2a');
  stroke(ctx, 3);
  mirrorGlass(ctx, t, { ...m, bg: 'night', ...(o.mirror || {}) });
  ovalFrame(ctx, m, { k: 1.2, color: '#b08a4c' });
  // şifonyer
  rr(ctx, 150, 388, 470, 120, 6);
  fill(ctx, '#5c3d28');
  stroke(ctx, 4);
  rr(ctx, 136, 370, 498, 22, 6);
  fill(ctx, '#4a3020');
  stroke(ctx, 4);
  for (const x of [180, 400]) {
    rr(ctx, x, 404, 200, 64, 5);
    fill(ctx, '#6a4630');
    stroke(ctx, 3);
    circle(ctx, x + 100, 436, 7);
    fill(ctx, '#c9a040');
    stroke(ctx, 2);
  }
  // fırça ve yıldızlı toka
  ctx.save();
  ctx.translate(196, 362);
  ctx.rotate(-0.12);
  rr(ctx, 0, -5, 52, 10, 5);
  fill(ctx, '#b06a8a');
  stroke(ctx, 3);
  ellipse(ctx, -16, 0, 20, 13);
  fill(ctx, '#b06a8a');
  stroke(ctx, 3);
  ctx.fillStyle = '#2a1712';
  for (let i = 0; i < 6; i++) ctx.fillRect(-28 + i * 5, -4, 2, 8);
  ctx.restore();
  ctx.save();
  ctx.translate(560, 362);
  ctx.rotate(0.3);
  rr(ctx, -20, -3, 40, 6, 3);
  fill(ctx, '#c9a040');
  stroke(ctx, 2);
  star(ctx, 0, 0, 13, 0);
  fill(ctx, '#d6b83a');
  stroke(ctx, 2.5);
  ctx.restore();
  // karanlık köşeler
  const v = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 470);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,8,.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ not defteri (ara plan)
export const NOTE_LABELS = ['Yaşı:', 'Sevdiği renk:', 'Annesinin adı:', 'Soyadı:'];

/**
 * Beste'nin röportaj defteri. o.entries[i] = { text, p (0..1 yazılan kısım), strike (0..1), fix, fixP } ;
 * o.focus: kalemin durduğu satır (yoksa kalem kenarda bekler). o.host: sayfa başlığındaki ad.
 */
export function notebook(ctx, t, o = {}) {
  ctx.fillStyle = '#6b4a35';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  for (let y = 0; y < H; y += 26) ctx.fillRect(0, y + ((y * 7) % 11), W, 2);
  ctx.save();
  ctx.translate(320, 250);
  ctx.rotate(-0.025);
  // sayfa
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(-250, -208, 510, 440);
  rr(ctx, -256, -214, 506, 436, 6);
  fill(ctx, '#fbf7e9');
  stroke(ctx, 4);
  ctx.strokeStyle = 'rgba(70,120,220,.35)';
  ctx.lineWidth = 2;
  for (let y = -130; y < 210; y += 40) {
    ctx.beginPath();
    ctx.moveTo(-250, y);
    ctx.lineTo(244, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(230,60,60,.45)';
  ctx.beginPath();
  ctx.moveTo(-196, -214);
  ctx.lineTo(-196, 222);
  ctx.stroke();
  // spiral
  for (let x = -230; x < 240; x += 34) {
    ctx.beginPath();
    ctx.ellipse(x, -214, 7, 14, 0, Math.PI * 0.9, Math.PI * 2.1);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8b93a3';
    ctx.stroke();
  }
  // başlık
  ctx.fillStyle = '#2c7be5';
  ctx.font = `700 40px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('RÖPORTAJ', -180, -150);
  ctx.font = `700 30px ${FONT_HAND}`;
  ctx.fillStyle = '#e8323c';
  ctx.fillText('Konuk: BESTE', 40, -150);
  star(ctx, 6, -160, 12, 0.2);
  fill(ctx, '#ffd23f');
  stroke(ctx, 2);
  // satırlar
  let tip = null;
  const ents = o.entries || [];
  NOTE_LABELS.forEach((label, i) => {
    const y = -94 + i * 80;
    ctx.font = `700 30px ${FONT_HAND}`;
    ctx.fillStyle = '#2c7be5';
    ctx.fillText(label, -180, y);
    const lw = ctx.measureText(label).width;
    const e = ents[i];
    if (!e) return;
    const x0 = -180 + lw + 16;
    ctx.font = `700 36px ${FONT_HAND}`;
    const text = String(e.text || '');
    const tw = Math.min(ctx.measureText(text).width, 230 - lw);
    const p = clamp(e.p ?? 1, 0, 1);
    if (p > 0 && text) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - 4, y - 44, tw * p + 6, 60);
      ctx.clip();
      ctx.fillStyle = '#4a4a52';
      ctx.fillText(text, x0, y, 230 - lw);
      ctx.restore();
      if (o.focus === i && p < 1) tip = { x: x0 + tw * p, y: y - 8 };
    }
    if (e.strike > 0) {
      ctx.strokeStyle = '#3a3a42';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0 - 4, y - 12);
      ctx.lineTo(x0 - 4 + (tw + 8) * clamp(e.strike, 0, 1), y - 14);
      ctx.stroke();
      if (o.focus === i && e.strike < 1) tip = { x: x0 - 4 + (tw + 8) * e.strike, y: y - 14 };
    }
    if (e.fix) {
      const fx = x0 + tw + 22;
      const fp = clamp(e.fixP ?? 1, 0, 1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(fx - 4, y - 50, 80 * fp + 4, 66);
      ctx.clip();
      ctx.font = `700 46px ${FONT_HAND}`;
      ctx.fillStyle = '#c0262e';
      ctx.fillText(e.fix, fx, y + 2);
      ctx.restore();
      if (o.focus === i && fp < 1) tip = { x: fx + 30 * fp, y: y - 10 };
    }
  });
  // kenar boşluğuna durmadan yazılan kırmızı yediler (yaş sorusunda üçüncü yanlıştan sonra)
  const mg = o.margin || 0;
  if (mg > 0) {
    ctx.fillStyle = '#c0262e';
    ctx.textAlign = 'center';
    const n = Math.min(Math.ceil(mg), 14);
    for (let i = 0; i < n; i++) {
      const y = -176 + i * 28 + hash(i * 3.7) * 6;
      const x = -226 + (hash(i * 9.1) - 0.5) * 14;
      const p = clamp(mg - i, 0, 1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 14, y - 30, 28, 34 * p);
      ctx.clip();
      ctx.font = `700 ${30 + hash(i) * 10}px ${FONT_HAND}`;
      ctx.fillText('7', x, y);
      ctx.restore();
      if (o.focus === 'margin' && i === n - 1) tip = { x: x + 4, y: y - 30 + 34 * p };
    }
    ctx.textAlign = 'left';
  }
  ctx.restore();
  // kalemi tutan el
  let hx, hy;
  if (tip) {
    const r = Math.cos(-0.025), s = Math.sin(-0.025);
    hx = 320 + tip.x * r - tip.y * s;
    hy = 250 + tip.x * s + tip.y * r + Math.sin(t * 40) * 2;
  } else {
    hx = 560 + Math.sin(t * 1.3) * 4;
    hy = 410;
  }
  pencilHand(ctx, hx, hy);
}

function pencilHand(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55);
  // kalem
  rr(ctx, -4, -6, 120, 12, 2);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  fill(ctx, '#f2d2a9');
  stroke(ctx, 2.5);
  ctx.beginPath();
  ctx.moveTo(-15, -3);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-15, 3);
  ctx.closePath();
  fill(ctx, '#333');
  rr(ctx, 112, -6, 14, 12, 3);
  fill(ctx, '#ff8fb8');
  stroke(ctx, 2.5);
  ctx.restore();
  // el
  ctx.save();
  ctx.translate(x + 40, y - 18);
  ctx.rotate(-0.4);
  ellipse(ctx, 0, 0, 30, 22);
  fill(ctx, SKIN);
  stroke(ctx, 3.5);
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, -24 + i * 4, 10 + i * 7, 10, 6, 0.4);
    fill(ctx, SKIN);
    stroke(ctx, 3);
  }
  // kol (elbisenin sarı kolu)
  rr(ctx, 18, -16, 140, 34, 14);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3.5);
  ctx.restore();
}

// ------------------------------------------------------------------ alt yazı bandı (lower third)
/** o = { role, name, side: 'left'|'right', p: 0..1 } */
export function lowerThird(ctx, t, o) {
  const p = clamp(o.p || 0, 0, 1);
  if (p <= 0) return;
  ctx.save();
  ctx.font = `800 30px ${FONT_CARTOON}`;
  const nw = Math.max(150, ctx.measureText(o.name).width + 40);
  const w = nw + 20;
  const x = o.side === 'right' ? W - 24 - w + (1 - p) * (w + 40) : 24 - (1 - p) * (w + 40);
  const y = 398;
  rr(ctx, x, y + 14, w, 44, 10);
  fill(ctx, '#ffffff');
  stroke(ctx, 4);
  ctx.fillStyle = '#2c7be5';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.name, x + 22, y + 38, w - 30);
  ctx.font = `800 17px ${FONT_CARTOON}`;
  const rw = ctx.measureText(o.role).width + 34;
  rr(ctx, x + 10, y - 6, rw, 26, 8);
  fill(ctx, '#e8323c');
  stroke(ctx, 3);
  star(ctx, x + 22, y + 7, 7, 0);
  fill(ctx, '#ffd23f');
  ctx.fillStyle = '#fffbe6';
  ctx.fillText(o.role, x + 32, y + 8);
  ctx.restore();
}

// ------------------------------------------------------------------ kurgucunun makası
/** Beyaz lider: yağlı kalemle X, kenar delikleri, kare numarası. o.dim: titreşimi azalt ayarı. */
export function spliceLeader(ctx, t, o = {}) {
  const f = Math.floor(t * 25);
  ctx.fillStyle = o.dim ? '#a9a59b' : '#f3f0e6';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = hash(i + f * 131) * W, y = hash(i * 7 + f * 17) * H;
    ctx.fillStyle = `rgba(40,30,20,${0.08 + hash(i + f) * 0.3})`;
    ctx.fillRect(x, y, 1 + hash(i * 3 + f) * 3, 1 + hash(i * 5 + f) * 2);
  }
  ctx.fillStyle = '#2a2620';
  const offy = (f * 23) % 64;
  for (let y = -64 + offy; y < H; y += 64) {
    rr(ctx, 12, y, 24, 34, 5);
    ctx.fill();
    rr(ctx, W - 36, y, 24, 34, 5);
    ctx.fill();
  }
  ctx.save();
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.strokeStyle = pass === 2 ? 'rgba(25,18,18,.9)' : 'rgba(25,18,18,.35)';
    ctx.lineWidth = pass === 2 ? 22 : 30;
    const j = (pass - 1) * 3;
    ctx.beginPath();
    ctx.moveTo(126 + j, 70);
    ctx.quadraticCurveTo(326, 230 + j, 508, 410);
    ctx.moveTo(516, 78 - j);
    ctx.quadraticCurveTo(322, 232, 128 + j, 400);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#a3121a';
  ctx.font = `700 46px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('KES', 60, 446);
  ctx.font = `700 30px ${FONT_HAND}`;
  ctx.fillText('B-5 / 41', 60, 40);
  ctx.fillStyle = 'rgba(40,30,20,.75)';
  ctx.font = `22px ${FONT_OSD}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(5200 + f).padStart(5, '0'), W - 52, 446);
}

// ------------------------------------------------------------------ ani korkutmalar (aynadan)
/** Korkutma yüzünün gözleri ve ağzı (ekran koordinatı; hx, hy kafa merkezi, s ölçek). */
function scareFeatures(ctx, hx, hy, s, kind, t) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  if (kind === 'reflection') {
    // kapkara, aşağı akan göz çukurları
    for (const side of [-1, 1]) {
      ctx.fillStyle = 'rgba(2,4,12,.96)';
      ellipse(ctx, side * 25, -2, 17, 24, side * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(side * 25 - 9, 10);
      ctx.quadraticCurveTo(side * 25 - 6, 46, side * 25 - 2, 70);
      ctx.lineTo(side * 25 + 3, 70);
      ctx.quadraticCurveTo(side * 25 + 6, 40, side * 25 + 10, 10);
      ctx.fill();
      ctx.fillStyle = '#e9f0ff';
      circle(ctx, side * 25 + 2, -6, 2.2);
      ctx.fill();
    }
    // camda ezilmiş, ardına kadar açık ağız
    const open = 1 + Math.sin(t * 38) * 0.06;
    ctx.fillStyle = 'rgba(2,4,12,.97)';
    ellipse(ctx, 0, 46, 19, 33 * open);
    ctx.fill();
    ctx.fillStyle = 'rgba(70,10,24,.9)';
    ellipse(ctx, 0, 60, 10, 13);
    ctx.fill();
  } else if (kind === 'grin') {
    // fazla geniş, kulaktan kulağa sırıtma ve iğne ucu gözbebekleri
    for (const side of [-1, 1]) {
      ctx.fillStyle = 'rgba(10,14,30,.55)';
      ellipse(ctx, side * 25, 4, 21, 27);
      ctx.fill();
      ellipse(ctx, side * 25, -2, 16, 21);
      ctx.fillStyle = '#f4f8ff';
      ctx.fill();
      ctx.strokeStyle = '#0c1020';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#05060a';
      circle(ctx, side * 25 + Math.sin(t * 50) * 0.6, -2, 2.6);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-62, 18);
    ctx.quadraticCurveTo(0, 46, 62, 18);
    ctx.quadraticCurveTo(0, 112, -62, 18);
    ctx.closePath();
    ctx.fillStyle = '#1c0306';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#f2efe2';
    ctx.beginPath();
    ctx.moveTo(-62, 18);
    ctx.quadraticCurveTo(0, 46, 62, 18);
    ctx.quadraticCurveTo(0, 66, -62, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,10,10,.7)';
    ctx.lineWidth = 1.6;
    for (let x = -58; x < 60; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, 50);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#0c1020';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-62, 18);
    ctx.quadraticCurveTo(0, 46, 62, 18);
    ctx.quadraticCurveTo(0, 112, -62, 18);
    ctx.stroke();
  } else {
    // çizgi film: renkli yüz, delik gibi simsiyah gözler
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#050000';
      ellipse(ctx, side * 23, 0, 15, 19);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Tam ekran ayna korkutması. o.kind:
 *  'reflection' — mavi yansıma camın arkasından yüzünü ve avuçlarını cama yapıştırır (kara göz çukurları, açık ağız, çatlak);
 *  'grin'       — yansıma kulaktan kulağa sırıtır (son kare);
 *  'cartoon'    — gerçek kızın yerinde birden çizgi film Beste (renkli, kara gözler, donmuş sırıtma).
 */
export function mirrorScare(ctx, t, o = {}) {
  const kind = o.kind || 'reflection';
  const k = 1 + Math.min(t, 0.6) * 0.22;
  const f = Math.floor(t * 40);
  const jx = (hash(f) - 0.5) * 22, jy = (hash(f + 7) - 0.5) * 16;
  ctx.fillStyle = kind === 'cartoon' ? '#14060a' : '#04060e';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + jx, H / 2 + jy);
  ctx.scale(k, k);
  ctx.translate(-W / 2, -H / 2);
  const m = { cx: 320, cy: 250, rx: 300, ry: 330 };
  const s = kind === 'grin' ? 3.2 : 3;
  const hy = kind === 'grin' ? 236 : 250;
  const tilt = kind === 'grin' ? 0.1 + Math.sin(t * 3) * 0.04 : 0;
  const face = { x: 320, y: hy + 205 * s, scale: s, t, expr: kind === 'cartoon' ? 'frozen' : 'blank', look: { x: 0, y: 0 }, mouth: 0, blink: 0, wave: 0, tilt };
  mirrorGlass(ctx, t, {
    ...m,
    bg: 'night',
    alpha: 1,
    tint: kind === 'cartoon' ? 'rgba(255,40,40,.12)' : 'rgba(70,130,255,.42)',
    figure: (cc) => drawBeste(cc, face),
    fog: kind === 'reflection' ? 0.55 : 0,
    fogX: 320,
    fogY: hy + 150,
    fogRX: 150,
    fogRY: 60,
    palm: kind === 'reflection' ? { x: 96, y: 236, s: 3.2 } : null,
    cracks: kind === 'cartoon' ? 0 : 3,
    crackSeed: kind === 'grin' ? 29 : 17,
  });
  ctx.save();
  ellipse(ctx, m.cx, m.cy, m.rx, m.ry);
  ctx.clip();
  // kafa eğikse yüz özellikleri de onunla döner (kafa merkezi boyun hizasından döner)
  ctx.translate(320, hy + 205 * s);
  ctx.rotate(tilt);
  ctx.translate(-320, -(hy + 205 * s));
  scareFeatures(ctx, 320, hy, s, kind, t);
  ctx.restore();
  if (kind === 'reflection') {
    // ikinci avuç, ötekinin aynası
    ctx.save();
    ctx.translate(544, 236);
    ctx.scale(-3.2, 3.2);
    ctx.fillStyle = 'rgba(230,240,255,.35)';
    ellipse(ctx, 0, 0, 22, 26);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,222,200,.55)';
    ellipse(ctx, 0, 6, 13, 14);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      rr(ctx, -12 + i * 7, -22 + Math.abs(i - 1.5) * 3, 5.5, 18, 3);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  // kararan kenarlar, tarama çizgileri, kayan bir bant
  const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, kind === 'cartoon' ? 'rgba(130,0,0,.65)' : 'rgba(0,6,24,.8)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let y = f % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  if (hash(f * 1.3) < 0.18) {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(0, hash(f) * H, W, 6 + hash(f + 2) * 20);
  }
}

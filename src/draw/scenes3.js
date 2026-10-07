// 3. kaset "Tonton Kedi Geri Döndü!" için sahneler ve çizimler.
// Dikişli Tonton (düğme gözler, dikişli gülüş, gri kuyruk), Heykel bahçesi (arka sıra çamlar),
// gri adam (yalnızca donuk karelerde), Haftanın Sihirli Sözü kartı, kurgu makası (beyaz lider).
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';
import { OUT, FONT_CARTOON, FONT_OSD, FONT_HAND, rr, fill, stroke, star, cloud, pine, APPLES } from './scenes.js';

const ORANGE = '#f59a3c';
const DARK = '#c8661c';
const TAIL_GREY = '#8d8f94';
const SKIN = '#ffd9b8';

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
function fs(ctx, color, lw = 4) {
  ctx.fillStyle = color;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
}
function xStitch(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x - r, y + r);
  ctx.stroke();
}
/** Kumaş yama: soluk renkli kare, kenarında kesik dikiş */
function patch(ctx, x, y, w, h, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  fs(ctx, color, 2.5);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#1b1b1f';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Yeniden dikilmiş Tonton.
 * s = { x, y, scale, t, still, tremble, headTilt (radyan), headTurn (-1..1, 0 = izleyiciye bakar),
 *       tail, tailColor, tailSwing, expr ('happy'|'neutral'|'sad'|'scared'), flip, eyes [sol, sağ] }
 * Ağız dikişlidir; ses gelse de hiç açılmaz.
 */
export function drawStitchedTonton(ctx, s) {
  const t = s.t || 0;
  const still = !!s.still;
  const tr = s.tremble || 0;
  ctx.save();
  ctx.translate(s.x + (hash(Math.floor(t * 40)) - 0.5) * 6 * tr, s.y + (hash(Math.floor(t * 40) + 9) - 0.5) * 4 * tr);
  ctx.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const breathe = still ? 0 : Math.sin(t * 2.6) * 1.2;

  // kuyruk (başka kumaştan, gri)
  if (s.tail !== false) {
    const sw = (still ? 0 : Math.sin(t * 1.2) * 3) + (s.tailSwing || 0);
    ctx.beginPath();
    ctx.moveTo(34, -24);
    ctx.bezierCurveTo(80, -20, 80 + sw * 0.3, -70, 62 + sw, -96);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = s.tailColor || TAIL_GREY;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(50,52,58,.45)';
    ctx.lineWidth = 2;
    for (const [x, y] of [[58, -26], [70, -40], [75, -56], [73 + sw * 0.4, -72], [67 + sw * 0.8, -86]]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 2);
      ctx.lineTo(x + 3, y - 3);
      ctx.stroke();
    }
  }
  // gövde
  ellipse(ctx, 0, -42 + breathe * 0.5, 44, 42);
  fs(ctx, ORANGE);
  ellipse(ctx, 0, -32 + breathe * 0.5, 26, 28);
  fs(ctx, '#ffe7c4', 0);
  // yan tarafta soluk mavi bir yama
  patch(ctx, -27, -52 + breathe * 0.5, 15, 13, -0.25, '#9cc9cf');
  // göğüs dikişi + sarkan iplik
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.lineTo(0, -12);
  ctx.stroke();
  for (let y = -56; y < -12; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-5, y);
    ctx.lineTo(5, y + 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(6, -4, 2, 2 + (still ? 0 : Math.sin(t * 2) * 1.5));
  ctx.stroke();
  // kuyruğun dikildiği yer: kalın siyah X dikişler
  if (s.tail !== false) {
    ctx.strokeStyle = '#0d0d10';
    ctx.lineWidth = 2.6;
    for (const [x, y] of [[39, -31], [42, -24], [40, -17]]) xStitch(ctx, x, y, 4);
  }
  // patiler
  for (const px of [-20, 20]) {
    ellipse(ctx, px, -4, 14, 9);
    fs(ctx, ORANGE, 3.5);
  }

  // baş (boyun noktası etrafında eğilir)
  ctx.save();
  ctx.translate(0, -70 + breathe);
  ctx.rotate(s.headTilt || 0);
  ctx.translate(0, -34);
  const turn = clamp(s.headTurn || 0, -1, 1);
  const at = Math.abs(turn);
  const sg = Math.sign(turn);
  const ox = turn * 22;
  for (const side of [-1, 1]) {
    const far = sg !== 0 && side === sg;
    const k = far ? 1 - 0.35 * at : 1;
    const ex = ox * 0.35;
    ctx.beginPath();
    ctx.moveTo(ex + side * 16 * k, -30);
    ctx.lineTo(ex + side * 38 * k, -58);
    ctx.lineTo(ex + side * 40 * k, -16);
    ctx.closePath();
    fs(ctx, ORANGE, 4);
    ctx.beginPath();
    ctx.moveTo(ex + side * 22 * k, -30);
    ctx.lineTo(ex + side * 35 * k, -48);
    ctx.lineTo(ex + side * 36 * k, -24);
    ctx.closePath();
    fs(ctx, side > 0 ? '#c9c2b0' : '#ff9db0', 0);
    if (side > 0) {
      // sağ kulağın içi başka kumaş: dikişli
      ctx.strokeStyle = '#1b1b1f';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      ctx.moveTo(ex + 24 * k, -31);
      ctx.lineTo(ex + 34 * k, -45);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ellipse(ctx, 0, 0, 46, 40);
  fs(ctx, ORANGE);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 5;
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(dx + ox * 0.5, -38);
    ctx.lineTo(dx * 0.8 + ox * 0.5, -26);
    ctx.stroke();
  }
  // alında dikiş izi
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-26 + ox * 0.6, -20);
  ctx.quadraticCurveTo(-14 + ox * 0.6, -28, -2 + ox * 0.6, -26);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = -23 + i * 6.5 + ox * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, -27 + (i === 0 ? 3 : 0));
    ctx.lineTo(x + 1.5, -20 + (i === 0 ? 3 : 0));
    ctx.stroke();
  }

  // düğme gözler: biri kırmızı, biri siyah; dört delik, çapraz iplik
  const eyeCols = s.eyes || ['#c0161e', '#18181c'];
  const expr = s.expr || 'happy';
  [-1, 1].forEach((side, i) => {
    const far = sg !== 0 && side === sg;
    const ex = side * 17 * (1 - at * 0.25) + ox;
    const ey = -4;
    const r = i === 0 ? 11 : 9.5;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(far ? 1 - 0.5 * at : 1, 1);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    fs(ctx, eyeCols[i], 3);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - 2.5, -2.6, -1.7);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ece5d2';
    ctx.lineWidth = 1.4;
    xStitch(ctx, 0, 0, 3);
    ctx.restore();
    if (expr === 'sad' || expr === 'scared') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - side * 10, -26);
      ctx.lineTo(ex + side * 6, -21);
      ctx.stroke();
    }
  });
  // burun
  const nx = ox * 1.15;
  ctx.beginPath();
  ctx.moveTo(nx - 6, 9);
  ctx.lineTo(nx + 6, 9);
  ctx.lineTo(nx, 15);
  ctx.closePath();
  fs(ctx, '#ff7f9a', 2.5);
  // dikişli gülüş: hiç açılmaz
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nx - 13, 18);
  ctx.quadraticCurveTo(nx, 28, nx + 13, 18);
  ctx.stroke();
  ctx.strokeStyle = '#0d0d10';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const u = 0.12 + i * 0.19;
    const x = nx + 13 * (2 * u - 1);
    const y = 18 * (1 - u) * (1 - u) + 56 * u * (1 - u) + 18 * u * u;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y - 4);
    ctx.lineTo(x + 1.5, y + 4);
    ctx.stroke();
  }
  // bıyıklar
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const far = sg !== 0 && side === sg;
    const len = 30 * (far ? 1 - 0.45 * at : 1 + 0.15 * at);
    for (const dy of [-3, 4]) {
      ctx.beginPath();
      ctx.moveTo(nx * 0.9 + side * 22, 12 + dy);
      ctx.lineTo(nx * 0.9 + side * (22 + len), 8 + dy * 2.2);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

/** Tonton'un kuyruğunu çevreleyen dikdörtgen (tuval koordinatı) */
export function tailRect(s) {
  const k = s.scale;
  return [s.x + 24 * k, s.y - 116 * k, 70 * k, 108 * k];
}

/** Kesik çizgili, kayan vurgu çerçevesi */
export function dashBox(ctx, t, r) {
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = 'rgba(30,15,10,.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(...r);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(...r);
  ctx.restore();
}

/**
 * Beste'nin kapalı gülüşünü biraz fazla genişletir (drawBeste'nin üstüne çizilir).
 * Yalnızca 'happy' ifadesinde ve ağız kapalıyken.
 */
export function wideSmile(ctx, s) {
  if ((s.expr || 'happy') !== 'happy' || (s.mouth || 0) >= 0.06 || s.back) return;
  const t = s.t || 0;
  const breathe = Math.sin(t * 2.2) * 1.5;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  ctx.translate(0, breathe - 205);
  ctx.rotate(s.tilt || 0);
  ellipse(ctx, 0, 35, 19, 8.5);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 15, 27, 0.4, Math.PI - 0.4);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // ağız kenarlarında küçük gamzeler
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 23, 22);
    ctx.lineTo(side * 26.5, 26.5);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ gri adam
/**
 * Yüzsüz, çok uzun kollu gri adam. o.alpha, o.headTilt (radyan),
 * o.reach {x,y}: sol kol (ekranda solda kalan) bu noktaya kadar uzanır, uzun parmaklarla.
 */
export function drawGreyMan(ctx, x, y, h, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(x, y);
  const s = h / 300;
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -300, 0, 0);
  g.addColorStop(0, 'rgb(126,126,132)');
  g.addColorStop(0.8, 'rgb(98,99,106)');
  g.addColorStop(1, 'rgba(72,74,80,.55)');
  ctx.fillStyle = g;
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // gövde
  ctx.beginPath();
  ctx.moveTo(-32, -236);
  ctx.quadraticCurveTo(0, -246, 32, -236);
  ctx.lineTo(28, -120);
  ctx.lineTo(18, 0);
  ctx.lineTo(4, 0);
  ctx.lineTo(0, -110);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-28, -120);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-7, -252, 14, 20);
  // baş
  ctx.save();
  ctx.translate(0, -248);
  ctx.rotate(o.headTilt || 0);
  ellipse(ctx, 0, -22, 20, 27);
  ctx.fill();
  ctx.restore();
  // kollar
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(30, -228);
  ctx.quadraticCurveTo(46, -150, 40, -70);
  ctx.stroke();
  const fingers = (hx, hy, dir) => {
    ctx.lineWidth = 3.2;
    for (let f = 0; f < 4; f++) {
      const sp = (f - 1.5) * 3.4;
      ctx.beginPath();
      ctx.moveTo(hx + sp * 0.6, hy - 2);
      ctx.quadraticCurveTo(hx + sp * 1.1 + dir * 2, hy + 18, hx + sp * 1.5 + dir * 3, hy + 32 + (f === 1 || f === 2 ? 7 : 0));
      ctx.stroke();
    }
  };
  if (o.reach) {
    const tx = (o.reach.x - x) / s;
    const ty = (o.reach.y - y) / s;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-30, -228);
    ctx.quadraticCurveTo(-46, (-228 + ty) * 0.55, tx, ty);
    ctx.stroke();
    fingers(tx, ty, 1);
  } else {
    ctx.beginPath();
    ctx.moveTo(-30, -228);
    ctx.quadraticCurveTo(-46, -150, -40, -70);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Heykel bahçesi
/**
 * Bahçe + çitin arkasında yeni bir sıra koyu çam. o.man = { stage 1|2|3, tilt } yalnızca donuk karelerde.
 */
export function gardenHeykel(ctx, t, o = {}) {
  const sky = ctx.createLinearGradient(0, 0, 0, 330);
  sky.addColorStop(0, '#5bc2ff');
  sky.addColorStop(1, '#c9f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath();
  ctx.arc(570, 60, 34, 0, Math.PI * 2);
  fill(ctx, '#ffe14d');
  stroke(ctx, 3);
  cloud(ctx, 40 + ((t * 10) % 700) - 60, 70, 1);
  cloud(ctx, ((t * 6 + 420) % 760) - 80, 34, 0.6);
  // arka sıra çamlar (çitin arkasında, koyu)
  for (let i = 0; i < 15; i++) pine(ctx, i * 46 + 6 + hash(i + 21) * 14, 304, 120 + hash(i + 31) * 70, i % 2 ? '#1f3d27' : '#26492f');
  const man = o.man;
  if (man && man.stage === 1) drawGreyMan(ctx, 520, 300, 120, { alpha: 0.55, headTilt: man.tilt });
  // çit
  for (let x = 0; x < W; x += 36) {
    rr(ctx, x + 4, 250, 24, 90, 4);
    fill(ctx, '#ffffff');
    stroke(ctx, 3);
  }
  ctx.fillStyle = '#7bd35a';
  ctx.fillRect(0, 320, W, 160);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(W, 320);
  ctx.stroke();
  // elma ağacı
  rr(ctx, 296, 200, 44, 170, 8);
  fill(ctx, '#9a5a2e');
  stroke(ctx, 4);
  for (const [x, y, r] of [[320, 140, 100], [240, 170, 66], [400, 168, 66], [320, 90, 70]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    fill(ctx, '#3fae49');
    stroke(ctx, 4);
  }
  ctx.fillStyle = '#3fae49';
  ctx.beginPath();
  ctx.arc(320, 145, 95, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of APPLES) {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    fill(ctx, '#e8323c');
    stroke(ctx, 3);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 3, y - 22);
    ctx.stroke();
  }
  // çimen
  ctx.strokeStyle = '#3c8f33';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = hash(i) * W, y = 340 + hash(i + 40) * 130;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y - 10);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y - 10);
    ctx.stroke();
  }
  if (man && man.stage === 2) drawGreyMan(ctx, 505, 362, 230, { alpha: 0.9, headTilt: man.tilt });
  // tam arkalarında: başı kadrajın üstünden taşar, bir kolu Beste'nin omzunun yanına sarkar
  if (man && man.stage === 3) drawGreyMan(ctx, 310, 472, 520, { alpha: 1, headTilt: man.tilt, reach: { x: 244, y: 326 } });
}

// ------------------------------------------------------------------ Haftanın Sihirli Sözü
const LETTER_COLS = ['#e8323c', '#2c7be5', '#22a35a', '#f08c00'];
function sparkle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = color;
  ctx.fill();
}
function easeOutBack(p) {
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
}

/**
 * 90'lar tarzı "HAFTANIN SİHİRLİ SÖZÜ" kartı.
 * o = { letters, shown, popAt [d.time], now (d.time), flash 0..1, flip 0..1, back (arka yüz yazısı), confetti (d.time) }
 */
export function wordCard(ctx, t, o = {}) {
  const now = o.now ?? t;
  const bg = ctx.createRadialGradient(W / 2, 230, 30, W / 2, 240, 470);
  bg.addColorStop(0, '#a35fe6');
  bg.addColorStop(1, '#3a1263');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // dönen ışınlar
  ctx.save();
  ctx.translate(300, 240);
  ctx.rotate(t * 0.18);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 720, a, a + Math.PI / 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // pırıltılar
  for (let i = 0; i < 24; i++) {
    const x = hash(i * 3.7) * W, y = hash(i * 5.1 + 2) * H;
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
    sparkle(ctx, x, y, 4 + tw * 8, `rgba(255,246,190,${0.3 + tw * 0.6})`);
  }
  // başlık
  ctx.save();
  ctx.translate(W / 2, 54);
  ctx.rotate(-0.025 + Math.sin(t * 2) * 0.012);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 40px ${FONT_CARTOON}`;
  ctx.lineWidth = 11;
  ctx.strokeStyle = OUT;
  ctx.strokeText('HAFTANIN SİHİRLİ SÖZÜ', 0, 0);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('HAFTANIN SİHİRLİ SÖZÜ', 0, 0);
  ctx.restore();

  // kart (döner)
  const flip = clamp(o.flip || 0, 0, 1);
  const sx = Math.cos(flip * Math.PI);
  ctx.save();
  ctx.translate(300, 240);
  ctx.scale(Math.max(0.015, Math.abs(sx)), 1);
  rr(ctx, -192, -96, 400, 210, 26);
  ctx.fillStyle = 'rgba(25,0,45,.35)';
  ctx.fill();
  rr(ctx, -200, -105, 400, 210, 26);
  if (sx >= 0) {
    fill(ctx, '#ffd23f');
    stroke(ctx, 5);
    rr(ctx, -186, -91, 372, 182, 18);
    ctx.setLineDash([12, 8]);
    stroke(ctx, 3, '#fff6c8');
    ctx.setLineDash([]);
    star(ctx, 0, 6, 128, 0.08);
    fill(ctx, '#ffe57a');
    for (const [x, y] of [[-166, -72], [166, -72], [-166, 78], [166, 78]]) {
      star(ctx, x, y, 13, 0.3);
      fill(ctx, '#ffffff');
      stroke(ctx, 2.5);
    }
    const L = o.letters || 'SOBE';
    const shown = o.shown ?? L.length;
    const flashOn = (o.flash || 0) > 0.05 && Math.floor(now * 9) % 2 === 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `800 112px ${FONT_CARTOON}`;
    for (let i = 0; i < Math.min(shown, L.length); i++) {
      const at = o.popAt?.[i];
      const p = at != null ? clamp((now - at) / 0.32, 0, 1) : 1;
      const sc = p < 1 ? Math.max(0.01, easeOutBack(p)) : 1;
      ctx.save();
      ctx.translate((i - (L.length - 1) / 2) * 92, 14);
      ctx.rotate(i % 2 ? 0.06 : -0.06);
      ctx.scale(sc, sc);
      ctx.lineWidth = 13;
      ctx.strokeStyle = flashOn ? '#e8323c' : OUT;
      ctx.strokeText(L[i], 0, 0);
      ctx.fillStyle = flashOn ? '#ffffff' : LETTER_COLS[i % 4];
      ctx.fillText(L[i], 0, 0);
      ctx.restore();
    }
  } else {
    // kartın arkası: soluk karton
    fill(ctx, '#efe4c0');
    stroke(ctx, 5);
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(150,120,70,.18)';
    ctx.lineWidth = 2;
    for (let i = -220; i < 220; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, -110);
      ctx.lineTo(i + 60, 110);
      ctx.stroke();
    }
    ctx.restore();
    if (o.back) {
      ctx.save();
      ctx.rotate(-0.05);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 96px ${FONT_HAND}`;
      ctx.fillStyle = '#6a0a10';
      ctx.fillText(o.back, 0, 8);
      ctx.restore();
    }
  }
  ctx.restore();

  // konfeti
  if (o.confetti != null) {
    const dt = now - o.confetti;
    const cols = ['#ff4b4b', '#ffd23f', '#4aa8ff', '#5ed35e', '#ff8fc4', '#ffffff'];
    for (let i = 0; i < 54; i++) {
      const y = -30 + dt * (140 + hash(i + 9) * 150) - hash(i + 3) * 260;
      if (y < -20 || y > H + 20) continue;
      const x = hash(i * 1.3) * W + Math.sin(dt * 3 + i) * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dt * (2 + hash(i) * 4) + i);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------------ kurgucunun makası
/** Altı karelik beyaz lider: yağlı kalemle çizilmiş X, kenarda delikler ve kare numaraları. */
export function spliceLeader(ctx, t, o = {}) {
  const f = Math.floor(t * 25);
  ctx.fillStyle = o.dim ? '#a9a59b' : '#f3f0e6';
  ctx.fillRect(0, 0, W, H);
  // toz ve kir
  for (let i = 0; i < 160; i++) {
    const x = hash(i + f * 131) * W, y = hash(i * 7 + f * 17) * H;
    ctx.fillStyle = `rgba(40,30,20,${0.08 + hash(i + f) * 0.3})`;
    ctx.fillRect(x, y, 1 + hash(i * 3 + f) * 3, 1 + hash(i * 5 + f) * 2);
  }
  ctx.strokeStyle = 'rgba(60,50,40,.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = hash(f * 3 + i) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 4, H);
    ctx.stroke();
  }
  // kenar delikleri
  ctx.fillStyle = '#2a2620';
  const off = (f * 23) % 64;
  for (let y = -64 + off; y < H; y += 64) {
    rr(ctx, 12, y, 24, 34, 5);
    ctx.fill();
    rr(ctx, W - 36, y, 24, 34, 5);
    ctx.fill();
  }
  // yağlı kalem X
  ctx.save();
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.strokeStyle = pass === 2 ? 'rgba(25,18,18,.9)' : 'rgba(25,18,18,.35)';
    ctx.lineWidth = pass === 2 ? 22 : 30;
    const j = (pass - 1) * 3;
    ctx.beginPath();
    ctx.moveTo(120 + j, 66);
    ctx.quadraticCurveTo(330, 236 + j, 516, 414);
    ctx.moveTo(512, 74 - j);
    ctx.quadraticCurveTo(318, 226, 132 + j, 404);
    ctx.stroke();
  }
  ctx.restore();
  // el yazısı ve kare numaraları
  ctx.fillStyle = '#a3121a';
  ctx.font = `700 46px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('KES', 60, 446);
  ctx.font = `700 30px ${FONT_HAND}`;
  ctx.fillText('B-3 / 37', 60, 40);
  ctx.fillStyle = 'rgba(40,30,20,.75)';
  ctx.font = `22px ${FONT_OSD}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(1400 + f).padStart(5, '0'), W - 52, 446);
}

/** Uyarı kartının arkasındaki tek kare: ARKANA BAKMA */
export function warningFlip(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d2fb0';
  ctx.fillRect(60, 60, W - 120, H - 120);
  ctx.strokeStyle = '#f4f4f4';
  ctx.lineWidth = 3;
  ctx.strokeRect(72, 72, W - 144, H - 144);
  ctx.fillStyle = '#f4f4f4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 84px ${FONT_OSD}`;
  ctx.fillText('ARKANA', W / 2, H / 2 - 44);
  ctx.fillText('BAKMA', W / 2, H / 2 + 44);
}

/**
 * JUMPSCARE: üçüncü donmadan sonra gri adamın yüzü ekranı doldurur. Yüzsüz, ama Tonton'unki gibi
 * dikilmiş, fazla geniş bir gülüş var; iki yandan uzun parmaklar ekranın kenarına yapışır.
 */
export function scareGreyMan(ctx, t) {
  const k = 1 + Math.min(t, 0.5) * 0.3;
  const jx = (hash(Math.floor(t * 45)) - 0.5) * 20;
  const jy = (hash(Math.floor(t * 45) + 5) - 0.5) * 14;
  ctx.fillStyle = '#040405';
  ctx.fillRect(0, 0, W, H);
  // arkada solgun gün ışığı, çit gibi dikey şeritler
  ctx.fillStyle = 'rgba(150,160,150,.10)';
  for (let i = 0; i < 9; i++) ctx.fillRect(i * 78 - 10, 0, 26, H);
  ctx.save();
  ctx.translate(W / 2 + jx, H / 2 + 24 + jy);
  ctx.rotate(0.2);
  ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // uzun parmaklar: iki kenardan ekrana tutunur
  ctx.strokeStyle = '#6a6b72';
  ctx.lineWidth = 11;
  for (const side of [-1, 1]) {
    for (let f = 0; f < 4; f++) {
      const y0 = -120 + f * 62;
      ctx.beginPath();
      ctx.moveTo(side * 330, y0 + 40);
      ctx.quadraticCurveTo(side * 250, y0 - 70 - f * 10, side * (150 + f * 12), y0 + 6);
      ctx.stroke();
    }
  }
  // baş
  const g = ctx.createRadialGradient(-40, -90, 20, 0, 0, 330);
  g.addColorStop(0, '#9a9ba2');
  g.addColorStop(0.7, '#6b6c73');
  g.addColorStop(1, '#3a3b41');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 220, 292, 0, 0, Math.PI * 2);
  ctx.fill();
  // gözler yok; yalnızca iki hafif çukur
  ctx.fillStyle = 'rgba(20,20,24,.35)';
  for (const x of [-72, 72]) {
    ctx.beginPath();
    ctx.ellipse(x, -50, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // dikilmiş, fazla geniş gülüş
  ctx.strokeStyle = '#0a0a0c';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-150, 70);
  ctx.quadraticCurveTo(0, 230, 150, 70);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let i = -6; i <= 6; i++) {
    const u = i / 6;
    const x = u * 150;
    const y = 70 + (1 - u * u) * 80;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 20);
    ctx.lineTo(x + 7, y + 20);
    ctx.stroke();
  }
  ctx.restore();
  // parlama: ilk kareler beyazımsı
  if (t < 0.07) {
    ctx.fillStyle = 'rgba(235,235,240,.5)';
    ctx.fillRect(0, 0, W, H);
  }
}

// 90'lar çocuk programı tarzı karakterler. Her şey kodla, Canvas 2D ile çizilir.
import { hash } from '../util.js';

const OUT = '#2a1712';
const SKIN = '#ffd9b8';
const HAIR = '#6a3a1e';
const DRESS = '#ffd23f';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
function fs(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
}
/** Kalın, uçları yuvarlak, dış çizgili uzuv. */
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

/**
 * Beste.
 * s = { x, y, scale, mouth 0..1, look {x,y} -1..1, blink 0..1, expr, wave 0..1, t, flip, dress }
 * expr: 'happy' | 'neutral' | 'frozen' | 'sad' | 'void' | 'angry'
 */
export function drawBeste(ctx, s) {
  const t = s.t || 0;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const breathe = s.expr === 'frozen' || s.expr === 'void' ? 0 : Math.sin(t * 2.2) * 1.5;

  // bacaklar ve ayakkabılar
  limb(ctx, [[-15, -58], [-17, -14]], 13, SKIN);
  limb(ctx, [[15, -58], [17, -14]], 13, SKIN);
  ellipse(ctx, -21, -9, 17, 9);
  fs(ctx, '#d42c2c');
  ellipse(ctx, 21, -9, 17, 9);
  fs(ctx, '#d42c2c');

  // kollar
  const wave = s.wave || 0;
  const shoulderY = -140 + breathe;
  if (wave > 0.01) {
    const ex = 62, ey = shoulderY - 26;
    const a = 0.25 + Math.sin(t * 9) * 0.5;
    const hx = ex + Math.sin(a) * 36, hy = ey - Math.cos(a) * 36;
    limb(ctx, [[34, shoulderY], [ex, ey], [hx, hy]], 12, SKIN);
    circle(ctx, hx, hy, 10);
    fs(ctx, SKIN);
  } else {
    limb(ctx, [[34, shoulderY], [52, shoulderY + 34], [58, shoulderY + 62]], 12, SKIN);
    circle(ctx, 58, shoulderY + 66, 10);
    fs(ctx, SKIN);
  }
  limb(ctx, [[-34, shoulderY], [-52, shoulderY + 34], [-58, shoulderY + 62]], 12, SKIN);
  circle(ctx, -58, shoulderY + 66, 10);
  fs(ctx, SKIN);

  // elbise
  ctx.beginPath();
  ctx.moveTo(-34, shoulderY - 6);
  ctx.quadraticCurveTo(0, shoulderY - 16, 34, shoulderY - 6);
  ctx.lineTo(66, -52);
  ctx.quadraticCurveTo(0, -38, -66, -52);
  ctx.closePath();
  fs(ctx, s.dress || DRESS);
  // puantiyeler
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (const [px, py] of [[-30, -110], [8, -96], [36, -78], [-44, -70], [-6, -66], [26, -122], [-18, -88]]) {
    circle(ctx, px, py + breathe * 0.5, 4);
    ctx.fill();
  }
  // yaka
  ctx.beginPath();
  ctx.moveTo(-22, shoulderY - 10);
  ctx.quadraticCurveTo(-12, shoulderY + 8, 0, shoulderY - 2);
  ctx.quadraticCurveTo(12, shoulderY + 8, 22, shoulderY - 10);
  ctx.closePath();
  fs(ctx, '#ffffff', 3);

  // baş
  ctx.save();
  ctx.translate(0, breathe);
  const tilt = s.tilt || 0;
  ctx.translate(0, -205);
  ctx.rotate(tilt);
  drawBesteHead(ctx, s, t);
  ctx.restore();
  ctx.restore();
}

function drawBesteHead(ctx, s, t) {
  // örgüler (kafanın arkasında)
  for (const side of [-1, 1]) {
    const sw = Math.sin(t * 2 + side) * 0.06;
    ellipse(ctx, side * 74, 18, 20, 34, side * (0.35 + sw));
    fs(ctx, HAIR);
    // kurdele
    ctx.save();
    ctx.translate(side * 62, -16);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -12);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    fs(ctx, '#e8323c', 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, -12);
    ctx.lineTo(14, 12);
    ctx.closePath();
    fs(ctx, '#e8323c', 3);
    circle(ctx, 0, 0, 5);
    fs(ctx, '#b0202a', 3);
    ctx.restore();
  }
  // saç kütlesi
  circle(ctx, 0, -6, 68);
  fs(ctx, HAIR);
  // kulaklar
  circle(ctx, -60, 6, 11);
  fs(ctx, SKIN, 3.5);
  circle(ctx, 60, 6, 11);
  fs(ctx, SKIN, 3.5);
  // yüz
  ellipse(ctx, 0, 6, 58, 56);
  fs(ctx, SKIN);
  // kâkül
  ctx.beginPath();
  ctx.moveTo(-60, -4);
  ctx.quadraticCurveTo(-58, -64, 0, -66);
  ctx.quadraticCurveTo(58, -64, 60, -4);
  for (let i = 0; i <= 6; i++) {
    const x = 60 - i * 20;
    ctx.lineTo(x + 10, -24 + (i % 2) * 4);
    ctx.lineTo(x, -14);
  }
  ctx.closePath();
  fs(ctx, HAIR, 3.5);
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-14, -40, 26, -2.6, -1.9);
  ctx.stroke();

  const expr = s.expr || 'happy';
  // yanaklar
  if (expr !== 'void') {
    ctx.fillStyle = expr === 'frozen' ? 'rgba(255,90,110,.6)' : 'rgba(255,120,140,.45)';
    circle(ctx, -36, 26, 11);
    ctx.fill();
    circle(ctx, 36, 26, 11);
    ctx.fill();
  }
  // kaşlar
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  const browY = expr === 'sad' ? -28 : -30;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    if (expr === 'sad') {
      ctx.moveTo(side * 34, browY + 2);
      ctx.lineTo(side * 12, browY - 6);
    } else if (expr === 'angry') {
      ctx.moveTo(side * 34, browY - 6);
      ctx.lineTo(side * 12, browY + 4);
    } else {
      ctx.arc(side * 23, browY + 12, 13, -2.4, -0.7);
    }
    ctx.stroke();
  }

  // gözler
  const look = s.look || { x: 0, y: 0 };
  const blink = expr === 'frozen' || expr === 'void' ? 0 : s.blink || 0;
  for (const side of [-1, 1]) {
    const ex = side * 23, ey = 0;
    ellipse(ctx, ex, ey, 14, 18);
    fs(ctx, expr === 'void' ? '#050000' : '#ffffff', 3.5);
    if (expr === 'void') {
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex + look.x * 5, ey + look.y * 6, 2.2);
      ctx.fill();
    } else {
      const pr = expr === 'frozen' ? 5.5 : 8.5;
      ctx.fillStyle = '#1a0f0a';
      circle(ctx, ex + look.x * 6, ey + 2 + look.y * 8, pr);
      ctx.fill();
      if (expr !== 'frozen') {
        ctx.fillStyle = '#fff';
        circle(ctx, ex + look.x * 6 - 3, ey - 2 + look.y * 8, 2.8);
        ctx.fill();
      }
    }
    // kirpik
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ex + side * 12, ey - 12);
    ctx.lineTo(ex + side * 19, ey - 17);
    ctx.stroke();
    if (blink > 0.02) {
      ctx.save();
      ellipse(ctx, ex, ey, 15.5, 19.5);
      ctx.clip();
      ctx.fillStyle = SKIN;
      ctx.fillRect(ex - 17, ey - 21, 34, 40 * blink);
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(ex - 15, ey - 21 + 40 * blink);
      ctx.lineTo(ex + 15, ey - 21 + 40 * blink);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (expr === 'sad') {
    ctx.fillStyle = '#7fd0ff';
    const ty = 20 + ((t * 30) % 30);
    ellipse(ctx, -30, ty, 3.5, 5);
    ctx.fill();
  }

  // burun
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 14, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // ağız
  drawMouth(ctx, expr, s.mouth || 0, t);
}

function drawMouth(ctx, expr, m, t) {
  const y = 34;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUT;
  if (expr === 'frozen' || expr === 'void') {
    // donmuş, fazla geniş sırıtma
    const w = expr === 'void' ? 40 : 32;
    ctx.beginPath();
    ctx.moveTo(-w, y - 6);
    ctx.quadraticCurveTo(0, y + 6, w, y - 6);
    ctx.quadraticCurveTo(0, y + 30, -w, y - 6);
    ctx.closePath();
    fs(ctx, '#5a0f18', 3.5);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fbf6e8';
    ctx.fillRect(-w, y - 8, w * 2, 11);
    ctx.strokeStyle = 'rgba(42,23,18,.6)';
    ctx.lineWidth = 1.5;
    for (let i = -w + 7; i < w; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, y - 8);
      ctx.lineTo(i, y + 3);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (expr === 'sad') {
    ctx.beginPath();
    ctx.arc(0, y + 14, 12, -2.5, -0.64);
    ctx.stroke();
    return;
  }
  if (m < 0.06) {
    ctx.beginPath();
    if (expr === 'neutral') {
      ctx.moveTo(-10, y);
      ctx.lineTo(10, y);
    } else ctx.arc(0, y - 10, 16, 0.5, Math.PI - 0.5);
    ctx.stroke();
    return;
  }
  const open = 4 + m * 18;
  const w = 15 - m * 3;
  ctx.beginPath();
  ctx.moveTo(-w, y - 2);
  ctx.quadraticCurveTo(0, y + 2, w, y - 2);
  ctx.quadraticCurveTo(w * 0.9, y + open, 0, y + open);
  ctx.quadraticCurveTo(-w * 0.9, y + open, -w, y - 2);
  ctx.closePath();
  fs(ctx, '#7a1f2b', 3.5);
  if (m > 0.3) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ff8a9a';
    ellipse(ctx, 0, y + open, w * 0.7, open * 0.45);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Tonton Kedi. s = { x, y, scale, mouth, look, blink, expr: 'happy'|'sad'|'scared', tail: bool, tremble 0..1, t }
 */
export function drawTonton(ctx, s) {
  const t = s.t || 0;
  ctx.save();
  const tr = s.tremble || 0;
  ctx.translate(s.x + (hash(Math.floor(t * 40)) - 0.5) * 6 * tr, s.y + (hash(Math.floor(t * 40) + 9) - 0.5) * 4 * tr);
  ctx.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const ORANGE = '#f59a3c';
  const DARK = '#c8661c';
  const breathe = Math.sin(t * 2.6) * 1.2;

  // kuyruk
  if (s.tail !== false) {
    const sw = Math.sin(t * 3) * 10;
    ctx.beginPath();
    ctx.moveTo(34, -24);
    ctx.bezierCurveTo(80, -20, 80 + sw * 0.3, -70, 62 + sw, -96);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 14;
    ctx.setLineDash([6, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // kuyruğun olması gereken yerde küçük bir yara bandı
    ctx.save();
    ctx.translate(38, -22);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#f2d2a9';
    ctx.fillRect(-10, -5, 20, 10);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-10, -5, 20, 10);
    ctx.restore();
  }
  // gövde
  ellipse(ctx, 0, -42 + breathe * 0.5, 44, 42);
  fs(ctx, ORANGE);
  ellipse(ctx, 0, -32 + breathe * 0.5, 26, 28);
  fs(ctx, '#ffe7c4', 0);
  // patiler
  for (const px of [-20, 20]) {
    ellipse(ctx, px, -4, 14, 9);
    fs(ctx, ORANGE, 3.5);
  }
  // baş
  ctx.save();
  ctx.translate(0, -104 + breathe);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 16, -30);
    ctx.lineTo(side * 38, -58);
    ctx.lineTo(side * 40, -16);
    ctx.closePath();
    fs(ctx, ORANGE, 4);
    ctx.beginPath();
    ctx.moveTo(side * 22, -30);
    ctx.lineTo(side * 35, -48);
    ctx.lineTo(side * 36, -24);
    ctx.closePath();
    fs(ctx, '#ff9db0', 0);
  }
  ellipse(ctx, 0, 0, 46, 40);
  fs(ctx, ORANGE);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 5;
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(dx, -38);
    ctx.lineTo(dx * 0.8, -26);
    ctx.stroke();
  }
  // gözler
  const look = s.look || { x: 0, y: 0 };
  const expr = s.expr || 'happy';
  for (const side of [-1, 1]) {
    const ex = side * 17, ey = -4;
    ellipse(ctx, ex, ey, 11, expr === 'scared' ? 16 : 14);
    fs(ctx, '#ffffff', 3);
    ctx.fillStyle = '#1b2a10';
    const pr = expr === 'scared' ? 3.5 : 6.5;
    circle(ctx, ex + look.x * 4, ey + 2 + look.y * 5, pr);
    ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, ex + look.x * 4 - 2, ey - 1 + look.y * 5, 2);
    ctx.fill();
    if ((s.blink || 0) > 0.05) {
      ctx.save();
      ellipse(ctx, ex, ey, 12, 17);
      ctx.clip();
      ctx.fillStyle = ORANGE;
      ctx.fillRect(ex - 13, ey - 17, 26, 34 * s.blink);
      ctx.restore();
    }
    if (expr === 'sad' || expr === 'scared') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - side * 10, ey - 22);
      ctx.lineTo(ex + side * 6, ey - 17);
      ctx.stroke();
    }
  }
  if (expr === 'sad' || expr === 'scared') {
    ctx.fillStyle = '#7fd0ff';
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 22, 14 + ((t * 26 + side * 8) % 24), 3, 4.5);
      ctx.fill();
    }
  }
  // burun, ağız, bıyıklar
  ctx.beginPath();
  ctx.moveTo(-6, 9);
  ctx.lineTo(6, 9);
  ctx.lineTo(0, 15);
  ctx.closePath();
  fs(ctx, '#ff7f9a', 2.5);
  const m = s.mouth || 0;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  if (m > 0.08) {
    ellipse(ctx, 0, 22 + m * 3, 7, 3 + m * 7);
    fs(ctx, '#7a1f2b', 2.5);
  } else {
    ctx.beginPath();
    ctx.arc(-5, 17, 5, 0.2, Math.PI - 0.2);
    ctx.arc(5, 17, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    for (const dy of [-3, 4]) {
      ctx.beginPath();
      ctx.moveTo(side * 22, 12 + dy);
      ctx.lineTo(side * 52, 8 + dy * 2.2);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

/** Ağaçların arasındaki gri, yüzsüz siluet. */
export function drawSilhouette(ctx, x, y, h, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  const s = h / 300;
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -300, 0, 0);
  g.addColorStop(0, 'rgba(120,120,125,.95)');
  g.addColorStop(1, 'rgba(70,72,78,.2)');
  ctx.fillStyle = g;
  ellipse(ctx, 0, -270, 20, 27);
  ctx.fill();
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
  // çok uzun kollar
  ctx.lineCap = 'round';
  ctx.strokeStyle = g;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-30, -228);
  ctx.quadraticCurveTo(-46, -150, -40, -70);
  ctx.moveTo(30, -228);
  ctx.quadraticCurveTo(46, -150, 40, -70);
  ctx.stroke();
  ctx.restore();
}

/**
 * Çizgi film estetiğine hiç uymayan, "gerçek" bir insan eli.
 * grip 0..1 parmakları büker. Gren ve hafif bulanıklıkla fotoğraf gibi durur.
 */
export function drawRealHand(ctx, x, y, scale, angle, grip = 0, t = 0) {
  const off = drawRealHand.cache || (drawRealHand.cache = document.createElement('canvas'));
  off.width = 520;
  off.height = 520;
  const c = off.getContext('2d');
  c.clearRect(0, 0, 520, 520);
  c.save();
  c.translate(260, 330);

  const skin = (x0, y0, r) => {
    const g = c.createRadialGradient(x0 - r * 0.3, y0 - r * 0.4, r * 0.1, x0, y0, r * 1.3);
    g.addColorStop(0, '#f0c4a4');
    g.addColorStop(0.55, '#cf8f6c');
    g.addColorStop(1, '#7a4634');
    return g;
  };

  // önkol
  c.beginPath();
  c.moveTo(-70, 40);
  c.quadraticCurveTo(-80, 140, -60, 220);
  c.lineTo(70, 220);
  c.quadraticCurveTo(84, 140, 66, 40);
  c.closePath();
  c.fillStyle = skin(0, 120, 120);
  c.fill();
  // kol kılları
  c.strokeStyle = 'rgba(60,35,25,.35)';
  c.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const hx = -60 + hash(i) * 120, hy = 60 + hash(i + 50) * 150;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(hx + 4 + hash(i + 3) * 4, hy - 6);
    c.stroke();
  }
  // avuç
  c.beginPath();
  c.moveTo(-74, 50);
  c.bezierCurveTo(-90, -10, -80, -70, -60, -96);
  c.lineTo(66, -100);
  c.bezierCurveTo(86, -60, 90, 0, 70, 50);
  c.closePath();
  c.fillStyle = skin(0, -20, 110);
  c.fill();
  // eklem çizgileri
  c.strokeStyle = 'rgba(90,50,40,.45)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-50, -40);
  c.quadraticCurveTo(0, -20, 50, -50);
  c.moveTo(-40, 10);
  c.quadraticCurveTo(10, -5, 40, 20);
  c.stroke();

  // parmaklar
  const fingers = [
    { x: -52, len: 104, w: 30, a: -0.12 },
    { x: -16, len: 124, w: 31, a: -0.03 },
    { x: 20, len: 116, w: 30, a: 0.05 },
    { x: 54, len: 92, w: 26, a: 0.14 },
  ];
  fingers.forEach((f, i) => {
    c.save();
    c.translate(f.x, -92);
    c.rotate(f.a + Math.sin(t * 3 + i) * 0.02);
    let segLen = f.len / 3;
    let w = f.w;
    for (let k = 0; k < 3; k++) {
      const bend = grip * (0.55 + k * 0.25);
      c.rotate(bend * (k === 0 ? 0.6 : 1));
      c.beginPath();
      c.moveTo(-w / 2, 4);
      c.lineTo(-w / 2 + 1.5, -segLen);
      c.quadraticCurveTo(0, -segLen - w * 0.35, w / 2 - 1.5, -segLen);
      c.lineTo(w / 2, 4);
      c.closePath();
      c.fillStyle = skin(0, -segLen / 2, segLen);
      c.fill();
      c.strokeStyle = 'rgba(90,50,40,.5)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-w / 2 + 4, -2);
      c.quadraticCurveTo(0, 3, w / 2 - 4, -2);
      c.stroke();
      if (k === 2) {
        c.beginPath();
        c.ellipse(0, -segLen + 6, w * 0.32, w * 0.42, 0, 0, Math.PI * 2);
        const ng = c.createLinearGradient(0, -segLen - 6, 0, -segLen + 14);
        ng.addColorStop(0, '#f7dccd');
        ng.addColorStop(1, '#c9988a');
        c.fillStyle = ng;
        c.fill();
        c.strokeStyle = 'rgba(80,40,30,.6)';
        c.stroke();
      }
      c.translate(0, -segLen + 2);
      w *= 0.9;
      segLen *= 0.92;
    }
    c.restore();
  });
  // başparmak
  c.save();
  c.translate(-78, 10);
  c.rotate(-0.9 + grip * 0.7);
  c.beginPath();
  c.moveTo(-17, 10);
  c.lineTo(-15, -84);
  c.quadraticCurveTo(0, -100, 15, -84);
  c.lineTo(20, 10);
  c.closePath();
  c.fillStyle = skin(0, -40, 70);
  c.fill();
  c.restore();
  c.restore();

  // fotoğraf greni (sadece elin üstünde)
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = 0.16;
  c.drawImage(grainCanvas(), -Math.floor(hash(Math.floor(t * 24)) * 200), -Math.floor(hash(Math.floor(t * 24) + 7) * 200));
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.filter = 'blur(0.7px) saturate(0.85)';
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 30;
  ctx.drawImage(off, -260, -330);
  ctx.filter = 'none';
  ctx.restore();
}

let grain = null;
function grainCanvas() {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 720;
  const g = grain.getContext('2d');
  const img = g.createImageData(720, 720);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

/** Bulunan fotoğraf: çizgi filmin içinde gerçek görünümlü bir kız fotoğrafı. */
export function drawPhoto(ctx, x, y, w, rot, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(-w / 2 - 8, -w * 0.62 - 8, w + 16, w * 1.24 + 30);
  const h = w * 1.24;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#6f7f73');
  g.addColorStop(1, '#3b463e');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // ağaçlar
  ctx.fillStyle = 'rgba(25,35,28,.8)';
  for (let i = 0; i < 6; i++) ctx.fillRect(-w / 2 + i * (w / 6) + 4, -h / 2, 5, h);
  // kız: örgülü saçlar, sarı elbise (soluk)
  ctx.fillStyle = '#2d1c14';
  ctx.beginPath();
  ctx.arc(0, -h * 0.12, w * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-w * 0.15, -h * 0.08, w * 0.04, w * 0.08, 0.3, 0, Math.PI * 2);
  ctx.ellipse(w * 0.15, -h * 0.08, w * 0.04, w * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9b788';
  ctx.beginPath();
  ctx.arc(0, -h * 0.11, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8a25a';
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, -h * 0.01);
  ctx.lineTo(w * 0.12, -h * 0.01);
  ctx.lineTo(w * 0.2, h * 0.3);
  ctx.lineTo(-w * 0.2, h * 0.3);
  ctx.closePath();
  ctx.fill();
  // yüzü çizilmiş
  ctx.strokeStyle = 'rgba(10,10,10,.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.1 + hash(i) * 4, -h * 0.17 + i * 2.4);
    ctx.lineTo(w * 0.1, -h * 0.16 + i * 2.1 + hash(i + 4) * 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2a20';
  ctx.font = '13px "Caveat", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Beste - Mayıs 98', 0, h / 2 + 18);
  // gren
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${hash(i + t) > 0.5 ? 255 : 0},${hash(i + t) > 0.5 ? 255 : 0},${hash(i + t) > 0.5 ? 255 : 0},.12)`;
    ctx.fillRect(-w / 2 + hash(i * 3.1 + Math.floor(t * 12)) * w, -h / 2 + hash(i * 7.7 + Math.floor(t * 12)) * h, 2, 2);
  }
  ctx.restore();
}

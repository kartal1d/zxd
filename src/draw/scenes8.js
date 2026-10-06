// 8. kaset ("Ebe Sensin!") sahneleri: gece Çamlık, el feneri ışığı, saklambaç kuralları tahtası,
// fenerin yakın planları, yüzü cama dayanmış Beste ve ani korkutma kareleri.
import * as S from './scenes.js';
import * as S3 from './scenes3.js';
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const { rr, fill, stroke, OUT, FONT_HAND, FONT_CARTOON } = S;
const ORANGE = '#f59a3c';
const TAIL_GREY = '#8d9096';
const SKIN = '#ffd9b8';

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

// ------------------------------------------------------------------ ışık katmanı
let lightCv = null;
function layer() {
  if (!lightCv) {
    lightCv = document.createElement('canvas');
    lightCv.width = W;
    lightCv.height = H;
  }
  return lightCv;
}

/**
 * Karanlık + el feneri.
 * o.amount: karanlığın koyuluğu (0..1)
 * o.beam: { sx, sy (fenerin ağzı; yoksa ışık izleyiciden gelir), tx, ty (vurduğu yer), r (yarıçap), pow (0..1) }
 * o.spots: [{ x, y, r, a }] ek aydınlık yerler (ay, yerdeki fener)
 */
export function lights(ctx, o = {}) {
  const cv = layer();
  const x = cv.getContext('2d');
  x.save();
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, W, H);
  x.globalAlpha = clamp(o.amount ?? 0.8, 0, 1);
  x.fillStyle = o.color || 'rgb(2,4,16)';
  x.fillRect(0, 0, W, H);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'destination-out';
  const b = o.beam;
  const pw = b ? clamp(b.pow ?? 1, 0, 1) : 0;
  if (pw > 0) {
    if (b.sx != null) {
      const dx = b.tx - b.sx, dy = b.ty - b.sy;
      const L = Math.hypot(dx, dy);
      if (L > b.r + 2) {
        const a = Math.atan2(dy, dx);
        const h = Math.asin(b.r / L);
        const tl = Math.sqrt(L * L - b.r * b.r);
        x.beginPath();
        x.moveTo(b.sx, b.sy);
        x.lineTo(b.sx + Math.cos(a - h) * tl, b.sy + Math.sin(a - h) * tl);
        x.arc(b.tx, b.ty, b.r, a - h - Math.PI / 2, a + h + Math.PI / 2);
        x.closePath();
        const lg = x.createLinearGradient(b.sx, b.sy, b.tx, b.ty);
        lg.addColorStop(0, `rgba(0,0,0,${0.7 * pw})`);
        lg.addColorStop(1, `rgba(0,0,0,${0.42 * pw})`);
        x.fillStyle = lg;
        x.fill();
      }
    }
    const rg = x.createRadialGradient(b.tx, b.ty, 0, b.tx, b.ty, b.r * 1.4);
    rg.addColorStop(0, `rgba(0,0,0,${pw})`);
    rg.addColorStop(0.62, `rgba(0,0,0,${0.92 * pw})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg;
    x.fillRect(b.tx - b.r * 1.4, b.ty - b.r * 1.4, b.r * 2.8, b.r * 2.8);
  }
  for (const s of o.spots || []) {
    const g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, `rgba(0,0,0,${s.a ?? 0.8})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  x.restore();
  ctx.drawImage(cv, 0, 0);
  // fenerin sıcak parıltısı (ışık eklenir)
  if (pw > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(b.tx, b.ty, 0, b.tx, b.ty, b.r * 1.3);
    g.addColorStop(0, `rgba(255,222,150,${0.2 * pw})`);
    g.addColorStop(1, 'rgba(255,222,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.tx - b.r * 1.3, b.ty - b.r * 1.3, b.r * 2.6, b.r * 2.6);
    ctx.restore();
  }
}

/** Fener objektife dönünce beyaz parlama (bloom). low: ışık hassasiyeti ayarı açıksa çok daha hafif. */
export function bloom(ctx, x, y, k, low = false) {
  if (k <= 0.001) return;
  const kk = low ? k * 0.4 : k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + kk * 560);
  g.addColorStop(0, `rgba(255,250,228,${kk})`);
  g.addColorStop(0.3, `rgba(255,236,184,${0.65 * kk})`);
  g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(255,246,220,${0.45 * kk})`;
  ctx.fillRect(0, y - 4 * kk, W, 8 * kk);
  ctx.restore();
  if (kk > 0.55) {
    ctx.fillStyle = `rgba(255,252,240,${Math.min(0.9, (kk - 0.55) * 2)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Görüntü yırtılması: yatay şeritler kayar (k 0..1). */
export function tear(ctx, k, t) {
  if (k <= 0.01) return;
  const f = Math.floor(t * 30);
  for (let i = 0; i < 7; i++) {
    const y = Math.floor(hash(f * 7 + i) * H);
    const h = 6 + Math.floor(hash(f * 13 + i) * 34);
    const dx = (hash(f * 3 + i * 11) - 0.5) * 140 * k;
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
  }
  ctx.fillStyle = `rgba(255,255,255,${0.12 * k})`;
  ctx.fillRect(0, Math.floor(hash(f + 99) * H), W, 2);
}

// ------------------------------------------------------------------ jenerik
/** Donmuş gece jeneriği: koyu mavi, yıldızlar dönmüyor, gri gökkuşağı. */
export function nightTitle(ctx, o = {}) {
  S.titleCard(ctx, 0, { episode: o.episode, title: o.title, decay: 1 });
  ctx.save();
  ctx.fillStyle = 'rgba(10,22,80,.32)';
  ctx.fillRect(0, 0, W, H);
  // kıpırtısız iğne ucu yıldızlar
  ctx.fillStyle = 'rgba(220,226,255,.7)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(hash(i * 3.1) * W), Math.floor(hash(i * 7.7) * 140), 2, 2);
  const g = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 430);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,20,.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------ orman
function moon(ctx, x, y) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 10, x, y, 90);
  g.addColorStop(0, 'rgba(220,230,255,.35)');
  g.addColorStop(1, 'rgba(220,230,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 90, y - 90, 180, 180);
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  fill(ctx, '#eef0dc');
  stroke(ctx, 3);
  ctx.fillStyle = 'rgba(160,160,140,.45)';
  for (const [dx, dy, r] of [[-8, -6, 6], [7, 6, 4], [-2, 10, 3]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Gece Çamlık: tape 1'in ormanı, karanlık. o.dark (0..1), o.basket (eski sepet örtünün üstünde),
 * o.tonton (yüzüstü düşmüş dikişli Tonton), o.stumpMan (gizli kare: kütüğün arkasına çömelmiş adam)
 */
export function forest(ctx, t, o = {}) {
  S.bgForest(ctx, t, { dark: o.dark ?? 0.8, basket: o.basket ? [] : null, carving: o.carving ?? 1 });
  moon(ctx, 566, 62);
  if (o.basket) {
    // ıslak, eski sepet: üstüne koyu bir katman
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(250, 418, 64, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,28,30,.45)';
    ctx.fill();
    ctx.restore();
  }
  if (o.stumpMan) stumpMan(ctx, t);
  if (o.tonton) tontonDown(ctx, 598, 456, 0.62, t);
}

/** Kütüğün arkasına çömelmiş gri adam: yalnızca kütüğün üstünden görünen kısmı (baş kameraya dönük, parmaklar kenarda). */
function stumpMan(ctx, t) {
  ctx.save();
  ctx.fillStyle = '#7d7e85';
  ctx.strokeStyle = '#7d7e85';
  // omuz kamburu (kütüğün sağından)
  ctx.beginPath();
  ctx.moveTo(428, 384);
  ctx.quadraticCurveTo(432, 330, 452, 326);
  ctx.quadraticCurveTo(468, 340, 462, 388);
  ctx.closePath();
  ctx.fill();
  // boyun ve baş: kütüğün üstünden, kameraya dönük, yüzsüz
  ctx.fillRect(414, 316, 12, 20);
  ctx.save();
  ctx.translate(421, 306);
  ctx.rotate(-0.32);
  ellipse(ctx, 0, 0, 16, 21);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ellipse(ctx, -4, -6, 8, 10);
  ctx.fill();
  ctx.restore();
  // kütüğün kenarına sarkan uzun parmaklar
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const x0 = 372 + i * 9;
    ctx.beginPath();
    ctx.moveTo(x0, 336);
    ctx.quadraticCurveTo(x0 - 3, 346, x0 - 2, 360 + (i === 1 || i === 2 ? 6 : 0));
    ctx.stroke();
  }
  ctx.restore();
}

/** Yüzüstü düşmüş dikişli Tonton: atılmış bir oyuncak gibi, hiç kıpırdamaz. */
export function tontonDown(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // gölge
  ellipse(ctx, 0, 8, 86, 12);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  // gri kuyruk (başka kumaştan), havaya dikilmiş
  ctx.beginPath();
  ctx.moveTo(44, -16);
  ctx.bezierCurveTo(72, -18, 86, -40, 80, -70);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = TAIL_GREY;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,42,48,.6)';
  ctx.lineWidth = 2;
  for (const [px, py] of [[60, -20], [74, -32], [80, -48], [79, -62]]) {
    ctx.beginPath();
    ctx.moveTo(px - 4, py + 3);
    ctx.lineTo(px + 4, py - 3);
    ctx.moveTo(px - 4, py - 3);
    ctx.lineTo(px + 4, py + 3);
    ctx.stroke();
  }
  // arka patiler
  for (const dx of [26, 46]) {
    ellipse(ctx, dx, 2, 12, 8, 0.2);
    ctx.fillStyle = ORANGE;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  // gövde (sırtı görünür)
  ellipse(ctx, 8, -16, 50, 24);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // sırt dikişi
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -24);
  ctx.quadraticCurveTo(8, -40, 44, -22);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const px = -26 + i * 8.5;
    const py = -27 - Math.sin((i / 8) * Math.PI) * 9;
    ctx.beginPath();
    ctx.moveTo(px - 3, py - 4);
    ctx.lineTo(px + 3, py + 4);
    ctx.stroke();
  }
  // ön pati, yana açılmış
  ellipse(ctx, -14, 4, 13, 7, -0.3);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // baş: yüzü toprağa gömülü, ensesi görünür
  ctx.save();
  ctx.translate(-48, -14);
  ctx.rotate(-0.25);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 12 - 8, -16);
    ctx.lineTo(side * 22 - 18, -30 + side * 4);
    ctx.lineTo(side * 26 - 4, -10);
    ctx.closePath();
    ctx.fillStyle = ORANGE;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  ellipse(ctx, 0, 0, 27, 24);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // ense dikişi
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -22);
  ctx.lineTo(4, 20);
  ctx.stroke();
  // yüzün toprağa değdiği yer
  ellipse(ctx, -14, 18, 16, 6);
  ctx.fillStyle = 'rgba(20,12,6,.6)';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Beste'nin elindeki sarı el feneri. ang: fenerin baktığı açı. Dönen nokta: fenerin camı. */
export function flashlight(ctx, x, y, ang, s = 1, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.front) {
    // objektife dönük: yalnızca cam ve halka
    ellipse(ctx, 0, 0, 13, 13);
    fill(ctx, '#ffd23f');
    stroke(ctx, 3.5);
    ellipse(ctx, 0, 0, 8.5, 8.5);
    fill(ctx, '#fffbe8');
    ctx.restore();
    return { x, y };
  }
  ctx.rotate(ang);
  ctx.lineJoin = 'round';
  rr(ctx, -14, -6, 32, 12, 4);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3.5);
  ctx.beginPath();
  ctx.moveTo(16, -7);
  ctx.lineTo(30, -11);
  ctx.lineTo(30, 11);
  ctx.lineTo(16, 7);
  ctx.closePath();
  fill(ctx, '#e8b820');
  stroke(ctx, 3.5);
  ellipse(ctx, 30, 0, 3, 10.5);
  fill(ctx, '#fffbe8');
  stroke(ctx, 2.5);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-4, -7, 6, 3);
  ctx.restore();
  return { x: x + Math.cos(ang) * 31 * s, y: y + Math.sin(ang) * 31 * s };
}

/** Yere düşmüş, ışığı kameraya dönük fener (göz kamaştıran cam + parlama). */
export function droppedLight(ctx, x, y, t, k = 1) {
  ctx.save();
  // gövde: kısaltılmış perspektif, cam bize bakıyor
  ellipse(ctx, x + 22, y + 6, 26, 9, 0.12);
  fill(ctx, '#d9b02a');
  stroke(ctx, 3);
  ellipse(ctx, x, y, 15, 14);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3);
  ellipse(ctx, x, y, 10, 9.5);
  fill(ctx, '#fffbe8');
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.85 + Math.sin(t * 13) * 0.04 + (hash(Math.floor(t * 20)) - 0.5) * 0.05;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 150 * k);
  g.addColorStop(0, `rgba(255,248,215,${0.95 * fl * k})`);
  g.addColorStop(0.2, `rgba(255,232,170,${0.4 * fl * k})`);
  g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 150, y - 150, 300, 300);
  ctx.fillStyle = `rgba(255,245,220,${0.32 * fl * k})`;
  ctx.fillRect(x - 220, y - 2, 440, 4);
  ctx.restore();
}

// ------------------------------------------------------------------ saklambaç kuralları tahtası
export const RULES8 = ['1. Ebe ona kadar sayar.', '2. Sayarken gözünü açan yanar.', '3. İlk sobelenen ebe olur.', '4. Oyun, herkes bulununca biter.'];
export const RULE5 = '5. Ebe hiç ölmez.';
export const BOARD = { x: 14, y: 30, w: 486, h: 326, ruleX: 50, ruleY: 146, gap: 42, fig: { x: 440, y: 64 } };

/** Tebeşir çizgisi: biraz pürüzlü, iki geçişli. */
function chalkPath(ctx, pts, w, a, seed = 0, color = '240,240,232') {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let p = 0; p < 2; p++) {
    ctx.strokeStyle = `rgba(${color},${a * (p ? 0.45 : 0.85)})`;
    ctx.lineWidth = w * (p ? 1.6 : 1);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = (hash(seed + i * 3 + p * 17) - 0.5) * w * 0.6;
      const jy = (hash(seed + i * 5 + p * 23) - 0.5) * w * 0.6;
      if (i) ctx.lineTo(x + jx, y + jy);
      else ctx.moveTo(x + jx, y + jy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

function chalkText(ctx, text, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || `700 28px ${FONT_HAND}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'middle';
  const col = o.color || '240,240,232';
  const a = o.alpha ?? 1;
  if (o.glow) {
    ctx.shadowColor = `rgba(${col},${0.8 * a})`;
    ctx.shadowBlur = o.glow;
  }
  ctx.fillStyle = `rgba(${col},${0.35 * a})`;
  ctx.fillText(text, x + 1.2, y + 0.8);
  ctx.fillStyle = `rgba(${col},${0.9 * a})`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Tebeşirle çizilmiş uzun, yüzsüz adam (ayakları y'de değil, başı (x,y)'de). k: büyüklük, tilt: baş eğimi.
 * color: '240,240,232' (beyaz tebeşir) ya da kırmızı.
 */
export function chalkFigure(ctx, x, y, k = 1, o = {}) {
  const a = o.alpha ?? 1;
  const seed = o.seed ?? 3;
  const col = o.color;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  // baş: yüzsüz oval
  ctx.save();
  ctx.rotate(o.tilt || 0);
  const head = [];
  for (let i = 0; i <= 14; i++) {
    const an = (i / 14) * Math.PI * 2;
    head.push([Math.cos(an) * 8, Math.sin(an) * 11]);
  }
  chalkPath(ctx, head, 2.2, a, seed, col);
  ctx.restore();
  // gövde, kollar (dizlere kadar), bacaklar
  chalkPath(ctx, [[0, 11], [0, 62]], 2.4, a, seed + 40, col);
  chalkPath(ctx, [[0, 18], [-13, 44], [-15, 74]], 2, a, seed + 50, col);
  chalkPath(ctx, [[0, 18], [13, 44], [15, 74]], 2, a, seed + 60, col);
  for (const sx of [-1, 1]) for (let f = 0; f < 3; f++) chalkPath(ctx, [[sx * 15, 74], [sx * (14 + f * 2.5), 82 + f]], 1.2, a * 0.8, seed + 70 + f + sx * 5, col);
  chalkPath(ctx, [[0, 62], [-9, 100]], 2.3, a, seed + 80, col);
  chalkPath(ctx, [[0, 62], [9, 100]], 2.3, a, seed + 90, col);
  ctx.restore();
}

/**
 * Gece, ağaçların önünde ayaklı bir kara tahta: 'SAKLAMBAÇ KURALLARI'.
 * o.shown (kaç kural), o.highlight (0..3), o.red3 (0..1: 3. kural kendiliğinden kırmızıyla yeniden yazılır),
 * o.figure (köşedeki tebeşir adam; false ise yok), o.figTilt, o.label (0..1: altına 'EBE' yazılıyor)
 */
export function rulesBoard(ctx, t, o = {}) {
  const B = BOARD;
  S.bgForest(ctx, t, { dark: 0.92, carving: 0 });
  moon(ctx, 566, 62);
  // ayaklar
  ctx.save();
  ctx.lineCap = 'round';
  for (const [x0, x1] of [[70, 50], [440, 462]]) {
    ctx.beginPath();
    ctx.moveTo(x0, B.y + B.h - 10);
    ctx.lineTo(x1, 470);
    ctx.lineWidth = 16;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#7a4a26';
    ctx.stroke();
  }
  ctx.restore();
  // çerçeve ve tahta
  rr(ctx, B.x, B.y, B.w, B.h, 8);
  fill(ctx, '#8a5a2e');
  stroke(ctx, 4);
  ctx.fillStyle = '#1f2c25';
  ctx.fillRect(B.x + 14, B.y + 14, B.w - 28, B.h - 28);
  // eski silinti izleri
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#c8d0c8';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(B.x + 60 + hash(i + 2) * 380, B.y + 60 + hash(i + 9) * 220, 60 + hash(i) * 50, 14, hash(i + 4) - 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // tebeşir kutusu
  ctx.fillStyle = '#6a4220';
  ctx.fillRect(B.x + 20, B.y + B.h - 6, B.w - 40, 8);
  ctx.fillStyle = '#f2f0e6';
  ctx.fillRect(B.x + 60, B.y + B.h - 10, 22, 5);
  ctx.fillStyle = '#e88';
  ctx.fillRect(B.x + 92, B.y + B.h - 10, 16, 5);
  // başlık
  chalkText(ctx, 'SAKLAMBAÇ KURALLARI', B.ruleX, B.y + 52, { font: `700 34px ${FONT_HAND}` });
  chalkPath(ctx, [[B.ruleX, B.y + 74], [B.ruleX + 300, B.y + 72]], 2.6, 0.85, 7);
  // kurallar
  const shown = o.shown ?? 4;
  RULES8.slice(0, shown).forEach((r, i) => {
    const y = B.ruleY + i * B.gap;
    if (i === 2 && o.red3 > 0) {
      // eski yazı silinir, kırmızı tebeşir yeniden yazar (soldan sağa açılır)
      chalkText(ctx, r, B.ruleX, y, { alpha: 1 - o.red3 });
      ctx.save();
      ctx.beginPath();
      ctx.rect(B.ruleX - 10, y - 24, 20 + o.red3 * 420, 48);
      ctx.clip();
      chalkText(ctx, r.toLocaleUpperCase('tr'), B.ruleX, y, { color: '255,80,64', font: `700 29px ${FONT_HAND}` });
      ctx.restore();
      return;
    }
    chalkText(ctx, r, B.ruleX, y, o.highlight === i ? { color: '255,226,90' } : {});
  });
  // köşedeki tebeşir adam ve adı
  const F = B.fig;
  if (o.figure !== false) chalkFigure(ctx, F.x, F.y, 1, { tilt: o.figTilt || 0 });
  if (o.label > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(F.x - 34, F.y + 106, 68 * clamp(o.label, 0, 1), 40);
    ctx.clip();
    chalkText(ctx, 'EBE', F.x, F.y + 128, { align: 'center', font: `700 32px ${FONT_HAND}`, color: '255,226,90' });
    ctx.restore();
  }
}

/** Yalnızca duraklatılmış karede: kırmızı beşinci kural ve yürüyen tebeşir adam (karanlığın üstüne, parlayarak). */
export function boardPausedLayer(ctx, o = {}) {
  const B = BOARD;
  if (o.fifth > 0) {
    chalkText(ctx, RULE5, B.ruleX, B.ruleY + 4 * B.gap, { color: '255,60,48', alpha: o.fifth, glow: 14, font: `700 30px ${FONT_HAND}` });
  }
  const f = o.walk;
  if (f) chalkFigure(ctx, f.x, f.y, f.k, { tilt: f.tilt || 0, alpha: f.alpha ?? 0.6, seed: 11 });
}

// ------------------------------------------------------------------ fenerin yakın planları
function handheld(t, amp = 6) {
  return { x: Math.sin(t * 1.3) * amp + Math.sin(t * 3.1) * amp * 0.3, y: Math.cos(t * 1.1) * amp * 0.7 };
}

/** Çalının altında küçük, gri bir çocuk ayakkabısı. */
export function closeShoe(ctx, t) {
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(0, 0, W, H);
  // toprak ve yapraklar
  for (let i = 0; i < 60; i++) {
    const x = hash(i * 3) * W, y = 200 + hash(i * 7) * 280;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hash(i) * 6);
    ellipse(ctx, 0, 0, 14 + hash(i + 1) * 10, 5 + hash(i + 2) * 4);
    ctx.fillStyle = ['#4a3a1e', '#5a4422', '#3d4a24', '#6a4a24'][i % 4];
    ctx.fill();
    ctx.restore();
  }
  // üstte sarkan çalı
  for (const [x, y, r] of [[60, 40, 120], [250, 10, 140], [470, 30, 130], [620, 60, 110]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    fill(ctx, '#1f4a26');
    stroke(ctx, 5);
  }
  ctx.save();
  ctx.translate(320, 318);
  ctx.rotate(-0.12);
  // taban
  rr(ctx, -120, 20, 250, 30, 16);
  fill(ctx, '#3c3d42');
  stroke(ctx, 5);
  // gövde (bez babet, gri, solmuş)
  ctx.beginPath();
  ctx.moveTo(-118, 26);
  ctx.quadraticCurveTo(-130, -40, -40, -46);
  ctx.lineTo(70, -36);
  ctx.quadraticCurveTo(132, -24, 128, 26);
  ctx.closePath();
  fill(ctx, '#7c7f86');
  stroke(ctx, 5);
  // ağız
  ellipse(ctx, -30, -30, 56, 16, 0.05);
  fill(ctx, '#2b2a2e');
  stroke(ctx, 4);
  // kayış ve toka
  ctx.beginPath();
  ctx.moveTo(-60, -38);
  ctx.quadraticCurveTo(-20, -80, 30, -40);
  ctx.lineWidth = 14;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#6a6c72';
  ctx.stroke();
  rr(ctx, 22, -50, 18, 18, 3);
  fill(ctx, '#b9b49a');
  stroke(ctx, 3);
  // çamur lekeleri
  ctx.fillStyle = 'rgba(70,50,25,.55)';
  for (const [x, y, r] of [[60, 0, 22], [-90, 8, 16], [100, 14, 12]]) {
    ellipse(ctx, x, y, r, r * 0.6);
    ctx.fill();
  }
  ctx.restore();
}

/** Tape 1'in piknik sepeti: eski, ıslak, içinde kangal yapılmış bir ip. */
export function closeBasket(ctx, t) {
  ctx.fillStyle = '#1d2418';
  ctx.fillRect(0, 0, W, H);
  // ıslak çimen
  ctx.strokeStyle = '#2c3e22';
  ctx.lineWidth = 3;
  for (let i = 0; i < 90; i++) {
    const x = hash(i * 5) * W, y = 300 + hash(i * 9) * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (hash(i) - 0.5) * 14, y - 18 - hash(i + 3) * 20);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(320, 400);
  ctx.scale(2.6, 2.6);
  // kangal ip (sepetin içinde, kenarın üstünden görünür)
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, -4 + i * 2, -46 - i * 3.2, 36 - i * 5, 8 - i);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = '#bba476';
    ctx.stroke();
  }
  // ipin sarkan ucu
  ctx.beginPath();
  ctx.moveTo(30, -46);
  ctx.quadraticCurveTo(62, -40, 58, -4);
  ctx.quadraticCurveTo(56, 12, 70, 18);
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = '#bba476';
  ctx.stroke();
  S.drawBasket(ctx, 0, 0, []);
  ctx.restore();
  // ıslaklık ve yosun: sepetin üstüne koyu katman
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#5d6f6a';
  ctx.fillRect(150, 160, 340, 260);
  ctx.restore();
  ctx.fillStyle = 'rgba(80,120,60,.45)';
  for (let i = 0; i < 14; i++) {
    ellipse(ctx, 200 + hash(i * 3) * 240, 330 + hash(i * 5) * 60, 6 + hash(i) * 8, 3 + hash(i + 1) * 3);
    ctx.fill();
  }
  // damlalar
  ctx.fillStyle = 'rgba(200,220,255,.5)';
  for (let i = 0; i < 5; i++) {
    const x = 210 + i * 52;
    const y = 404 + ((t * 40 + i * 37) % 60);
    ellipse(ctx, x, y, 2.5, 4);
    ctx.fill();
  }
}

/** Ağaçtaki oyma: B.A. 14.05 ve altına yeni kazınmış bir ad. */
export function closeCarving(ctx, t, o = {}) {
  S.treeCarving(ctx, t, { top: 'B.A.', big: '14.05', bigSize: 150 });
  if (!o.name) return;
  // taze kazıntı: daha açık renk, keskin kenarlar, etrafında talaş
  ctx.save();
  ctx.translate(W / 2, 396);
  ctx.rotate(0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'miter';
  ctx.font = `800 ${o.name.length > 10 ? 34 : 44}px ${FONT_CARTOON}`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#4a1e08';
  ctx.strokeText(o.name, 0, 0);
  ctx.fillStyle = '#fff6e2';
  ctx.fillText(o.name, 0, 0);
  ctx.restore();
  ctx.fillStyle = '#f7e2bf';
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(150 + hash(i * 3) * 340, 420 + hash(i * 7) * 50);
    ctx.rotate(hash(i) * 3);
    ctx.fillRect(-5, -1.5, 10, 3);
    ctx.restore();
  }
}

/** Kütüğün içi: boş bir kovuk. */
export function closeStump(ctx, t) {
  ctx.fillStyle = '#1c2416';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(320, 250);
  ellipse(ctx, 0, 40, 270, 150);
  fill(ctx, '#6e4422');
  stroke(ctx, 6);
  ellipse(ctx, 0, 0, 260, 140);
  fill(ctx, '#c9925a');
  stroke(ctx, 5);
  ctx.strokeStyle = 'rgba(110,60,25,.55)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ellipse(ctx, 0, 0, 260 - i * 34, 140 - i * 19);
    ctx.stroke();
  }
  // kovuk
  const g = ctx.createRadialGradient(0, 12, 6, 0, 0, 120);
  g.addColorStop(0, '#000');
  g.addColorStop(0.7, '#0a0604');
  g.addColorStop(1, '#3a2210');
  ellipse(ctx, 0, 6, 130, 70);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // yosun
  ctx.fillStyle = 'rgba(90,130,60,.6)';
  for (let i = 0; i < 10; i++) {
    const a = hash(i) * Math.PI * 2;
    ellipse(ctx, Math.cos(a) * 220, Math.sin(a) * 110, 18, 7, a);
    ctx.fill();
  }
  ctx.restore();
}

/** Yakın plan + izleyicinin elindeki fenerin ışığı (hafifçe titreyen el). */
export function closeLit(ctx, t, draw, o = {}) {
  draw(ctx, t);
  const h = handheld(t, 5);
  lights(ctx, { amount: o.amount ?? 0.9, beam: { tx: 320 + h.x, ty: 260 + h.y, r: o.r ?? 215, pow: o.pow ?? 1 } });
}

// ------------------------------------------------------------------ ani korkutmalar
/** KORKUTMA 1: köşedeki tebeşir adam tahtadan üstüne atlar. */
export function chalkScare(ctx, t) {
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 22;
  const jy = (hash(Math.floor(t * 40) + 5) - 0.5) * 16;
  const k = 1 + Math.min(t, 0.5) * 0.3;
  ctx.fillStyle = '#16211b';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#d8dcd4';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(hash(i + 31) * W, hash(i + 17) * H, 80 + hash(i) * 90, 18, hash(i + 2) - 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(W / 2 + jx, 60 + jy);
  ctx.scale(k, k);
  const seed = Math.floor(t * 12) * 7;
  // dev, yüzsüz baş
  const head = [];
  for (let i = 0; i <= 22; i++) {
    const an = (i / 22) * Math.PI * 2;
    head.push([Math.cos(an) * 120, 150 + Math.sin(an) * 165]);
  }
  chalkPath(ctx, head, 9, 1, seed);
  // tebeşir taraması (yüz olması gereken yer karalanmış)
  for (let i = 0; i < 9; i++) chalkPath(ctx, [[-90 + i * 20, 80 + (i % 2) * 10], [-60 + i * 20, 230 - (i % 3) * 12]], 4, 0.55, seed + i * 9);
  // boyun, omuzlar ve öne uzanan kollar
  chalkPath(ctx, [[0, 315], [0, 380]], 10, 1, seed + 3);
  chalkPath(ctx, [[-30, 370], [-220, 330], [-330, 430]], 8, 1, seed + 5);
  chalkPath(ctx, [[30, 370], [220, 330], [330, 430]], 8, 1, seed + 6);
  for (const sx of [-1, 1]) for (let f = 0; f < 4; f++) chalkPath(ctx, [[sx * 330, 430], [sx * (300 + f * 18), 490 + f * 6]], 4, 0.9, seed + 20 + f * 3 + sx);
  ctx.restore();
  chalkText(ctx, 'EBE', 120 + jx, 410 + jy, { align: 'center', font: `700 90px ${FONT_HAND}`, color: '255,80,64' });
}

/** KORKUTMA 2: yerden kaldırılan fenerin ışığında, objektifin dibinde yüzsüz gri bir baş. */
export function beamFace(ctx, t) {
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 20;
  const jy = (hash(Math.floor(t * 40) + 3) - 0.5) * 14;
  ctx.fillStyle = '#020204';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + jx, H / 2 + 30 + jy);
  const k = 1 + Math.min(t, 0.5) * 0.25;
  ctx.scale(k, k);
  // fenerin ışık dairesi
  const g = ctx.createRadialGradient(0, -20, 30, 0, 0, 300);
  g.addColorStop(0, 'rgba(120,112,96,1)');
  g.addColorStop(0.75, 'rgba(40,36,30,1)');
  g.addColorStop(1, 'rgba(2,2,4,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 300, 0, Math.PI * 2);
  ctx.fill();
  // omuzlar
  ctx.fillStyle = '#4f5056';
  ctx.beginPath();
  ctx.moveTo(-330, 300);
  ctx.quadraticCurveTo(-250, 140, -80, 150);
  ctx.lineTo(80, 150);
  ctx.quadraticCurveTo(250, 140, 330, 300);
  ctx.closePath();
  ctx.fill();
  // yüzsüz baş, önden aydınlanmış
  const hg = ctx.createRadialGradient(-20, -60, 20, 0, -30, 240);
  hg.addColorStop(0, '#c9c9cc');
  hg.addColorStop(0.55, '#86878d');
  hg.addColorStop(1, '#3a3b40');
  ctx.fillStyle = hg;
  ellipse(ctx, 0, -40, 170, 225);
  ctx.fill();
  // yüz olması gereken yerde hafif çukurlar (göz yok)
  ctx.fillStyle = 'rgba(40,40,46,.18)';
  ellipse(ctx, -58, -70, 40, 26);
  ctx.fill();
  ellipse(ctx, 58, -70, 40, 26);
  ctx.fill();
  // objektife uzanan uzun parmaklar
  ctx.strokeStyle = '#9a9ba0';
  ctx.lineCap = 'round';
  for (let f = 0; f < 4; f++) {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-250 + f * 34, 330);
    ctx.quadraticCurveTo(-260 + f * 30, 120, -200 + f * 26, 40 - (f === 1 || f === 2 ? 30 : 0));
    ctx.stroke();
  }
  ctx.restore();
  // fenerin parlaması
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 260);
  fl.addColorStop(0, 'rgba(255,240,200,.35)');
  fl.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let y = Math.floor(t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

/**
 * KORKUTMA 3 ve ardından: Beste'nin yüzü içeriden cama yapışmış gibi, aşırı yakın plan.
 * drawB(ctx, over) Beste'yi çizer. o.scare: ilk anın titremesi ve kırmızı kenar.
 */
export function pressedFace(ctx, t, drawB, o = {}) {
  ctx.fillStyle = '#030305';
  ctx.fillRect(0, 0, W, H);
  const s = o.scale ?? 3.1;
  const sh = o.scare ? 1 : 0.15;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 16 * sh;
  const jy = (hash(Math.floor(t * 40) + 7) - 0.5) * 10 * sh;
  ctx.save();
  // cama bastırılmış: hafifçe yassı
  ctx.translate(W / 2, H / 2);
  ctx.scale(1.07, 0.97);
  ctx.translate(-W / 2, -H / 2);
  drawB(ctx, { x: 320 + jx, y: 250 + 199 * s + jy, scale: s, expr: 'void', look: { x: 0, y: 0 }, blink: 0, mouth: 0, tilt: 0.04, flip: false, wave: 0, back: false });
  ctx.restore();
  // camın değdiği yerler: burun ucu ve yanaklar solgun
  ctx.fillStyle = 'rgba(255,248,240,.32)';
  ellipse(ctx, 320 + jx, 254 + 8 * s + jy, 20, 13);
  ctx.fill();
  for (const sx of [-1, 1]) {
    ellipse(ctx, 320 + sx * 36 * s + jx, 250 + 22 * s + jy, 30, 20);
    ctx.fill();
  }
  // nefes buğusu (ağzın önünde, nefesle büyüyüp küçülür)
  const br = 0.5 + Math.sin(t * 2.2) * 0.5;
  const fg = ctx.createRadialGradient(320, 250 + 30 * s, 10, 320, 250 + 30 * s, 110 + br * 40);
  fg.addColorStop(0, `rgba(230,236,240,${0.28 + br * 0.12})`);
  fg.addColorStop(1, 'rgba(230,236,240,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, W, H);
  // cama bastırılmış iki küçük el
  for (const sx of [-1, 1]) palm(ctx, 320 + sx * 232 + jx, 400 + jy, sx);
  // cam yansıması
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(160,180,220,.07)';
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.lineTo(170, 0);
  ctx.lineTo(40, H);
  ctx.lineTo(-50, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (o.scare) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(140,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

function palm(ctx, x, y, side) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side, 1);
  ctx.lineJoin = 'round';
  // parmaklar (cama yapışık, uçları solgun)
  for (let f = 0; f < 4; f++) {
    const a = -1.95 + f * 0.32;
    const len = f === 1 || f === 2 ? 70 : 60;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    rr(ctx, -11, -len - 30, 22, len, 11);
    fill(ctx, SKIN);
    stroke(ctx, 4);
    ellipse(ctx, 0, -len - 18, 7, 9);
    ctx.fillStyle = 'rgba(255,250,244,.85)';
    ctx.fill();
    ctx.restore();
  }
  // başparmak
  ctx.save();
  ctx.rotate(0.9);
  rr(ctx, -10, -66, 20, 46, 10);
  fill(ctx, SKIN);
  stroke(ctx, 4);
  ctx.restore();
  ellipse(ctx, 0, 0, 52, 46);
  fill(ctx, SKIN);
  stroke(ctx, 4);
  ellipse(ctx, -4, -4, 30, 24);
  ctx.fillStyle = 'rgba(255,250,244,.6)';
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ kurgu makası
/** Kurgucunun beyaz lideri (3. kasetteki gibi), bu bandın etiketiyle. */
export function splice(ctx, t, o = {}) {
  S3.spliceLeader(ctx, t, o);
  ctx.fillStyle = o.dim ? '#a9a59b' : '#f3f0e6';
  ctx.fillRect(52, 18, 190, 44);
  ctx.fillStyle = '#a3121a';
  ctx.font = `700 30px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('B-8 / 14', 60, 40);
}

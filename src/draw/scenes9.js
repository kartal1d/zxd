// 9. kaset ("HAM KAYIT") sahneleri: kurgu odası, lider geri sayımı, stüdyo ses kaydı, klaket,
// doğal kamera görüntüsü (çizgi yok: bulanık düz şekiller + gren), bilgi formu, REC karesi,
// adamın bakışı, yüzüne Beste'nin çizilmiş yüzü maske gibi takılı yüzsüz adam ve ani korkutma kareleri.
import * as S from './scenes.js';
import * as S3 from './scenes3.js';
import { drawSilhouette } from './characters.js';
import { hash, clamp, lerp, smooth } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const { rr, FONT_OSD, FONT_HAND, FONT_CARTOON } = S;
export const MONO = '"Courier New", "Liberation Mono", monospace';
const pad = (n, l = 2) => String(Math.floor(Math.max(0, n))).padStart(l, '0');

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}


/**
 * ctx.filter = blur() her çizim çağrısına ayrı uygulandığı için yazılım çiziminde çok yavaştır (kare başına saniyeler).
 * Bunun yerine sahneyi küçük bir tuvale çizip büyüterek yumuşatırız (ucuz, kamera görüntüsü gibi bulanık).
 * key: önbellek tuvalinin adı, scale: çözünürlük oranı (küçüldükçe daha bulanık), alpha: bindirme saydamlığı.
 */
const SOFT = {};
function soft(ctx, key, fn, scale = 0.5, alpha = 1) {
  const w = Math.max(8, Math.round(W * scale));
  const h = Math.max(8, Math.round(H * scale));
  const id = `${key}@${w}`;
  let o = SOFT[id];
  if (!o) {
    o = SOFT[id] = document.createElement('canvas');
    o.width = w;
    o.height = h;
  }
  const c = o.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  c.scale(w / W, h / H);
  fn(c);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(o, 0, 0, W, H);
  ctx.restore();
}

/** Deck zaman kodu: 01:00:00:00 (25 kare) */
export function tcString(sec, base = 3600) {
  const tot = base + Math.max(0, sec);
  return `${pad(tot / 3600)}:${pad((tot / 60) % 60)}:${pad(tot % 60)}:${pad((tot % 1) * 25)}`;
}
/** Kamera damgası: saniye (günün saniyesi) -> "PER 14.05.1998 13:41:05" */
export function stampString(sec) {
  return `PER 14.05.1998 ${pad(sec / 3600)}:${pad((sec / 60) % 60)}:${pad(sec % 60)}`;
}
export const HMS = (h, m, s) => h * 3600 + m * 60 + s;

/** Sağ altta küçük deck zaman kodu */
export function timecode(ctx, text, o = {}) {
  ctx.save();
  ctx.font = `24px ${FONT_OSD}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = o.color || '#d8e6da';
  ctx.fillText('TC ' + text, W - 22, H - 12);
  ctx.restore();
}

// ------------------------------------------------------------------ lider ve künye
/** Profesyonel lider: beyaz süpürme, büyük rakam. o.n: rakam, o.frac: süpürme (0..1) */
export function leader(ctx, t, o = {}) {
  const cx = W / 2, cy = H / 2 - 8;
  ctx.fillStyle = '#16181a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a9aeac';
  ell(ctx, cx, cy, 176, 176);
  ctx.fill();
  ctx.fillStyle = 'rgba(246,248,247,.92)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 176, -Math.PI / 2, -Math.PI / 2 + clamp(o.frac ?? 0, 0, 1) * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2b3033';
  ctx.lineWidth = 3;
  for (const r of [176, 142, 64]) {
    ell(ctx, cx, cy, r, r);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(W, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H);
  ctx.stroke();
  if (o.n != null) {
    ctx.font = `230px ${FONT_OSD}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f2f4f3';
    ctx.strokeText(String(o.n), cx, cy + 8);
    ctx.fillStyle = '#1b1f21';
    ctx.fillText(String(o.n), cx, cy + 8);
  }
  ctx.font = `22px ${FONT_OSD}`;
  ctx.fillStyle = '#7d8583';
  ctx.textAlign = 'center';
  ctx.fillText('KURGU ODASI 2  ·  ARŞİV KOPYASI', cx, H - 26);
  // toz
  const f = Math.floor(t * 25);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + hash(i + f) * 0.2})`;
    ctx.fillRect(hash(i * 3 + f * 11) * W, hash(i * 7 + f * 5) * H, 1 + hash(i) * 2, 2);
  }
}

/** Daktilo künye kartı: satır satır yazılır, "YAYINLANMAZ" damgası en sonda. */
export function slateCard(ctx, t, o = {}) {
  ctx.fillStyle = '#060807';
  ctx.fillRect(0, 0, W, H);
  const lines = o.lines || ['YILDIZ ÇOCUK YAPIM', '— HAM KAYITLAR —', 'KURGU: N.', 'YAYINLANMAZ'];
  let n = Math.floor(t * (o.cps || 18));
  ctx.font = `40px ${FONT_OSD}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(160,240,180,.45)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#d4efd8';
  let y = 104;
  let all = true;
  lines.forEach((l, i) => {
    const shown = l.slice(0, Math.max(0, n));
    if (n < l.length) all = false;
    ctx.fillText(shown, 70, y);
    if (n >= 0 && n < l.length + 1 && Math.floor(t * 3) % 2 === 0) {
      ctx.fillRect(70 + ctx.measureText(shown).width + 2, y + 4, 18, 30);
    }
    n -= l.length + 5;
    y += i === 2 ? 96 : 62;
  });
  ctx.shadowBlur = 0;
  if (all && lines.length >= 4) {
    ctx.save();
    ctx.translate(W / 2 + 30, 392);
    ctx.rotate(-0.05);
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 5;
    ctx.strokeRect(-190, -34, 380, 68);
    ctx.font = `46px ${FONT_OSD}`;
    ctx.fillStyle = '#ff5a4a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YAYINLANMAZ', 0, 2);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ kurgu odası konsolu
function miniMonitor(ctx, t, mode, x, y, w, h, o = {}) {
  ctx.save();
  rr(ctx, x - 8, y - 8, w + 16, h + 16, 10);
  ctx.fillStyle = '#0a0b0b';
  ctx.fill();
  ctx.strokeStyle = '#323a3c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / W, h / H);
  if (mode === 'man') {
    ctx.fillStyle = '#25282a';
    ctx.fillRect(0, 0, W, H);
    drawSilhouette(ctx, W / 2, H - 6, 430, 0.95);
    S.staticNoise(ctx, t, 0.35);
  } else if (mode === 'void') {
    ctx.fillStyle = '#4a0006';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d9c9b8';
    ell(ctx, W / 2, 250, 150, 175);
    ctx.fill();
    ctx.fillStyle = '#000';
    ell(ctx, W / 2 - 58, 220, 40, 54);
    ctx.fill();
    ell(ctx, W / 2 + 58, 220, 40, 54);
    ctx.fill();
    ell(ctx, W / 2, 330, 24, 40);
    ctx.fill();
    S.staticNoise(ctx, t, 0.3);
  } else {
    S.staticNoise(ctx, t, mode === 'red' ? 0.85 : 0.6);
    if (mode === 'red') {
      ctx.fillStyle = 'rgba(190,0,0,.5)';
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.restore();
  // yuvarlanan çubuk
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(x, y + ((t * 36) % (h + 20)) - 10, w, 10);
  ctx.restore();
}

function vuBar(ctx, x, y, level, seed, t) {
  const n = 18;
  const lit = Math.round(clamp(level, 0, 1) * n * (0.85 + 0.15 * hash(seed + Math.floor(t * 18))));
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i >= lit ? '#1b2220' : i > n - 4 ? '#e0524a' : i > n - 7 ? '#d8b34a' : '#5cc77a';
    ctx.fillRect(x + i * 11, y, 9, 14);
  }
}

/**
 * Nermin'in kurgu masası. o.watched: izlenen klip numaraları, o.monitor: 'static'|'red'|'man'|'void',
 * o.mode: 'list' | 'scramble' (o.k: 0..1 harfler karışır) | 'final' ("14.05 · 7 · ?"),
 * o.level: ses seviyesi, o.tc: zaman kodu metni, o.deck: 'dur'|'ara'|'oynat'.
 */
export function editSuite(ctx, t, o = {}) {
  const watched = o.watched || [];
  const red = o.monitor === 'red' || o.mode === 'final' || o.mode === 'scramble';
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, red ? '#2c1111' : '#1e2425');
  bg.addColorStop(1, red ? '#130707' : '#0d1112');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.05)';
  ctx.lineWidth = 2;
  for (const y of [56, 296, 396, 462]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const dim = red ? '#b06a62' : '#6f9a7b';
  const bright = red ? '#ffb0a0' : '#d2ecd7';
  ctx.font = `20px ${FONT_OSD}`;
  ctx.fillStyle = dim;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillText('YILDIZ ÇOCUK YAPIM  ·  KURGU ODASI 2', W - 20, 16);

  // ön izleme monitörü
  miniMonitor(ctx, t, o.monitor || 'static', 28, 76, 196, 147, o);
  ctx.font = `18px ${FONT_OSD}`;
  ctx.fillStyle = dim;
  ctx.textAlign = 'left';
  ctx.fillText('ÖN İZLEME', 28, 238);
  ctx.font = `30px ${FONT_OSD}`;
  ctx.fillStyle = red ? '#ff7a6a' : '#e8c260';
  ctx.fillText(o.tc || '01:00:00:00', 28, 258);

  // klip listesi
  rr(ctx, 248, 66, 372, 226, 8);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.strokeStyle = red ? '#6a2a2a' : '#2f4a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `20px ${FONT_OSD}`;
  ctx.fillStyle = dim;
  ctx.fillText('KLİP LİSTESİ', 264, 74);
  const ROWS = [
    ['1', 'SES KAYDI — 02.05.98'],
    ['2', 'ÇAMLIK DIŞ ÇEKİM — 14.05.98'],
    ['3', 'OYUNCU BİLGİ FORMU'],
    ['4', 'N. — KİŞİSEL'],
  ];
  if (o.mode === 'final') {
    const j = Math.floor(t * 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `66px ${FONT_OSD}`;
    const toks = ['14.05', '7', '?'];
    toks.forEach((tk, i) => {
      const ox = hash(j + i * 5) > 0.88 ? (hash(j * 3 + i) - 0.5) * 26 : 0;
      ctx.fillStyle = hash(j + i * 9) > 0.93 ? '#ffffff' : '#ff4a3c';
      ctx.fillText(tk, 434 + ox, 114 + i * 62);
    });
    ctx.font = `22px ${FONT_OSD}`;
    ctx.fillStyle = '#ff8a7a';
    ctx.fillText('· · ·', 434, 266);
  } else {
    const k = o.mode === 'scramble' ? clamp(o.k ?? 0, 0, 1) : 0;
    const GL = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789#?/—';
    ROWS.forEach(([num, title], i) => {
      const y = 100 + i * 46;
      const done = watched.includes(i + 1);
      const deleted = i === 3 && done;
      let txt = deleted ? '— SİLİNDİ —' : title;
      if (k > 0) {
        const f = Math.floor(t * 12);
        txt = [...txt].map((ch, j) => (ch !== ' ' && hash(i * 31 + j * 7 + f) < k ? GL[Math.floor(hash(j + i * 13 + f * 3) * GL.length)] : ch)).join('');
      }
      rr(ctx, 262, y - 2, 34, 34, 5);
      ctx.strokeStyle = done ? dim : bright;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `28px ${FONT_OSD}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = done ? dim : bright;
      ctx.fillText(num, 279, y + 16);
      ctx.textAlign = 'left';
      let fs = 27;
      ctx.font = `${fs}px ${FONT_OSD}`;
      while (fs > 15 && ctx.measureText(txt).width > 268) {
        fs--;
        ctx.font = `${fs}px ${FONT_OSD}`;
      }
      ctx.fillStyle = deleted ? '#a05a52' : done ? dim : bright;
      ctx.fillText(txt, 310, y + 16);
      if (done && !deleted) {
        ctx.strokeStyle = '#6fd88a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(586, y + 16);
        ctx.lineTo(594, y + 25);
        ctx.lineTo(608, y + 6);
        ctx.stroke();
      }
    });
  }

  // jog çarkı
  const jx = 112, jy = 346;
  ctx.fillStyle = '#1b2022';
  ell(ctx, jx, jy, 46, 46);
  ctx.fill();
  ctx.strokeStyle = '#3a4346';
  ctx.lineWidth = 3;
  ctx.stroke();
  const ja = (o.jog ?? t * 0.6);
  ctx.strokeStyle = '#59646a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = ja + (i * Math.PI * 2) / 24;
    ctx.beginPath();
    ctx.moveTo(jx + Math.cos(a) * 38, jy + Math.sin(a) * 38);
    ctx.lineTo(jx + Math.cos(a) * 45, jy + Math.sin(a) * 45);
    ctx.stroke();
  }
  ctx.fillStyle = '#2b3234';
  ell(ctx, jx, jy, 20, 20);
  ctx.fill();
  ctx.fillStyle = '#7a868a';
  ell(ctx, jx + Math.cos(ja) * 12, jy + Math.sin(ja) * 12, 3.5, 3.5);
  ctx.fill();

  // ses seviyesi
  const lv = o.level ?? 0;
  ctx.font = `18px ${FONT_OSD}`;
  ctx.fillStyle = dim;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('L', 214, 318);
  ctx.fillText('R', 214, 342);
  vuBar(ctx, 230, 320, lv, 3, t);
  vuBar(ctx, 230, 344, lv * 0.92, 11, t);
  ctx.fillText('SES SEVİYESİ', 230, 366);

  // taşıma tuşları
  const deck = o.deck || 'dur';
  const btn = (x, key, draw) => {
    const on = deck === key;
    rr(ctx, x, 322, 36, 28, 5);
    ctx.fillStyle = on ? (red ? '#6a2020' : '#25583a') : '#171c1d';
    ctx.fill();
    ctx.strokeStyle = on ? bright : '#3a4346';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = on ? bright : dim;
    draw(x + 18, 336);
  };
  const tri = (cx, cy, dir, s = 7) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * s, cy);
    ctx.lineTo(cx - dir * s, cy - s);
    ctx.lineTo(cx - dir * s, cy + s);
    ctx.closePath();
    ctx.fill();
  };
  btn(440, 'geri', (x, y) => (tri(x - 5, y, -1, 6), tri(x + 5, y, -1, 6)));
  btn(480, 'oynat', (x, y) => tri(x, y, 1));
  btn(520, 'dur', (x, y) => (ctx.fillRect(x - 7, y - 7, 5, 14), ctx.fillRect(x + 2, y - 7, 5, 14)));
  btn(560, 'ara', (x, y) => (tri(x - 5, y, 1, 6), tri(x + 5, y, 1, 6)));
  ctx.font = `20px ${FONT_OSD}`;
  ctx.fillStyle = dim;
  ctx.textAlign = 'left';
  ctx.fillText(deck === 'oynat' ? 'OYNAT' : deck === 'ara' ? 'BANT ARANIYOR' : 'DUR', 440, 362);
  // kayıt lambası
  ctx.fillStyle = '#3a1414';
  ell(ctx, 600, 372, 5, 5);
  ctx.fill();
}

// ------------------------------------------------------------------ klip 1: ses kaydı
function micDraw(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#8f9996';
  ctx.fillStyle = '#121515';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // sehpa
  ctx.beginPath();
  ctx.moveTo(x - 70, y + 190);
  ctx.lineTo(x, y + 168);
  ctx.lineTo(x + 70, y + 190);
  ctx.moveTo(x, y + 168);
  ctx.lineTo(x, y + 96);
  ctx.stroke();
  // süspansiyon
  ctx.beginPath();
  ctx.ellipse(x, y + 44, 40, 62, 0, 0, Math.PI * 2);
  ctx.stroke();
  // kapsül
  rr(ctx, x - 24, y - 6, 48, 100, 24);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#4b5452';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 8 + i * 8);
    ctx.lineTo(x + 22, y + 8 + i * 8);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 88);
  ctx.stroke();
  // pop filtresi
  ctx.strokeStyle = 'rgba(160,170,168,.7)';
  ctx.lineWidth = 3;
  ell(ctx, x + 34, y + 38, 54, 54);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(160,170,168,.22)';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 34 + i * 14, y - 14);
    ctx.lineTo(x + 34 + i * 14, y + 90);
    ctx.stroke();
  }
  ctx.restore();
}

/** Siyah ekran, mikrofon çizimi ve canlı dalga formu. o.level: 0..1, o.flat: düz çizgi (kesik) */
export function voiceSession(ctx, t, o = {}) {
  ctx.fillStyle = '#050606';
  ctx.fillRect(0, 0, W, H);
  const gl = ctx.createRadialGradient(W / 2, 200, 20, W / 2, 200, 330);
  gl.addColorStop(0, 'rgba(70,86,80,.28)');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);
  micDraw(ctx, W / 2 - 14, 98);
  ctx.font = `24px ${FONT_OSD}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fbfa8';
  ctx.fillText('SES KAYDI — 02.05.1998 — STÜDYO 2', 26, 66);
  ctx.textAlign = 'right';
  ctx.fillText(o.take || '', W - 26, 66);
  // dalga formu
  const cy = 400;
  ctx.strokeStyle = o.flat ? '#ff4a3c' : '#7fe0a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const lv = clamp(o.level ?? 0, 0, 1);
  for (let x = 30; x <= W - 30; x += 3) {
    const a = o.flat ? 0 : lv * 52 * (0.35 + 0.65 * Math.abs(Math.sin(x * 0.21 + t * 31))) * Math.sin(x * 0.57 - t * 47 + hash(x) * 2) + (hash(x + Math.floor(t * 30)) - 0.5) * 3;
    if (x === 30) ctx.moveTo(x, cy + a);
    else ctx.lineTo(x, cy + a);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,200,170,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, cy);
  ctx.lineTo(W - 30, cy);
  ctx.stroke();
  // talkback lambası
  ctx.font = `20px ${FONT_OSD}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = o.talk ? '#ff7a6a' : '#5a3a36';
  ctx.fillText('KONTROL ODASI', W - 50, 436);
  ctx.fillStyle = o.talk ? '#ff3a2a' : '#3a1a18';
  ell(ctx, W - 32, 446, 7, 7);
  ctx.fill();
  if (o.flat) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff6a5a';
    ctx.fillText('SİNYAL YOK', 30, 436);
  }
}

/** Kabin duvarındaki kurallar kâğıdı. o.pan: 0..1 (kamera kâğıda kayar) */
export function boothRules(ctx, t, o = {}) {
  const ox = (1 - smooth(clamp(o.pan ?? 1, 0, 1))) * 720;
  ctx.fillStyle = '#242b29';
  ctx.fillRect(0, 0, W, H);
  // ses yalıtım köpükleri
  for (let gx = -2; gx < 14; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      const x = gx * 64 + ox * 0.9 - 40;
      const y = gy * 64 - 10;
      const g = ctx.createLinearGradient(x, y, x + 64, y + 64);
      g.addColorStop(0, '#323b38');
      g.addColorStop(0.5, '#1d2321');
      g.addColorStop(1, '#2a3331');
      ctx.fillStyle = g;
      ctx.fillRect(x + 2, y + 2, 60, 60);
    }
  }
  ctx.save();
  ctx.translate(ox + 80, 40);
  ctx.rotate(0.012);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(8, 10, 470, 372);
  ctx.fillStyle = '#e8e2d0';
  ctx.fillRect(0, 0, 470, 372);
  // bantlar
  for (const bx of [24, 420]) {
    ctx.save();
    ctx.translate(bx, -4);
    ctx.rotate(bx < 100 ? -0.4 : 0.35);
    ctx.fillStyle = 'rgba(210,200,150,.8)';
    ctx.fillRect(-26, -8, 52, 18);
    ctx.restore();
  }
  ctx.fillStyle = '#25221c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold 36px ${MONO}`;
  ctx.fillText('KABİN KURALLARI', 36, 30);
  ctx.fillRect(36, 76, 400, 3);
  ctx.font = `bold 26px ${MONO}`;
  const rules = ['1. Gülümse, sesinden', '   belli olur.', '2. Ne sorulursa cevap ver.', '3. Kayıt durmaz.', '4. Kabinden dışarı', '   çıkılmaz.'];
  rules.forEach((r, i) => ctx.fillText(r, 36, 100 + i * 36));
  ctx.textAlign = 'right';
  ctx.font = `bold 24px ${MONO}`;
  ctx.fillText('— R. YILDIZ', 440, 334);
  ctx.restore();
  // karanlık kenar
  const v = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** Beyaz kurgu lideri (makas izi): ses kesilir */
export const spliceFlash = (ctx, t) => S3.spliceLeader(ctx, t, {});

// ------------------------------------------------------------------ kamera görüntüsü
/** Kamera gren, kenar kararması, damga. o.stamp: metin (sol alt) */
export function camFx(ctx, t, o = {}) {
  const f = Math.floor(t * 25);
  for (let i = 0; i < 150; i++) {
    const a = 0.05 + hash(i + f) * 0.13;
    ctx.fillStyle = hash(i + f * 3) > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(hash(i * 3 + f * 17) * W, hash(i * 7 + f * 29) * H, 2 + hash(i) * 2, 1);
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 170, W / 2, H / 2, 420);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.05)';
  ctx.fillRect(0, ((t * 40) % (H + 80)) - 40, W, 28);
  if (o.stamp) {
    ctx.save();
    ctx.font = `28px ${FONT_OSD}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.95)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#f2ecd0';
    ctx.fillText(o.stamp, 22, H - 12);
    ctx.restore();
  }
}

/** Bant kopması: yatay yırtılma ve kar. k: 0..1 */
export function dropout(ctx, k, t, snow = 0) {
  if (k <= 0.01 && snow <= 0.01) return;
  const f = Math.floor(t * 30);
  for (let i = 0; i < 9; i++) {
    const y = Math.floor(hash(f * 7 + i) * H);
    const h = 8 + Math.floor(hash(f * 13 + i) * 46);
    const dx = (hash(f * 3 + i * 11) - 0.5) * 220 * k;
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
  }
  if (snow > 0.01) S.staticNoise(ctx, t, snow);
}

/** Klaket. o.open: 0..1 (üst çubuk açık), o.f: alanlar */
export function slate(ctx, t, o = {}) {
  const f = { prod: 'YILDIZ ÇOCUK YAPIM', title: 'ÇAMLIK — DIŞ ÇEKİM', scene: '7', take: '3', date: '14.05.98', dir: 'YÖN: R. YILDIZ', cam: 'KAMERA: KÂMİL', ...(o.f || {}) };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6a7352');
  g.addColorStop(1, '#3d452c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2 + 14);
  ctx.rotate(-0.025);
  ctx.translate(-W / 2, -H / 2 - 14);
  // gövde
  ctx.fillStyle = '#121212';
  ctx.fillRect(100, 190, 440, 250);
  ctx.strokeStyle = '#e8e8e0';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, 190, 440, 250);
  ctx.beginPath();
  ctx.moveTo(100, 244);
  ctx.lineTo(540, 244);
  ctx.moveTo(100, 296);
  ctx.lineTo(540, 296);
  ctx.moveTo(100, 370);
  ctx.lineTo(540, 370);
  ctx.moveTo(246, 296);
  ctx.lineTo(246, 370);
  ctx.moveTo(392, 296);
  ctx.lineTo(392, 370);
  ctx.stroke();
  ctx.fillStyle = '#f4f2ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 30px ${FONT_HAND}`;
  ctx.fillText(f.prod, 320, 217);
  ctx.font = `700 38px ${FONT_HAND}`;
  ctx.fillText(f.title, 320, 270);
  [['SAHNE', f.scene, 173], ['ÇEKİM', f.take, 319], ['TARİH', f.date, 466]].forEach(([lb, val, cx]) => {
    ctx.font = `700 17px ${FONT_HAND}`;
    ctx.fillStyle = '#b8b8b0';
    ctx.fillText(lb, cx, 306);
    ctx.font = `700 44px ${FONT_HAND}`;
    ctx.fillStyle = '#f4f2ea';
    ctx.fillText(val, cx, 343);
  });
  ctx.font = `700 28px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.fillText(f.dir, 116, 405);
  ctx.textAlign = 'right';
  ctx.fillText(f.cam, 524, 405);
  // üst çubuk (menteşe sol altta)
  ctx.save();
  ctx.translate(100, 190);
  ctx.rotate(-0.5 * clamp(o.open ?? 0, 0, 1));
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, -50, 440, 50);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -50, 440, 50);
  ctx.clip();
  ctx.fillStyle = '#f0eee6';
  for (let i = -1; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 60, 0);
    ctx.lineTo(i * 60 + 30, 0);
    ctx.lineTo(i * 60 + 62, -50);
    ctx.lineTo(i * 60 + 32, -50);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#e8e8e0';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, -50, 440, 50);
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ doğal orman görüntüsü
const GY = 214; // ufuk
export const PINE = { x: 320, base: 352 };

const PEOPLE = {
  nermin: { top: '#c9b48c', legs: '#3b3a42', hair: '#2a1d16', skin: '#d0a88a', shoe: '#2a2a2c' },
  riza: { top: '#26303c', legs: '#1c1c20', hair: '#8a8a88', skin: '#c49a7e', shoe: '#111' },
  girl: { top: '#e5c035', legs: '#d6ab8c', hair: '#3a2418', skin: '#d6ab8c', shoe: '#7c7c82', dress: true },
  other: { top: '#6a5a48', legs: '#2e2e34', hair: '#3a3028', skin: '#c9a083', shoe: '#222' },
};

/** Düz, çizgisiz insan şekli (bulanıkken yüz yok). p: {who,x,y,h,pose,walk,flip,back,lean,rope,mega} */
function person(ctx, p, t) {
  const C = PEOPLE[p.who || 'nermin'];
  const s = p.h / 100;
  const crouch = p.pose === 'crouch';
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s * (p.flip ? -1 : 1), s);
  if (p.lean) ctx.rotate(p.lean);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ell(ctx, 0, 0, 20, 4);
  ctx.fill();
  const sw = p.walk != null ? Math.sin(p.walk) : 0;
  const hip = crouch ? -22 : -42;
  ctx.strokeStyle = C.legs;
  ctx.lineWidth = p.who === 'girl' ? 6 : 8;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 5, hip);
    if (crouch) ctx.lineTo(sd * 12, -10);
    ctx.lineTo(sd * 6 + sd * sw * 9, -4);
    ctx.stroke();
    ctx.fillStyle = C.shoe;
    ell(ctx, sd * 6 + sd * sw * 9 + 2, -3, 6, 3.4);
    ctx.fill();
  }
  ctx.save();
  if (crouch) ctx.translate(0, 20);
  // gövde
  ctx.fillStyle = C.top;
  if (C.dress) {
    ctx.beginPath();
    ctx.moveTo(-9, -78);
    ctx.lineTo(9, -78);
    ctx.lineTo(17, -38);
    ctx.lineTo(-17, -38);
    ctx.closePath();
    ctx.fill();
  } else {
    rr(ctx, -13, -79, 26, 42, 6);
    ctx.fill();
  }
  // kollar
  ctx.strokeStyle = C.dress ? C.skin : C.top;
  ctx.lineWidth = 6;
  const arm = (sd, pts) => {
    ctx.beginPath();
    ctx.moveTo(sd * 11, -75);
    for (const [ax, ay] of pts) ctx.lineTo(sd * ax, ay);
    ctx.stroke();
  };
  const pose = p.pose || 'stand';
  for (const sd of [-1, 1]) {
    if (pose === 'eyes') arm(sd, [[23, -84], [7, -91]]);
    else if (pose === 'cup') arm(sd, [[21, -72], [8, -88]]);
    else if (pose === 'rope') arm(sd, [[22, -56]]);
    else if (pose === 'wave' && sd === 1) arm(sd, [[22, -92], [28, -108 + Math.sin(t * 9) * 4]]);
    else arm(sd, [[15 + sw * sd * 3, -50]]);
  }
  if (p.rope) {
    // ip: kırmızı tutacaklar, dönen ip
    const ph = t * 6.2;
    const k = (Math.cos(ph) + 1) / 2;
    ctx.fillStyle = '#d02828';
    for (const sd of [-1, 1]) ctx.fillRect(sd * 22 - 2.5, -62, 5, 10);
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, -57);
    ctx.quadraticCurveTo(0, lerp(-190, 26, k), 22, -57);
    ctx.stroke();
  }
  // baş
  ctx.fillStyle = C.skin;
  ell(ctx, 0, -89, 10, 11);
  ctx.fill();
  ctx.fillStyle = C.hair;
  if (p.back) {
    ell(ctx, 0, -89, 11, 12);
    ctx.fill();
    if (p.who === 'nermin') {
      ell(ctx, 0, -82, 12, 11);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, -91, 11, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    if (p.who === 'girl') {
      ell(ctx, -11, -86, 3.6, 5);
      ctx.fill();
      ell(ctx, 11, -86, 3.6, 5);
      ctx.fill();
    }
  }
  if (p.plush) {
    ctx.fillStyle = '#d98a3a';
    ell(ctx, 12, -58, 8, 7);
    ctx.fill();
  }
  if (p.mega) {
    ctx.fillStyle = '#8a8d90';
    ctx.beginPath();
    ctx.moveTo(8, -90);
    ctx.lineTo(26, -98);
    ctx.lineTo(26, -80);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function dapple(ctx, t, n = 16) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 5.3) * W + Math.sin(t * 0.25 + i) * 10;
    const y = GY + 14 + hash(i * 7.1) * 250;
    const r = 14 + hash(i * 3.7) * 30;
    const a = 0.1 + 0.08 * Math.sin(t * 0.7 + i * 1.9);
    ctx.fillStyle = `rgba(255,240,170,${a})`;
    ell(ctx, x, y, r * 1.3, r * 0.7);
    ctx.fill();
  }
}

/**
 * Çamlık açıklığı (sabit tripod). o.people: person listesi, o.behind(ctx): çamın arkasında çizilecekler,
 * o.front(ctx): her şeyin önünde, o.basket {x,y} | o.blanket | o.cat | o.rope {x,y} | o.figure {x,y,h,alpha} |
 * o.yellow {x,y,h,alpha,walk} | o.dark: 0..1 karartma
 */
export function rawClearing(ctx, t, o = {}) {
  soft(ctx, 'clear', (c) => clearingBody(c, t, o), 0.55);
  if (o.dark) {
    ctx.fillStyle = `rgba(0,0,0,${o.dark})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function clearingBody(ctx, t, o) {
  ctx.save();
  ctx.fillStyle = '#c9d8bc';
  ctx.fillRect(0, 0, W, GY + 14);
  // uzak yapraklar
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = i % 3 ? '#3f5d36' : '#35502e';
    ell(ctx, hash(i * 2.1) * (W + 80) - 40, 6 + hash(i * 4.4) * 100, 36 + hash(i * 6.2) * 36, 24 + hash(i) * 26);
    ctx.fill();
  }
  // uzak gövdeler
  for (let i = 0; i < 17; i++) {
    const x = 10 + hash(i * 9.7) * (W - 20);
    if (Math.abs(x - PINE.x) < 36) continue;
    const w = 7 + hash(i * 3.3) * 8;
    ctx.fillStyle = 'rgba(66,58,46,.88)';
    ctx.fillRect(x - w / 2, 60 + hash(i) * 20, w, GY - 52 - hash(i) * 20);
  }
  // zemin
  const g = ctx.createLinearGradient(0, GY, 0, H);
  g.addColorStop(0, '#7d8b47');
  g.addColorStop(1, '#4e5b2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, GY, W, H - GY);
  ctx.fillStyle = 'rgba(150,130,84,.5)';
  ctx.beginPath();
  ctx.moveTo(298, GY);
  ctx.lineTo(344, GY);
  ctx.lineTo(500, H);
  ctx.lineTo(130, H);
  ctx.closePath();
  ctx.fill();
  // yakın gövdeler
  for (const [x, w, base] of [[44, 30, 288], [118, 22, 262], [206, 20, 246], [468, 24, 252], [532, 30, 280], [604, 38, 300]]) {
    const gg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gg.addColorStop(0, '#4a3b2c');
    gg.addColorStop(1, '#241a12');
    ctx.fillStyle = gg;
    ctx.fillRect(x - w / 2, 0, w, base);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ell(ctx, x, base, w * 0.9, 5);
    ctx.fill();
  }
  // üst koyu yapraklar
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = '#1e3321';
    ell(ctx, hash(i * 5.9) * (W + 60) - 30, hash(i * 8.1) * 46 - 10, 50 + hash(i) * 40, 26 + hash(i * 2) * 20);
    ctx.fill();
  }
  if (o.figure) {
    soft(ctx, 'fig', (c) => drawSilhouette(c, o.figure.x, o.figure.y, o.figure.h, o.figure.alpha), 0.25);
  }
  if (o.yellow && o.yellow.alpha > 0.01) {
    soft(ctx, 'yel', (c) => person(c, { who: 'girl', x: o.yellow.x, y: o.yellow.y, h: o.yellow.h, walk: o.yellow.walk, pose: o.yellow.pose || 'stand', flip: o.yellow.flip }, t), 0.33, o.yellow.alpha);
  }
  o.behind?.(ctx);
  // büyük çam: düzgün, pürüzsüz kabuk
  const px = PINE.x;
  const pg = ctx.createLinearGradient(px - 28, 0, px + 28, 0);
  pg.addColorStop(0, '#85664a');
  pg.addColorStop(0.45, '#614633');
  pg.addColorStop(1, '#31241a');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(px - 22, 0);
  ctx.lineTo(px + 22, 0);
  ctx.lineTo(px + 31, PINE.base - 18);
  ctx.quadraticCurveTo(px + 38, PINE.base, px + 48, PINE.base + 4);
  ctx.lineTo(px - 48, PINE.base + 4);
  ctx.quadraticCurveTo(px - 38, PINE.base, px - 31, PINE.base - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,235,190,.1)';
  ctx.fillRect(px - 20, 0, 9, PINE.base - 24);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ell(ctx, px, PINE.base + 6, 62, 9);
  ctx.fill();
  // battaniye, sepet, peluş kedi, ip
  if (o.blanket !== false) {
    const q = [[404, 352], [560, 352], [606, 436], [350, 436]];
    ctx.fillStyle = '#a4302a';
    ctx.beginPath();
    q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,230,.55)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      const k = i / 6;
      ctx.beginPath();
      ctx.moveTo(lerp(q[0][0], q[1][0], k), 352);
      ctx.lineTo(lerp(q[3][0], q[2][0], k), 436);
      ctx.stroke();
      const y = lerp(352, 436, k * k);
      ctx.beginPath();
      ctx.moveTo(lerp(q[0][0], q[3][0], k * k), y);
      ctx.lineTo(lerp(q[1][0], q[2][0], k * k), y);
      ctx.stroke();
    }
  }
  if (o.cat) {
    ctx.fillStyle = '#d98a3a';
    ell(ctx, 548, 392, 17, 13);
    ctx.fill();
    ell(ctx, 541, 376, 10, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(533, 370);
    ctx.lineTo(535, 360);
    ctx.lineTo(541, 368);
    ctx.moveTo(541, 368);
    ctx.lineTo(547, 360);
    ctx.lineTo(549, 371);
    ctx.fill();
    ctx.strokeStyle = '#a8621f';
    ctx.lineWidth = 2;
    for (const dx of [-5, 0, 5]) {
      ctx.beginPath();
      ctx.moveTo(548 + dx, 384);
      ctx.lineTo(548 + dx, 395);
      ctx.stroke();
    }
  }
  if (o.basket) {
    const { x, y } = o.basket;
    ctx.fillStyle = '#9c6c3a';
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 20);
    ctx.lineTo(x + 24, y - 20);
    ctx.lineTo(x + 19, y + 4);
    ctx.lineTo(x - 19, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6a4522';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 22 + i * 2, y - 14 + i * 7);
      ctx.lineTo(x + 22 - i * 2, y - 14 + i * 7);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 20, 18, Math.PI, 0);
    ctx.stroke();
  }
  if (o.rope) {
    const { x, y } = o.rope;
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 24, y);
    ctx.bezierCurveTo(x - 10, y - 9, x + 8, y + 8, x + 26, y - 2);
    ctx.stroke();
    ctx.fillStyle = '#d02828';
    ctx.fillRect(x - 30, y - 4, 8, 4);
    ctx.fillRect(x + 24, y - 6, 8, 4);
  }
  const list = [...(o.people || [])].sort((a, b) => a.y - b.y);
  for (const p of list) person(ctx, p, t);
  dapple(ctx, t, o.dapple ?? 16);
  o.front?.(ctx);
  ctx.restore();
}

/** Kameranın önüne uzanan el (kameraya yapışır). k: 0..1 */
export function grabHand(ctx, k, t) {
  if (k <= 0.01) return;
  const x = lerp(-240, 120, smooth(k));
  soft(ctx, 'hand', (c) => {
    c.fillStyle = '#7d5a46';
    c.beginPath();
    c.moveTo(x - 200, H + 20);
    c.lineTo(x - 140, 190);
    c.quadraticCurveTo(x - 20, 140, x + 100, 210);
    c.lineTo(x + 170, 260);
    c.lineTo(x + 120, 330);
    c.lineTo(x + 170, 360);
    c.lineTo(x + 100, 420);
    c.lineTo(x + 60, H + 20);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillRect(0, 0, W, H);
  }, 0.15);
}

/** Ağaç kabuğu yakın planı; o.carve: oyma görünür mü (0|1) */
export function rawBark(ctx, t, o = {}) {
  soft(ctx, 'bark', (c) => barkBody(c, t, o), 0.6);
}

function barkBody(ctx, t, o) {
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, '#6a4c36');
  bg.addColorStop(0.5, '#5a3f2c');
  bg.addColorStop(1, '#3b2a1e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // pürüzsüz çam kabuğu: yumuşak levhalar
  for (let i = 0; i < 20; i++) {
    const x = hash(i * 3.3) * W;
    const w = 40 + hash(i * 5.1) * 90;
    ctx.fillStyle = `rgba(${hash(i) > 0.5 ? '255,235,200' : '0,0,0'},${0.04 + hash(i * 2) * 0.07})`;
    ctx.fillRect(x, 0, w, H);
  }
  ctx.strokeStyle = 'rgba(30,18,10,.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = hash(i * 7.7) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 24, 120, x - 22, 300, x + 8, H);
    ctx.stroke();
  }
  // gezen ışık
  const lx = 340 + Math.sin(t * 0.4) * 80;
  const lg = ctx.createRadialGradient(lx, 150, 10, lx, 150, 220);
  lg.addColorStop(0, 'rgba(255,230,160,.22)');
  lg.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  if (o.carve) {
    ctx.save();
    ctx.translate(W / 2, H / 2 + 10);
    ctx.rotate(-0.03);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const [txt, sz, y] of [['B.A.', 64, -78], ['14.05', 118, 20]]) {
      ctx.font = `800 ${sz}px ${FONT_CARTOON}`;
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#1a0f08';
      ctx.strokeText(txt, 2, y + 3);
      ctx.fillStyle = '#e0c192';
      ctx.fillText(txt, 0, y);
    }
    ctx.fillStyle = 'rgba(224,193,146,.8)';
    for (let i = 0; i < 12; i++) ctx.fillRect(-150 + hash(i * 4) * 300, 90 + hash(i * 6) * 40, 3, 2);
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ klip 3: oyuncu bilgi formu
const FORM_LABELS = ['ADI', 'SOYADI', 'YAŞI', 'DOĞUM TARİHİ', 'EN SEVDİĞİ RENK', 'ANNESİNİN ADI', 'EV TELEFONU', 'ARKADAŞI', 'DİLEĞİ', 'NOTLAR'];
export const FORM = { top: 150, row: 50, boxX: 296, boxW: 270, noteTop: 650, noteGap: 36 };
export const formSurnameY = () => FORM.top + FORM.row;

/**
 * Sarı kâğıda daktilo ile yazılmış form, değerler çocuk el yazısı (pastel boya).
 * o.scroll: kamera kayması (px), o.rows: [{value, k (0..1), color}] (10 alan, NOTLAR hariç 9),
 * o.notes: [{text, k}], o.sur: {text, state: 'empty'|'typed'|'crossed'|'ink', k}
 */
export function talentForm(ctx, t, o = {}) {
  ctx.fillStyle = '#1b1710';
  ctx.fillRect(0, 0, W, H);
  const noteEnd = FORM.noteTop + Math.max(1, (o.notes || []).length) * FORM.noteGap + 40;
  ctx.save();
  ctx.translate(0, -(o.scroll || 0));
  // kâğıt
  const pg = ctx.createLinearGradient(0, 30, W, noteEnd);
  pg.addColorStop(0, '#ecdca2');
  pg.addColorStop(1, '#d9c586');
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(54, 36, 540, noteEnd - 30);
  ctx.fillStyle = pg;
  ctx.fillRect(46, 28, 540, noteEnd - 30);
  // lekeler ve kıvrımlar
  ctx.fillStyle = 'rgba(150,110,50,.08)';
  ell(ctx, 480, 250, 52, 48);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,50,.16)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(80,50,10,.08)';
  ctx.fillRect(46, 420, 540, 3);
  ctx.fillRect(316, 28, 3, noteEnd - 30);
  // başlık
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2d2a22';
  ctx.font = `bold 20px ${MONO}`;
  ctx.fillText('YILDIZ ÇOCUK YAPIM', 316, 62);
  ctx.font = `bold 30px ${MONO}`;
  ctx.fillText('OYUNCU BİLGİ FORMU', 316, 98);
  ctx.fillRect(110, 118, 412, 3);
  ctx.font = `16px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText('FORM NO: 98/114', 570, 44);
  // alanlar
  const rows = o.rows || [];
  FORM_LABELS.forEach((lb, i) => {
    const y = FORM.top + i * FORM.row;
    ctx.textAlign = 'left';
    ctx.font = `bold 19px ${MONO}`;
    ctx.fillStyle = '#2d2a22';
    if (lb === 'NOTLAR') {
      ctx.fillText('NOTLAR:', 72, FORM.noteTop - 22);
      return;
    }
    ctx.fillText(lb + ':', 72, y + 18);
    ctx.strokeStyle = i === 1 ? '#3a2e1c' : '#6b6350';
    ctx.lineWidth = i === 1 ? 3 : 1.5;
    ctx.strokeRect(FORM.boxX, y, FORM.boxW, 36);
  });
  const crayon = (text, x, y, color, k = 1, size = 34, ang = 0) => {
    const n = Math.floor(clamp(k, 0, 1) * text.length + 0.0001);
    if (n <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.font = `700 ${size}px ${FONT_HAND}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fillText(text.slice(0, n), 1.5, 1.5);
    ctx.globalAlpha = 0.95;
    ctx.fillText(text.slice(0, n), 0, 0);
    ctx.restore();
  };
  const COL = ['#2a3d8f', '#a02a6a', '#1f6b3a', '#c0361e', '#5a2a8a'];
  let idx = 0;
  rows.forEach((r, i) => {
    if (!r) return;
    const slot = i < 1 ? i : i + 1; // satır 1 (SOYADI) ayrı yönetilir
    const y = FORM.top + slot * FORM.row;
    crayon(r.value, FORM.boxX + 10, y + 19, r.color || COL[idx++ % COL.length], r.k ?? 1, 32, (hash(i * 3) - 0.5) * 0.05);
  });
  // soyadı kutusu
  const sy = FORM.top + FORM.row;
  const sur = o.sur || { text: '', state: 'empty', k: 1 };
  const sw = (txt) => {
    ctx.font = `700 34px ${FONT_HAND}`;
    return ctx.measureText(txt).width;
  };
  if (sur.text) {
    if (sur.state === 'ink') {
      const a = 1 - clamp(sur.k, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      crayon(sur.text, FORM.boxX + 10, sy + 19, '#1c2a70', 1, 34);
      ctx.restore();
      ctx.strokeStyle = `rgba(28,42,112,${a})`;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < sur.text.length; i++) {
        const x = FORM.boxX + 14 + (sw(sur.text.slice(0, i)) + sw(sur.text.slice(0, i + 1))) / 2;
        ctx.beginPath();
        ctx.moveTo(x, sy + 26);
        ctx.lineTo(x, sy + 26 + clamp(sur.k, 0, 1) * (30 + hash(i * 5) * 50));
        ctx.stroke();
      }
    } else {
      crayon(sur.text, FORM.boxX + 10, sy + 19, sur.state === 'crossed' ? '#2a3d8f' : '#1c2a70', sur.k ?? 1, 34);
      if (sur.state === 'crossed') {
        ctx.strokeStyle = '#d02a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(FORM.boxX + 6, sy + 22);
        ctx.lineTo(FORM.boxX + 16 + sw(sur.text), sy + 14);
        ctx.stroke();
      }
    }
  }
  if (sur.state === 'empty' || sur.state === 'prefix') {
    if (Math.floor(t * 2.2) % 2 === 0) {
      ctx.fillStyle = '#2d2a22';
      ctx.fillRect(FORM.boxX + 12 + (sur.text ? sw(sur.text) : 0), sy + 7, 3, 24);
    }
  }
  // notlar
  (o.notes || []).forEach((n, i) => crayon(n.text, 76, FORM.noteTop + i * FORM.noteGap, COL[(i + 2) % COL.length], n.k ?? 1, 31, (hash(i * 7) - 0.5) * 0.04));
  ctx.restore();
  // loş yan karartma
  const v = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 440);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ klip 4: REC karesi
/** Siyah kare, kırmızı REC noktası, ölü zaman damgası ve belli belirsiz bir tavan kirişi. */
export function recBlack(ctx, t, o = {}) {
  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);
  if (o.beam !== 0) {
    ctx.save();
    ctx.globalAlpha = o.beam ?? 0.07;
    ctx.fillStyle = '#9aa09a';
    ctx.beginPath();
    ctx.moveTo(60, 140);
    ctx.lineTo(580, 90);
    ctx.lineTo(590, 134);
    ctx.lineTo(70, 190);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const f = Math.floor(t * 25);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + hash(i + f) * 0.07})`;
    ctx.fillRect(hash(i * 3 + f * 13) * W, hash(i * 5 + f * 7) * H, 2, 1);
  }
  if (o.rec !== false) {
    if (Math.floor(t * 1.3) % 2 === 0 || o.solid) {
      ctx.fillStyle = '#e02418';
      ell(ctx, 44, 90, 9, 9);
      ctx.fill();
    }
    ctx.font = `28px ${FONT_OSD}`;
    ctx.fillStyle = '#d8d8d0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('REC', 62, 91);
  }
  ctx.font = `30px ${FONT_OSD}`;
  ctx.fillStyle = 'rgba(150,120,50,.8)';
  ctx.textAlign = 'center';
  ctx.fillText('--.--.---- --:--', W / 2, H - 26);
}

// ------------------------------------------------------------------ gizli klip 7: adamın bakışı
/** İki koyu gövdenin arasından bakış. o.step: 0..1 (bir adım ileri sallanma), o.giggle: 0..1 */
export function povTrees(ctx, t, o = {}) {
  const st = smooth(clamp(o.step ?? 0, 0, 1));
  ctx.save();
  ctx.translate(W / 2, H / 2 + 40);
  ctx.scale(1 + st * 0.12, 1 + st * 0.12);
  ctx.translate(-W / 2, -H / 2 - 40 + Math.sin(t * 1.6) * 3 + st * 8);
  rawClearing(ctx, t, {
    blanket: false,
    dapple: 8,
    people: [{ who: 'nermin', x: 336, y: 322, h: 62, pose: 'eyes', back: true }],
    dark: 0.12,
  });
  ctx.restore();
  // yakın koyu gövdeler
  for (const [x, w] of [[44, 150], [602, 170]]) {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#0b0806');
    g.addColorStop(0.5, '#1a120c');
    g.addColorStop(1, '#070504');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, -4, w, H + 8);
  }
  // sarı elbiseli minik şekil, yakın bir gövdenin arkasında
  ctx.save();
  ctx.translate(0, Math.sin(t * 15) * (o.giggle ?? 0) * 2);
  ctx.fillStyle = '#080605';
  ctx.fillRect(176, 90, 46, 400);
  soft(ctx, 'povgirl', (c) => person(c, { who: 'girl', x: 238, y: 410, h: 56, pose: 'crouch' }, t), 0.5);
  ctx.restore();
  ctx.fillStyle = '#080605';
  ctx.fillRect(200, 90, 26, 400);
  const v = ctx.createRadialGradient(W / 2, H / 2, 110, W / 2, H / 2, 380);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.82)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ maske
/**
 * Beste'nin çizilmiş yüzü, kâğıttan bir maske gibi. (cx, cy) yüzün merkezi, msc: Beste ölçeği.
 * drawB(ctx, over): d.beste
 */
export function mask(ctx, drawB, cx, cy, msc, o = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.tilt ?? -0.05);
  ctx.fillStyle = '#ece1ca';
  ctx.strokeStyle = '#2b1d14';
  ctx.lineWidth = Math.max(2, 2.2 * msc);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 1 + 0.03 * Math.sin(a * 7 + 1) + 0.015 * Math.sin(a * 13);
    const x = Math.cos(a) * 88 * msc * r, y = Math.sin(a) * 93 * msc * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 80 * msc, 84 * msc, 0, 0, Math.PI * 2);
  ctx.clip();
  const over = { x: 0, y: 199 * msc, scale: msc, expr: o.expr || 'happy', wave: 0, tilt: 0, flip: false };
  if (o.mouth != null) over.mouth = o.mouth;
  drawB(ctx, over);
  ctx.restore();
}

/**
 * Orman boş (zaman damgası 13:59:12'de donmuş); o.k 0..1: yüzsüz adam çamın arkasından çıkar,
 * kameraya yürür, maske ekranı doldurur.
 */
export function maskFinal(ctx, t, drawB, o = {}) {
  const k = clamp(o.k ?? 0, 0, 1);
  const emerge = clamp(k / 0.2, 0, 1);
  const walk = clamp((k - 0.2) / 0.8, 0, 1);
  const s = k <= 0 ? 0.37 : lerp(0.37, 4.2, Math.pow(walk, 1.5));
  const hx = lerp(lerp(322, 378, smooth(emerge)), 324, smooth(walk));
  const hy = lerp(PINE.base - 270 * 0.37, 236, smooth(walk));
  const base = hy + 270 * s;
  const manFn = (c) => {
    if (k <= 0) return;
    const draw = (cc) => S3.drawGreyMan(cc, hx, base, 300 * s, { alpha: 1, headTilt: Math.sin(t * 1.3) * 0.05 });
    if (walk < 0.35) soft(c, 'man', draw, 0.3);
    else draw(c);
  };
  rawClearing(ctx, t, {
    blanket: false,
    dapple: 10,
    behind: k < 0.2 ? manFn : null,
    front: k >= 0.2 ? manFn : null,
    dark: 0.06,
  });
  if (k > 0.05) {
    const grow = 1 + 1.6 * smooth(clamp((k - 0.8) / 0.2, 0, 1));
    mask(ctx, drawB, hx, hy + 2 * s, 0.53 * s * grow, { mouth: o.mouth, tilt: -0.06 + Math.sin(t * 2.4) * 0.025 });
  }
}

// ------------------------------------------------------------------ ani korkutma kareleri
/** Klip 1: stüdyo camının ardında, mikrofonun arkasında çizgi filmdeki Beste, gülümseyerek. */
export function scareBooth(ctx, t, drawB) {
  ctx.fillStyle = '#020303';
  ctx.fillRect(0, 0, W, H);
  const kk = 2.55 + Math.min(t, 0.6) * 0.8;
  drawB(ctx, { x: W / 2 + (hash(Math.floor(t * 30)) - 0.5) * 8, y: 232 + 199 * kk, scale: kk, expr: 'happy', wave: 0, tilt: 0.06, lookTarget: { x: 0, y: 0 } });
  // cam yansıması
  ctx.fillStyle = 'rgba(190,210,205,.07)';
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(220, 0);
  ctx.lineTo(60, H);
  ctx.lineTo(-100, H);
  ctx.fill();
  micDraw(ctx, 96, 190);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = Math.floor(t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.font = `24px ${FONT_OSD}`;
  ctx.fillStyle = '#ff3a2a';
  ctx.textAlign = 'right';
  ctx.fillText('● REC', W - 26, 40);
}

/** Klip 4: kamera döner, merceğin hemen önünde boş gözlü Beste. */
export function scareLens(ctx, t, drawB) {
  ctx.fillStyle = '#050605';
  ctx.fillRect(0, 0, W, H);
  const kk = 3.1 + Math.min(t, 0.5) * 0.9;
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 22;
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawB(ctx, { x: W / 2 + jx - 26, y: 236 + 199 * kk, scale: kk, expr: 'void', wave: 0, tilt: -0.12 });
  ctx.globalAlpha = 1;
  drawB(ctx, { x: W / 2 + jx + 10, y: 240 + 199 * kk, scale: kk, expr: 'void', wave: 0, tilt: -0.08 });
  ctx.restore();
  ctx.fillStyle = 'rgba(120,255,160,.1)';
  ctx.fillRect(0, 0, W, H);
  S.staticNoise(ctx, t, 0.25);
  ctx.fillStyle = '#e02418';
  ell(ctx, 44, 90, 9, 9);
  ctx.fill();
}

/** Klip 9 sonu: tek kırmızı kare, maske ekranı doldurmuş, ağzı açık. */
export function scareMask(ctx, t, drawB) {
  ctx.fillStyle = '#1a0000';
  ctx.fillRect(0, 0, W, H);
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 16;
  mask(ctx, drawB, W / 2 + jx, H / 2 + 6, 5.6 + Math.min(t, 0.5) * 0.5, { mouth: 1, expr: 'happy', tilt: -0.05 });
  ctx.fillStyle = 'rgba(255,0,0,.32)';
  ctx.fillRect(0, 0, W, H);
  S.staticNoise(ctx, t, 0.22);
}

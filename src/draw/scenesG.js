// Gizli kasetlerin sahneleri (src/tapes/gizli1.js, gizli2.js) ve gizli kelime donması (src/secrets.js):
// Kâmil'in el kamerası (vizör, arkadan tripod kamera, objektife yürüyen sarı şekil), koltuğun arkasından tavan arası,
// gece bahçesinde yanan varil, yarı erimiş etiket, film yanığı.
import * as S from './scenes.js';
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const { rr, FONT_OSD, FONT_HAND } = S;

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

// ------------------------------------------------------------------ el kamerası
/** Vizör çerçevesi: köşe işaretleri, REC, pil. o.label sağ üstte küçük yazı, o.rec false ise REC yok */
export function viewfinder(ctx, t, o = {}) {
  ctx.save();
  ctx.strokeStyle = 'rgba(240,240,230,.7)';
  ctx.fillStyle = 'rgba(240,240,230,.7)';
  ctx.lineWidth = 3;
  const m = 26, L = 34;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * L, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(W / 2 - 10, H / 2);
  ctx.lineTo(W / 2 + 10, H / 2);
  ctx.moveTo(W / 2, H / 2 - 10);
  ctx.lineTo(W / 2, H / 2 + 10);
  ctx.stroke();
  ctx.font = `26px ${FONT_OSD}`;
  ctx.textBaseline = 'middle';
  if (o.rec !== false) {
    if (Math.floor(t * 1.4) % 2 === 0) {
      ctx.fillStyle = '#e02418';
      ell(ctx, 52, 57, 8, 8);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,240,230,.85)';
    ctx.textAlign = 'left';
    ctx.fillText('REC', 66, 58);
  }
  ctx.strokeRect(W - 90, 46, 40, 18);
  ctx.fillStyle = 'rgba(240,240,230,.7)';
  ctx.fillRect(W - 50, 51, 4, 8);
  for (let i = 0; i < (o.battery ?? 1); i++) ctx.fillRect(W - 86 + i * 12, 50, 9, 10);
  if (o.label) {
    ctx.textAlign = 'right';
    ctx.fillText(o.label, W - 50, 86);
  }
  ctx.restore();
}

/** Tripoddaki çekim kamerası, arkadan (sağ altta, yakın ve koyu). o.rec: kırmızı ışık */
export function tripodBack(ctx, t, o = {}) {
  const x = o.x ?? 486, y = o.y ?? 318;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#121212';
  ctx.lineWidth = 15;
  for (const [dx, dy] of [[-130, 210], [14, 230], [140, 200]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x + dx, y + 40 + dy);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - 42, y + 24, 84, 22);
  const g = ctx.createLinearGradient(x - 90, y - 72, x + 90, y + 30);
  g.addColorStop(0, '#3b3b3e');
  g.addColorStop(1, '#121214');
  ctx.fillStyle = g;
  rr(ctx, x - 92, y - 72, 184, 100, 14);
  ctx.fill();
  ctx.strokeStyle = '#202022';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x - 62, y - 72);
  ctx.quadraticCurveTo(x, y - 116, x + 62, y - 72);
  ctx.stroke();
  // vizör tüpü ve lastik göz yuvası
  ctx.fillStyle = '#0c0c0d';
  rr(ctx, x - 134, y - 66, 52, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#242428';
  ell(ctx, x - 136, y - 49, 10, 16);
  ctx.fill();
  ctx.fillStyle = '#56565a';
  ctx.fillRect(x - 52, y - 42, 104, 4);
  ctx.font = `20px ${FONT_OSD}`;
  ctx.fillStyle = '#8e8e8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VHS', x, y - 16);
  if (o.rec !== false && Math.floor(t * 1.4) % 2 === 0) {
    const r = ctx.createRadialGradient(x + 72, y - 58, 1, x + 72, y - 58, 16);
    r.addColorStop(0, 'rgba(255,60,40,1)');
    r.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = r;
    ctx.fillRect(x + 52, y - 78, 40, 40);
  }
  ctx.restore();
}

/** Objektife doğru yürüyen sarı elbiseli bulanık şekil (yüz yok). k: 0 uzak .. 1 objektifi kaplar */
export function yellowNear(ctx, t, k) {
  if (k <= 0.01) return;
  const s = 0.25 + k * 3.4;
  const cx = 300 + Math.sin(t * 2.6) * 8 * k;
  const cy = 300 + k * 30 + Math.abs(Math.sin(t * 5)) * 4 * k;
  ctx.save();
  ctx.globalAlpha = clamp(k * 3, 0, 1);
  const g = ctx.createRadialGradient(cx, cy + 60 * s, 8 * s, cx, cy + 60 * s, 118 * s);
  g.addColorStop(0, 'rgba(240,200,64,1)');
  g.addColorStop(0.6, 'rgba(222,178,46,.9)');
  g.addColorStop(1, 'rgba(222,178,46,0)');
  ctx.fillStyle = g;
  ell(ctx, cx, cy + 60 * s, 80 * s, 112 * s);
  ctx.fill();
  const h = ctx.createRadialGradient(cx, cy - 46 * s, 4 * s, cx, cy - 46 * s, 46 * s);
  h.addColorStop(0, 'rgba(66,42,28,1)');
  h.addColorStop(0.7, 'rgba(56,34,22,.9)');
  h.addColorStop(1, 'rgba(56,34,22,0)');
  ctx.fillStyle = h;
  ell(ctx, cx, cy - 46 * s, 42 * s, 46 * s);
  ctx.fill();
  ctx.restore();
  if (k > 0.72) {
    ctx.fillStyle = `rgba(226,186,58,${Math.min(0.96, (k - 0.72) * 3.6)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ koltuğun arkasından tavan arası
const FB = { c: null };
/**
 * Oyuncunun tavan arası, koltuğun arkasından: eğik çatı, ortada parlayan televizyon (içinde bu görüntünün kendisi),
 * koltukta oturan birinin başı. o.alpha: görünürlük (0..1), o.stamp: sol alttaki tarih.
 */
export function atticBehind(ctx, t, o = {}) {
  const a = clamp(o.alpha ?? 1, 0, 1);
  if (!FB.c) {
    FB.c = document.createElement('canvas');
    FB.c.width = 320;
    FB.c.height = 240;
  }
  ctx.save();
  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const tvx = 320, tvy = 206, tw = 150, th = 112;
  // arka duvar ve televizyonun ışığı
  ctx.fillStyle = '#17140f';
  ctx.fillRect(170, 70, 300, 240);
  const glow = ctx.createRadialGradient(tvx, tvy, 20, tvx, tvy, 340);
  glow.addColorStop(0, 'rgba(120,150,200,.42)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // döşeme
  const fl = ctx.createLinearGradient(0, 300, 0, H);
  fl.addColorStop(0, '#2a2118');
  fl.addColorStop(1, '#0c0a08');
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(170, 310);
  ctx.lineTo(470, 310);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,8,6,.7)';
  ctx.lineWidth = 2;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(320 + i * 28, 310);
    ctx.lineTo(320 + i * 130, H);
    ctx.stroke();
  }
  // eğik çatı (iki yan) ve kirişler
  ctx.fillStyle = '#0d0b09';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(240, 0);
  ctx.lineTo(170, 70);
  ctx.lineTo(170, 310);
  ctx.lineTo(0, 470);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(400, 0);
  ctx.lineTo(470, 70);
  ctx.lineTo(470, 310);
  ctx.lineTo(W, 470);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1d1712';
  ctx.lineWidth = 9;
  for (let i = 0; i < 4; i++) {
    const k = i / 3;
    ctx.beginPath();
    ctx.moveTo(0, 60 + k * 300);
    ctx.lineTo(170, 80 + k * 200);
    ctx.moveTo(W, 60 + k * 300);
    ctx.lineTo(470, 80 + k * 200);
    ctx.stroke();
  }
  // ay ışığı alan küçük pencere
  ctx.fillStyle = 'rgba(110,130,170,.35)';
  ctx.beginPath();
  ctx.moveTo(530, 120);
  ctx.lineTo(590, 100);
  ctx.lineTo(590, 160);
  ctx.lineTo(530, 175);
  ctx.closePath();
  ctx.fill();
  // ampul
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(338, 0);
  ctx.lineTo(338, 46);
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,170,110,.35)';
  ell(ctx, 338, 54, 8, 10);
  ctx.fill();
  // dolap, televizyon, video
  ctx.fillStyle = '#211a13';
  ctx.fillRect(220, 268, 200, 60);
  ctx.fillStyle = '#18181a';
  rr(ctx, tvx - tw / 2 - 16, tvy - th / 2 - 14, tw + 32, th + 28, 10);
  ctx.fill();
  ctx.fillStyle = '#9db4d8';
  ctx.fillRect(tvx - tw / 2, tvy - th / 2, tw, th);
  ctx.globalAlpha = a * 0.92;
  ctx.drawImage(FB.c, tvx - tw / 2, tvy - th / 2, tw, th);
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(160,190,230,.18)';
  ctx.fillRect(tvx - tw / 2, tvy - th / 2, tw, th);
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(268, 280, 104, 16);
  ctx.fillStyle = '#3cff70';
  ctx.font = `14px ${FONT_OSD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY', 300, 288);
  // koltukta oturan biri: omuzlar, baş (TV ışığından ince bir kenar)
  ctx.fillStyle = '#050505';
  ell(ctx, 320, 452, 150, 84);
  ctx.fill();
  ell(ctx, 320, 318, 50, 60);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,180,220,.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(320, 318, 50, 60, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  // koltuğun arkalığı (önde)
  const wood = ctx.createLinearGradient(0, 360, 0, H);
  wood.addColorStop(0, '#3a2a1c');
  wood.addColorStop(1, '#140d08');
  ctx.fillStyle = wood;
  ctx.fillRect(196, 368, 248, 26);
  ctx.fillRect(196, 368, 22, H - 368);
  ctx.fillRect(422, 368, 22, H - 368);
  for (let i = 0; i < 4; i++) ctx.fillRect(250 + i * 44, 394, 12, H - 394);
  ctx.restore();
  // bir sonraki kare için: ekranın içindeki ekran
  FB.c.getContext('2d').drawImage(ctx.canvas, 0, 0, 320, 240);
  if (o.stamp && a > 0.3) {
    ctx.save();
    ctx.font = `28px ${FONT_OSD}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f2ecd0';
    ctx.shadowColor = 'rgba(0,0,0,.9)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(o.stamp, 22, H - 12);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ gece bahçesi, yanan varil
function flames(ctx, x, y, w, k, t) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 11; i++) {
    const fx = x - w / 2 + (i + 0.5) * (w / 11) + Math.sin(t * 7 + i) * 4;
    const h = (50 + hash(i * 13 + Math.floor(t * 9)) * 50 + Math.sin(t * 11 + i * 2) * 14) * k;
    const g = ctx.createLinearGradient(fx, y, fx, y - h);
    g.addColorStop(0, 'rgba(255,190,70,.9)');
    g.addColorStop(0.5, 'rgba(255,110,30,.55)');
    g.addColorStop(1, 'rgba(160,30,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(fx - 13, y);
    ctx.quadraticCurveTo(fx - 10 + Math.sin(t * 9 + i) * 8, y - h * 0.55, fx + Math.sin(t * 6 + i * 3) * 10, y - h);
    ctx.quadraticCurveTo(fx + 10 + Math.sin(t * 8 + i) * 6, y - h * 0.5, fx + 13, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Gece, bahçe: çam ve salıncak siluetleri, ortada yanan varil.
 * o.fire 0..1, o.flare 0..1 (parlama), o.stack yandaki kaset sayısı, o.hand 0..1 (varilin üstünde kaset tutan el),
 * o.reels: alevlerin içinde dönen makaralar, o.face 0..1 (alevlerde iki göz boşluğu), o.matchbox: yerde kibrit kutusu,
 * o.swing salıncak sallanması
 */
export function nightFire(ctx, t, o = {}) {
  const fire = o.fire ?? 1;
  const flare = o.flare ?? 0;
  const fl = 0.86 + Math.sin(t * 17) * 0.06 + Math.sin(t * 29 + 1) * 0.05 + flare * 0.6;
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#03050a');
  sky.addColorStop(1, '#0c0d13');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // ev ve çit silueti
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 210, 150, 90);
  ctx.beginPath();
  ctx.moveTo(-10, 214);
  ctx.lineTo(70, 160);
  ctx.lineTo(160, 214);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,170,90,.25)';
  ctx.fillRect(52, 236, 18, 22);
  for (let i = 0; i < 20; i++) ctx.fillRect(150 + i * 26, 262, 0, 0);
  ctx.fillStyle = '#08080a';
  for (let i = 0; i < 18; i++) ctx.fillRect(150 + i * 28, 258 - (i % 2) * 3, 8, 42);
  ctx.fillRect(150, 268, 490, 5);
  // çam (sağda, yaşlı)
  ctx.fillStyle = '#040506';
  ctx.fillRect(522, 150, 16, 160);
  for (let k = 0; k < 5; k++) {
    const y0 = 250 - k * 46;
    const w = 86 - k * 14;
    ctx.beginPath();
    ctx.moveTo(530 - w, y0);
    ctx.lineTo(530, y0 - 72);
    ctx.lineTo(530 + w, y0);
    ctx.closePath();
    ctx.fill();
  }
  // zemin
  const gr = ctx.createLinearGradient(0, 290, 0, H);
  gr.addColorStop(0, '#0b0d09');
  gr.addColorStop(1, '#050604');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 296, W, H - 296);
  // salıncak (solda)
  ctx.strokeStyle = '#0a0a0b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(60, 380);
  ctx.lineTo(96, 236);
  ctx.lineTo(132, 380);
  ctx.moveTo(196, 380);
  ctx.lineTo(232, 236);
  ctx.lineTo(268, 380);
  ctx.moveTo(90, 238);
  ctx.lineTo(238, 238);
  ctx.stroke();
  const sw = Math.sin(t * 1.3) * 0.12 * (o.swing ?? 0.4);
  ctx.save();
  ctx.translate(164, 240);
  ctx.rotate(sw);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-26, 100);
  ctx.moveTo(26, 0);
  ctx.lineTo(26, 100);
  ctx.stroke();
  ctx.fillStyle = '#0c0b0a';
  ctx.fillRect(-32, 98, 64, 8);
  ctx.restore();
  // ateşin ışığı
  const bx = 340, by = 318;
  const glow = ctx.createRadialGradient(bx, by - 20, 10, bx, by - 20, 300);
  glow.addColorStop(0, `rgba(255,140,50,${0.5 * fire * fl})`);
  glow.addColorStop(1, 'rgba(255,100,30,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // kaset yığını
  for (let i = 0; i < (o.stack ?? 0); i++) {
    ctx.fillStyle = '#0d0d0e';
    ctx.fillRect(430 + (i % 2) * 6, 420 - i * 13, 76, 12);
    ctx.fillStyle = `rgba(230,210,170,${0.35 * fire})`;
    ctx.fillRect(444 + (i % 2) * 6, 423 - i * 13, 44, 4);
  }
  if (o.matchbox) {
    ctx.save();
    ctx.translate(196, 432);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#6a2a1a';
    ctx.fillRect(-34, -14, 68, 28);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(-26, -8, 52, 16);
    ctx.fillStyle = '#6a2a1a';
    ctx.font = `14px ${FONT_OSD}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KİBRİT', 0, 1);
    ctx.fillStyle = '#d8c7a0';
    ctx.fillRect(38, -2, 46, 3);
    ctx.fillStyle = '#8a2a18';
    ell(ctx, 86, -0.5, 4, 3);
    ctx.fill();
    ctx.restore();
  }
  // varil
  const bg = ctx.createLinearGradient(bx - 60, 0, bx + 60, 0);
  bg.addColorStop(0, '#1a0f0a');
  bg.addColorStop(0.45, `rgb(${70 + 60 * fire * fl},${36 + 20 * fire},${20})`);
  bg.addColorStop(1, '#120a06');
  ctx.fillStyle = bg;
  ctx.fillRect(bx - 60, by, 120, 128);
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.lineWidth = 4;
  for (const yy of [by + 34, by + 86]) {
    ctx.beginPath();
    ctx.moveTo(bx - 60, yy);
    ctx.lineTo(bx + 60, yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#0a0604';
  ell(ctx, bx, by, 60, 12);
  ctx.fill();
  ctx.fillStyle = `rgba(255,120,40,${0.7 * fire})`;
  ell(ctx, bx, by + 1, 52, 8);
  ctx.fill();
  // alevlerde dönen makaralar
  if (o.reels) {
    for (const [rx, sp] of [[bx - 24, 1], [bx + 24, -1.3]]) {
      ctx.save();
      ctx.translate(rx, by - 18);
      ctx.rotate(t * 2.2 * sp);
      ctx.strokeStyle = 'rgba(20,10,6,.9)';
      ctx.lineWidth = 4;
      ell(ctx, 0, 0, 17, 17);
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  flames(ctx, bx, by - 2, 110, fire * fl, t);
  // alevlerde iki göz boşluğu (yüz gibi, bir an)
  if (o.face > 0.01) {
    ctx.fillStyle = `rgba(10,4,2,${0.8 * o.face})`;
    ell(ctx, bx - 18, by - 52, 8, 11);
    ctx.fill();
    ell(ctx, bx + 18, by - 52, 8, 11);
    ctx.fill();
  }
  // kıvılcımlar
  for (let i = 0; i < 26; i++) {
    const p = (t * (0.35 + hash(i) * 0.4) + hash(i * 7)) % 1;
    const sx = bx + (hash(i * 3) - 0.5) * 90 + Math.sin(t * 2 + i) * 14 * p;
    const sy = by - 30 - p * 230;
    ctx.fillStyle = `rgba(255,${150 + hash(i) * 80},60,${(1 - p) * fire})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // varilin üstüne sağ üstten uzanan kol, elinde bir kaset
  if (o.hand > 0.01) {
    const hx = bx + 20, hy = -140 + o.hand * 360;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a2622';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(hx + 260, hy - 240);
    ctx.lineTo(hx + 30, hy - 20);
    ctx.stroke();
    ctx.fillStyle = '#b88a6c';
    ell(ctx, hx + 18, hy - 8, 26, 20, -0.7);
    ctx.fill();
    ctx.translate(hx, hy + 8);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#0e0e0f';
    ctx.fillRect(-56, -6, 112, 26);
    ctx.fillStyle = 'rgba(232,220,192,.8)';
    ctx.fillRect(-36, -2, 72, 10);
    ctx.fillStyle = 'rgba(255,130,50,.3)';
    ctx.fillRect(-56, 10, 112, 10);
    ctx.restore();
  }
}

/** Ateşten çıkmış, kenarı erimiş kaset, yakın plan. o.reveal: etiketin yanık kısmı da okunur */
export function labelClose(ctx, t, o = {}) {
  ctx.fillStyle = '#0a0705';
  ctx.fillRect(0, 0, W, H);
  const fl = 0.85 + Math.sin(t * 15) * 0.08 + Math.sin(t * 23) * 0.05;
  const glow = ctx.createRadialGradient(320, 520, 20, 320, 520, 520);
  glow.addColorStop(0, `rgba(255,130,50,${0.55 * fl})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(320, 250 + Math.sin(t * 1.7) * 4);
  ctx.rotate(-0.06 + Math.sin(t * 1.1) * 0.015);
  // gövde, eriyip sarkmış alt kenar
  ctx.fillStyle = '#121112';
  ctx.beginPath();
  ctx.moveTo(-210, -110);
  ctx.lineTo(210, -110);
  ctx.lineTo(210, 70);
  for (let i = 0; i <= 14; i++) {
    const x = 210 - i * 30;
    ctx.lineTo(x, 70 + (i % 3 === 1 ? 26 + Math.sin(i * 3.1) * 10 : 8));
  }
  ctx.closePath();
  ctx.fill();
  // makara pencereleri
  ctx.fillStyle = '#2a2420';
  rr(ctx, -120, 0, 240, 48, 10);
  ctx.fill();
  ctx.fillStyle = '#5a4030';
  ell(ctx, -70, 24, 18, 18);
  ctx.fill();
  ell(ctx, 70, 24, 18, 18);
  ctx.fill();
  // etiket
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(-180, -96, 360, 80);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-180, -96, 360, 14);
  ctx.fillStyle = '#2b2018';
  ctx.font = `700 40px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Beste 1 — Tanışalım', -166, -42);
  // yanık: sağ taraf kahverengi-siyah (gerçek söylenince biraz açılır)
  const burn = ctx.createLinearGradient(-60, 0, 120, 0);
  const k = o.reveal ? 0.45 : 1;
  burn.addColorStop(0, 'rgba(60,30,10,0)');
  burn.addColorStop(0.35, `rgba(70,34,12,${0.85 * k})`);
  burn.addColorStop(1, `rgba(12,8,6,${k})`);
  ctx.fillStyle = burn;
  ctx.fillRect(-60, -98, 245, 86);
  ctx.restore();
  ctx.fillStyle = `rgba(255,120,40,${0.08 * fl})`;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ yanan bant
const HOLES = [[0.42, 0.38, 1], [0.66, 0.62, 0.72], [0.28, 0.7, 0.58], [0.74, 0.26, 0.46]];
/** Film yanığı: içi bembeyaz, kenarı turuncu ve kahverengi delikler büyür. k: 0..1 */
export function burnHoles(ctx, t, k, holes = HOLES) {
  if (k <= 0) return;
  ctx.save();
  for (const [hx, hy, s] of holes) {
    const r = Math.max(0, k * 1.6 - (1 - s)) * 430 * s;
    if (r <= 0.5) continue;
    const x = hx * W, y = hy * H;
    const blob = (rad, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const rr2 = rad * (1 + 0.12 * Math.sin(a * 5 + t * 3 + hx * 9) + 0.07 * Math.sin(a * 11 - t * 2));
        ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
      }
      ctx.closePath();
      ctx.fill();
    };
    blob(r * 1.09, 'rgba(40,16,4,.85)');
    blob(r * 1.03, '#ff8a24');
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.7, '#fff3c8');
    gr.addColorStop(1, '#ffc060');
    blob(r, gr);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ gizli kelime: görüntü donar
/** snap: donan kare (tuval), kind: 'gizli1' (Kâmil'in vizörü) | 'gizli2' (kibrit ışığı, köşeden yanık) */
export function wordFreeze(ctx, snap, t, kind) {
  const jy = Math.floor(t * 12) % 9 === 0 ? 4 : 0;
  ctx.drawImage(snap, 0, jy, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(0, 0, W, H);
  const by = ((t * 80) % (H + 60)) - 30;
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fillRect(0, by, W, 16);
  if (kind === 'gizli1') {
    viewfinder(ctx, t, { label: '14.05.98' });
  } else {
    const f = 0.5 + 0.5 * Math.sin(t * 23) * Math.sin(t * 7);
    const g = ctx.createRadialGradient(W / 2, H + 40, 20, W / 2, H + 40, 400);
    g.addColorStop(0, `rgba(255,140,40,${0.32 + 0.14 * f})`);
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    burnHoles(ctx, t, Math.min(0.3, t * 0.12), [[0.93, 0.1, 0.45]]);
  }
  ctx.save();
  ctx.font = `34px ${FONT_OSD}`;
  ctx.fillStyle = 'rgba(240,240,230,.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('❚❚', 30, H - 34);
  ctx.restore();
}

// KASET 10 çizimleri: kapılar + form şeridi, kapı II korkutması (mumlu Beste), gri adamın yaklaşması
import * as S from './scenes.js';
import { drawGreyMan } from './scenes3.js';
import { hash } from '../util.js';

const W = 640;
const H = 480;

/** Kapı III'ün altında "yarım bırakılmış" form şeridi */
export function formStrip(ctx, t, x, y, text) {
  ctx.save();
  const w = 168;
  S.rr(ctx, x - w / 2, y - 15, w, 30, 3);
  S.fill(ctx, 'rgba(226,218,196,.92)');
  S.stroke(ctx, 2, '#7a1018');
  ctx.fillStyle = '#26160e';
  ctx.font = `17px ${S.FONT_OSD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  // yarım kalan harflerin altındaki çizgi titrer
  if (text.includes('_') && Math.floor(t * 2) % 2) {
    ctx.fillStyle = '#b01818';
    ctx.fillRect(x + w / 2 - 44, y + 10, 30, 2);
  }
  ctx.restore();
}

/** Üç kapı; o.strip varsa III. kapının altına form şeridi çizilir */
export function doorsFrame(ctx, t, o = {}) {
  S.doors(ctx, t, o);
  if (o.strip) formStrip(ctx, t, 500, 392, o.strip);
}

/** Kapı II: 'beste' yüzü ve altında yanan yedi mum (yedi yaş, yedi mum) */
export function candleFace(ctx, t) {
  S.scareFace(ctx, t, 'beste', {});
  for (let i = 0; i < 7; i++) {
    const x = 104 + i * 72;
    const y = H - 16;
    ctx.fillStyle = '#efe4cf';
    ctx.fillRect(x - 7, y - 50, 14, 50);
    ctx.fillStyle = '#c23a3a';
    ctx.fillRect(x - 7, y - 36, 14, 5);
    const f = 14 + hash(Math.floor(t * 30) + i * 5) * 8;
    ctx.fillStyle = '#ffb030';
    ctx.beginPath();
    ctx.ellipse(x, y - 60, 5.5, f, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.ellipse(x, y - 56, 2.4, f * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tek karelik korkutma: yüzsüz gri adam objektife eğilir, uzun kolu kameraya uzanır */
export function greyLoom(ctx, t) {
  const k = Math.min(t, 0.5);
  const jx = (hash(Math.floor(t * 40)) - 0.5) * 16;
  const jy = (hash(Math.floor(t * 40) + 9) - 0.5) * 12;
  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 180, 20, W / 2, 220, 360);
  g.addColorStop(0, 'rgba(110,112,120,.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawGreyMan(ctx, W / 2 + jx, H + 470 + jy + k * 80, 760 + k * 400, { alpha: 1, headTilt: 0.32, reach: { x: W / 2 - 150, y: H * 0.72 } });
  const v = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(110,0,0,.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let y = Math.floor(t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

/** İyi son: gerçek Beste'nin arkasında bir an beliren gri adam */
export function manBehind(ctx, alpha) {
  if (alpha <= 0.01) return;
  drawGreyMan(ctx, 520, 486, 360, { alpha: alpha * 0.8, headTilt: -0.18 });
}

// Kasetteki sahneler (640x480). Her fonksiyon (ctx, t, o) alır, o = sahneye özel seçenekler.
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const OUT = '#2a1712';
export const FONT_CARTOON = '"Baloo 2", "Comic Sans MS", sans-serif';
export const FONT_OSD = '"VT323", "Courier New", monospace';
export const FONT_HAND = '"Caveat", "Segoe Print", cursive';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}
function stroke(ctx, lw = 4, c = OUT) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = c;
  ctx.stroke();
}
function fill(ctx, c) {
  ctx.fillStyle = c;
  ctx.fill();
}
function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr2 = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
}
function cloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 20 * s, y - 16 * s, 22 * s, Math.PI, Math.PI * 2);
  ctx.arc(x + 46 * s, y - 6 * s, 18 * s, Math.PI * 1.3, Math.PI * 0.5);
  ctx.closePath();
  fill(ctx, '#ffffff');
  stroke(ctx, 3);
}
/** Karanlık / solma katmanı */
function shade(ctx, dark) {
  if (dark > 0) {
    ctx.fillStyle = `rgba(5,2,10,${clamp(dark, 0, 1)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ cihaz ekranları
export function blueScreen(ctx, t, o = {}) {
  ctx.fillStyle = '#1a2ccf';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f4f4f4';
  ctx.font = `44px ${FONT_OSD}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(o.text ?? 'VİDEO', 48, 40);
  if (o.sub) {
    ctx.font = `32px ${FONT_OSD}`;
    ctx.fillText(o.sub, 48, 90);
  }
  if (o.clock) {
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(t * 1.2) % 2 ? '12:00' : '  :  ', W - 48, 40);
  }
}

export function noSignal(ctx, t) {
  staticNoise(ctx, t, 1);
}

export function staticNoise(ctx, t, amount = 1) {
  const img = staticNoise.img || (staticNoise.img = ctx.createImageData(160, 120));
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255 * amount;
  }
  const c = staticNoise.c || (staticNoise.c = document.createElement('canvas'));
  c.width = 160;
  c.height = 120;
  c.getContext('2d').putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = amount;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
}

export function warning(ctx, t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d2fb0';
  ctx.fillRect(60, 60, W - 120, H - 120);
  ctx.strokeStyle = '#f4f4f4';
  ctx.lineWidth = 3;
  ctx.strokeRect(72, 72, W - 144, H - 144);
  ctx.fillStyle = '#f4f4f4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `bold 40px ${FONT_OSD}`;
  ctx.fillText('UYARI', W / 2, 96);
  ctx.font = `26px ${FONT_OSD}`;
  const lines = [
    'Bu kaset yalnızca evde, aile ile',
    'birlikte izlenmek içindir.',
    '',
    'Kasetin kopyalanması, kiralanması',
    've yayınlanması yasaktır.',
    '',
    'YILDIZ ÇOCUK YAPIM  ©  1998',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 160 + i * 30));
}

export function endCard(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1f6b');
  g.addColorStop(1, '#030a2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, 200);
  star(ctx, 0, 0, 80, Math.sin(t) * 0.1);
  fill(ctx, o.decay ? '#8a7b3a' : '#ffd23f');
  stroke(ctx, 5, '#a0560f');
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 40px ${FONT_CARTOON}`;
  ctx.fillText('Yıldız Çocuk Yapım', W / 2, 330);
  ctx.font = `24px ${FONT_OSD}`;
  ctx.fillText('İZMİR  ·  1998', W / 2, 372);
}

export function bsod(ctx, t, o = {}) {
  ctx.fillStyle = '#0000aa';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.font = `26px ${FONT_OSD}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(W / 2 - 56, 70, 112, 28);
  ctx.fillStyle = '#0000aa';
  ctx.fillText(' BESTE ', W / 2, 72);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const lines = [
    'Ölümcül bir istisna 0E oluştu: 0028:C0011E36',
    'BESTE.VXD (01) + 00010E36 içinde. Geçerli',
    'kaset sonlandırılacak.',
    '',
    '*  Kaseti çıkarmak için herhangi bir tuşa basın.',
    '*  Bilgisayarınızı yeniden başlatmak için',
    '   CTRL+ALT+DEL tuşlarına basın. Kaydedilmemiş',
    '   tüm bilgileriniz kaybolacak.',
    '',
    '*  KAPI AÇIK.',
  ];
  lines.forEach((l, i) => {
    if (i === 9 && !o.door) return;
    ctx.fillText(l, 44, 130 + i * 27);
  });
  ctx.textAlign = 'center';
  if (Math.floor(t * 2) % 2) ctx.fillText('Devam etmek için bir tuşa basın _', W / 2, 420);
}

// ------------------------------------------------------------------ jenerik
export function titleCard(ctx, t, o = {}) {
  const decay = o.decay || 0;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, decay > 0.5 ? '#3a3550' : '#7fd3ff');
  g.addColorStop(1, decay > 0.5 ? '#1a1525' : '#d6f3ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // gökkuşağı
  const cols = ['#ff4b4b', '#ff9f3a', '#ffe14d', '#5ed35e', '#4aa8ff', '#9a6bff'];
  cols.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(W / 2, 420, 300 - i * 22, Math.PI, 0);
    ctx.lineWidth = 22;
    ctx.strokeStyle = decay > 0.5 ? `rgba(120,110,120,${0.6 - i * 0.07})` : c;
    ctx.stroke();
  });
  if (decay < 0.5) {
    cloud(ctx, 10, 420, 1.3);
    cloud(ctx, 520, 420, 1.3);
  }
  // dönen yıldızlar
  for (let i = 0; i < 9; i++) {
    const a = t * 0.4 + (i * Math.PI * 2) / 9;
    const x = W / 2 + Math.cos(a) * 250, y = 210 + Math.sin(a) * 140;
    star(ctx, x, y, 14 + (i % 3) * 5, t + i);
    fill(ctx, decay > 0.5 ? '#77705a' : '#fff3a6');
    stroke(ctx, 3);
  }
  const bob = Math.sin(t * 3) * 6 * (1 - decay);
  ctx.save();
  ctx.translate(W / 2, 170 + bob);
  ctx.rotate(-0.04);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 64px ${FONT_CARTOON}`;
  ctx.lineWidth = 14;
  ctx.strokeStyle = OUT;
  ctx.strokeText("Beste'nin", 0, -40);
  ctx.fillStyle = decay > 0.5 ? '#b9a66a' : '#ffd23f';
  ctx.fillText("Beste'nin", 0, -40);
  ctx.font = `800 58px ${FONT_CARTOON}`;
  ctx.strokeText('Sihirli Dünyası', 0, 26);
  ctx.fillStyle = decay > 0.5 ? '#a58c8c' : '#ff6fa8';
  ctx.fillText('Sihirli Dünyası', 0, 26);
  ctx.restore();
  if (o.episode) {
    ctx.textAlign = 'center';
    ctx.font = `800 30px ${FONT_CARTOON}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = OUT;
    ctx.strokeText(o.episode, W / 2, 312);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(o.episode, W / 2, 312);
    if (o.title) {
      ctx.font = `800 26px ${FONT_CARTOON}`;
      ctx.strokeText(o.title, W / 2, 350);
      ctx.fillText(o.title, W / 2, 350);
    }
  }
}

// ------------------------------------------------------------------ Beste'nin odası
export function bgBedroom(ctx, t, o = {}) {
  const night = o.night || 0;
  ctx.fillStyle = mixHex('#a9dcf7', '#3c4a6a', night);
  ctx.fillRect(0, 0, W, 340);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let y = 20; y < 340; y += 40)
    for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  // zemin
  ctx.fillStyle = mixHex('#d39a62', '#5a3f2e', night);
  ctx.fillRect(0, 340, W, 140);
  ctx.strokeStyle = 'rgba(80,40,20,.35)';
  ctx.lineWidth = 2;
  for (let y = 360; y < H; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 334, W, 8);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.strokeRect(-2, 334, W + 4, 8);

  // pencere
  rr(ctx, 200, 50, 140, 130, 6);
  fill(ctx, '#ffffff');
  stroke(ctx, 4);
  const sky = ctx.createLinearGradient(0, 60, 0, 170);
  sky.addColorStop(0, o.window === 'night' ? '#0a0f2a' : '#5bc2ff');
  sky.addColorStop(1, o.window === 'night' ? '#1b2340' : '#bfeaff');
  ctx.fillStyle = sky;
  ctx.fillRect(210, 60, 120, 110);
  ctx.save();
  ctx.beginPath();
  ctx.rect(210, 60, 120, 110);
  ctx.clip();
  if (o.window === 'night') {
    ctx.fillStyle = '#f0f0d0';
    ctx.beginPath();
    ctx.arc(300, 90, 14, 0, Math.PI * 2);
    ctx.fill();
    if (o.faceInWindow) {
      ctx.fillStyle = 'rgba(200,200,205,.85)';
      ctx.beginPath();
      ctx.ellipse(250, 140, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(232, 158, 36, 20);
    }
  } else {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(310, 82, 16, 0, Math.PI * 2);
    ctx.fill();
    cloud(ctx, 200 + ((t * 12) % 180), 120, 0.7);
  }
  ctx.restore();
  ctx.fillStyle = OUT;
  ctx.fillRect(268, 60, 4, 110);
  ctx.fillRect(210, 113, 120, 4);
  // perdeler
  for (const [x, dir] of [[192, 1], [348, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.quadraticCurveTo(x + dir * 30, 110, x + dir * 6, 190);
    ctx.lineTo(x - dir * 12, 190);
    ctx.lineTo(x - dir * 12, 44);
    ctx.closePath();
    fill(ctx, '#ff9fc4');
    stroke(ctx, 3);
  }

  // ALFABE posteri
  ctx.save();
  ctx.translate(30, 50);
  ctx.rotate(-0.03);
  rr(ctx, 0, 0, 128, 140, 3);
  fill(ctx, '#fffdf2');
  stroke(ctx, 3);
  ctx.fillStyle = '#e8323c';
  ctx.font = `800 22px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALFABE', 64, 18);
  const ab = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  ctx.font = `800 13px ${FONT_CARTOON}`;
  const palette = ['#e8323c', '#2c7be5', '#22a35a', '#f08c00'];
  for (let i = 0; i < ab.length; i++) {
    ctx.fillStyle = palette[i % 4];
    ctx.fillText(ab[i], 14 + (i % 6) * 20, 42 + Math.floor(i / 6) * 19);
  }
  ctx.restore();

  // takvim
  if (o.calendar !== false) {
    ctx.save();
    ctx.translate(372, 52);
    rr(ctx, 0, 0, 74, 92, 2);
    fill(ctx, '#ffffff');
    stroke(ctx, 3);
    ctx.fillStyle = '#e8323c';
    ctx.fillRect(2, 2, 70, 20);
    ctx.fillStyle = '#fff';
    ctx.font = `800 13px ${FONT_CARTOON}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAYIS 1998', 37, 13);
    ctx.fillStyle = '#333';
    ctx.font = `9px ${FONT_OSD}`;
    for (let d = 1; d <= 31; d++) {
      const cell = d + 4; // 1 Mayıs 1998 cuma
      const cx = 7 + (cell % 7) * 10, cy = 30 + Math.floor(cell / 7) * 11;
      ctx.fillText(String(d), cx, cy);
      if (d === 14) {
        ctx.strokeStyle = '#e8323c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // dolap
  rr(ctx, 470, 100, 150, 240, 6);
  fill(ctx, mixHex('#e4a96b', '#5c3d28', night));
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(545, 100);
  ctx.lineTo(545, 340);
  stroke(ctx, 3);
  for (const x of [532, 558]) {
    ctx.beginPath();
    ctx.arc(x, 220, 5, 0, Math.PI * 2);
    fill(ctx, '#ffd23f');
    stroke(ctx, 2);
  }
  // yatak
  rr(ctx, 6, 250, 26, 120, 6);
  fill(ctx, '#c8834d');
  stroke(ctx, 4);
  rr(ctx, 20, 300, 200, 60, 10);
  fill(ctx, '#ff8fb8');
  stroke(ctx, 4);
  rr(ctx, 30, 284, 60, 30, 12);
  fill(ctx, '#ffffff');
  stroke(ctx, 3);
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (let x = 110; x < 215; x += 24) {
    ctx.beginPath();
    ctx.arc(x, 330, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1a0d14';
  ctx.fillRect(28, 362, 188, 16);
  // oyuncak kutusu
  rr(ctx, 360, 350, 104, 70, 4);
  fill(ctx, '#4aa8ff');
  stroke(ctx, 4);
  rr(ctx, 354, 340, 116, 16, 4);
  fill(ctx, '#2c7be5');
  stroke(ctx, 4);
  star(ctx, 412, 386, 16, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3);

  if (o.highlight) highlightBox(ctx, t, o.highlight);
  shade(ctx, o.dark || 0);
}

function highlightBox(ctx, t, which) {
  const r = { closet: [464, 94, 162, 252], bed: [2, 244, 226, 140], box: [348, 334, 128, 92] }[which];
  if (!r) return;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(...r);
  ctx.restore();
}

/** İkinci kasetteki arama yakın planları */
export function searchCloset(ctx, t, o = {}) {
  ctx.fillStyle = '#5c3d28';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2b1a10';
  ctx.fillRect(40, 30, 560, 420);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(40, 70, 560, 8);
  const colors = ['#ffd23f', '#ff8fb8', '#7fd0ff', '#ffd23f', '#b4e06a'];
  colors.forEach((c, i) => {
    const x = 90 + i * 100;
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x - 30, 110);
    ctx.lineTo(x - 40, 260);
    ctx.lineTo(x + 40, 260);
    ctx.lineTo(x + 30, 110);
    ctx.closePath();
    fill(ctx, c);
    stroke(ctx, 3);
  });
  if (o.photo !== false) o.drawPhoto?.(ctx, 330, 360, 92, -0.12, t);
}

export function searchBed(ctx, t, o = {}) {
  ctx.fillStyle = '#050307';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1a0d14';
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = '#3a2420';
  ctx.fillRect(0, 400, W, 80);
  // karanlıkta gözler
  const blink = Math.floor(t * 0.8) % 4 === 3 ? 0.1 : 1;
  ctx.fillStyle = `rgba(240,240,220,${0.9 * (o.eyes ?? 1)})`;
  for (const x of [400, 440]) {
    ctx.beginPath();
    ctx.ellipse(x, 250, 9, 6 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(10,10,10,${o.eyes ?? 1})`;
  for (const x of [400, 440]) {
    ctx.beginPath();
    ctx.arc(x, 250, 2.5 * blink, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function searchBox(ctx, t, o = {}) {
  ctx.fillStyle = '#2c7be5';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1c4f9a';
  ctx.fillRect(40, 40, 560, 400);
  // oyuncaklar
  ctx.beginPath();
  ctx.arc(160, 300, 60, 0, Math.PI * 2);
  fill(ctx, '#ff4b4b');
  stroke(ctx, 4);
  rr(ctx, 420, 240, 110, 110, 6);
  fill(ctx, '#ffd23f');
  stroke(ctx, 4);
  ctx.fillStyle = OUT;
  ctx.font = `800 70px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', 475, 300);
  // kuyruk
  if (o.tail !== false) {
    ctx.beginPath();
    ctx.moveTo(250, 380);
    ctx.bezierCurveTo(300, 300, 360, 400, 400, 330);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 24;
    ctx.stroke();
    ctx.strokeStyle = '#f59a3c';
    ctx.lineWidth = 16;
    ctx.stroke();
    // kesik uç
    ctx.beginPath();
    ctx.ellipse(250, 380, 9, 7, 0.6, 0, Math.PI * 2);
    fill(ctx, o.bloody ? '#7a0a12' : '#d07a30');
    stroke(ctx, 3);
  }
}

// ------------------------------------------------------------------ bahçe & elma ağacı
export const APPLES = [[248, 130], [312, 96], [372, 128], [276, 190], [350, 186], [410, 176], [228, 196]];
export function bgGarden(ctx, t, o = {}) {
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
  // ağaç
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
  APPLES.forEach(([x, y], i) => {
    const hl = o.counted != null && i < o.counted;
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
    if (hl) {
      ctx.fillStyle = '#fff';
      ctx.font = `800 22px ${FONT_CARTOON}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeText(String(i + 1), x, y - 30);
      ctx.fillText(String(i + 1), x, y - 30);
    }
  });
  // çimen tutamları
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
}

// ------------------------------------------------------------------ piknik hazırlığı
export const PICNIC_ITEMS = ['elma', 'sandvic', 'limonata', 'kurabiye', 'ip'];
export function bgPicnic(ctx, t, o = {}) {
  bgBedroom(ctx, t, { calendar: true });
  const taken = o.taken || new Set();
  // masa
  rr(ctx, 360, 300, 260, 22, 4);
  fill(ctx, '#e4a96b');
  stroke(ctx, 4);
  for (const x of [380, 590]) {
    rr(ctx, x, 320, 16, 110, 3);
    fill(ctx, '#c8834d');
    stroke(ctx, 3);
  }
  if (!taken.has('elma')) {
    ctx.beginPath();
    ctx.arc(392, 284, 16, 0, Math.PI * 2);
    fill(ctx, '#e8323c');
    stroke(ctx, 3);
    ctx.beginPath();
    ctx.ellipse(400, 264, 8, 4, -0.5, 0, Math.PI * 2);
    fill(ctx, '#3fae49');
    stroke(ctx, 2);
  }
  if (!taken.has('sandvic')) {
    ctx.beginPath();
    ctx.moveTo(424, 300);
    ctx.lineTo(474, 300);
    ctx.lineTo(449, 262);
    ctx.closePath();
    fill(ctx, '#f6d28a');
    stroke(ctx, 3);
    ctx.fillStyle = '#7bd35a';
    ctx.fillRect(432, 288, 34, 5);
  }
  if (!taken.has('limonata')) {
    rr(ctx, 486, 240, 40, 60, 6);
    fill(ctx, 'rgba(255,255,255,.7)');
    stroke(ctx, 3);
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(490, 258, 32, 38);
    ctx.beginPath();
    ctx.arc(506, 256, 7, Math.PI, 0);
    stroke(ctx, 2);
  }
  if (!taken.has('kurabiye')) {
    ctx.beginPath();
    ctx.ellipse(574, 296, 34, 8, 0, 0, Math.PI * 2);
    fill(ctx, '#ffffff');
    stroke(ctx, 3);
    for (const [x, y] of [[560, 286], [580, 284], [572, 276]]) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      fill(ctx, '#c88a4a');
      stroke(ctx, 2.5);
      ctx.fillStyle = '#4a2a14';
      ctx.fillRect(x - 3, y - 2, 3, 3);
      ctx.fillRect(x + 2, y + 2, 3, 3);
    }
  }
  if (!taken.has('ip')) {
    // yerde, gölgede kıvrılmış bir ip
    ctx.save();
    ctx.translate(330, 448);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 9;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 38 - i * 9, 12 - i * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c9b37a';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 38 - i * 9, 12 - i * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(36, 2);
    ctx.quadraticCurveTo(70, 10, 90, -20);
    ctx.stroke();
    ctx.restore();
  }
  // sepet
  drawBasket(ctx, 110, 420, o.basket || []);
}

export function drawBasket(ctx, x, y, items = []) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, -40, 46, Math.PI, 0);
  ctx.lineWidth = 12;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#c8834d';
  ctx.stroke();
  items.forEach((it, i) => {
    const ix = -24 + i * 24;
    ctx.beginPath();
    ctx.arc(ix, -42, 13, 0, Math.PI * 2);
    fill(ctx, { elma: '#e8323c', sandvic: '#f6d28a', limonata: '#ffe14d', kurabiye: '#c88a4a', ip: '#c9b37a' }[it] || '#fff');
    stroke(ctx, 2.5);
  });
  ctx.beginPath();
  ctx.moveTo(-56, -40);
  ctx.lineTo(56, -40);
  ctx.lineTo(44, 0);
  ctx.lineTo(-44, 0);
  ctx.closePath();
  fill(ctx, '#e0a462');
  stroke(ctx, 4);
  ctx.strokeStyle = 'rgba(120,60,20,.6)';
  ctx.lineWidth = 2;
  for (let i = -36; i <= 36; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, -38);
    ctx.lineTo(i * 0.8, -2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff4b4b';
  ctx.fillRect(-56, -44, 112, 7);
  ctx.restore();
}

// ------------------------------------------------------------------ Çamlık Ormanı
export function bgForest(ctx, t, o = {}) {
  const dark = o.dark || 0;
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, mixHex('#7fd3ff', '#2a3048', dark));
  sky.addColorStop(1, mixHex('#d8f6ff', '#4a5068', dark));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // arka sıra çamlar
  for (let i = 0; i < 14; i++) pine(ctx, i * 50 + 10, 290, 130 + hash(i) * 50, mixHex('#2f6a3c', '#18301f', dark));
  // siluet: arka ağaçların arasında
  if (o.silhouette > 0) o.drawSilhouette?.(ctx, o.silX ?? 470, 296, 200, o.silhouette);
  for (let i = 0; i < 10; i++) pine(ctx, i * 70 + 40 + hash(i + 3) * 20, 330, 160 + hash(i + 7) * 40, mixHex('#3f8c4b', '#1f3a26', dark));
  // zemin
  ctx.fillStyle = mixHex('#7bc85a', '#2c4a2a', dark);
  ctx.fillRect(0, 320, W, 160);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(W, 320);
  ctx.stroke();
  // tabela
  rr(ctx, 516, 250, 10, 90, 2);
  fill(ctx, '#8a5a2e');
  stroke(ctx, 3);
  ctx.save();
  ctx.translate(520, 250);
  ctx.rotate(0.04);
  rr(ctx, -64, -36, 128, 46, 4);
  fill(ctx, '#c88a4a');
  stroke(ctx, 3);
  ctx.fillStyle = '#fff6d8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 20px ${FONT_CARTOON}`;
  ctx.fillText('ÇAMLIK', 0, -20);
  ctx.font = `800 12px ${FONT_CARTOON}`;
  ctx.fillText('PİKNİK ALANI', 0, -2);
  ctx.restore();
  // büyük ağaç (oyma burada)
  bigTree(ctx, 90, t, o.carving ?? 1);
  // çalılar
  for (const [x, y, r] of [[480, 380, 36], [530, 370, 44], [585, 384, 34]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.closePath();
    fill(ctx, mixHex('#3fae49', '#1f4a26', dark));
    stroke(ctx, 4);
  }
  if (o.shoe) {
    // çalının altından gri bir ayakkabı ucu
    ctx.beginPath();
    ctx.ellipse(520, 384, 22, 8, 0, 0, Math.PI * 2);
    fill(ctx, '#55575c');
  }
  // kütük
  rr(ctx, 360, 340, 70, 50, 6);
  fill(ctx, '#9a5a2e');
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.ellipse(395, 340, 35, 10, 0, 0, Math.PI * 2);
  fill(ctx, '#e0b07a');
  stroke(ctx, 3);
  ctx.beginPath();
  ctx.ellipse(395, 340, 18, 5, 0, 0, Math.PI * 2);
  stroke(ctx, 2, '#9a5a2e');
  // piknik örtüsü
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(160, 400);
  ctx.lineTo(340, 400);
  ctx.lineTo(370, 466);
  ctx.lineTo(130, 466);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#e8323c';
      ctx.fillRect(130 + i * 21, 400 + j * 17, 21, 17);
    }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(160, 400);
  ctx.lineTo(340, 400);
  ctx.lineTo(370, 466);
  ctx.lineTo(130, 466);
  ctx.closePath();
  stroke(ctx, 4);
  if (o.basket) drawBasket(ctx, 250, 438, o.basket);
  shade(ctx, dark * 0.3);
}

function pine(ctx, x, base, h, color) {
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x - 5, base - 20, 10, 20);
  for (let k = 0; k < 3; k++) {
    const y0 = base - 20 - k * (h / 4);
    const w = 44 - k * 10;
    ctx.beginPath();
    ctx.moveTo(x - w, y0);
    ctx.lineTo(x, y0 - h / 2.4);
    ctx.lineTo(x + w, y0);
    ctx.closePath();
    fill(ctx, color);
    stroke(ctx, 3);
  }
}

function bigTree(ctx, x, t, carving) {
  rr(ctx, x - 32, 140, 64, 240, 10);
  fill(ctx, '#8a5228');
  stroke(ctx, 4);
  ctx.strokeStyle = 'rgba(60,30,10,.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 20 + i * 8, 160 + hash(i) * 40);
    ctx.lineTo(x - 22 + i * 8, 220 + hash(i + 9) * 80);
    ctx.stroke();
  }
  for (const [dx, dy, r] of [[0, 90, 90], [-70, 120, 60], [70, 116, 62], [0, 40, 60]]) {
    ctx.beginPath();
    ctx.arc(x + dx, dy, r, 0, Math.PI * 2);
    fill(ctx, '#3a9a46');
    stroke(ctx, 4);
  }
  ctx.fillStyle = '#3a9a46';
  ctx.beginPath();
  ctx.arc(x, 96, 84, 0, Math.PI * 2);
  ctx.fill();
  if (carving > 0) {
    ctx.save();
    ctx.globalAlpha = carving;
    ctx.translate(x, 292);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `800 17px ${FONT_CARTOON}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a1d0a';
    ctx.strokeText('1405', 0, 4);
    ctx.fillStyle = '#ffe2b8';
    ctx.fillText('1405', 0, 4);
    ctx.restore();
  }
}

/** Ağaçtaki oymanın yakın planı */
export function treeCarving(ctx, t) {
  ctx.fillStyle = '#6e3f1e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(40,20,8,.6)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(hash(i) * W, 0);
    ctx.bezierCurveTo(hash(i + 1) * W, 160, hash(i + 2) * W, 320, hash(i + 3) * W, H);
    ctx.stroke();
  }
  // ekranda rahat okunsun: kalın, açık renkli, koyu kenarlı büyük rakamlar
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.04);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 54px ${FONT_CARTOON}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2a1206';
  ctx.strokeText('B.A.', 0, -112);
  ctx.fillStyle = '#ffe2b8';
  ctx.fillText('B.A.', 0, -112);
  ctx.font = `800 170px ${FONT_CARTOON}`;
  ctx.lineWidth = 16;
  ctx.strokeText('1405', 0, 30);
  ctx.fillText('1405', 0, 30);
  ctx.restore();
  // kalp yerine çizik bir daire
  ctx.strokeStyle = '#ffe2b8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2 - 10, 270, 190, 0, 0.2, Math.PI * 1.85);
  ctx.stroke();
}

// ------------------------------------------------------------------ kurallar tahtası
export const RULES = ['1. Her zaman gülümse.', '2. Sorulara cevap ver.', '3. Kaseti asla durdurma.', '4. Asla dışarı çıkma.'];
export function bgRules(ctx, t, o = {}) {
  ctx.fillStyle = mixHex('#c9b6f2', '#4a3a5a', o.dark || 0);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#8a6abf';
  ctx.fillRect(0, 380, W, 100);
  rr(ctx, 28, 46, 420, 300, 8);
  fill(ctx, '#a8743e');
  stroke(ctx, 4);
  ctx.fillStyle = '#2f5a3a';
  ctx.fillRect(44, 62, 388, 268);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = `700 34px ${FONT_HAND}`;
  ctx.fillText("BESTE'NİN KURALLARI", 64, 98);
  ctx.fillRect(64, 118, 300, 3);
  ctx.font = `700 30px ${FONT_HAND}`;
  const shown = o.shown ?? 4;
  RULES.slice(0, shown).forEach((r, i) => {
    ctx.fillStyle = o.highlight === i ? '#ffe14d' : 'rgba(255,255,255,.9)';
    ctx.fillText(r, 70, 160 + i * 44);
  });
  if (o.extra) {
    ctx.fillStyle = 'rgba(255,90,90,.9)';
    ctx.fillText(o.extra, 70, 160 + 4 * 44);
  }
  for (const [x, y] of [[420, 70], [60, 320]]) {
    star(ctx, x, y, 14, 0.3);
    fill(ctx, '#ffd23f');
    stroke(ctx, 2.5);
  }
}

// ------------------------------------------------------------------ üçüncü kaset
export function bgVoid(ctx, t, o = {}) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 420);
  g.addColorStop(0, '#5a0008');
  g.addColorStop(0.6, '#1a0003');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,40,40,.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  const words = o.words || ['YARDIM', 'ÇIKIŞ', 'KAPI', 'BESTE', '1405'];
  ctx.font = `28px ${FONT_OSD}`;
  ctx.textAlign = 'center';
  for (let i = 0; i < 9; i++) {
    const k = Math.floor(t * 2 + i * 1.7);
    if (hash(k + i) > 0.55) continue;
    ctx.fillStyle = `rgba(255,${60 + hash(k) * 60},${60},${0.15 + hash(k + 3) * 0.3})`;
    ctx.fillText(words[(k + i) % words.length], hash(k * 3 + i) * W, hash(k * 7 + i) * H);
  }
}

/** Pikselleşmiş, kırmızıya kaymış karakter çizimi için ara katman */
export function corrupt(ctx, draw, amount, t) {
  const c = corrupt.c || (corrupt.c = document.createElement('canvas'));
  c.width = W;
  c.height = H;
  const cc = c.getContext('2d');
  cc.clearRect(0, 0, W, H);
  draw(cc);
  const px = 1 + Math.floor(amount * 7);
  const s = corrupt.s || (corrupt.s = document.createElement('canvas'));
  s.width = Math.ceil(W / px);
  s.height = Math.ceil(H / px);
  const sc = s.getContext('2d');
  sc.clearRect(0, 0, s.width, s.height);
  sc.drawImage(c, 0, 0, s.width, s.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // kırmızı kanal kaydırması
  ctx.globalAlpha = 0.5 * amount;
  ctx.filter = 'sepia(1) saturate(6) hue-rotate(-50deg)';
  ctx.drawImage(s, 6 * amount, 0, W, H);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  // yatay dilim kaymaları
  const slices = 12;
  for (let i = 0; i < slices; i++) {
    const sy = (i * s.height) / slices;
    const sh = s.height / slices;
    const off = hash(i + Math.floor(t * 9)) > 0.75 ? (hash(i * 3 + Math.floor(t * 9)) - 0.5) * 60 * amount : 0;
    ctx.drawImage(s, 0, sy, s.width, sh, off, sy * px, W, sh * px);
  }
  ctx.restore();
}

export function doors(ctx, t, o = {}) {
  bgVoid(ctx, t, o);
  const open = o.open || [false, false, false];
  const xs = [140, 320, 500];
  xs.forEach((x, i) => {
    const active = o.active === i;
    ctx.save();
    ctx.translate(x, 260);
    if (open[i]) {
      const lg = ctx.createLinearGradient(0, -110, 0, 110);
      lg.addColorStop(0, '#fff');
      lg.addColorStop(1, '#ffd0d0');
      ctx.fillStyle = lg;
      ctx.fillRect(-56, -110, 112, 220);
      ctx.fillStyle = '#3a0006';
      ctx.beginPath();
      ctx.moveTo(-56, -110);
      ctx.lineTo(-30, -96);
      ctx.lineTo(-30, 96);
      ctx.lineTo(-56, 110);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = active ? '#5a0a10' : '#2a0306';
      ctx.fillRect(-56, -110, 112, 220);
      ctx.strokeStyle = active ? '#ff5050' : '#7a1018';
      ctx.lineWidth = 4;
      ctx.strokeRect(-56, -110, 112, 220);
      ctx.strokeRect(-40, -94, 80, 80);
      ctx.strokeRect(-40, 4, 80, 90);
      ctx.fillStyle = '#c9a040';
      ctx.beginPath();
      ctx.arc(38, 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = open[i] ? '#ff9a9a' : '#ff5050';
    ctx.font = `40px ${FONT_OSD}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(['I', 'II', 'III'][i], 0, -136);
    ctx.restore();
  });
  if (o.exitButton) {
    const pulse = 0.6 + Math.sin(t * 5) * 0.4;
    rr(ctx, W / 2 - 90, 404, 180, 50, 6);
    fill(ctx, `rgba(255,${40 + pulse * 60},${40 + pulse * 60},1)`);
    stroke(ctx, 4, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = `44px ${FONT_OSD}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ÇIKIŞ', W / 2, 430);
  }
}

/** Gerçek Beste'nin bulanık görüntüsü (gizli son ve ters mesaj) */
export function realGirl(ctx, t, o = {}) {
  ctx.fillStyle = '#0b0d0c';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.filter = 'blur(3px)';
  const a = o.alpha ?? 1;
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(W / 2, 200, 10, W / 2, 220, 260);
  g.addColorStop(0, '#6f7a74');
  g.addColorStop(1, '#0b0d0c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1c1612';
  ctx.beginPath();
  ctx.arc(W / 2, 190, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W / 2 - 70, 210, 18, 40, 0.3, 0, Math.PI * 2);
  ctx.ellipse(W / 2 + 70, 210, 18, 40, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9c8c78';
  ctx.beginPath();
  ctx.ellipse(W / 2, 205, 46, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1612';
  for (const dx of [-17, 17]) {
    ctx.beginPath();
    ctx.ellipse(W / 2 + dx, 200, 6, 4 + Math.max(0, Math.sin(t * 0.7)) * 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8a7a3a';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, 290);
  ctx.lineTo(W / 2 + 70, 290);
  ctx.lineTo(W / 2 + 120, 480);
  ctx.lineTo(W / 2 - 120, 480);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (o.flip) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ katmanlar
/** Ekrandaki cevap kutusu (Amanda'daki gibi televizyonun içinde). */
export function promptBox(ctx, t, text, o = {}) {
  const y = o.y ?? 400;
  const evil = o.evil;
  ctx.save();
  rr(ctx, 70, y, W - 140, 56, 10);
  ctx.fillStyle = evil ? 'rgba(20,0,0,.85)' : 'rgba(255,255,255,.92)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = evil ? '#ff3030' : OUT;
  ctx.stroke();
  ctx.font = evil ? `38px ${FONT_OSD}` : `800 30px ${FONT_CARTOON}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = evil ? '#ff6060' : '#2c7be5';
  const shown = (text || '').toLocaleUpperCase('tr');
  const cursor = Math.floor(t * 2.4) % 2 ? '_' : ' ';
  ctx.fillText('> ' + shown + cursor, 92, y + 30);
  ctx.restore();
}

export function optionsBar(ctx, opts, o = {}) {
  ctx.save();
  ctx.font = `800 22px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const y = o.y ?? 26;
  const text = opts.join('  ·  ');
  const w = Math.min(W - 20, ctx.measureText(text).width + 40);
  rr(ctx, W / 2 - w / 2, y - 18, w, 36, 18);
  ctx.fillStyle = o.evil ? 'rgba(30,0,0,.8)' : 'rgba(255,255,255,.85)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = o.evil ? '#ff3030' : OUT;
  ctx.stroke();
  ctx.fillStyle = o.evil ? '#ff6060' : '#e8323c';
  ctx.fillText(text, W / 2, y + 2);
  ctx.restore();
}

/** VCR ekran yazıları: OYNAT, DURAKLAT, GERİ SAR, sayaç */
export function osd(ctx, o) {
  ctx.save();
  ctx.font = `34px ${FONT_OSD}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f4f4f4';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  if (o.label) {
    ctx.textAlign = 'left';
    ctx.fillText(o.label, 30, 24);
  }
  if (o.counter != null) {
    ctx.textAlign = 'right';
    const s = Math.max(0, Math.floor(o.counter));
    const txt = `SP ${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    ctx.fillText(txt, W - 30, 24);
  }
  ctx.restore();
}

export function bigText(ctx, text, o = {}) {
  ctx.save();
  ctx.font = o.font || `40px ${FONT_OSD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#ff3030';
  const lines = String(text).split('\n');
  lines.forEach((l, i) => ctx.fillText(l, o.x ?? W / 2, (o.y ?? H / 2) + (i - (lines.length - 1) / 2) * (o.lh || 44)));
  ctx.restore();
}

function mixHex(a, b, t) {
  if (!t) return a;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

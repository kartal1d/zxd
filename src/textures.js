// Kodla üretilen dokular (harici görsel dosyası yok).
import * as THREE from 'three';
import { hash } from './util.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Değer gürültüsü (yumuşak) */
function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (a, b) => hash(a * 157.1 + b * 311.7 + seed * 71.3);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = s(xi, yi), b = s(xi + 1, yi), c = s(xi, yi + 1), d = s(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed = 0, oct = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * vnoise(x * f, y * f, seed + i);
    f *= 2;
    a *= 0.5;
  }
  return v;
}

/** Ahşap tahtalar. dir: tahtalar yatay mı dikey mi */
export function woodPlanks({ w = 1024, h = 1024, planks = 8, base = [118, 78, 46], vary = 26, seed = 1, gaps = true, worn = 0.3 } = {}) {
  const [c, ctx] = canvas(w, h);
  const ph = h / planks;
  const img = ctx.createImageData(w, h);
  const bump = ctx.createImageData(w, h);
  for (let p = 0; p < planks; p++) {
    const tone = (hash(p * 13.7 + seed) - 0.5) * vary;
    const off = hash(p + seed * 3) * 500;
    const seam = Math.floor(hash(p * 5.3 + seed) * w);
    for (let y = Math.floor(p * ph); y < Math.floor((p + 1) * ph); y++) {
      const ly = (y - p * ph) / ph;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const grain = Math.sin((x + off) * 0.018 + fbm((x + off) * 0.004, y * 0.06, seed + p, 3) * 9) * 0.5 + 0.5;
        const n = fbm(x * 0.02, y * 0.02, seed, 3);
        let k = 0.78 + grain * 0.18 + (n - 0.5) * 0.25;
        let edge = 1;
        if (gaps && (ly < 0.035 || ly > 0.965)) edge = 0.35;
        if (gaps && Math.abs(x - seam) < 2) edge = 0.4;
        const wear = fbm(x * 0.006, y * 0.006, seed + 9, 3) > 1 - worn ? 1.12 : 1;
        k *= edge * wear;
        img.data[i] = Math.min(255, (base[0] + tone) * k);
        img.data[i + 1] = Math.min(255, (base[1] + tone * 0.7) * k);
        img.data[i + 2] = Math.min(255, (base[2] + tone * 0.5) * k);
        img.data[i + 3] = 255;
        const b = edge < 1 ? 0 : 140 + grain * 80;
        bump.data[i] = bump.data[i + 1] = bump.data[i + 2] = b;
        bump.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const [bc, bctx] = canvas(w, h);
  bctx.putImageData(bump, 0, 0);
  return { map: tex(c), bump: tex(bc, [1, 1], false) };
}

/** Solmuş, lekeli 70'ler duvar kâğıdı */
export function wallpaper({ w = 512, h = 512 } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#8c8466';
  ctx.fillRect(0, 0, w, h);
  // dikey şeritler
  for (let x = 0; x < w; x += 64) {
    ctx.fillStyle = 'rgba(70,64,44,.35)';
    ctx.fillRect(x, 0, 6, h);
    ctx.fillStyle = 'rgba(160,150,110,.25)';
    ctx.fillRect(x + 30, 0, 3, h);
  }
  // çiçek motifleri
  for (let y = 32; y < h; y += 96)
    for (let x = 32 + ((y / 96) % 2) * 32; x < w; x += 64) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(110,60,40,.35)';
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0, 8, 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(60,80,50,.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  // lekeler ve kir
  const img = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = fbm(x * 0.01, y * 0.01, 4, 5);
      const stain = Math.max(0, n - 0.55) * 2.2;
      const drip = Math.max(0, fbm(x * 0.05, y * 0.004, 8, 3) - 0.62) * 3 * (y / h);
      const k = 1 - stain * 0.5 - drip * 0.4 + (Math.random() - 0.5) * 0.06;
      img.data[i] *= k;
      img.data[i + 1] *= k * 0.98;
      img.data[i + 2] *= k * 0.9;
    }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

/** Basit gri tonlu gürültü (bump/roughness için) */
export function noiseTex(size = 256, scale = 0.05, seed = 2) {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = fbm(x * scale, y * scale, seed, 4) * 200 + Math.random() * 40;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return tex(c, [1, 1], false);
}

export function cardboard() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#9b7a4e';
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const k = 0.85 + fbm(x * 0.03, y * 0.03, 5, 3) * 0.25 + Math.sin(y * 0.8) * 0.02;
      img.data[i] *= k;
      img.data[i + 1] *= k;
      img.data[i + 2] *= k;
    }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(200,190,160,.55)';
  ctx.fillRect(0, 118, 256, 20);
  ctx.fillStyle = 'rgba(40,30,20,.7)';
  ctx.font = 'bold 22px "Special Elite", monospace';
  ctx.fillText('KASETLER - NERMİN', 20, 80);
  return tex(c);
}

/** Kilim deseni */
export function kilim() {
  const [c, ctx] = canvas(512, 768);
  ctx.fillStyle = '#7a2420';
  ctx.fillRect(0, 0, 512, 768);
  ctx.fillStyle = '#2b2a4a';
  ctx.fillRect(24, 24, 464, 720);
  ctx.fillStyle = '#7a2420';
  ctx.fillRect(48, 48, 416, 672);
  const colors = ['#d9a441', '#efe1c4', '#2b2a4a', '#3c6b4a'];
  for (let k = 0; k < 5; k++) {
    const cy = 120 + k * 132;
    ctx.save();
    ctx.translate(256, cy);
    for (let r = 3; r >= 0; r--) {
      ctx.fillStyle = colors[r % colors.length];
      const s = 22 + r * 18;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 1.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 1.6, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    for (const sx of [100, 412]) {
      ctx.fillStyle = '#efe1c4';
      ctx.beginPath();
      ctx.moveTo(sx, cy - 20);
      ctx.lineTo(sx + 14, cy);
      ctx.lineTo(sx, cy + 20);
      ctx.lineTo(sx - 14, cy);
      ctx.fill();
    }
  }
  // aşınma
  const img = ctx.getImageData(0, 0, 512, 768);
  for (let y = 0; y < 768; y++)
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const k = 0.7 + fbm(x * 0.02, y * 0.02, 12, 4) * 0.4 + ((x + y) % 3 === 0 ? -0.05 : 0);
      img.data[i] *= k;
      img.data[i + 1] *= k;
      img.data[i + 2] *= k;
    }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

/** Pencereden görünen gece / şafak gökyüzü */
export function skyTexture(kind = 'night') {
  const [c, ctx] = canvas(256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if (kind === 'dawn') {
    g.addColorStop(0, '#5a6aa0');
    g.addColorStop(0.6, '#f0a070');
    g.addColorStop(1, '#ffd29a');
  } else {
    g.addColorStop(0, '#02040c');
    g.addColorStop(1, '#0c1630');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'night') {
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.2 + hash(i) * 0.7})`;
      ctx.fillRect(hash(i * 3) * 256, hash(i * 7) * 170, 1.2, 1.2);
    }
    ctx.fillStyle = '#e8e6cf';
    ctx.beginPath();
    ctx.arc(190, 60, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,230,207,.15)';
    ctx.beginPath();
    ctx.arc(190, 60, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  // ağaç ve çatı silüetleri
  ctx.fillStyle = kind === 'dawn' ? '#2a1c1c' : '#010205';
  ctx.beginPath();
  ctx.moveTo(0, 256);
  for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, 190 - fbm(x * 0.04, 1, 3, 3) * 70);
  ctx.lineTo(256, 256);
  ctx.fill();
  ctx.fillRect(150, 200, 70, 56);
  ctx.beginPath();
  ctx.moveTo(140, 200);
  ctx.lineTo(185, 170);
  ctx.lineTo(230, 200);
  ctx.fill();
  if (kind === 'night') {
    ctx.fillStyle = '#c9a050';
    ctx.fillRect(170, 214, 10, 12);
  }
  return tex(c);
}

/** Camdaki küçük el izleri (ikinci kasetten sonra) */
export function handprints() {
  const [c, ctx] = canvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  const hand = (x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    ctx.fillStyle = 'rgba(220,225,235,.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-10 + i * 7, -24 - (i === 1 || i === 2 ? 4 : 0), 3.2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(-17, -2, 3.5, 8, -0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  hand(80, 150, 0.1);
  hand(150, 120, -0.15);
  hand(110, 200, 0.3);
  return tex(c);
}

/** Masadaki mektup kâğıdı görüntüsü */
export function letterPaper() {
  const [c, ctx] = canvas(256, 360);
  ctx.fillStyle = '#e9dfc4';
  ctx.fillRect(0, 0, 256, 360);
  ctx.strokeStyle = 'rgba(40,40,90,.55)';
  ctx.lineWidth = 1.4;
  for (let y = 40; y < 330; y += 18) {
    ctx.beginPath();
    let x = 22;
    ctx.moveTo(x, y);
    const end = 200 + hash(y) * 36;
    while (x < end) {
      x += 6 + hash(x + y) * 8;
      ctx.lineTo(x, y + (hash(x * 3 + y) - 0.5) * 4);
    }
    ctx.stroke();
  }
  const img = ctx.getImageData(0, 0, 256, 360);
  for (let i = 0; i < img.data.length; i += 4) {
    const k = 0.92 + Math.random() * 0.08;
    img.data[i] *= k;
    img.data[i + 1] *= k;
    img.data[i + 2] *= k * 0.95;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

/** Mantar pano üstündeki gazete kupürü */
export function newspaper() {
  const [c, ctx] = canvas(256, 320);
  ctx.fillStyle = '#d8cca8';
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = '#2b241b';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('EGE POSTASI · 16 MAYIS 1998', 14, 22);
  ctx.fillRect(14, 28, 228, 2);
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText("ÇAMLIK'TA", 14, 58);
  ctx.fillText('KAYIP ÇOCUK', 14, 84);
  ctx.fillStyle = '#6b6658';
  ctx.fillRect(14, 96, 110, 90);
  ctx.fillStyle = '#3a352c';
  ctx.beginPath();
  ctx.arc(69, 130, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(52, 150, 34, 36);
  ctx.fillStyle = 'rgba(43,36,27,.65)';
  for (let y = 100; y < 300; y += 9) {
    const x0 = y < 190 ? 134 : 14;
    ctx.fillRect(x0, y, 228 - (x0 - 14) - hash(y) * 20, 3);
  }
  return tex(c);
}

/** Yüzsüz çocuk silueti (kapı arkası) */
export function girlSilhouette() {
  const [c, ctx] = canvas(256, 512);
  ctx.clearRect(0, 0, 256, 512);
  ctx.fillStyle = '#030303';
  ctx.beginPath();
  ctx.arc(128, 120, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(62, 140, 18, 40, 0.35, 0, Math.PI * 2);
  ctx.ellipse(194, 140, 18, 40, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(98, 170);
  ctx.lineTo(158, 170);
  ctx.lineTo(214, 400);
  ctx.lineTo(42, 400);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(92, 400, 22, 110);
  ctx.fillRect(142, 400, 22, 110);
  // gözler
  ctx.fillStyle = 'rgba(255,250,235,.95)';
  ctx.beginPath();
  ctx.arc(108, 122, 4.5, 0, Math.PI * 2);
  ctx.arc(148, 122, 4.5, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 4. kaset sahneleri: güvenlik dersi sınıfı, karaoke paneli, büyük rakamlar, kırmızı çevirmeli telefon,
// tavan arasının arkadan çekilmiş gizli karesi, alacakaranlıkta Çamlık ve kayıp kedi afişi.
import { rr, fill, stroke, star, mixHex, bgForest, bgBedroom, staticNoise, OUT, FONT_CARTOON, FONT_OSD, FONT_HAND } from './scenes.js';
import { drawTonton } from './characters.js';
import { hash, clamp } from '../util.js';
import { TV_W as W, TV_H as H } from '../tv.js';

const SKIN = '#ffd9b8';
const RED = '#e8323c';
const lerp = (a, b, t) => a + (b - a) * t;
const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

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
function sparkle(ctx, x, y, r, color = '#fff6b0') {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = color;
  ctx.fill();
}
export function fadeBlack(ctx, a) {
  if (a <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ jenerik rozeti
/** Jenerikte dönen "EĞİTİCİ BÖLÜM" rozeti. */
export function lessonBadge(ctx, t) {
  ctx.save();
  ctx.translate(552, 76);
  ctx.rotate(0.2 + Math.sin(t * 2) * 0.05);
  const s = 1 + Math.sin(t * 4) * 0.03;
  ctx.scale(s, s);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const r = i % 2 ? 50 : 61;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  fill(ctx, '#ffd23f');
  stroke(ctx, 4);
  circle(ctx, 0, 0, 42);
  stroke(ctx, 2, 'rgba(232,50,60,.6)');
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 17px ${FONT_CARTOON}`;
  ctx.fillText('EĞİTİCİ', 0, -9);
  ctx.fillText('BÖLÜM', 0, 11);
  ctx.restore();
}

// ------------------------------------------------------------------ sınıf
/** Küçük okul sırası (önündeki karakterin alt yarısını örter). x,y = karakterin ayak hizası. */
export function schoolDesk(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // bacaklar
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-70, -24, 8, 40);
  ctx.fillRect(62, -24, 8, 40);
  // ön panel
  rr(ctx, -78, -26, 156, 40, 4);
  fill(ctx, '#a8743e');
  stroke(ctx, 3);
  ctx.strokeStyle = 'rgba(80,40,10,.35)';
  ctx.lineWidth = 2;
  for (let i = -60; i < 70; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, -20);
    ctx.lineTo(i + 10, 8);
    ctx.stroke();
  }
  // isim kartı
  rr(ctx, -34, -18, 68, 20, 3);
  fill(ctx, '#fffaf0');
  stroke(ctx, 2);
  ctx.fillStyle = '#2c7be5';
  ctx.font = `800 13px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TONTON', 0, -7);
  // üst tabla
  rr(ctx, -88, -38, 176, 14, 4);
  fill(ctx, '#c88a4a');
  stroke(ctx, 3);
  // kitap ve kalem
  rr(ctx, 30, -46, 40, 9, 2);
  fill(ctx, '#e8323c');
  stroke(ctx, 2);
  ctx.save();
  ctx.translate(-56, -43);
  ctx.rotate(-0.15);
  rr(ctx, 0, 0, 34, 6, 2);
  fill(ctx, '#ffd23f');
  stroke(ctx, 1.5);
  ctx.restore();
  ctx.restore();
}

/** Beste'nin elindeki işaret çubuğu: sol elinden hedefe doğru. tapT: dokunma animasyonu başlangıcı. */
export function pointer(ctx, s, target, t, tapT = -9) {
  const sc = s.scale;
  const hx = s.x - 58 * sc, hy = s.y - 74 * sc + (s.tilt || 0) * 4;
  let dx = target.x - hx, dy = target.y - hy;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L;
  dy /= L;
  const tap = t - tapT < 0.9 ? Math.max(0, Math.sin((t - tapT) * 22)) * 12 : 0;
  const len = Math.min(L - 8, 205) - tap;
  const ex = hx + dx * len, ey = hy + dy * len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - dx * 14, hy - dy * 14);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#c88a4a';
  ctx.lineWidth = 5;
  ctx.stroke();
  circle(ctx, ex, ey, 6);
  fill(ctx, RED);
  stroke(ctx, 2.5);
  // tutan el
  circle(ctx, hx, hy, 10 * sc);
  fill(ctx, SKIN);
  stroke(ctx, 3.4 * sc);
  ctx.restore();
}

const RULE_FONT = `700 30px ${FONT_HAND}`;
/** bgRules başlığı uzun gelince: tahtaya biraz daha küçük yazılmış başlık (bgRules'a title: ' ' verilir). */
export function boardTitle(ctx, text) {
  ctx.save();
  ctx.font = `700 29px ${FONT_HAND}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  const w = ctx.measureText(text).width;
  const sx = Math.min(1, 352 / w);
  ctx.translate(64, 98);
  ctx.scale(sx, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
/** Tahtaya tebeşirle yazılan kural (p 0..1), bgRules ile aynı konumda. */
export function chalkWrite(ctx, text, i, p) {
  const y = 160 + i * 44;
  ctx.save();
  ctx.font = RULE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.beginPath();
  ctx.rect(60, y - 26, 10 + w * p, 52);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText(text, 70, y);
  ctx.restore();
  if (p < 1) {
    const x = 70 + w * p;
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -16, 9, 22);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-4, -16, 9, 22);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 5; k++) ctx.fillRect(x - 6 + hash(k + p * 50) * 10, y + 14 + hash(k * 3 + p * 70) * 14, 2, 2);
  }
  ctx.restore();
}

/** Bir kuralın tebeşiri aşağı doğru bulaşır (a 0..1). */
export function chalkSmudge(ctx, text, i, a) {
  const y = 160 + i * 44;
  ctx.save();
  ctx.font = RULE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(47,90,58,${0.8 * a})`;
  ctx.fillRect(62, y - 22, 368, 42);
  for (let k = 1; k <= 8; k++) {
    ctx.fillStyle = `rgba(232,238,230,${0.2 * a * (1 - k / 9)})`;
    ctx.fillText(text, 70 + k * 1.2 * a, y + k * 7 * a);
  }
  // avuç izi gibi silinti
  ctx.fillStyle = `rgba(255,255,255,${0.1 * a})`;
  for (let k = 0; k < 4; k++) {
    ellipse(ctx, 140 + k * 70, y + 30 * a, 26, 40 * a + 4, 0.2);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ karaoke
export const SLOT = '¤';
const VOW = /[aeıioöuüâîûAEIİOÖUÜÂÎÛ]/;
const LET = /\p{L}/u;
const NUM_SYL = { 364: 5, 27: 4, 51: 3, 80: 2 };

/** Türkçe heceleme: her hecede bir ünlü; iki ünlü arasındaki son ünsüz sonraki heceye geçer. */
function sylWord(word) {
  const dg = word.replace(/\D/g, '');
  if (dg && !LET.test(word)) return [{ s: word, w: NUM_SYL[dg] ?? dg.length }];
  const vi = [];
  for (let i = 0; i < word.length; i++) if (VOW.test(word[i])) vi.push(i);
  if (!vi.length) return [{ s: word, w: 0 }];
  const cuts = [0];
  for (let k = 1; k < vi.length; k++) {
    let cut = vi[k];
    for (let i = vi[k] - 1; i > vi[k - 1]; i--)
      if (LET.test(word[i])) {
        cut = i;
        break;
      }
    cuts.push(cut);
  }
  cuts.push(word.length);
  const out = [];
  for (let k = 0; k < cuts.length - 1; k++) out.push({ s: word.slice(cuts[k], cuts[k + 1]), w: 1 });
  return out;
}

/** Satırı hecelere böler: [{s, w, sp}] ve yer tutucu için {slot:true}. */
function lineTokens(line) {
  const toks = [];
  line.split(' ').forEach((word, wi) => {
    let sp = wi > 0;
    word.split(SLOT).forEach((seg, si) => {
      if (si) {
        toks.push({ slot: true, w: 0, sp });
        sp = false;
      }
      if (!seg) return;
      for (const sy of sylWord(seg)) {
        toks.push({ ...sy, sp });
        sp = false;
      }
    });
  });
  return toks;
}

/** Bir metindeki hece sayısı (ses süresi tahmini için). */
export function countSyllables(text) {
  return lineTokens(String(text).replace(/[^\p{L}\d ]+/gu, ' ')).reduce((a, t) => a + (t.w || 0), 0);
}

/** Satırların hece ağırlıkları: starts[i] = i. satırın başlangıcı, total = toplam. */
export function karaokeWeights(lines) {
  const starts = [];
  let total = 0;
  for (const l of lines) {
    starts.push(total);
    total += lineTokens(l).reduce((a, t) => a + (t.w || 0), 0);
  }
  return { starts, total };
}

export function newKaraoke() {
  return { lines: [], show: 0, lift: 0, sung: -1, from: 0, anim: null, jitter: 0.5, hi: '#ffd23f', star: '#ffd23f', dull: 0, slot: null, cursor: null, header: '♪ ŞARKI ZAMANI ♪', x0: 34, w: W - 68, font: 26, lh: 34 };
}

/**
 * Karaoke paneli. k.sung: söylenen hece ağırlığı (k.anim varsa t'ye göre hesaplanır).
 * k.slot: { mode: 'empty'|'hint'|'fill'|'wrong'|'turn', text, t0, strike }
 */
export function karaoke(ctx, t, k) {
  if (!k || k.show <= 0.002 || !k.lines.length) return;
  if (k.anim) k.sung = k.anim.from + clamp((t - k.anim.t0) / k.anim.dur, 0, 1) * (k.anim.to - k.anim.from);
  const n = k.lines.length, LH = k.lh, PAD = 14;
  const h = PAD * 2 + n * LH + 4;
  const x0 = k.x0, pw = k.w;
  const yBase = H - h - 8, yLift = 400 - h - 10;
  const y = lerp(yBase, yLift, k.lift || 0) + (1 - k.show) * (h + 40);
  const dull = k.dull || 0;
  ctx.save();
  // panel
  rr(ctx, x0, y, pw, h, 18);
  ctx.fillStyle = dull > 0.5 ? 'rgba(18,22,20,.9)' : 'rgba(34,16,78,.87)';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = dull > 0.5 ? '#8e948c' : '#ffd23f';
  ctx.stroke();
  // başlık sekmesi
  if (k.header) {
    ctx.font = `800 15px ${FONT_CARTOON}`;
    const hw = ctx.measureText(k.header).width + 26;
    rr(ctx, x0 + 22, y - 15, hw, 24, 12);
    fill(ctx, dull > 0.5 ? '#6f746d' : '#ff6fa8');
    stroke(ctx, 3);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(k.header, x0 + 35, y - 2);
  }
  // köşe yıldızları
  if (dull < 0.5)
    for (const [sx, sy] of [[x0 + pw - 20, y + 16], [x0 + 18, y + h - 16]]) {
      star(ctx, sx, sy, 8, t);
      fill(ctx, '#ffd23f');
      stroke(ctx, 2);
    }

  ctx.font = `800 ${k.font}px ${FONT_CARTOON}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const slotW = Math.round(k.font * 5.6);
  const spaceW = ctx.measureText(' ').width;
  const syl = []; // yıldız için heceler
  let slotPos = null;
  let cum = 0;
  const s = k.sung ?? -1;
  const cx0 = x0 + pw / 2;
  k.lines.forEach((line, li) => {
    const toks = lineTokens(line);
    let x = 0;
    for (const tk of toks) {
      if (tk.sp) x += spaceW;
      tk.x0 = x;
      x += tk.slot ? slotW : ctx.measureText(tk.s).width;
      tk.x1 = x;
    }
    const jx = (hash(Math.floor(t * 14) + li * 7.3) - 0.5) * 2 * k.jitter;
    const jy = (hash(Math.floor(t * 14) + li * 3.1 + 40) - 0.5) * k.jitter;
    const lx = cx0 - x / 2 + jx;
    const ly = y + PAD + 4 + LH * li + LH / 2 + jy;
    // dış çizgi, sonra dolgu
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#140826';
    for (const tk of toks) if (!tk.slot) ctx.strokeText(tk.s, lx + tk.x0, ly);
    ctx.fillStyle = dull > 0.5 ? '#d8dcd4' : '#ffffff';
    for (const tk of toks) if (!tk.slot) ctx.fillText(tk.s, lx + tk.x0, ly);
    // söylenen heceler renklenir
    for (const tk of toks) {
      if (tk.slot) {
        slotPos = { x0: lx + tk.x0, x1: lx + tk.x1, y: ly };
        continue;
      }
      const c0 = cum;
      cum += tk.w;
      if (tk.w > 0) syl.push({ cx: lx + (tk.x0 + tk.x1) / 2, top: ly - k.font * 0.62, c0, w: tk.w });
      if (s < 0 || c0 < (k.from || 0) - 1e-6) continue;
      const fr = tk.w > 0 ? clamp((s - c0) / tk.w, 0, 1) : s >= c0 ? 1 : 0;
      if (fr <= 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx + tk.x0 - 3, ly - LH, (tk.x1 - tk.x0) * fr + (fr >= 1 ? 6 : 3), LH * 2);
      ctx.clip();
      ctx.fillStyle = k.hi;
      ctx.fillText(tk.s, lx + tk.x0, ly);
      ctx.restore();
    }
    // yeniden yazma imleci
    if (k.cursor && k.cursor.li === li) {
      const pre = line.slice(0, k.cursor.ci);
      const cxp = lx + ctx.measureText(pre.replace(SLOT, '')).width + (pre.includes(SLOT) ? slotW : 0);
      ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffffff' : '#ff3a3a';
      ctx.fillRect(cxp + 1, ly - 15, 12, 30);
      ctx.fillStyle = 'rgba(255,60,60,.6)';
      ctx.fillRect(cxp - 30 + hash(Math.floor(t * 30)) * 40, ly - 3 + (hash(Math.floor(t * 30) + 5) - 0.5) * 20, 60, 3);
    }
  });
  if (slotPos) drawSlot(ctx, t, k.slot, slotPos, k.font, dull);

  // zıplayan yıldız
  if (syl.length && k.star) {
    let sx, sy;
    const slotPt = slotPos && k.slot && (k.slot.mode === 'empty' || k.slot.mode === 'hint') ? { cx: (slotPos.x0 + slotPos.x1) / 2, top: slotPos.y - k.font * 0.75 } : null;
    if (s < 0) {
      const q = syl.find((q) => q.c0 >= (k.from || 0) - 1e-6) || syl[0];
      sx = q.cx;
      sy = q.top - 8 - Math.abs(Math.sin(t * 4)) * 6;
    } else {
      const i = syl.findIndex((q) => s < q.c0 + q.w - 1e-6);
      if (i === -1) {
        const q = slotPt || syl[syl.length - 1];
        sx = q.cx;
        sy = q.top - 8 - Math.abs(Math.sin(t * 5)) * 10;
      } else {
        const q = syl[i];
        const f = clamp((s - q.c0) / q.w, 0, 1);
        const nx = syl[i + 1] || slotPt || q;
        sx = lerp(q.cx, nx.cx, f);
        sy = lerp(q.top, nx.top, f) - 8 - Math.sin(f * Math.PI) * 20;
      }
    }
    ctx.save();
    ctx.shadowColor = k.star;
    ctx.shadowBlur = dull > 0.5 ? 0 : 12;
    star(ctx, sx, sy, 11, t * 3);
    fill(ctx, k.star);
    ctx.shadowBlur = 0;
    stroke(ctx, 2.5);
    ctx.restore();
  }
  ctx.restore();
}

function drawSlot(ctx, t, slot, p, font, dull) {
  const mode = slot?.mode || 'empty';
  const w = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2, ly = p.y;
  ctx.save();
  rr(ctx, p.x0 + 3, ly - font * 0.72, w - 6, font * 1.44, 9);
  ctx.fillStyle = mode === 'turn' ? 'rgba(120,20,20,.25)' : 'rgba(255,255,255,.13)';
  ctx.fill();
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = mode === 'turn' ? 'rgba(255,90,90,.7)' : 'rgba(255,255,255,.7)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 ${font + 2}px ${FONT_CARTOON}`;
  const outline = (txt, x, col) => {
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#140826';
    ctx.strokeText(txt, x, ly);
    ctx.fillStyle = col;
    ctx.fillText(txt, x, ly);
  };
  if (mode === 'empty') {
    outline('______', cx, 'rgba(255,255,255,.75)');
    if (Math.floor(t * 2.4) % 2) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(cx + 46, ly - 12, 4, 24);
    }
  } else if (mode === 'hint') {
    ctx.textAlign = 'left';
    const a = 'GEL', b = '___';
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    const sx = cx - (wa + wb) / 2;
    outline(a, sx, '#ffd23f');
    outline(b, sx + wa, 'rgba(255,255,255,.75)');
  } else if (mode === 'fill') {
    const q = clamp((t - (slot.t0 ?? -9)) / 0.4, 0, 1);
    const sc = backOut(q);
    ctx.save();
    ctx.translate(cx, ly);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -ly);
    const gr = ctx.createLinearGradient(0, ly - 14, 0, ly + 14);
    gr.addColorStop(0, '#fff7a8');
    gr.addColorStop(1, '#ff6fa8');
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#140826';
    ctx.strokeText(slot.text, cx, ly);
    ctx.fillStyle = gr;
    ctx.fillText(slot.text, cx, ly);
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + t * 0.8;
      const r = 3 + Math.abs(Math.sin(t * 4 + i * 1.7)) * 6;
      sparkle(ctx, cx + Math.cos(a) * w * 0.52, ly + Math.sin(a * 1.3) * font * 0.85, r);
    }
  } else if (mode === 'wrong') {
    outline(slot.text, cx, '#ff5a5a');
    const st = slot.strike || 0;
    if (st > 0) {
      const tw = ctx.measureText(slot.text).width;
      ctx.strokeStyle = '#ff2020';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - tw / 2 - 6, ly + 2);
      ctx.lineTo(cx - tw / 2 - 6 + (tw + 12) * st, ly - 2);
      ctx.stroke();
    }
  } else {
    // dönmüş hali: soluk, titreyen harfler
    const jx = (hash(Math.floor(t * 18)) - 0.5) * 4 * (dull || 1);
    ctx.globalAlpha = 0.6;
    outline(slot.text, cx + jx + 3, 'rgba(255,60,60,.7)');
    ctx.globalAlpha = 1;
    outline(slot.text, cx + jx, '#d7dcd2');
  }
  ctx.restore();
}

// ------------------------------------------------------------------ büyük rakamlar
const GROUP_COL = ['#ff4b4b', '#4aa8ff', '#5ed35e'];
function popScale(p, t) {
  if (p == null) return 0;
  return backOut(clamp((t - p) / 0.35, 0, 1));
}
/**
 * Zıplayan büyük rakamlar. o = { text '364 27 27', all, pop:[t..], jump:[t..], hidden, flash, card,
 * turned:Set(rakam indeksleri), glitch: rakam indeksi, pulse7, size, y, bounce }
 */
export function bigDigits(ctx, t, o) {
  if (!o || !o.text) return;
  const size = o.size || 76;
  const y = o.y ?? 92;
  ctx.save();
  ctx.font = `800 ${size}px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const groups = o.text.split(' ');
  const gap = size * 0.5, pad = size * 0.06;
  const widths = groups.map((gr) => [...gr].map((ch) => ctx.measureText(o.hidden ? '?' : ch).width + pad));
  const total = widths.reduce((a, ws, i) => a + ws.reduce((p, q) => p + q, 0) + (i ? gap : 0), 0);
  const anyVisible = o.all || (o.pop && o.pop.some((p) => p != null));
  const card = Math.max(o.flash || 0, o.card || 0);
  if (card > 0 && anyVisible) {
    rr(ctx, W / 2 - total / 2 - 26, y - size * 0.66, total + 52, size * 1.3, 22);
    ctx.fillStyle = `rgba(255,255,255,${0.9 * card})`;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(42,23,18,${card})`;
    ctx.stroke();
  }
  let x = W / 2 - total / 2, ci = 0;
  const bounce = o.bounce ?? 1;
  groups.forEach((gr, gi) => {
    const sc = o.all ? 1 : popScale(o.pop?.[gi], t);
    if (gi) {
      if (sc > 0.01) {
        circle(ctx, x + gap / 2, y + size * 0.05, size * 0.075);
        fill(ctx, '#ffd23f');
        stroke(ctx, 3);
      }
      x += gap;
    }
    [...gr].forEach((ch, k) => {
      const cw = widths[gi][k];
      if (sc > 0.01) {
        let yy = y + Math.sin(t * 5 + ci * 0.8) * bounce * 4;
        const j = o.jump?.[gi];
        if (j != null && t >= j && t - j < 0.34) yy -= Math.sin(((t - j) / 0.34) * Math.PI) * size * 0.3;
        let s2 = sc;
        if (o.pulse7 && ch === '7') s2 *= 1 + 0.25 * Math.abs(Math.sin(t * 5));
        ctx.save();
        ctx.translate(x + cw / 2, yy);
        ctx.scale(s2, s2);
        ctx.rotate(Math.sin(t * 3 + ci) * 0.06 * bounce);
        const turned = o.turned?.has(ci);
        const col = turned ? '#a3aaa0' : GROUP_COL[gi % 3];
        if (o.hidden) {
          rr(ctx, -cw / 2 + 2, -size * 0.5, cw - 4, size, 10);
          fill(ctx, 'rgba(255,255,255,.5)');
          stroke(ctx, 3);
        }
        const txt = o.hidden ? '?' : ch;
        if (o.glitch === ci) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#00e5ff';
          ctx.fillText(txt, -6, 2);
          ctx.fillStyle = '#ff2050';
          ctx.fillText(txt, 6, -2);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.fillRect(-cw / 2, -size * 0.1 + (hash(Math.floor(t * 40)) - 0.5) * size * 0.6, cw, size * 0.12);
        }
        ctx.lineWidth = size * 0.15;
        ctx.strokeStyle = OUT;
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = o.hidden ? '#8a8f99' : col;
        ctx.fillText(txt, 0, 0);
        if (!o.hidden && !turned) {
          // parlama
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.beginPath();
          ctx.ellipse(-cw * 0.12, -size * 0.2, cw * 0.12, size * 0.08, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      x += cw;
      ci++;
    });
  });
  ctx.restore();
}

// ------------------------------------------------------------------ telefon seti
export const PHONE = { x: 446, y: 300 };
export const PHONE_CORD = { x: PHONE.x - 74, y: PHONE.y - 12 };

/** Beste'nin evinin koridoru: duvar kâğıdı, kanaviçe, saat ve telefon sehpası. o.clock = {h, m} (gerçek saat). */
export function bgPhoneSet(ctx, t, o = {}) {
  ctx.fillStyle = '#fff0b3';
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = 'rgba(255,186,90,.3)';
  for (let x = 12; x < W; x += 48) ctx.fillRect(x, 0, 18, 300);
  ctx.fillStyle = 'rgba(255,120,160,.55)';
  for (let x = 45; x < W; x += 48)
    for (let y = 30 + ((x / 48) % 2) * 30; y < 290; y += 60) {
      circle(ctx, x, y, 4);
      ctx.fill();
    }
  // lambri
  ctx.fillStyle = '#c9844a';
  ctx.fillRect(0, 290, W, 60);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.strokeRect(-4, 290, W + 8, 60);
  ctx.strokeStyle = 'rgba(70,35,10,.45)';
  for (let x = 10; x < W; x += 80) ctx.strokeRect(x, 298, 64, 44);
  // zemin
  ctx.fillStyle = '#e0a56c';
  ctx.fillRect(0, 350, W, 130);
  ctx.strokeStyle = 'rgba(80,40,20,.3)';
  ctx.lineWidth = 2;
  for (let yy = 372; yy < H; yy += 26) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(W, yy);
    ctx.stroke();
  }
  // halı
  ellipse(ctx, 250, 446, 190, 26);
  fill(ctx, '#7fb8e8');
  stroke(ctx, 3);
  ellipse(ctx, 250, 446, 160, 18);
  stroke(ctx, 2, 'rgba(255,255,255,.6)');

  // kanaviçe: EVİM GÜZEL EVİM
  ctx.save();
  ctx.translate(34, 116);
  ctx.rotate(-0.02);
  rr(ctx, 0, 0, 126, 96, 4);
  fill(ctx, '#8a5a2e');
  stroke(ctx, 3);
  rr(ctx, 9, 9, 108, 78, 2);
  fill(ctx, '#fffaf0');
  ctx.fillStyle = '#d42c2c';
  ctx.font = `800 13px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EVİM', 63, 24);
  ctx.fillText('GÜZEL EVİM', 63, 72);
  // küçük ev
  ctx.beginPath();
  ctx.moveTo(48, 50);
  ctx.lineTo(63, 36);
  ctx.lineTo(78, 50);
  ctx.closePath();
  fill(ctx, '#d42c2c');
  ctx.fillStyle = '#2c7be5';
  ctx.fillRect(52, 50, 22, 12);
  ctx.restore();

  // duvar saati (gerçek saat)
  const cx = 590, cy = 196;
  circle(ctx, cx, cy, 36);
  fill(ctx, '#ff6fa8');
  stroke(ctx, 4);
  circle(ctx, cx, cy, 28);
  fill(ctx, '#ffffff');
  stroke(ctx, 2);
  ctx.fillStyle = OUT;
  ctx.font = `800 11px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [[12, 0, -20], [3, 20, 0], [6, 0, 20], [9, -20, 0]].forEach(([n, dx, dy]) => ctx.fillText(String(n), cx + dx, cy + dy));
  const ck = o.clock || { h: 10, m: 10 };
  const hand = (a, len, w, col) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  hand((((ck.h % 12) + ck.m / 60) / 12) * Math.PI * 2, 13, 4, OUT);
  hand((ck.m / 60) * Math.PI * 2, 20, 3, OUT);
  hand(t * (Math.PI / 30), 22, 1.5, RED);
  circle(ctx, cx, cy, 3);
  fill(ctx, OUT);

  // sehpa
  const tx = PHONE.x, ty = PHONE.y + 4;
  rr(ctx, tx - 9, ty + 4, 18, 342 - ty + 76, 4);
  fill(ctx, '#7a4524');
  stroke(ctx, 3);
  ellipse(ctx, tx, 424, 50, 10);
  fill(ctx, '#7a4524');
  stroke(ctx, 3);
  ellipse(ctx, tx, ty + 6, 96, 18);
  fill(ctx, '#8a4f28');
  stroke(ctx, 4);
  ellipse(ctx, tx, ty, 96, 18);
  fill(ctx, '#b0683a');
  stroke(ctx, 4);
  // dantel örtü
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 1 + (i % 2) * 0.06;
    ctx.lineTo(tx + Math.cos(a) * 72 * r, ty + Math.sin(a) * 12 * r);
  }
  ctx.closePath();
  fill(ctx, '#ffffff');
  stroke(ctx, 2, 'rgba(42,23,18,.5)');
}

function curlyCord(ctx, ax, ay, bx, by, loops = 11) {
  const mx = (ax + bx) / 2, my = Math.max(ay, by) + 40;
  ctx.save();
  ctx.beginPath();
  const N = 110;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx;
    const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
    const a = u * loops * Math.PI * 2;
    const r = Math.min(1, u * 8, (1 - u) * 8) * 5;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.8;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#c0222c';
  ctx.stroke();
  ctx.restore();
}

/** Ahize (el koordinatında, gövde y ekseninde; kulaklık -y, ağızlık +y, kaplar -x tarafında). */
function drawHandset(ctx) {
  for (const yy of [-32, 32]) {
    ellipse(ctx, -9, yy, 12, 16);
    fill(ctx, RED);
    stroke(ctx, 4);
    ellipse(ctx, -14, yy, 4, 9);
    fill(ctx, '#9a1a22');
  }
  ctx.beginPath();
  ctx.moveTo(-3, -30);
  ctx.quadraticCurveTo(10, 0, -3, 30);
  ctx.lineCap = 'round';
  ctx.lineWidth = 22;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -18);
  ctx.quadraticCurveTo(7, -4, 4, 8);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.stroke();
}

/** Büyük kırmızı çevirmeli çizgi film telefonu (sehpanın üstünde). o.off: ahize kaldırılmış. */
export function cartoonPhone(ctx, t, o = {}) {
  const x = o.x ?? PHONE.x, y = o.y ?? PHONE.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  // gövde
  ctx.beginPath();
  ctx.moveTo(-74, 0);
  ctx.lineTo(74, 0);
  ctx.bezierCurveTo(72, -30, 62, -56, 46, -62);
  ctx.lineTo(-46, -62);
  ctx.bezierCurveTo(-62, -56, -72, -30, -74, 0);
  ctx.closePath();
  fill(ctx, RED);
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(-50, -50);
  ctx.quadraticCurveTo(-60, -30, -62, -10);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineCap = 'round';
  ctx.stroke();
  // kadran
  circle(ctx, 0, -28, 26);
  fill(ctx, '#fff4dc');
  stroke(ctx, 3);
  for (let k = 0; k < 10; k++) {
    const a = ((-30 - k * 30) * Math.PI) / 180;
    circle(ctx, Math.cos(a) * 17, -28 + Math.sin(a) * 17, 4);
    fill(ctx, '#2a1712');
  }
  circle(ctx, 0, -28, 8);
  fill(ctx, '#ffffff');
  stroke(ctx, 2);
  star(ctx, 0, -28, 5, 0);
  fill(ctx, '#ffd23f');
  // çatal
  for (const sx of [-40, 40]) {
    rr(ctx, sx - 7, -76, 14, 16, 4);
    fill(ctx, '#c42530');
    stroke(ctx, 3);
    if (o.off) {
      rr(ctx, sx - 4, -84, 8, 10, 2);
      fill(ctx, '#ffffff');
      stroke(ctx, 2);
    }
  }
  if (!o.off) {
    // ahize çatalın üstünde
    ctx.save();
    ctx.translate(0, -78);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(1.25, 1.6);
    drawHandset(ctx);
    ctx.restore();
    curlyCord(ctx, -58, -70, -72, -14, 5);
  } else {
    curlyCord(ctx, -72, -14, -76, -6, 1);
  }
  ctx.restore();
}

/**
 * Ahizeyi kulağına tutan Beste. s = beste konumu {x, y, scale}; drawFn(ctx) Beste'yi normal çizer;
 * sağ kolunun aşağı sarkan kısmı kırpılır, yerine kalkık kol + ahize çizilir. o.lift 1 = kulakta, 0 = aşağıda.
 */
export function besteOnPhone(ctx, s, drawFn, o = {}) {
  const sc = s.scale, bx = s.x, by = s.y;
  const P = (lx, ly) => [bx + lx * sc, by + ly * sc];
  ctx.save();
  ctx.beginPath();
  ctx.rect(-20, -20, W + 40, H + 40);
  [[36.8, -147], [160, -147], [160, -30], [68.8, -53]].forEach(([px, py], i) => {
    const [X, Y] = P(px, py);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  });
  ctx.closePath();
  ctx.clip('evenodd');
  drawFn(ctx);
  ctx.restore();

  const lift = clamp(o.lift ?? 1, 0, 1);
  const E = [lerp(58, 68, lift), lerp(-116, -138, lift)];
  const Hd = [lerp(94, 58, lift), lerp(-112, -170, lift)];
  const ang = lerp(1.25, 0.45, lift);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(sc, sc);
  limb(ctx, [[34, -140], E, Hd], 12, SKIN);
  ctx.save();
  ctx.translate(Hd[0], Hd[1]);
  ctx.rotate(ang);
  ctx.scale(1.25, 1.25);
  drawHandset(ctx);
  ctx.restore();
  circle(ctx, Hd[0], Hd[1], 10);
  fill(ctx, SKIN);
  stroke(ctx, 4);
  ctx.restore();
  // kıvırcık kablo: ağızlıktan telefona
  const mx = -11, my = 55;
  const lx = Hd[0] + mx * Math.cos(ang) - my * Math.sin(ang);
  const ly = Hd[1] + mx * Math.sin(ang) + my * Math.cos(ang);
  const [ax, ay] = P(lx, ly);
  const to = o.cordTo || PHONE_CORD;
  curlyCord(ctx, ax, ay, to.x, to.y, 12);
}

// ------------------------------------------------------------------ kadran yakın planı
export const dialAngle = (digit) => ((-30 - (digit === 0 ? 9 : digit - 1) * 30) * Math.PI) / 180;
export const dialTravel = (digit) => ((60 + (digit === 0 ? 9 : digit - 1) * 30) * Math.PI) / 180;

/** o = { rot, digit, finger 0..1, typed: '3645', pattern: '364 51 80' } */
export function dialCloseup(ctx, t, o = {}) {
  const g = ctx.createRadialGradient(240, 150, 30, 320, 290, 560);
  g.addColorStop(0, '#ff7676');
  g.addColorStop(0.45, RED);
  g.addColorStop(1, '#7a0c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(320, 300, 236, 3.5, 4.3);
  ctx.stroke();
  const cx = 320, cy = 296, rot = o.rot || 0;
  // taban plakası ve rakamlar
  circle(ctx, cx, cy, 176);
  fill(ctx, '#f6efe0');
  stroke(ctx, 5);
  ctx.fillStyle = '#2a1712';
  ctx.font = `800 30px ${FONT_CARTOON}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = 0; d < 10; d++) {
    const a = dialAngle(d);
    ctx.fillText(String(d), cx + Math.cos(a) * 128, cy + Math.sin(a) * 128 + 2);
  }
  // delikli dönen çark
  ctx.beginPath();
  ctx.arc(cx, cy, 166, 0, Math.PI * 2);
  ctx.moveTo(cx + 92, cy);
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  const holes = [];
  for (let d = 0; d < 10; d++) {
    const a = dialAngle(d) + rot;
    const hx = cx + Math.cos(a) * 128, hy = cy + Math.sin(a) * 128;
    holes.push([hx, hy]);
    ctx.moveTo(hx + 27, hy);
    ctx.arc(hx, hy, 27, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(26,20,20,.94)';
  ctx.fill('evenodd');
  for (const [hx, hy] of holes) {
    circle(ctx, hx, hy, 27);
    stroke(ctx, 4, '#8f969c');
  }
  circle(ctx, cx, cy, 166);
  stroke(ctx, 5);
  // parmak durdurucu
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((30 * Math.PI) / 180);
  rr(ctx, 148, -9, 46, 18, 8);
  fill(ctx, '#c9cfd4');
  stroke(ctx, 3);
  ctx.restore();
  // orta kart
  circle(ctx, cx, cy, 84);
  fill(ctx, '#ffffff');
  stroke(ctx, 4);
  star(ctx, cx, cy - 18, 26, 0);
  fill(ctx, '#ffd23f');
  stroke(ctx, 3);
  ctx.fillStyle = '#e8323c';
  ctx.font = `800 24px ${FONT_CARTOON}`;
  ctx.fillText('BESTE', cx, cy + 34);
  // el: sarı kollu bilek, yumruk ve uzanan işaret parmağı
  if (o.digit != null && (o.finger || 0) > 0.01) {
    const a = dialAngle(o.digit) + rot;
    const tipX = cx + Math.cos(a) * 128, tipY = cy + Math.sin(a) * 128;
    const f = o.finger;
    const bx = 150, by = 640;
    const ex = lerp(bx + (tipX - bx) * 0.45, tipX, f), ey = lerp(by + (tipY - by) * 0.45, tipY, f);
    const ang = Math.atan2(ey - by, ex - bx);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const kx = ex - ux * 92, ky = ey - uy * 92; // yumruk
    ctx.save();
    ctx.globalAlpha = clamp(f * 1.5, 0, 1);
    limb(ctx, [[bx - ux * 200, by - uy * 200], [kx - ux * 60, ky - uy * 60]], 70, '#ffd23f');
    limb(ctx, [[kx - ux * 10, ky - uy * 10], [ex, ey]], 30, SKIN);
    ctx.translate(kx, ky);
    ctx.rotate(ang);
    ellipse(ctx, -16, 0, 50, 42);
    fill(ctx, SKIN);
    stroke(ctx, 4);
    ctx.strokeStyle = 'rgba(42,23,18,.55)';
    ctx.lineWidth = 3;
    for (const yy of [-14, 6, 24]) {
      ctx.beginPath();
      ctx.arc(14, yy, 12, -1.2, 1.2);
      ctx.stroke();
    }
    ctx.translate(92, 0);
    ellipse(ctx, -4, 0, 12, 10);
    fill(ctx, '#ffeee0');
    stroke(ctx, 2.5);
    ctx.restore();
  }
  // çevrilen numara
  const pattern = o.pattern || '364 51 80';
  const typed = o.typed || '';
  let k = 0;
  const shown = [...pattern].map((ch) => (ch === ' ' ? ' ' : k < typed.length ? typed[k++] : (k++, '_'))).join('');
  rr(ctx, W / 2 - 160, 14, 320, 62, 22);
  fill(ctx, 'rgba(255,255,255,.94)');
  stroke(ctx, 4);
  ctx.font = `800 46px ${FONT_CARTOON}`;
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.fillText(shown, W / 2, 47);
}

// ------------------------------------------------------------------ gizli kare: tavan arası, arkadan
let atticCache = null;
function renderAttic() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  // karanlık oda, TV'nin ışığı
  x.fillStyle = '#0c0b0a';
  x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(332, 222, 20, 332, 240, 380);
  glow.addColorStop(0, 'rgba(190,205,220,.75)');
  glow.addColorStop(0.35, 'rgba(90,92,96,.45)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);
  // eğik çatı kirişleri
  x.strokeStyle = 'rgba(40,32,26,.9)';
  x.lineWidth = 16;
  for (const [a, b, c2, d2] of [[0, 30, 230, 150], [640, 30, 430, 150], [0, 120, 200, 190], [640, 120, 460, 190]]) {
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c2, d2);
    x.stroke();
  }
  x.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.moveTo(60 + i * 104, 0);
    x.lineTo(250 + i * 28, 150);
    x.stroke();
  }
  // döşeme tahtaları
  x.strokeStyle = 'rgba(60,50,40,.6)';
  x.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    x.beginPath();
    x.moveTo(332 + i * 18, 300);
    x.lineTo(332 + i * 140, H);
    x.stroke();
  }
  // ampul
  x.strokeStyle = '#222';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(332, 0);
  x.lineTo(332, 58);
  x.stroke();
  const bg = x.createRadialGradient(332, 66, 2, 332, 66, 60);
  bg.addColorStop(0, 'rgba(255,240,200,.8)');
  bg.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = bg;
  x.fillRect(260, 0, 150, 140);
  // TV ve dolap
  x.fillStyle = '#1b1a19';
  x.fillRect(236, 270, 192, 60);
  x.fillStyle = '#2a2826';
  x.fillRect(250, 160, 164, 116);
  const sg = x.createLinearGradient(0, 172, 0, 262);
  sg.addColorStop(0, '#e8f0ff');
  sg.addColorStop(1, '#b4c4dc');
  x.fillStyle = sg;
  x.fillRect(262, 172, 140, 92);
  // ekranda küçücük çizgi film: sarı elbise, kırmızı telefon
  x.fillStyle = '#d9c25a';
  x.fillRect(300, 222, 16, 30);
  x.fillStyle = '#6a3a1e';
  x.beginPath();
  x.arc(308, 212, 11, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#c8323c';
  x.fillRect(350, 236, 26, 16);
  // sandalye ve onda oturan kişi (arkadan)
  x.fillStyle = '#0a0908';
  x.beginPath();
  x.arc(332, 246, 38, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(332, 318, 96, 44, 0, 0, Math.PI * 2);
  x.fill();
  x.fillRect(262, 318, 140, 162);
  x.fillStyle = '#3a2a1c';
  x.fillRect(240, 330, 16, 150);
  x.fillRect(408, 330, 16, 150);
  x.fillRect(236, 326, 192, 18);
  for (const sx of [292, 326, 360]) x.fillRect(sx, 344, 10, 136);
  // ön planda karton kutular ve siyah telefon
  x.fillStyle = '#5a4630';
  x.fillRect(-10, 352, 230, 140);
  x.fillStyle = '#6b5438';
  x.fillRect(20, 318, 170, 40);
  x.strokeStyle = 'rgba(200,180,140,.35)';
  x.lineWidth = 3;
  x.strokeRect(-10, 352, 230, 140);
  x.strokeRect(20, 318, 170, 40);
  x.fillStyle = 'rgba(210,200,170,.45)';
  x.fillRect(95, 352, 20, 140);
  x.fillStyle = '#080808';
  x.beginPath();
  x.moveTo(40, 318);
  x.lineTo(170, 318);
  x.quadraticCurveTo(162, 280, 140, 274);
  x.lineTo(70, 274);
  x.quadraticCurveTo(48, 280, 40, 318);
  x.fill();
  x.fillRect(58, 256, 94, 14);
  x.beginPath();
  x.ellipse(60, 262, 14, 10, 0, 0, Math.PI * 2);
  x.ellipse(150, 262, 14, 10, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#d8d0bc';
  x.beginPath();
  x.arc(105, 298, 16, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#222';
  x.font = `bold 6px ${FONT_OSD}`;
  x.textAlign = 'center';
  x.fillText('364 51 80', 105, 300);
  // fişi takılı olmayan kablo
  x.strokeStyle = '#111';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(168, 312);
  x.bezierCurveTo(200, 330, 186, 400, 214, 470);
  x.stroke();
  return c;
}

/** Oyuncunun kendi tavan arası, sandalyenin arkasından çekilmiş gibi (gizli kare 'telefon'). */
export function atticFromBehind(ctx, t) {
  if (!atticCache) atticCache = renderAttic();
  ctx.save();
  ctx.filter = 'grayscale(0.85) contrast(1.2) brightness(0.95) blur(0.7px)';
  ctx.drawImage(atticCache, (hash(Math.floor(t * 30)) - 0.5) * 6, 0);
  ctx.filter = 'none';
  ctx.restore();
  staticNoise(ctx, t, 0.22);
  ctx.save();
  ctx.font = `30px ${FONT_OSD}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ff3030';
  ctx.fillText('● REC', 36, 28);
  const now = new Date();
  ctx.fillStyle = '#e8e8e8';
  ctx.textAlign = 'right';
  ctx.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, W - 36, 28);
  ctx.translate(W / 2, 420);
  ctx.rotate(-0.06);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 78px ${FONT_HAND}`;
  ctx.fillStyle = 'rgba(240,240,240,.55)';
  ctx.fillText('AÇSANA', 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ alacakaranlık ormanı
/** bgForest'in gökyüzünü (ilk fillRect) kendi gün batımı gökyüzümüzle değiştiren ara katman. */
function skyProxy(ctx, drawSky) {
  let done = false;
  return new Proxy(ctx, {
    get(target, k) {
      if (k === 'fillRect' && !done)
        return () => {
          done = true;
          drawSky(target);
        };
      const val = Reflect.get(target, k);
      return typeof val === 'function' ? val.bind(target) : val;
    },
    set(target, k, val) {
      target[k] = val;
      return true;
    },
  });
}

function duskSky(c) {
  const g = c.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#2b1d4d');
  g.addColorStop(0.42, '#7b3f7a');
  g.addColorStop(0.72, '#e2725b');
  g.addColorStop(1, '#ffc078');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const sg = c.createRadialGradient(410, 286, 8, 410, 286, 150);
  sg.addColorStop(0, 'rgba(255,232,160,.95)');
  sg.addColorStop(0.3, 'rgba(255,170,90,.45)');
  sg.addColorStop(1, 'rgba(255,130,80,0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, W, H);
  c.beginPath();
  c.arc(410, 290, 38, 0, Math.PI * 2);
  c.fillStyle = '#ffe2a0';
  c.fill();
  c.fillStyle = 'rgba(255,140,170,.35)';
  for (const [x, y, w] of [[90, 120, 160], [300, 80, 220], [520, 150, 140]]) {
    c.beginPath();
    c.ellipse(x, y, w / 2, 7, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,230,.8)';
  sparkle(c, 560, 46, 4, 'rgba(255,255,230,.85)');
}

/** Kayıp kedi afişi (300x380, merkez x,y). o.torn: koparılmış şerit indeksi. */
export function lostCatPoster(ctx, x, y, s, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? -0.04);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(-144, -184, 300, 290);
  // kâğıt
  ctx.fillStyle = '#efe3c4';
  ctx.fillRect(-150, -190, 300, 290);
  const st = ctx.createRadialGradient(80, -120, 5, 80, -120, 120);
  st.addColorStop(0, 'rgba(160,120,60,.25)');
  st.addColorStop(1, 'rgba(160,120,60,0)');
  ctx.fillStyle = st;
  ctx.fillRect(-150, -190, 300, 290);
  ctx.strokeStyle = 'rgba(90,60,30,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-150, -190, 300, 290);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `800 44px ${FONT_CARTOON}`;
  ctx.fillStyle = '#c42828';
  ctx.fillText('KAYIP KEDİ', 0, -150);
  ctx.font = `800 32px ${FONT_CARTOON}`;
  ctx.fillStyle = '#3a2a20';
  ctx.fillText('TONTON', 0, -110);
  // boya kalemi resmi
  rr(ctx, -100, -88, 200, 132, 6);
  fill(ctx, '#fffaf0');
  stroke(ctx, 2.5, 'rgba(90,60,30,.8)');
  drawTonton(ctx, { x: -18, y: 38, scale: 0.6, t: 0, expr: 'happy', tail: true, look: { x: 0, y: 0 }, blink: 0, mouth: 0 });
  ctx.strokeStyle = '#e07a10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, -54);
  ctx.quadraticCurveTo(50, -40, 30, -30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, -30);
  ctx.lineTo(40, -30);
  ctx.moveTo(30, -30);
  ctx.lineTo(34, -40);
  ctx.stroke();
  ctx.font = `700 17px ${FONT_HAND}`;
  ctx.fillStyle = '#e07a10';
  ctx.fillText('kuyruğu', 66, -76);
  ctx.fillText('TURUNCU', 66, -62);
  ctx.font = `700 22px ${FONT_HAND}`;
  ctx.fillStyle = '#2a1712';
  ctx.fillText('Gören ya da bulan', 0, 64);
  ctx.fillText('lütfen arasın!', 0, 86);
  // koparılabilir numara şeritleri
  const n = 7, tw = 300 / n;
  for (let i = 0; i < n; i++) {
    const x0 = -150 + i * tw;
    if (i === (o.torn ?? 2)) {
      ctx.fillStyle = '#efe3c4';
      ctx.beginPath();
      ctx.moveTo(x0 + 1, 100);
      for (let k = 0; k <= 6; k++) ctx.lineTo(x0 + 1 + ((tw - 2) * k) / 6, 104 + hash(k + 11) * 9);
      ctx.lineTo(x0 + tw - 1, 100);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = '#efe3c4';
    ctx.fillRect(x0 + 1, 100, tw - 2, 92 - (i % 3) * 2);
    ctx.strokeStyle = 'rgba(90,60,30,.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 1, 100, tw - 2, 92 - (i % 3) * 2);
    ctx.save();
    ctx.translate(x0 + tw / 2, 146);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `800 15px ${FONT_CARTOON}`;
    ctx.fillStyle = '#2a1712';
    ctx.fillText('364 27 27', 0, 0);
    ctx.restore();
  }
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(90,60,30,.6)';
  ctx.beginPath();
  ctx.moveTo(-150, 100);
  ctx.lineTo(150, 100);
  ctx.stroke();
  ctx.setLineDash([]);
  // çiviler
  for (const nx of [-132, 132]) {
    circle(ctx, nx, -174, 5);
    fill(ctx, '#8f969c');
    stroke(ctx, 2);
  }
  ctx.restore();
}

/** Ormanın sağ kenarındaki çam gövdesi ve üstündeki afiş. */
function posterTree(ctx) {
  ctx.fillStyle = '#4a2c18';
  ctx.fillRect(570, -10, 36, 460);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.strokeRect(570, -10, 36, 460);
  ctx.strokeStyle = 'rgba(20,10,4,.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(578 + hash(i) * 20, 20 + i * 60);
    ctx.lineTo(580 + hash(i + 4) * 20, 60 + i * 60);
    ctx.stroke();
  }
  ctx.fillStyle = '#1f3524';
  for (const [y, dir] of [[30, -1], [70, 1]]) {
    ctx.beginPath();
    ctx.moveTo(588, y);
    ctx.lineTo(588 + dir * 70, y + 30);
    ctx.lineTo(588, y + 18);
    ctx.fill();
  }
  lostCatPoster(ctx, 588, 156, 0.3, { rot: 0.05 });
}

/** Alacakaranlıkta Çamlık: turuncu-mor gökyüzü, karanlık çamlar, kenarda kayıp kedi afişi. */
export function duskForest(ctx, t, o = {}) {
  bgForest(skyProxy(ctx, duskSky), t, { dark: o.dark ?? 0.5, carving: 1 });
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const gr = ctx.createLinearGradient(0, 250, 0, H);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.3, '#ffd2b8');
  gr.addColorStop(1, '#9a7aae');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 250, W, H - 250);
  ctx.restore();
  posterTree(ctx);
}

/** Afişin yakın planı: ağaç kabuğu, gün batımı ışığı, okunur numara şeritleri. */
export function posterCloseup(ctx, t) {
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(25,12,4,.55)';
  ctx.lineWidth = 7;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    const x = hash(i) * W;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 20, 160, x - 20, 320, x + 10, H);
    ctx.stroke();
  }
  lostCatPoster(ctx, 320, 246, 1.1, { rot: -0.03 });
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#ffc49a');
  g.addColorStop(1, '#a587c2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // yaprak gölgeleri
  ctx.fillStyle = 'rgba(20,10,30,.18)';
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, (hash(i) * W + Math.sin(t * 0.7 + i) * 30) % W, hash(i + 9) * H, 60, 30, i);
    ctx.fill();
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,0,20,.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ alacakaranlıkta oda
export function duskBedroom(ctx, t, o = {}) {
  bgBedroom(ctx, t, { night: o.night ?? 0.4 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(210, 60, 120, 110);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 60, 0, 170);
  g.addColorStop(0, '#3a2856');
  g.addColorStop(0.55, '#c8607a');
  g.addColorStop(1, '#ffb066');
  ctx.fillStyle = g;
  ctx.fillRect(210, 60, 120, 110);
  circle(ctx, 300, 168, 18);
  fill(ctx, '#ffd890');
  ctx.fillStyle = '#2a1a30';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    const x = 206 + i * 20;
    ctx.moveTo(x - 12, 172);
    ctx.lineTo(x, 140 + hash(i) * 14);
    ctx.lineTo(x + 12, 172);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = OUT;
  ctx.fillRect(268, 60, 4, 110);
  ctx.fillRect(210, 113, 120, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = mixHex('#ffe0c4', '#c8a8d8', 0.35);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------ geçiş
/** Neşeli yıldız silme geçişi: p 0..1, yeni sahne bir yıldızın içinden büyür. */
export function starWipe(ctx, t, p, drawB) {
  if (p <= 0) return;
  const r = p * 900;
  ctx.save();
  star(ctx, W / 2, H / 2, r, p * 1.5);
  ctx.clip();
  drawB(ctx, t);
  ctx.restore();
  if (p < 1) {
    star(ctx, W / 2, H / 2, r, p * 1.5);
    stroke(ctx, 8, '#ffd23f');
  }
}

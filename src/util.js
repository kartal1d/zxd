export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Tekrarlanabilir rastgele sayı (çizimlerde titremeyi kare kare sabitlemek için). */
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** Türkçe cevapları karşılaştırmak için: küçük harf, noktalama yok, ASCII'ye katlanmış. */
export function norm(text) {
  return (text || '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => FOLD[c])
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Metin, anahtar kelimelerden biriyle başlıyor/içeriyor mu (kelime başı eşleşmesi). */
export function has(text, ...words) {
  const n = ' ' + norm(text) + ' ';
  return words.some((w) => n.includes(' ' + norm(w)));
}

export function digits(text) {
  return (text || '').replace(/\D+/g, '');
}

/** Oyuncu adını düzgün yazar: "ayşe" -> "Ayşe" */
export function titleCase(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ');
}

export function timeString(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* gizli pencere vb. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* yoksay */
    }
  },
};

export class AbortTape extends Error {
  constructor() {
    super('tape aborted');
  }
}

/** Basit tween yöneticisi (oyun saatine bağlı). */
export class Tweens {
  constructor() {
    this.list = [];
  }
  add(obj, key, to, dur, ease = smooth) {
    this.list = this.list.filter((t) => !(t.obj === obj && t.key === key));
    const tw = { obj, key, from: obj[key], to, dur: Math.max(dur, 1e-4), t: 0, ease };
    this.list.push(tw);
    return tw;
  }
  update(dt) {
    for (const tw of this.list) {
      tw.t = Math.min(tw.dur, tw.t + dt);
      tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(tw.t / tw.dur));
    }
    this.list = this.list.filter((t) => t.t < t.dur);
  }
  clear() {
    this.list = [];
  }
}

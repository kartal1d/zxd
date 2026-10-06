import { norm, digits } from '../util.js';

const NUMS = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, sifir: 0 };

/** "7", "yedi", "7 tane" -> 7 */
export function parseNum(text) {
  const d = digits(text);
  if (d) return parseInt(d, 10);
  for (const w of norm(text).split(' ')) if (w in NUMS) return NUMS[w];
  return null;
}

export const YES = ['evet', 'hee', 'he', 'aynen', 'tabii', 'tabi', 'karanlik', 'karanl', 'evt', 'yes'];
export const NO = ['hayir', 'yok', 'degil', 'aydinlik', 'isik', 'gunes', 'no'];

/** Ekranın üstünde kısa süreli kırmızı yazı ile isim tekrarı vb. */
export function repeatText(word, n = 6) {
  return Array.from({ length: n }, () => word.toLocaleUpperCase('tr')).join(' ');
}

// Oyun dosyalarını Electron paketine girecek desktop/game/ klasörüne kopyalar.
// Kullanım: node prepare.mjs [oyun kökü]   (varsayılan: bu klasörün bir üstü)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(here, '..'));
const out = path.join(here, 'game');
const ITEMS = ['index.html', 'style.css', 'src', 'assets', 'vendor'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const hasPack = fs.existsSync(path.join(root, 'assets', 'audio', 'pack', 'pack.json'));
let files = 0;
let bytes = 0;
for (const item of ITEMS) {
  const from = path.join(root, item);
  if (!fs.existsSync(from)) throw new Error(`eksik: ${from}`);
  fs.cpSync(from, path.join(out, item), {
    recursive: true,
    filter: (src) => {
      // sesler paketlenmişse tek tek mp3'ler gerekmez
      if (hasPack && src.includes(path.join('assets', 'audio', 'voice')) && src.endsWith('.mp3')) return false;
      const st = fs.statSync(src);
      if (st.isFile()) {
        files++;
        bytes += st.size;
      }
      return true;
    },
  });
}
console.log(`game/ hazır: ${files} dosya, ${(bytes / 1e6).toFixed(1)} MB (${root})`);

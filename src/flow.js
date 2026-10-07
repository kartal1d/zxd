// Akış: her aşamadaki adım (docs/ev-akisi.md §2-3). Hedef satırı her zaman 'Oda — eylem.' biçimindedir;
// adım değişince hemen güncellenir. Süreye bağlı ipucu basamakları (yaklaşık 45 / 90 / 150 sn) en sonda
// doğrudan bir talimat ve hedefin üstünde nabız gibi atan bir parıltı verir. Son ipucu duraklatma ekranında da görünür.
import * as THREE from 'three';
import * as TX from './textures.js';

const wp = (o) => (o ? o.getWorldPosition(new THREE.Vector3()) : null);
const H = (g) => g.house;
const ZONE = (g) => (g.walk?.standing ? g.walk.zone : 'cati');

/**
 * FLOW[id] = { obj: metin | g => metin, hints: [[sn, metin | g => metin|null, parıltı?]], target: g => Vector3 }
 */
export const FLOW = {
  s2_pelus: { obj: 'Arkandan gelen sesin kaynağına bak.', hints: [[40, 'Raftaki peluş yerinde değil.']] },

  // ---------------------------------------------------------------- 3 -> 4
  s3_sandik: {
    obj: 'Tavan arası — Sağ tarafa kayan oyuncak sandığının harf kilidini aç.',
    hints: [
      [45, 'Çarşafın altından mavi bir sandık görünüyor. Kilidi dört harfli.'],
      [90, "Kilit, Beste'nin bu kasette öğrettiği sihirli söz: saklambaçta birini bulunca bağırılan söz."],
      [150, 'Sandığa tıkla ve SOBE yaz.', true],
    ],
    target: (g) => g.room.points.chest,
  },
  s3_anahtar: {
    obj: 'Tavan arası — Sandıktaki anahtarı al.',
    hints: [[20, 'Açık sandığın içindeki anahtara tıkla.', true]],
    target: (g) => g.room.points.chest,
  },
  s3_sandik_kaset: {
    obj: 'Tavan arası — Sandıktaki kaseti al.',
    hints: [[30, 'Açık sandığın içindeki kasete tıkla.', true]],
    target: (g) => g.room.points.chest,
  },
  s3_kapi: {
    obj: "Tavan arası — Arkandaki kapıyı 'ALT KAT' anahtarıyla aç.",
    hints: [
      [25, 'Kapı, oturduğun yerin arkasında, sol tarafta.'],
      [50, 'Fareyle arkana dön, ahşap kapıya bak ve tıkla.', true],
    ],
    target: (g) => g.room.points.door,
  },
  s3_salon: {
    obj: (g) => (ZONE(g) === 'salon' ? 'Salon — Televizyonun üstündeki kaseti al.' : 'Salon — Aşağı in. Müziğin geldiği salondaki televizyona git.'),
    hints: [
      [20, (g) => {
        if (!g.walk.everStood) g.ui.walkHint?.(true, 10);
        return null;
      }],
      [45, 'W A S D ile yürü. Kapıdan çık, merdivenden aşağı in.'],
      [90, 'Merdivenin dibinde sağdaki geniş kapı salona açılıyor. Müzik oradan geliyor.'],
      [150, "Salondaki eski televizyonun üstünde bir kaset var. Ona bak ve E'ye bas.", true],
    ],
    target: (g) => wp(H(g)?.fp?.kaset4),
  },

  // ---------------------------------------------------------------- 4 -> 5
  s4_telefon: {
    obj: "Giriş — Aşağıda çalan telefonu aç ve Beste'nin evini ara.",
    hints: [
      [45, 'Telefon girişte, dış kapının yanındaki konsolun üstünde. Merdivenin dibinde sola dön.'],
      [90, "Beste'nin ev numarası telefon şarkısındaydı: 364 ile başlıyor, sonra iki kere en sevdiği sayı."],
      [150, 'Telefona tıkla ve 364 27 27 çevir.', true],
    ],
    target: (g) => H(g)?.points.hallPhone,
  },
  s4_tahta: {
    obj: 'Hol — Halının kalkan köşesindeki gevşek tahtaya bak.',
    hints: [
      [30, 'Halının köşesi telefonun hemen arkasında, holün başında kalktı.'],
      [60, "Kalkan köşenin altındaki tahtaya bak ve E'ye bas.", true],
    ],
    target: (g) => H(g)?.points.rugCorner,
  },
  s4_eski_tahta: {
    obj: 'Tavan arası — Kilimin kalkan köşesindeki gevşek tahtaya bak.',
    hints: [[30, 'Sandalyenin arkasında, kilimin köşesi kalktı. Altındaki tahtaya tıkla.', true]],
    target: (g) => g.room.points.floorboard,
  },

  // ---------------------------------------------------------------- 5 -> 6
  s5_hediye: {
    obj: 'Mutfak (holün sonunda) — Devrilen kolilerin arkasındaki hediye kutusunu aç.',
    hints: [
      [25, (g) => (H(g)?.visited?.has('mutfak') ? null : 'Mutfak, merdivenin yanındaki holün sonunda.')],
      [45, "Hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.' Kilit gün ve ay istiyor."],
      [90, "Beste'nin doğum tarihi, tavan arasındaki metal kutudaki okul kartında yazıyor."],
      [150, 'Hediye kutusuna 03 02 yaz.', true],
    ],
    target: (g) => H(g)?.points.gift,
  },
  s5_eski_hediye: {
    obj: 'Tavan arası — Devrilen kutuların arkasındaki hediye kutusunu aç.',
    hints: [
      [45, "Hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.' Kilit gün ve ay istiyor."],
      [90, "Beste'nin doğum tarihi, tavan arasındaki metal kutudaki okul kartında yazıyor."],
      [150, 'Hediye kutusuna 03 02 yaz.', true],
    ],
    target: (g) => g.room.points.giftbox,
  },

  // ---------------------------------------------------------------- 6 -> 7
  s6_sandalye: {
    obj: "Tavan arası — 'Oturduğun yerin altında.' Sandalyenin altına bak.",
    hints: [
      [10, (g) => {
        g.finds.hiss();
        return 'Karanlıkta bant hışırtısı. Çok yakından geliyor.';
      }],
      [45, 'Oturduğun yerde fareyle aşağı, dizlerine doğru bak. Ya da ayağa kalk (W), arkanı dön ve fenerle sandalyeye bak.'],
      [75, 'Sandalyenin ön kenarına bantlanmış kasete bak ve tıkla.', true],
    ],
    target: (g) => wp(g.room.attic.chairTape),
  },

  // ---------------------------------------------------------------- 7 -> 8
  s7_sicak: {
    obj: "Ev — Sıcak-soğuk: Beste'nin sesini izle. 'Isınıyorsun' dedikçe doğru yoldasın.",
    hints: [
      [60, "Beste 'Buz gibi' diyorsa yanlış yöndesin. Aşağı in, holden mutfağa yürü."],
      [120, 'Mutfağın arka kapısının sürgüsü açıldı. Bahçeye çık.'],
      [180, 'Kaset bahçenin sol tarafındaki salıncağın oturağında.', true],
    ],
    target: (g) => H(g)?.points.swingSeat,
  },
  s7_al: {
    obj: 'Bahçe — Salıncaktaki kaseti al.',
    hints: [[20, "Salıncağın oturağındaki kasete bak ve E'ye bas.", true]],
    target: (g) => H(g)?.points.swingSeat,
  },

  // ---------------------------------------------------------------- 8 -> 9
  s8_sahte: {
    obj: 'Tavan arası — Sandığın sahte dibi kalktı. Üç harfli kilidi aç.',
    hints: [
      [45, "Nermin'in notu: 'Kilidi, onun adını öğrenen açsın.' Bilmecenin cevabı."],
      [90, 'Saklambaçta gözünü kapatıp sayan kişi.'],
      [150, 'Sahte dibe EBE yaz.', true],
    ],
    target: (g) => g.room.points.chest,
  },
  s8_montaj: {
    obj: "Hol — Montaj odasının kapısını 'MONTAJ' anahtarıyla aç (holün sonunda, solda).",
    hints: [
      [20, (g) => {
        if (!g.walk.everStood) g.ui.walkHint?.(true, 8);
        return null;
      }],
      [60, 'Merdivenden in, hol boyunca mutfağa doğru yürü. Montaj odası en sonda, solda; kapısının altından mavi ışık sızıyor.'],
      [120, "Montaj kapısına bak ve E'ye bas: anahtar sende.", true],
    ],
    target: (g) => H(g)?.points.montajDoor,
  },
  s8_defter: {
    obj: "Montaj odası — Nermin'in masasındaki kurgu defterini oku.",
    hints: [
      [45, 'Masa sol duvarda, monitörlerin önünde. Açık defter masanın ucunda.'],
      [90, "Masadaki açık deftere bak ve E'ye bas.", true],
    ],
    target: (g) => wp(H(g)?.deskNote) || H(g)?.points.desk,
  },
  s8_cam: {
    obj: 'Bahçe — Yaşlı çamın dibindeki paslı kutuyu aç.',
    hints: [
      [60, 'Mutfağın arka kapısından bahçeye çık. Büyük çam sağ tarafta.'],
      [120, 'Çamın orman tarafına, köklerin arasına bak.', true],
    ],
    target: (g) => H(g)?.points.tin,
  },
  s8_raf: {
    obj: 'Montaj odası — Arşiv rafından doğru kaseti çek.',
    hints: [
      [90, 'Raftaki etiketler tarih. Nermin hangi günden söz ediyordu?'],
      [180, 'Hediye kutusundaki mektubun tarihi: 3 Şubat 1999.'],
      [240, 'C rafı, dördüncü kutu: ✶ 03.02.99 ✶.', true],
    ],
    target: (g) => wp(H(g)?.rackBoxes?.C4),
  },
  don9: {
    obj: 'Tavan arası — Kaseti yukarı götür.',
    hints: [[60, 'Kaseti oynatabileceğin tek yer tavan arası.']],
  },

  // ---------------------------------------------------------------- 9 -> 10
  s9_zincir: {
    obj: 'Tavan arası — Beste ışığı söndürmeni istedi. Ampulün zincirini çek.',
    hints: [
      [60, 'Ampul vızıldıyor. Karanlık olmadan kimse gelmeyecek.'],
      [120, 'Ampulün yanındaki zincire tıkla ve karanlıkta bekle.', true],
    ],
    target: (g) => wp(g.room.attic.chain)?.add(new THREE.Vector3(0, -0.3, 0)),
  },
  s9_bekle: { obj: 'Tavan arası — Karanlıkta bekle. Işığı yakma.', hints: [] },
  s9_al: {
    obj: 'Tavan arası — Kapının önündeki kaseti al.',
    hints: [[30, 'Kapının dibindeki kasete bak ve tıkla.', true]],
    target: (g) => wp(g.room.attic.doorTape),
  },

  // ---------------------------------------------------------------- kaset elde
  izle: {
    obj: 'Kaseti televizyonun altındaki video oynatıcıya tak.',
    hints: [[60, 'Video oynatıcıya tıkla: kendiliğinden oturursun ve kaset başlar.']],
    target: (g) => g.room.points.vcr,
  },
  izle_yukari: {
    obj: 'Tavan arası — Kaseti yukarı götür ve video oynatıcıya tıkla.',
    hints: [
      [60, 'Kasetler yalnızca tavan arasındaki televizyonda oynar. Merdivenden yukarı çık.'],
      [120, (g) => (ZONE(g) === 'cati' ? 'Tavan arasında, televizyonun altındaki video oynatıcıya tıkla.' : 'Merdivenden yukarı çık; video oynatıcı tavan arasında, televizyonun altında.'), true],
    ],
    target: (g) => (ZONE(g) === 'cati' ? g.room.points.vcr : null),
  },
};

/** Şu anki adım (yoksa null). Sıra §3.1'deki gibidir. */
export function step(g) {
  const st = g.state;
  if (!st || g.playingTape) return null;
  const r = st.room || {};
  const has = (n) => (st.tapes || []).includes(n);
  const nt = g.newTape();
  if (nt === 9 && !r.atticSealed) return 'don9';
  if (nt) return ZONE(g) === 'cati' ? 'izle' : 'izle_yukari';
  const s = st.stage;
  if (s === 2 && !has(3)) return 's2_pelus';
  if (s < 3 || s >= 10) return null;
  switch (s) {
    case 3:
      if (r.t4Chest) return 's3_sandik_kaset';
      if (!r.chestOpen) return 's3_sandik';
      if (!r.key) return 's3_anahtar';
      if (!r.walk) return 's3_kapi';
      return 's3_salon';
    case 4:
      if (r.kilimLifted) return 's4_eski_tahta';
      return r.holCall ? 's4_tahta' : 's4_telefon';
    case 5:
      return r.boxToppled ? 's5_eski_hediye' : 's5_hediye';
    case 6:
      return 's6_sandalye';
    case 7:
      return g.finds?.hc?.band === 'Yandın!' ? 's7_al' : 's7_sicak';
    case 8:
      if (!r.fbOpen) return 's8_sahte';
      if (!r.montajOpen) return 's8_montaj';
      if (r.tinOpen) return 's8_raf';
      if (r.deskRead) return 's8_cam';
      return 's8_defter';
    case 9:
      if (r.ritualDone) return 's9_al';
      if (r.lightOff || g.finds?.ritual) return 's9_bekle';
      return 's9_zincir';
  }
  return null;
}

/** Adım takibi, ipucu basamakları ve hedef parıltısı */
export class Flow {
  constructor(g) {
    this.g = g;
    this.cur = undefined;
    this.t = 0;
    this.done = new Set();
    this.glintOn = false;
    this.nextGlint = 0;
    this.glintT = -1;
    this.sprite = null;
  }

  reset() {
    this.cur = undefined;
    this.t = 0;
    this.done.clear();
    this.g.lastHint = null;
    this.glintOn = false;
    this.hideGlint();
  }

  step() {
    return step(this.g);
  }

  objective() {
    const s = this.step();
    if (!s) return null;
    const o = FLOW[s].obj;
    return typeof o === 'function' ? o(this.g) : o;
  }

  update(dt) {
    const g = this.g;
    const s = g.mode === 'title' ? null : this.step();
    if (s !== this.cur) {
      const first = this.cur === undefined;
      this.cur = s;
      this.t = 0;
      this.done.clear();
      g.lastHint = null;
      this.glintOn = false;
      this.hideGlint();
      if (!first && g.mode === 'play') g.updateObjective(true);
    }
    this.updateGlint(dt);
    if (!s) return;
    if (g.mode !== 'play' || g.panelOpen() || g.director.active || g.loadingTape) return;
    this.t += dt;
    const F = FLOW[s];
    for (const [sec, h, glint] of F.hints || []) {
      if (this.t < sec || this.done.has(sec)) continue;
      this.done.add(sec);
      const text = typeof h === 'function' ? h(g) : h;
      if (text) {
        g.ui.toast(text, 6);
        g.lastHint = text;
      }
      if (glint && F.target) {
        this.glintOn = true;
        this.nextGlint = this.t;
      }
    }
    if (this.glintOn && this.t >= this.nextGlint) {
      this.nextGlint = this.t + 30;
      this.showGlint(F.target(g));
    }
  }

  // ---------------------------------------------------------------- parıltı
  showGlint(pos) {
    if (!pos) return;
    if (!this.sprite) {
      const m = new THREE.SpriteMaterial({ map: TX.glint(), transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
      this.sprite = new THREE.Sprite(m);
      this.sprite.scale.set(0.14, 0.14, 0.14);
      this.sprite.renderOrder = 5;
      this.g.room.scene.add(this.sprite);
    }
    this.sprite.position.copy(pos);
    this.sprite.visible = true;
    this.glintT = 0;
  }

  hideGlint() {
    if (this.sprite) this.sprite.visible = false;
    this.glintT = -1;
  }

  updateGlint(dt) {
    if (this.glintT < 0 || !this.sprite) return;
    this.glintT += dt;
    if (this.glintT >= 8) return this.hideGlint();
    const hz = this.g.settings?.flash ? 0.5 : 1.5;
    this.sprite.material.opacity = 0.8 * (0.5 - 0.5 * Math.cos(this.glintT * hz * Math.PI * 2));
  }

  /** Test kancası: parıltı şu an görünüyor mu */
  glintVisible() {
    return !!this.sprite?.visible;
  }
}

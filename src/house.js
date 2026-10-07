// Halanın evi: tavan arasının altındaki kat, merdiven ve arka bahçe (3. kasetten sonra serbest yürüyüş, docs/ev-akisi.md).
// Geometri, malzemeler, ışıklar, el feneri, aranabilir eşyalar (ev:*), 9. kaset bulmacası (ARŞİV rafı),
// kapılar, çarpışma kutuları, oda (bölge) bilgisi ve kayıttan durum uygulama. Korkutmalar: src/scares.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import * as S from './draw/scenes.js';
import { drawSilhouette } from './draw/characters.js';
import { HOUSE_SFX, HouseAmbience } from './houseaudio.js';
import * as HF from './houseflow.js';
import { clamp, lerp, rand, hash } from './util.js';

export const YA = 0;
export const YC = -0.2;
export const YG = -2.9;
export const YB = -3.05;
export const stairY = (z) => -(z - 3.8) * 0.725;
const HALF = Math.PI / 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial(o);

/** Seslendirilmemişse altyazı için yedek metinler (src/data/lines/ev.json ile aynı) */
const EV_LINES = {
  ev_tel1: { v: 'riza', t: 'Nermin Hanım, ben Rıza. Jandarmayla konuşmayın. Yarın sabah kasetleri bana getirin.', w: 'TELESEKRETER' },
  ev_tel2: { v: 'beste_kiz', t: 'Nermin abla? Neredesin? Ben saklandım ama kimse gelmedi.', w: 'TELESEKRETER' },
  ev_dolap: { v: 'beste_whisper', t: 'Burası dolu. Başka yere saklan.', w: '???' },
  ev_buldun: { v: 'beste_whisper', t: 'Buldun. Şimdi sıra sende.', w: '???' },
};

/** ARŞİV rafı: satır A..D (yukarıdan aşağı), sütun 1..6 (soldan sağa) */
const RACK = {
  A: ['BÖLÜM 1 — TANIŞALIM — MASTER', 'BÖLÜM 2 — KUYRUK — MASTER', 'BÖLÜM 3 — SES YOK', 'PİLOT — İPTAL', 'JENERİK — 07.05.98', 'TONTON KUKLA PROVA — 28.04.98'],
  B: ['SES KAYDI 1 — 02.05.98', 'SES KAYDI 2 — 06.05.98', 'SES KAYDI 3 — 09.05.98', '14.05.98 — ÇAMLIK', 'ARAMA — 15.05.98', 'REKLAM ARALARI 97'],
  C: ['YILBAŞI — 31.12.97', 'NERMİN 34 — 21.03.98', '23 NİSAN GÖSTERİSİ — 23.04.98', '✶ 03.02.99 ✶', "KÂMİL'İN DÜĞÜNÜ — 12.07.97", 'KARNE GÜNÜ — 16.06.98'],
  D: ['RIZA BEY 50. YAŞ — 09.11.97 (KOPYA)', 'BOŞ', 'BOŞ', 'SİLİNDİ', 'KANAL TANITIM — 98', 'ARŞİV LİSTESİ'],
};
const RACK_ROWS = ['A', 'B', 'C', 'D'];
const RACK_Y = { A: -1.25, B: -1.7, C: -2.15, D: -2.6 };
const RACK_SPECIAL = {
  B4: "Kutu boş. İçine kırmızı kalemle yazılmış: 'JANDARMAYA VERİLMEDİ. İMHA EDİLDİ. — R.Y.'",
  C6: "Boş bir kaset. Hiç kayıt yapılmamış. Etiketin köşesine küçük harflerle 'gelmedi' yazılmış. Yakın... ama Nermin hediyeden söz ediyordu.",
  C2: "Nermin'in doğum günü. Kasette mum üfleyen bir kadın, yanında alkışlayan küçük bir kız. Beste. Bu değil.",
  D2: 'Boş kutu.',
  D3: 'Boş kutu.',
  D4: "Kutunun içinde kesik kesik bant parçaları. Birinin üstüne kurşun kalemle 'AY—' yazılmış.",
  A3: "Kutunun içine yapıştırılmış bir kâğıt: 'Ses yok. Eskilerden kes, yapıştır. — R.Y.'",
};
const RACK_HINTS = [
  "Nermin'in notu: hiç kutlanmayan bir gün. Hediyesi o gün açılacaktı.",
  "Hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.'",
  "Beste'nin sekizinci doğum günü: 03.02.99. C rafı, dördüncü kutu.",
];

/** Bölge başına ışık ve sis (bkz. docs/ev-tasarim.md §9) */
const ZONES = {
  sahanlik: { bulb: 1, moon: 0.35, hemi: 0.3, fog: 0x040405, dens: 0.05, zl: [-1.2, 1.9, 3.2, 0.25] },
  merdiven: { bulb: null, moon: 0.2, hemi: 0.2, fog: 0x030304, dens: 0.06, zl: null },
  giris: { bulb: 0, moon: 0.08, hemi: 0.16, fog: 0x030304, dens: 0.06, zl: [0.9, -1.3, -2.6, 0.5] },
  hol: { bulb: 0, moon: 0.08, hemi: 0.16, fog: 0x030304, dens: 0.06, zl: [0.9, -1.3, -2.6, 0.5] },
  salon: { bulb: 0, moon: 0.08, hemi: 0.16, fog: 0x030304, dens: 0.06, zl: [-4.3, -1.4, 6.0, 0.55] },
  montaj: { bulb: 0, moon: 0.06, hemi: 0.14, fog: 0x030304, dens: 0.065, zl: [-4.4, -1.6, 1.8, 0.3] },
  mutfak: { bulb: 0, moon: 0.1, hemi: 0.18, fog: 0x030304, dens: 0.06, zl: [0.95, -1.3, -2.9, 0.6] },
  banyo: { bulb: 0, moon: 0.06, hemi: 0.14, fog: 0x030304, dens: 0.06, zl: [2.1, -1.0, 9.0, 0.35] },
  bahce: { bulb: 0, moon: 3.0, hemi: 3.0, fog: 0x0b0f18, dens: 0.07, zl: null },
};
const GROUND = ['giris', 'hol', 'salon', 'montaj', 'mutfak', 'banyo'];

// ===================================================================== geometri yardımcıları
function ctex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Yüz normaline göre dünya koordinatlı UV (s metre = bir doku tekrarı) */
function worldUV(g, s) {
  if (!s) return g;
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s);
    else if (ay >= az) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s);
    else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
  }
  uv.needsUpdate = true;
  return g;
}

function boxGeo(x0, x1, y0, y1, z0, z1, uvs = 0) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return worldUV(g, uvs);
}

/** p0'dan p1'e uzanan çubuk (silindir) */
function rodGeo(p0, p1, r, seg = 8) {
  const d = p1.clone().sub(p0);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  const m = p0.clone().add(p1).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

/** Aynı odadaki aynı malzemeli parçaları tek ağa birleştirir (çizim çağrısı azalır). */
class Batch {
  constructor() {
    this.map = new Map();
  }
  add(chunk, room, mat, geo, occ = false) {
    const key = chunk.uuid + '|' + room + '|' + mat.uuid + (occ ? '|o' : '');
    let e = this.map.get(key);
    if (!e) this.map.set(key, (e = { chunk, room, mat, occ, geos: [] }));
    e.geos.push(geo.index ? geo.toNonIndexed() : geo);
  }
  flush() {
    const out = [];
    for (const e of this.map.values()) {
      for (const g of e.geos) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const g = mergeGeometries(e.geos, false);
      const m = new THREE.Mesh(g, e.mat);
      m.castShadow = m.receiveShadow = false;
      m.userData.room = e.room;
      m.userData.occ = e.occ;
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      e.chunk.add(m);
      out.push(m);
    }
    this.map.clear();
    return out;
  }
}

// ===================================================================== ev
export class House {
  constructor(game) {
    this.g = game;
    this.room = game.room;
    this.built = false;
    this.zone = 'cati';
    this.statics = { ust: [], zemin: [], bahce: [] };
    this.doors = {};
    this.screens = [];
    this.busy = {};
    this.fp = {}; // akış eşyaları (houseflow.js)
    this.visited = new Set();
    this.lead = null;
    this.ringing = false;
    this.swingHold = false;
    const r = this.room;
    // ışıklar açılışta kurulur, sonra hiç eklenip çıkarılmaz (gölgelendiriciler yeniden derlenmesin)
    r.scene.add(r.camera);
    this.flashlight = new THREE.SpotLight(0xfff0d8, 0, 11, 0.6, 0.9, 1.0);
    this.flashlight.position.set(0.12, -0.12, 0);
    this.flashlight.castShadow = false;
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0.02, -0.05, -1);
    r.camera.add(this.flashlight, this.flashTarget);
    this.flashlight.target = this.flashTarget;
    this.zoneLight = new THREE.PointLight(0x5d74b8, 0, 6, 2);
    this.zoneLight.position.set(0, -1.5, 0);
    r.scene.add(this.zoneLight);
    this.zoneLevel = 0;
    // ses
    const au = game.audio;
    au.extraSfx = HOUSE_SFX;
    this.points = {
      clock: V(0.84, -1.15, 8.25),
      fridge: V(4.2, -2.1, -0.6),
      sink: V(0.95, -2.0, -2.9),
      tub: V(2.2, -2.5, 8.8),
      pipe: V(3.1, -1.0, 8.0),
      desk: V(-4.2, -1.9, -0.2),
      salonTv: V(-3.15, -2.15, 3.18),
      stairFoot: V(-1.2, -2.6, 7.6),
      machine: V(0.72, -2.02, 8.25),
      nermin: V(2.5, -2.0, 4.0),
      nerminDoor: V(0.9, -1.9, 4.0),
      mirror: V(3.19, -1.35, 7.1),
      montajDoor: V(-0.7, -1.9, 1.98),
      bathDoor: V(0.9, -1.9, 7.08),
      backDoor: V(3.0, -1.9, -3.2),
      cupboard: V(-0.75, -2.3, 4.25),
      plushFoot: V(-0.9, YG, 8.35),
      window: V(1.4, 1.55, -2.6),
      man: V(0.15, YG, 1.3),
      tree: V(2.0, YB, -6.4),
      tin: V(2.0, YB + 0.06, -6.85),
      swing: V(-3.0, YB + 1.5, -8.5),
      rack: V(-2.6, -1.9, -2.95),
      hallPhone: V(0.72, -2.0, 8.48),
      rugCorner: V(0.45, YG + 0.02, 7.2),
      gift: V(4.0, -2.2, -2.95),
      swingSeat: V(-3.0, YB + 0.45, -8.5),
    };
    this.ambience = new HouseAmbience(au, this.points);
  }

  get st() {
    return this.g.state;
  }
  get r() {
    return (this.st.room = this.st.room || {});
  }
  has(n) {
    return (this.st.tapes || []).includes(n);
  }

  // ================================================================== kurulum
  ensureBuilt() {
    if (this.built) return;
    this.built = true;
    const room = this.room;
    const sc = room.scene;
    // tavan arasının kendi parçaları (zemin katta gizlenir). Işık içerenler ve kapı sahnesi hariç.
    const win = room.sky.parent;
    const keep = new Set([room.plush, win, room.camera, room.bulbGroup, room.doorPivot, room.girl, room.gap, room.corridor, this.zoneLight]);
    this.atticMeshes = sc.children.filter((o) => !o.isLight && !keep.has(o) && o.type !== 'Object3D');
    this.atticOutside = new Set([...(room.roofs || []), room.frontGable].filter(Boolean));
    if (room.corridor) room.corridor.visible = false;

    this.chunks = {};
    for (const k of ['ust', 'zemin', 'bahce']) {
      const gr = new THREE.Group();
      gr.name = 'ev-' + k;
      sc.add(gr);
      this.chunks[k] = gr;
    }
    this.shell = new THREE.Group();
    this.shell.position.x = 6.4;
    this.shell.scale.x = -1;
    this.chunks.zemin.add(this.shell);
    this.B = new Batch();
    this.buildMaterials();
    this.buildShell();
    this.buildStairs();
    this.buildGiris();
    this.buildHol();
    this.buildSalon();
    this.buildMontaj();
    this.buildMutfak();
    this.buildBanyo();
    this.buildDolap();
    this.buildGarden();
    this.buildExterior();
    HF.buildFlowProps(this);
    const merged = this.B.flush();
    this.occluders = { ust: [], zemin: [], bahce: [] };
    for (const m of merged) {
      const ch = m.parent === this.chunks.ust ? 'ust' : m.parent === this.chunks.bahce ? 'bahce' : 'zemin';
      if (m.userData.occ) this.occluders[ch].push(m);
      if (m.userData.room === 'banyo') {
        const c = m.clone();
        this.shell.add(c);
      }
    }
    this.shell.visible = false;
    this.setZone(this.zone, true);
    this.apply(this.st);
    // gölgelendiricileri önceden derle (ilk inişte takılma olmasın): tavan arası ve ev ışık düzenleri için
    this.g.perf?.precompile();
  }

  buildMaterials() {
    const R = this.room.mats;
    const M = (this.M = {});
    const plasterTex = TX.plaster();
    const wpTex = R.wall.map.clone();
    wpTex.repeat.set(1, 1);
    wpTex.needsUpdate = true;
    const floorMap = R.floor.map.clone();
    floorMap.repeat.set(1, 1);
    floorMap.needsUpdate = true;
    const floorBump = R.floor.bumpMap.clone();
    floorBump.repeat.set(1, 1);
    floorBump.needsUpdate = true;
    M.plaster = std({ map: plasterTex, color: 0xcfc6b2, roughness: 0.95 });
    M.plasterDark = std({ map: plasterTex, color: 0x8a8578, roughness: 0.95 });
    M.ceiling = std({ map: plasterTex, color: 0x77736a, roughness: 1 });
    M.ext = std({ map: plasterTex, color: 0x6c6a66, roughness: 1 });
    M.wallHall = std({ map: wpTex, color: 0xb2a690, roughness: 0.95 });
    M.wallSalon = std({ map: wpTex, color: 0x9e9484, roughness: 0.95 });
    M.wallStair = std({ map: wpTex, color: 0x8a8078, roughness: 0.95 });
    M.floor = std({ map: floorMap, bumpMap: floorBump, bumpScale: 0.6, roughness: 0.82 });
    M.stair = std({ map: floorMap, bumpMap: floorBump, bumpScale: 0.6, roughness: 0.82, color: 0xb0a090 });
    M.tileFloor = std({ map: TX.tiles({ base: [150, 140, 118], grout: [70, 66, 60], seed: 8 }), roughness: 0.55 });
    M.tileWall = std({ map: TX.tiles({ base: [160, 168, 162], grout: [96, 100, 94], n: 6, seed: 3 }), roughness: 0.35 });
    M.wood = R.furniture;
    M.door = std({ map: TX.woodPlanks({ w: 128, h: 256, planks: 3, base: [92, 60, 38], seed: 31 }).map, roughness: 0.75 });
    M.dark = std({ color: 0x2a2420, roughness: 0.8 });
    M.fabric = std({ color: 0x5a3a30, roughness: 1 });
    M.fabric2 = std({ color: 0x3a463a, roughness: 1 });
    M.curtain = std({ color: 0x4a1c1c, roughness: 1, side: THREE.DoubleSide });
    M.cream = std({ color: 0xd2c9b2, roughness: 0.45 });
    M.porcelain = std({ color: 0xe4e2da, roughness: 0.22 });
    M.metal = R.metal;
    M.brass = R.brass;
    M.black = R.black;
    M.plastic = R.plastic;
    M.grey = R.plasticGrey;
    M.cardboard = R.cardboard;
    M.cloth = R.cloth;
    M.tar = std({ color: 0x1c1c1e, roughness: 0.9 });
    M.grass = std({ map: TX.grass(), roughness: 1 });
    M.dirt = std({ color: 0x080a07, roughness: 1 });
    M.bark = std({ map: TX.bark(), roughness: 1 });
    M.needles = std({ color: 0x15261b, roughness: 1, flatShading: true });
    M.deadWood = std({ color: 0x3a2e24, roughness: 1 });
    M.fence = std({ color: 0x4e3e2c, roughness: 0.95 });
    M.paleWood = std({ color: 0xd8c49a, roughness: 0.8 });
    M.rug = std({ map: TX.kilim(), roughness: 1 });
    M.glass = std({ color: 0x0c141c, transparent: true, opacity: 0.35, roughness: 0.08, metalness: 0.3 });
    M.night = new THREE.MeshBasicMaterial({ map: this.room.skyNight, fog: false });
    M.frosted = new THREE.MeshBasicMaterial({ color: 0x1c2434 });
    M.slit = new THREE.MeshBasicMaterial({ color: 0x8090c0 });
    M.skylight = new THREE.MeshBasicMaterial({ color: 0x14204a });
    M.yellow = std({ color: 0xe0b020, roughness: 0.55 });
    M.burnt = std({ color: 0x121010, roughness: 0.6 });
    M.melt = std({ color: 0x2a2624, roughness: 0.3 });
    M.cork = std({ color: 0x9c7046, roughness: 1 });
    M.binder = [0x22305a, 0x5a2222, 0x2a4a2a, 0x222222, 0x6a5a22].map((c) => std({ color: c, roughness: 0.7 }));
    M.cardigan = std({ color: 0xc4b088, roughness: 1 });
  }

  // ------------------------------------------------------------------ yardımcılar
  add(chunk, room, mat, geo, occ = false) {
    this.B.add(this.chunks[chunk], room, mat, geo, occ);
  }
  box(chunk, room, mat, x0, x1, y0, y1, z0, z1, uvs = 0, occ = false) {
    this.add(chunk, room, mat, boxGeo(x0, x1, y0, y1, z0, z1, uvs), occ);
  }
  /** Çarpışma kutusu: levels 'ust' | 'zemin' | 'bahce' (dizi de olabilir) */
  col(levels, x0, x1, z0, z1) {
    for (const l of [].concat(levels)) this.statics[l].push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
  }
  /** Tek başına ağ (etkileşimli ya da hareketli parça) */
  mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = false;
    (parent || this.chunks.zemin).add(m);
    return m;
  }
  tag(obj, id) {
    this.room.tag(obj, id);
  }

  /**
   * Duvar. axis 'x': x = line düzleminde, a = z aralığı; axis 'z': z = line, a = x aralığı.
   * sides: [{ t, mat, y0, y1, room, chunk }] ilk eleman düşük koordinat tarafı, ikincisi yüksek taraf.
   * holes: [{ a0, a1, b0, b1, pass }] (pass: yürünebilir boşluk, çarpışma yok)
   */
  wall(axis, line, a0, a1, sides, holes = [], levels = 'zemin') {
    const hs = holes.slice().sort((p, q) => p.a0 - q.a0);
    sides.forEach((sd, i) => {
      if (!sd) return;
      const c0 = i === 0 ? line - sd.t : line;
      const c1 = i === 0 ? line : line + sd.t;
      const y0 = sd.y0, y1 = sd.y1;
      const piece = (p0, p1, q0, q1) => {
        if (p1 - p0 < 1e-3 || q1 - q0 < 1e-3) return;
        const g = axis === 'x' ? boxGeo(c0, c1, q0, q1, p0, p1, sd.uv || 1.6) : boxGeo(p0, p1, q0, q1, c0, c1, sd.uv || 1.6);
        this.add(sd.chunk || 'zemin', sd.room, sd.mat, g, true);
      };
      let cur = a0;
      for (const h of hs) {
        piece(cur, h.a0, y0, y1);
        piece(h.a0, h.a1, y0, Math.min(y1, h.b0));
        piece(h.a0, h.a1, Math.max(y0, h.b1), y1);
        cur = h.a1;
      }
      piece(cur, a1, y0, y1);
    });
    if (!levels) return;
    const t0 = line - (sides[0]?.t || 0), t1 = line + (sides[1]?.t || 0);
    let cur = a0;
    const spans = [];
    for (const h of hs.filter((h) => h.pass)) {
      spans.push([cur, h.a0]);
      cur = h.a1;
    }
    spans.push([cur, a1]);
    for (const [p0, p1] of spans) {
      if (p1 - p0 < 1e-3) continue;
      if (axis === 'x') this.col(levels, t0, t1, p0, p1);
      else this.col(levels, p0, p1, t0, t1);
    }
  }

  /** Yatay düzlem (zemin yukarı bakar, tavan aşağı bakar) */
  floor(chunk, room, mat, x0, x1, z0, z1, y, uvs, down = false) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(down ? HALF : -HALF);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    this.add(chunk, room, mat, worldUV(g, uvs), true);
  }

  /** Menteşeli kapı kanadı. d0: kapalıyken kanadın menteşeden uzandığı yön (x,z), w: genişlik */
  door(name, id, { hinge, d0, w, h = 2.03, open, chunk = 'zemin', knob = true, mat }) {
    const pivot = new THREE.Group();
    pivot.position.set(hinge[0], YG, hinge[1]);
    this.chunks[chunk].add(pivot);
    const leaf = new THREE.Group();
    pivot.add(leaf);
    // kanat, yerel d0 yönünde
    const along = Math.abs(d0[0]) > 0.5 ? 'x' : 'z';
    const s = along === 'x' ? Math.sign(d0[0]) : Math.sign(d0[1]);
    const lg = along === 'x' ? new THREE.BoxGeometry(w - 0.02, h, 0.045) : new THREE.BoxGeometry(0.045, h, w - 0.02);
    const panel = this.mesh(lg, mat || this.M.door, leaf, along === 'x' ? (s * w) / 2 : 0, h / 2, along === 'z' ? (s * w) / 2 : 0);
    if (knob) {
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), this.M.brass);
      const kd = w - 0.09;
      if (along === 'x') kn.position.set(s * kd, 0.98, 0);
      else kn.position.set(0, 0.98, s * kd);
      kn.scale.set(along === 'x' ? 1 : 2.4, 1, along === 'x' ? 2.4 : 1);
      leaf.add(kn);
    }
    if (id) this.tag(leaf, id);
    const d = { name, pivot, leaf, panel, d0, w, open, hinge, angle: 0 };
    this.doors[name] = d;
    return d;
  }

  setDoor(name, open, dur = 0.9) {
    const d = name === 'cati' ? null : this.doors[name];
    const target = open ? d.open : 0;
    if (dur <= 0) d.pivot.rotation.y = target;
    else this.room.tweens.add(d.pivot.rotation, 'y', target, dur);
  }

  /** kanadın o anki açısına göre çarpışma kutusu */
  leafBox(hx, hz, d0, w, a) {
    const dx = d0[0] * Math.cos(a) + d0[1] * Math.sin(a);
    const dz = -d0[0] * Math.sin(a) + d0[1] * Math.cos(a);
    const ex = hx + dx * w, ez = hz + dz * w;
    return { x0: Math.min(hx, ex) - 0.04, x1: Math.max(hx, ex) + 0.04, z0: Math.min(hz, ez) - 0.04, z1: Math.max(hz, ez) + 0.04 };
  }

  // ------------------------------------------------------------------ kabuk: duvarlar, zeminler, tavanlar
  buildShell() {
    const M = this.M;
    const I = 0.04; // iç duvar yarı kalınlığı
    const side = (mat, room, t = I, y0 = YG, y1 = YC, extra = {}) => ({ mat, room, t, y0, y1, ...extra });
    const dw = (a0, a1, h = 2.05) => ({ a0, a1, b0: YG - 1, b1: YG + h, pass: true });
    const solid = (a0, a1, h = 2.05) => ({ a0, a1, b0: YG - 1, b1: YG + h });
    const win = (a0, a1, b0, b1) => ({ a0, a1, b0, b1 });
    // dış duvarlar (iç yüzleri plandaki çizgilerde)
    this.wall('x', -4.62, -3.36, 2.62, [side(M.ext, 'dis', 0.14), side(M.plasterDark, 'montaj', 0.02)], [win(1.3, 2.3, -2.0, -0.9)]);
    this.wall('x', -4.62, 2.62, 9.36, [side(M.ext, 'dis', 0.14), side(M.wallSalon, 'salon', 0.02)], [win(5.4, 6.6, -2.0, -0.7)]);
    this.wall('z', 9.22, -4.76, -1.7, [side(M.wallSalon, 'salon', 0.02), side(M.ext, 'dis', 0.14)]);
    this.wall('z', 9.22, -1.7, 0.9, [side(M.wallHall, 'giris', 0.02), side(M.ext, 'dis', 0.14)], [solid(-0.55, 0.3)]);
    this.wall('z', 9.22, 0.9, 3.36, [side(M.tileWall, 'banyo', 0.02, YG, YC, { uv: 0.9 }), side(M.ext, 'dis', 0.14)], [win(1.8, 2.4, -1.0, -0.5)]);
    this.wall('x', 4.62, -3.36, 1.0, [side(M.plaster, 'mutfak', 0.02), side(M.ext, 'dis', 0.14)]);
    this.wall('x', 4.62, 1.0, 6.4, [side(M.plaster, 'nermin', 0.02), side(M.ext, 'dis', 0.14)]);
    this.wall('z', 6.4, 3.2, 4.76, [side(M.plaster, 'nermin', 0.04), side(M.ext, 'dis', 0.04)]);
    // banyonun aynalı duvarı (x = 3.2): aynanın arkası boşluk, ayna kabuğu orada
    this.wall('x', 3.22, 6.4, 9.36, [side(M.tileWall, 'banyo', 0.02, YG, YC, { uv: 0.9 }), side(M.ext, 'dis', 0.02)], [win(6.85, 7.35, -1.675, -1.025)]);
    // arka duvar: içte ince sıva, dışta bahçeden görünen cephe (bahçe parçası)
    this.wall('z', -3.22, -4.76, -0.7, [null, side(M.plasterDark, 'montaj', 0.02)], [], ['zemin', 'bahce']);
    this.wall('z', -3.22, -0.7, 4.76, [null, side(M.plaster, 'mutfak', 0.02)], [win(0.4, 1.5, -1.85, -0.85), dw(2.6, 3.45)], ['zemin', 'bahce']);
    this.wall('z', -3.22, -4.76, 4.76, [side(M.ext, 'dis', 0.14, YB, 0.1, { chunk: 'bahce', uv: 2 }), null], [win(0.4, 1.5, -1.85, -0.85), { a0: 2.6, a1: 3.45, b0: YB - 1, b1: YG + 2.05 }], null);
    this.col(['zemin', 'bahce'], -4.76, -0.7, -3.36, -3.22);
    // iç duvarlar
    this.wall('x', -1.7, 2.62, 7.8, [side(M.wallSalon, 'salon'), side(M.wallStair, 'merdiven', I, YG, 2.1, { chunk: 'ust' })], [], ['zemin', 'ust']);
    this.wall('x', -1.7, 7.8, 9.2, [side(M.wallSalon, 'salon'), side(M.wallHall, 'giris')], [dw(8.05, 8.9, 2.1)]);
    this.wall('z', 2.62, -4.6, -1.7, [side(M.plasterDark, 'montaj'), side(M.wallSalon, 'salon')]);
    this.wall('z', 2.62, -1.7, -0.7, [side(M.plasterDark, 'montaj'), side(M.plasterDark, 'dolap')]);
    this.wall('x', -0.7, -3.2, 1.0, [side(M.plasterDark, 'montaj'), side(M.plaster, 'mutfak')]);
    this.wall('x', -0.7, 1.0, 2.62, [side(M.plasterDark, 'montaj'), side(M.wallHall, 'hol')], [dw(1.55, 2.4)]);
    this.wall('x', -0.7, 2.62, 7.8, [side(M.wallStair, 'merdiven', I, YG, 2.1, { chunk: 'ust' }), side(M.wallHall, 'hol')], [solid(3.95, 4.6, 1.6)], ['zemin', 'ust']);
    this.wall('z', 1.0, -0.7, 0.9, [side(M.plaster, 'mutfak', I, -0.6, YC), side(M.wallHall, 'hol', I, -0.6, YC)], [], null);
    this.wall('z', 1.0, 0.9, 4.6, [side(M.plaster, 'mutfak'), side(M.plaster, 'nermin')]);
    this.wall('x', 0.9, 1.0, 6.4, [side(M.wallHall, 'hol'), side(M.plaster, 'nermin')], [solid(3.6, 4.4)]);
    this.wall('x', 0.9, 6.4, 7.8, [side(M.wallHall, 'hol'), side(M.tileWall, 'banyo', I, YG, YC, { uv: 0.9 })], [dw(6.7, 7.45)]);
    this.wall('x', 0.9, 7.8, 9.2, [side(M.wallHall, 'giris'), side(M.tileWall, 'banyo', I, YG, YC, { uv: 0.9 })]);
    this.wall('z', 6.4, 0.9, 3.2, [side(M.plaster, 'nermin'), side(M.tileWall, 'banyo', I, YG, YC, { uv: 0.9 })]);
    // kemerin yan pervazları
    this.box('zemin', 'hol', M.wood, -0.66, -0.6, YG, -0.6, 0.96, 1.04);
    this.box('zemin', 'hol', M.wood, 0.8, 0.86, YG, -0.6, 0.96, 1.04);
    // süpürgelikler (birkaç yerde)
    for (const [x0, x1, z0, z1, room] of [
      [-4.6, -1.74, 2.66, 2.68, 'salon'], [-4.6, -4.58, 2.66, 9.2, 'salon'], [-0.66, -0.64, 1.0, 7.8, 'hol'], [0.84, 0.86, 1.0, 7.8, 'hol'],
      [-4.6, -0.74, 2.56, 2.58, 'montaj'], [-4.6, -4.58, -3.2, 2.58, 'montaj'],
    ])
      this.box('zemin', room, M.dark, x0, x1, YG, YG + 0.09, z0, z1);
    // zeminler
    this.floor('zemin', 'salon', M.floor, -4.6, -1.7, 2.62, 9.2, YG, 3);
    this.floor('zemin', 'giris', M.floor, -1.7, 0.9, 7.8, 9.2, YG, 3);
    this.floor('zemin', 'hol', M.floor, -0.7, 0.9, 1.0, 7.8, YG, 3);
    this.floor('zemin', 'montaj', M.floor, -4.6, -0.7, -3.2, 2.62, YG, 3);
    this.floor('zemin', 'dolap', M.floor, -1.7, -0.7, 2.62, 5.0, YG, 3);
    this.floor('zemin', 'mutfak', M.tileFloor, -0.7, 4.6, -3.2, 1.0, YG, 1.2);
    this.floor('zemin', 'banyo', M.tileFloor, 0.9, 3.2, 6.4, 9.2, YG, 0.9);
    // eşik (arka kapı): mutfak zemininden bahçeye inen kısa rampa
    const th = new THREE.PlaneGeometry(0.85, 0.2);
    th.rotateX(-HALF - Math.atan2(YG - YB, 0.2));
    th.translate(3.025, (YG + YB) / 2, -3.3);
    this.add('zemin', 'mutfak', M.dark, th);
    // tavanlar (merdiven boşluğu hariç)
    this.floor('zemin', 'tavan', M.ceiling, -4.6, -1.7, -3.2, 9.2, YC, 2, true);
    this.floor('zemin', 'tavan', M.ceiling, -0.7, 4.6, -3.2, 9.2, YC, 2, true);
    this.floor('zemin', 'tavan', M.ceiling, -1.7, -0.7, -3.2, 3.8, YC, 2, true);
    this.floor('zemin', 'tavan', M.ceiling, -1.7, -0.7, 7.8, 9.2, YC, 2, true);
    // pencereler
    const glass = (x, y, z, w, h, ry, mat = M.glass) => {
      const m = this.mesh(new THREE.PlaneGeometry(w, h), mat, this.chunks.zemin, x, y, z);
      m.rotation.y = ry;
      return m;
    };
    // salon: perdenin arasından gece
    glass(-4.7, -1.35, 6.0, 1.2, 1.3, HALF);
    glass(-4.9, -1.2, 6.0, 2.4, 2.4, HALF, M.night);
    for (const z of [5.25, 6.75]) this.box('zemin', 'salon', M.curtain, -4.58, -4.52, -2.85, -0.45, z - 0.2, z + 0.2);
    this.add('zemin', 'salon', M.dark, rodGeo(V(-4.5, -0.45, 5.0), V(-4.5, -0.45, 7.0), 0.015));
    // montaj: siyah kartonla kapatılmış, ince bir ay ışığı yarığı
    this.box('zemin', 'montaj', M.black, -4.61, -4.59, -2.0, -0.9, 1.3, 2.3);
    this.mesh(new THREE.PlaneGeometry(0.012, 1.0), M.slit, this.chunks.zemin, -4.585, -1.45, 1.92).rotation.y = HALF;
    // mutfak penceresi (bahçe görünür)
    glass(0.95, -1.35, -3.21, 1.1, 1.0, 0);
    this.box('zemin', 'mutfak', M.wood, 0.36, 1.54, -1.89, -1.85, -3.22, -3.12);
    this.box('zemin', 'mutfak', M.wood, 0.36, 1.54, -0.85, -0.81, -3.22, -3.12);
    this.box('zemin', 'mutfak', M.wood, 0.93, 0.97, -1.85, -0.85, -3.22, -3.18);
    // banyo buzlu camı
    glass(2.1, -0.75, 9.21, 0.6, 0.5, Math.PI, M.frosted);
    // kapı kasaları
    const frameZ = (x0, x1, z, h = 2.05, room = 'hol') => {
      this.box('zemin', room, M.wood, x0 - 0.05, x0, YG, YG + h + 0.05, z - 0.06, z + 0.06);
      this.box('zemin', room, M.wood, x1, x1 + 0.05, YG, YG + h + 0.05, z - 0.06, z + 0.06);
      this.box('zemin', room, M.wood, x0 - 0.05, x1 + 0.05, YG + h, YG + h + 0.06, z - 0.06, z + 0.06);
    };
    const frameX = (z0, z1, x, h = 2.05, room = 'hol') => {
      this.box('zemin', room, M.wood, x - 0.06, x + 0.06, YG, YG + h + 0.05, z0 - 0.05, z0);
      this.box('zemin', room, M.wood, x - 0.06, x + 0.06, YG, YG + h + 0.05, z1, z1 + 0.05);
      this.box('zemin', room, M.wood, x - 0.06, x + 0.06, YG + h, YG + h + 0.06, z0 - 0.05, z1 + 0.05);
    };
    frameZ(-0.55, 0.3, 9.2, 2.05, 'giris');
    frameZ(2.6, 3.45, -3.2, 2.05, 'mutfak');
    frameX(1.55, 2.4, -0.7);
    frameX(3.95, 4.6, -0.7, 1.6);
    frameX(3.6, 4.4, 0.9);
    frameX(6.7, 7.45, 0.9);
    frameX(8.05, 8.9, -1.7, 2.1, 'giris');
  }

  // ------------------------------------------------------------------ sahanlık ve merdiven
  buildStairs() {
    const M = this.M;
    // sahanlık zemini ve tavanı
    this.floor('ust', 'sahanlik', M.floor, -1.7, -0.7, 2.6, 3.8, 0, 3);
    this.floor('ust', 'sahanlik', M.ceiling, -1.7, -0.7, 2.62, 4.628, 2.1, 2, true);
    // eğimli tavan: kafa yüksekliği her yerde 2.70
    const L = Math.hypot(7.8 - 4.628, 2.1 - YC);
    const sof = new THREE.BoxGeometry(1.0, 0.04, L);
    sof.rotateX(Math.atan2(2.1 - YC, 7.8 - 4.628));
    sof.translate(-1.2, (2.1 + YC) / 2 + 0.02, (4.628 + 7.8) / 2);
    this.add('ust', 'sahanlik', M.ceiling, worldUV(sof, 2), true);
    // basamaklar
    for (let i = 0; i < 16; i++) {
      const z0 = 3.8 + i * 0.25, z1 = z0 + 0.25;
      const top = stairY(z0 + 0.125);
      this.box('ust', 'merdiven', M.stair, -1.66, -0.74, top - 0.2, top, z0 - 0.025, z1, 0.8, true);
    }
    // küpeşte
    this.add('ust', 'merdiven', M.wood, rodGeo(V(-0.76, 0.92, 3.6), V(-0.76, stairY(7.8) + 0.92, 7.9), 0.025));
    for (const z of [4.4, 5.8, 7.2]) this.add('ust', 'merdiven', M.metal, rodGeo(V(-0.74, stairY(z) + 0.9, z), V(-0.68, stairY(z) + 0.9, z), 0.008));
    // tepe penceresi
    this.mesh(new THREE.PlaneGeometry(0.5, 0.6), M.skylight, this.chunks.ust, -1.2, 2.085, 3.2).rotation.x = HALF;
    this.box('ust', 'sahanlik', M.wood, -1.48, -0.92, 2.06, 2.1, 2.86, 2.9);
    this.box('ust', 'sahanlik', M.wood, -1.48, -0.92, 2.06, 2.1, 3.5, 3.54);
    // kuru saksı
    const pot = this.mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 12), this.M.fabric, this.chunks.ust, -0.86, 0.11, 2.86);
    pot.material = std({ color: 0x7a4430, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.add('ust', 'sahanlik', M.deadWood, rodGeo(V(-0.86, 0.2, 2.86), V(-0.86 + Math.cos(a) * 0.12, 0.5 + hash(i) * 0.2, 2.86 + Math.sin(a) * 0.12), 0.006, 4));
    }
    // sarı çocuk yağmurluğu (askıda): düz, kollu bir palto; duvardan 6 cm açıkta
    const coat = new THREE.Group();
    coat.position.set(-1.628, 0.92, 3.5);
    coat.rotation.y = HALF;
    this.chunks.ust.add(coat);
    const cs = new THREE.Shape();
    cs.moveTo(-0.06, 0.3);
    cs.lineTo(0.06, 0.3);
    cs.lineTo(0.12, 0.26);
    cs.lineTo(0.27, -0.02);
    cs.lineTo(0.22, -0.07);
    cs.lineTo(0.14, 0.04);
    cs.lineTo(0.17, -0.32);
    cs.lineTo(-0.17, -0.32);
    cs.lineTo(-0.14, 0.04);
    cs.lineTo(-0.22, -0.07);
    cs.lineTo(-0.27, -0.02);
    cs.lineTo(-0.12, 0.26);
    cs.closePath();
    const coatMat = std({ color: 0xe0b020, roughness: 0.55, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: 0.035, bevelEnabled: false }), coatMat);
    body.position.z = -0.0175;
    coat.add(body);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), coatMat);
    hood.position.set(0, 0.3, -0.03);
    hood.scale.set(1, 0.75, 0.7);
    coat.add(hood);
    this.add('ust', 'sahanlik', M.metal, rodGeo(V(-1.66, 1.2, 3.5), V(-1.58, 1.23, 3.5), 0.008));
    this.tag(coat, 'ev:yagmurluk');
  }

  // ------------------------------------------------------------------ giriş
  buildGiris() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // dış kapı (kilitli)
    const fd = this.mesh(new THREE.BoxGeometry(0.83, 2.03, 0.05), M.door, Z, -0.125, YG + 1.015, 9.17);
    const knob = this.mesh(new THREE.SphereGeometry(0.03, 10, 8), M.brass, Z, 0.18, YG + 0.98, 9.13);
    this.box('zemin', 'giris', M.brass, -0.2, -0.05, YG + 1.45, YG + 1.48, 9.135, 9.15);
    this.tag(fd, 'ev:diskapi');
    this.tag(knob, 'ev:diskapi');
    // portmanto ve hırka
    const rack = new THREE.Group();
    rack.position.set(0.62, YG, 9.0);
    Z.add(rack);
    this.mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 8), M.wood, rack, 0, 0.9, 0);
    this.mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 12), M.wood, rack, 0, 0.015, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const hk = this.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), M.wood, rack, Math.cos(a) * 0.06, 1.7, Math.sin(a) * 0.06);
      hk.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    }
    const card = this.mesh(new THREE.BoxGeometry(0.36, 0.62, 0.1), M.cardigan, rack, -0.08, 1.33, -0.08);
    card.rotation.y = 0.5;
    const sleeve = this.mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), M.cardigan, rack, -0.24, 1.3, -0.02);
    sleeve.rotation.z = 0.08;
    this.tag(rack, 'ev:portmanto');
    this.col('zemin', 0.42, 0.82, 8.8, 9.2);
    // konsol, telesekreter
    this.box('zemin', 'giris', M.wood, 0.55, 0.88, -2.14, -2.1, 7.9, 8.6);
    for (const [x, z] of [[0.58, 7.93], [0.85, 7.93], [0.58, 8.57], [0.85, 8.57]]) this.box('zemin', 'giris', M.wood, x - 0.02, x + 0.02, YG, -2.14, z - 0.02, z + 0.02);
    this.col('zemin', 0.55, 0.9, 7.9, 8.6);
    const tm = new THREE.Group();
    tm.position.set(0.72, -2.1, 8.25);
    Z.add(tm);
    this.mesh(new THREE.BoxGeometry(0.17, 0.06, 0.24), M.plastic, tm, 0, 0.03, 0);
    this.mesh(new THREE.BoxGeometry(0.1, 0.012, 0.13), M.grey, tm, 0.01, 0.065, 0.02);
    this.lcdCanvas = document.createElement('canvas');
    this.lcdCanvas.width = 64;
    this.lcdCanvas.height = 32;
    this.lcdTex = new THREE.CanvasTexture(this.lcdCanvas);
    this.lcdTex.colorSpace = THREE.SRGBColorSpace;
    const lcd = this.mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ map: this.lcdTex }), tm, -0.086, 0.035, -0.06);
    lcd.rotation.y = -HALF;
    this.tag(tm, 'ev:telesekreter');
    // duvar saati (13.59'da durmuş)
    const clk = new THREE.Group();
    clk.position.set(0.85, -1.15, 8.25);
    Z.add(clk);
    const rim = this.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), M.wood, clk);
    rim.rotation.z = HALF;
    const faceTex = ctex(128, 128, (x) => {
      x.fillStyle = '#e8e0c8';
      x.beginPath();
      x.arc(64, 64, 62, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#2a2018';
      x.font = 'bold 14px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2 - HALF;
        x.fillText(String(i), 64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
      }
      x.strokeStyle = '#1a1410';
      x.lineCap = 'round';
      const hand = (a, len, lw) => {
        x.lineWidth = lw;
        x.beginPath();
        x.moveTo(64, 64);
        x.lineTo(64 + Math.cos(a - HALF) * len, 64 + Math.sin(a - HALF) * len);
        x.stroke();
      };
      hand(((13 + 59 / 60) / 12) * Math.PI * 2, 30, 4);
      hand((59 / 60) * Math.PI * 2, 44, 2.5);
    });
    const face = this.mesh(new THREE.CircleGeometry(0.145, 24), std({ map: faceTex, roughness: 0.5 }), clk, -0.027, 0, 0);
    face.rotation.y = -HALF;
    this.tag(clk, 'ev:saat');
    // ışık düğmesi
    const sw = this.mesh(new THREE.BoxGeometry(0.02, 0.11, 0.07), M.cream, Z, -1.645, -1.75, 7.92);
    this.tag(sw, 'ev:dugme');
  }

  // ------------------------------------------------------------------ hol
  buildHol() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // yolluk
    const rug = this.mesh(new THREE.PlaneGeometry(0.9, 5.8), M.rug, Z, 0.1, YG + 0.004, 4.4);
    rug.rotation.x = -HALF;
    // çam ormanı tablosu
    const ptex = ctex(256, 160, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2a3446');
      g.addColorStop(1, '#4a5a4a');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) S.pine?.(x, 10 + i * 18 + hash(i) * 8, h - 8, 70 + hash(i * 3) * 60, i % 2 ? '#1a2a20' : '#22362a');
      x.fillStyle = 'rgba(120,120,128,.6)';
      x.fillRect(150, 70, 4, 60);
    });
    const pf = new THREE.Group();
    pf.position.set(0.85, -1.4, 5.6);
    Z.add(pf);
    this.mesh(new THREE.BoxGeometry(0.03, 0.5, 0.75), M.wood, pf);
    const pic = this.mesh(new THREE.PlaneGeometry(0.66, 0.42), std({ map: ptex, roughness: 0.8 }), pf, -0.017, 0, 0);
    pic.rotation.y = -HALF;
    // kapılar
    this.door('montaj', 'ev:kapi:montaj', { hinge: [-0.7, 2.4], d0: [0, -1], w: 0.85, open: HALF });
    this.door('banyo', 'ev:kapi:banyo', { hinge: [0.9, 6.7], d0: [0, 1], w: 0.75, open: HALF });
    this.door('dolap', 'ev:dolap', { hinge: [-0.7, 4.6], d0: [0, -1], w: 0.65, h: 1.6, open: -HALF, knob: true });
    this.col('zemin', -0.74, -0.66, 3.95, 4.6);
    // Nermin'in kapısı (kilitli) ve anahtar deliği
    const nd = this.door('nermin', 'ev:nermin', { hinge: [0.9, 3.6], d0: [0, 1], w: 0.8, open: 0 });
    const plate = this.mesh(new THREE.BoxGeometry(0.012, 0.11, 0.045), M.brass, nd.leaf, -0.03, 0.95, 0.72);
    const hole = this.mesh(new THREE.BoxGeometry(0.004, 0.035, 0.012), M.black, nd.leaf, -0.037, 0.93, 0.72);
    this.tag(plate, 'ev:nermin');
    this.tag(hole, 'ev:nermin');
  }

  // ------------------------------------------------------------------ salon
  buildSalon() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // televizyon dolabı ve CRT
    this.box('zemin', 'salon', M.wood, -3.6, -2.7, YG, YG + 0.5, 2.7, 3.2);
    this.box('zemin', 'salon', M.dark, -3.55, -2.75, YG + 0.08, YG + 0.42, 3.195, 3.21);
    this.col('zemin', -3.6, -2.7, 2.62, 3.2);
    const tv = new THREE.Group();
    tv.position.set(-3.15, YG + 0.5, 2.95);
    Z.add(tv);
    this.mesh(new THREE.BoxGeometry(0.62, 0.5, 0.45), M.wood, tv, 0, 0.25, 0);
    this.mesh(new THREE.BoxGeometry(0.5, 0.38, 0.02), M.black, tv, -0.04, 0.26, 0.222);
    this.salonCanvas = document.createElement('canvas');
    this.salonCanvas.width = 320;
    this.salonCanvas.height = 240;
    this.salonTex = new THREE.CanvasTexture(this.salonCanvas);
    this.salonTex.colorSpace = THREE.SRGBColorSpace;
    this.salonScreen = this.mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshBasicMaterial({ map: this.salonTex, toneMapped: false }), tv, -0.04, 0.26, 0.234);
    for (let i = 0; i < 2; i++) this.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), M.grey, tv, 0.26, 0.38 - i * 0.07, 0.23).rotation.x = HALF;
    this.tag(tv, 'ev:salontv');
    this.drawSalon('off');
    // kanepe
    this.box('zemin', 'salon', M.fabric, -4.05, -2.25, YG, YG + 0.42, 5.2, 6.02);
    this.box('zemin', 'salon', M.fabric, -4.05, -2.25, YG + 0.42, YG + 0.85, 5.82, 6.02);
    this.box('zemin', 'salon', M.fabric, -4.05, -3.87, YG + 0.42, YG + 0.6, 5.2, 6.02);
    this.box('zemin', 'salon', M.fabric, -2.43, -2.25, YG + 0.42, YG + 0.6, 5.2, 6.02);
    this.col('zemin', -4.05, -2.25, 5.18, 6.03);
    // sehpa, berjer, sönük abajur
    this.box('zemin', 'salon', M.wood, -3.65, -2.65, YG + 0.38, YG + 0.42, 4.13, 4.67);
    for (const [x, z] of [[-3.6, 4.18], [-2.7, 4.18], [-3.6, 4.62], [-2.7, 4.62]]) this.box('zemin', 'salon', M.wood, x - 0.025, x + 0.025, YG, YG + 0.38, z - 0.025, z + 0.025);
    this.col('zemin', -3.65, -2.65, 4.13, 4.67);
    this.box('zemin', 'salon', M.fabric2, -2.58, -1.84, YG, YG + 0.42, 4.24, 4.98);
    this.box('zemin', 'salon', M.fabric2, -2.58, -1.84, YG + 0.42, YG + 0.9, 4.86, 4.98);
    this.box('zemin', 'salon', M.fabric2, -2.58, -2.46, YG + 0.42, YG + 0.62, 4.24, 4.98);
    this.box('zemin', 'salon', M.fabric2, -1.96, -1.84, YG + 0.42, YG + 0.62, 4.24, 4.98);
    this.col('zemin', -2.58, -1.84, 4.24, 4.98);
    this.add('zemin', 'salon', M.metal, rodGeo(V(-4.3, YG, 3.2), V(-4.3, YG + 1.5, 3.2), 0.012));
    const shade = new THREE.ConeGeometry(0.2, 0.25, 12, 1, true);
    shade.translate(-4.3, YG + 1.55, 3.2);
    this.add('zemin', 'salon', M.cloth, shade);
    this.col('zemin', -4.45, -4.15, 3.05, 3.35);
    // büfe ve çerçeveli fotoğraf
    this.box('zemin', 'salon', M.wood, -4.6, -4.15, YG, YG + 0.9, 7.0, 8.6);
    this.box('zemin', 'salon', M.dark, -4.155, -4.14, YG + 0.1, YG + 0.8, 7.05, 7.78);
    this.box('zemin', 'salon', M.dark, -4.155, -4.14, YG + 0.1, YG + 0.8, 7.82, 8.55);
    this.col('zemin', -4.6, -4.15, 7.0, 8.6);
    const ph = new THREE.Group();
    ph.position.set(-4.35, -1.95, 7.8);
    ph.rotation.y = HALF - 0.25;
    Z.add(ph);
    this.mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), M.wood, ph, 0, 0.13, 0).rotation.x = -0.12;
    const ptex = ctex(96, 128, (x, w, h) => {
      x.fillStyle = '#b8ad96';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#6a5e4e';
      x.beginPath();
      x.arc(36, 52, 13, 0, Math.PI * 2);
      x.arc(66, 46, 15, 0, Math.PI * 2);
      x.fill();
      x.fillRect(24, 64, 24, 50);
      x.fillRect(52, 60, 30, 58);
      x.fillStyle = '#c8742e';
      x.fillRect(30, 80, 16, 14);
    });
    const pp = this.mesh(new THREE.PlaneGeometry(0.16, 0.21), std({ map: ptex, roughness: 0.6 }), ph, 0, 0.135, 0.012);
    pp.rotation.x = -0.12;
    this.tag(ph, 'ev:fotograf');
  }

  drawSalon(mode, t = 0) {
    const x = this.salonCanvas.getContext('2d');
    x.save();
    x.scale(0.5, 0.5);
    if (mode === 'static') {
      S.staticNoise(x, t, 1);
      x.fillStyle = 'rgba(40,60,140,.25)';
      x.fillRect(0, 0, 640, 480);
    } else if (mode === 'title') {
      // 3. aşama ipucu: dizinin açılış kartı, köşede ▶ OYNAT
      x.fillStyle = '#1838b8';
      x.fillRect(0, 0, 640, 480);
      S.bigText(x, 'SİHİRLİ DÜNYA', { color: '#ffd23f', font: `78px ${S.FONT_OSD}`, y: 230 });
      if (Math.floor(t * 1.5) % 2 === 0) S.bigText(x, '▶ OYNAT', { color: '#ffffff', font: `40px ${S.FONT_OSD}`, x: 120, y: 60 });
      for (let i = 0; i < 480; i += 4) {
        x.fillStyle = 'rgba(0,0,0,.12)';
        x.fillRect(0, i, 640, 1);
      }
    } else if (mode === 'face') S.scareFace(x, t, 'beste');
    else if (mode === 'glow') {
      x.fillStyle = '#000';
      x.fillRect(0, 0, 640, 480);
      const a = Math.max(0, 1 - t / 1.5);
      const g = x.createRadialGradient(320, 240, 0, 320, 240, 30 + 40 * a);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 640, 480);
    } else {
      x.fillStyle = '#0a0c0c';
      x.fillRect(0, 0, 640, 480);
      const g = x.createRadialGradient(240, 160, 10, 320, 240, 420);
      g.addColorStop(0, 'rgba(90,100,100,.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 640, 480);
    }
    x.restore();
    this.salonTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ montaj odası ve ARŞİV rafı
  buildMontaj() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // masa
    this.box('zemin', 'montaj', M.wood, -4.6, -3.8, -2.19, -2.15, -1.5, 0.9);
    for (const [x, z] of [[-4.55, -1.45], [-3.85, -1.45], [-4.55, 0.85], [-3.85, 0.85]]) this.box('zemin', 'montaj', M.wood, x - 0.025, x + 0.025, YG, -2.19, z - 0.025, z + 0.025);
    this.col('zemin', -4.6, -3.8, -1.5, 0.9);
    // üç monitör (tek tuval atlası), iki video kaydedici
    this.monCanvas = document.createElement('canvas');
    this.monCanvas.width = 512;
    this.monCanvas.height = 128;
    this.monTex = new THREE.CanvasTexture(this.monCanvas);
    this.monTex.colorSpace = THREE.SRGBColorSpace;
    const monMat = new THREE.MeshBasicMaterial({ map: this.monTex, toneMapped: false });
    const mons = new THREE.Group();
    Z.add(mons);
    [-0.9, -0.2, 0.5].forEach((z, i) => {
      this.mesh(new THREE.BoxGeometry(0.4, 0.38, 0.45), M.plastic, mons, -4.36, -1.96, z);
      const sg = new THREE.PlaneGeometry(0.36, 0.27);
      const uv = sg.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 3);
      const scr = this.mesh(sg, monMat, mons, -4.155, -1.95, z);
      scr.rotation.y = HALF;
    });
    // kaydediciler
    this.deckCanvas = document.createElement('canvas');
    this.deckCanvas.width = 64;
    this.deckCanvas.height = 16;
    this.deckTex = new THREE.CanvasTexture(this.deckCanvas);
    this.deckTex.colorSpace = THREE.SRGBColorSpace;
    const deckDisp = new THREE.MeshBasicMaterial({ map: this.deckTex, toneMapped: false });
    for (let i = 0; i < 2; i++) {
      this.mesh(new THREE.BoxGeometry(0.4, 0.09, 0.4), M.plastic, mons, -4.32, -2.1 + i * 0.1, -1.2);
      const dd = this.mesh(new THREE.PlaneGeometry(0.09, 0.022), deckDisp, mons, -4.115, -2.1 + i * 0.1, -1.1);
      dd.rotation.y = HALF;
    }
    this.mesh(new THREE.BoxGeometry(0.16, 0.05, 0.22), M.grey, mons, -3.95, -2.125, -0.55);
    const jog = this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.black, mons, -3.95, -2.09, -0.55);
    jog.rotation.z = 0;
    this.tag(mons, 'ev:monitor');
    this.drawMonitors('off');
    this.drawDecks('');
    // kurgu defteri
    const ntex = ctex(256, 160, (x, w, h) => {
      x.fillStyle = '#e8dfc6';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#c9bea2';
      x.fillRect(w / 2 - 2, 0, 4, h);
      x.strokeStyle = 'rgba(30,40,90,.6)';
      x.lineWidth = 1.2;
      for (let y = 18; y < h - 6; y += 11)
        for (const ox of [10, 138]) {
          x.beginPath();
          x.moveTo(ox, y);
          x.lineTo(ox + 90 - hash(y + ox) * 30, y + (hash(y * 3 + ox) - 0.5) * 2);
          x.stroke();
        }
      x.fillStyle = '#7a1010';
      x.font = 'bold 16px "Caveat", cursive';
      x.fillText('14.05.99', 150, 150);
    });
    const nb = this.mesh(new THREE.PlaneGeometry(0.34, 0.22), std({ map: ntex, roughness: 0.9 }), Z, -3.98, -2.145, 0.55);
    nb.rotation.x = -HALF;
    nb.rotation.z = -HALF + 0.1;
    this.tag(nb, 'ev:defter');
    this.deskNote = nb;
    // sandalye
    const ch = new THREE.Group();
    ch.position.set(-3.4, YG, -0.2);
    ch.rotation.y = 0.5;
    Z.add(ch);
    this.mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), M.fabric, ch, 0, 0.48, 0);
    this.mesh(new THREE.BoxGeometry(0.44, 0.5, 0.05), M.fabric, ch, 0, 0.8, 0.22);
    this.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), M.metal, ch, 0, 0.23, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = this.mesh(new THREE.BoxGeometry(0.28, 0.025, 0.03), M.black, ch, Math.cos(a) * 0.14, 0.03, Math.sin(a) * 0.14);
      leg.rotation.y = -a;
    }
    this.col('zemin', -3.66, -3.14, -0.46, 0.06);
    // ARŞİV rafı
    this.box('zemin', 'montaj', M.wood, -3.72, -3.68, YG, -0.9, -3.2, -2.85);
    this.box('zemin', 'montaj', M.wood, -1.52, -1.48, YG, -0.9, -3.2, -2.85);
    this.box('zemin', 'montaj', M.dark, -3.7, -1.5, YG, -0.9, -3.2, -3.18);
    for (const row of RACK_ROWS) this.box('zemin', 'montaj', M.wood, -3.7, -1.5, RACK_Y[row] - 0.13, RACK_Y[row] - 0.1, -3.2, -2.85);
    this.box('zemin', 'montaj', M.wood, -3.72, -1.48, -0.93, -0.9, -3.2, -2.85);
    this.col('zemin', -3.72, -1.48, -3.2, -2.83);
    const sign = ctex(512, 64, (x, w, h) => {
      x.fillStyle = '#e8e0c4';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#7a1010';
      x.font = 'bold 34px "Special Elite", monospace';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('ARŞİV — DOKUNMAYIN — N.', w / 2, h / 2 + 2);
    });
    this.mesh(new THREE.PlaneGeometry(1.4, 0.175), std({ map: sign, roughness: 0.9 }), Z, -2.6, -0.72, -3.19);
    // kutular: her biri ayrı ağ, sırt etiketleri tek atlasta
    const cellW = 1024 / 6, cellH = 1024 / 4;
    const atlas = ctex(1024, 1024, (x) => {
      x.fillStyle = '#18161a';
      x.fillRect(0, 0, 1024, 1024);
      RACK_ROWS.forEach((row, ri) => {
        RACK[row].forEach((txt, ci) => {
          const ox = ci * cellW, oy = ri * cellH;
          x.fillStyle = '#18161a';
          x.fillRect(ox, oy, cellW, cellH);
          x.fillStyle = txt.includes('✶') ? '#efe2b8' : '#e6dcc0';
          x.fillRect(ox + 16, oy + 22, cellW - 32, cellH - 44);
          const dots = ['#c03030', '#2a6ac0', '#30a050', '#d0a020'];
          for (let k = 0; k < 1 + Math.floor(hash(ri * 7 + ci) * 3); k++) {
            x.fillStyle = dots[Math.floor(hash(ri * 13 + ci * 5 + k) * 4)];
            x.beginPath();
            x.arc(ox + 34 + k * 20, oy + cellH - 40, 7, 0, Math.PI * 2);
            x.fill();
          }
          x.fillStyle = '#2b2018';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          const words = txt.split(' — ');
          const fs = words.some((w) => w.length > 12) ? 22 : 26;
          x.font = `bold ${fs}px "Caveat", cursive`;
          words.forEach((wd, wi) => {
            const lines = wd.length > 13 ? wd.replace(/ (?=\S+$)/, '\n').split('\n') : [wd];
            lines.forEach((ln, li) => x.fillText(ln, ox + cellW / 2, oy + 54 + (wi * 2 + li) * (fs + 2), cellW - 40));
          });
        });
      });
    });
    const boxMat = std({ map: atlas, color: 0x9a948a, roughness: 0.75 });
    this.rackBoxes = {};
    RACK_ROWS.forEach((row, ri) => {
      for (let ci = 0; ci < 6; ci++) {
        const g = new THREE.BoxGeometry(0.12, 0.2, 0.28);
        const uv = g.attributes.uv;
        const u0 = (ci * cellW) / 1024, v0 = 1 - ((ri + 1) * cellH) / 1024;
        const du = cellW / 1024, dv = cellH / 1024;
        // yüz sırası +x -x +y -y +z -z, her yüz 4 köşe: yalnız ön yüz (+z) etiketi gösterir
        for (let k = 0; k < uv.count; k++) {
          const face = Math.floor(k / 4);
          if (face === 4) uv.setXY(k, u0 + uv.getX(k) * du, v0 + uv.getY(k) * dv);
          else uv.setXY(k, u0 + 0.004, v0 + 0.004);
        }
        const m = this.mesh(g, boxMat, Z, -3.45 + ci * 0.34, RACK_Y[row], -2.98);
        m.rotation.y = (hash(ri * 6 + ci) - 0.5) * 0.06;
        const id = `ev:arsiv:${row}${ci + 1}`;
        m.userData.home = m.position.z;
        this.rackBoxes[row + (ci + 1)] = m;
        this.tag(m, id);
      }
    });
    // klasör rafı, mantar pano, kutular
    this.box('zemin', 'montaj', M.wood, -1.32, -0.78, -1.64, -1.61, 2.32, 2.58);
    const binders = new THREE.Group();
    Z.add(binders);
    for (let i = 0; i < 7; i++) this.mesh(new THREE.BoxGeometry(0.06, 0.3, 0.24), M.binder[i % 5], binders, -1.27 + i * 0.07, -1.46, 2.45).rotation.z = i === 6 ? 0.25 : 0;
    this.tag(binders, 'ev:klasor');
    const cork = new THREE.Group();
    cork.position.set(-2.6, -1.4, 2.57);
    Z.add(cork);
    this.mesh(new THREE.BoxGeometry(1.0, 0.7, 0.02), M.cork, cork);
    const sb = ctex(256, 180, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        const cx = 14 + (i % 3) * 80, cy = 12 + Math.floor(i / 3) * 84;
        x.save();
        x.translate(cx + 34, cy + 34);
        x.rotate((hash(i) - 0.5) * 0.15);
        x.fillStyle = '#efe8d6';
        x.fillRect(-34, -34, 70, 70);
        x.strokeStyle = '#2a2018';
        x.lineWidth = 2;
        x.strokeRect(-28, -28, 58, 44);
        x.beginPath();
        x.arc(i * 3 - 4, -8, 7, 0, Math.PI * 2);
        x.stroke();
        if (i === 5) {
          x.fillStyle = 'rgba(40,40,44,.75)';
          x.fillRect(14, -30, 6, 46);
        }
        x.restore();
      }
    });
    const sbm = this.mesh(new THREE.PlaneGeometry(0.92, 0.64), std({ map: sb, transparent: true, roughness: 0.9 }), cork, 0, 0, -0.012);
    sbm.rotation.y = Math.PI;
    this.tag(cork, 'ev:pano');
    for (const [x, z, s, r] of [[-1.2, -2.6, 0.5, 0.3], [-1.4, -1.9, 0.44, -0.2], [-1.25, -2.55, 0.36, 0.9]]) {
      const b = boxGeo(-s * 0.6, s * 0.6, 0, s, -s / 2, s / 2);
      b.rotateY(r);
      b.translate(x, YG + (z === -2.55 ? 0.5 : 0), z);
      this.add('zemin', 'montaj', M.cardboard, b);
    }
    this.col('zemin', -1.55, -0.88, -2.95, -2.25);
    this.col('zemin', -1.68, -1.12, -2.18, -1.62);
  }

  drawMonitors(mode, t = 0) {
    const x = this.monCanvas.getContext('2d');
    const cw = 512 / 3;
    for (let i = 0; i < 3; i++) {
      x.save();
      x.beginPath();
      x.rect(i * cw, 0, cw, 128);
      x.clip();
      x.translate(i * cw, 0);
      x.scale(cw / 640, 128 / 480);
      const m = Array.isArray(mode) ? mode[i] : mode;
      if (m === 'static') S.staticNoise(x, t + i, 1);
      else if (m === 'face') S.scareFace(x, t + i * 0.05, 'man');
      else if (m === 'trees') {
        x.fillStyle = '#0d140f';
        x.fillRect(0, 0, 640, 480);
        for (let k = 0; k < 9; k++) S.pine?.(x, 30 + k * 70, 470, 300 + hash(k) * 150, '#14261a');
        drawSilhouette(x, 330, 430, 330, 0.9);
        S.staticNoise(x, t, 0.18);
      } else if (m === 'sobe') {
        x.fillStyle = '#05060a';
        x.fillRect(0, 0, 640, 480);
        S.bigText(x, 'SOBE', { color: '#f4f4f4', font: `150px ${S.FONT_OSD}` });
        S.staticNoise(x, t, 0.15);
      } else if (m === 'rec') {
        x.fillStyle = '#0a0a0c';
        x.fillRect(0, 0, 640, 480);
        // raf ve önünde arkası dönük biri (oyuncu)
        x.fillStyle = '#1c1a18';
        x.fillRect(120, 60, 400, 330);
        x.fillStyle = '#2a2622';
        for (let r = 0; r < 4; r++) x.fillRect(120, 90 + r * 80, 400, 8);
        x.fillStyle = '#050505';
        x.beginPath();
        x.ellipse(320, 250, 46, 56, 0, 0, Math.PI * 2);
        x.fill();
        x.fillRect(250, 290, 140, 200);
        S.staticNoise(x, t, 0.12);
        x.fillStyle = Math.floor(t * 2) % 2 ? '#ff2020' : 'rgba(255,32,32,.2)';
        x.font = `52px ${S.FONT_OSD}`;
        x.textAlign = 'left';
        x.textBaseline = 'top';
        x.fillText('REC ●', 36, 30);
      } else {
        x.fillStyle = '#060807';
        x.fillRect(0, 0, 640, 480);
        const g = x.createRadialGradient(260, 180, 10, 320, 240, 420);
        g.addColorStop(0, 'rgba(80,90,90,.22)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 640, 480);
      }
      x.restore();
    }
    this.monTex.needsUpdate = true;
  }

  drawDecks(text) {
    const x = this.deckCanvas.getContext('2d');
    x.fillStyle = '#031006';
    x.fillRect(0, 0, 64, 16);
    if (text) {
      x.fillStyle = '#4cff7a';
      x.font = '15px "VT323", monospace';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, 32, 9);
    }
    this.deckTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ mutfak
  buildMutfak() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // tezgâh, evye, ocak
    this.box('zemin', 'mutfak', M.cream, -0.65, 2.45, YG, -2.06, -3.2, -2.62);
    this.box('zemin', 'mutfak', M.dark, -0.65, 2.45, -2.06, -2.0, -3.2, -2.6);
    this.box('zemin', 'mutfak', M.metal, 0.65, 1.25, -2.005, -1.995, -3.12, -2.7);
    this.box('zemin', 'mutfak', M.black, 0.7, 1.2, -2.0, -1.994, -3.08, -2.74);
    this.add('zemin', 'mutfak', M.metal, rodGeo(V(0.95, -2.0, -3.12), V(0.95, -1.75, -3.12), 0.012));
    this.add('zemin', 'mutfak', M.metal, rodGeo(V(0.95, -1.75, -3.12), V(0.95, -1.75, -2.95), 0.012));
    this.box('zemin', 'mutfak', M.porcelain, -0.6, 0.0, -2.0, -1.97, -3.15, -2.65);
    for (const [x, z] of [[-0.45, -3.0], [-0.15, -3.0], [-0.45, -2.78], [-0.15, -2.78]]) this.add('zemin', 'mutfak', M.black, new THREE.CylinderGeometry(0.07, 0.07, 0.012, 12).translate(x, -1.964, z));
    for (let i = 0; i < 5; i++) this.box('zemin', 'mutfak', M.dark, -0.6 + i * 0.62, -0.04 + i * 0.62, YG + 0.1, -2.12, -2.615, -2.6);
    // çekmece
    const dr = this.mesh(new THREE.BoxGeometry(0.46, 0.13, 0.03), M.cream, Z, 1.9, -2.15, -2.59);
    this.mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), M.metal, dr, 0, 0, 0.025);
    this.drawer = dr;
    this.tag(dr, 'ev:cekmece');
    this.box('zemin', 'mutfak', M.tileWall, -0.65, 2.45, -2.0, -1.4, -3.2, -3.19, 0.6);
    this.col('zemin', -0.65, 2.45, -3.2, -2.58);
    // buzdolabı ve üstündeki çocuk resmi
    this.box('zemin', 'mutfak', M.cream, 4.03, 4.6, YG, YG + 1.6, -0.95, -0.25);
    const fridgeDoor = HF.buildFridgeDoor(this, Z);
    this.col('zemin', 3.93, 4.6, -0.97, -0.23);
    const dtex = ctex(128, 160, (x, w, h) => {
      x.fillStyle = '#f2eee2';
      x.fillRect(0, 0, w, h);
      x.lineWidth = 3;
      x.strokeStyle = '#3060c0';
      x.beginPath();
      x.arc(40, 50, 12, 0, Math.PI * 2);
      x.moveTo(40, 62);
      x.lineTo(40, 110);
      x.stroke();
      x.strokeStyle = '#e0b020';
      x.fillStyle = '#e0c040';
      x.beginPath();
      x.arc(78, 64, 10, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.moveTo(70, 76);
      x.lineTo(86, 76);
      x.lineTo(92, 110);
      x.lineTo(64, 110);
      x.fill();
      x.strokeStyle = '#555';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(112, 10);
      x.lineTo(114, 120);
      x.moveTo(104, 40);
      x.lineTo(98, 100);
      x.moveTo(122, 40);
      x.lineTo(126, 100);
      x.stroke();
      x.fillStyle = '#c02020';
      x.font = 'bold 14px "Caveat", cursive';
      x.fillText('NERMİN ABLAMA', 10, 140);
    });
    // resim buzdolabı kapağında (kapak korkutmada açılır)
    const draw = this.mesh(new THREE.PlaneGeometry(0.22, 0.28), std({ map: dtex, roughness: 0.9 }), fridgeDoor, -0.032, 1.3, 0.35);
    draw.rotation.y = -HALF;
    draw.rotation.x = 0.04;
    this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), std({ color: 0xc02020 }), fridgeDoor, -0.037, 1.43, 0.35).rotation.z = HALF;
    this.tag(draw, 'ev:buzdolabi');
    // masa ve sandalyeler
    this.box('zemin', 'mutfak', M.wood, 1.2, 2.4, YG + 0.72, YG + 0.76, -1.1, -0.3);
    for (const [x, z] of [[1.25, -1.05], [2.35, -1.05], [1.25, -0.35], [2.35, -0.35]]) this.box('zemin', 'mutfak', M.wood, x - 0.025, x + 0.025, YG, YG + 0.72, z - 0.025, z + 0.025);
    this.col('zemin', 1.2, 2.4, -1.1, -0.3);
    // ikinci sandalye (2.1, -0.02) korkutma için ayrı ağ: houseflow.js
    for (const [x, z, r] of [[1.55, -1.35, 0]]) {
      const c = boxGeo(-0.2, 0.2, YG + 0.42, YG + 0.46, -0.2, 0.2);
      const b = boxGeo(-0.2, 0.2, YG + 0.46, YG + 0.9, -0.22, -0.19);
      for (const g of [c, b]) {
        g.rotateY(r);
        g.translate(x, 0, z);
        this.add('zemin', 'mutfak', M.wood, g);
      }
      for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
        const l = boxGeo(lx - 0.015, lx + 0.015, YG, YG + 0.42, lz - 0.015, lz + 0.015);
        l.rotateY(r);
        l.translate(x, 0, z);
        this.add('zemin', 'mutfak', M.wood, l);
      }
      this.col('zemin', x - 0.22, x + 0.22, z - 0.22, z + 0.22);
    }
    // takvim
    const ctx2 = ctex(128, 176, (x, w, h) => {
      x.fillStyle = '#f0ece0';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#b02020';
      x.fillRect(0, 0, w, 30);
      x.fillStyle = '#fff';
      x.font = 'bold 18px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('MAYIS 1998', w / 2, 22);
      x.fillStyle = '#2a2420';
      x.font = '10px Georgia, serif';
      for (let d = 1; d <= 31; d++) {
        const c = (d + 4) % 7, r = Math.floor((d + 4) / 7);
        x.fillText(String(d), 12 + c * 17, 50 + r * 22);
        if (d > 14) {
          x.fillStyle = '#5a5a5a';
          x.font = '6px Georgia, serif';
          x.fillText('bulundu mu?', 12 + c * 17, 58 + r * 22);
          x.fillStyle = '#2a2420';
          x.font = '10px Georgia, serif';
        }
      }
      x.strokeStyle = '#c02020';
      x.lineWidth = 2;
      x.strokeRect(12 + 4 * 17 - 9, 50 + 2 * 22 - 11, 18, 18);
    });
    const cal = this.mesh(new THREE.PlaneGeometry(0.3, 0.41), std({ map: ctx2, roughness: 0.9 }), Z, -0.655, -1.4, -0.8);
    cal.rotation.y = HALF;
    this.tag(cal, 'ev:takvim');
    // sönük floresan
    this.box('zemin', 'mutfak', M.porcelain, 0.9, 2.1, -0.27, -0.23, -1.3, -1.24);
    this.box('zemin', 'mutfak', M.grey, 0.85, 2.15, -0.23, -0.2, -1.33, -1.21);
    // arka kapı
    this.door('arka', 'ev:kapi:arka', { hinge: [2.6, -3.17], d0: [1, 0], w: 0.85, open: -HALF });
  }

  // ------------------------------------------------------------------ banyo
  buildBanyo() {
    const M = this.M;
    const Z = this.chunks.zemin;
    // küvet
    this.box('zemin', 'banyo', M.porcelain, 1.2, 3.15, YG, YG + 0.5, 8.45, 9.15);
    this.box('zemin', 'banyo', M.porcelain, 1.2, 3.15, YG + 0.5, YG + 0.55, 8.45, 8.52);
    this.box('zemin', 'banyo', M.porcelain, 1.2, 1.27, YG + 0.5, YG + 0.55, 8.45, 9.15);
    this.box('zemin', 'banyo', M.porcelain, 3.08, 3.15, YG + 0.5, YG + 0.55, 8.45, 9.15);
    this.box('zemin', 'banyo', M.dark, 1.27, 3.08, YG + 0.48, YG + 0.5, 8.52, 9.15);
    this.col('zemin', 1.2, 3.18, 8.4, 9.2);
    // duş perdesi
    this.add('zemin', 'banyo', M.metal, rodGeo(V(1.2, -0.62, 8.42), V(3.18, -0.62, 8.42), 0.012));
    const cg = new THREE.PlaneGeometry(1.96, 1.7, 24, 1);
    const cp = cg.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 18) * 0.03);
    cg.computeVertexNormals();
    const curtain = this.mesh(cg, std({ color: 0x8aa0a0, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }), Z, 2.18, -1.48, 8.42);
    this.tag(curtain, 'ev:perde');
    // klozet
    this.box('zemin', 'banyo', M.porcelain, 2.66, 3.04, YG, YG + 0.4, 6.62, 7.0);
    this.box('zemin', 'banyo', M.porcelain, 2.6, 3.1, YG + 0.4, YG + 0.75, 6.42, 6.62);
    this.col('zemin', 2.58, 3.12, 6.4, 7.02);
    // lavabo
    this.box('zemin', 'banyo', M.porcelain, 2.72, 3.18, -2.12, -2.02, 6.85, 7.35);
    this.box('zemin', 'banyo', M.porcelain, 2.92, 3.06, YG, -2.12, 7.04, 7.16);
    this.col('zemin', 2.7, 3.2, 6.85, 7.35);
    // ayna kapağı (dolabın kapağı): z = 6.85 kenarından menteşeli
    const mp = new THREE.Group();
    mp.position.set(3.19, -1.35, 6.85);
    Z.add(mp);
    const grime = ctex(128, 160, (x, w, h) => {
      x.fillStyle = 'rgba(255,255,255,0)';
      x.clearRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        x.fillStyle = `rgba(200,200,190,${hash(i) * 0.12})`;
        x.fillRect(hash(i * 3) * w, hash(i * 7) * h, 2 + hash(i * 5) * 6, 2 + hash(i * 9) * 6);
      }
      const g = x.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 110);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(30,26,20,.55)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    });
    this.mirrorGlass = this.mesh(new THREE.PlaneGeometry(0.5, 0.65), std({ color: 0x1a1c20, map: grime, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.4, depthWrite: false }), mp, 0, 0, 0.25);
    this.mirrorGlass.rotation.y = -HALF;
    this.mesh(new THREE.BoxGeometry(0.02, 0.69, 0.02), M.metal, mp, 0, 0, 0.0);
    this.mesh(new THREE.BoxGeometry(0.02, 0.69, 0.02), M.metal, mp, 0, 0, 0.5);
    this.mesh(new THREE.BoxGeometry(0.02, 0.02, 0.52), M.metal, mp, 0, 0.335, 0.25);
    this.mesh(new THREE.BoxGeometry(0.02, 0.02, 0.52), M.metal, mp, 0, -0.335, 0.25);
    this.mirrorPivot = mp;
    this.tag(mp, 'ev:ecza');
    // dolabın içi (yalnız kapak açıkken görünür)
    const inside = new THREE.Group();
    Z.add(inside);
    this.mesh(new THREE.BoxGeometry(0.02, 0.65, 0.5), M.plaster, inside, 3.36, -1.35, 7.1);
    this.mesh(new THREE.BoxGeometry(0.16, 0.02, 0.5), M.plaster, inside, 3.28, -1.45, 7.1);
    this.mesh(new THREE.BoxGeometry(0.06, 0.09, 0.04), std({ color: 0xd8d0f0 }), inside, 3.3, -1.395, 7.0);
    this.mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), std({ color: 0xe0e0d0 }), inside, 3.3, -1.38, 7.2);
    for (const z of [6.85, 7.35]) this.mesh(new THREE.BoxGeometry(0.16, 0.65, 0.02), M.plaster, inside, 3.28, -1.35, z);
    inside.visible = false;
    this.mirrorInside = inside;
    // aynadaki hayalet (yalnız yansımada)
    this.ghost = this.mesh(new THREE.PlaneGeometry(0.5, 0.75), new THREE.MeshBasicMaterial({ map: TX.besteGhost(), transparent: true, depthWrite: false, fog: false, color: 0xb8b8b0 }), Z, 5, -1.3, 7.1);
    this.ghost.visible = false;
  }

  // ------------------------------------------------------------------ merdiven altı dolabı
  buildDolap() {
    const M = this.M;
    this.box('zemin', 'dolap', M.plasterDark, -1.7, -0.7, YG, YC, 4.98, 5.02);
    this.floor('zemin', 'dolap', M.ceiling, -1.7, -0.7, 2.62, 3.8, -0.21, 2, true);
    for (let i = 0; i < 14; i++) {
      const g = new THREE.BoxGeometry(0.19, 0.025, 0.105);
      g.rotateY(hash(i) * 3);
      g.rotateZ((hash(i * 3) - 0.5) * 0.7);
      g.translate(-1.2 + (hash(i * 5) - 0.5) * 0.5, YG + 0.02 + Math.floor(i / 4) * 0.035 + hash(i * 7) * 0.03, 3.6 + (hash(i * 11) - 0.5) * 0.5);
      this.add('zemin', 'dolap', i % 3 ? M.burnt : M.melt, g);
    }
    const bl = boxGeo(-0.4, 0.4, 0, 0.08, -0.3, 0.3);
    bl.rotateY(0.4);
    bl.translate(-1.25, YG, 4.4);
    this.add('zemin', 'dolap', std({ color: 0x4a3a2a, roughness: 1 }), bl);
    const cb = boxGeo(-0.22, 0.22, 0, 0.3, -0.18, 0.18);
    cb.translate(-0.98, YG, 3.0);
    this.add('zemin', 'dolap', M.cardboard, cb);
  }

  // ------------------------------------------------------------------ bahçe
  buildGarden() {
    const M = this.M;
    const G = this.chunks.bahce;
    this.floor('bahce', 'bahce', M.grass, -6, 6, -13, -3.2, YB, 2);
    const dirt = new THREE.PlaneGeometry(80, 60);
    dirt.rotateX(-HALF);
    dirt.translate(0, YB - 0.012, -20);
    this.add('bahce', 'bahce', M.dirt, dirt);
    // çit: tek InstancedMesh
    const posts = [];
    const pick = [];
    const run = (x0, z0, x1, z1, gap) => {
      const L = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(L / 0.13);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = lerp(x0, x1, k), z = lerp(z0, z1, k);
        if (gap && x > gap[0] && x < gap[1]) continue;
        pick.push([x, z, Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 0 : HALF]);
      }
      for (let i = 0; i <= Math.floor(L / 2); i++) {
        const k = Math.min(1, (i * 2) / L);
        posts.push([lerp(x0, x1, k), lerp(z0, z1, k)]);
      }
      // kuşaklar
      for (const y of [0.35, 1.0]) {
        const g = rodGeo(V(x0, YB + y, z0), V(x1, YB + y, z1), 0.025, 5);
        this.add('bahce', 'cit', M.fence, g);
      }
    };
    run(-6, -3.2, -6, -13);
    run(6, -3.2, 6, -13);
    run(-6, -13, 6, -13, [-0.6, 0.6]);
    run(-6, -3.2, -4.76, -3.2);
    run(4.76, -3.2, 6, -3.2);
    const pg = new THREE.BoxGeometry(0.08, 1.3, 0.025);
    pg.translate(0, 0.65, 0);
    const im = new THREE.InstancedMesh(pg, M.fence, pick.length);
    const mt = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    pick.forEach(([x, z, ry], i) => {
      q.setFromAxisAngle(V(0, 1, 0), ry + (hash(i) - 0.5) * 0.08);
      mt.compose(V(x, YB - 0.05 + hash(i * 3) * 0.05, z), q, V(1, 0.9 + hash(i * 7) * 0.15, 1));
      im.setMatrixAt(i, mt);
    });
    G.add(im);
    for (const [x, z] of posts) this.box('bahce', 'cit', M.fence, x - 0.05, x + 0.05, YB, YB + 1.45, z - 0.05, z + 0.05);
    this.col('bahce', -6.5, -6.0, -13.5, -3.0);
    this.col('bahce', 6.0, 6.5, -13.5, -3.0);
    this.col('bahce', -6.5, 6.5, -13.5, -13.0);
    this.col('bahce', -6.5, -4.6, -3.25, -3.1);
    this.col('bahce', 4.6, 6.5, -3.25, -3.1);
    // zincirli bahçe kapısı
    const gate = new THREE.Group();
    G.add(gate);
    for (let i = 0; i < 9; i++) this.mesh(new THREE.BoxGeometry(0.08, 1.25, 0.03), M.fence, gate, -0.56 + i * 0.14, YB + 0.67, -13.0);
    for (const y of [0.35, 1.0]) this.mesh(new THREE.BoxGeometry(1.2, 0.08, 0.03), M.fence, gate, 0, YB + y, -12.98);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12), M.metal);
    for (let i = 0; i < 4; i++) {
      const c = chain.clone();
      c.position.set(-0.02 + i * 0.05, YB + 0.95 - i * 0.03, -12.96);
      c.rotation.y = i % 2 ? HALF : 0;
      gate.add(c);
    }
    this.mesh(new THREE.BoxGeometry(0.07, 0.09, 0.03), M.metal, gate, 0.17, YB + 0.82, -12.95);
    this.tag(gate, 'ev:bahcekapisi');
    // yaşlı çam
    const tree = new THREE.Group();
    tree.position.set(2.0, YB, -6.4);
    G.add(tree);
    this.mesh(new THREE.CylinderGeometry(0.15, 0.34, 10, 14), M.bark, tree, 0, 5, 0);
    for (let i = 0; i < 5; i++) {
      const y = 2.5 + i * 1.35;
      const rr = 2.4 - i * 0.4;
      this.mesh(new THREE.ConeGeometry(rr, 2.4, 9), M.needles, tree, 0, y, 0).rotation.y = i;
    }
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + 0.4;
      const y = 1.9 + i * 0.4;
      this.add('bahce', 'agac', M.deadWood, rodGeo(V(2.0 + Math.cos(a) * 0.2, YB + y, -6.4 + Math.sin(a) * 0.2), V(2.0 + Math.cos(a) * 1.1, YB + y - 0.25, -6.4 + Math.sin(a) * 1.1), 0.03, 5));
    }
    // kökler
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      this.add('bahce', 'agac', M.bark, rodGeo(V(2.0, YB + 0.15, -6.4), V(2.0 + Math.cos(a) * 0.7, YB - 0.02, -6.4 + Math.sin(a) * 0.7), 0.06, 5));
    }
    const carve = ctex(128, 64, (x, w, h) => {
      x.fillStyle = '#a98a58';
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(90,60,30,.4)';
      for (let i = 0; i < 30; i++) x.fillRect(hash(i) * w, 0, 1, h);
      x.fillStyle = '#2e1a0a';
      x.font = 'bold 38px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('14.05', w / 2, h / 2 + 2);
    });
    const cv = this.mesh(new THREE.PlaneGeometry(0.34, 0.17), std({ map: carve, roughness: 0.9 }), tree, 0, -1.6 - YB, -0.32);
    cv.rotation.y = Math.PI;
    this.tag(tree, 'ev:cam');
    this.col('bahce', 1.78, 2.22, -6.62, -6.18);
    // köklerin arasındaki paslı kutu
    const tin = this.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), std({ color: 0x7a4a2a, roughness: 0.7, metalness: 0.4 }), G, 2.0, YB + 0.06, -6.85);
    this.mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 16), std({ color: 0x6a3a22, roughness: 0.6, metalness: 0.5 }), tin, 0, 0.055, 0);
    this.tin = tin;
    this.tag(tin, 'ev:teneke');
    // salıncak
    const sx = -3.0, sz = -8.5;
    for (const dx of [-0.9, 0.9])
      for (const dz of [-0.35, 0.35]) this.add('bahce', 'salincak', M.fence, rodGeo(V(sx + dx, YB, sz + dz), V(sx + dx * 0.95, YB + 2.3, sz), 0.04, 6));
    this.add('bahce', 'salincak', M.fence, rodGeo(V(sx - 0.95, YB + 2.3, sz), V(sx + 0.95, YB + 2.3, sz), 0.05, 6));
    this.col('bahce', sx - 1.0, sx - 0.8, sz - 0.45, sz + 0.45);
    this.col('bahce', sx + 0.8, sx + 1.0, sz - 0.45, sz + 0.45);
    const sw = new THREE.Group();
    sw.position.set(sx, YB + 2.3, sz);
    G.add(sw);
    for (const dx of [-0.25, 0.25]) this.mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.85, 4), M.cloth, sw, dx, -0.925, 0);
    const seatTex = ctex(128, 32, (x, w, h) => {
      x.fillStyle = '#5b4934';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#2a1e12';
      x.font = 'bold 20px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('BESTE', w / 2, h / 2 + 1);
    });
    const seat = this.mesh(new THREE.BoxGeometry(0.6, 0.04, 0.22), [M.fence, M.fence, std({ map: seatTex, roughness: 0.95 }), M.fence, M.fence, M.fence], sw, 0, -1.85, 0);
    seat.rotation.y = 0;
    this.swing = sw;
    this.tag(sw, 'ev:salincak');
    // orman: iki InstancedMesh (gövde + koni)
    const pines = [];
    for (let i = 0; i < 26; i++) pines.push([rand(-22, 22), rand(-34, -16)]);
    for (let i = 0; i < 16; i++) pines.push([(i % 2 ? 1 : -1) * rand(8, 20), rand(-13, 0)]);
    const cone = new THREE.ConeGeometry(1.6, 7, 7);
    cone.translate(0, 5.5, 0);
    const trunk = new THREE.CylinderGeometry(0.15, 0.25, 3, 6);
    trunk.translate(0, 1.5, 0);
    const ic = new THREE.InstancedMesh(cone, M.needles, pines.length);
    const it = new THREE.InstancedMesh(trunk, M.bark, pines.length);
    pines.forEach(([x, z], i) => {
      const s = 0.8 + hash(i * 3.3) * 0.8;
      mt.compose(V(x, YB, z), q.setFromAxisAngle(V(0, 1, 0), hash(i) * 6), V(s, s * (0.9 + hash(i * 5) * 0.4), s));
      ic.setMatrixAt(i, mt);
      it.setMatrixAt(i, mt);
    });
    G.add(ic, it);
    // uzak gökyüzü
    const sky = this.mesh(new THREE.PlaneGeometry(140, 50), new THREE.MeshBasicMaterial({ map: TX.skyTexture('night'), fog: false }), G, 0, 8, -48);
    sky.renderOrder = -1;
  }

  // ------------------------------------------------------------------ evin bahçeden görünen dışı
  buildExterior() {
    const M = this.M;
    // düz katran çatı (tavan arası hariç)
    for (const [x0, x1, z0, z1] of [[-4.76, 4.76, -3.36, -2.6], [-4.76, -3.0, -2.6, 2.6], [3.0, 4.76, -2.6, 2.6], [-4.76, 4.76, 2.6, 9.36]]) this.box('bahce', 'dis', M.tar, x0, x1, 0.02, 0.1, z0, z1, 2);
    this.box('bahce', 'dis', M.ext, -4.8, 4.8, 0.0, 0.16, -3.4, -3.36, 2);
    // tavan arası alın duvarının dış kaplaması (pencere boşluklu)
    const s = new THREE.Shape();
    s.moveTo(-3.02, 0.1);
    s.lineTo(3.02, 0.1);
    s.lineTo(3.02, 1.2);
    s.lineTo(0, 3.0);
    s.lineTo(-3.02, 1.2);
    s.closePath();
    const h = new THREE.Path();
    // arkadan bakınca x ters: pencere yerel x = -1.4
    h.moveTo(-1.75, 1.15);
    h.lineTo(-1.05, 1.15);
    h.lineTo(-1.05, 1.95);
    h.lineTo(-1.75, 1.95);
    h.closePath();
    s.holes.push(h);
    const gg = new THREE.ShapeGeometry(s);
    gg.rotateY(Math.PI);
    gg.translate(0, 0, -2.63);
    this.add('bahce', 'dis', M.ext, worldUV(gg, 2));
    for (const sx of [-1, 1]) this.box('bahce', 'dis', M.ext, sx * 3.0, sx * 3.06, 0.1, 1.2, -2.6, 2.6, 2);
    // pencere pervazı (dışarıdan)
    this.box('bahce', 'dis', M.wood, 1.0, 1.8, 1.1, 1.15, -2.72, -2.62);
    // ışıklı tavan arası penceresi (ampul yanarken bahçeden sıcak görünür)
    this.litMat = new THREE.MeshBasicMaterial({ color: 0xffb060 });
    this.litWindow = this.mesh(new THREE.PlaneGeometry(1.2, 1.2), this.litMat, this.chunks.bahce, 1.4, 1.55, -2.3);
    this.litWindow.rotation.y = Math.PI;
    // pencerede beliren kız (A3)
    this.winGirl = this.mesh(new THREE.PlaneGeometry(0.5, 1.0), new THREE.MeshBasicMaterial({ map: TX.girlSilhouette(), transparent: true, depthWrite: false }), this.chunks.bahce, 1.4, 1.1, -2.45);
    this.winGirl.rotation.y = Math.PI;
    this.winGirl.visible = false;
    // gri adam billboardları (koridordaki ve çitteki)
    this.man = this.makeMan(false);
    this.manArms = this.makeMan(true);
    // bahçedeki mutfak penceresi: iç mekân çizilmediğinde de soluk mavi parlasın
    const kw = this.mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ color: 0x1a2a48 }), this.chunks.bahce, 0.95, -1.35, -3.24);
    kw.rotation.y = Math.PI;
  }

  /** 2.30 m boyunda billboard: gövde + ayrı baş (başı eğilebilir) */
  makeMan(arms) {
    const tex = TX.greyMan({ arms });
    const H = 2.3, headK = 0.13;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide });
    const grp = new THREE.Group();
    const bodyG = new THREE.PlaneGeometry(H / 4, H * (1 - headK));
    const buv = bodyG.attributes.uv;
    for (let i = 0; i < buv.count; i++) buv.setY(i, buv.getY(i) * (1 - headK));
    bodyG.translate(0, (H * (1 - headK)) / 2, 0);
    grp.add(new THREE.Mesh(bodyG, mat));
    const headPivot = new THREE.Group();
    headPivot.position.y = H * (1 - headK);
    grp.add(headPivot);
    const hg = new THREE.PlaneGeometry(H / 4, H * headK);
    const huv = hg.attributes.uv;
    for (let i = 0; i < huv.count; i++) huv.setY(i, 1 - headK + huv.getY(i) * headK);
    hg.translate(0, (H * headK) / 2, 0);
    headPivot.add(new THREE.Mesh(hg, mat));
    grp.userData.head = headPivot;
    grp.visible = false;
    this.room.scene.add(grp);
    return grp;
  }

  // ================================================================== bölge, ışık, görünürlük
  setZone(z, force = false) {
    if (z === this.zone && !force) return;
    const prev = this.zone;
    this.zone = z;
    const r = this.room;
    if (prev === 'cati' && z !== 'cati') {
      this.saved = { moon: r.moon.intensity, hemi: r.hemi.intensity, fog: r.scene.fog.color.getHex(), dens: r.scene.fog.density, bg: r.scene.background.getHex() };
    }
    if (z === 'cati') {
      if (this.saved) {
        r.moon.intensity = this.saved.moon;
        r.hemi.intensity = this.saved.hemi;
        r.scene.fog.color.setHex(this.saved.fog);
        r.scene.fog.density = this.saved.dens;
        r.scene.background.setHex(this.saved.bg);
        this.saved = null;
      }
      r.bulbZone = 1;
      this.zoneLevel = 0;
    } else {
      const Zc = ZONES[z];
      r.moon.intensity = Zc.moon * (z === 'bahce' ? 1 : 1);
      r.hemi.intensity = Zc.hemi;
      r.scene.fog.color.setHex(Zc.fog);
      r.scene.fog.density = Zc.dens;
      r.scene.background.setHex(z === 'bahce' ? 0x06080e : 0x010102);
      if (Zc.bulb != null) r.bulbZone = Zc.bulb;
      if (Zc.zl) {
        this.zoneLight.position.set(Zc.zl[0], Zc.zl[1], Zc.zl[2]);
        this.zoneLevel = Zc.zl[3];
        this.zoneLight.color.set(0x5d74b8);
      } else this.zoneLevel = 0;
    }
    if (this.built) this.applyVisibility();
    // tavan arası ışıkları evde kapalı (her ışık her yüzeyin gölgelendiricisine yük bindirir)
    this.g.perf?.setZoneLights(z);
    this.ambience.setZone(z);
    const g = this.g;
    if (GROUND.includes(z) || z === 'merdiven') g.ambience?.setDrone(this.droneHold ?? 0.04, 1.5);
    else if (!this.droneHold) g.ambience?.setDrone(0, 1.5);
    g.ambience?.setWind(z === 'bahce' ? 0.01 : z === 'cati' || z === 'sahanlik' ? 0.05 : 0.015);
    this.visited.add(z);
    // bazı hedefler bulunulan odaya göre yazılır
    if (g.mode === 'play' && prev !== z) g.updateObjective?.(true);
  }

  applyVisibility() {
    const z = this.zone;
    const C = this.chunks;
    const ground = GROUND.includes(z);
    C.ust.visible = z === 'cati' ? this.room.doorPivot.rotation.y > 0.02 : z !== 'bahce';
    C.zemin.visible = z !== 'cati' && (z !== 'bahce' || this.arkaOpen());
    C.bahce.visible = z === 'bahce' || z === 'mutfak';
    this.shell.visible = z === 'banyo';
    const showAttic = z === 'cati' || z === 'sahanlik' || z === 'merdiven';
    for (const o of this.atticMeshes) o.visible = showAttic || (z === 'bahce' && this.atticOutside.has(o));
    this.room.sky.visible = z !== 'bahce';
    this.litWindow.visible = z === 'bahce';
    this.visZone = z;
  }

  /** Arka kapı aralıksa bahçeden içerisi görünür (bahçede iç mekân yalnız o zaman çizilir) */
  arkaOpen() {
    const d = this.doors.arka;
    return !!d && Math.abs(d.pivot.rotation.y) > 0.05;
  }

  /** Çarpışma kutuları (düzey başına sabitler + kapı kanatları) */
  colliders(level) {
    const out = this.built ? this.statics[level].slice() : [];
    const ap = this.room.doorPivot;
    if (level === 'ust') {
      // tavan arası sınırları (çatı eğimi) ve alın duvarları
      out.push({ x0: 2.17, x1: 3.5, z0: -3, z1: 3 }, { x0: -3.5, x1: -2.17, z0: -3, z1: 3 }, { x0: -3.5, x1: 3.5, z0: -3.2, z1: -2.57 });
      out.push({ x0: -3.5, x1: -1.64, z0: 2.6, z1: 2.75 }, { x0: -0.76, x1: 3.5, z0: 2.6, z1: 2.75 });
      out.push(this.leafBox(-1.63, 2.58, [1, 0], 0.86, ap.rotation.y));
      if (!this.built) out.push({ x0: -1.7, x1: -0.7, z0: 2.6, z1: 2.8 });
      // tavan arası eşyaları
      out.push(
        { x0: -0.58, x1: 0.58, z0: -2.6, z1: -1.5 },
        { x0: -1.28, x1: -0.68, z0: -1.42, z1: -0.94 },
        { x0: 0.76, x1: 1.4, z0: -1.45, z1: -0.95 },
        { x0: -0.25, x1: 0.25, z0: 0.48, z1: 0.96 },
        { x0: 1.15, x1: 1.75, z0: -0.33, z1: 0.53 },
        { x0: 1.42, x1: 1.78, z0: 1.27, z1: 1.63 },
        { x0: 1.75, x1: 2.25, z0: 1.3, z1: 1.8 },
        { x0: 1.6, x1: 2.1, z0: 1.98, z1: 2.42 },
      );
    }
    if (this.built && level !== 'ust') {
      for (const d of Object.values(this.doors)) {
        if (d.name === 'nermin') continue;
        const a = d.pivot.rotation.y;
        if (d.name === 'dolap' && Math.abs(a) < 0.05) continue; // kapalıyken boşluk zaten duvar
        if (level === 'bahce' && d.name !== 'arka') continue;
        out.push(this.leafBox(d.hinge[0], d.hinge[1], d.d0, d.w, a));
      }
      if (level === 'zemin') HF.flowColliders(this, out);
    }
    return out;
  }

  /** Ayakların değdiği yükseklik (yoksa null) */
  floorY(level, x, z) {
    const onStair = x > -1.72 && x < -0.68 && z >= 3.8 && z <= 7.8;
    if (level === 'ust') {
      if (z <= 3.8) return Math.abs(x) < 3 && z > -2.6 ? 0 : null;
      if (onStair) return stairY(z);
      return null;
    }
    if (onStair) return Math.max(YG, stairY(z));
    if (z < -3.2 && z > -3.42 && x > 2.55 && x < 3.5) return lerp(YG, YB, (-3.2 - z) / 0.2);
    if (level === 'zemin') return x > -4.62 && x < 4.62 && z > -3.25 && z < 9.22 ? YG : null;
    if (level === 'bahce') return z <= -3.2 ? YB : YG;
    return null;
  }

  zoneAt(level, x, z) {
    if (level === 'ust') return z <= 2.6 ? 'cati' : z <= 3.8 ? 'sahanlik' : 'merdiven';
    if (z < -3.2) return 'bahce';
    if (x > -1.7 && x < -0.7 && z >= 3.8 && z <= 7.8) return 'merdiven';
    if (z >= 7.8 && x > -1.7 && x < 0.9) return 'giris';
    if (x >= -0.7 && x <= 0.9 && z >= 1.0) return 'hol';
    if (x < -1.7 && z >= 2.62) return 'salon';
    if (x < -0.7 && z < 2.62) return 'montaj';
    if (x > -0.7 && z < 1.0) return 'mutfak';
    if (x > 0.9 && z >= 6.4) return 'banyo';
    return 'hol';
  }

  /** Bakış ışınının duvarlardan geçmemesi için görünür bölümlerin duvarları */
  extraInteractables() {
    if (!this.built || this.zone === 'cati') return [];
    const C = this.chunks;
    const out = [];
    for (const k of ['ust', 'zemin', 'bahce']) if (C[k].visible) out.push(...this.occluders[k]);
    return out;
  }

  // ================================================================== durum
  apply(st) {
    const r = st.room || {};
    const room = this.room;
    const g = this.g;
    if (!g.director?.active) {
      // tavan arası kapısı: kilit açıkken kayıttaki duruma göre
      if (r.walk) room.doorPivot.rotation.y = r.doorOpen && !r.atticSealed ? HALF : 0;
    }
    if (!this.built) return;
    const doors = r.doors || {};
    for (const n of ['montaj', 'banyo', 'arka', 'dolap']) this.setDoor(n, !!doors[n], 0);
    if (r.plushDown) {
      room.plush.position.copy(this.points.plushFoot);
      room.plush.rotation.set(0, Math.PI - 0.2, 0);
    }
    const c4 = this.rackBoxes?.C4;
    if (c4) {
      c4.position.z = c4.userData.home + (this.has(9) ? 0.12 : 0);
      c4.rotation.x = this.has(9) ? -0.05 : 0;
    }
    this.drawSalon('off');
    this.drawMonitors('off');
    this.drawDecks('');
    this.ambience.setWhine(!(r.scares || []).includes('tv'));
    this.ambience.setDeck(!(r.scares || []).includes('monitor'));
    this.mirrorPivot.rotation.y = 0;
    this.mirrorInside.visible = false;
    this.ghost.visible = false;
    this.man.visible = this.manArms.visible = false;
    this.winGirl.visible = false;
    if (this.drawer) this.drawer.position.z = -2.59;
    HF.applyFlow(this, st);
    this._titleT = 0; // salon ekranı (ipucu sürerken) hemen yeniden çizilsin
  }

  toppleKoli(live) {
    if (this.built) HF.toppleKoli(this, live);
  }
  stopRing() {
    try {
      this.ringStopFn?.();
    } catch {
      /* bitti */
    }
    this.ringStopFn = null;
    this.ringing = false;
  }
  stopLead() {
    HF.stopLead(this);
  }
  debugFind(n) {
    return HF.debugFind(this, n);
  }

  // ================================================================== her kare
  update(dt, clock) {
    const g = this.g;
    if (!this.built) return;
    // tavan arasında: kapı aralıkken merdiven görünür (kapı sahnesi dahil)
    if (this.zone === 'cati') {
      const v = this.room.doorPivot.rotation.y > 0.02;
      if (this.chunks.ust.visible !== v) this.chunks.ust.visible = v;
    }
    // bahçeden görünen tavan arası penceresi ampule göre
    if (this.litWindow.visible) {
      const k = 0.08 + this.room.bulbLevel * 0.9;
      this.litMat.color.setRGB(1.0 * k, 0.62 * k, 0.3 * k);
    }
    // salıncak (A4)
    if (this.chunks.bahce.visible && this.swing) {
      const sc = g.scares;
      if (sc?.swingStop || this.swingHold) {
        // sıcak-soğuk yakınken ya da korkutmada salıncak yavaşça durur
        this.swing.rotation.x -= this.swing.rotation.x * Math.min(1, dt * 2);
        this.swingV = 0;
      } else {
        this.swingT = (this.swingT || 0) + dt;
        const a = Math.sin(this.swingT * Math.PI * 2 * 0.45) * 0.12;
        const prev = this.swing.rotation.x;
        this.swing.rotation.x = a;
        if (this.zone === 'bahce' && Math.sign(a - prev) !== Math.sign(this.swingV || 0) && this.swingV) g.audio.sfx('swingCreak', this.points.swing, 0.05);
        this.swingV = a - prev;
      }
    }
    // billboardlar kameraya döner
    const cam = this.room.camera.position;
    for (const m of [this.man, this.manArms, this.fp.ghost2]) if (m.visible) m.rotation.y = Math.atan2(cam.x - m.position.x, cam.z - m.position.z);
    // telesekreter ekranı
    if (this.zone === 'giris' || this.zone === 'hol') {
      const blink = Math.floor(clock * 1.6) % 2;
      if (blink !== this._lcd) {
        this._lcd = blink;
        const x = this.lcdCanvas.getContext('2d');
        x.fillStyle = '#100202';
        x.fillRect(0, 0, 64, 32);
        if (blink) {
          x.fillStyle = '#ff3020';
          x.font = '28px "VT323", monospace';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText((this.r.seen || []).includes('ev:telesekreter') ? '0' : '2', 32, 17);
        }
        this.lcdTex.needsUpdate = true;
      }
    }
    // ekranlar (yalnız korkutma sürerken, en çok 30 Hz)
    if (this.screenFn && clock - (this._scr || 0) > 1 / 30) {
      this._scr = clock;
      this.screenFn(clock);
    }
    // ışık seviyeleri
    const w = g.walk;
    const fl = w ? w.flickerK : 1;
    this.zoneLight.intensity = this.zoneLevel * (this.zoneBoost ?? 1) * (this.flickerZone ? fl : 1);
    this.ambience.update(clock);
    HF.updateLeads(this, dt);
  }

  // ================================================================== etiketler
  seen(id) {
    return (this.r.seen || []).includes(id);
  }
  markSeen(id) {
    const r = this.r;
    r.seen = r.seen || [];
    if (!r.seen.includes(id)) r.seen.push(id);
  }
  bold(id, text) {
    return this.seen(id) ? text : `<b>${text}</b>`;
  }

  label(id) {
    if (!id) return null;
    const r = this.r;
    const st = this.st;
    if (id === 'door') {
      if (!r.key) return null;
      if (r.atticSealed) return 'Kapı (kilitli)';
      if (!r.walk) return '<b>Kapıyı anahtarla aç</b>';
      return this.room.doorPivot.rotation.y > 0.6 ? 'Kapıyı kapat' : 'Kapıyı aç';
    }
    if (id === 'plush') return r.plushDown && st.stage < 10 ? 'Tonton peluşu' : null;
    if (!id.startsWith('ev:')) return null;
    if (id.startsWith('ev:arsiv:')) {
      const k = id.slice(9);
      return RACK[k[0]][+k[1] - 1];
    }
    if (id.startsWith('ev:kapi:')) {
      const n = id.slice(8);
      const open = Math.abs(this.doors[n].pivot.rotation.y) > 0.6;
      if (n === 'montaj' && !r.montajOpen) return r.fbOpen ? '<b>Kapıyı anahtarla aç</b>' : 'Montaj odası (kilitli)';
      if (n === 'arka' && !r.arkaUnlocked) return 'Arka kapı (sürgülü)';
      if (n === 'arka' && !this.seen('ev:kapi:arka')) return 'Arka kapı';
      return open ? 'Kapıyı kapat' : 'Kapıyı aç';
    }
    const fl = HF.flowLabel(this, id);
    if (fl !== undefined) return fl;
    switch (id) {
      case 'ev:portmanto':
        return this.bold(id, 'Portmanto');
      case 'ev:telesekreter':
        return this.seen(id) ? 'Telesekreter' : '<b>Telesekreter (2 mesaj)</b>';
      case 'ev:dolap':
        return this.bold(id, 'Merdiven altı dolabı');
      case 'ev:fotograf':
        return this.bold(id, 'Çerçeveli fotoğraf');
      case 'ev:takvim':
        return this.bold(id, 'Takvim');
      case 'ev:buzdolabi':
        return this.bold(id, 'Buzdolabındaki resim');
      case 'ev:cekmece':
        return this.bold(id, 'Çekmece');
      case 'ev:ecza':
        return this.bold(id, 'Ecza dolabı');
      case 'ev:defter':
        return this.bold(id, 'Kurgu defteri');
      case 'ev:klasor':
        return this.bold(id, 'Klasör');
      case 'ev:cam':
        return 'Yaşlı çam';
      case 'ev:teneke':
        return r.tinOpen || st.stage < 8 ? 'Paslı kutu' : '<b>Paslı kutu</b>';
      case 'ev:saat':
        return 'Duvar saati';
      case 'ev:diskapi':
        return 'Dış kapı (kilitli)';
      case 'ev:dugme':
        return 'Işık düğmesi';
      case 'ev:nermin':
        if ((r.scares || []).includes('delik')) return "Nermin'in odası (kilitli)";
        return this.seen('ev:nermin') && st.stage >= 5 ? '<b>Anahtar deliğinden bak</b>' : "Nermin'in odası (kilitli)";
      case 'ev:salontv':
        return 'Televizyon';
      case 'ev:monitor':
        return 'Monitörler';
      case 'ev:pano':
        return 'Mantar pano';
      case 'ev:perde':
        return 'Duş perdesi';
      case 'ev:salincak':
        return 'Salıncak';
      case 'ev:bahcekapisi':
        return 'Bahçe kapısı (zincirli)';
      case 'ev:yagmurluk':
        return 'Sarı yağmurluk';
      default:
        return '';
    }
  }

  // ================================================================== etkileşimler
  /** true döndürürse burada işlendi */
  async interact(id) {
    if (!id) return false;
    const g = this.g;
    const r = this.r;
    const st = this.st;
    const au = g.audio;
    const ui = g.ui;
    if (id === 'door') {
      if (!r.key) return false;
      if (g.director.active || g.loadingTape) {
        ui.toast('Önce kaset bitsin.', 2.5);
        return true;
      }
      const dp = this.room.points.door;
      if (r.atticSealed) {
        au.sfx('vcrStuck', dp);
        ui.toast('Kilitli. Anahtar artık kilide girmiyor. Kapının öbür yanında biri nefes alıyor.', 5);
        return true;
      }
      if (!r.walk) {
        this.ensureBuilt();
        au.sfx('keyTurn', dp);
        await sleep(500);
        au.sfx('creak', dp, 2.6);
        this.room.openDoor(1, 2.5);
        r.walk = true;
        r.doorOpen = true;
        r.doors = r.doors || { montaj: false, banyo: true, arka: false, dolap: false };
        this.apply(st);
        this.room.doorPivot.rotation.y = 0;
        this.room.openDoor(1, 2.5);
        ui.toast('Anahtar zorlanarak döndü. Kapı kendiliğinden aralandı. Aşağıdan çok kısık bir müzik geliyor.', 6);
        g.save();
        g.updateObjective();
        setTimeout(() => g.mode === 'play' && ui.walkHint?.(true, 10), 1500);
        return true;
      }
      const open = this.room.doorPivot.rotation.y > 0.6;
      if (open) {
        this.room.tweens.add(this.room.doorPivot.rotation, 'y', 0, 0.8);
        setTimeout(() => au.sfx('latch', dp), 700);
        r.doorOpen = false;
      } else {
        this.room.tweens.add(this.room.doorPivot.rotation, 'y', HALF, 0.9);
        au.sfx('creak', dp, 1.2);
        r.doorOpen = true;
      }
      g.save();
      return true;
    }
    if (id === 'plush') {
      if (!(r.plushDown && st.stage < 10)) return false;
      ui.toast('Tonton. Merdivenden kendi kendine yuvarlandı. Tek düğme gözü sana bakıyor.', 5);
      return true;
    }
    if (!id.startsWith('ev:')) return false;
    if (g.director.active || g.loadingTape) {
      ui.toast('Önce kaset bitsin.', 2.5);
      return true;
    }
    const firstTime = !this.seen(id);
    this.markSeen(id);
    if (id.startsWith('ev:arsiv:')) {
      await this.pullBox(id.slice(9));
      g.save();
      return true;
    }
    if (id === 'ev:kapi:montaj' && !r.montajOpen) {
      const p = this.points.montajDoor;
      if (!r.fbOpen) {
        au.sfx('handle', p, 2);
        ui.toast("Kapı kilitli. Üstüne bantlanmış bir kâğıt: 'MONTAJ — GİRMEYİN — N.'", 5);
        return true;
      }
      au.sfx('keyTurn', p);
      await sleep(550);
      this.setDoor('montaj', true, 1.6);
      au.sfx('creak', p, 1.6);
      r.montajOpen = true;
      r.doors = { ...(r.doors || {}), montaj: true };
      this.stopLead();
      this.fp.strip.visible = false;
      ui.toast('Kilit döndü. Montaj odasında monitörlerin fanı uğulduyor.', 5);
      g.save();
      g.updateObjective();
      return true;
    }
    if (id === 'ev:kapi:arka' && !r.arkaUnlocked) {
      au.sfx('handle', this.points.backDoor, 2);
      ui.toast('Arka kapının sürgüsü paslanmış, kıpırdamıyor. Camından bahçedeki sis görünüyor.', 5);
      return true;
    }
    if (await HF.flowInteract(this, id)) {
      g.save();
      return true;
    }
    if (id.startsWith('ev:kapi:')) {
      const n = id.slice(8);
      const d = this.doors[n];
      const open = Math.abs(d.pivot.rotation.y) < 0.6;
      this.setDoor(n, open, 0.9);
      const p = n === 'montaj' ? this.points.montajDoor : n === 'banyo' ? this.points.bathDoor : this.points.backDoor;
      if (open) au.sfx('creak', p, 1.1);
      else setTimeout(() => au.sfx('latch', p), 750);
      r.doors = { ...(r.doors || {}), [n]: open };
      if (n === 'arka') {
        this.ambience.setOutdoor(open);
        setTimeout(() => this.applyVisibility(), open ? 0 : 950);
        if (open && firstTime) ui.toast('Arka kapı gıcırdayarak açıldı. Dışarıda sis, ıslak toprak ve çam kokusu.', 5);
      }
      g.save();
      return true;
    }
    switch (id) {
      case 'ev:portmanto':
        ui.toast("Askıda bej bir hırka. Nermin'in. Cebinde katlanmış bir otobüs bileti: KARŞIYAKA — ÇAMLIK, 14.05.1999. Bir yıl sonra oraya tek başına gitmiş.", 7);
        break;
      case 'ev:telesekreter':
        await this.answeringMachine();
        break;
      case 'ev:dolap':
        await this.cupboard(firstTime);
        break;
      case 'ev:fotograf':
        await g.readDoc('fotograf');
        break;
      case 'ev:takvim':
        ui.toast("Mayıs 1998'de kalmış bir takvim. 14'ün kutusuna 'ÇAMLIK DIŞ ÇEKİM 09.00' yazılmış. Sonraki bütün günlere küçük harflerle aynı soru yazılmış: 'bulundu mu?'", 7);
        break;
      case 'ev:buzdolabi':
        if ((r.scares || []).includes('buzdolabi')) {
          ui.toast('Buzdolabının kapağı açık. İçi boş ve ılık. Fişi prizde değil.', 5);
          break;
        }
        ui.toast('Mıknatısla tutturulmuş bir çocuk resmi: el ele bir kadın ve sarı elbiseli bir kız. Altında: NERMİN ABLAMA. Kenara sonradan, kurşun kalemle, çok uzun, gri bir adam eklenmiş. Çizgiler çocuk eli değil.', 8);
        break;
      case 'ev:cekmece':
        this.room.tweens.add(this.drawer.position, 'z', -2.32, 0.4);
        au.sfx('woodScrape', V(1.9, -2.15, -2.5), 0.4);
        ui.toast('Çekmecede mumlar, kibrit, faturalar. Altında Yıldız Çocuk Yapım antetli bir zarf.', 4);
        await sleep(1600);
        await g.readDoc('riza');
        this.room.tweens.add(this.drawer.position, 'z', -2.59, 0.4);
        break;
      case 'ev:ecza':
        await this.medicine();
        break;
      case 'ev:defter':
        await g.readDoc('defter');
        if (!r.deskRead) {
          r.deskRead = true;
          g.save();
          g.updateObjective();
        }
        g.scares?.onDeskRead();
        break;
      case 'ev:klasor':
        await g.readDoc('kamil');
        break;
      case 'ev:cam':
        ui.toast('Yaşlı bir çam. Kabuğuna taze bir yazı kazınmış: 14.05. Reçine hâlâ akıyor.' + (r.tinOpen ? '' : ' Köklerin arasında paslı bir kutu var.'), 6);
        break;
      case 'ev:teneke':
        if (st.stage < 8 && !r.tinOpen) {
          ui.toast('Ağacın köklerinin arasında paslı bir bisküvi kutusu. Kapağı paslanıp yapışmış.', 5);
          break;
        }
        au.sfx('paper');
        await g.readDoc('teneke');
        if (!r.tinOpen) {
          r.tinOpen = true;
          g.save();
          g.updateObjective();
        }
        g.scares?.onTinRead();
        break;
      case 'ev:saat':
        ui.toast("Duvar saati 13.59'da durmuş. Ama tik tak sesi hâlâ geliyor.", 5);
        break;
      case 'ev:diskapi':
        au.sfx('vcrStuck', V(-0.1, -1.9, 9.1));
        ui.toast('Dış kapı kilitli. Kilidin içinde kırık bir anahtar ucu var. Bu kapıdan uzun zamandır kimse çıkmamış.', 6);
        break;
      case 'ev:dugme':
        au.sfx('click');
        ui.toast('Düğmeye bastın. Hiçbir şey olmadı. Aşağı katta elektrik yok.', 4);
        break;
      case 'ev:nermin': {
        const done = (r.scares || []).includes('delik');
        if (!firstTime && !done && !g.debug?.noScares && st.stage >= 5) {
          await g.scares?.keyhole();
          break;
        }
        g.scares?.stopMusicBox();
        au.sfx('handle', this.points.nerminDoor, 2);
        if (done) ui.toast("Nermin'in odası. Kilitli. İçeride artık ses yok.", 5);
        else ui.toast(g.scares?.musicBoxPlaying ? "Nermin'in odası. Kilitli. İçeriden çok kısık bir müzik kutusu sesi geliyor." : "Nermin'in odası. Kilitli.", 5);
        break;
      }
      case 'ev:salontv':
        ui.toast((r.scares || []).includes('tv') ? 'Televizyonun fişi prizden çekilmiş. Kablonun ucu kesik.' : 'Eski, ahşap kasalı bir televizyon. Kapalı, ama ekranından ince bir vınlama geliyor.', 5);
        break;
      case 'ev:monitor':
        ui.toast((r.scares || []).includes('monitor') ? 'Monitörler kapalı. Camları hâlâ sıcak.' : 'Üç monitör, iki video kaydedici. Fişleri takılı ama hiçbiri açılmıyor.', 5);
        break;
      case 'ev:pano':
        ui.toast('Mantar panoda 1. bölümün hikâye taslağı. Son karede Beste kameraya el sallıyor. Biri karenin arkasına kurşun kalemle uzun bir gölge çizmiş.', 7);
        break;
      case 'ev:perde':
        au.sfx('clothSlide', V(2.2, -1.5, 8.42), 0.6);
        ui.toast('Perdeyi araladın. Küvetin içinde sarı, lastik bir ördek. Kupkuru.', 5);
        break;
      case 'ev:salincak':
        ui.toast('Eski bir salıncak. Oturağına çakıyla BESTE yazılmış. Rüzgâr yok ama hafifçe sallanıyor.', 5);
        break;
      case 'ev:bahcekapisi':
        au.sfx('handle', V(0, YB + 0.9, -13), 2);
        ui.toast('Bahçe kapısı paslı bir zincirle kilitli. Ötesi çam ormanı. Sis, ağaçların arasından bahçeye doğru akıyor.', 6);
        break;
      case 'ev:yagmurluk':
        ui.toast('Askıda sarı bir çocuk yağmurluğu. Cebinde kuru çam iğneleri.', 5);
        break;
      default:
        return false;
    }
    g.save();
    return true;
  }

  async answeringMachine() {
    if (this.busy.machine) return;
    this.busy.machine = true;
    const g = this.g;
    const au = g.audio;
    const p = this.points.machine;
    const say = async (id, label) => {
      const line = g.lines[id] || EV_LINES[id];
      au.sfx('machineBeep', p);
      await sleep(500);
      g.ui.subtitle(label, line.t, 'narrator');
      au.sfx('machineHiss', p, 4.5);
      const h = au.playRoomVoice(id, { pos: p, gain: 1.15, wet: 0.15 });
      await Promise.race([h.promise, sleep(9000)]);
      if (!au.buffers.has(id)) await sleep(Math.min(4500, line.t.length * 55));
      g.ui.subtitle(null, null, null, 0.6);
      await sleep(400);
    };
    try {
      await say('ev_tel1', 'TELESEKRETER · 14.05.98 · 21.30');
      await say('ev_tel2', 'TELESEKRETER · 15.05.98 · 03.12');
      au.sfx('machineBeep', p);
      g.ui.toast("İkinci mesaj, Beste'nin kaybolduğu günün gecesi bırakılmış.", 6);
    } finally {
      this.busy.machine = false;
    }
  }

  async cupboard(first) {
    const g = this.g;
    const au = g.audio;
    const d = this.doors.dolap;
    const open = Math.abs(d.pivot.rotation.y) < 0.6;
    const r = this.r;
    this.setDoor('dolap', open, 0.8);
    r.doors = { ...(r.doors || {}), dolap: open };
    if (open) {
      au.sfx('creak', this.points.cupboard, 1.2);
      if (!this.busy.dolapWhisper) {
        this.busy.dolapWhisper = true;
        setTimeout(() => {
          const line = g.lines.ev_dolap || EV_LINES.ev_dolap;
          g.ui.subtitle('???', line.t, 'beste');
          const h = au.playRoomVoice('ev_dolap', { pos: V(-1.2, -2.5, 3.8), gain: 0.9 });
          h.promise.then(() => g.ui.subtitle(null, null, null, 0.5));
        }, 900);
      }
      g.ui.toast("Dolabın içi yanık kokuyor. Erimiş, kararmış kasetler. Hepsinin etiketi aynı: 'Beste 1 — Tanışalım'. En üstteki hâlâ ılık.", 7);
    } else {
      setTimeout(() => au.sfx('latch', this.points.cupboard), 700);
      if (!this.busy.dolapKnock) {
        this.busy.dolapKnock = true;
        setTimeout(() => au.sfx('knock', V(-1.2, -2.2, 3.8), 2, 0.5), 1600);
      }
    }
  }

  async medicine() {
    const g = this.g;
    const au = g.audio;
    if (this.busy.ecza) return;
    this.busy.ecza = true;
    this.room.tweens.add(this.mirrorPivot.rotation, 'y', -1.9, 0.5);
    this.mirrorInside.visible = true;
    au.sfx('creak', this.points.mirror, 0.6);
    g.ui.toast("Ecza dolabında bir kutu uyku hapı ve bir reçete. Arkasına Nermin not almış: 'Doktor sesleri benim uydurduğumu söylüyor. Sayıları da ben sayıyormuşum. Ama sekizden sonrasını ben saymıyorum.'", 8);
    await sleep(8000);
    this.room.tweens.add(this.mirrorPivot.rotation, 'y', 0, 0.35);
    await sleep(350);
    this.mirrorInside.visible = false;
    au.sfx('boxClick', this.points.mirror);
    this.busy.ecza = false;
    g.scares?.onMirrorClosed();
  }

  // ------------------------------------------------------------------ ARŞİV rafı (§5)
  async pullBox(k) {
    const g = this.g;
    const r = this.r;
    const au = g.audio;
    const m = this.rackBoxes[k];
    const label = RACK[k[0]][+k[1] - 1];
    if (this.busy.rack) return;
    if (!r.tinOpen && !this.has(9)) {
      g.ui.toast('Raflarca kaset. Nermin hepsine tarih yazmış. Hangisi olduğunu bilmeden hepsini açamazsın.', 5);
      return;
    }
    this.busy.rack = true;
    try {
      if (k === 'C4') {
        if (this.has(9)) {
          g.ui.toast('Boş kutu. Not hâlâ kapağın içinde.', 4);
          return;
        }
        this.room.tweens.add(m.position, 'z', m.userData.home + 0.12, 0.35);
        au.sfx('woodScrape', m.position, 0.3);
        await sleep(450);
        this.room.tweens.add(m.rotation, 'x', -0.05, 0.3);
        au.sfx('pickup');
        g.addTape(9);
        g.ui.toast("Kutunun içinde etiketi kazınmış bir kaset. Kapağın içine bantlanmış bir not: 'HAM KAYIT — ÇAMLIK 14.05.98 — YAYINLANMAZ. İyi ki doğdun, Beste. — N.'", 8);
        g.updateObjective();
        g.save();
        g.scares?.afterTape9();
        return;
      }
      this.room.tweens.add(m.position, 'z', m.userData.home + 0.12, 0.3);
      au.sfx('woodScrape', m.position, 0.3);
      g.ui.toast(RACK_SPECIAL[k] || `'${label}' — kurgu kopyası. Aradığın bu değil.`, 6);
      if (!this.has(9)) g.finds.wrongHint('arsiv', RACK_HINTS);
      await sleep(1400);
      this.room.tweens.add(m.position, 'z', m.userData.home, 0.3);
      await sleep(300);
    } finally {
      this.busy.rack = false;
    }
  }

  /** Test için: defter, teneke, C4 ve mühür aynı kod yollarından, yürümeden (fullrun.js) */
  async debugRun9() {
    const g = this.g;
    this.ensureBuilt();
    const r = this.r;
    const close = async () => {
      for (let i = 0; i < 40 && !g.overlay; i++) await sleep(50);
      if (g.overlay === 'reader') g.ui.closeReader?.();
      await sleep(100);
    };
    if (!r.montajOpen) {
      await this.interact('ev:kapi:montaj');
      await sleep(300);
    }
    const p1 = this.interact('ev:defter');
    await close();
    await p1;
    const p2 = this.interact('ev:teneke');
    await close();
    await p2;
    await this.interact('ev:arsiv:C4');
    await sleep(300);
    g.scares?.cancelAll();
    g.scares?.seal(true);
    return { ...r, tapes: g.state.tapes.slice() };
  }
}

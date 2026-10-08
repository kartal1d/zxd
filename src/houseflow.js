// Evde bulunan kasetler (docs/ev-akisi.md §2): salon televizyonundaki 4. kaset, giriş telefonu ve hol halısının
// altındaki 5. kaset, mutfaktaki koliler ve hediye kutusu (6), salıncaktaki 8. kaset, montaj kapısının kilidi ve
// ışık şeridi; ayrıca korkutmalar için buzdolabı kapağı, ikinci sandalye, sahanlıktaki hayalet ve camdaki el.
// Etiketler, etkileşimler, duruma bağlı ses ipuçları (updateLeads) ve test kancası debugFind(n) buradadır.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// house.js ile döngüsel içe aktarma olmasın diye (modül yüklenirken kullanılıyor) burada tekrar
const YG = -2.9;

const HALF = Math.PI / 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial(o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FLAP_UP = 2.9;
const BOARD_UP = 1.95;
/** Koli B: kolinin üstündeki ilk yeri ve devrilince düştüğü yer */
const KOLI = { home: [4.0, YG + 0.7, -2.695], down: [3.55, YG + 0.25, -2.15], rot: [0, 0.4, 1.57] };
// out: korkutmada çekildiği yer; masanın kuzeyindeki geçit (hol ↔ mutfağın doğusu) açık kalsın diye az dışarıda
const CHAIR2 = { pos: [2.1, -0.02], yaw: Math.PI + 0.3, out: [2.3, 0.14] };

function labelTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ===================================================================== kurulum
export function buildFlowProps(h) {
  const M = h.M;
  const Z = h.chunks.zemin;
  const room = h.room;
  const fp = h.fp;
  // ---------------------------------------------------------------- salon: televizyonun üstündeki 4. kaset
  const t4 = room.makeTape('4');
  t4.position.set(-3.05, -1.899, 2.95);
  t4.rotation.y = 0.3;
  Z.add(t4);
  h.tag(t4, 'ev:kaset4');
  fp.kaset4 = t4;

  // ---------------------------------------------------------------- giriş: siyah, çevirmeli telefon
  const src = room.attic.phone;
  const bak = src.children[0].material;
  const black = std({ color: 0x141210, roughness: 0.35, metalness: 0.05 });
  const ph = src.clone(true);
  ph.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map((m) => (m === bak ? black : m));
    else if (o.material === bak) o.material = black;
  });
  ph.position.set(0.72, -2.1, 8.48);
  ph.rotation.set(0, -HALF, 0);
  ph.scale.setScalar(0.8);
  Z.add(ph);
  h.tag(ph, 'ev:telefon');
  fp.phone = ph;
  fp.handset = ph.children[src.children.indexOf(room.attic.handset)];
  fp.handsetHome = fp.handset.position.clone();

  // ---------------------------------------------------------------- hol: halının kalkan köşesi ve gevşek tahta
  const L = 0.3536;
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-L, 0, 0, L, 0, 0, 0, 0, -L], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0.2, 0.9, 0.8, 0.9, 0.5, 0.6], 2));
  tri.computeVertexNormals();
  const flapG = new THREE.Group();
  flapG.position.set(0.3, YG + 0.008, 7.05);
  flapG.rotation.y = (-3 * Math.PI) / 4;
  Z.add(flapG);
  const rugD = M.rug.clone();
  rugD.side = THREE.DoubleSide;
  const flap = new THREE.Mesh(tri, rugD);
  flapG.add(flap);
  const bare = new THREE.Mesh(tri.clone(), std({ color: 0x4a3222, roughness: 0.9 }));
  bare.position.y = -0.0015;
  flapG.add(bare);
  flapG.visible = false;
  fp.flapG = flapG;
  fp.flap = flap;
  const board = new THREE.Group();
  board.position.set(0.5, YG + 0.0065, 7.0);
  Z.add(board);
  const bm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.3), std({ color: 0x4a3020, roughness: 0.85 }));
  bm.position.set(-0.07, 0.007, 0.15);
  board.add(bm);
  board.visible = false;
  fp.board = board;
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.3), new THREE.MeshBasicMaterial({ color: 0x050302 }));
  hole.rotation.x = -HALF;
  hole.position.set(0.43, YG + 0.007, 7.15);
  hole.visible = false;
  Z.add(hole);
  fp.hole = hole;
  const t5 = room.makeTape('5');
  t5.position.set(0.43, YG + 0.0075, 7.16);
  t5.rotation.y = HALF + 0.08;
  t5.scale.set(0.95, 1, 0.95);
  t5.visible = false;
  Z.add(t5);
  fp.tape5 = t5;
  const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 5), std({ color: 0xffd23f, metalness: 0.4, roughness: 0.4 }));
  clip.position.set(0.39, YG + 0.012, 7.03);
  clip.visible = false;
  Z.add(clip);
  fp.clip = clip;
  for (const o of [board, hole, t5]) h.tag(o, 'ev:tahta');

  // ---------------------------------------------------------------- mutfak: koliler ve hediye kutusu
  h.box('zemin', 'mutfak', M.cardboard, 3.7, 4.3, YG, YG + 0.5, -3.12, -2.62);
  h.box('zemin', 'mutfak', M.cardboard, 4.32, 4.58, YG, YG + 0.75, -3.12, -2.5);
  h.col('zemin', 3.68, 4.6, -3.14, -2.5);
  const koli = h.mesh(new THREE.BoxGeometry(0.5, 0.4, 0.29), M.cardboard, Z, ...KOLI.home);
  fp.koli = koli;
  const gift = new THREE.Group();
  gift.position.set(4.0, YG + 0.5, -2.98);
  gift.rotation.y = -HALF;
  Z.add(gift);
  const red = std({ color: 0xb0202a, roughness: 0.5 });
  const gold = std({ color: 0xffd23f, roughness: 0.4, metalness: 0.2 });
  h.mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), red, gift, 0, 0.1, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.2, -0.13);
  gift.add(lid);
  h.mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), red, lid, 0, 0.02, 0.13);
  h.mesh(new THREE.BoxGeometry(0.29, 0.045, 0.05), gold, lid, 0, 0.022, 0.13);
  h.mesh(new THREE.BoxGeometry(0.05, 0.045, 0.29), gold, lid, 0, 0.022, 0.13);
  const tagTex = labelTex(256, 128, (x) => {
    x.fillStyle = '#f6f1e4';
    x.fillRect(0, 0, 256, 128);
    x.fillStyle = '#2b241b';
    x.font = '24px "Caveat", cursive';
    x.fillText("Beste'ye.", 14, 32);
    x.fillText('Sekizinci yaş gününde açılsın.', 14, 66);
    x.fillText('— Nermin Abla', 120, 104);
  });
  const tg = h.mesh(new THREE.PlaneGeometry(0.16, 0.08), std({ map: tagTex, roughness: 0.8 }), gift, 0, 0.1, 0.131);
  tg.rotation.y = 0;
  const t6 = room.makeTape('6');
  t6.position.set(0, 0.06, 0);
  t6.scale.setScalar(0.9);
  gift.add(t6);
  h.tag(gift, 'ev:hediye');
  fp.gift = gift;
  fp.giftLid = lid;
  fp.giftTape = t6;

  // ---------------------------------------------------------------- mutfak: ikinci sandalye (korkutma için ayrı ağ)
  const parts = [];
  const add = (x0, x1, y0, y1, z0, z1) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parts.push(g);
  };
  add(-0.2, 0.2, 0.42, 0.46, -0.2, 0.2);
  add(-0.2, 0.2, 0.46, 0.9, -0.22, -0.19);
  for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) add(lx - 0.015, lx + 0.015, 0, 0.42, lz - 0.015, lz + 0.015);
  const chair = h.mesh(mergeGeometries(parts, false), M.wood, Z, CHAIR2.pos[0], YG, CHAIR2.pos[1]);
  chair.rotation.y = CHAIR2.yaw;
  fp.chair2 = chair;
  fp.chair2Out = CHAIR2.out;

  // ---------------------------------------------------------------- bahçe: salıncağın oturağındaki 8. kaset
  const t8 = room.makeTape('8');
  t8.position.set(0.04, -1.83, 0);
  t8.rotation.y = 0.5;
  h.swing.add(t8);
  h.tag(t8, 'ev:kaset8');
  fp.kaset8 = t8;

  // ---------------------------------------------------------------- montaj kapısı: tabela ve altından sızan mavi ışık
  const signTex = labelTex(256, 184, (x) => {
    x.fillStyle = '#ece4cc';
    x.fillRect(0, 0, 256, 184);
    x.fillStyle = 'rgba(200,190,150,.6)';
    x.fillRect(0, 0, 256, 18);
    x.fillStyle = '#1e1a14';
    x.font = 'bold 48px "Special Elite", monospace';
    x.textAlign = 'center';
    x.fillText('MONTAJ', 128, 78);
    x.font = '30px "Special Elite", monospace';
    x.fillText('GİRMEYİN', 128, 122);
    x.font = '30px "Caveat", cursive';
    x.fillText('— N.', 190, 164);
  });
  const ml = h.doors.montaj.leaf;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.15), std({ map: signTex, roughness: 0.9 }));
  sign.position.set(0.026, -1.55 - YG, -0.42);
  sign.rotation.y = HALF;
  ml.add(sign);
  fp.sign = sign;
  const strip = h.mesh(new THREE.PlaneGeometry(0.06, 0.75), new THREE.MeshBasicMaterial({ color: 0x3a5cff, transparent: true, opacity: 0.55, depthWrite: false }), Z, -0.66, YG + 0.005, 1.975);
  strip.rotation.x = -HALF;
  strip.visible = false;
  fp.strip = strip;

  // ---------------------------------------------------------------- korkutmalar: sahanlıktaki hayalet ve camdaki el
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ map: TX.besteGhost(), transparent: true, depthWrite: false, color: 0xb8b8b0 }));
  ghost.position.set(-1.2, 0.45, 3.3);
  ghost.visible = false;
  room.scene.add(ghost);
  fp.ghost2 = ghost;
  const handTex = TX.childHand();
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), new THREE.MeshBasicMaterial({ map: handTex, transparent: true, depthWrite: false }));
  hand.position.set(1.36, 1.45, -2.66);
  hand.visible = false;
  room.scene.add(hand);
  fp.hand = hand;
  const smudge = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.17), new THREE.MeshBasicMaterial({ map: handTex, transparent: true, opacity: 0.22, depthWrite: false }));
  smudge.position.set(1.36, 1.38, -2.64);
  smudge.visible = false;
  room.scene.add(smudge);
  fp.smudge = smudge;
}

/** Mutfak buzdolabı: menteşeli kapak + içerideki ışık düzlemi (buildMutfak çağırır) */
export function buildFridgeDoor(h, Z) {
  const M = h.M;
  const fp = h.fp;
  const pivot = new THREE.Group();
  pivot.position.set(4.0, YG, -0.95);
  Z.add(pivot);
  h.mesh(new THREE.BoxGeometry(0.06, 1.6, 0.7), M.cream, pivot, 0, 0.8, 0.35);
  h.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), M.metal, pivot, -0.065, 1.38, 0.63);
  h.mesh(new THREE.BoxGeometry(0.004, 0.01, 0.68), M.dark, pivot, -0.032, 0.9, 0.35);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.52), new THREE.MeshBasicMaterial({ color: 0x1a1c1e }));
  inner.position.set(4.031, YG + 0.8, -0.6);
  inner.rotation.y = -HALF;
  Z.add(inner);
  fp.fridgeDoor = pivot;
  fp.fridgeIn = inner;
  return pivot;
}

// ===================================================================== durum
export function applyFlow(h, st) {
  const r = st.room || {};
  const fp = h.fp;
  const has = (n) => (st.tapes || []).includes(n);
  // bir bulunacak kaset yalnız sıradaki kasetse görünür (aynı anda en fazla bir tane)
  const next = (n) => st.stage + 1 === n && !has(n);
  const sc = r.scares || [];
  fp.kaset4.visible = !!r.walk && next(4) && !r.t4Chest;
  // giriş telefonu: zil korkutmasından sonra ahize kalkık
  fp.handset.position.copy(fp.handsetHome);
  fp.handset.rotation.set(0, 0, 0);
  if (sc.includes('zil')) {
    fp.handset.position.y += 0.05;
    fp.handset.position.z += 0.16;
    fp.handset.rotation.set(0.3, 0.5, 0.2);
  }
  // hol halısı
  fp.flapG.visible = !!r.holCall;
  fp.flap.rotation.x = r.holCall ? FLAP_UP : 0;
  fp.board.visible = !!r.holCall;
  fp.board.rotation.z = r.holBoard ? -BOARD_UP : 0;
  fp.hole.visible = !!r.holBoard;
  fp.tape5.visible = !!r.holBoard && next(5);
  fp.clip.visible = !!r.holBoard;
  // mutfak kolileri
  if (r.koliDown) {
    fp.koli.position.set(...KOLI.down);
    fp.koli.rotation.set(...KOLI.rot);
  } else {
    fp.koli.position.set(...KOLI.home);
    fp.koli.rotation.set(0, 0, 0);
  }
  fp.giftLid.rotation.x = r.hediyeOpen ? -1.9 : 0;
  fp.giftTape.visible = !!r.hediyeOpen && next(6);
  // buzdolabı (korkutmadan sonra açık, ışığı sönük)
  fp.fridgeDoor.rotation.y = sc.includes('buzdolabi') ? -1.9 : 0;
  fp.fridgeIn.material.color.setHex(0x1a1c1e);
  // ikinci sandalye
  if (sc.includes('sandalye')) {
    fp.chair2.position.set(CHAIR2.out[0], YG, CHAIR2.out[1]);
    fp.chair2.rotation.y = r.chairYaw ?? 0.4;
  } else {
    fp.chair2.position.set(CHAIR2.pos[0], YG, CHAIR2.pos[1]);
    fp.chair2.rotation.y = CHAIR2.yaw;
  }
  fp.kaset8.visible = next(8);
  fp.strip.visible = !!r.fbOpen && !r.montajOpen;
  fp.ghost2.visible = false;
  fp.hand.visible = false;
  fp.smudge.visible = sc.includes('tokat');
}

/** Devrilen koli B için çarpışma kutusu ve ikinci sandalye */
export function flowColliders(h, out) {
  const r = h.r;
  if (r.koliDown) out.push({ x0: 3.25, x1: 3.85, z0: -2.45, z1: -1.85 });
  const c = h.fp.chair2.position;
  out.push({ x0: c.x - 0.2, x1: c.x + 0.2, z0: c.z - 0.2, z1: c.z + 0.2 });
}

/** afterFirst(5): üstteki koli devrilir; mutfak tavan arasının altında, ses döşemeden duyulur */
export function toppleKoli(h, live) {
  const fp = h.fp;
  if (!live) return applyFlow(h, h.st);
  const tw = h.room.tweens;
  const au = h.g.audio;
  const p = fp.koli.position;
  fp.koli.position.set(...KOLI.home);
  fp.koli.rotation.set(0, 0, 0);
  tw.add(p, 'x', KOLI.down[0], 0.5);
  tw.add(p, 'y', KOLI.down[1], 0.5);
  tw.add(p, 'z', KOLI.down[2], 0.5);
  tw.add(fp.koli.rotation, 'y', KOLI.rot[1], 0.5);
  tw.add(fp.koli.rotation, 'z', KOLI.rot[2], 0.5);
  au.sfx('woodScrape', p.clone(), 0.5);
  setTimeout(() => au.sfx('thud', V(...KOLI.down), 1.6), 450);
}

// ===================================================================== etiketler
/** undefined: bu kimlik burada değil */
export function flowLabel(h, id) {
  const r = h.r;
  const st = h.st;
  const s = st.stage;
  const fp = h.fp;
  switch (id) {
    case 'ev:kaset4':
      return fp.kaset4?.visible ? '<b>Kaseti al</b>' : '';
    case 'ev:telefon':
      if ((r.scares || []).includes('zil')) return 'Telefon (ahize kalkık)';
      if (s === 4 && !r.holCall && !r.kilimLifted && !h.has(5)) return h.ringing ? '<b>Telefonu aç</b>' : '<b>Telefonu çevir</b>';
      return 'Telefon';
    case 'ev:tahta':
      if (!r.holCall || !h.g.canTakeTape(5)) return '';
      return r.holBoard ? '<b>Kaseti al</b>' : '<b>Gevşek tahta</b>';
    case 'ev:hediye':
      if (!r.koliDown) return '';
      if (!h.g.canTakeTape(6)) return 'Hediye kutusu';
      if (r.hediyeOpen) return '<b>Kaseti al</b>';
      return '<b>Hediye kutusu</b><br><small>"Sekizinci yaş gününde açılsın."</small>';
    case 'ev:kaset8':
      return fp.kaset8?.visible ? '<b>Kaseti al</b>' : '';
    default:
      return undefined;
  }
}

// ===================================================================== etkileşimler
/** true: burada işlendi */
export async function flowInteract(h, id) {
  const g = h.g;
  const r = h.r;
  const st = h.st;
  const au = g.audio;
  const ui = g.ui;
  const fp = h.fp;
  switch (id) {
    case 'ev:kaset4': {
      if (!fp.kaset4.visible || !g.canTakeTape(4)) return true;
      h.stopLead();
      au.sfx('pickup');
      g.addTape(4);
      ui.toast("Televizyonun üstünde bir kaset. Etiketinde 'Beste 4 — Kaybolursan Ne Yaparsın?' yazıyor.", 6);
      g.updateObjective();
      g.scares?.onTape4Pickup();
      return true;
    }
    case 'ev:telefon': {
      const p = h.points.hallPhone;
      if ((r.scares || []).includes('zil')) {
        ui.toast('Ahize kalkık. Hatta kimse yok. Çok uzaktan biri sayıyor.', 5);
        return true;
      }
      if (st.stage < 4) {
        au.sfx('phonePickup', p);
        ui.toast('Siyah, çevirmeli bir telefon. Ahizede yalnızca hışırtı var.', 5);
        return true;
      }
      if (!(st.stage === 4 && !r.holCall && !r.kilimLifted && !h.has(5))) {
        ui.toast('Telefon sessiz.', 3);
        return true;
      }
      if (h.busy.tel) return true;
      h.busy.tel = true;
      try {
        h.stopRing();
        if (!g.scares?.fired('hat') && !g.debug?.noScares) await g.scares.hat();
        else au.sfx('phonePickup', p);
        const ok = await g.finds.dialHome();
        if (!ok) {
          au.sfx('hangup', p);
          return true;
        }
        await g.finds.homeCall(p);
        r.holCall = true;
        liftRug(h);
        au.sfx('clothSlide', h.points.rugCorner, 1.2);
        ui.toast('Holde, halının köşesi kendiliğinden kalktı.', 5);
        g.save();
        g.updateObjective();
        g.scares?.armZil();
      } finally {
        h.busy.tel = false;
      }
      return true;
    }
    case 'ev:tahta': {
      if (!r.holCall || !g.canTakeTape(5)) return true;
      if (!r.holBoard) {
        r.holBoard = true;
        fp.hole.visible = true;
        h.room.tweens.add(fp.board.rotation, 'z', -BOARD_UP, 0.8);
        au.sfx('woodScrape', h.points.rugCorner, 0.8);
        await sleep(900);
      }
      au.sfx('pickup');
      g.addTape(5);
      ui.toast('Tahtanın altında bir kaset, yıldızlı bir saç tokası ve katlanmış bir gazete var.', 6);
      await g.readDoc('news2');
      g.updateObjective();
      return true;
    }
    case 'ev:hediye': {
      if (!r.koliDown) return true;
      if (h.has(6)) {
        await g.readDoc('dogumgunu');
        return true;
      }
      if (!g.canTakeTape(6)) {
        ui.toast('Hediye kutusunun kilidi sıkı. Şimdilik açılmıyor.', 3);
        return true;
      }
      if (!r.hediyeOpen) {
        const ok = await g.finds.giftKeypad();
        if (!ok) return true;
        await g.scares?.onGiftClose();
        r.hediyeOpen = true;
        h.room.tweens.add(fp.giftLid.rotation, 'x', -1.9, 0.9);
        fp.giftTape.visible = true;
        h.stopLead();
        au.sfx('boxOpen', h.points.gift);
        await sleep(700);
      }
      au.sfx('pickup');
      g.addTape(6);
      ui.toast('Kutunun içinde bir kaset ve bir zarf var.');
      await g.readDoc('dogumgunu');
      g.updateObjective();
      return true;
    }
    case 'ev:kaset8': {
      if (!fp.kaset8.visible || !g.canTakeTape(8)) return true;
      au.sfx('pickup');
      g.addTape(8);
      ui.toast("Salıncağın oturağında bir kaset. Etiketinde 'Ebe Sensin!' yazıyor. Oturak buz gibi.", 6);
      g.updateObjective();
      g.scares?.onTape8Pickup();
      return true;
    }
    default:
      return false;
  }
}

function liftRug(h) {
  const fp = h.fp;
  fp.flapG.visible = true;
  fp.board.visible = true;
  fp.flap.rotation.x = 0;
  h.room.tweens.add(fp.flap.rotation, 'x', FLAP_UP, 1.5);
}

// ===================================================================== ses ipuçları (duruma bağlı)
export function leadFor(h) {
  const g = h.g;
  const r = h.r;
  const s = h.st.stage;
  if (!h.built || g.mode !== 'play' || g.playingTape || g.director.active || g.loadingTape) return null;
  if (s === 3 && r.walk && !h.has(4) && !r.t4Chest) return 'salon';
  if (s === 4 && !r.holCall && !r.kilimLifted && !h.has(5)) return 'ring';
  if (s === 4 && r.holCall && !h.has(5)) return 'rug';
  if (s === 5 && r.koliDown && !r.hediyeOpen && !h.has(6)) return 'gift';
  if (s === 8 && r.fbOpen && !r.montajOpen) return 'montaj';
  return null;
}

export function updateLeads(h, dt) {
  const g = h.g;
  const au = g.audio;
  const id = leadFor(h);
  if (id !== h.lead) {
    h.stopLead();
    h.lead = id;
    h.leadT = 0;
    h.leadN = 0;
    h.leadNext = id === 'ring' ? 1.5 : 0.4;
    if (id === 'salon') h.leadStop = au.sfx('staticAt', h.points.salonTv, 900, 0.12);
    if (id === 'montaj') h.ambience.setDeckLead(true);
  }
  if (!id) return;
  h.leadT += dt;
  const t = h.leadT;
  const w = g.walk;
  if (id === 'salon') {
    if (!g.scares?.tv.on && g.clock - (h._titleT || 0) > 0.5) {
      h._titleT = g.clock;
      h.drawSalon('title', g.clock);
    }
    if (t >= h.leadNext) {
      h.leadNext = t + 14;
      h.leadBox = au.sfx('musicBox', h.points.salonTv, 0.8, 2);
    }
  } else if (id === 'ring') {
    if (h.ringing && (t >= h.ringEnd || g.panelOpen())) h.stopRing();
    if (!h.ringing && t >= h.leadNext && !g.panelOpen()) {
      h.ringing = true;
      h.ringEnd = t + 24;
      h.leadN++;
      h.ringStopFn = au.sfx('phoneRing', h.points.hallPhone, 8, 1.4);
      if (h.leadN % 3 === 0 && (!w?.standing || w.zone === 'cati') && h.leadN > 1) g.ui.toast('Telefon hâlâ çalıyor. Aşağıda, girişte.', 5);
      // telefonun yanında bekleyen için çalmaya devam eder, uzaktakine 25 sn sessizlik
      h.leadNext = t + 24;
    }
    if (h.ringing && t >= h.ringEnd - 0.1) {
      const near = w?.standing && w.zone === 'giris' && Math.hypot(w.pos.x - h.points.hallPhone.x, w.pos.z - h.points.hallPhone.z) < 2;
      h.leadNext = near ? t : t + 25;
    }
  } else if (id === 'rug') {
    if (t >= h.leadNext) {
      h.leadNext = t + 30;
      au.sfx('clothSlide', h.points.rugCorner, 1.2, 0.3);
    }
  } else if (id === 'gift') {
    if (t >= h.leadNext) {
      h.leadNext = t + 20;
      h.leadBox = au.sfx('musicBox', h.points.gift, 0.5, 1, 0.5);
    }
  }
}

export function stopLead(h) {
  const L = h.lead;
  h.stopRing();
  try {
    h.leadStop?.();
    h.leadBox?.();
  } catch {
    /* bitti */
  }
  h.leadStop = h.leadBox = null;
  if (L === 'salon' && h.built && !h.g.scares?.tv.on) h.drawSalon('off');
  if (L === 'montaj') h.ambience.setDeckLead(false);
  h.lead = null;
}

// ===================================================================== test kancası
/**
 * debugFind(n): n. kaseti (4..9), o aşamanın gerçek kod yollarıyla, yürümeden bulur.
 * Kilit, tuş takımı ve okuyucu ekranlarını kendisi doldurur / kapatır. Dönüş: { ok, tapes, room }
 */
export async function debugFind(h, n) {
  const g = h.g;
  const r = h.r;
  const ui = g.ui;
  h.ensureBuilt();
  let stop = false;
  // ekran sürücüsü: okuyucuyu kapatır, şifreleri girer
  const codes = { 4: { word: 'SOBE' }, 5: { keypad: '3642727' }, 6: { keypad: '0302' }, 9: { word: 'EBE' } }[n] || {};
  const driver = (async () => {
    while (!stop) {
      await sleep(120);
      if (g.overlay === 'reader') ui.closeReader?.();
      else if (g.overlay === 'keypad' && ui.keypadKey && codes.keypad) {
        for (const k of codes.keypad) ui.keypadKey(k);
        await sleep(1200);
      } else if (g.overlay === 'wordlock' && ui.wordlockKey && codes.word) {
        const inp = document.getElementById('wordlock-input');
        inp.value = codes.word;
        ui.wordlockKey('Enter');
        await sleep(1000);
      }
    }
  })();
  const waitFor = async (fn, ms = 20000) => {
    const t0 = performance.now();
    while (!fn() && performance.now() - t0 < ms) await sleep(100);
    return fn();
  };
  try {
    if (n === 4) {
      if (!r.chestOpen) await g.interact('chest');
      if (!r.key) await g.interact('chest');
      if (r.t4Chest) await g.interact('chest');
      if (!r.walk) await g.interact('door');
      await sleep(300);
      if (!h.has(4)) await g.interact('ev:kaset4');
    } else if (n === 5) {
      if (r.kilimLifted) {
        await g.interact('floorboard');
      } else {
        if (!r.holCall) await g.interact('ev:telefon');
        await waitFor(() => r.holCall);
        await sleep(300);
        await g.interact('ev:tahta');
      }
    } else if (n === 6) {
      if (r.boxToppled) await g.interact('giftbox');
      else {
        await waitFor(() => r.koliDown);
        await g.interact('ev:hediye');
      }
    } else if (n === 7) {
      await g.interact('chairleg');
    } else if (n === 8) {
      await waitFor(() => r.hotcold);
      await g.interact('ev:kaset8');
    } else if (n === 9) {
      if (!r.fbOpen) await g.interact('chest');
      await sleep(300);
      if (!r.montajOpen) await g.interact('ev:kapi:montaj');
      await sleep(1800);
      await h.debugRun9();
    }
  } finally {
    stop = true;
    await driver;
  }
  await sleep(200);
  g.scares?.cancelAll();
  return { ok: h.has(n), tapes: g.state.tapes.slice(), room: { ...r } };
}

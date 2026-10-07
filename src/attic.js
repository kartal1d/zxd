// 3-10. kasetlerin bulunduğu yerler: oyuncak sandığı, telefon, kilim köşesi ve döşeme tahtası,
// hediye kutusu, sandalye ayağındaki kaset, pencere mandalı, ampul zinciri, kapının altından gelen kaset.
import * as THREE from 'three';
import * as TX from './textures.js';
import { rand } from './util.js';

function labelTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// çarşaflı sandığın kayınca durduğu yer: oyuncunun sağında, hediye kutusunu kapatmayacak açıda
const MOVED = { pos: [1.45, 0, 0.1], rot: -1.27 };
const FB_UP = -1.62;
const FB_AJAR = -0.14;
const GIFT = { pos: [1.6, 0, 1.45], rot: -0.9 };
const FLAP_UP = 2.9; // kilim köşesi katlanıp geriye yatar
const BOARD_UP = 1.95; // tahta duvar tarafına devrilir
const HEAP = { pos: [0.78, 0.08, 0.05], rot: 0.5, sy: 0.16 };

export class Attic {
  constructor(room) {
    this.r = room;
    this.scene = room.scene;
    this.m = room.mats;
    this.buildSheetAndChest();
    this.buildPhone();
    this.buildFloor();
    this.buildGift();
    this.buildChairTape();
    this.buildWindowTape();
    this.buildChain();
    this.buildDoorTape();
  }

  // ------------------------------------------------------------------ çarşaf + oyuncak sandığı
  buildSheetAndChest() {
    const r = this.r;
    const g = (this.sheetGroup = new THREE.Group());
    g.position.set(2.25, 0, 0.9);
    g.rotation.y = -0.4;
    this.scene.add(g);
    // sandık (çarşafın altında)
    const chest = (this.chest = new THREE.Group());
    g.add(chest);
    const blue = new THREE.MeshStandardMaterial({ color: 0x3a6fd6, roughness: 0.6 });
    // içi boş sandık: dört duvar ve dip (içindekiler oturduğun yerden görünsün)
    for (const [w, h, d, x, y, z] of [[0.8, 0.42, 0.03, 0, 0.21, 0.235], [0.8, 0.42, 0.03, 0, 0.21, -0.235], [0.03, 0.42, 0.5, -0.385, 0.21, 0], [0.03, 0.42, 0.5, 0.385, 0.21, 0], [0.8, 0.03, 0.5, 0, 0.015, 0]]) r.box(w, h, d, blue, x, y, z, chest);
    const dark = new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 1 });
    r.box(0.74, 0.02, 0.44, dark, 0, 0.17, 0, chest); // gizli bölmenin tabanı
    const starTex = labelTex(256, 128, (x, w, h) => {
      x.fillStyle = '#3a6fd6';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffd23f';
      x.strokeStyle = '#2a1712';
      x.lineWidth = 5;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 ? 22 : 50;
        x.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr);
      }
      x.closePath();
      x.fill();
      x.stroke();
    });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshStandardMaterial({ map: starTex, roughness: 0.6 }));
    front.position.set(0, 0.21, 0.251);
    chest.add(front);
    this.chestLid = new THREE.Group();
    this.chestLid.position.set(0, 0.42, -0.25);
    chest.add(this.chestLid);
    r.box(0.84, 0.05, 0.54, new THREE.MeshStandardMaterial({ color: 0x2c57b0, roughness: 0.6 }), 0, 0.025, 0.25, this.chestLid);
    // sahte dip: sandığı dolu gösteren tahta. Kaldırılınca alt yüzü sana döner:
    // altına bantlanmış 9. kaset ve Nermin'in notu oradadır.
    this.falseBottom = new THREE.Group();
    this.falseBottom.position.set(0, 0.36, -0.21);
    chest.add(this.falseBottom);
    r.box(0.74, 0.02, 0.42, this.m.furniture, 0, 0, 0.21, this.falseBottom);
    this.chestTape4 = r.makeTape('4');
    this.chestTape4.position.set(-0.1, 0.375, 0.04);
    this.chestTape4.rotation.y = 0.25;
    chest.add(this.chestTape4);
    const fur = new THREE.MeshStandardMaterial({ color: 0xe0802c, roughness: 1 });
    this.chestTail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI * 1.1), fur);
    this.chestTail.rotation.x = -Math.PI / 2;
    this.chestTail.position.set(0.17, 0.39, 0.06);
    chest.add(this.chestTail);
    const noteTex = labelTex(256, 96, (x, w, h) => {
      x.fillStyle = '#e8dcb0';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#2b241b';
      x.font = '22px "Caveat", cursive';
      x.fillText('Montaj odasının anahtarı burada.', 12, 34);
      x.fillText('Kilidi, onun adını öğrenen açsın. — N.', 12, 70);
    });
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9 }));
    note.rotation.x = Math.PI / 2;
    note.position.set(0.15, -0.012, 0.13);
    this.falseBottom.add(note);
    // SOBE ile açılan ana bölmede: "ALT KAT" anahtarı, kâğıt etiketi ve küçük bir el feneri (docs/ev-akisi.md §2.1)
    this.chestKey = this.makeKey('ALT KAT', true);
    this.chestKey.position.set(-0.1, 0.375, 0.04);
    this.chestKey.rotation.y = 0.25;
    chest.add(this.chestKey);
    // sahte dibin altına bantlı: "MONTAJ" anahtarı (9. kaset yolu)
    this.fbKey = this.makeKey('MONTAJ', false);
    this.fbKey.position.set(-0.12, -0.014, 0.26);
    this.fbKey.rotation.x = Math.PI;
    this.falseBottom.add(this.fbKey);
    const tapeStrip = new THREE.MeshStandardMaterial({ color: 0xd8d0b0, roughness: 0.5, transparent: true, opacity: 0.7 });
    for (const [x, z, ry] of [[-0.06, 0.26, 0.2], [0.02, 0.33, -0.3]]) {
      const strip = r.box(0.03, 0.002, 0.13, tapeStrip, x, -0.038, z, this.falseBottom);
      strip.rotation.y = ry;
    }
    r.tag(chest, 'chest');
    // çarşaf
    const sheetGeo = new THREE.BoxGeometry(0.9, 1.0, 0.6, 12, 12, 8);
    const p = sheetGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = (0.5 - y) * 0.12;
      p.setX(i, p.getX(i) * (1 + k + rand(-0.015, 0.015)));
      p.setZ(i, p.getZ(i) * (1 + k + rand(-0.015, 0.015)));
      if (y > 0.45) p.setY(i, y - Math.abs(p.getX(i)) * 0.06);
    }
    sheetGeo.computeVertexNormals();
    this.sheet = new THREE.Mesh(sheetGeo, this.m.cloth);
    this.sheet.position.set(0, 0.5, 0);
    this.sheet.castShadow = this.sheet.receiveShadow = true;
    g.add(this.sheet);
    r.tag(this.sheet, 'sheet');
  }

  /** Pirinç anahtar + kâğıt etiket (+ isteğe bağlı küçük el feneri) */
  makeKey(label, withTorch) {
    const k = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a38, roughness: 0.35, metalness: 0.8 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 8), brass);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.035, 0, 0);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16), brass);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(-0.016, 0, 0);
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.003, 0.016), brass);
    bit.position.set(0.064, 0, 0.008);
    const tagTex = labelTex(128, 64, (x) => {
      x.fillStyle = '#e4d6a4';
      x.fillRect(0, 0, 128, 64);
      x.fillStyle = '#2b241b';
      x.font = `700 ${label.length > 7 ? 26 : 30}px "Caveat", cursive`;
      x.fillText(label, 10, 42);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.9, side: THREE.DoubleSide }));
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(0.0, -0.004, 0.032);
    k.add(shaft, bow, bit, tag);
    if (withTorch) {
      const torch = new THREE.Group();
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.4 }));
      tb.rotation.z = Math.PI / 2;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, emissive: 0x405070, roughness: 0.2 }));
      lens.rotation.y = Math.PI / 2;
      lens.position.set(0.0705, 0, 0);
      torch.add(tb, lens);
      torch.position.set(0.12, 0.018, 0.07);
      torch.rotation.y = 0.4;
      k.add(torch);
    }
    return k;
  }

  // ------------------------------------------------------------------ telefon
  buildPhone() {
    const r = this.r;
    const ph = (this.phone = new THREE.Group());
    ph.position.set(-2.45, 0.4, 1.9);
    ph.rotation.y = 2.4;
    this.scene.add(ph);
    const bak = new THREE.MeshStandardMaterial({ color: 0xcfc2a0, roughness: 0.35, metalness: 0.05 });
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bak);
    base.scale.set(1, 0.7, 1.15);
    base.castShadow = true;
    ph.add(base);
    const dialTex = labelTex(256, 256, (x, w) => {
      x.fillStyle = '#e9e4d6';
      x.beginPath();
      x.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#111';
      x.font = 'bold 22px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 3 + (i / 10) * Math.PI * 1.6;
        x.fillText(String((i + 1) % 10), w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96);
      }
      x.fillStyle = '#fffaf0';
      x.beginPath();
      x.arc(w / 2, w / 2, 52, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#7a1010';
      x.font = 'bold 26px "Special Elite", monospace';
      x.fillText('364', w / 2, w / 2 - 14);
      x.fillText('51 80', w / 2, w / 2 + 16);
    });
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.01, 32), [bak, new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5 }), bak]);
    dial.position.set(0, 0.07, 0.07);
    dial.rotation.x = 0.55;
    ph.add(dial);
    this.handset = new THREE.Group();
    this.handset.position.set(0, 0.105, -0.01);
    ph.add(this.handset);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 12), bak);
    hb.rotation.z = Math.PI / 2;
    this.handset.add(hb);
    for (const sx of [-0.1, 0.1]) {
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), bak);
      cup.position.set(sx, -0.012, 0);
      this.handset.add(cup);
    }
    // takılı olmayan kablo
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.08, 0.02, -0.08), new THREE.Vector3(0.2, -0.02, -0.1), new THREE.Vector3(0.28, -0.38, 0.05), new THREE.Vector3(0.45, -0.39, 0.25)]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.006, 6), bak);
    ph.add(cord);
    r.tag(ph, 'phone');
  }

  // ------------------------------------------------------------------ kilim köşesi + döşeme tahtası
  buildFloor() {
    const r = this.r;
    // kilimin arka-sol köşesi (-0.8, 0.85). Köşe, köşegen boyunca katlanıp kalkar.
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.424, 0, 0, 0.424, 0, 0, 0, 0, -0.424], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    tri.computeVertexNormals();
    this.kilimFlap = new THREE.Group();
    this.kilimFlap.position.set(-0.5, 0.009, 0.55);
    this.kilimFlap.rotation.y = (3 * Math.PI) / 4;
    this.scene.add(this.kilimFlap);
    const flap = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: 0x6a2420, roughness: 1, side: THREE.DoubleSide }));
    this.kilimFlap.add(flap);
    this.kilimFlap.visible = false;
    // köşe kalkınca altında kalan çıplak döşeme
    const bare = new THREE.Mesh(tri.clone(), new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.9 }));
    bare.position.y = -0.002;
    this.kilimFlap.add(bare);
    this.bareFloor = bare;
    // gevşek tahta: kilimin köşesinin altında, duvar tarafı kenarından menteşeli gibi kalkar
    this.board = new THREE.Group();
    this.board.position.set(-0.79, 0.01, 0.42);
    this.scene.add(this.board);
    r.box(0.13, 0.016, 0.4, new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 }), 0.065, 0.008, 0.2, this.board).castShadow = false;
    this.board.visible = false;
    // tahtanın altındaki boşluk
    this.hole = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.4), new THREE.MeshBasicMaterial({ color: 0x050302 }));
    this.hole.rotation.x = -Math.PI / 2;
    this.hole.position.set(-0.725, 0.011, 0.62);
    this.hole.visible = false;
    this.scene.add(this.hole);
    this.boardTape = r.makeTape('5');
    this.boardTape.position.set(-0.725, 0.012, 0.64);
    this.boardTape.rotation.y = Math.PI / 2 + 0.08;
    this.boardTape.scale.set(0.95, 1, 0.95);
    this.boardTape.visible = false;
    this.scene.add(this.boardTape);
    const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 5), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.4, roughness: 0.4 }));
    clip.position.set(-0.72, 0.016, 0.48);
    clip.visible = false;
    this.hairClip = clip;
    this.scene.add(clip);
    r.tag(this.board, 'floorboard');
    r.tag(this.boardTape, 'floorboard');
    r.tag(this.hole, 'floorboard');
  }

  // ------------------------------------------------------------------ devrilen kutu + hediye kutusu
  buildGift() {
    const r = this.r;
    // istifin üstündeki kutu (devrilecek)
    this.stackTop = r.box(0.43, 0.36, 0.36, this.m.cardboard, 2.3, 0.58, 1.92);
    this.stackTop.rotation.y = -0.1;
    const gift = (this.gift = new THREE.Group());
    gift.position.set(...GIFT.pos);
    gift.rotation.y = GIFT.rot;
    this.scene.add(gift);
    const red = new THREE.MeshStandardMaterial({ color: 0xb0202a, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4, metalness: 0.2 });
    r.box(0.28, 0.18, 0.28, red, 0, 0.09, 0, gift);
    this.giftLid = new THREE.Group();
    this.giftLid.position.set(0, 0.18, -0.14);
    gift.add(this.giftLid);
    r.box(0.3, 0.04, 0.3, red, 0, 0.02, 0.14, this.giftLid);
    r.box(0.31, 0.045, 0.05, gold, 0, 0.022, 0.14, this.giftLid);
    r.box(0.05, 0.045, 0.31, gold, 0, 0.022, 0.14, this.giftLid);
    const tagTex = labelTex(256, 128, (x, w, h) => {
      x.fillStyle = '#f6f1e4';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#2b241b';
      x.font = '24px "Caveat", cursive';
      x.fillText("Beste'ye.", 14, 32);
      x.fillText('Sekizinci yaş gününde açılsın.', 14, 66);
      x.fillText('— Nermin Abla', 120, 104);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.8 }));
    tag.position.set(0, 0.1, 0.142);
    gift.add(tag);
    this.giftTape = r.makeTape('6');
    this.giftTape.position.set(0, 0.06, 0);
    gift.add(this.giftTape);
    gift.visible = false;
    r.tag(gift, 'giftbox');
  }

  // ------------------------------------------------------------------ sandalye ayağındaki kaset
  buildChairTape() {
    const r = this.r;
    this.chairTape = r.makeTape('7');
    // oturağın ön kenarının altına bantlanmış, yukarıdan bakınca etiketi seçilir
    this.chairTape.position.set(-0.13, 0.37, 0.45);
    this.chairTape.rotation.set(-0.9, 0.12, 0);
    this.scene.add(this.chairTape);
    // geniş, görünmez tıklama alanı
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.45), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(-0.1, 0.32, 0.45);
    this.chairHit = hit;
    this.scene.add(hit);
    // ayaktayken: oturağın ön kenarına yukarıdan bakılınca da bulunsun (yalnız ayaktayken görünür, finds.update)
    const hit2 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.75, 0.7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit2.position.set(0, 0.375, 0.65);
    hit2.visible = false;
    this.chairHit2 = hit2;
    this.scene.add(hit2);
    r.tag(this.chairTape, 'chairleg');
    r.tag(hit, 'chairleg');
    r.tag(hit2, 'chairleg');
  }

  // ------------------------------------------------------------------ dış pervazdaki kaset (8)
  buildWindowTape() {
    this.windowTape = this.r.makeTape('8');
    this.windowTape.position.set(1.42, 1.13, -2.72);
    this.windowTape.rotation.y = 0.3;
    this.scene.add(this.windowTape);
  }

  // ------------------------------------------------------------------ ampul zinciri
  buildChain() {
    const g = (this.chain = new THREE.Group());
    g.position.set(0.03, -0.66, 0);
    this.r.bulbGroup.add(g);
    const metal = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.4 });
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.32, 5), metal);
    line.position.y = -0.16;
    g.add(line);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), metal);
    bead.position.y = -0.33;
    g.add(bead);
    // tutması kolay görünmez alan
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.y = -0.18;
    g.add(hit);
    g.visible = false;
    this.r.tag(g, 'chain');
  }

  // ------------------------------------------------------------------ kapının altından gelen kaset (10)
  buildDoorTape() {
    this.doorTape = this.r.makeTape('10');
    this.doorTape.position.set(-1.2, 0.002, 2.45);
    this.doorTape.rotation.y = 0.2;
    this.doorTape.visible = false;
    this.scene.add(this.doorTape);
    this.r.tag(this.doorTape, 'doortape');
    // kapı aralığından vuran soğuk ışık: kaset karanlıkta da seçilsin
    this.doorTapeLight = new THREE.PointLight(0x8fa4e0, 0, 1.1, 2);
    this.doorTapeLight.position.set(-1.2, 0.12, 2.42);
    this.scene.add(this.doorTapeLight);
  }

  showDoorTape(on) {
    this.doorTape.visible = on;
    this.doorTapeLight.intensity = on ? 0.45 : 0;
  }

  // ================================================================== durum
  /** Kayıttaki duruma göre her şeyi anında yerleştirir (oyun yüklenirken / aşama değişince). */
  apply(st) {
    const room = st.room || {};
    const has = (n) => (st.tapes || []).includes(n);
    // çarşaf ve sandık
    if (room.furnitureMoved) {
      this.sheetGroup.position.set(...MOVED.pos);
      this.sheetGroup.rotation.y = MOVED.rot;
      this.sheet.position.set(...HEAP.pos);
      this.sheet.rotation.set(0, HEAP.rot, 0);
      this.sheet.scale.set(1, HEAP.sy, 1.05);
    } else {
      this.sheetGroup.position.set(2.25, 0, 0.9);
      this.sheetGroup.rotation.y = -0.4;
      this.sheet.position.set(0, 0.5, 0);
      this.sheet.rotation.set(0, 0, 0);
      this.sheet.scale.set(1, 1, 1);
    }
    this.chestLid.rotation.x = room.chestOpen || room.falseBottom ? -1.7 : 0;
    // yeni akışta 4. kaset salonda; sandıkta yalnız eski kayıtlarda (t4Chest) kalır
    this.chestTape4.visible = !!room.t4Chest && !has(4);
    this.falseBottom.rotation.x = room.fbOpen ? FB_UP : room.falseBottom ? FB_AJAR : 0;
    this.chestTail.position.y = room.fbOpen ? 0.2 : 0.39;
    this.chestKey.visible = !!room.chestOpen && !room.key;
    this.fbKey.visible = !room.fbOpen;
    // telefon: ahize, sesli arama sonrası yerinde
    // kilim ve tahta
    this.kilimFlap.visible = !!room.kilimLifted;
    this.kilimFlap.children[0].rotation.x = room.kilimLifted ? FLAP_UP : 0;
    this.board.visible = !!room.kilimLifted;
    this.board.rotation.z = room.boardOpen ? BOARD_UP : 0;
    this.hole.visible = !!room.boardOpen;
    this.boardTape.visible = !!room.boardOpen && !has(5);
    this.hairClip.visible = !!room.boardOpen;
    // devrilen kutu ve hediye
    if (room.boxToppled) {
      this.stackTop.position.set(2.0, 0.18, 1.55);
      this.stackTop.rotation.set(0.3, 0.6, 1.4);
    } else {
      this.stackTop.position.set(2.3, 0.58, 1.92);
      this.stackTop.rotation.set(0, -0.1, 0);
    }
    this.gift.visible = !!room.boxToppled;
    this.gift.position.set(...GIFT.pos);
    this.giftLid.rotation.x = room.giftOpen ? -1.9 : 0;
    this.giftTape.visible = !!room.giftOpen && !has(6);
    // sandalye ayağı
    const chairLive = st.stage === 6 && !has(7);
    this.chairTape.visible = chairLive;
    this.chairHit.visible = chairLive;
    if (!chairLive) this.chairHit2.visible = false;
    // pencere: 8. kaset artık bahçedeki salıncakta
    this.windowTape.visible = false;
    // zincir ve kapı altı
    this.chain.visible = !!room.chain;
    this.showDoorTape(!!room.ritualDone && !has(10));
  }

  // ------------------------------------------------------------------ canlı olaylar (ilk izlemeden sonra)
  moveFurniture() {
    const t = this.r.tweens;
    t.add(this.sheetGroup.position, 'x', MOVED.pos[0], 2.2);
    t.add(this.sheetGroup.position, 'z', MOVED.pos[2], 2.2);
    t.add(this.sheetGroup.rotation, 'y', MOVED.rot, 2.2);
    // çarşaf sandığın üstünden kayıp yanına yığılır
    setTimeout(() => {
      t.add(this.sheet.position, 'x', HEAP.pos[0], 1.2);
      t.add(this.sheet.position, 'y', HEAP.pos[1], 1.2);
      t.add(this.sheet.position, 'z', HEAP.pos[2], 1.2);
      t.add(this.sheet.rotation, 'y', HEAP.rot, 1.2);
      t.add(this.sheet.scale, 'y', HEAP.sy, 1.2);
      t.add(this.sheet.scale, 'z', 1.05, 1.2);
    }, 2300);
  }

  openChest() {
    this.r.tweens.add(this.chestLid.rotation, 'x', -1.7, 1.2);
  }

  /** 8. kasetten sonra: sahte dip kendiliğinden aralanır (kilitli) */
  raiseFalseBottom() {
    this.chestLid.rotation.x = -1.7;
    this.r.tweens.add(this.falseBottom.rotation, 'x', FB_AJAR, 0.6);
  }

  /** kilit açılınca: sahte dip kalkar, altına bantlanmış kaset sana döner */
  openFalseBottom() {
    this.r.tweens.add(this.falseBottom.rotation, 'x', FB_UP, 1.2);
    this.r.tweens.add(this.chestTail.position, 'y', 0.2, 0.5);
  }

  liftKilim() {
    this.kilimFlap.visible = true;
    this.board.visible = true;
    const flap = this.kilimFlap.children[0];
    flap.rotation.x = 0;
    this.r.tweens.add(flap.rotation, 'x', FLAP_UP, 1.5);
  }

  openBoard() {
    this.hole.visible = true;
    this.r.tweens.add(this.board.rotation, 'z', BOARD_UP, 0.8);
  }

  toppleBox() {
    const t = this.r.tweens;
    this.gift.visible = true;
    // hediye, kutunun arkasından yuvarlanıp yere düşer
    this.gift.position.set(2.3, 0.45, 1.92);
    t.add(this.gift.position, 'x', GIFT.pos[0], 0.7);
    t.add(this.gift.position, 'y', GIFT.pos[1], 0.7);
    t.add(this.gift.position, 'z', GIFT.pos[2], 0.7);
    t.add(this.stackTop.position, 'x', 2.0, 0.6);
    t.add(this.stackTop.position, 'y', 0.18, 0.6);
    t.add(this.stackTop.position, 'z', 1.55, 0.6);
    t.add(this.stackTop.rotation, 'x', 0.3, 0.6);
    t.add(this.stackTop.rotation, 'y', 0.6, 0.6);
    t.add(this.stackTop.rotation, 'z', 1.4, 0.6);
  }

  openGift() {
    this.r.tweens.add(this.giftLid.rotation, 'x', -1.9, 0.9);
  }
}

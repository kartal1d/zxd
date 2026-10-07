// Halanın evinin tavan arası: 3D sahne, ışıklar, etkileşimli nesneler, kamera.
import * as THREE from 'three';
import * as TX from './textures.js';
import { clamp, lerp, smooth, rand, Tweens } from './util.js';
import { Attic } from './attic.js';

/** Kaset etiketlerinde yazan adlar (7. kaset bilerek 1. kasetin kopyası gibi görünür) */
export const TAPE_LABELS = { 1: 'Tanışalım', 2: 'Kuyruk', 3: 'Tonton Döndü', 4: 'Kaybolursan', 5: "Sen Beste'sin", 6: 'İyi ki Doğdun', 7: 'Tanışalım', 8: 'Ebe Sensin', 9: 'HAM KAYIT', 10: 'SON' };

const SEAT = new THREE.Vector3(0, 1.12, 0.55);
const SCREEN_CENTER = new THREE.Vector3(-0.06, 0.835, -1.528);
const FOCUS = new THREE.Vector3(-0.06, 0.86, -0.98);
const SCREEN_W = 0.5;
const SCREEN_H = 0.375;

export class Room {
  constructor(game) {
    this.g = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010102);
    this.scene.fog = new THREE.FogExp2(0x040405, 0.045);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.02, 40);
    this.camera.position.copy(SEAT);
    this.yaw = 0;
    this.pitch = -0.06;
    this.focus = 0;
    this.focusTarget = 0;
    this.locked = false;
    this.tweens = new Tweens();
    this.interactables = [];
    this.points = {};
    this.clock = 0;
    this.bulbBase = 1;
    this.bulbLevel = 1;
    this.flicker = false;
    this.burst = 0;
    this.raycaster = new THREE.Raycaster();
    this.reach = 3.6; // oturarak 3.6 m, ayakta 2.0 m (walk.js)
    this.raycaster.far = this.reach;
    this.walkCam = null; // ayaktayken kamera konumu (walk.js); boşsa SEAT/FOCUS
    this.bulbZone = 1; // alt katta ampul tavan arasındaki ışığı vermez (house.js)
    this.standing = false;
    this.screenPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -SCREEN_CENTER.z);
    this.build();
  }

  // ======================================================================= kurulum
  build() {
    const S = this.scene;
    const mats = (this.mats = {});

    const floorTex = TX.woodPlanks({ planks: 10, base: [104, 70, 44], seed: 3, worn: 0.25 });
    floorTex.map.repeat.set(2, 2);
    floorTex.bump.repeat.set(2, 2);
    mats.floor = new THREE.MeshStandardMaterial({ map: floorTex.map, bumpMap: floorTex.bump, bumpScale: 0.6, roughness: 0.82 });
    const roofTex = TX.woodPlanks({ w: 512, h: 512, planks: 7, base: [92, 64, 42], seed: 9, worn: 0.1 });
    roofTex.map.repeat.set(3, 1);
    roofTex.bump.repeat.set(3, 1);
    mats.roof = new THREE.MeshStandardMaterial({ map: roofTex.map, bumpMap: roofTex.bump, bumpScale: 0.5, roughness: 0.9, side: THREE.DoubleSide });
    const wp = TX.wallpaper();
    wp.repeat.set(3, 1.2);
    mats.wall = new THREE.MeshStandardMaterial({ map: wp, roughness: 0.95, side: THREE.DoubleSide });
    const beamTex = TX.woodPlanks({ w: 256, h: 256, planks: 1, base: [80, 52, 32], seed: 5, gaps: false });
    mats.beam = new THREE.MeshStandardMaterial({ map: beamTex.map, bumpMap: beamTex.bump, bumpScale: 0.8, roughness: 0.85 });
    const furnTex = TX.woodPlanks({ w: 256, h: 256, planks: 2, base: [70, 40, 24], seed: 11, gaps: false });
    mats.furniture = new THREE.MeshStandardMaterial({ map: furnTex.map, bumpMap: furnTex.bump, bumpScale: 0.3, roughness: 0.55 });
    const noise = TX.noiseTex();
    mats.plastic = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.55, bumpMap: noise, bumpScale: 0.05 });
    mats.plasticGrey = new THREE.MeshStandardMaterial({ color: 0x3b3b3e, roughness: 0.5 });
    mats.black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.7 });
    mats.metal = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.35 });
    mats.brass = new THREE.MeshStandardMaterial({ color: 0xb08a3c, metalness: 1, roughness: 0.35 });
    mats.cardboard = new THREE.MeshStandardMaterial({ map: TX.cardboard(), roughness: 0.95 });
    mats.cloth = new THREE.MeshStandardMaterial({ color: 0xbdb6a6, roughness: 1, bumpMap: noise, bumpScale: 0.4 });

    this.buildShell();
    this.buildTV();
    this.buildFurniture();
    this.buildLights();
    this.buildDust();
    this.attic = new Attic(this);
  }

  quad(p, mat, uvw = 1, uvh = 1) {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, uvw, 0, uvw, uvh, 0, 0, uvw, uvh, 0, uvh]), 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    m.castShadow = true;
    this.scene.add(m);
    return m;
  }

  box(w, h, d, mat, x, y, z, parent = this.scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  buildShell() {
    const { mats } = this;
    const Z0 = -2.6, Z1 = 2.6;
    // zemin
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.2), mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // diz duvarları
    this.quad([[-3, 0, Z1], [-3, 0, Z0], [-3, 1.2, Z0], [-3, 1.2, Z1]], mats.wall, 4, 1);
    this.quad([[3, 0, Z0], [3, 0, Z1], [3, 1.2, Z1], [3, 1.2, Z0]], mats.wall, 4, 1);
    // çatı eğimleri
    this.roofs = [
      this.quad([[-3, 1.2, Z1], [-3, 1.2, Z0], [0, 3, Z0], [0, 3, Z1]], mats.roof),
      this.quad([[0, 3, Z1], [0, 3, Z0], [3, 1.2, Z0], [3, 1.2, Z1]], mats.roof),
    ];

    // alın duvarları (beşgen) — ön duvarda pencere, arka duvarda kapı boşluğu
    const gable = (holes) => {
      const s = new THREE.Shape();
      s.moveTo(-3, 0);
      s.lineTo(3, 0);
      s.lineTo(3, 1.2);
      s.lineTo(0, 3);
      s.lineTo(-3, 1.2);
      s.closePath();
      for (const [x, y, w, h] of holes) {
        const p = new THREE.Path();
        p.moveTo(x - w / 2, y - h / 2);
        p.lineTo(x + w / 2, y - h / 2);
        p.lineTo(x + w / 2, y + h / 2);
        p.lineTo(x - w / 2, y + h / 2);
        p.closePath();
        s.holes.push(p);
      }
      const g = new THREE.ShapeGeometry(s);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2.5);
      const m = new THREE.Mesh(g, mats.wall);
      m.receiveShadow = true;
      m.castShadow = true;
      return m;
    };
    const front = gable([[1.4, 1.55, 0.7, 0.8]]);
    front.position.z = Z0;
    this.scene.add(front);
    this.frontGable = front;
    const back = gable([[1.2, 0.99, 0.88, 1.98]]); // arkadan bakınca x ters döner: kapı x=-1.2
    back.rotation.y = Math.PI;
    back.position.z = Z1;
    this.scene.add(back);

    // kirişler
    for (let z = -2.4; z <= 2.41; z += 0.8) {
      for (const side of [-1, 1]) {
        const b = this.box(0.08, 0.14, 3.55, mats.beam, side * 1.5, 2.1 - 0.06, z);
        b.rotation.order = 'YXZ';
        b.rotation.y = Math.PI / 2;
        b.rotation.x = side * Math.atan2(1.8, 3);
        b.position.set(side * 1.5, 2.06, z);
      }
    }
    this.box(0.12, 0.16, 5.2, mats.beam, 0, 2.92, 0);
    for (const z of [-1.6, 0.8]) this.box(2.2, 0.1, 0.1, mats.beam, 0, 2.28, z);
    // süpürgelik
    this.box(0.04, 0.1, 5.2, mats.beam, -2.98, 0.05, 0);
    this.box(0.04, 0.1, 5.2, mats.beam, 2.98, 0.05, 0);

    // ---- pencere
    const win = new THREE.Group();
    win.position.set(1.4, 1.55, Z0);
    this.scene.add(win);
    for (const [w, h, x, y] of [[0.78, 0.06, 0, 0.42], [0.78, 0.08, 0, -0.42], [0.06, 0.84, -0.37, 0], [0.06, 0.84, 0.37, 0], [0.03, 0.8, 0, 0], [0.7, 0.03, 0, 0]])
      this.box(w, h, 0.08, mats.beam, x, y, 0, win);
    this.skyNight = TX.skyTexture('night');
    this.skyDawn = TX.skyTexture('dawn');
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: this.skyNight, fog: false }));
    this.sky.position.set(0, 0, -0.9);
    win.add(this.sky);
    this.glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x223040, transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.2 }),
    );
    this.glass.position.z = 0.01;
    win.add(this.glass);
    this.prints = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8), new THREE.MeshBasicMaterial({ map: TX.handprints(), transparent: true, depthWrite: false }));
    this.prints.position.z = 0.015;
    this.prints.visible = false;
    win.add(this.prints);
    this.tag(this.glass, 'window');
    this.points.window = new THREE.Vector3(1.4, 1.55, Z0);

    // ---- kapı
    const doorTex = TX.woodPlanks({ w: 256, h: 512, planks: 4, base: [96, 62, 38], seed: 21 });
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTex.map, bumpMap: doorTex.bump, bumpScale: 0.5, roughness: 0.75 });
    this.doorPivot = new THREE.Group();
    // menteşe sağ kenarda (odadan bakınca): kapı içeri açılınca koridor görünür
    this.doorPivot.position.set(-1.63, 0, Z1 - 0.02);
    this.scene.add(this.doorPivot);
    const door = this.box(0.86, 1.96, 0.05, doorMat, 0.43, 0.98, 0, this.doorPivot);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), mats.brass);
    knob.position.set(0.78, 0.98, -0.05);
    this.doorPivot.add(knob);
    this.tag(door, 'door');
    // kasa
    for (const [w, h, x, y] of [[0.06, 2.02, -1.67, 1.01], [0.06, 2.02, -0.73, 1.01], [1.0, 0.06, -1.2, 2.0]]) this.box(w, h, 0.12, mats.beam, x, y, Z1);
    this.points.door = new THREE.Vector3(-1.2, 1.1, Z1);
    // koridor (kapının arkası)
    const corr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 2.4), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 1, side: THREE.BackSide }));
    corr.position.set(-1.2, 1.0, Z1 + 1.22);
    this.scene.add(corr);
    this.corridor = corr;
    this.corridorLight = new THREE.PointLight(0xffc38a, 0, 7, 1.6);
    this.corridorLight.position.set(-1.2, 1.6, Z1 + 1.8);
    this.scene.add(this.corridorLight);
    this.girl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshBasicMaterial({ map: TX.girlSilhouette(), transparent: true, fog: false }));
    this.girl.position.set(-1.2, 0.6, Z1 + 1.1);
    this.girl.rotation.y = Math.PI;
    this.girl.visible = false;
    this.scene.add(this.girl);
    // kapının altından sızan ışık
    this.gap = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.018), new THREE.MeshBasicMaterial({ color: 0x9fb0e0, transparent: true, opacity: 0, fog: false }));
    this.gap.position.set(-1.2, 0.01, Z1 - 0.05);
    this.gap.rotation.y = Math.PI;
    this.scene.add(this.gap);
    this.gapLevel = 0;
    // kapının önüne yere vuran soğuk ışık
    this.spill = new THREE.PointLight(0x8fa4e0, 0, 3.2, 1.5);
    this.spill.position.set(-1.2, 0.25, Z1 - 0.35);
    this.scene.add(this.spill);

    // kilim
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshStandardMaterial({ map: TX.kilim(), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = 0.04;
    rug.position.set(0, 0.004, -0.35);
    rug.receiveShadow = true;
    this.scene.add(rug);
  }

  buildTV() {
    const { mats } = this;
    // dolap
    const cab = new THREE.Group();
    cab.position.set(0, 0, -1.78);
    this.scene.add(cab);
    this.box(1.1, 0.04, 0.5, mats.furniture, 0, 0.56, 0, cab);
    this.box(1.1, 0.04, 0.5, mats.furniture, 0, 0.06, 0, cab);
    this.box(0.04, 0.54, 0.5, mats.furniture, -0.53, 0.31, 0, cab);
    this.box(0.04, 0.54, 0.5, mats.furniture, 0.53, 0.31, 0, cab);
    this.box(1.1, 0.54, 0.02, mats.furniture, 0, 0.31, -0.24, cab);
    this.box(1.02, 0.03, 0.46, mats.furniture, 0, 0.28, 0, cab);
    for (const x of [-0.5, 0.5]) this.box(0.05, 0.05, 0.05, mats.black, x, 0.025, 0.2, cab);
    // alt rafta eski kasetler
    for (let i = 0; i < 7; i++) {
      const t = this.box(0.025, 0.19, 0.105, i % 3 ? mats.black : mats.plasticGrey, -0.42 + i * 0.033, 0.18, 0.1, cab);
      t.rotation.z = i === 6 ? 0.3 : 0;
    }

    // TV
    const tv = (this.tvGroup = new THREE.Group());
    tv.position.set(0, 0.58, -1.79);
    this.scene.add(tv);
    const body = this.box(0.68, 0.52, 0.46, mats.plastic, 0, 0.26, 0, tv);
    this.box(0.5, 0.42, 0.2, mats.plastic, 0, 0.25, -0.3, tv); // arka tüp
    const bezel = this.box(0.58, 0.45, 0.02, mats.black, -0.06, 0.255, 0.236, tv);
    bezel.castShadow = false;
    // kavisli ekran
    const sg = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 24, 18);
    const pos = sg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (SCREEN_W / 2), y = pos.getY(i) / (SCREEN_H / 2);
      pos.setZ(i, 0.012 * (1 - x * x) * (1 - y * y));
    }
    sg.computeVertexNormals();
    this.screen = new THREE.Mesh(sg, this.g.tv.material);
    this.screen.position.set(-0.06, 0.255, 0.248);
    tv.add(this.screen);
    this.tag(this.screen, 'tv');
    this.tag(body, 'tv');
    // düğmeler, hoparlör
    for (let i = 0; i < 2; i++) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 20), mats.plasticGrey);
      k.rotation.x = Math.PI / 2;
      k.position.set(0.27, 0.38 - i * 0.07, 0.24);
      tv.add(k);
    }
    for (let i = 0; i < 6; i++) this.box(0.06, 0.006, 0.005, mats.black, 0.27, 0.2 - i * 0.018, 0.232, tv);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    led.position.set(0.27, 0.07, 0.24);
    tv.add(led);
    // anten
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 8), mats.metal);
      a.position.set(s * 0.12, 0.72, -0.05);
      a.rotation.z = -s * 0.5;
      tv.add(a);
    }
    this.box(0.12, 0.04, 0.08, mats.plastic, 0, 0.54, -0.05, tv);

    // VCR
    const vcr = (this.vcrGroup = new THREE.Group());
    vcr.position.set(0, 0.3, -1.68);
    this.scene.add(vcr);
    const vb = this.box(0.43, 0.085, 0.3, mats.plastic, 0, 0.043, 0, vcr);
    this.box(0.2, 0.03, 0.005, mats.black, -0.07, 0.05, 0.151, vcr);
    this.vcrCanvas = document.createElement('canvas');
    this.vcrCanvas.width = 128;
    this.vcrCanvas.height = 32;
    this.vcrTex = new THREE.CanvasTexture(this.vcrCanvas);
    this.vcrTex.colorSpace = THREE.SRGBColorSpace;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.022), new THREE.MeshBasicMaterial({ map: this.vcrTex }));
    disp.position.set(0.12, 0.05, 0.152);
    vcr.add(disp);
    for (let i = 0; i < 4; i++) this.box(0.014, 0.008, 0.006, mats.plasticGrey, 0.09 + i * 0.022, 0.022, 0.152, vcr);
    this.tag(vb, 'vcr');
    this.points.vcr = new THREE.Vector3(0, 0.34, -1.53);

    // izlenen kasetler dolabın üstünde, televizyonun sağında üst üste durur
    this.stack = new THREE.Group();
    this.stack.position.set(0.44, 0.58, -1.64);
    this.scene.add(this.stack);
    this.stackTapes = {};
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const t = this.makeTape(String(n));
      t.rotation.y = -0.25 + n * 0.12;
      t.visible = false;
      this.stack.add(t);
      this.stackTapes[n] = t;
    }
    this.tag(this.stack, 'tapestack');
    this.points.tv = SCREEN_CENTER.clone();
    this.vcrText = '12:00';
    this.drawVcr();
  }

  buildFurniture() {
    const { mats } = this;
    // kaset kutusu
    const cb = (this.cardboardBox = new THREE.Group());
    cb.position.set(-0.98, 0, -1.18);
    cb.rotation.y = 0.25;
    this.scene.add(cb);
    const cm = mats.cardboard;
    this.box(0.5, 0.01, 0.38, cm, 0, 0.005, 0, cb);
    this.box(0.5, 0.32, 0.01, cm, 0, 0.16, 0.19, cb);
    this.box(0.5, 0.32, 0.01, cm, 0, 0.16, -0.19, cb);
    this.box(0.01, 0.32, 0.38, cm, -0.25, 0.16, 0, cb);
    this.box(0.01, 0.32, 0.38, cm, 0.25, 0.16, 0, cb);
    const f1 = this.box(0.5, 0.01, 0.18, cm, 0, 0.36, 0.27, cb);
    f1.rotation.x = 0.9;
    const f2 = this.box(0.5, 0.01, 0.18, cm, 0, 0.36, -0.27, cb);
    f2.rotation.x = -0.7;
    for (let i = 0; i < 6; i++) {
      const t = this.box(0.19, 0.03, 0.105, mats.black, -0.12 + (i % 2) * 0.22, 0.04 + Math.floor(i / 2) * 0.031, -0.05, cb);
      t.rotation.y = rand(-0.2, 0.2);
    }
    this.tape1 = this.makeTape('1');
    this.tape1.position.set(0.02, 0.15, 0.03);
    this.tape1.rotation.set(0.05, 0.3, 0.02);
    cb.add(this.tape1);
    this.tag(cb, 'tapebox');
    this.points.box = new THREE.Vector3(-0.98, 0.2, -1.18);

    // yan sehpa
    const tbl = new THREE.Group();
    tbl.position.set(1.08, 0, -1.2);
    this.scene.add(tbl);
    this.box(0.6, 0.035, 0.45, mats.furniture, 0, 0.62, 0, tbl);
    for (const [x, z] of [[-0.26, -0.18], [0.26, -0.18], [-0.26, 0.18], [0.26, 0.18]]) this.box(0.035, 0.62, 0.035, mats.furniture, x, 0.31, z, tbl);
    // mektup
    const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.225), new THREE.MeshStandardMaterial({ map: TX.letterPaper(), roughness: 0.9 }));
    letter.rotation.x = -Math.PI / 2;
    letter.rotation.z = 0.35;
    letter.position.set(-0.12, 0.64, 0.06);
    letter.receiveShadow = true;
    tbl.add(letter);
    this.tag(letter, 'letter');
    // kitap yığını
    for (let i = 0; i < 3; i++) {
      const b = this.box(0.16, 0.035, 0.23, new THREE.MeshStandardMaterial({ color: [0x5a2020, 0x203a5a, 0x3a4a22][i], roughness: 0.8 }), 0.2, 0.655 + i * 0.036, 0.1, tbl);
      b.rotation.y = i * 0.2;
    }
    // kilitli metal kutu
    const mb = (this.metalBox = new THREE.Group());
    mb.position.set(0.12, 0.638, -0.08);
    mb.rotation.y = -0.4;
    tbl.add(mb);
    const green = new THREE.MeshStandardMaterial({ color: 0x2c3a2d, metalness: 0.6, roughness: 0.45, bumpMap: TX.noiseTex(128, 0.2, 8), bumpScale: 0.3 });
    const mbBody = this.box(0.3, 0.13, 0.2, green, 0, 0.065, 0, mb);
    this.lidPivot = new THREE.Group();
    this.lidPivot.position.set(0, 0.13, -0.1);
    mb.add(this.lidPivot);
    const lid = this.box(0.31, 0.03, 0.21, green, 0, 0.015, 0.1, this.lidPivot);
    this.box(0.07, 0.05, 0.005, mats.black, 0.08, 0.07, 0.101, mb);
    this.keypadLed = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), new THREE.MeshBasicMaterial({ color: 0x110000 }));
    this.keypadLed.position.set(0.08, 0.085, 0.104);
    mb.add(this.keypadLed);
    this.tape2 = this.makeTape('2');
    this.tape2.position.set(0, 0.05, 0);
    this.tape2.visible = false;
    mb.add(this.tape2);
    this.tag(mbBody, 'metalbox');
    this.tag(lid, 'metalbox');
    this.points.metalbox = new THREE.Vector3(1.2, 0.7, -1.28);

    // mantar pano ve gazete
    const board = new THREE.Group();
    board.position.set(-1.45, 1.42, -2.58);
    this.scene.add(board);
    this.box(0.72, 0.52, 0.02, new THREE.MeshStandardMaterial({ color: 0x9c7046, roughness: 1, bumpMap: TX.noiseTex(128, 0.4, 3), bumpScale: 1 }), 0, 0, 0, board);
    const news = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.325), new THREE.MeshStandardMaterial({ map: TX.newspaper(), roughness: 0.95 }));
    news.position.set(-0.08, 0.0, 0.012);
    news.rotation.z = -0.05;
    board.add(news);
    const photo = this.box(0.12, 0.09, 0.002, new THREE.MeshStandardMaterial({ color: 0x8f8a7c, roughness: 0.6 }), 0.21, 0.1, 0.012, board);
    photo.rotation.z = 0.12;
    for (const [x, y] of [[-0.08, 0.15], [0.21, 0.14]]) {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), new THREE.MeshStandardMaterial({ color: 0xc02020 }));
      pin.position.set(x, y, 0.02);
      board.add(pin);
    }
    this.tag(news, 'newspaper');
    this.tag(board.children[0], 'newspaper');

    // alçak raf ve peluş
    const shelf = new THREE.Group();
    shelf.position.set(-2.62, 0, -0.1);
    this.scene.add(shelf);
    this.box(0.34, 0.03, 1.1, mats.furniture, 0, 0.9, 0, shelf);
    this.box(0.34, 0.03, 1.1, mats.furniture, 0, 0.45, 0, shelf);
    this.box(0.34, 0.03, 1.1, mats.furniture, 0, 0.03, 0, shelf);
    this.box(0.34, 0.92, 0.03, mats.furniture, 0, 0.46, -0.54, shelf);
    this.box(0.34, 0.92, 0.03, mats.furniture, 0, 0.46, 0.54, shelf);
    for (let i = 0; i < 9; i++) {
      const b = this.box(0.18, 0.2 + rand(0, 0.08), 0.04, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rand(0, 0.12), 0.4, rand(0.15, 0.3)), roughness: 0.85 }), 0.02, 0.58, -0.4 + i * 0.05, shelf);
      if (i === 8) b.rotation.x = 0.4;
    }
    this.plush = this.makePlush();
    this.plushShelfPos = new THREE.Vector3(-2.58, 0.915, -0.2);
    this.plush.position.copy(this.plushShelfPos);
    this.plush.rotation.y = Math.PI / 2 - 0.3;
    this.scene.add(this.plush);
    this.tag(this.plush, 'plush');
    this.tape3 = this.makeTape('3');
    this.tape3.visible = false;
    this.tape3.position.set(-0.28, 0.016, 2.0);
    this.tape3.rotation.y = 0.6;
    this.scene.add(this.tape3);
    this.tag(this.tape3, 'plush');

    // örtülü mobilya ve istifin üst kutusu: src/attic.js
    // istif kutular
    for (const [x, y, z, s, r] of [[2.35, 0.2, 1.95, 0.4, 0.2], [1.85, 0.18, 2.2, 0.36, 0.5], [-2.45, 0.2, 1.9, 0.4, 0.3]]) {
      const b = this.box(s * 1.2, s, s, mats.cardboard, x, y, z);
      b.rotation.y = r;
    }
    // sandalye (oyuncunun oturduğu)
    const ch = new THREE.Group();
    ch.position.set(0, 0, 0.72);
    this.scene.add(ch);
    this.box(0.46, 0.05, 0.44, mats.furniture, 0, 0.45, 0, ch);
    for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) this.box(0.035, 0.45, 0.035, mats.furniture, x, 0.225, z, ch);
  }

  makeTape(label) {
    const g = new THREE.Group();
    this.box(0.188, 0.025, 0.104, this.mats.black, 0, 0.0125, 0, g);
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#f2ecd8';
    x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#ffd23f';
    x.fillRect(0, 0, 256, 14);
    x.fillStyle = '#2b2018';
    x.font = 'bold 22px "Caveat", cursive';
    x.fillText(`Beste ${+label === 7 ? 1 : label} — ${TAPE_LABELS[+label] || ''}`, 10, 46);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.036), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    l.rotation.x = -Math.PI / 2;
    l.position.y = 0.0256;
    g.add(l);
    return g;
  }

  makePlush() {
    const g = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0xc8742e, roughness: 1, bumpMap: TX.noiseTex(128, 0.5, 6), bumpScale: 1.2 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xe8d2a8, roughness: 1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), fur);
    body.scale.set(1, 0.9, 0.85);
    body.position.y = 0.09;
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), cream);
    belly.position.set(0, 0.08, 0.04);
    belly.scale.set(1, 1, 0.6);
    g.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), fur);
    head.position.set(0, 0.21, 0.02);
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 12), fur);
      ear.position.set(s * 0.05, 0.29, 0.01);
      ear.rotation.z = -s * 0.3;
      g.add(ear);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), black);
    eye.position.set(-0.032, 0.225, 0.095);
    g.add(eye);
    // diğer göz yok: sarkan bir iplik
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.04, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    thread.position.set(0.032, 0.205, 0.098);
    thread.rotation.z = 0.3;
    g.add(thread);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd06070 }));
    nose.position.set(0, 0.2, 0.1);
    g.add(nose);
    this.plushTail = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI * 1.1), fur);
    this.plushTail.position.set(0, 0.11, -0.1);
    this.plushTail.rotation.y = Math.PI / 2;
    g.add(this.plushTail);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  buildLights() {
    const S = this.scene;
    this.hemi = new THREE.HemisphereLight(0x2a3040, 0x0a0705, 0.35);
    S.add(this.hemi);

    // tavandan sarkan ampul
    this.bulbGroup = new THREE.Group();
    this.bulbGroup.position.set(0, 2.9, -0.35);
    S.add(this.bulbGroup);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 6), this.mats.black);
    cord.position.y = -0.31;
    this.bulbGroup.add(cord);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.05, 12), this.mats.black);
    sock.position.y = -0.64;
    this.bulbGroup.add(sock);
    this.bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe7c0, emissive: 0xffa040, emissiveIntensity: 3 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), this.bulbMat);
    bulb.position.y = -0.69;
    this.bulbGroup.add(bulb);
    this.bulb = new THREE.PointLight(0xffa860, 4, 0, 2);
    this.bulb.position.y = -0.74;
    this.bulb.castShadow = true;
    this.bulb.shadow.mapSize.set(1024, 1024);
    this.bulb.shadow.bias = -0.003;
    this.bulb.shadow.radius = 3;
    this.bulb.shadow.camera.near = 0.05;
    this.bulbGroup.add(this.bulb);
    this.points.bulb = new THREE.Vector3(0, 2.2, -0.35);
    // yeni kasetlerin konumlu sesleri için noktalar
    this.points.phone = new THREE.Vector3(-2.45, 0.42, 1.9);
    this.points.chest = new THREE.Vector3(1.45, 0.3, 0.1);
    this.points.chairLeg = new THREE.Vector3(-0.2, 0.2, 0.53);
    this.points.behind = new THREE.Vector3(0, 1.1, 1.5);
    this.points.floorboard = new THREE.Vector3(-0.72, 0.02, 0.62);
    this.points.giftbox = new THREE.Vector3(1.6, 0.15, 1.45);
    this.points.stairs = new THREE.Vector3(-1.2, -1.6, 6.0);
    this.tag(bulb, 'bulb');

    // ay ışığı
    this.moon = new THREE.DirectionalLight(0x7f95d6, 0.5);
    this.moon.position.set(2.4, 3.2, -5.5);
    this.moon.target.position.set(0.4, 0, 0.2);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    const sc = this.moon.shadow.camera;
    sc.left = -3;
    sc.right = 3;
    sc.top = 3;
    sc.bottom = -3;
    sc.near = 1;
    sc.far = 12;
    this.moon.shadow.bias = -0.002;
    S.add(this.moon, this.moon.target);

    // televizyonun odaya vuran ışığı
    this.tvLight = new THREE.PointLight(0x8899ff, 0, 5, 2);
    this.tvLight.position.set(-0.06, 0.85, -1.2);
    S.add(this.tvLight);
  }

  buildDust() {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-2.6, 2.6);
      pos[i * 3 + 1] = rand(0.1, 2.6);
      pos[i * 3 + 2] = rand(-2.4, 2.4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,240,220,1)');
    gr.addColorStop(1, 'rgba(255,240,220,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 32, 32);
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.007, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
  }

  tag(obj, id) {
    obj.userData.interact = id;
    obj.traverse?.((o) => (o.userData.interact = id));
    this.interactables.push(obj);
  }

  drawVcr() {
    const x = this.vcrCanvas.getContext('2d');
    x.fillStyle = '#031006';
    x.fillRect(0, 0, 128, 32);
    x.fillStyle = '#4cff7a';
    x.shadowColor = '#4cff7a';
    x.shadowBlur = 6;
    x.font = '26px "VT323", monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const blink = this.vcrText === '12:00' && Math.floor(this.clock * 1.5) % 2;
    if (!blink) x.fillText(this.vcrText, 64, 17);
    this.vcrTex.needsUpdate = true;
  }

  // ======================================================================= durum
  /** playing: şu an oynatıcıdaki kaset (yığında gösterilmez) */
  applyStage(st, playing = null) {
    const s = st.stage;
    const owned = st.tapes || [];
    this.tape1.visible = !owned.includes(1);
    let h = 0;
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const t = this.stackTapes[n];
      t.visible = owned.includes(n) && n <= s && n !== playing;
      if (t.visible) t.position.y = h++ * 0.026;
    }
    this.tape2.visible = st.boxOpen && !st.tape2Taken;
    this.lidPivot.rotation.x = st.boxOpen ? -1.6 : 0;
    this.keypadLed.material.color.set(st.boxOpen ? 0x10ff40 : s >= 1 ? 0xff1a10 : 0x110000);
    const moved = s >= 2;
    if (moved) {
      this.plush.position.set(-0.45, 0, 2.05);
      this.plush.rotation.set(0, Math.PI + 0.5, -1.25);
      this.plushTail.visible = false;
    } else {
      this.plush.position.copy(this.plushShelfPos);
      this.plush.rotation.set(0, Math.PI / 2 - 0.3, 0);
      this.plushTail.visible = true;
    }
    this.tape3.visible = moved && !st.tape3Taken && s === 2;
    this.prints.visible = s >= 2;
    this.attic.apply(st);
    this.g.house?.apply(st);
  }

  setMood(m) {
    if (m === 't3') {
      this.tweens.add(this, 'bulbBase', 0.55, 4);
      this.tweens.add(this.moon, 'intensity', 0.25, 4);
      this.scene.fog.density = 0.07;
    } else {
      this.tweens.add(this, 'bulbBase', 1, 2);
      this.tweens.add(this.moon, 'intensity', 0.5, 2);
      this.scene.fog.density = 0.045;
    }
  }

  setFlicker(on) {
    this.flicker = on;
  }
  flickerBurst(sec) {
    this.burst = Math.max(this.burst, sec);
  }
  setBulb(v, dur = 0.5) {
    this.tweens.add(this, 'bulbBase', v, dur);
  }
  showGirl(v) {
    this.girl.visible = v;
    if (v) {
      this.girl.position.z = 3.7;
      this.tweens.add(this.girl.position, 'z', 3.15, 6);
    }
  }
  /** Kapının ardında soğuk bir ışık yanar (kötü son) */
  doorGlow(v) {
    this.corridorLight.color.set(0x7088c8);
    this.tweens.add(this, 'gapLevel', v, 1.5);
    this.tweens.add(this.corridorLight, 'intensity', v * 9, 2.5);
    this.tweens.add(this.spill, 'intensity', v * 1.4, 2);
  }
  openDoor(amount, dur) {
    // kapı odanın içine doğru açılır, koridoru kapatmaz
    this.tweens.add(this.doorPivot.rotation, 'y', amount * (Math.PI / 2), dur);
  }
  dawn() {
    this.sky.material.map = this.skyDawn;
    this.sky.material.needsUpdate = true;
    this.moon.color.set(0xffb27a);
    this.tweens.add(this.moon, 'intensity', 1.4, 4);
    this.tweens.add(this.hemi, 'intensity', 0.8, 4);
    this.corridorLight.color.set(0xffc38a);
    this.tweens.add(this.corridorLight, 'intensity', 3, 3);
    this.setBulb(0, 2);
  }
  /** Sinematik bakış (kontrolleri kilitler) */
  lookAt(target, dur = 2) {
    const p = typeof target === 'string' ? this.points[target] : target;
    this.locked = true;
    this.focusTarget = 0;
    const from = this.focus > 0.5 ? FOCUS : SEAT;
    const dir = p.clone().sub(from);
    let yaw = Math.atan2(-dir.x, -dir.z);
    // en kısa yoldan dön
    while (yaw - this.yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - this.yaw < -Math.PI) yaw += Math.PI * 2;
    const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    this.tweens.add(this, 'yaw', yaw, dur);
    this.tweens.add(this, 'pitch', pitch, dur);
    this.tweens.add(this, 'focus', 0, dur);
  }

  setFocus(on) {
    if (this.locked) return;
    this.focusTarget = on ? 1 : 0;
    if (on) {
      // televizyona doğru dön
      let yaw = 0;
      while (yaw - this.yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw - this.yaw < -Math.PI) yaw += Math.PI * 2;
      this.tweens.add(this, 'yaw', yaw, 0.7);
      this.tweens.add(this, 'pitch', -0.04, 0.7);
    }
  }

  look(dx, dy) {
    if (this.locked) return;
    this.yaw -= dx;
    this.pitch = clamp(this.pitch - dy, this.standing ? -1.35 : -1.42, this.standing ? 1.35 : 1.2);
    if (this.focusTarget > 0.5) {
      this.yaw = clamp(this.yaw, -0.55, 0.55);
      this.pitch = clamp(this.pitch, -0.45, 0.35);
    }
  }

  // ======================================================================= kare
  update(dt, ndc) {
    this.clock += dt;
    this.tweens.update(dt);
    this.focus += (this.focusTarget - this.focus) * Math.min(1, dt * 4);
    const f = smooth(clamp(this.focus, 0, 1));
    if (this.walkCam) this.camera.position.copy(this.walkCam);
    else this.camera.position.lerpVectors(SEAT, FOCUS, f);
    // nefes alma salınımı
    this.camera.position.y += Math.sin(this.clock * 1.3) * 0.004;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, this.roll || 0);

    // ampul: sallanma + titreme
    this.bulbGroup.rotation.z = Math.sin(this.clock * 0.7) * 0.035;
    this.bulbGroup.rotation.x = Math.sin(this.clock * 0.53) * 0.025;
    let lvl = this.bulbBase;
    if (this.flicker || this.burst > 0) {
      this.burst = Math.max(0, this.burst - dt);
      const r = Math.random();
      const heavy = this.burst > 0;
      if (!this._fl || this.clock > this._fl.until) {
        const off = r < (heavy ? 0.5 : 0.12);
        this._fl = { until: this.clock + (off ? rand(0.04, 0.25) : rand(0.08, heavy ? 0.3 : 1.4)), v: off ? rand(0, 0.15) : rand(0.6, 1.1) };
        if (off && Math.random() < 0.5) this.g.audio.sfx('pop', this.points.bulb);
      }
      lvl *= this._fl.v;
    }
    this.bulbLevel += (lvl - this.bulbLevel) * Math.min(1, dt * 30);
    this.bulb.intensity = 4.2 * this.bulbLevel * this.bulbZone;
    this.bulbMat.emissiveIntensity = (3 * this.bulbLevel + 0.02) * (this.bulbZone > 0.05 ? 1 : 0.1);

    // kapı altı ışığı: önünden biri geçiyormuş gibi kesilir
    const feet = Math.sin(this.clock * 2.1) > 0.55 ? 0.25 : 1;
    this.gap.material.opacity = this.gapLevel * feet;
    this.spill.intensity = Math.min(this.spill.intensity, 1.4) * (feet < 1 ? 0.97 : 1);

    // TV ışığı
    const tv = this.g.tv;
    const pw = tv.p.power;
    const a = tv.avg;
    const lum = (a.r + a.g + a.b) / 3;
    this.tvLight.color.setRGB(a.r + 0.05, a.g + 0.05, a.b + 0.08);
    this.tvLight.intensity = pw * (0.25 + lum * 2.4);

    // toz
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + Math.sin(this.clock * 0.3 + i) * 0.0004 - 0.0006;
      if (y < 0.05) y = 2.6;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(this.clock * 0.2 + i * 1.7) * 0.0005);
    }
    p.needsUpdate = true;

    if (Math.floor(this.clock * 3) !== this._vcrTick) {
      this._vcrTick = Math.floor(this.clock * 3);
      this.drawVcr();
    }

    // bakılan nesne ve ekrandaki bakış noktası
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.far = this.reach;
    const extra = this.g.house?.built ? this.g.house.extraInteractables() : null;
    const hits = this.raycaster.intersectObjects(extra && extra.length ? this.interactables.concat(extra) : this.interactables, true);
    // perde görevi gören duvarlar (extra) etkileşimleri örter; ilk görünür çarpışma kazanır
    const hit = hits.find((h) => h.object.visible !== false && isVisible(h.object) && (h.object.userData.interact || h.object.userData.occ));
    this.hover = hit ? hit.object.userData.interact || null : null;
    const pt = (this._pt ||= new THREE.Vector3());
    const ray = this.raycaster.ray;
    let gx = 0, gy = 0;
    if (ray.intersectPlane(this.screenPlane, pt) && ray.direction.z < 0) {
      gx = (pt.x - SCREEN_CENTER.x) / (SCREEN_W / 2);
      gy = (pt.y - SCREEN_CENTER.y) / (SCREEN_H / 2);
    } else {
      gx = Math.sign(-Math.sin(this.yaw)) * 3;
      gy = 0;
    }
    this.gaze = { x: gx, y: gy };
  }

  listener() {
    // her kare çağrılır: geçici vektörler yeniden kullanılır
    const L = (this._lis ||= { pos: this.camera.position, fwd: new THREE.Vector3(), up: new THREE.Vector3() });
    this.camera.getWorldDirection(L.fwd);
    L.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    return L;
  }
}

function isVisible(o) {
  while (o) {
    if (o.visible === false) return false;
    o = o.parent;
  }
  return true;
}

// Nadir, oyun başına değişen küçük korkutmalar (kullanıcı isteği: "oyuncu ne kadar tekrar oynarsa o ihtimal artar").
// Havuzda 16 küçük korkutma var (0.2-3 sn, çoğu ince). Her oturumda (Yeni oyun / Devam) hangilerinin "kurulu" olduğu
// zarla belirlenir: p = min(0.7, 0.10 + 0.08 * runs); daha önce hiç çıkmamışlar seçimde öne alınır, görülmüşlerin ihtimali
// SEEN_K ile düşer; en çok armCap(runs) (3..5) tanesi kurulur. Kurulu olanlar uygun bir anda en çok BİR kez çalışır.
// "Uygun an": yalnız yürürken ya da kaset oynamıyorken koltukta beklerken; panel/kaset yok; betikli korkutmalardan ve
// birbirinden en az GAP sn uzak. Kalıcı kayıt (Yeni oyun silmez): localStorage 'beste-meta-v1' = { runs, seen[] }.
import * as THREE from 'three';
import { clamp, lerp, rand, storage } from './util.js';
import { YG, YB, stairY } from './house.js';
import * as TX from './textures.js';
import * as S from './draw/scenes.js';

export const META_KEY = 'beste-meta-v1';
const GAP = 20; // korkutmalar arası en az süre (sn)
const SEEN_K = 0.3; // daha önce görülmüş bir korkutmanın ihtimal çarpanı
const CANCEL = Symbol('nadir-iptal');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HALF = Math.PI / 2;

/** Oyun sayısına göre bir korkutmanın kurulma ihtimali */
export const chance = (runs) => Math.min(0.7, 0.1 + 0.08 * Math.max(0, runs));
/** Bir oturumda en çok kaç korkutma kurulur */
export const armCap = (runs) => Math.min(5, 2 + Math.ceil(Math.max(1, runs) / 2));

export function loadMeta(legacy = false) {
  const m = storage.get(META_KEY, null);
  if (m && typeof m === 'object') return { v: 1, runs: Math.max(0, m.runs | 0), seen: Array.isArray(m.seen) ? m.seen.filter((x) => typeof x === 'string') : [] };
  // kayıt var ama meta yok (eski sürümden gelen oyuncu): bir oyun oynamış sayılır
  return { v: 1, runs: legacy ? 1 : 0, seen: [] };
}

/** Saf zar: hangi kimlikler kurulur. rng test için verilebilir. */
export function rollArmed(runs, seen, exclude = [], rng = Math.random, ids = Object.keys(DEFS)) {
  const p = chance(runs);
  const cand = [];
  for (const id of ids) {
    if (exclude.includes(id)) continue;
    const was = seen.includes(id);
    if (rng() < (was ? p * SEEN_K : p)) cand.push({ id, was, r: rng() });
  }
  cand.sort((a, b) => a.was - b.was || a.r - b.r);
  return cand.slice(0, armCap(runs)).map((c) => c.id);
}

// ===================================================================== dokular
function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function ctex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Soluk, boş bakışlı çocuk yüzü (bust: omuzlu, yansıma için) */
function faceTex(bust = false) {
  const [c, x] = cv(128, bust ? 192 : 160);
  x.clearRect(0, 0, c.width, c.height);
  const cx = 64, cy = bust ? 78 : 80;
  if (bust) {
    x.fillStyle = '#0d0d10';
    x.beginPath();
    x.moveTo(6, 192);
    x.quadraticCurveTo(14, 138, 64, 130);
    x.quadraticCurveTo(114, 138, 122, 192);
    x.closePath();
    x.fill();
  }
  // saç (arka)
  x.fillStyle = '#12100e';
  x.beginPath();
  x.ellipse(cx, cy - 6, 50, 62, 0, 0, Math.PI * 2);
  x.fill();
  // yüz
  const g = x.createRadialGradient(cx, cy + 4, 8, cx, cy + 6, 52);
  g.addColorStop(0, '#ebe8de');
  g.addColorStop(1, '#a7aaa4');
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(cx, cy + 4, 38, 50, 0, 0, Math.PI * 2);
  x.fill();
  // kakül
  x.fillStyle = '#12100e';
  x.beginPath();
  x.ellipse(cx, cy - 40, 42, 17, 0, Math.PI, Math.PI * 2);
  x.fill();
  // göz çukurları
  x.fillStyle = '#040404';
  for (const s of [-1, 1]) {
    x.beginPath();
    x.ellipse(cx + s * 15, cy + 2, 8.5, 12, s * 0.12, 0, Math.PI * 2);
    x.fill();
  }
  // küçük, yerinde olmayan gülümseme
  x.strokeStyle = '#1b0f0f';
  x.lineWidth = 2.2;
  x.beginPath();
  x.moveTo(cx - 14, cy + 32);
  x.quadraticCurveTo(cx, cy + 40, cx + 14, cy + 31);
  x.stroke();
  return ctex(c);
}
function footTex() {
  const [c, x] = cv(64, 128);
  x.clearRect(0, 0, 64, 128);
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(32, 48, 15, 30, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(33, 104, 10, 15, 0, 0, Math.PI * 2);
  x.fill();
  for (const [px, py, r] of [[18, 14, 5], [27, 8, 5.5], [37, 7, 5.5], [46, 11, 5], [52, 21, 4]]) {
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();
  }
  return ctex(c);
}
/** Koltukta arkası dönük oturan siluet (baş + omuz) */
function sitterTex() {
  const [c, x] = cv(128, 128);
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = '#1d1e24';
  x.strokeStyle = '#3b3d46';
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(64, 46, 21, 27, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.beginPath();
  x.moveTo(8, 128);
  x.quadraticCurveTo(14, 84, 64, 76);
  x.quadraticCurveTo(114, 84, 120, 128);
  x.closePath();
  x.fill();
  return ctex(c);
}
function eyesTex() {
  const [c, x] = cv(128, 32);
  x.clearRect(0, 0, 128, 32);
  for (const px of [40, 88]) {
    const g = x.createRadialGradient(px, 16, 0, px, 16, 14);
    g.addColorStop(0, 'rgba(255,246,170,1)');
    g.addColorStop(0.3, 'rgba(235,225,110,.8)');
    g.addColorStop(1, 'rgba(235,225,110,0)');
    x.fillStyle = g;
    x.fillRect(px - 16, 0, 32, 32);
  }
  return ctex(c);
}

const DEFS = {};
const def = (id, o) => (DEFS[id] = { id, min: 0, loud: false, ...o });

export class Rare {
  constructor(game) {
    this.g = game;
    const st = game.state;
    this.meta = loadMeta(!!(st.stage > 0 || st.tapes?.length || st.name));
    this.on = false;
    this.armed = []; // { id, due, fired }
    this.job = null;
    this.jobId = null;
    this.gen = 0;
    this.waits = [];
    this.anims = [];
    this.undo = [];
    this.fx = new Set();
    this.props = {};
    this.playT = 0;
    this.t0 = 0;
    this.lastFire = -99;
    this.lastBusy = -99;
    this.lastTape = -99;
    this.lastPanel = -99;
    this.accs = {};
    this.trail = [];
    this.tvFx = null;
    this.ajar = [];
    this.log = [];
  }

  get clock() {
    return this.g.clock;
  }

  // ================================================================== kalıcı kayıt
  saveMeta() {
    storage.set(META_KEY, this.meta);
  }
  /** Yeni oyun başlarken çağrılır: toplam oyun sayısı artar. Görülenler korunur. */
  onNewGame() {
    this.meta.runs++;
    this.saveMeta();
  }
  markSeen(id) {
    if (id === this.jobId) this.jobMarked = true;
    if (!this.meta.seen.includes(id)) this.meta.seen.push(id);
    this.saveMeta();
    const r = (this.g.state.room = this.g.state.room || {});
    r.rare = r.rare || [];
    if (!r.rare.includes(id)) r.rare.push(id);
    this.g.save();
    this.log.push(id);
  }

  // ================================================================== oturum
  /** Oyuna girerken (Yeni oyun ya da Devam) çağrılır: zar atılır, kurulanlar rastgele bir ana yazılır. */
  begin() {
    this.abort();
    const r = this.g.state.room || {};
    // otomatik testlerde (Playwright: navigator.webdriver) rastgele korkutma kurulmaz: diğer testler belirsizleşmesin.
    // debugArm / debugFire / forceRoll bunu aşar. Gerçek oyuncularda webdriver hep false'tur.
    const auto = typeof navigator !== 'undefined' && navigator.webdriver && !this.forceRoll;
    const ids = auto ? [] : rollArmed(this.meta.runs, this.meta.seen, r.rare || []);
    this.armed = ids.map((id) => ({ id, due: rand(45, 900), fired: false }));
    this.on = true;
    this.playT = 0;
    this.t0 = this.clock;
    this.lastFire = this.lastBusy = this.lastTape = this.lastPanel = -99;
    this.accs = {};
    this.trail = [];
  }
  stop() {
    this.on = false;
    this.abort();
    this.armed = [];
    for (const a of this.ajar.splice(0)) this.closeAjar(a);
  }
  abort() {
    // yarım kalan "payoff" beklemeli korkutma (görülmeden kesildi) tüketilmez, sonra yine denenir
    if (this.job && this.jobArm && !this.jobMarked) this.jobArm.fired = false;
    this.gen++;
    const all = [...this.waits, ...this.anims];
    this.waits = [];
    this.anims = [];
    for (const o of all) o.rej(CANCEL);
    this.runUndo();
    this.job = null;
    this.jobId = null;
    this.tvFx = null;
  }
  defer(fn) {
    this.undo.push(fn);
  }
  runUndo() {
    const list = this.undo.splice(0).reverse();
    for (const f of list) {
      try {
        f();
      } catch (e) {
        console.error(e);
      }
    }
  }

  // ================================================================== zamanlayıcılar
  wait(sec) {
    return new Promise((res, rej) => this.waits.push({ t: sec, res, rej }));
  }
  tween(dur, fn) {
    return new Promise((res, rej) => this.anims.push({ t: 0, dur, fn, res, rej }));
  }
  /** koşul sürdükçe biriken süre */
  acc(key, cond, dt) {
    this.accs[key] = cond ? (this.accs[key] || 0) + dt : 0;
    return this.accs[key];
  }

  // ================================================================== durum
  get soft() {
    return !!this.g.settings.flash;
  }
  /** Oyuncunun durumu: ayakta mı, hangi bölge */
  ctx() {
    const g = this.g;
    const w = g.walk;
    const standing = !!w.standing;
    const zone = standing ? w.zone : 'cati';
    const level = standing ? w.level : 'ust';
    return {
      stage: g.state.stage,
      standing,
      zone,
      level,
      attic: zone === 'cati',
      built: !!g.house?.built,
      ground: level === 'zemin' && standing,
      cam: g.room.camera.position,
      pos: w.pos,
      room: g.room,
    };
  }
  /** Betikli bir korkutma sürüyor ya da bekliyor mu */
  scriptedBusy() {
    const sc = this.g.scares;
    return !!(
      sc.active || sc.sealing || sc.r1 || sc.tv.on || sc.mon || sc.s4Pending || sc.s6?.armed || sc.s6?.spawned || sc.zilAt != null ||
      sc.camAt != null || sc.chairWatch > 0 || sc.s2?.shown || sc.inputLock
    );
  }
  /** Korkutma çıkabilecek bir an mı (kaset, panel, geçiş yok) */
  baseOk() {
    const g = this.g;
    const w = g.walk;
    return (
      g.mode === 'play' &&
      !g.panelOpen() &&
      !g.director.active &&
      !g.director.fakeEnding &&
      !g.loadingTape &&
      !g.playingTape &&
      !g.state.ending &&
      !g.room.locked &&
      !w.trans &&
      !w.sitting
    );
  }

  // ================================================================== her kare
  update(dt) {
    const g = this.g;
    // zamanlayıcılar
    if (this.waits.length) {
      const done = [];
      for (const w of this.waits) {
        w.t -= dt;
        if (w.t <= 0) done.push(w);
      }
      if (done.length) {
        this.waits = this.waits.filter((w) => !done.includes(w));
        for (const w of done) w.res();
      }
    }
    if (this.anims.length) {
      const done = [];
      for (const a of this.anims) {
        a.t += dt;
        a.fn(Math.min(1, a.t / a.dur));
        if (a.t >= a.dur) done.push(a);
      }
      if (done.length) {
        this.anims = this.anims.filter((a) => !done.includes(a));
        for (const a of done) a.res();
      }
    }
    for (const f of this.fx) f(dt);
    this.faceCam();
    if (!this.on) return;
    const clock = g.clock;
    const sc = g.scares;
    const tape = g.director.active || g.loadingTape || g.playingTape;
    if (tape) this.lastTape = clock;
    if (g.panelOpen() || g.mode !== 'play') this.lastPanel = clock;
    const busy = this.scriptedBusy();
    if (busy) this.lastBusy = clock;
    const ok = this.baseOk();
    // kaset, panel ya da betikli korkutma başlarsa süren nadir korkutma hemen biter
    if (this.job && (!ok || busy || tape)) {
      this.abort();
      this.lastFire = clock;
    }
    if (!ok) return;
    if (g.walk.standing && g.walk.zone === 'banyo') this.pushTrail(clock);
    else if (this.trail.length) this.trail.length = 0;
    this.playT += dt;
    if (this.job) return;
    if (!this.armed.some((a) => !a.fired && this.playT >= a.due)) return;
    // genel kapılar
    if (clock - this.t0 < 40 || clock - this.lastFire < GAP || clock - this.lastBusy < GAP || clock - this.lastTape < 12) return;
    if (clock - this.lastPanel < 3 || clock < sc.quietUntil || clock - sc.lastLoud < GAP) return;
    const c = this.ctx();
    for (const a of this.armed) {
      if (a.fired || this.playT < a.due) continue;
      const d = DEFS[a.id];
      if (!d || c.stage < d.min) continue;
      if (d.loud && !sc.loudOk()) continue;
      if (d.tick ? !d.tick(this, c, dt) : !d.where(this, c)) continue;
      a.fired = true;
      this.start(d, c, a);
      break;
    }
  }

  pushTrail(clock) {
    const p = this.g.room.camera.position;
    this.trail.push({ t: clock, x: p.x, y: p.y, z: p.z });
    while (this.trail.length && clock - this.trail[0].t > 2) this.trail.shift();
  }
  /** `ago` sn önceki kamera konumu */
  trailAt(ago) {
    const want = this.clock - ago;
    let best = this.trail[0];
    for (const p of this.trail) {
      if (p.t <= want) best = p;
      else break;
    }
    return best;
  }

  faceCam() {
    const cam = this.g.room.camera.position;
    for (const p of Object.values(this.props)) {
      if (p.visible && p.userData.bill) p.rotation.y = Math.atan2(cam.x - p.position.x, cam.z - p.position.z);
    }
  }

  // ================================================================== çalıştırma
  start(d, c, arm = null) {
    const g = this.g;
    const gen = this.gen;
    this.job = d.id;
    this.jobId = d.id;
    this.jobArm = arm;
    this.jobMarked = !d.late;
    const sc = g.scares;
    if (d.loud) sc.lastLoud = g.clock;
    sc.rareUntil = g.clock + (d.len || 4) + 4;
    if (!d.late) this.markSeen(d.id);
    return (async () => {
      try {
        await d.run(this, c);
      } catch (e) {
        if (e !== CANCEL) console.error('nadir korkutma', d.id, e);
      } finally {
        if (this.gen === gen) {
          if (this.jobArm && !this.jobMarked) this.jobArm.fired = false;
          this.runUndo();
          this.job = null;
          this.lastFire = g.clock;
        }
      }
    })();
  }

  /** Test kancası: koşulları yok sayıp hemen çalıştırır; bitince çözülür. */
  async debugFire(id) {
    const d = DEFS[id];
    if (!d) throw new Error('bilinmeyen nadir korkutma: ' + id);
    this.on = true;
    this.abort();
    return this.start(d, this.ctx());
  }
  /** Test kancası: yalnız bu kimlikler kurulu, hepsi hemen uygun; genel bekleme süreleri sıfırlanır. */
  debugArm(ids) {
    this.on = true;
    this.armed = ids.map((id) => ({ id, due: 0, fired: false }));
    this.t0 = this.lastFire = this.lastBusy = this.lastTape = this.lastPanel = -99;
  }
  debugState() {
    return { runs: this.meta.runs, seen: [...this.meta.seen], armed: this.armed.map((a) => ({ id: a.id, due: +a.due.toFixed(1), fired: a.fired })), job: this.jobId, log: [...this.log], playT: +this.playT.toFixed(1) };
  }
  static ids() {
    return Object.keys(DEFS);
  }

  // ================================================================== sahne parçaları
  /** Yavaşça doğan, kameraya dönen ya da sabit düzlem; tek seferlik kurulur, sahnenin kökünde durur. */
  prop(name, make) {
    let p = this.props[name];
    if (!p) {
      p = make();
      p.visible = false;
      this.g.room.scene.add(p);
      this.props[name] = p;
    }
    return p;
  }
  plane(name, tex, w, h, { bill = false, fog = true, color = 0xffffff, opacity = 1, order = 5 } = {}) {
    return this.prop(name, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(), transparent: true, depthWrite: false, fog, color, opacity, side: THREE.DoubleSide }));
      m.userData.bill = bill;
      m.renderOrder = order;
      return m;
    });
  }
  /** gösterilen parça işin sonunda ya da iptalde gizlenir */
  show(p, on = true) {
    p.visible = on;
    if (on) this.defer(() => (p.visible = false));
    return p;
  }
  fade(p, k) {
    p.material.opacity = k;
  }

  // ================================================================== sesler
  /** Kısa, ani bir vuruş: derin tok ses + tiz bıçak (keskin olanlar için) */
  stab(pos, k = 1) {
    const a = this.g.audio;
    if (!a.ctx) return;
    const t = a.now;
    const d = pos ? a.at(pos.x, pos.y, pos.z, 0.25) : a.room;
    a.tone(d, t, 70, 0.5, { gain: 0.55 * k, endFreq: 28, attack: 0.002 });
    a.noiseBurst(d, t, 0.16, { type: 'highpass', freq: 1800, gain: 0.32 * k, attack: 0.001 });
    a.tone(d, t, 1320, 0.22, { type: 'sawtooth', gain: 0.04 * k, attack: 0.002, endFreq: 980 });
  }
  sfx(name, ...a) {
    this.g.audio.sfx(name, ...a);
  }
  /** Kameranın hemen arkası/yanı (yatay) */
  behind(dist = 0.3, side = 0.12, y = -0.05) {
    const r = this.g.room;
    const c = r.camera.position;
    return V(c.x + Math.sin(r.yaw) * dist + Math.cos(r.yaw) * side, c.y + y, c.z + Math.cos(r.yaw) * dist - Math.sin(r.yaw) * side);
  }
  /** Odanın bir köşesi: kameranın geri-sol çaprazı, `dist` uzaklıkta */
  corner(dist = 2.4) {
    const r = this.g.room;
    const c = r.camera.position;
    const fx = -Math.sin(r.yaw), fz = -Math.cos(r.yaw); // ileri
    const lx = -Math.cos(r.yaw), lz = Math.sin(r.yaw); // sol
    return V(c.x - fx * dist * 0.8 + lx * dist * 0.6, c.y - 0.2, c.z - fz * dist * 0.8 + lz * dist * 0.6);
  }
  look(pos, deg, minD = 0, maxD = 99) {
    return this.g.scares.seen(pos, deg, minD, maxD);
  }
  angle(pos) {
    return this.g.scares.angleTo(pos);
  }
  say(id, pos, gain = 1) {
    return this.g.scares.say(id, '???', 'bilinmeyen', pos, gain, { wet: 0.7 });
  }

  // ================================================================== TV (boş ekran karıncası)
  drawTv(ctx, t) {
    if (!this.tvFx) return false;
    S.staticNoise(ctx, t, this.tvFx.amt);
    return true;
  }

  closeAjar(a) {
    const d = this.g.house?.doors?.[a.name];
    if (d && Math.abs(d.pivot.rotation.y - a.angle) < 0.03) d.pivot.rotation.y = 0;
  }
}

// ===================================================================== korkutmalar
const WIN = V(1.4, 1.52, -2.62);

// ---- tavan arası ---------------------------------------------------------------------------------------------
def('pencere', {
  min: 2,
  loud: true,
  len: 2,
  tick: (r, c, dt) => c.attic && r.g.room.focus < 0.3 && r.acc('pencere', r.look(WIN, 30, 1, 6), dt) > 0.6,
  run: async (r) => {
    const g = r.g;
    // cam (yarı saydam, derinlik yazar) arkada kalmasın: camdan önce çizilir
    const face = r.plane('pencere', () => faceTex(false), 0.34, 0.43, { fog: false, color: 0xb4bcc8, order: -1 });
    face.position.set(1.4, 1.52, -2.69);
    r.sfx('knock', WIN, 1, 0.4, 0.35);
    await r.wait(0.5);
    r.show(face);
    if (r.soft) {
      await r.tween(0.5, (k) => r.fade(face, k * 0.8));
      await r.wait(0.5);
      await r.tween(0.5, (k) => r.fade(face, 0.8 * (1 - k)));
    } else {
      r.fade(face, 1);
      r.stab(WIN, 0.9);
      await r.wait(0.14);
      face.visible = false;
      await r.wait(0.07);
      face.visible = true;
      await r.wait(0.07);
      face.visible = false;
    }
    await r.wait(0.4);
    r.sfx('thud', V(1.4, 1.1, -2.7), 0.3);
  },
});

// Tonton arkanı dönünce yüz çevirir: duruşu zaten sana dönükse önce sırtını döner, sonra yine sana bakar.
def('tonton', {
  min: 1,
  late: true,
  len: 6,
  where: (r, c) => !!r.plushArea(c),
  run: async (r, c) => {
    const g = r.g;
    const pl = g.room.plush;
    const sc = g.scares;
    const cam = g.room.camera.position;
    const LIM = 30; // her aşamada oyuncuyu en çok bu kadar bekler; gelmezse vazgeçer (tüketilmez)
    const face = () => Math.atan2(cam.x - pl.position.x, cam.z - pl.position.z);
    const dif = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const o = { x: pl.position.x, y: pl.position.y, z: pl.position.z, rx: pl.rotation.x, ry: pl.rotation.y, rz: pl.rotation.z };
    const moved = () => sc.active || Math.abs(pl.position.x - o.x) + Math.abs(pl.position.y - o.y) + Math.abs(pl.position.z - o.z) > 0.02;
    const restore = () => {
      if (!moved()) pl.rotation.set(o.rx, o.ry, o.rz);
    };
    let paid = false;
    r.defer(() => !paid && restore());
    const here = () => r.plushArea(r.ctx());
    const seenNow = () => here() && r.look(V(pl.position.x, pl.position.y + 0.15, pl.position.z), 36, 0, 8);
    const stages = dif(pl.rotation.y, face()) < 0.7 ? ['away', 'toward'] : ['toward'];
    for (const s of stages) {
      let unseen = 0;
      let t1 = r.clock;
      while (unseen < 1.4) {
        await r.wait(0.1);
        if (moved() || r.clock - t1 > LIM) return;
        unseen = here() && !seenNow() ? unseen + 0.1 : 0;
      }
      pl.rotation.y = s === 'away' ? face() + Math.PI : face();
      r.lastFire = r.clock;
      r.sfx('clothSlide', V(pl.position.x, pl.position.y + 0.1, pl.position.z), 0.5, 0.3);
      let seen = 0;
      t1 = r.clock;
      while (seen < 0.3) {
        await r.wait(0.1);
        if (moved() || r.clock - t1 > LIM) return;
        seen = seenNow() ? seen + 0.1 : 0;
      }
    }
    paid = true;
    r.markSeen('tonton');
    r.sfx('heartbeat', 2, 0.85);
    // gözden çıkınca eski duruşuna döner (kayıtlı akış etkilenmesin); çıkmazsa sana dönük kalır
    let away = 0;
    const t2 = r.clock;
    while (away < 3 && r.clock - t2 < 15) {
      await r.wait(0.2);
      if (moved()) return;
      away = seenNow() ? 0 : away + 0.2;
    }
    if (away >= 3) restore();
  },
});
Rare.prototype.plushArea = function (c) {
  const pl = this.g.room.plush;
  // yalnız dik duran Tonton (rafta ya da merdiven dibinde); yan yatmış halinde dönme anlamsız
  if (!pl?.visible || this.g.state.stage >= 10 || Math.abs(pl.rotation.x) > 0.3 || Math.abs(pl.rotation.z) > 0.3) return false;
  const p = pl.position;
  const d = Math.hypot(p.x - c.cam.x, p.z - c.cam.z);
  if (c.attic) return p.y > -1 && d < 7;
  if (c.level !== 'zemin' || !c.built) return false;
  return p.y < -2 && this.g.house.zoneAt('zemin', p.x, p.z) === c.zone && d < 8;
};

def('tvkar', {
  min: 1,
  loud: true,
  len: 2,
  where: (r, c) => c.attic && r.g.tv.p.power > 0.5 && r.g.room.focus < 0.9 && r.angle(r.g.room.points.tv) < 75,
  run: async (r) => {
    const soft = r.soft;
    r.tvFx = { amt: soft ? 0.3 : 1 };
    r.defer(() => (r.tvFx = null));
    r.sfx('static', 1.1, soft ? 0.1 : 0.3);
    r.sfx('tvOn');
    await r.wait(1.1);
    r.tvFx = null;
    r.sfx('click');
    await r.wait(0.3);
  },
});

def('ampul', {
  min: 0,
  len: 7,
  where: (r, c) => c.attic && r.g.room.focus < 0.9,
  run: async (r) => {
    const room = r.g.room;
    const bp = V(0, 2.5, -0.35);
    const amp = r.soft ? 0.12 : 0.34;
    let t = 0;
    const fx = (dt) => {
      t += dt;
      const k = Math.exp(-t * 0.45);
      room.bulbGroup.rotation.z += amp * k * Math.sin(t * 3.6);
      room.bulbGroup.rotation.x += amp * 0.45 * k * Math.sin(t * 3.0 + 1);
    };
    r.fx.add(fx);
    r.defer(() => r.fx.delete(fx));
    r.sfx('thud', V(0, 3.1, -0.35), 0.5);
    for (let i = 0; i < 4; i++) {
      await r.wait(0.9);
      r.sfx('swingCreak', bp, 0.06);
    }
    await r.wait(2.5);
  },
});

def('nefes', {
  min: 1,
  len: 5,
  where: (r, c) => c.attic && r.g.room.focus < 0.9,
  run: async (r) => {
    r.sfx('breath', r.behind(0.28, 0.12), 1);
    await r.wait(2.4);
    r.sfx('footCreak', r.behind(0.9, -0.3, -1.1));
    await r.wait(0.8);
  },
});

// ---- her yerde ------------------------------------------------------------------------------------------------
def('kikir', {
  min: 2,
  len: 4,
  where: (r, c) => !!r.g.lines.rare_kikir,
  run: async (r, c) => {
    // kahkaha, oyuncunun bulunduğu katın dışından gelir
    let p;
    if (c.attic) p = V(-1.2, -2.2, 6.4);
    else if (c.level === 'zemin') p = V(0.4, 0.5, 0.6);
    else p = V(1.4, 1.5, -2.6);
    await r.say('rare_kikir', p, 0.8);
  },
});

def('fisilti', {
  min: 2,
  len: 5,
  where: (r, c) => !!r.g.lines.rare_isim,
  run: async (r) => {
    const g = r.g;
    const p = r.corner(2.4);
    g.audio.speakName(g.state.name);
    await r.wait(1.1);
    await r.say('rare_isim', p, 0.9);
  },
});

// ---- ev (zemin kat) -------------------------------------------------------------------------------------------
def('telefon', {
  min: 5,
  loud: true,
  len: 3,
  where: (r, c) => {
    const h = r.g.house;
    if (!c.built || !c.ground || h.ringing) return false;
    return Math.hypot(c.pos.x - h.points.hallPhone.x, c.pos.z - h.points.hallPhone.z) < 14;
  },
  run: async (r) => {
    r.sfx('phoneRing', r.g.house.points.hallPhone, 1, 1);
    await r.wait(1.8);
  },
});

def('kapi', {
  min: 4,
  len: 3,
  tick: (r, c) => c.ground && !!r.ajarCandidate(c),
  run: async (r, c) => {
    const n = r.ajarCandidate(c);
    if (!n) return;
    const h = r.g.house;
    const d = h.doors[n];
    const to = d.open * 0.17;
    const pos = { dolap: h.points.cupboard, banyo: h.points.bathDoor, montaj: h.points.montajDoor }[n];
    r.sfx('creak', pos, 1.5);
    const rec = { name: n, angle: to };
    await r.tween(1.5, (k) => (d.pivot.rotation.y = to * k));
    d.pivot.rotation.y = to;
    r.ajar.push(rec);
    await r.wait(0.5);
  },
});
Rare.prototype.ajarCandidate = function (c) {
  const h = this.g.house;
  const r = this.g.state.room || {};
  const list = ['dolap'];
  if (r.doors?.banyo === false) list.push('banyo');
  if (r.montajOpen) list.push('montaj');
  for (const n of list) {
    const d = h.doors[n];
    if (!d || Math.abs(d.pivot.rotation.y) > 0.03) continue;
    const p = { dolap: h.points.cupboard, banyo: h.points.bathDoor, montaj: h.points.montajDoor }[n];
    const dist = Math.hypot(p.x - c.pos.x, p.z - c.pos.z);
    if (dist < 2.2 || dist > 11) continue;
    if (this.angle(V(p.x, p.y, p.z)) < 60) continue;
    return n;
  }
  return null;
};

def('izler', {
  min: 4,
  late: true,
  len: 20,
  tick: (r, c) => c.ground && (c.zone === 'hol' || c.zone === 'giris') && c.pos.z > 3.4,
  run: async (r) => {
    const g = r.g;
    const prints = [];
    const mats = [];
    const tex = footTex();
    const a = [0.5, 7.0], b = [-0.38, 4.35];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dx, -dz);
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const side = i % 2 ? 1 : -1;
      // ışıktan etkilenen, parlak (ıslak) koyu malzeme: yalnız el fenerinin ışığında seçilir
      const m = new THREE.MeshStandardMaterial({ map: tex, color: 0x1c2a38, roughness: 0.08, metalness: 0.2, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), m);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.set(-HALF, yaw, 0);
      mesh.scale.x = -side;
      mesh.position.set(a[0] + dx * t + (-dz / len) * 0.09 * side, YG + 0.03, a[1] + dz * t + (dx / len) * 0.09 * side);
      g.room.scene.add(mesh);
      prints.push(mesh);
      mats.push(m);
    }
    r.defer(() => {
      for (const m of prints) {
        g.room.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      tex.dispose();
    });
    // izler yalnız bakılmıyorken belirir (aniden "pat" diye çıkmasın): hiçbiri görüş alanında değilse
    const inView = () => prints.some((p) => r.look(p.position, 32, 0, 9));
    let t = 0;
    while (inView()) {
      await r.wait(0.2);
      t += 0.2;
      if (t > 30) return; // hâlâ bakıyor: vazgeç, tüketilmez
    }
    r.sfx('drip', V(0.6, YG + 0.1, 6.9), 0.12);
    for (const m of mats) m.opacity = 0.85;
    let seen = 0;
    const t1 = r.clock;
    while (seen < 0.3) {
      await r.wait(0.1);
      if (r.clock - t1 > 40) return;
      seen = inView() ? seen + 0.1 : 0;
    }
    r.markSeen('izler');
    r.sfx('drip', V(-0.3, YG + 0.1, 4.5), 0.1);
    await r.wait(3);
    await r.tween(9, (k) => {
      for (const m of mats) m.opacity = 0.85 * (1 - k);
    });
  },
});

def('gri', {
  min: 5,
  loud: true,
  len: 3,
  tick: (r, c, dt) => {
    const sc = r.g.scares;
    const w = r.g.walk;
    if (!c.ground || (c.zone !== 'giris' && c.zone !== 'hol') || c.pos.z < 4.6 || !w.lightOn || !sc.fired('adam') || sc.s2.shown) return false;
    const h = r.g.house;
    const m = V(h.points.man.x, YG + 1.3, h.points.man.z);
    return r.acc('gri', r.look(m, 12, 4, 9), dt) > 0.5;
  },
  run: async (r) => {
    const g = r.g;
    const h = g.house;
    const man = r.prop('gri', () => h.makeMan(false));
    man.position.copy(h.points.man);
    man.userData.head.rotation.z = 0.12;
    man.rotation.y = Math.atan2(g.room.camera.position.x - man.position.x, g.room.camera.position.z - man.position.z);
    r.defer(() => (man.visible = false));
    if (r.soft) {
      man.visible = true;
      const mats = [];
      man.traverse((o) => o.material && mats.push(o.material));
      r.defer(() => mats.forEach((m) => (m.opacity = 1)));
      await r.tween(0.5, (k) => mats.forEach((m) => (m.opacity = k * 0.6)));
      await r.tween(0.6, (k) => mats.forEach((m) => (m.opacity = 0.6 * (1 - k))));
    } else {
      man.visible = true;
      await r.wait(0.12);
      man.visible = false;
    }
    r.sfx('heartbeat', 2, 0.8);
    await r.wait(1.5);
  },
});

def('korkuluk', {
  min: 3,
  loud: true,
  len: 3,
  tick: (r, c) => c.ground && c.zone === 'merdiven' && Math.abs(r.g.walk.vel.z) > 0.3 && c.pos.z > 4.4 && c.pos.z < 7.2,
  run: async (r, c) => {
    const g = r.g;
    const w = g.walk;
    const dir = w.vel.z > 0 ? 1 : -1;
    const z0 = clamp(w.pos.z + dir * 1.9, 4.0, 7.6);
    const hand = r.plane('korkuluk', () => TX.childHand(), 0.2, 0.3, {});
    hand.rotation.y = -HALF;
    hand.rotation.z = 0.15 * dir;
    hand.position.set(-0.745, stairY(z0) + 1.0, z0);
    r.fade(hand, 0);
    r.show(hand);
    await r.tween(r.soft ? 0.6 : 0.2, (k) => r.fade(hand, k));
    r.sfx('clothSlide', V(-0.7, stairY(z0) + 1, z0), 0.4, 0.3);
    const t0 = r.clock;
    while (Math.abs(w.pos.z - z0) > 1.1 && r.clock - t0 < 1.4) await r.wait(0.05);
    // yukarı doğru korkuluk boyunca sıyrılıp karanlığa kaçar
    r.sfx('woodScrape', V(-0.7, stairY(z0 - 1) + 1, z0 - 1), 0.5, 0.3);
    r.stab(V(-0.8, stairY(z0) + 1, z0), 0.45);
    await r.tween(r.soft ? 0.7 : 0.25, (k) => {
      hand.position.z = z0 - 1.8 * k;
      hand.position.y = stairY(hand.position.z) + 1.0;
      r.fade(hand, 1 - k);
    });
    await r.wait(0.4);
  },
});

def('koltuk', {
  min: 4,
  late: true,
  len: 40,
  tick: (r, c) => c.ground && c.zone === 'salon' && r.g.scares.zoneSince + 2 < r.clock && !r.look(V(-2.2, YG + 1, 4.6), 45, 0, 20) && Math.hypot(c.pos.x + 2.2, c.pos.z - 4.6) > 3,
  run: async (r) => {
    const g = r.g;
    const sc = g.scares;
    const fig = r.plane('koltuk', sitterTex, 0.5, 0.52, { color: 0xb4b6c0 });
    fig.position.set(-2.21, YG + 1.05, 4.8);
    fig.rotation.y = 0;
    r.show(fig);
    const head = V(-2.21, YG + 1.1, 4.8);
    const t0 = r.clock;
    let seen = 0;
    let marked = false;
    while (r.clock - t0 < 35) {
      await r.wait(0.1);
      const w = g.walk;
      if (w.zone !== 'salon' && r.clock - t0 > 3) return;
      const d = Math.hypot(w.pos.x + 2.21, w.pos.z - 4.6);
      if (r.look(head, 30, 0, 12)) seen += 0.1;
      if (seen >= 0.5 && !marked) {
        marked = true;
        r.markSeen('koltuk');
        r.sfx('heartbeat', 2, 0.9);
      }
      if (d < 2.6 && seen >= 0.3) break;
      if (d < 1.6) break;
    }
    fig.visible = false;
    r.sfx('clothSlide', V(-2.2, YG + 0.7, 4.6), 0.5, 0.35);
    await r.wait(0.5);
  },
});

def('ayna', {
  min: 4,
  len: 5,
  tick: (r, c, dt) => {
    const h = r.g.house;
    const m = h.points.mirror;
    const on = c.ground && c.zone === 'banyo' && Math.abs(h.mirrorPivot.rotation.y) < 0.1 && r.look(V(m.x, m.y, m.z), 28, 0.6, 2.8);
    return r.acc('ayna', on, dt) > 0.8;
  },
  run: async (r) => {
    const g = r.g;
    const img = r.plane('ayna', () => faceTex(true), 0.46, 0.69, { bill: true, color: 0xb0b6bc });
    r.show(img);
    r.fade(img, 0);
    const pos = () => {
      const p = r.trailAt(0.8) || g.room.camera.position;
      img.position.set(Math.max(3.32, 6.4 - p.x), p.y - 0.06, p.z);
    };
    pos();
    r.sfx('drip', V(2.6, YG + 0.5, 7.2), 0.1);
    await r.tween(3.6, (k) => {
      pos();
      r.fade(img, Math.min(1, k * 6) * (k > 0.88 ? (1 - k) / 0.12 : 1) * 0.9);
      // yansıma bir süre sonra başını yamultur, oyuncununki yamulmaz
      img.rotation.z = k > 0.45 ? Math.min(0.28, (k - 0.45) * 1.6) * (r.soft ? 0.4 : 1) : 0;
    });
  },
});

def('fener', {
  min: 3,
  len: 4,
  tick: (r, c) => c.standing && c.built && r.g.walk.lightOn && !r.g.walk.flk && c.zone !== 'cati' && c.zone !== 'bahce',
  run: async (r) => {
    const w = r.g.walk;
    const p = w.flicker([[1, 0.3], [0, 0.1], [0.7, 0.06], [0, 1.5], [0.25, 0.1], [0, 0.45], [1, 0.4]]);
    await r.wait(0.9);
    r.sfx('breath', r.behind(0.35, 0.1), 1);
    await r.wait(1.2);
    r.sfx('footCreak', r.behind(1.4, 0.4, -1.4));
    await p;
    await r.wait(0.5);
  },
});

def('goz', {
  min: 5,
  loud: false,
  len: 4,
  tick: (r, c, dt) => {
    const x = r.eyeX || (r.eyeX = rand(-3.5, 3.5));
    const on = c.standing && c.zone === 'bahce' && c.pos.z < -6 && r.look(V(x, YB + 1.75, -13.8), 22, 6, 16);
    return r.acc('goz', on, dt) > 0.7;
  },
  run: async (r) => {
    const e = r.plane('goz', eyesTex, 0.5, 0.12, { bill: true, fog: true });
    e.position.set(r.eyeX || 0, YB + 1.75, -13.8);
    r.fade(e, 0);
    r.show(e);
    r.sfx('twigSnap', V(e.position.x, YB + 0.2, -13.2));
    await r.tween(r.soft ? 0.6 : 0.25, (k) => r.fade(e, k));
    await r.wait(1.0);
    if (!r.soft) {
      e.visible = false;
      await r.wait(0.12);
      e.visible = true;
    }
    await r.wait(0.4);
    await r.tween(r.soft ? 0.6 : 0.2, (k) => r.fade(e, 1 - k));
  },
});

export const RARE_IDS = Object.keys(DEFS);

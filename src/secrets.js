// Gizli kelimeler ve gizli kasetler.
// KAMİL  -> Gizli Kaset 1 'Kamera Arkası' (src/tapes/gizli1.js), son 'kamera' ("Kayıt Sürüyor")
// KİBRİT -> Gizli Kaset 2 'Kül' (src/tapes/gizli2.js), son 'kul' ("Kül")
// Kelime herhangi bir kasetin herhangi bir cevap kutusuna tek başına yazılırsa (director.submit -> onWord) kaset
// kısa ve tekinsiz bir tepki verir (görüntü donar, fısıltı), cevap sayılmaz, soru sürer. Eşleşen gizli kaset o an
// ulaşılabilir bir yerde belirir: yürüyüş açık değilse (ya da tavan arası mühürlenecekse) tavan arasında, açıksa alt katta.
// Kasetten sonra ince bir bildirim yolu gösterir. Alınan gizli kaset st.secretTapes'e girer; ana akışın "sıradaki kaseti"
// sayılmaz (main.addTape'ten geçmez). İzlenince oyun kendi sonuyla biter (finish).
// Durum: st.secretPlace { gizli1: 'attic' | 'house' } (kelime yazıldı, kaset yerinde), st.secretTapes ['gizli1'] (alındı).
import * as THREE from 'three';
import { norm } from './util.js';
import * as G from './draw/scenesG.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const SECRET_TAPES = {
  gizli1: { word: 'kamil', ending: 'kamera', key: 'G1', name: "Gizli Kaset 1 — 'Kamera Arkası'", label: 'K. — Çamlık — HAM' },
  gizli2: { word: 'kibrit', ending: 'kul', key: 'G2', name: "Gizli Kaset 2 — 'Kül'", label: 'SON — N. — 03.02.99', burnt: true },
};
export const isSecretTape = (n) => typeof n === 'string' && Object.hasOwn(SECRET_TAPES, n);

/** Kasetin belirdiği yer (tıklanan nesne kimliği), sonraki bildirim ve alınca çıkan yazı */
const PLACES = {
  gizli1: {
    attic: { id: 'tapebox', toast: 'Kasetlerin durduğu kutuda bir şey değişti.' },
    house: { id: 'gizli:giris', pos: [0.72, -2.1, 7.99], rot: 0.5, toast: 'Aşağıdan, girişteki konsolun oradan, bir kamera motorunun vızıltısı geldi. Sonra kesildi.' },
  },
  gizli2: {
    attic: { id: 'gizli:raf', toast: 'Tavan arasına yanık kibrit kokusu yayıldı. Alçak rafın en alt gözünden geliyor.' },
    house: { id: 'gizli:mutfak', pos: [1.86, -2.0, -2.86], rot: -0.35, toast: 'Aşağıdan, mutfaktan, yanık kibrit kokusu geliyor. Tezgâhın üstünde bir şey var.' },
  },
};
const PICKUP = {
  gizli1: "Etiketsiz, siyah bir kaset. Kenarına tükenmez kalemle yazılmış: 'K. — ÇAMLIK 14.05.98 — HAM'. Az önce bir kameradan çıkmış gibi ılık.",
  gizli2: "Kenarları erimiş, isli bir kaset. Etiketinde Nermin'in el yazısı: 'SON. 03.02.99. İzleyen yaksın.' Kabının içinde tek bir kibrit var.",
};

export class Secrets {
  constructor(game) {
    this.g = game;
    this.meshes = {}; // gizli1:attic, gizli1:house, ...
    this.toasts = []; // kaset bitince gösterilecek yol bildirimleri
    this.fx = null; // son sahnesi: { camera, fire } 3B parçaları
    this.timer = null;
  }

  get st() {
    const st = this.g.state;
    if (!Array.isArray(st.secretTapes)) st.secretTapes = [];
    if (!st.secretPlace || typeof st.secretPlace !== 'object') st.secretPlace = {};
    return st;
  }

  /** Bulunmuş ama izlenmemiş gizli kaset (oyunda gizli kaset izlenince oyun biter) */
  held() {
    return this.st.secretTapes[0] ?? null;
  }

  /** Kaset seçicideki satırlar */
  chooserItems() {
    return this.st.secretTapes.filter(isSecretTape).map((n) => ({ n, key: SECRET_TAPES[n].key, name: SECRET_TAPES[n].name, watched: false }));
  }

  // ------------------------------------------------------------------ kelime
  /** director.submit: true dönerse kelime yakalandı (cevap sayılmaz, soru sürer) */
  onWord(text, d) {
    const w = norm(String(text || '').normalize('NFC')).replace(/ /g, '');
    const id = Object.keys(SECRET_TAPES).find((k) => SECRET_TAPES[k].word === w);
    if (!id || !d?.active || d.aborted || isSecretTape(this.g.playingTape) || /^tgizli/.test(String(d.tapeId))) return false;
    const st = this.st;
    // bir kez: sonra yazılırsa sıradan bir cevaptır
    if (st.secretPlace[id] || st.secretTapes.includes(id)) return false;
    st.secretPlace[id] = this.placeFor();
    this.g.save();
    this.apply(st);
    this.toasts.push(id);
    this.react(d, id).catch(() => {});
    return true;
  }

  /** Yürüyüş açıksa ve tavan arası mühürlenmeyecekse alt kat, yoksa tavan arası */
  placeFor() {
    const st = this.g.state;
    const r = st.room || {};
    return r.walk && !r.atticSealed && !(st.tapes || []).includes(9) && this.g.house?.built ? 'house' : 'attic';
  }

  /** Kısa, tekinsiz tepki: kare donar, oda ışığı titrer, fısıltı; sonra cevap kutusu yeniden açılır. */
  async react(d, id) {
    const g = this.g;
    const inp = d.input;
    const t0 = d.time;
    d.endTyping();
    d.voice?.stop();
    const snap = document.createElement('canvas');
    snap.width = d.tv.ctx.canvas.width;
    snap.height = d.tv.ctx.canvas.height;
    const sx = snap.getContext('2d');
    try {
      sx.fillStyle = '#000';
      sx.fillRect(0, 0, snap.width, snap.height);
      d.sceneFn?.(sx, d.time - d.sceneT0, d);
    } catch {
      sx.drawImage(d.tv.ctx.canvas, 0, 0);
    }
    const fn = (c) => G.wordFreeze(c, snap, d.time - t0, id);
    d.scareFn = fn;
    d.fx({ saturation: 0.05, tracking: 0.35, jitter: 0.05 }, 0.15);
    d.sfx('static', 0.3, 0.18);
    const bulbOn = (g.room.bulbBase ?? 1) > 0.05;
    if (bulbOn && !g.settings?.flash) g.room.flickerBurst(0.5);
    if (id === 'gizli2') d.sfx('match', g.room.points.behind);
    else d.sfx('deckClunkAt', g.room.points.behind);
    try {
      await d.wait(0.9);
      const pre = id === 'gizli1' ? 'gz1' : 'gz2';
      await d.say(pre + '_word');
      await d.wait(0.3);
      await d.say(pre + '_word2');
      await d.wait(0.5);
    } finally {
      if (d.scareFn === fn) d.scareFn = null;
      if (!d.aborted) {
        d.fx(d.baseFx, 0.3);
        d.glitch(0.5, 0.3, false);
      }
    }
    // soru sürer: aynı cevap kutusu yeniden açılır (kaset bu arada bittiyse açılmaz)
    if (d.active && !d.aborted && inp && !d.input) {
      inp.text = '';
      inp.lastActivity = d.time;
      if (inp.deadline != null) inp.deadline += d.time - t0;
      d.input = inp;
      g.ui.beginTyping();
    }
  }

  /** Kaset bitince (ya da çıkarılınca): yol gösteren ince bildirim */
  afterTape() {
    if (!this.toasts.length) return;
    const ids = this.toasts.splice(0);
    // kasetten sonraki kendi bildirimleri (kutudan tık sesi, yol ipucu...) bitince, ekranda başka yazı yokken gösterilir
    let quiet = 0;
    const show = (tries) => {
      const g = this.g;
      if (g.mode === 'title' || g.mode === 'ending') return;
      // kaset oynarken ya da bir panel açıkken beklenir; ekrandaki başka bir bildirim en fazla ~40 sn bekletir
      if (g.mode !== 'play' || g.playingTape || g.director.active || g.loadingTape || g.panelOpen()) {
        quiet = 0;
        setTimeout(() => show(tries), 1000);
        return;
      }
      quiet = document.getElementById('toast')?.classList.contains('show') ? 0 : quiet + 1;
      if (quiet < 2 && tries < 40) {
        setTimeout(() => show(tries + 1), 1000);
        return;
      }
      const st = this.st;
      const txt = ids
        .filter((k) => st.secretPlace[k] && !st.secretTapes.includes(k))
        .map((k) => PLACES[k][st.secretPlace[k]].toast)
        .join(' ');
      if (txt) g.ui.toast(txt, 8);
    };
    setTimeout(() => show(0), this.g.debug?.fast ? 1500 : 6000);
  }

  // ------------------------------------------------------------------ yerleşim ve etkileşim
  /** Bekleyen (yerinde duran, alınmamış) gizli kaset bu nesnede mi */
  waitingAt(id) {
    const st = this.st;
    return Object.keys(PLACES).find((k) => st.secretPlace[k] && !st.secretTapes.includes(k) && PLACES[k][st.secretPlace[k]].id === id) || null;
  }

  label(id) {
    if (!id) return null;
    const k = this.waitingAt(id);
    if (k) return '<b>Kaseti al</b>';
    if (id.startsWith('gizli:')) return '';
    return null;
  }

  /** true: burada işlendi */
  async interact(id) {
    const k = this.waitingAt(id);
    if (!k) return id?.startsWith('gizli:') || false;
    const g = this.g;
    const st = this.st;
    st.secretTapes.push(k);
    g.audio.sfx('pickup');
    g.save();
    this.apply(st);
    g.refreshInventory();
    g.ui.toast(PICKUP[k], 8);
    return true;
  }

  /** room.applyStage çağırır: kasetlerin görünürlüğü, son sahnesi parçalarının temizliği */
  apply(st = this.g.state) {
    const place = st.secretPlace || {};
    const found = st.secretTapes || [];
    for (const k of Object.keys(PLACES)) {
      for (const where of ['attic', 'house']) {
        const want = place[k] === where && !found.includes(k);
        let m = this.meshes[k + ':' + where];
        if (!m && want) m = this.build(k, where);
        if (m) m.visible = want;
      }
    }
    if (!st.ending && this.fx) this.clearFx();
  }

  build(k, where) {
    const g = this.g;
    const room = g.room;
    const P = PLACES[k][where];
    const m = this.makeTape(k);
    if (where === 'house') {
      const h = g.house;
      if (!h?.built) return null;
      m.position.set(...P.pos);
      m.rotation.y = P.rot;
      h.chunks.zemin.add(m);
      room.tag(m, P.id);
    } else if (k === 'gizli1') {
      // karton kutunun içinde, boş kapların üstünde: kutuya tıklamak da onu alır
      m.position.set(-0.06, 0.135, -0.02);
      m.rotation.set(0.12, -0.5, 0.05);
      room.cardboardBox.add(m);
      m.traverse((o) => (o.userData.interact = 'tapebox'));
    } else {
      // alçak rafın en alt gözü (raf boyunca z ekseninde)
      const shelf = room.shelf;
      if (shelf) {
        m.position.set(0.02, 0.046, 0.26);
        m.rotation.y = Math.PI / 2 + 0.25;
        shelf.add(m);
      } else {
        m.position.set(-2.6, 0.046, 0.16);
        m.rotation.y = Math.PI / 2 + 0.25;
        room.scene.add(m);
      }
      room.tag(m, P.id);
    }
    this.meshes[k + ':' + where] = m;
    return m;
  }

  /** Siyah kaset, elle yazılmış etiket (Kül: isli, erimiş kenarlı) */
  makeTape(k) {
    const room = this.g.room;
    const S = SECRET_TAPES[k];
    const gr = new THREE.Group();
    room.box(0.188, 0.025, 0.104, room.mats.black, 0, 0.0125, 0, gr);
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = S.burnt ? '#cdbf9e' : '#ece6d4';
    x.fillRect(0, 0, 256, 64);
    if (S.burnt) {
      const b = x.createLinearGradient(150, 0, 256, 0);
      b.addColorStop(0, 'rgba(60,30,10,0)');
      b.addColorStop(1, 'rgba(20,10,4,.95)');
      x.fillStyle = b;
      x.fillRect(0, 0, 256, 64);
    }
    x.fillStyle = '#1c1a30';
    x.font = 'bold 24px "Caveat", cursive';
    x.fillText(S.label, 10, 42);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.036), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
    l.rotation.x = -Math.PI / 2;
    l.position.y = 0.0256;
    gr.add(l);
    return gr;
  }

  // ------------------------------------------------------------------ son sahneleri (3B)
  ensureFx() {
    if (this.fx) return this.fx;
    const room = this.g.room;
    const root = new THREE.Group();
    root.name = 'gizli-son';
    room.scene.add(root);
    this.fx = { root, camera: null, fire: null, match: null, level: 0, t: 0 };
    this.timer = setInterval(() => this.tick(0.05), 50);
    return this.fx;
  }

  clearFx() {
    clearInterval(this.timer);
    this.timer = null;
    const f = this.fx;
    this.fx = null;
    if (!f) return;
    f.root.parent?.remove(f.root);
    f.root.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.map?.dispose?.();
      o.material?.dispose?.();
    });
  }

  /** Koltuğun arkasında, tripodda kayıt yapan bir kamera (Kâmil'in): yanıp sönen kırmızı ışık */
  showCamera() {
    const f = this.ensureFx();
    if (f.camera) return;
    const P = this.g.room.points.behind;
    const cam = new THREE.Group();
    cam.position.set(P.x + 0.1, 0, P.z + 0.05);
    cam.rotation.y = 0.12;
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.32), dark);
    body.position.y = 1.2;
    cam.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.4 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.2, -0.21);
    cam.add(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0x223355 }));
    glass.position.set(0, 1.2, -0.272);
    glass.rotation.y = Math.PI;
    cam.add(glass);
    for (const a of [0, 2.1, 4.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), dark);
      leg.position.set(Math.sin(a) * 0.22, 0.56, Math.cos(a) * 0.22);
      leg.rotation.set(Math.cos(a) * 0.36, 0, -Math.sin(a) * 0.36);
      cam.add(leg);
    }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010 }));
    led.position.set(0.055, 1.29, -0.15);
    cam.add(led);
    const red = new THREE.PointLight(0xff2010, 0.6, 1.6, 2);
    red.position.set(0.05, 1.3, -0.25);
    cam.add(red);
    f.root.add(cam);
    f.camera = { cam, led, red };
  }

  /** Kibrit (oyuncunun elinde) ve ardından tavan arasını saran alevler. level 0..1 */
  fire(level) {
    const f = this.ensureFx();
    const room = this.g.room;
    if (!f.fire) {
      const tex = flameTexture();
      const sprites = [];
      // alevler duvar diplerinde ve eşyaların yanında, dar ve titrek dillerdir
      const spots = [[-0.7, 1.0], [-0.95, 1.1], [0.8, 0.9], [1.0, 0.75], [-1.6, -0.6], [-1.75, -0.4], [1.5, -0.4], [1.62, -0.2], [-0.3, -1.4], [-0.1, -1.5], [0.9, -1.5], [-1.9, 1.6], [1.8, 1.4], [0, 2.1], [0.3, 2.2], [-2.3, 0.4], [2.3, 0.2], [-1.2, -1.9]];
      for (const [x, z] of spots) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffa860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        s.position.set(x, 0.3, z);
        s.scale.set(0.01, 0.01, 1);
        f.root.add(s);
        sprites.push(s);
      }
      const lights = [new THREE.PointLight(0xff7a2a, 0, 7, 1.6), new THREE.PointLight(0xff5a18, 0, 7, 1.6)];
      lights[0].position.set(-0.8, 0.6, 0.6);
      lights[1].position.set(1.0, 0.7, -1.0);
      for (const l of lights) f.root.add(l);
      f.fire = { sprites, lights };
    }
    f.level = level;
    if (level > 0.3) {
      room.setBulb(0, 1.5);
      room.moon.color.set(0xff9a5a);
    }
  }

  /** Oyuncunun elinde yanan kibrit: küçük, titrek bir ışık */
  match(on) {
    const f = this.ensureFx();
    if (on && !f.match) {
      const l = new THREE.PointLight(0xffb050, 0, 2.5, 2);
      const p = this.g.room.points.chairLeg;
      l.position.set(p.x + 0.2, 0.95, p.z - 0.15);
      f.root.add(l);
      f.match = l;
    }
    if (f.match) f.match.userData.on = on;
  }

  tick(dt) {
    const f = this.fx;
    if (!f) return;
    f.t += dt;
    const t = f.t;
    if (f.camera) {
      const on = Math.floor(t * 1.4) % 2 === 0;
      f.camera.led.visible = on;
      f.camera.red.intensity = on ? 0.6 : 0.05;
    }
    if (f.match) f.match.intensity = f.match.userData.on ? 1.4 + Math.sin(t * 31) * 0.3 + Math.sin(t * 13) * 0.2 : 0;
    if (f.fire) {
      const k = f.fire.cur = (f.fire.cur || 0) + (f.level - (f.fire.cur || 0)) * Math.min(1, dt * 0.6);
      f.fire.sprites.forEach((s, i) => {
        const on = Math.max(0, Math.min(1, k * 1.8 - i * 0.09));
        const h = (0.35 + on * (0.6 + (i % 3) * 0.25)) * (0.82 + 0.18 * Math.sin(t * 9 + i * 2.3) + 0.1 * Math.sin(t * 23 + i));
        s.scale.set(on * h * 0.42, on * h, 1);
        s.position.y = (on * h) / 2 - 0.02;
        s.material.opacity = on * (0.5 + 0.2 * Math.sin(t * 17 + i));
      });
      f.fire.lights.forEach((l, i) => (l.intensity = k * (5 + Math.sin(t * 13 + i * 2) * 1.2 + Math.sin(t * 29 + i) * 0.8)));
    }
  }

  // ------------------------------------------------------------------ son
  /** Gizli kaset izlenip bittiğinde (main.onTapeDone): oyun kendi sonuyla biter */
  async finish(n) {
    const g = this.g;
    const st = g.state;
    st.ending = SECRET_TAPES[n].ending;
    st.endings = [...new Set([...(st.endings || []), st.ending])];
    g.save();
    g.refreshInventory();
    g.fade(1);
    await sleep(2200);
    g.releasePointer();
    g.mode = 'ending';
    g.ui.ending(st.ending, st.secrets);
    g.fade(0);
    document.getElementById('btn-ending-menu')?.focus({ preventScroll: true });
  }
}

let FLAME = null;
function flameTexture() {
  if (FLAME) return FLAME;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'lighter';
  // üç dil: ortada uzun, yanlarda kısa; kökte sarı-beyaz, uçta koyu kırmızı ve saydam
  for (const [cx, top, w, a] of [[32, 6, 18, 0.9], [20, 40, 12, 0.55], [44, 30, 12, 0.6]]) {
    const g = x.createLinearGradient(0, 124, 0, top);
    g.addColorStop(0, `rgba(255,236,170,${a})`);
    g.addColorStop(0.35, `rgba(255,150,50,${a * 0.85})`);
    g.addColorStop(0.75, `rgba(210,60,15,${a * 0.4})`);
    g.addColorStop(1, 'rgba(120,20,0,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx, top);
    x.quadraticCurveTo(cx + w * 1.1, 70, cx + w * 0.7, 124);
    x.lineTo(cx - w * 0.7, 124);
    x.quadraticCurveTo(cx - w * 1.1, 70, cx, top);
    x.fill();
  }
  FLAME = new THREE.CanvasTexture(c);
  FLAME.colorSpace = THREE.SRGBColorSpace;
  return FLAME;
}

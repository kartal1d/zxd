// Kare hızı yönetimi: dinamik çözünürlük (kare süresine göre iç çizim yüksekliği), telefonda 60 fps tavanı,
// gölge haritası güncelleme sıklığı, bölgeye göre ışık seti ve düşük kalitede ucuz malzemeler.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Dinamik çözünürlük: tavan ile taban arasında geometrik basamaklar (0 = tavan).
const STEPS = 8;
const DOWN_MS = 20.5; // ~49 fps altı: hızla bir (çok yavaşsa iki) basamak düş
const FAST_MS = 17.6; // 60 Hz'e yetişiyor: yavaşça bir basamak çık (başarısız olan basamağa bir süre dönme)
const WIN = 0.5; // ölçüm penceresi (sn)
const UP_AFTER = 4; // çıkmadan önce kesintisiz hızlı geçmesi gereken süre (sn)
// telefon: iç çizim yüksekliği (piksel) tavanı ve tabanı; açılış basamağı ortada
const TOUCH_TOP = 720;
const TOUCH_FLOOR = 432;
const TOUCH_START = 3;
// tavan arası ışıkları (TV, koridor, kapı) yalnız tavan arası ve sahanlıkta yanar; ev ışığı yalnız evde
const ATTIC_SET = new Set(['cati', 'sahanlik']);
const ATTIC_VIEW = new Set(['cati', 'sahanlik', 'merdiven']);

// ------------------------------------------------------------------ ucuz malzemeler
// Düşük kalitede MeshStandardMaterial'ler aynı nesneler olarak kalır (kod onlara dokunmaya devam eder),
// yalnız gölgelendiricileri değişir: Lambert yayılımı + ucuz bir GGX parlaması (karekök ve üs yok;
// Schlick-Smith görünürlüğü, sabit 0.04 / metalikten yansıma rengi). Fiziksel modelin çoklu saçılma,
// IBL ve tam Smith görünürlüğü hesapları düşer; dolgu başına ışık başına işlem kabaca yarıya iner.
// Pürüzlü yüzeylerin el feneriyle sıyırma açılardaki hafif parlaması (karanlık sahnelerin çoğu) korunur.
const CHEAP_PARS = /* glsl */ `
varying vec3 vViewPosition;
uniform float roughness;
uniform float metalness;
struct CheapMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float alpha;
	float specularStrength;
};
void RE_Direct_Cheap( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in CheapMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
#ifndef CHEAP_NO_SPEC
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotNH = saturate( dot( geometryNormal, halfDir ) );
	float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
	float a2 = material.alpha * material.alpha;
	float dd = dotNH * dotNH * ( a2 - 1.0 ) + 1.0;
	float k = material.alpha * 0.5;
	float vis = 0.25 / ( ( dotNL * ( 1.0 - k ) + k ) * ( dotNV * ( 1.0 - k ) + k ) );
	reflectedLight.directSpecular += irradiance * material.specularColor * ( a2 * RECIPROCAL_PI / ( dd * dd ) * vis * material.specularStrength );
#endif
}
void RE_IndirectDiffuse_Cheap( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in CheapMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Cheap
#define RE_IndirectDiffuse RE_IndirectDiffuse_Cheap
`;
const CHEAP_MAT = /* glsl */ `
CheapMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalness );
material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalness );
material.alpha = pow2( max( roughness, 0.0525 ) );
material.specularStrength = specularStrength;
`;
let cheapFrag = null;
function cheapCompile(sh) {
  if (this.isMeshPhysicalMaterial) return;
  cheapFrag ||= THREE.ShaderLib.lambert.fragmentShader
    .replace('#include <lights_lambert_pars_fragment>', CHEAP_PARS)
    .replace('#include <lights_lambert_fragment>', CHEAP_MAT)
    .replace('reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance', 'reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + totalEmissiveRadiance');
  sh.vertexShader = THREE.ShaderLib.lambert.vertexShader;
  sh.fragmentShader = (cheapSpec ? '' : '#define CHEAP_NO_SPEC\n') + cheapFrag;
}
let cheapSpec = true;
function cheapKey() {
  return this.isMeshPhysicalMaterial ? '' : cheapSpec ? 'ucuz' : 'ucuz-yayinik';
}
/** ölçüm için: parlama terimi açık / kapalı */
export function setCheapSpec(on, scene) {
  cheapSpec = !!on;
  scene?.traverse((o) => {
    for (const m of [].concat(o.material || [])) if (m.isMeshStandardMaterial) m.needsUpdate = true;
  });
}

/** Düşük kalite: tüm MeshStandardMaterial'lerin gölgelendiricisini ucuzlatır (açık/kapalı) */
export function setCheapMaterials(on, scene) {
  const P = THREE.MeshStandardMaterial.prototype;
  if (on === (P.onBeforeCompile === cheapCompile)) return;
  if (on) {
    P.onBeforeCompile = cheapCompile;
    P.customProgramCacheKey = cheapKey;
  } else {
    delete P.onBeforeCompile;
    delete P.customProgramCacheKey;
  }
  scene?.traverse((o) => {
    for (const m of [].concat(o.material || [])) if (m.isMeshStandardMaterial) m.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ durağan ağları birleştirme

/** Oyun nesnelerinin özelliklerinden (3 kat derinliğe kadar) erişilen tüm Object3D'ler: bunlar kodla değiştirilebilir */
function referenced(game) {
  const out = new Set();
  const seen = new Set();
  const walk = (v, d) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (v.isObject3D) {
      out.add(v);
      return;
    }
    if (d <= 0 || v.isMaterial || v.isTexture || v.isBufferGeometry || ArrayBuffer.isView(v)) return;
    if (Array.isArray(v)) for (const x of v) walk(x, d - 1);
    else if (v instanceof Map || v instanceof Set) for (const x of v.values()) walk(x, d - 1);
    else for (const k of Object.keys(v)) walk(v[k], d - 1);
  };
  for (const k of ['room', 'house', 'finds', 'scares', 'rare', 'secrets', 'flow', 'walk', 'director', 'touch']) {
    const sys = game[k];
    if (!sys) continue;
    seen.add(sys);
    for (const p of Object.keys(sys)) {
      const v = sys[p];
      if (v === game || v === game.room?.scene || v === game.room?.camera) continue;
      // alt sistemler (oda -> tavan arası vb.) bir kat daha derin taranır
      walk(v, v && v.constructor && v.constructor !== Object && !Array.isArray(v) && !v.isObject3D ? 3 : 2);
    }
  }
  return out;
}

/**
 * Kodun hiç dokunmadığı (hiçbir özellikten erişilmeyen, etkileşimsiz, saydam olmayan, alt ağı içinde değişken
 * nesne bulunmayan) durağan ağları, aynı malzeme ve aynı hücrede tek ağda birleştirir: çizim çağrısı azalır.
 * root: taranan kök (doğrudan çocukları ve alt grupları), cell(mesh, merkez): gruplama anahtarı (oda), dest(cell): hedef ebeveyn.
 */
export function mergeStatic(game, root, { cell = () => '', dest = () => root } = {}) {
  const refs = referenced(game);
  const groups = new Map();
  const center = new THREE.Vector3();
  // gruplara inilir (birleşik ağ aynı grubun çocuğu olur: grup taşınır / gizlenirse o da gelir);
  // koddan erişilen ya da etkileşimli gruplara ve ağlara hiç dokunulmaz
  const visit = (o) => {
    for (const c of o.children) {
      if (refs.has(c) || c.userData.interact || c.userData.occ || !c.visible || c.isLight) continue;
      if (!c.isMesh) {
        if (c.type === 'Group' || c.type === 'Object3D') visit(c);
        continue;
      }
      const m = c.material;
      const g = c.geometry;
      if (c.isInstancedMesh || c.isSkinnedMesh || c.children.length || Array.isArray(m) || m.transparent || c.renderOrder || !c.frustumCulled || c.layers.mask !== 1) continue;
      if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv || g.morphAttributes.position) continue;
      if (!g.boundingBox) g.computeBoundingBox();
      g.boundingBox.getCenter(center).applyMatrix4(c.matrixWorld);
      const top = o === root;
      const cl = top ? cell(c, center) : '';
      const key = o.uuid + '|' + m.uuid + '|' + cl + '|' + (c.castShadow ? 1 : 0) + (c.receiveShadow ? 1 : 0);
      let e = groups.get(key);
      if (!e) groups.set(key, (e = { mat: m, cell: cl, parent: top ? dest(cl) : o, list: [] }));
      e.list.push(c);
    }
  };
  root.updateMatrixWorld(true);
  visit(root);
  const inv = new THREE.Matrix4();
  const mtx = new THREE.Matrix4();
  let removed = 0, added = 0;
  for (const e of groups.values()) {
    if (e.list.length < 2) continue;
    const parent = e.parent;
    inv.copy(parent.matrixWorld).invert();
    const geos = [];
    for (const c of e.list) {
      const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      g.applyMatrix4(mtx.multiplyMatrices(inv, c.matrixWorld));
      geos.push(g);
    }
    const mg = mergeGeometries(geos, false);
    if (!mg) continue;
    const mesh = new THREE.Mesh(mg, e.mat);
    mesh.castShadow = e.list[0].castShadow;
    mesh.receiveShadow = e.list[0].receiveShadow;
    if (e.cell) mesh.userData.room = e.cell;
    mesh.userData.merged = e.list.length;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
    for (const c of e.list) c.parent.remove(c);
    removed += e.list.length;
    added++;
  }
  return { removed, added };
}

export class Perf {
  constructor(game) {
    this.g = game;
    this.quality = 'auto';
    this.level = 0;
    this.avg = 16.7;
    this.t = 0; // ölçüm penceresi
    this.hold = 3; // açılışta / değişiklikten sonra ölçme (yükleme takılmaları)
    this.fastT = 0;
    this.upAt = -1e9;
    this.failUntil = [];
    this.fails = [];
    this.clock = 0;
    this.frameNo = 0;
    this.lightSetName = 'attic';
    this.tvVisible = true;
    this.capMs = 0;
    this.nextAt = 0;
    this.freeze = false;
  }

  /** Kalite ayarını uygular (renderer + composer kurulduktan sonra çağrılır) */
  setQuality(q) {
    this.quality = q === 'low' || q === 'high' ? q : 'auto';
    // telefonda ortadan başla (ilk saniyelerde takılmasın), masaüstünde tavandan
    this.level = this.quality === 'high' ? 0 : this.g.isTouch ? TOUCH_START : 0;
    this.hold = 3;
    this.avg = 16.7;
    this.fastT = 0;
    // telefonda 60 fps tavanı (90/120 Hz ekranlarda GPU'yu boşuna 1.5-2 kat çalıştırmasın)
    this.capMs = this.g.isTouch ? 1000 / 60 : 0;
    this.applyScale();
    const r = this.g.room;
    for (const l of [r.bulb, r.moon]) {
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
    }
  }

  /** Çözünürlüğün tavanı ve tabanı (piksel oranı olarak) */
  range() {
    const dpr = window.devicePixelRatio || 1;
    const h = Math.max(1, window.innerHeight);
    if (this.g.isTouch) {
      // telefon: iç çizim yüksekliği en çok 720 px (en çok cihaz oranı, en çok 2), en az 432 px.
      // Arayüz DOM'da olduğu için keskin kalır; yalnız 3B sahne ölçeklenir.
      const top = Math.min(Math.min(dpr, 2), TOUCH_TOP / h);
      return [top, Math.min(top, TOUCH_FLOOR / h)];
    }
    if (this.quality === 'high') {
      const top = Math.min(dpr, 2);
      return [top, top];
    }
    // masaüstü: eskisi gibi (Düşük = 0,75); yetişemezse 450 px'e (en çok tavanın %60'ına) iner
    const top = Math.min(dpr, 1) * (this.quality === 'low' ? 0.75 : 1);
    return [top, Math.min(top, Math.max(top * 0.6, 450 / h))];
  }

  pixelRatio() {
    const [top, bottom] = this.range();
    return top * Math.pow(bottom / top, this.level / (STEPS - 1));
  }

  applyScale() {
    const g = this.g;
    const pr = Math.round(this.pixelRatio() * 1000) / 1000;
    if (g.renderer.getPixelRatio() !== pr) {
      g.renderer.setPixelRatio(pr);
      g.composer?.setPixelRatio(pr);
    }
    if (g.bloom) g.bloom.enabled = this.level < STEPS - 2;
  }

  /** Telefonda 60 fps tavanı: bu rAF atlanmalı mı (90/120 Hz ekranlar) */
  skipFrame(now) {
    if (!this.capMs) return false;
    if (now < this.nextAt - 2) return true;
    this.nextAt = Math.max((this.nextAt || 0) + this.capMs, now);
    return false;
  }

  /** Her kare çizimden önce: ölçüm, uyarlama, gölge güncelleme takvimi */
  beforeRender(rawMs) {
    this.frameNo++;
    const dt = rawMs / 1000;
    this.clock += Math.min(dt, 0.1);
    if (this.quality !== 'high' || this.g.isTouch) this.adapt(rawMs);
    this.scheduleShadows();
  }

  /** Dinamik çözünürlük: yavaşsa hızla düş, uzun süre hızlıysa yavaşça çık (çıkılan basamak kaldırılamazsa bir süre deneme) */
  adapt(ms) {
    // sekme arka plandayken / takılmalarda (yükleme, derleme) ve ölçüm araçları dondurunca ölçme
    if (this.freeze || !(ms > 0) || ms > 250 || document.hidden) return;
    if (this.hold > 0) {
      this.hold -= ms / 1000;
      return;
    }
    // tek tük takılmalar ortalamayı fazla saptırmasın
    this.avg += (Math.min(ms, 50) - this.avg) * 0.12;
    this.t += ms / 1000;
    if (this.t < WIN) return;
    this.t = 0;
    const n = STEPS - 1;
    if (this.avg > DOWN_MS && this.level < n) {
      // yeni çıkılan basamak kaldırılamadıysa bir süre o basamağa dönme (her başarısızlıkta süre ikiye katlanır)
      if (this.clock - this.upAt < 10) {
        const f = (this.fails[this.level] = (this.fails[this.level] || 0) + 1);
        this.failUntil[this.level] = this.clock + 30 * 2 ** Math.min(f - 1, 4);
      }
      this.level = Math.min(n, this.level + (this.avg > 28 ? 2 : 1));
      this.fastT = 0;
      this.changed();
    } else if (this.avg < FAST_MS && this.level > 0) {
      this.fastT += WIN;
      if (this.fastT >= UP_AFTER && !(this.failUntil[this.level - 1] > this.clock)) {
        this.level--;
        this.upAt = this.clock;
        this.fastT = 0;
        this.changed();
      }
    } else this.fastT = 0;
  }

  changed() {
    this.applyScale();
    this.hold = 0.35;
    this.avg = 16.7;
  }

  scheduleShadows() {
    const g = this.g;
    const r = g.room;
    if (!g.renderer.shadowMap.enabled) return;
    const z = g.house?.zone || 'cati';
    const view = ATTIC_VIEW.has(z);
    // ampul hafifçe sallanır: 30 Hz güncelleme gözle ayırt edilmez; ışık sönükken ya da görünmezken hiç
    if (view && r.bulb.intensity > 0.01 && (this.frameNo & 1) === 0) r.bulb.shadow.needsUpdate = true;
    // ay ışığı sabit; yalnızca kıpırdayan eşyalar (kapı, örtü) için seyrek güncelleme
    if (view && this.frameNo % 3 === 1) r.moon.shadow.needsUpdate = true;
  }

  /** Bölgeye göre ışık seti. Yalnızca iki düzen var (tavan arası / ev); ikisi de ev kurulurken önceden derlenir. */
  setZoneLights(z) {
    const name = ATTIC_SET.has(z) ? 'attic' : 'house';
    this.tvVisible = ATTIC_VIEW.has(z);
    this.g.tv.sampleAvg = this.tvVisible;
    if (name === this.lightSetName) return;
    this.applyLightSet(name);
  }

  applyLightSet(name) {
    this.lightSetName = name;
    const r = this.g.room;
    const on = name === 'attic';
    for (const l of [r.tvLight, r.corridorLight, r.spill, r.attic?.doorTapeLight]) if (l) l.visible = on;
  }

  /**
   * TV ekranının ortalama rengi: tuval dokusu GPU'da 16x16'ya küçültülür ve eşzamansız okunur.
   * true: okuma başlatıldı ya da sürüyor; false: desteklenmiyor (TV eski yolu kullanır).
   */
  sampleTv() {
    const g = this.g;
    const R = g.renderer;
    if (this.tvAvgOff || !R?.readRenderTargetPixelsAsync) return false;
    if (this.tvBusy) return true;
    if (!this.tvRT) {
      const N = 16;
      this.tvRT = new THREE.WebGLRenderTarget(N, N, { depthBuffer: false });
      this.tvBuf = new Uint8Array(N * N * 4);
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: g.tv.texture } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        // doku sRGB olarak çözülür; eski 2D yoluyla aynı ortalama için yeniden sRGB'ye çevrilir
        fragmentShader: `uniform sampler2D map; varying vec2 vUv;
          void main() {
            vec3 c = texture2D(map, vUv).rgb;
            c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
            gl_FragColor = vec4(c, 1.0);
          }`,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      this.tvScene = new THREE.Scene();
      this.tvScene.add(quad);
      this.tvCam = new THREE.Camera();
    }
    const prev = R.getRenderTarget();
    R.setRenderTarget(this.tvRT);
    R.render(this.tvScene, this.tvCam);
    R.setRenderTarget(prev);
    this.tvBusy = true;
    R.readRenderTargetPixelsAsync(this.tvRT, 0, 0, this.tvRT.width, this.tvRT.height, this.tvBuf)
      .then(() => g.tv.setAvgBytes(this.tvBuf))
      .catch(() => (this.tvAvgOff = true))
      .finally(() => (this.tvBusy = false));
    // three, okuma bitene dek PIXEL_PACK tamponunu bağlı bırakıyor: başka bir readPixels bozulmasın
    const gl = R.getContext();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    return true;
  }

  /** Ev ilk kurulduğunda: iki ışık düzeni için de gölgelendiricileri arka planda derle (ilk inişte takılma olmasın) */
  precompile() {
    const g = this.g;
    const R = g.renderer;
    const sc = g.room.scene;
    const cam = g.room.camera;
    if (!R.compileAsync) return;
    const cur = this.lightSetName;
    try {
      for (const name of ['attic', 'house']) {
        this.applyLightSet(name);
        R.compileAsync(sc, cam)?.catch?.(() => {});
      }
    } catch {
      /* eski sürücü */
    }
    this.applyLightSet(cur);
  }
}

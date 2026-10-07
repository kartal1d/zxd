// Kare hızı yönetimi: çözünürlük (Otomatik kalite), gölge haritası güncelleme sıklığı,
// bölgeye göre ışık seti. Görüntüyü değiştirmeden GPU/CPU yükünü azaltır.

import * as THREE from 'three';

// Otomatik modda çözünürlük basamakları (cihaz piksel oranı tavanının katı). Son basamakta parıltı da kapanır.
const LEVELS = [1, 0.85, 0.72, 0.6, 0.5, 0.5];
const SLOW_MS = 24; // ~42 fps altı: bir basamak düş
const FAST_MS = 17.6; // 60 Hz'e yetişiyor: bir basamak çık (denemesi başarısız olduysa bir süre bekle)
// tavan arası ışıkları (TV, koridor, kapı) yalnız tavan arası ve sahanlıkta yanar; ev ışığı yalnız evde
const ATTIC_SET = new Set(['cati', 'sahanlik']);
const ATTIC_VIEW = new Set(['cati', 'sahanlik', 'merdiven']);

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
  }

  /** Kalite ayarını uygular (renderer + composer kurulduktan sonra çağrılır) */
  setQuality(q) {
    this.quality = q === 'low' || q === 'high' ? q : 'auto';
    if (this.quality !== 'auto') this.level = 0;
    this.hold = 3;
    this.avg = 16.7;
    this.applyScale();
    const r = this.g.room;
    for (const l of [r.bulb, r.moon]) {
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
    }
  }

  pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    if (this.quality === 'high') return Math.min(dpr, 2);
    if (this.quality === 'low') return Math.min(dpr, 1) * 0.75;
    return Math.min(dpr, 1) * LEVELS[this.level];
  }

  applyScale() {
    const g = this.g;
    const pr = Math.round(this.pixelRatio() * 100) / 100;
    if (g.renderer.getPixelRatio() !== pr) {
      g.renderer.setPixelRatio(pr);
      g.composer?.setPixelRatio(pr);
    }
    if (g.bloom) g.bloom.enabled = !(this.quality === 'auto' && this.level >= LEVELS.length - 1);
  }

  /** Her kare çizimden önce: ölçüm, uyarlama, gölge güncelleme takvimi */
  beforeRender(rawMs) {
    this.frameNo++;
    const dt = rawMs / 1000;
    this.clock += Math.min(dt, 0.1);
    if (this.quality === 'auto') this.adapt(rawMs);
    this.scheduleShadows();
  }

  adapt(ms) {
    // sekme arka plandayken / takılmalarda (yükleme, kilit) ölçme
    if (!(ms > 0) || ms > 1000 || document.hidden) return;
    if (this.hold > 0) {
      this.hold -= ms / 1000;
      return;
    }
    // tek tük takılmalar ortalamayı fazla saptırmasın
    this.avg += (Math.min(ms, 100) - this.avg) * 0.06;
    this.t += ms / 1000;
    if (this.t < 1.5) return;
    this.t = 0;
    const n = LEVELS.length - 1;
    if (this.avg > SLOW_MS && this.level < n) {
      // yeni çıkılan basamak kaldırılamadıysa bir süre o basamağa dönme (her başarısızlıkta süre ikiye katlanır)
      if (this.clock - this.upAt < 12) {
        const f = (this.fails[this.level] = (this.fails[this.level] || 0) + 1);
        this.failUntil[this.level] = this.clock + 45 * 2 ** Math.min(f - 1, 4);
      }
      this.level++;
      this.fastT = 0;
      this.changed();
    } else if (this.avg < FAST_MS && this.level > 0) {
      this.fastT += 1.5;
      if (this.fastT >= 6 && !(this.failUntil[this.level - 1] > this.clock)) {
        this.level--;
        this.upAt = this.clock;
        this.fastT = 0;
        this.changed();
      }
    } else this.fastT = 0;
  }

  changed() {
    this.applyScale();
    this.hold = 0.6;
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

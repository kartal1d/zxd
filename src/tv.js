import * as THREE from 'three';

export const TV_W = 640;
export const TV_H = 480;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float time, noise, aberration, tracking, saturation, power, jitter, roll, brightness, glitch, pixel, scan, vignette;
uniform vec3 tint;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 barrel(vec2 uv) { vec2 c = uv * 2.0 - 1.0; c *= 1.0 + 0.055 * dot(c, c); return c * 0.5 + 0.5; }

void main() {
  vec2 uv = barrel(vUv);
  vec3 glass = vec3(0.010, 0.012, 0.011) + 0.025 * smoothstep(0.9, 0.0, distance(vUv, vec2(0.32, 0.72)));

  // açma / kapama: önce yatay çizgi, sonra nokta
  float sx = smoothstep(0.0, 0.3, power);
  float sy = max(0.003, smoothstep(0.3, 1.0, power));
  vec2 pu = (uv - 0.5) / vec2(max(sx, 0.001), sy) + 0.5;
  if (power <= 0.001 || pu.x < 0.0 || pu.x > 1.0 || pu.y < 0.0 || pu.y > 1.0) {
    gl_FragColor = vec4(glass, 1.0);
    return;
  }
  uv = pu;

  // dikey kayma
  uv.y = fract(uv.y + roll);
  // satır titremesi
  float line = floor(uv.y * 240.0);
  uv.x += (hash(vec2(line, floor(time * 30.0))) - 0.5) * jitter * 0.018;
  // izleme (tracking) bandı
  float bandY = fract(time * 0.11);
  float band = smoothstep(0.07, 0.0, abs(uv.y - bandY)) * tracking;
  uv.x += band * 0.035 * sin(uv.y * 90.0 + time * 25.0);
  // blok glitch
  float gb = hash(vec2(floor(uv.y * 18.0), floor(time * 14.0)));
  if (gb < glitch * 0.35) uv.x += (hash(vec2(gb, time)) - 0.5) * 0.25 * glitch;
  // pikselleşme
  if (pixel > 1.0) { vec2 g = vec2(640.0, 480.0) / pixel; uv = (floor(uv * g) + 0.5) / g; }

  float ab = aberration * 0.0035 + band * 0.01;
  vec3 col;
  col.r = texture2D(map, vec2(uv.x + ab, uv.y)).r;
  col.g = texture2D(map, uv).g;
  col.b = texture2D(map, vec2(uv.x - ab, uv.y)).b;

  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(gray), col, saturation) * tint;

  float n = hash(uv * vec2(640.0, 480.0) + fract(time * 61.0) * 100.0) - 0.5;
  col += n * (noise + band * 0.6);
  col += band * 0.12 * hash(vec2(time, line));
  col *= 1.0 - scan * (0.5 + 0.5 * cos(uv.y * 480.0 * 3.14159));

  vec2 vc = (vUv - 0.5) * vec2(1.05, 1.15);
  col *= mix(1.0, smoothstep(0.78, 0.25, length(vc)), vignette);

  // kapanırken parlak çizgi
  col += (1.0 - sy) * 0.8 * smoothstep(0.02, 0.0, abs(vUv.y - 0.5));
  gl_FragColor = vec4(max(col, 0.0) * brightness + glass, 1.0);
}`;

export const SCREEN_DEFAULT = {
  noise: 0.05,
  aberration: 0.6,
  tracking: 0.15,
  saturation: 1,
  jitter: 0.15,
  roll: 0,
  brightness: 1.5,
  glitch: 0,
  pixel: 0,
  scan: 0.16,
  vignette: 0.9,
};

export class TVScreen {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = TV_W;
    this.canvas.height = TV_H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    const u = { map: { value: this.texture }, time: { value: 0 }, power: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) } };
    for (const [k, v] of Object.entries(SCREEN_DEFAULT)) u[k] = { value: v };
    this.material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, toneMapped: true });
    this.u = u;
    /** Shader parametreleri: tween'lenebilir düz nesne. */
    this.p = { ...SCREEN_DEFAULT, power: 0, tintR: 1, tintG: 1, tintB: 1 };

    // geri sarma tamponu: son ~10 saniye, 12 fps, yarım çözünürlük
    this.bufSize = 120;
    this.frames = [];
    this.meta = [];
    this.head = 0;
    this.count = 0;
    this.recT = 0;

    // VCR modu görünümü (ileri/geri sarma, duraklatma): kasetin kendi ayarlarının (p) üstüne biner,
    // onları değiştirmez; böylece mod bitince kasetin o anki görüntüsü (tween'ler dahil) aynen kalır.
    this.over = null;
    // geri sarma bitince kısa sarsıntı: gerçek zamanda söner (duraklatılmış görüntüde takılı kalmaz)
    this.kickFx = null;

    this.avg = new THREE.Color(0, 0, 0);
    this.small = document.createElement('canvas');
    this.small.width = this.small.height = 4;
    this.smallCtx = this.small.getContext('2d', { willReadFrequently: true });
    this.avgTick = 0;
  }

  clearBuffer() {
    this.count = 0;
    this.head = 0;
    this.recT = 0;
    this.meta.fill(null);
  }

  /** VCR modu görünümü ({ jitter, tracking, noise } alt sınırları) ya da null. */
  setOverlay(o) {
    this.over = o;
  }

  /** Kısa glitch sarsıntısı (gerçek zamanda söner). */
  kick(amount, dur) {
    this.kickFx = { amount, dur: Math.max(dur, 0.01), t: 0 };
  }

  /** Mevcut kareyi geri sarma tamponuna yazar. */
  record(dt, meta) {
    this.recT += dt;
    if (this.recT < 1 / 12) return;
    this.recT = 0;
    let c = this.frames[this.head];
    if (!c) {
      c = this.frames[this.head] = document.createElement('canvas');
      c.width = TV_W / 2;
      c.height = TV_H / 2;
    }
    c.getContext('2d').drawImage(this.canvas, 0, 0, TV_W / 2, TV_H / 2);
    this.meta[this.head] = meta;
    this.head = (this.head + 1) % this.bufSize;
    this.count = Math.min(this.count + 1, this.bufSize);
  }

  /** n = 0 en yeni kare, n = count-1 en eski kare. */
  frameAt(n) {
    if (this.count === 0) return null;
    n = Math.max(0, Math.min(this.count - 1, n));
    const i = (this.head - 1 - n + this.bufSize * 2) % this.bufSize;
    return { canvas: this.frames[i], meta: this.meta[i] };
  }

  update(dt, time) {
    const p = this.p;
    const o = this.over;
    for (const k of Object.keys(SCREEN_DEFAULT)) this.u[k].value = o && o[k] != null ? Math.max(p[k], o[k]) : p[k];
    const kf = this.kickFx;
    if (kf) {
      kf.t += dt;
      const a = kf.amount * Math.max(0, 1 - kf.t / kf.dur);
      if (kf.t >= kf.dur) this.kickFx = null;
      this.u.glitch.value = Math.max(this.u.glitch.value, a);
      this.u.jitter.value = Math.max(this.u.jitter.value, a * 2);
      this.u.noise.value = Math.max(this.u.noise.value, a * 0.25);
    }
    this.u.power.value = p.power;
    this.u.time.value = time;
    this.u.tint.value.setRGB(p.tintR, p.tintG, p.tintB);
    this.texture.needsUpdate = true;

    if (++this.avgTick % 4 === 0) {
      this.smallCtx.drawImage(this.canvas, 0, 0, 4, 4);
      const d = this.smallCtx.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
      }
      const n = (d.length / 4) * 255;
      this.avg.setRGB((r / n) * p.tintR, (g / n) * p.tintG, (b / n) * p.tintB, THREE.SRGBColorSpace);
    }
  }
}

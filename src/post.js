// Düşük kalite çizim zinciri: sahne doğrudan tuvale çizilir (ton eşleme, sRGB dönüşümü ve film greni
// malzemelerin içinde), ardından tek bir tam ekran üçgen kenar karartmasını çarpımsal karıştırmayla ekler.
// EffectComposer'ın ara hedefi (yarım kayan nokta, ekran boyu), gren geçişi ve çıkış geçişi kalkar:
// telefonlarda iki tam ekran okuma/yazma ve hedef çözümlemesi yerine döşemenin içinde kalan tek bir karıştırma.

import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Kenar karartması: sonuç = hedef * kaynak (ZERO, SRC_COLOR). Eski zincirde ton eşlemeden önce doğrusal
// ışıkta uygulanıyordu; ACES'in koyu uçtaki dikliği yüzünden oyunun çoğunu oluşturan koyu tonlarda ekran
// uzayındaki karşılığı aşağı yukarı aynı çarpan (parlak tonlarda daha zayıf; onlar köşelerde nadir).
const FRAG = /* glsl */ `
uniform float vignette;
varying vec2 vUv;
void main() {
  float v = smoothstep(0.95, 0.3, length(vUv - 0.5));
  gl_FragColor = vec4(vec3(mix(1.0, v, vignette)), 1.0);
}`;

// Film greni malzemelerin içinde, ton eşlemeden hemen önce (doğrusal ışık; eski gren geçişiyle aynı formül):
// yalnız tuvale doğrudan çizilen (TONE_MAPPING tanımlı) programlarda etkin, ara hedeflere çizimde etkisiz.
// Her kare değişen tohum: kamera konumu (nefes salınımı kamerayı her kare kımıldatır; duraklatınca gren de durur,
// eskiden de oyun saatine bağlıydı).
const GRAIN = /* glsl */ `
#if defined( TONE_MAPPING )
	{
		vec2 grainP = gl_FragCoord.xy * 1.37 + fract( dot( cameraPosition, vec3( 17.13, 113.71, 71.37 ) ) ) * 100.0;
		float grainN = fract( sin( dot( grainP, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5;
		gl_FragColor.rgb += grainN * 0.06 * ( 0.4 + gl_FragColor.rgb );
	}
#endif
`;

export function installGrain() {
  const C = THREE.ShaderChunk;
  if (!C.tonemapping_fragment.includes('grainN')) C.tonemapping_fragment = GRAIN + C.tonemapping_fragment;
}

export class LiteComposer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.uniforms = { time: { value: 0 }, amount: { value: 0.06 }, vignette: { value: 0.55 }, fade: { value: 0 } };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });
    installGrain();
    // ekranı örten tek üçgen (dörtgenin köşegen dikişi yok, daha az parça)
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const tri = new THREE.Mesh(geo, this.material);
    tri.frustumCulled = false;
    this.overlay = new THREE.Scene();
    this.overlay.add(tri);
    this.overlayCam = new THREE.Camera();
    this.overlayOn = true;
    // ölçüm araçları için (EffectComposer ile aynı biçim)
    this.passes = [{ name: 'sahne', enabled: true }, { name: 'kenar', enabled: true }];
  }

  render() {
    const R = this.renderer;
    R.setRenderTarget(null);
    R.render(this.scene, this.camera);
    if (!this.overlayOn) return;
    const ac = R.autoClear;
    R.autoClear = false;
    R.render(this.overlay, this.overlayCam);
    R.autoClear = ac;
  }

  // çizim boyu ve piksel oranını doğrudan renderer tutar
  setSize() {}
  setPixelRatio() {}

  dispose() {
    this.material.dispose();
    this.overlay.children[0].geometry.dispose();
  }
}

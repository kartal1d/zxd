// Beste'nin Sihirli Dünyası — giriş noktası.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AudioEngine, Ambience } from './audio.js';
import { TVScreen } from './tv.js';
import { Room } from './room.js';
import { Director } from './director.js';
import { Finds } from './finds.js';
import { UI, SECRETS } from './ui.js';
import * as S from './draw/scenes.js';
import { tape1 } from './tapes/tape1.js';
import { tape2 } from './tapes/tape2.js';
import { tape10 } from './tapes/tape10.js';
import { storage, clamp } from './util.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'beste-kayit-v1';
const SETTINGS_KEY = 'beste-ayarlar-v1';
// geçiş dönemi: final kaseti (tape10.js) şimdilik 3. sırada; yeni kasetler eklenince 10'a taşınır
const TAPES = { 1: tape1, 2: tape2, 3: tape10 };
/** Son kaset: bitince oyun sona erer. */
const FINAL = 3;
const TAPE_NAMES = { 1: "Kaset 1 — 'Beste ile Tanışalım!'", 2: "Kaset 2 — 'Tonton Kedi'nin Kuyruğu'", 3: "Kaset 3 — 'SON'" };

const GrainShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.06 }, vignette: { value: 0.55 }, fade: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, amount, vignette, fade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float n = h(vUv * 1000.0 + fract(time) * 100.0) - 0.5;
      c.rgb += n * amount * (0.4 + c.rgb);
      float v = smoothstep(0.95, 0.3, length(vUv - 0.5));
      c.rgb *= mix(1.0, v, vignette);
      c.rgb *= 1.0 - fade;
      gl_FragColor = c;
    }`,
};

function defaultState() {
  return { stage: 0, tapes: [], name: '', boxOpen: false, tape2Taken: false, tape3Taken: false, flags: { pauses: 0 }, clues: {}, answers: {}, room: {}, secrets: [], ending: null, endings: [] };
}

/** Eski kayıtlarda elde tutulan tek kaset (inv) vardı; artık sahip olunan kasetlerin listesi tutuluyor. */
function migrate(st) {
  if (!Array.isArray(st.tapes)) {
    st.tapes = [];
    if (st.stage >= 1 || st.inv === 1) st.tapes.push(1);
    if (st.tape2Taken || st.stage >= 2) st.tapes.push(2);
    if (st.tape3Taken || st.stage >= 3) st.tapes.push(3);
  }
  delete st.inv;
  st.flags = { pauses: 0, ...st.flags };
  st.answers = st.answers || {};
  st.room = st.room || {};
  // eski tek "ters mesaj" gizli karesi artık mesaj başına sayılıyor
  st.secrets = (st.secrets || []).map((s) => (s === 'ters-mesaj' ? 'ters-b2_real' : s));
  return st;
}

class Game {
  constructor() {
    this.canvas = $('view');
    this.ui = new UI(this);
    this.audio = new AudioEngine();
    this.tv = new TVScreen();
    this.settings = { volume: 0.9, sens: 1, subs: true, flash: false, quality: 'high', ...storage.get(SETTINGS_KEY, {}) };
    // varsayılan boş liste eski kaydın üstüne yazılmasın: tapes yoksa migrate() yeniden kursun
    const raw = storage.get(SAVE_KEY, {}) || {};
    this.state = migrate({ ...defaultState(), ...raw, tapes: raw.tapes });
    this.mode = 'title';
    this.overlay = null;
    this.clock = 0;
    this.input = { rewindHeld: false };
    this.ndc = new THREE.Vector2(0, 0);
    this.free = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    this.anyKeyWaiters = [];
    window.__game = this;
  }

  async boot() {
    this.lines = await (await fetch('src/data/lines.json')).json();
    this.audio.init();
    this.setupRenderer();
    this.room = new Room(this);
    this.director = new Director(this);
    this.finds = new Finds(this);
    this.room.applyStage(this.state);
    this.ambience = new Ambience(this.audio);
    this.audio.setTvPosition(this.room.points.tv.x, this.room.points.tv.y, this.room.points.tv.z);
    this.applySettings();
    this.bindUI();
    this.bindInput();
    this.onResize();
    this.tv.p.power = 1;
    // fontlar yüklenmeden tuval yazıları yanlış görünür
    try {
      await Promise.race([
        Promise.all([`800 30px "Baloo 2"`, `30px "VT323"`, `700 30px "Caveat"`].map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* fontsuz devam */
    }
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    await this.audio.loadVoices((p) => ($('load-pct').textContent = Math.round(p * 100) + '%'));
    this.show('loading', false);
    this.refreshTitle();
  }

  setupRenderer() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupComposer() {
    const r = this.renderer;
    this.composer?.dispose?.();
    const c = (this.composer = new EffectComposer(r));
    c.addPass(new RenderPass(this.room.scene, this.room.camera));
    if (this.settings.quality === 'high') {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.55, 0.75);
      c.addPass(this.bloom);
    }
    this.grain = new ShaderPass(GrainShader);
    c.addPass(this.grain);
    c.addPass(new OutputPass());
  }

  applySettings() {
    const s = this.settings;
    this.audio.setVolume(s.volume);
    const low = s.quality === 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1 : 2) * (low ? 0.75 : 1));
    this.renderer.shadowMap.enabled = !low;
    this.room.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
    this.setupComposer();
    this.onResize();
    $('set-volume').value = s.volume;
    $('set-sens').value = s.sens;
    $('set-subs').checked = s.subs;
    $('set-flash').checked = s.flash;
    $('set-quality').value = s.quality;
    storage.set(SETTINGS_KEY, s);
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.room.camera.aspect = w / h;
    // dar ekranda televizyon kadrajdan çıkmasın
    this.room.camera.fov = w / h < 1 ? 80 : 62;
    this.room.camera.updateProjectionMatrix();
  }

  save() {
    storage.set(SAVE_KEY, this.state);
  }

  show(id, on = true) {
    $(id).hidden = !on;
  }

  // ===================================================================== menüler
  refreshTitle() {
    const has = this.state.stage > 0 || this.state.tapes.length || this.state.name;
    this.show('btn-continue', !!has && !this.state.ending);
    (has && !this.state.ending ? $('btn-continue') : $('btn-new')).focus({ preventScroll: true });
  }

  bindUI() {
    $('btn-new').onclick = () => {
      if (this.state.stage > 0 || this.state.name) this.show('confirm-new', true);
      else this.newGame();
    };
    $('btn-new-yes').onclick = () => this.newGame();
    $('btn-new-no').onclick = () => this.show('confirm-new', false);
    $('btn-continue').onclick = () => this.enterGame();
    $('btn-controls').onclick = () => this.panel('controls');
    $('btn-settings').onclick = () => this.panel('settings');
    $('btn-pause-controls').onclick = () => this.panel('controls');
    $('btn-pause-settings').onclick = () => this.panel('settings');
    $('btn-resume').onclick = () => this.resume();
    $('btn-quit').onclick = () => this.quitToTitle();
    $('btn-ending-menu').onclick = () => this.quitToTitle();
    document.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => this.panelBack()));
    $('set-volume').oninput = (e) => {
      this.settings.volume = +e.target.value;
      this.audio.setVolume(this.settings.volume);
      storage.set(SETTINGS_KEY, this.settings);
    };
    $('set-sens').oninput = (e) => {
      this.settings.sens = +e.target.value;
      storage.set(SETTINGS_KEY, this.settings);
    };
    $('set-subs').onchange = (e) => {
      this.settings.subs = e.target.checked;
      storage.set(SETTINGS_KEY, this.settings);
    };
    $('set-flash').onchange = (e) => {
      this.settings.flash = e.target.checked;
      storage.set(SETTINGS_KEY, this.settings);
    };
    $('set-quality').onchange = (e) => {
      this.settings.quality = e.target.value;
      this.applySettings();
    };
    $('reader').onclick = () => this.ui.closeReader?.();
    document.querySelectorAll('.keypad-grid button').forEach((b) => (b.onclick = () => this.ui.keypadKey?.(b.dataset.k || b.textContent)));
    $('mobile-type').onclick = () => $('answer').focus();
    $('btn-tapes-cancel').onclick = () => this.ui.closeTapes?.(null);
    $('btn-wordlock-close').onclick = () => {
      this.ui.wordlockKey?.('close');
      this.lockPointer();
    };
    $('tapes').onclick = (e) => {
      if (e.target === $('tapes')) this.ui.closeTapes?.(null);
    };
    $('answer').addEventListener('input', (e) => this.director.typed(e.target.value));
  }

  panel(id) {
    this.panelReturn = this.mode === 'paused' ? 'pause' : 'title';
    this.show('title', false);
    this.show('pause', false);
    this.show(id, true);
    this.openPanel = id;
    $(id).querySelector('button, input')?.focus({ preventScroll: true });
  }

  panelBack() {
    this.show(this.openPanel, false);
    this.openPanel = null;
    this.show(this.panelReturn, true);
  }

  newGame() {
    this.state = defaultState();
    this.save();
    this.show('confirm-new', false);
    this.room.applyStage(this.state);
    this.resetRoom();
    this.enterGame();
  }

  resetRoom() {
    const r = this.room;
    r.locked = false;
    r.focusTarget = 0;
    r.focus = 0;
    r.yaw = 0;
    r.pitch = -0.06;
    r.doorPivot.rotation.y = 0;
    r.showGirl(false);
    r.setFlicker(false);
    r.setMood('calm');
    r.bulbBase = 1;
    r.sky.material.map = r.skyNight;
    r.sky.material.needsUpdate = true;
    r.moon.color.set(0x7f95d6);
    r.moon.intensity = 0.5;
    r.hemi.intensity = 0.35;
    r.corridorLight.intensity = 0;
    r.gapLevel = 0;
    r.spill.intensity = 0;
    r.vcrText = '12:00';
    this.tv.p.power = 1;
    this.fade(0);
  }

  enterGame() {
    this.audio.resume();
    this.mode = 'play';
    this.show('title', false);
    this.show('ending', false);
    this.show('hud', true);
    this.refreshInventory();
    this.room.applyStage(this.state);
    this.finds.applyLight();
    this.updateObjective();
    this.ui.toast('Etrafa bakmak için ekrana tıkla.', 4);
    this.lockPointer();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.audio.ctx?.suspend();
    $('pause-objective').textContent = 'Hedef: ' + this.objectiveText();
    $('pause-secrets').textContent = `Gizli kareler: ${this.state.secrets.length} / ${Object.keys(SECRETS).length}`;
    this.show('pause', true);
    $('btn-resume').focus({ preventScroll: true });
  }

  resume() {
    this.show('pause', false);
    this.mode = 'play';
    this.audio.resume();
    this.lockPointer();
  }

  quitToTitle() {
    this.director.abort();
    this.playingTape = null;
    this.loadingTape = false;
    this.loadSeq = (this.loadSeq || 0) + 1;
    this.ui.closeTapes?.(null);
    this.finds.reset();
    this.save();
    this.show('pause', false);
    this.show('ending', false);
    this.show('hud', false);
    this.show('title', true);
    this.mode = 'title';
    this.audio.resume();
    if (this.state.ending) {
      this.state = defaultState();
      this.save();
      this.room.applyStage(this.state);
    }
    this.resetRoom();
    this.refreshTitle();
  }

  // ===================================================================== giriş
  lockPointer() {
    if (this.isTouch) {
      this.free = true;
      $('crosshair').classList.add('free');
      return;
    }
    try {
      const p = this.canvas.requestPointerLock?.();
      p?.catch?.(() => this.setFree(true));
    } catch {
      this.setFree(true);
    }
  }

  setFree(on) {
    this.free = on;
    $('crosshair').classList.toggle('free', on);
  }

  bindInput() {
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (locked) this.setFree(false);
      else if (this.mode === 'play' && !this.overlay && !this.expectUnlock) this.pause();
      this.expectUnlock = false;
    });
    document.addEventListener('pointerlockerror', () => this.setFree(true));

    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || this.overlay) return;
      down = { x: e.clientX, y: e.clientY, moved: 0 };
      if (!this.free && document.pointerLockElement !== this.canvas) {
        this.lockPointer();
        down = null;
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (this.mode !== 'play' || this.overlay) return;
      const k = 0.0022 * this.settings.sens;
      if (document.pointerLockElement === this.canvas) {
        this.room.look(e.movementX * k, e.movementY * k);
      } else if (this.free) {
        this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        if (down) {
          const dx = e.clientX - down.x, dy = e.clientY - down.y;
          down.moved += Math.abs(dx) + Math.abs(dy);
          this.room.look(dx * k * 1.4, dy * k * 1.4);
          down.x = e.clientX;
          down.y = e.clientY;
        }
      }
    });
    window.addEventListener('pointerup', () => {
      if (down && down.moved < 6 && this.mode === 'play' && !this.overlay) this.interact(this.room.hover);
      down = null;
    });
    this.canvas.addEventListener('click', () => {
      if (document.pointerLockElement === this.canvas && this.mode === 'play' && !this.overlay) this.interact(this.room.hover);
    });

    window.addEventListener('keydown', (e) => this.onKey(e));
    // tuş başka pencerede bırakılırsa keyup gelmez: odak gidince sarmayı bırak
    window.addEventListener('blur', () => {
      this.input.ffHeld = false;
      this.input.rewindHeld = false;
      this.director.stopFF();
      this.director.stopRewind();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') {
        this.input.rewindHeld = false;
        this.director.stopRewind();
      }
      if (e.key === 'ArrowRight') {
        this.input.ffHeld = false;
        this.director.stopFF();
      }
    });
  }

  onKey(e) {
    const k = e.key;
    if (this.anyKeyWaiters.length && this.mode === 'play') {
      const w = this.anyKeyWaiters;
      this.anyKeyWaiters = [];
      w.forEach((r) => r());
      e.preventDefault();
      return;
    }
    if (this.overlay === 'reader') {
      if (k === 'Escape' || k === 'e' || k === 'E' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        this.ui.closeReader?.();
        this.lockPointer();
      }
      return;
    }
    if (this.overlay === 'wordlock') {
      // harfler kilidin kendi kutusuna gider; yalnızca ENTER ve Esc burada
      if (k === 'Enter') {
        e.preventDefault();
        this.ui.wordlockKey?.('Enter');
      } else if (k === 'Escape') {
        e.preventDefault();
        this.ui.wordlockKey?.('close');
        this.lockPointer();
      }
      return;
    }
    if (this.overlay === 'tapes') {
      e.preventDefault();
      if (k === 'Escape') {
        this.ui.tapeKey?.('close');
        this.lockPointer();
      } else this.ui.tapeKey?.(k);
      return;
    }
    if (this.overlay === 'keypad') {
      e.preventDefault();
      if (/^\d$/.test(k)) this.ui.keypadKey?.(k);
      else if (k === 'Backspace' || k === 'Delete') this.ui.keypadKey?.('clear');
      else if (k === 'Escape') {
        this.ui.keypadKey?.('close');
        this.lockPointer();
      }
      return;
    }
    if (this.mode === 'paused' && k === 'Escape') {
      e.preventDefault();
      if (this.openPanel) this.panelBack();
      else this.resume();
      return;
    }
    if (this.mode !== 'play') return;

    // kasetin kendi tuş dinleyicisi (ör. heykel oyunu); cevap kutusu açıkken çağrılmaz
    const dir = this.director;
    if (dir.active && !dir.input && dir.onKey && dir.onKey(e)) {
      e.preventDefault();
      return;
    }
    // sahte bitişte F ve E sessizce yutulur (kaset bitmiş gibi görünmeli)
    if (dir.fakeEnding && /^[fFeE]$/.test(k)) {
      e.preventDefault();
      return;
    }

    if (k === 'ArrowLeft') {
      e.preventDefault();
      if (!e.repeat) {
        this.input.rewindHeld = true;
        this.director.startRewind();
      }
      return;
    }
    const d = this.director;
    if (k === 'ArrowRight' && !d.input) {
      e.preventDefault();
      if (!e.repeat) {
        this.input.ffHeld = true;
        d.startFF();
      }
      return;
    }
    if (d.input) {
      const a = $('answer');
      if (k === 'Enter') {
        e.preventDefault();
        d.typed(a.value);
        d.submit();
        return;
      }
      if (k === 'Escape') {
        this.pause();
        return;
      }
      if (document.activeElement !== a) a.focus({ preventScroll: true });
      return;
    }
    if (k === 'Escape') {
      this.pause();
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      if (d.togglePause() && d.paused) this.state.flags.pauses++;
      return;
    }
    if (k === 'e' || k === 'E') this.interact(this.room.hover);
    if (k === 'f' || k === 'F') this.toggleFocus();
  }

  waitAnyKey(sec) {
    return new Promise((resolve) => {
      this.anyKeyWaiters.push(resolve);
      setTimeout(resolve, sec * 1000);
    });
  }

  // ===================================================================== oda etkileşimleri
  label(id) {
    const st = this.state;
    const playing = this.director.active;
    const fl = this.finds.label(id);
    if (fl != null) return fl;
    switch (id) {
      case 'tapebox':
        return !st.tapes.includes(1) ? 'Kaseti al' : 'Eski kaset kutuları';
      case 'vcr':
        if (this.director.fakeEnding) return 'Video oynatıcı';
        if (playing || this.loadingTape) return 'Kaset oynuyor';
        if (this.newTape()) return '<b>Kaseti tak</b>';
        return st.tapes.length ? 'Kaset seç' : 'Video oynatıcı';
      case 'tapestack':
        return playing || this.loadingTape ? 'İzlediğin kasetler' : 'Kasetleri tekrar izle';
      case 'tv':
        if (playing || this.loadingTape) return '';
        return this.room.focusTarget > 0.5 ? 'Geri çekil [F]' : 'Televizyona odaklan [F]';
      case 'letter':
        return 'Mektubu oku';
      case 'newspaper':
        return 'Gazete kupürünü oku';
      case 'metalbox':
        return !st.boxOpen ? 'Kilitli kutu' : !st.tape2Taken ? 'Kaseti al' : 'Okul kartına bak';
      case 'plush':
        return st.stage >= 2 && !st.tape3Taken ? '<b>Peluşa bak</b>' : 'Tonton peluşu';
      case 'door':
        return 'Kapı (kilitli)';
      case 'window':
        return 'Pencere';
      case 'bulb':
        return 'Ampul';
      default:
        return '';
    }
  }

  async interact(id) {
    if (!id || this.overlay || this.room.locked || this.director.fakeEnding) return;
    const st = this.state;
    const ui = this.ui;
    const au = this.audio;
    if (await this.finds.interact(id)) {
      this.updateObjective(true);
      return;
    }
    switch (id) {
      case 'tapebox':
        if (!st.tapes.includes(1)) {
          this.addTape(1);
          au.sfx('pickup');
          ui.toast("Kutunun en üstünde etiketli bir kaset var: 'Beste 1 — Tanışalım'.");
        } else ui.toast('Kutuda yalnızca boş kaset kapları var. Etiketlerin hepsi kazınmış.');
        break;
      case 'tv':
        this.toggleFocus();
        break;
      case 'vcr':
        if (this.loadingTape) break;
        if (this.director.active) {
          if (this.director.tryEject()) {
            this.director.abort();
            au.sfx('vcrEject', this.room.points.vcr);
            this.playingTape = null;
            this.refreshInventory();
            this.room.applyStage(st);
            ui.toast('Kaseti çıkardın. Tekrar takarsan baştan başlar.');
          } else {
            au.sfx('vcrStuck', this.room.points.vcr);
            ui.toast('Kaset oynarken çıkarılamaz. Bitmesini bekle ya da ▶ sağ okla ileri sar.', 5);
          }
        } else if (st.tapes.length) await this.pickAndPlay();
        else ui.toast('Eski bir video oynatıcı. Ekranında 12:00 yanıp sönüyor.');
        break;
      case 'tapestack':
        if (this.director.active || this.loadingTape) ui.toast('Şu an bir kaset oynuyor. Bitince istediğini tekrar izleyebilirsin.');
        else await this.pickAndPlay();
        break;
      case 'letter':
        await this.readDoc('letter');
        break;
      case 'newspaper':
        await this.readDoc('news');
        break;
      case 'metalbox':
        if (st.stage < 1 && !st.boxOpen) {
          ui.toast('Kilitli bir metal kutu. Tuş takımının ekranı kapalı, sanki pili bitmiş.');
        } else if (!st.boxOpen) {
          this.releasePointer();
          const ok = await ui.keypad((code) => code === '1405');
          if (ok) {
            st.boxOpen = true;
            au.sfx('boxOpen', this.room.points.metalbox);
            this.room.applyStage(st);
            this.save();
            ui.toast('Kutu açıldı. İçinde bir kaset ve küçük bir kart var.');
            this.updateObjective();
          }
          this.lockPointer();
        } else if (!st.tape2Taken) {
          st.tape2Taken = true;
          this.addTape(2);
          au.sfx('pickup');
          await this.readDoc('card');
          this.updateObjective();
        } else await this.readDoc('card');
        break;
      case 'plush':
        if (st.stage >= 2 && !st.tape3Taken) {
          st.tape3Taken = true;
          this.addTape(3);
          au.sfx('pickup');
          ui.toast('Peluşun karnı yırtılmış. İçinden üçüncü kaset düştü. Etiketinde tek kelime var: SON.', 6);
          this.updateObjective();
        } else if (st.stage >= 5) ui.toast('Peluşun karnındaki yırtık siyah iple dikilmiş. Sen dikmedin.');
        else if (st.stage >= 2) ui.toast('Tonton peluşu. Kuyruğu yok. Kesik yerinden pamuk taşıyor.');
        else ui.toast("Eski bir Tonton Kedi peluşu. Etiketinde 'Yıldız Çocuk Yapım 1998' yazıyor. Bir gözü kopmuş.", 5);
        break;
      case 'door':
        au.sfx('vcrStuck', this.room.points.door);
        ui.toast(st.stage >= 9 ? 'Kapı hâlâ kilitli. Altındaki aralıktan soğuk bir hava geliyor.' : st.stage >= 2 ? 'Kapı hâlâ kilitli. Anahtar deliğinden soğuk bir hava geliyor.' : 'Kapı kilitli. Kol yerinden oynamıyor, anahtar da ortada yok.');
        break;
      case 'window':
        ui.toast(st.stage >= 2 ? 'Camda küçük el izleri var. İçeride değil, dışarıda. Pencere sıkışmış.' : 'Dışarısı zifiri karanlık. Sokak lambaları bile yanmıyor. Pencere sıkışmış.');
        break;
      case 'bulb':
        ui.toast('Çıplak bir ampul. Hafifçe vızıldıyor.');
        break;
    }
    this.updateObjective(true);
  }

  /** Kaset oynarken ekrandan ayrılmak yok: odak kilitli kalır. */
  toggleFocus() {
    if (this.director.fakeEnding) return;
    if (this.director.active || this.loadingTape) {
      this.room.setFocus(true);
      this.ui.toast('Kaset oynarken ekrandan ayrılamazsın.', 2.5);
      return;
    }
    this.room.setFocus(this.room.focusTarget < 0.5);
  }

  /** Bulunmuş ama henüz izlenmemiş kaset (oyunda aynı anda en fazla bir tane olur). */
  newTape() {
    const st = this.state;
    return st.tapes.filter((n) => n > st.stage).sort((a, b) => a - b)[0] ?? null;
  }

  addTape(n) {
    const st = this.state;
    if (!st.tapes.includes(n)) st.tapes.push(n);
    st.tapes.sort((a, b) => a - b);
    this.refreshInventory();
    this.room.applyStage(st, this.playingTape);
    this.save();
  }

  refreshInventory() {
    const n = this.playingTape ? null : this.newTape();
    this.ui.inventory(n ? TAPE_NAMES[n] : null);
  }

  /** Tek kaset varsa onu oynatır; birden fazlaysa seçim ekranı açar. */
  async pickAndPlay() {
    const st = this.state;
    let n = st.tapes[0];
    if (st.tapes.length > 1) {
      this.releasePointer();
      n = await this.ui.chooseTape(
        st.tapes.map((t) => ({ n: t, name: TAPE_NAMES[t], watched: t <= st.stage })),
        this.newTape() ?? st.tapes[st.tapes.length - 1],
      );
      this.lockPointer();
    }
    if (n) this.playTape(n);
  }

  releasePointer() {
    if (document.pointerLockElement) {
      this.expectUnlock = true;
      document.exitPointerLock();
    }
  }

  async readDoc(key) {
    this.audio.sfx('paper');
    this.releasePointer();
    await this.ui.read(key);
    this.audio.sfx('paper');
    this.lockPointer();
  }

  objectiveText() {
    const st = this.state;
    if (this.playingTape) return 'Kaseti izle. Beste soru sorarsa klavyeden cevap ver.';
    if (this.newTape()) return 'Kaseti televizyonun altındaki video oynatıcıya tak.';
    if (st.stage === 0) return 'Karton kutudaki kaseti bul.';
    if (st.stage === 1 && !st.boxOpen) return 'Sehpadaki kilitli kutunun 4 haneli şifresini bul.';
    if (st.stage === 1) return 'Kilitli kutudaki kaseti al.';
    const fo = this.finds.objective();
    if (fo) return fo;
    return 'Buradan çık.';
  }

  updateObjective(quiet) {
    const t = this.objectiveText();
    if (quiet && t === this.lastObjective) return;
    this.lastObjective = t;
    this.ui.objective(t);
  }

  async playTape(n) {
    if (this.loadingTape || this.director.active) return;
    const st = this.state;
    const tok = (this.loadSeq = (this.loadSeq || 0) + 1);
    this.loadingTape = true;
    this.playingTape = n;
    this.finds.onTapeStart(n);
    this.refreshInventory();
    this.room.applyStage(st, n);
    this.audio.sfx('vcrInsert', this.room.points.vcr);
    this.room.vcrText = 'LOAD';
    this.room.setFocus(true);
    this.updateObjective();
    await sleep(1300);
    // bu arada menüye dönülüp yeni bir kaset takıldıysa eski yükleme hiçbir şey yapmaz
    if (tok !== this.loadSeq) return;
    this.loadingTape = false;
    // yüklenirken ana menüye dönüldüyse oynatma
    if (this.playingTape !== n || this.mode === 'title') return;
    this.room.vcrText = 'PLAY';
    this.audio.sfx('tvOn');
    this.ui.show('vcr-hint', true);
    const res = await this.director.play(TAPES[n], 't' + n, { firstViewing: n > st.stage });
    this.ui.show('vcr-hint', false);
    this.audio.setHiss(false);
    this.audio.setTapeFx('off', 0.5);
    this.room.vcrText = '12:00';
    if (res !== 'done' || this.mode === 'title') {
      if (this.playingTape === n) this.playingTape = null;
      this.refreshInventory();
      this.room.applyStage(st);
      return;
    }
    this.playingTape = null;
    this.onTapeDone(n);
  }

  async onTapeDone(n) {
    const st = this.state;
    const r = this.room;
    // tekrar izlenen kaset hikâyeyi ilerletmez, olaylar yeniden tetiklenmez
    const first = n > st.stage;
    st.stage = Math.max(st.stage, n);
    this.save();
    this.refreshInventory();
    // ilk izlemede odadaki değişim (ışık, peluş) ses işaretiyle birlikte gelir
    if (!first) r.applyStage(st, this.playingTape);
    if (n < FINAL) {
      this.audio.sfx('vcrEject', r.points.vcr);
      this.ui.toast(first ? 'Kaset bitti ve kendiliğinden dışarı çıktı.' : 'Kaset bitti. Dolabın üstüne, diğer kasetlerin yanına koydun.');
    }
    r.setFocus(false);
    if (n < FINAL && !first) {
      this.updateObjective();
      return;
    }
    if (n === 1) {
      await sleep(2500);
      this.audio.sfx('boxClick', r.points.metalbox);
      r.applyStage(st, this.playingTape);
      this.ui.toast("Sehpadaki kilitli kutudan bir 'tık' sesi geldi. Tuş takımının ışığı yandı.", 5);
      await sleep(5500);
      if (this.mode === 'play' && !this.playingTape) this.ui.toast('İzlediğin kasetler dolabın üstünde. Video oynatıcıdan istediğini tekrar izleyebilirsin.', 6);
    } else if (n === 2) {
      await sleep(2500);
      r.applyStage(st, this.playingTape);
      this.audio.sfx('thud', new THREE.Vector3(-0.45, 0.2, 2.05));
      this.ui.toast('Arkanda bir şey yere düştü.', 4);
    } else if (n > 2 && n < FINAL) {
      await this.finds.afterFirst(n);
      return;
    } else if (n === FINAL) {
      st.endings = [...new Set([...(st.endings || []), st.ending])];
      this.save();
      this.fade(1);
      await sleep(2200);
      this.releasePointer();
      this.mode = 'ending';
      this.ui.ending(st.ending, st.secrets);
      this.fade(0);
      $('btn-ending-menu').focus({ preventScroll: true });
      return;
    }
    this.updateObjective();
  }

  /** Kasetin sahte bitişi: VCR ve bildirimler gerçekten bitmiş gibi davranır. */
  fakeEnd(on) {
    const r = this.room;
    if (on) {
      this.audio.sfx('vcrEject', r.points.vcr);
      r.vcrText = 'STOP';
      setTimeout(() => {
        if (this.director.fakeEnding) r.vcrText = '12:00';
      }, 1200);
      this.ui.show('vcr-hint', false);
      this.ui.toast('Kaset bitti ve kendiliğinden dışarı çıktı.');
    } else if (this.director.active) {
      r.vcrText = 'PLAY';
      this.ui.show('vcr-hint', true);
    }
  }

  foundSecret(id, text) {
    if (!SECRETS[id] || this.state.secrets.includes(id)) return;
    this.state.secrets.push(id);
    this.save();
    this.ui.secret(`GİZLİ KARE ${this.state.secrets.length}/${Object.keys(SECRETS).length} · ${SECRETS[id]}`);
  }

  fade(v) {
    $('fade').classList.toggle('on', v > 0.5);
  }

  // ===================================================================== döngü
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.mode !== 'paused') this.update(dt);
    // test kancası: başsız testlerde 3D çizimi atla (TV tuvali yine güncellenir)
    if (!this.debug?.noRender) this.composer.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    this.clock += dt;
    const r = this.room;
    if (this.mode === 'title') {
      // menüde kamera yavaşça süzülür
      r.yaw = Math.sin(this.clock * 0.08) * 0.35;
      r.pitch = -0.05 + Math.sin(this.clock * 0.11) * 0.04;
    }
    const ndc = this.free && this.mode === 'play' ? this.ndc : new THREE.Vector2(0, 0);
    r.update(dt, ndc);
    this.gazeOnTv = r.gaze;
    // televizyona odaklanınca ekranın ortasına yazı basma
    const tvFocus = r.hover === 'tv' && r.focusTarget > 0.5;
    if (this.mode === 'play' && !this.overlay && !tvFocus && !r.locked) this.ui.hover(this.label(r.hover));
    else this.ui.hover('');

    if (!this.director.update(dt * (this.debug?.speed || 1))) this.drawIdleTv();
    this.finds.update(dt);
    this.tv.update(dt, this.clock);
    this.ambience.update(this.clock, r.bulbLevel);
    const l = r.listener();
    this.audio.setListener(l.pos, l.fwd, l.up);
    this.grain.uniforms.time.value = this.clock;
    // titreme efektini azalt ayarı
    if (this.settings.flash) r.burst = Math.min(r.burst, 0.05);
  }

  drawIdleTv() {
    const c = this.tv.ctx;
    if (this.mode !== 'title' && this.finds.drawTv(c, this.clock)) return;
    if (this.mode === 'title') {
      S.titleCard(c, this.clock * 0.6, { decay: 0.15 });
      return;
    }
    S.blueScreen(c, this.clock, { text: 'VİDEO 1', sub: this.newTape() && !this.playingTape ? 'KASET BEKLENİYOR' : '', clock: true });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const game = new Game();
game.boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.textContent = 'Oyun başlatılamadı: ' + e.message;
});

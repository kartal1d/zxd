// Serbest yürüyüş denetleyicisi (8. kasetten sonra): WASD / Shift, fare bakışı (room.js ile birlikte), daire-kutu çarpışma,
// merdiven rampası, kafa sallanması, ayak sesleri, ayağa kalkma / oturma geçişleri, el feneri, titreme ve ışık kırpması.
// Kasetler hep oturarak izlenir; paneller, kaset ve kilitli kamera hareketi engeller (bkz. docs/ev-tasarim.md §3).
import * as THREE from 'three';
import { clamp, lerp, rand } from './util.js';
import { YA, YG } from './house.js';

const R = 0.22; // çarpışma yarıçapı
const EYE = 1.6; // ayakta göz yüksekliği
const SEAT = new THREE.Vector3(0, 1.12, 0.55);
const START = new THREE.Vector3(0, YA, 0.25); // ayağa kalkınca durulan yer
const WALK = 1.55;
const RUN = 2.9;
const STAMINA = 2.5;
const FL_INT = 4.5;
const SURFACE = { cati: 'wood', sahanlik: 'wood', giris: 'wood', hol: 'wood', salon: 'wood', montaj: 'wood', merdiven: 'stair', mutfak: 'tile', banyo: 'tile', bahce: 'grass' };
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const smooth = (t) => t * t * (3 - 2 * t);
const $ = (id) => document.getElementById(id);

export class Walk {
  constructor(game) {
    this.g = game;
    this.keys = new Set();
    this.standing = false;
    this.everStood = false;
    this.standUps = 0;
    this.pos = new THREE.Vector3().copy(START);
    this.last = new THREE.Vector3().copy(START);
    this.level = 'ust';
    this.zone = 'cati';
    this.vel = { x: 0, z: 0 };
    this.stamina = STAMINA;
    this.noRun = 0;
    this.winded = false;
    this.bobPhase = 0;
    this.stepAcc = 0;
    this.camY = EYE;
    this.trans = null;
    this.lightOn = false;
    this.lightK = 0;
    this.flickerK = 1;
    this.flk = null;
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.shakeDur = 1;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeRoll = 0;
    this.hintHidden = false;
    this.walkCam = new THREE.Vector3();
  }

  get room() {
    return this.g.room;
  }
  get house() {
    return this.g.house;
  }

  // ================================================================== giriş
  /** true: tuş burada işlendi */
  onKeyDown(e) {
    const c = e.code;
    if (MOVE_KEYS.includes(c)) {
      if (!this.g.state.room?.walk) return false;
      e.preventDefault();
      this.keys.add(c);
      return true;
    }
    if (c === 'ShiftLeft' || c === 'ShiftRight') {
      this.keys.add('Shift');
      return this.standing;
    }
    if (c === 'KeyQ' && this.standing) {
      if (!e.repeat && this.canMove()) this.toggleLight();
      return true;
    }
    return false;
  }

  onKeyUp(e) {
    const c = e.code;
    if (MOVE_KEYS.includes(c)) this.keys.delete(c);
    else if (c === 'ShiftLeft' || c === 'ShiftRight') this.keys.delete('Shift');
  }

  clearKeys() {
    this.keys.clear();
  }

  anyMove() {
    return MOVE_KEYS.some((k) => this.keys.has(k));
  }

  /** Hareket edilebilir mi (tasarım §3) */
  canMove() {
    const g = this.g;
    return (
      g.mode === 'play' &&
      !g.panelOpen() &&
      !g.director.active &&
      !g.loadingTape &&
      !!g.state.room?.walk &&
      !g.room.locked &&
      !g.scares?.inputLock &&
      !this.trans
    );
  }

  toggleLight() {
    if (!this.standing) return;
    this.lightOn = !this.lightOn;
    this.g.audio.sfx('click');
  }

  // ================================================================== geçişler
  tween(from, to, dur, ease = smooth) {
    return new Promise((res) => {
      this.trans = { t: 0, dur, from: from.clone(), to: to.clone(), ease, res };
    });
  }

  async standUp() {
    if (this.standing || this.trans) return;
    const g = this.g;
    const room = this.room;
    this.house.ensureBuilt();
    room.setFocus(false);
    this.pos.copy(START);
    this.last.copy(START);
    this.level = 'ust';
    this.zone = 'cati';
    this.house.setZone('cati');
    this.vel.x = this.vel.z = 0;
    const from = room.camera.position.clone();
    const to = new THREE.Vector3(START.x, START.y + EYE, START.z);
    this.standing = true;
    room.standing = true;
    room.reach = 2.0;
    this.everStood = true;
    this.lightOn = true;
    g.audio.sfx('creak', new THREE.Vector3(0, 0.3, 0.72), 0.5);
    g.audio.sfx('click');
    if (++this.standUps <= 2) g.ui.walkHint?.(true, 6);
    this.hintHidden = false;
    await this.tween(from, to, 0.45);
    this.camY = to.y;
    g.audio.sfx('step', new THREE.Vector3(0, 0.05, 0.25), 'wood', false, 0.5);
  }

  /** Koltuğa oturur. Uzaksa 0.25 sn kararıp koltuğun yanına ışınlanır. */
  async sitDown() {
    if (!this.standing) return;
    if (this.sitting) return this.sitting;
    this.sitting = this._sit().finally(() => (this.sitting = null));
    return this.sitting;
  }

  async _sit() {
    const g = this.g;
    const room = this.room;
    while (this.trans) await new Promise((r) => setTimeout(r, 30));
    if (!this.standing) return;
    const far = this.level !== 'ust' || this.pos.z > 2.4 || Math.hypot(this.pos.x, this.pos.z - 0.55) > 1.5;
    this.keys.clear();
    this.vel.x = this.vel.z = 0;
    if (far) {
      const el = $('fade');
      el.style.transition = 'opacity .25s';
      g.fade(1);
      await new Promise((r) => setTimeout(r, 280));
      this.place(START.x, START.y, START.z, 'ust');
      room.camera.position.set(START.x, START.y + EYE, START.z);
      this.walkCam.copy(room.camera.position);
      g.fade(0);
      setTimeout(() => (el.style.transition = ''), 300);
    }
    this.lightOn = false;
    const from = room.camera.position.clone();
    let yaw = 0;
    while (yaw - room.yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - room.yaw < -Math.PI) yaw += Math.PI * 2;
    room.tweens.add(room, 'yaw', yaw, 0.7);
    room.tweens.add(room, 'pitch', -0.04, 0.7);
    g.audio.sfx('creak', new THREE.Vector3(0, 0.3, 0.72), 0.6);
    await this.tween(from, SEAT, 0.7);
    this.standing = false;
    room.standing = false;
    room.reach = 3.6;
    room.walkCam = null;
    room.roll = 0;
    this.camY = EYE;
  }

  /** Oyuncuyu hemen koltuğa oturmuş hâle getirir (menü, kayıttan yükleme, mühür) */
  resetSeated() {
    const room = this.room;
    this.keys.clear();
    this.trans = null;
    this.sitting = null;
    this.standing = false;
    this.lightOn = false;
    this.lightK = 0;
    this.flk = null;
    this.flickerK = 1;
    this.shakeT = 0;
    this.vel.x = this.vel.z = 0;
    this.stamina = STAMINA;
    this.winded = false;
    this.pos.copy(START);
    this.last.copy(START);
    this.level = 'ust';
    this.zone = 'cati';
    if (room) {
      room.standing = false;
      room.reach = 3.6;
      room.walkCam = null;
      room.roll = 0;
    }
    const h = this.house;
    if (h) {
      h.flickerZone = false;
      if (h.flashlight) h.flashlight.intensity = 0;
      if (h.zone !== 'cati') h.setZone('cati');
    }
  }

  // ================================================================== ışınlama ve bilgi (test, mühür)
  place(x, y, z, level) {
    this.pos.set(x, y, z);
    this.last.set(x, y, z);
    this.level = level || this.level;
    const zn = this.house.zoneAt(this.level, x, z);
    this.zone = zn;
    this.house.setZone(zn);
  }

  /** Hata ayıklama: ayağa kalkmış olarak (x, y, z) noktasına; yaw/pitch kameranın yönü */
  teleport(x, y, z, yaw, pitch, level) {
    const room = this.room;
    const h = this.house;
    h.ensureBuilt();
    if (!level) level = y <= YG + 0.05 ? (z < -3.25 ? 'bahce' : 'zemin') : 'ust';
    this.trans = null;
    this.standing = true;
    room.standing = true;
    room.reach = 2.0;
    this.everStood = true;
    room.setFocus(false);
    room.focus = 0;
    room.focusTarget = 0;
    this.place(x, y, z, level);
    if (yaw != null) room.yaw = yaw;
    if (pitch != null) room.pitch = pitch;
    this.camY = y + EYE;
    this.vel.x = this.vel.z = 0;
    this.lightOn = true;
    this.updateCamera(0, 0, 0, 0);
    room.camera.position.copy(this.walkCam);
  }

  info() {
    const r = this.room;
    return { standing: this.standing, level: this.level, zone: this.zone, x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: r.yaw, pitch: r.pitch, stamina: this.stamina, light: this.lightOn, cam: r.camera.position.toArray() };
  }

  // ================================================================== ışık, titreme
  /** pattern: [[seviye, sn], ...]. 'Titreşimi azalt' açıksa tek yumuşak çöküşe dönüşür. Bitince çözülür. */
  flicker(pattern) {
    const g = this.g;
    let list = pattern;
    let soft = false;
    if (g.settings.flash) {
      list = [[0.12, pattern.reduce((a, p) => a + p[1], 0)]];
      soft = true;
    }
    if (this.flk) this.flk.res?.();
    if (this.house) this.house.flickerZone = !this.lightOn;
    return new Promise((res) => {
      this.flk = { list, i: 0, t: 0, soft, res };
    });
  }

  shake(amp, sec) {
    const k = this.g.settings.flash ? 0.4 : 1;
    this.shakeAmp = amp * k;
    this.shakeT = this.shakeDur = sec;
  }

  // ================================================================== her kare
  update(dt) {
    const g = this.g;
    const room = this.room;
    const house = this.house;
    if (!room || !house) return;
    if (g.mode === 'title') return;
    // ışık kırpması
    const f = this.flk;
    if (f) {
      const [lv, dur] = f.list[f.i];
      this.flickerK = f.soft ? lerp(this.flickerK, lv, Math.min(1, dt * 7)) : lv;
      f.t += dt;
      if (f.t >= dur) {
        f.t = 0;
        if (++f.i >= f.list.length) {
          this.flk = null;
          house.flickerZone = false;
          f.res?.();
        }
      }
    } else this.flickerK += (1 - this.flickerK) * Math.min(1, dt * 9);
    // el feneri (0.3 sn'de yumuşak)
    this.lightK += ((this.standing && this.lightOn ? 1 : 0) - this.lightK) * Math.min(1, dt * 9);
    if (house.flashlight) house.flashlight.intensity = FL_INT * this.lightK * this.flickerK;
    // geçiş: koltuktan kalkma / oturma
    if (this.trans) {
      const t = this.trans;
      t.t += dt;
      const k = clamp(t.t / t.dur, 0, 1);
      this.walkCam.lerpVectors(t.from, t.to, t.ease(k));
      room.walkCam = this.walkCam;
      if (k >= 1) {
        this.trans = null;
        t.res();
      }
      return;
    }
    if (!this.standing) {
      if (g.panelOpen() || g.director.active || g.loadingTape) this.keys.clear();
      room.roll = this.shakeStep(dt, null);
      if (this.canMove() && this.anyMove()) this.standUp();
      return;
    }
    // paneller, kaset vb. tuşları bırakır
    if (g.panelOpen() || g.director.active || g.loadingTape) {
      this.keys.clear();
      if (!this.hintHidden) {
        this.hintHidden = true;
        g.ui.walkHint?.(false);
      }
    }
    const can = this.canMove();
    // yön
    const yaw = room.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let ix = 0, iz = 0;
    if (can) {
      if (this.keys.has('KeyW')) iz += 1;
      if (this.keys.has('KeyS')) iz -= 1;
      if (this.keys.has('KeyD')) ix += 1;
      if (this.keys.has('KeyA')) ix -= 1;
    }
    const moving = ix !== 0 || iz !== 0;
    let wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;
    const wl = Math.hypot(wx, wz) || 1;
    wx /= wl;
    wz /= wl;
    // koşu ve soluk
    const wantRun = moving && this.keys.has('Shift') && !this.winded && this.stamina > 0;
    if (wantRun) {
      this.stamina -= dt;
      this.noRun = 0;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.winded = true;
        g.audio.sfx('breath', room.camera.position, 2);
      }
    } else {
      this.noRun += dt;
      if (this.noRun > 1) this.stamina = Math.min(STAMINA, this.stamina + 0.6 * dt);
      if (this.winded && this.stamina >= 1) this.winded = false;
    }
    let speed = wantRun ? RUN : WALK;
    if (iz < 0) speed *= 0.8;
    if (this.zone === 'merdiven') speed *= 0.8;
    const tvx = moving ? wx * speed : 0, tvz = moving ? wz * speed : 0;
    const a = Math.min(1, (10 * dt) / Math.max(0.2, Math.hypot(tvx - this.vel.x, tvz - this.vel.z)));
    this.vel.x += (tvx - this.vel.x) * a;
    this.vel.z += (tvz - this.vel.z) * a;
    // hareket ve çarpışma
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.collide();
    this.updateLevel();
    const fy = house.floorY(this.level, this.pos.x, this.pos.z);
    if (fy == null) {
      this.pos.copy(this.last);
      this.vel.x = this.vel.z = 0;
    } else {
      this.pos.y = fy;
      this.last.copy(this.pos);
    }
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dt > 0 && moved < Math.hypot(this.vel.x, this.vel.z) * dt * 0.5) {
      // duvara yaslanınca hız sönsün
      this.vel.x *= 0.5;
      this.vel.z *= 0.5;
    }
    const zn = house.zoneAt(this.level, this.pos.x, this.pos.z);
    if (zn !== this.zone) {
      this.zone = zn;
      house.setZone(zn);
    }
    // merdivende ampulün ışığı yavaşça söner
    if (zn === 'merdiven') room.bulbZone = clamp(1 + this.pos.y / 1.4, 0, 1);
    // ayak sesi
    this.stepAcc += moved;
    const stride = wantRun ? 0.75 : 0.62;
    if (this.stepAcc >= stride) {
      this.stepAcc -= stride;
      g.audio.sfx('step', new THREE.Vector3(this.pos.x, this.pos.y + 0.05, this.pos.z), SURFACE[zn] || 'wood', wantRun, wantRun ? 0.8 : 0.5);
    }
    this.updateCamera(moved, rx, rz, dt);
    room.roll = this.shakeRoll;
  }

  /** Kamera: göz yüksekliği yumuşatılır, kafa sallanması ve titreme eklenir */
  updateCamera(moved, rx, rz, dt) {
    const room = this.room;
    const k = this.g.settings.flash ? 0.5 : 1;
    this.bobPhase += (moved / 1.1) * Math.PI * 2;
    const spd = dt > 0 ? clamp(moved / dt / WALK, 0, 1.4) : 0;
    const bobY = 0.028 * Math.abs(Math.sin(this.bobPhase)) * k * Math.min(1, spd * 1.5);
    const lat = 0.012 * Math.sin(this.bobPhase / 2) * k * Math.min(1, spd * 1.5);
    const ty = this.pos.y + EYE;
    this.camY += (ty - this.camY) * Math.min(1, dt > 0 ? 12 * dt : 1);
    const sh = this.shakeStep(dt, true);
    this.walkCam.set(this.pos.x + rx * lat + this.shakeX, this.camY + bobY + this.shakeY, this.pos.z + rz * lat);
    this.shakeRoll = sh;
    this.room.walkCam = this.walkCam;
  }

  shakeStep(dt, move) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const f = Math.max(0, this.shakeT / this.shakeDur);
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmp * f;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmp * f;
      return (Math.random() - 0.5) * this.shakeAmp * 6 * f;
    }
    this.shakeX = this.shakeY = 0;
    return 0;
  }

  /** Düzey değişimi: merdiven (üst <-> zemin) ve arka kapı eşiği (zemin <-> bahçe) */
  updateLevel() {
    const p = this.pos;
    const onStairX = p.x > -1.72 && p.x < -0.68;
    if (this.level === 'ust' && p.z > 7.7 && onStairX) this.level = 'zemin';
    else if (this.level === 'zemin' && onStairX && p.z < 7.6 && p.z > 3.8) this.level = 'ust';
    else if (this.level === 'zemin' && p.z < -3.25) this.level = 'bahce';
    else if (this.level === 'bahce' && p.z > -3.15) this.level = 'zemin';
  }

  /** Daire (R) - eksen hizalı kutu çarpışması, iki geçiş */
  collide() {
    const boxes = this.house.colliders(this.level);
    const p = this.pos;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of boxes) {
        const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * R;
          p.z = cz + (dz / d) * R;
        } else {
          // merkez kutunun içinde: en az girişim ekseninde dışarı it
          const l = p.x - b.x0, r = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z;
          const m = Math.min(l, r, t, bt);
          if (m === l) p.x = b.x0 - R;
          else if (m === r) p.x = b.x1 + R;
          else if (m === t) p.z = b.z0 - R;
          else p.z = b.z1 + R;
        }
      }
    }
  }
}

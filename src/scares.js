// Ev bölümünün korkutmaları ve olayları (docs/ev-tasarim.md §6): S1-S8, ortam olayları A1-A3 (A4 salıncak house.js'te),
// 9. kaset sonrası geri dönüş sayımı (R1) ve tavan arası kapısının mühürlenmesi.
// Her korkutma bir kez çalışır: kimliği st.room.scares'e eklenir ve hemen kaydedilir. Süreler oyun saatiyle (update dt) akar.
import * as THREE from 'three';
import { clamp, lerp } from './util.js';
import { YG, YB, stairY } from './house.js';

const CANCEL = Symbol('iptal');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LOUD_GAP = 12; // yüksek sesli korkutmalar arası en az süre (sn)
const $ = (id) => document.getElementById(id);
const ease = (k) => k * k;

export class Scares {
  constructor(game) {
    this.g = game;
    this.waits = [];
    this.anims = [];
    this.active = null; // çalışan betikli korkutma
    this.inputLock = false;
    this.swingStop = false;
    this.musicBoxPlaying = false;
    this.lastLoud = -99;
    this.zoneSince = 0;
    this.zone = 'cati';
    this.leftAtticAt = null;
    this.tv = { on: false, t0: 0, seenT: 0, stop: null, mode: 'static' };
    this.mon = null;
    this.s2 = { shown: false, seenT: 0, doneAt: null };
    this.s4 = { faceT: 0, deskT: 0 };
    this.s5 = { deskT: 0 };
    this.s6 = { armed: false, spawned: false, t: 0, seenT: 0, cue: false };
    this.s4Pending = false;
    this.r1 = false;
    this.r1T = 0;
    this.sealing = false;
    this.stopBox = null;
    this.gen = 0;
  }

  get st() {
    return this.g.state;
  }
  get r() {
    return (this.st.room = this.st.room || {});
  }
  get house() {
    return this.g.house;
  }
  get walk() {
    return this.g.walk;
  }
  fired(id) {
    return (this.r.scares || []).includes(id);
  }
  mark(id) {
    const r = this.r;
    r.scares = r.scares || [];
    if (!r.scares.includes(id)) r.scares.push(id);
    this.g.save();
  }
  has9() {
    return (this.st.tapes || []).includes(9);
  }
  off() {
    return !!this.g.debug?.noScares;
  }
  loudOk() {
    return this.g.clock - this.lastLoud >= LOUD_GAP;
  }

  // ================================================================== zamanlayıcılar
  wait(sec) {
    return new Promise((res, rej) => this.waits.push({ t: sec, res, rej }));
  }
  /** süre boyunca her karede fn(0..1) */
  tween(dur, fn) {
    return new Promise((res, rej) => this.anims.push({ t: 0, dur, fn, res, rej }));
  }
  async run(id, fn) {
    if (this.active) return;
    this.active = id;
    const gen = this.gen;
    try {
      await fn();
    } catch (e) {
      if (e !== CANCEL) console.error(e);
    } finally {
      if (this.gen === gen) this.active = null;
      this.cleanup();
    }
  }

  /** Görünür hedefler, ışık ve ses geçici değişikliklerini geri al */
  cleanup() {
    const h = this.house;
    if (!h?.built) return;
    h.man.visible = false;
    h.manArms.visible = false;
    h.ghost.visible = false;
    h.winGirl.visible = false;
    h.litWindow.visible = h.zone === 'bahce';
    this.inputLock = false;
    this.swingStop = false;
    h.zoneBoost = 1;
    h.droneHold = null;
    h.zoneLight.color.set(0x5d74b8);
    h.setZone(h.zone, true);
    h.ambience.muteGarden(false, 0.2);
    if (!this.tv.on && !this.mon) h.screenFn = null;
  }

  cancelAll() {
    this.gen++;
    const ws = this.waits;
    const as = this.anims;
    this.waits = [];
    this.anims = [];
    for (const o of [...ws, ...as]) o.rej(CANCEL);
    this.active = null;
    this.sealing = false;
    this.r1 = false;
    this.stopTv(true);
    this.mon = null;
    this.stopMusicBox();
    this.s4Pending = false;
    this.s2 = { shown: false, seenT: 0, doneAt: this.s2.doneAt };
    this.s6 = { armed: false, spawned: false, t: 0, seenT: 0, cue: false };
    this.cleanup();
    const h = this.house;
    if (h?.built) {
      h.screenFn = null;
      h.drawMonitors('off');
      h.drawSalon('off');
      h.drawDecks('');
    }
    const f = $('fade');
    if (f) f.style.transition = '';
  }

  // ================================================================== yardımcılar
  fwd() {
    const r = this.g.room;
    const c = Math.cos(r.pitch);
    return V(-Math.sin(r.yaw) * c, Math.sin(r.pitch), -Math.cos(r.yaw) * c);
  }
  right() {
    const y = this.g.room.yaw;
    return V(Math.cos(y), 0, -Math.sin(y));
  }
  /** Hedefe belirli açı (derece) ve mesafe aralığında bakılıyor mu */
  seen(target, deg, minD = 0, maxD = 99) {
    const cam = this.g.room.camera.position;
    const d = target.clone().sub(cam);
    const dist = d.length();
    if (dist < minD || dist > maxD) return false;
    return this.fwd().dot(d.normalize()) >= Math.cos((deg * Math.PI) / 180);
  }
  angleTo(target) {
    const cam = this.g.room.camera.position;
    const d = target.clone().sub(cam).normalize();
    return (Math.acos(clamp(this.fwd().dot(d), -1, 1)) * 180) / Math.PI;
  }
  /** Oyuncunun ayakta, hareket edebileceği bir durumda olması (korkutma tetikleri için) */
  ready() {
    const g = this.g;
    return g.mode === 'play' && !g.panelOpen() && !g.director.active && !g.loadingTape && this.walk?.standing && !this.walk.trans;
  }
  say(id, label, cls, pos, gain = 1, o = {}) {
    const g = this.g;
    const line = g.lines[id];
    if (!line) return Promise.resolve();
    g.ui.subtitle(label, g.director.fmt(line.s || line.t), cls);
    const h = g.audio.playRoomVoice(id, { pos, gain, ...o });
    return Promise.race([h.promise, new Promise((r) => setTimeout(r, 9000))]).then(() => g.ui.subtitle(null, null, null, 0.5));
  }
  light(pos, color, level) {
    const h = this.house;
    h.zoneLight.position.copy(pos);
    h.zoneLight.color.set(color);
    h.zoneLevel = level;
    h.zoneBoost = 1;
  }
  flashSafe() {
    return this.g.settings.flash;
  }

  // ================================================================== her kare
  update(dt) {
    const g = this.g;
    // zamanlayıcılar ve animasyonlar
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
    const h = this.house;
    const w = this.walk;
    if (g.mode !== 'play' || !h?.built || !w) return;
    if (w.zone !== this.zone) {
      this.zone = w.zone;
      this.zoneSince = g.clock;
      if (w.level !== 'ust' && this.leftAtticAt == null) this.leftAtticAt = g.clock;
    }
    this.updateSeal();
    this.updateR1(dt);
    this.updateTv(dt);
    if (this.off()) return;
    if (!this.ready() || this.sealing) return;
    this.updateTriggers(dt);
  }

  updateTriggers(dt) {
    const g = this.g;
    const w = this.walk;
    const r = this.r;
    const z = w.zone;
    const p = w.pos;
    if (!r.walk || this.active) {
      return;
    }
    // S1 tonton: merdivenin yarısında, aşağı inerken
    if (!this.fired('tonton') && !r.plushDown) {
      const down = w.vel.z > 0.2 || z === 'giris';
      if ((z === 'merdiven' && p.z >= 5.9 && down) || (w.level === 'zemin' && (z === 'giris' || z === 'hol'))) {
        this.fire('tonton');
        return;
      }
    }
    // S2 adam: koridorun sonunda
    if (!this.fired('adam') && this.fired('tonton') && (this.s2.doneAt == null || g.clock - this.s2.doneAt >= 6)) {
      this.updateS2(dt);
    }
    // S3 televizyon (başlangıç), S4 / S5 yedek tetikler, S6 çit, ortam olayları
    if (!this.fired('tv') && !this.tv.on && z === 'salon' && g.clock - this.zoneSince >= 2 && p.distanceTo(this.house.points.salonTv) <= 4.0 && this.loudOk()) this.startTv();
    if (z !== 'banyo') this.s4Pending = false;
    if (!this.fired('ayna') && z === 'banyo') this.updateS4(dt);
    if (!this.fired('kapi') && z === 'montaj' && this.house.doors.montaj && Math.abs(this.house.doors.montaj.pivot.rotation.y) > 0.6) this.updateS5(dt);
    if (z === 'bahce') this.updateGarden(dt);
    else if (this.s6.armed || this.s6.spawned) this.disarmS6();
    this.updateAmbient(dt);
  }

  /** Tavan arası kapısı ve S1..: dışarıdan çağrılan basit kancalar */
  onDeskRead() {
    if (this.off() || this.fired('kapi')) return;
    const w = this.walk;
    if (!w?.standing || w.zone !== 'montaj') return;
    const door = this.house.points.montajDoor;
    if (Math.hypot(w.pos.x - door.x, w.pos.z - door.z) < 2.5) return;
    if (!this.house.doors.montaj || Math.abs(this.house.doors.montaj.pivot.rotation.y) < 0.6) return;
    this.fire('kapi');
  }
  onTinRead() {
    if (this.off() || this.fired('cit') || !this.r.tinOpen) return;
    this.armS6(1);
  }
  onMirrorClosed() {
    if (this.off() || this.fired('ayna') || this.walk?.zone !== 'banyo') return;
    // 12 sn kuralı: bekleyen tetik, aralık dolunca banyodayken çalışır
    if (this.angleTo(this.house.points.mirror) < 30) this.s4Pending = true;
  }

  fire(id) {
    const f = { tonton: 's1', adam: 's2go', tv: 's3', ayna: 's4run', kapi: 's5run', cit: 's6go', monitor: 's7', delik: 'keyhole' }[id];
    if (!f) return;
    if (['tv', 'ayna', 'cit', 'monitor', 'delik'].includes(id)) this.lastLoud = this.g.clock;
    if (id === 'tv') return this.s3();
    if (id === 'cit') return this.s6go();
    if (id === 'delik') return this.keyhole();
    return this.run(id, () => this[f]());
  }

  // ================================================================== S1: Tonton merdivende
  async s1() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    const room = g.room;
    const pl = room.plush;
    const w = this.walk;
    this.mark('tonton');
    h.r.plushDown = true;
    this.s2.doneAt = null;
    const start = V(-1.2, 0.02, 3.6);
    pl.position.copy(start);
    pl.rotation.order = 'YXZ';
    pl.rotation.set(0, Math.PI, 0);
    au.sfx('thud', start);
    au.sfx('thud', V(start.x, start.y + 0.1, start.z + 0.2));
    const px = w.pos.x, pz = w.pos.z;
    const side = px > -1.2 ? -1 : 1;
    const passX = clamp(px + side * 0.32, -1.52, -0.88);
    const z0 = 3.6, z1 = 8.35;
    const total = z1 - z0;
    const hops = Math.round(total / 0.5);
    let lastHop = 0;
    let whooshed = false;
    pl.rotation.y = 0;
    await this.tween(hops * 0.2, (k) => {
      const z = lerp(z0, z1, k);
      const hopF = k * hops;
      const u = hopF - Math.floor(hopF);
      const floor = Math.max(YG, stairY(z)) + (z < 3.8 ? 0 : 0);
      pl.position.set(passX, floor + 0.08 + 0.25 * Math.sin(Math.PI * u), z);
      pl.rotation.x = -hopF * 2.4;
      const hop = Math.floor(hopF);
      if (hop !== lastHop) {
        lastHop = hop;
        au.sfx('thud', V(pl.position.x, floor + 0.05, z));
      }
      if (!whooshed && z >= pz) {
        whooshed = true;
        au.sfx('whoosh', au.at(passX, floor + 0.5, pz, 0.15));
      }
    });
    const foot = h.points.plushFoot;
    const cam = room.camera.position;
    pl.rotation.set(0, Math.atan2(cam.x - foot.x, cam.z - foot.z), 0);
    await this.tween(0.35, (k) => {
      pl.position.set(lerp(passX, foot.x, k), YG + 0.03 * (1 - k), lerp(z1, foot.z, k));
      pl.rotation.x = lerp(pl.rotation.x % (Math.PI * 2), 0, k);
    });
    pl.rotation.order = 'XYZ';
    pl.rotation.set(0, Math.atan2(cam.x - foot.x, cam.z - foot.z), 0);
    pl.position.copy(foot);
    await this.wait(0.6);
    au.sfx('squeak', V(foot.x, YG + 0.15, foot.z));
    this.s2.doneAt = g.clock;
    g.save();
  }

  // ================================================================== S2: koridorun sonundaki adam
  updateS2(dt) {
    const g = this.g;
    const h = this.house;
    const w = this.walk;
    const z = w.zone;
    const s = this.s2;
    const inHall = (z === 'giris' || z === 'hol') && w.pos.z >= 5.0;
    const man = h.man;
    if (!inHall) {
      if (s.shown) {
        man.visible = false;
        s.shown = false;
        s.seenT = 0;
      }
      return;
    }
    if (!s.shown) {
      s.shown = true;
      man.position.copy(h.points.man);
      man.userData.head.rotation.z = 0;
      man.visible = true;
    }
    if (this.seen(V(h.points.man.x, YG + 1.3, h.points.man.z), 18, 3.5, 9)) s.seenT += dt;
    else s.seenT = Math.max(0, s.seenT - dt);
    if (s.seenT >= 0.5) this.run('adam', () => this.s2go());
  }

  async s2go() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    const w = this.walk;
    const man = h.man;
    this.mark('adam');
    h.droneHold = 0.25;
    g.ambience?.setDrone(0.25, 1);
    this.tween(1.2, (k) => (man.userData.head.rotation.z = 0.25 * k));
    await this.wait(1.3);
    const pat = [[0, 0.08], [1, 0.06], [0, 0.1], [1, 0.05], [0, 0.35]];
    const f = w.flicker(pat);
    await this.wait(0.29);
    man.visible = false;
    await f;
    au.sfx('sting', au.at(h.points.man.x, YG + 1.5, h.points.man.z, 0.3));
    au.sfx('heartbeat', 4, 0.85);
    this.s2.shown = false;
    h.droneHold = null;
    g.ambience?.setDrone(0.04, 4);
  }

  // ================================================================== S3: salon televizyonu
  startTv() {
    const g = this.g;
    const h = this.house;
    const au = g.audio;
    const tv = this.tv;
    tv.on = true;
    tv.t0 = g.clock;
    tv.seenT = 0;
    tv.mode = 'static';
    this.lastLoud = g.clock;
    au.sfx('tvOnAt', h.points.salonTv);
    tv.stop = au.sfx('staticAt', h.points.salonTv, 60, 0.7);
    h.ambience.setWhine(false);
    h.zoneLight.position.set(-3.15, -1.9, 3.7);
    h.zoneLight.color.set(0x5878ff);
    h.zoneLevel = 0.7;
    h.screenFn = (clock) => this.screens(clock);
  }

  screens(clock) {
    const h = this.house;
    if (this.tv.on) h.drawSalon(this.tv.mode, this.tv.mode === 'glow' ? clock - this.tv.tg : clock);
    if (this.mon) h.drawMonitors(this.mon.modes, clock);
  }

  stopTv(silent) {
    const tv = this.tv;
    if (tv.stop) {
      try {
        tv.stop();
      } catch {
        /* sessiz */
      }
      tv.stop = null;
    }
    if (tv.on) {
      tv.on = false;
      const h = this.house;
      if (h?.built) {
        h.drawSalon('off');
        h.zoneBoost = 1;
        h.zoneLight.color.set(0x5d74b8);
        h.setZone(h.zone, true);
        if (!silent) this.g.audio.sfx('tvOffAt', h.points.salonTv);
        if (!this.mon) h.screenFn = null;
        if (!this.fired('tv')) h.ambience.setWhine(true);
      }
    }
  }

  updateTv(dt) {
    const tv = this.tv;
    if (!tv.on) return;
    const g = this.g;
    const h = this.house;
    if (tv.mode === 'static') {
      // mavi ışık titrer
      h.zoneBoost = 0.55 + Math.random() * 0.9;
      if (this.walk.zone === 'salon' && this.ready() && !this.active && this.seen(h.points.salonTv, 25, 0, 9)) tv.seenT += dt;
      else tv.seenT = Math.max(0, tv.seenT - dt * 0.5);
      if (g.clock - tv.t0 >= 0.6 && tv.seenT >= 0.2) this.run('tv', () => this.s3go());
      else if (g.clock - tv.t0 > 60) this.stopTv();
    }
  }

  s3() {
    if (!this.tv.on) this.startTv();
    return this.run('tv', () => this.s3go());
  }

  async s3go() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    const tv = this.tv;
    this.mark('tv');
    this.lastLoud = g.clock;
    if (tv.stop) {
      tv.stop();
      tv.stop = null;
    }
    tv.mode = 'face';
    const col = this.flashSafe() ? 0xffffff : 0xff3020;
    h.zoneLight.color.set(col);
    h.zoneBoost = 3.0 / Math.max(0.1, h.zoneLevel);
    au.sfx('scare', V(-3.15, -2.1, 3.3));
    g.ui.flash(80);
    this.walk.shake(0.02, 0.25);
    await this.wait(0.1);
    h.zoneBoost = 1;
    h.zoneLight.color.set(0x5878ff);
    await this.wait(0.5);
    au.sfx('tvOffAt', h.points.salonTv);
    tv.mode = 'glow';
    tv.tg = g.clock;
    h.zoneLevel = 0.1;
    await this.wait(1.5);
    tv.on = false;
    h.drawSalon('off');
    h.screenFn = this.mon ? h.screenFn : null;
    h.ambience.setWhine(false);
  }

  // ================================================================== S4: banyo aynası
  updateS4(dt) {
    const w = this.walk;
    const h = this.house;
    const s = this.s4;
    if (!this.loudOk()) return;
    if (this.s4Pending) {
      this.s4Pending = false;
      this.fire('ayna');
      return;
    }
    const d = Math.hypot(w.pos.x - h.points.mirror.x, w.pos.z - h.points.mirror.z);
    if (d <= 1.4 && this.angleTo(h.points.mirror) < 20) s.faceT += dt;
    else s.faceT = 0;
    if (s.faceT >= 2.0) {
      s.faceT = 0;
      this.fire('ayna');
    }
  }

  async s4run() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    const gh = h.ghost;
    this.mark('ayna');
    this.lastLoud = g.clock;
    await this.wait(0.25);
    const behind = () => {
      const cam = g.room.camera.position;
      const r = g.room;
      return V(cam.x + Math.sin(r.yaw) * 0.55 + Math.cos(r.yaw) * 0.25, -1.35, cam.z + Math.cos(r.yaw) * 0.55 - Math.sin(r.yaw) * 0.25);
    };
    const b0 = behind();
    au.sfx('scare', V(b0.x, b0.y, b0.z));
    g.ui.flash(80);
    gh.visible = true;
    const yaw0 = g.room.yaw;
    let gone = false;
    await this.tween(0.75, (k) => {
      if (gone) return;
      const dy = Math.abs((((g.room.yaw - yaw0 + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      if (dy > (60 * Math.PI) / 180) {
        gone = true;
        gh.visible = false;
        return;
      }
      const p = behind();
      gh.position.set(6.4 - p.x, p.y, p.z);
      const cam = g.room.camera.position;
      gh.rotation.y = Math.atan2(cam.x - gh.position.x, cam.z - gh.position.z);
      gh.rotation.z = Math.sin(k * 5) * 0.08;
    });
    gh.visible = false;
    this.walk.flicker([[0, 0.07], [1, 0.05], [0.2, 0.08]]);
    await this.wait(0.5);
    // arkadaki kapı yavaşça kendiliğinden kapanır
    if (h.doors.banyo && Math.abs(h.doors.banyo.pivot.rotation.y) > 0.3) {
      h.setDoor('banyo', false, 2.5);
      au.sfx('creak', h.points.bathDoor, 2.4);
      h.r.doors = { ...(h.r.doors || {}), banyo: false };
      g.save();
    }
  }

  // ================================================================== S5: montaj kapısı çarpar
  updateS5(dt) {
    const w = this.walk;
    const h = this.house;
    const door = h.points.montajDoor;
    if (Math.hypot(w.pos.x - door.x, w.pos.z - door.z) < 2.5) {
      this.s5.deskT = 0;
      return;
    }
    // masaya (x -4.6..-3.8, z -1.5..0.9) 1 m yakınlıkta 1.5 sn
    const dx = Math.max(-4.6 - w.pos.x, 0, w.pos.x + 3.8);
    const dz = Math.max(-1.5 - w.pos.z, 0, w.pos.z - 0.9);
    if (Math.hypot(dx, dz) < 1.0) this.s5.deskT += dt;
    else this.s5.deskT = 0;
    if (this.s5.deskT >= 1.5) {
      this.s5.deskT = 0;
      this.fire('kapi');
    }
  }

  async s5run() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    this.mark('kapi');
    const d = h.doors.montaj;
    this.walk.shake(0.025, 0.2);
    g.room.tweens.add(d.pivot.rotation, 'y', 0, 0.15);
    au.sfx('doorSlam', h.points.montajDoor, 1.3);
    h.r.doors = { ...(h.r.doors || {}), montaj: false };
    g.save();
    // monitörler 0.3 sn karıncalanır, sonra söner
    this.mon = { modes: 'static' };
    h.screenFn = (clock) => this.screens(clock);
    au.sfx('tvOnAt', h.points.desk);
    await this.wait(0.3);
    this.mon = null;
    h.drawMonitors('off');
    if (!this.tv.on) h.screenFn = null;
  }

  // ================================================================== S6: çitteki figür
  armS6(delay) {
    const s = this.s6;
    if (s.armed || s.spawned) return;
    s.armed = true;
    s.t = -delay;
    s.seenT = 0;
    s.cue = false;
  }
  disarmS6() {
    const s = this.s6;
    const h = this.house;
    if (s.spawned) {
      h.manArms.visible = false;
      this.swingStop = false;
      h.ambience.muteGarden(false, 0.3);
    }
    s.armed = s.spawned = false;
  }

  updateGarden(dt) {
    const g = this.g;
    const h = this.house;
    const w = this.walk;
    const r = this.r;
    const s = this.s6;
    // yeniden yükleme sonrası: kutu okunmuş ama figür gelmemişse ağaca yaklaşınca kur
    if (!this.fired('cit') && r.tinOpen && !s.armed && !s.spawned && Math.hypot(w.pos.x - h.points.tree.x, w.pos.z - h.points.tree.z) < 4) this.armS6(1);
    if (this.fired('cit') || !(s.armed || s.spawned)) {
      this.updateA3(dt);
      return;
    }
    s.t += dt;
    if (!s.spawned) {
      if (s.t >= 0) {
        s.spawned = true;
        s.t = 0;
        const x = clamp(w.pos.x + 1.2, -4.5, 4.5);
        h.manArms.position.set(x, YB, -13.3);
        h.manArms.visible = true;
        this.swingStop = true;
        h.ambience.muteGarden(true, 0.5);
      }
      return;
    }
    if (this.seen(V(h.manArms.position.x, YB + 1.3, h.manArms.position.z), 20, 2, 30)) s.seenT += dt;
    else s.seenT = Math.max(0, s.seenT - dt);
    if (!s.cue && s.t > 25) {
      s.cue = true;
      g.audio.sfx('swingCreak', h.points.swing, 0.1);
      g.audio.sfx('twigSnap', V(h.manArms.position.x, YB + 0.2, -13.0));
    }
    if (s.seenT >= 0.35 && this.loudOk() && !this.active) this.fire('cit');
  }

  s6go() {
    return this.run('cit', async () => {
      const g = this.g;
      const au = g.audio;
      const h = this.house;
      const s = this.s6;
      const man = h.manArms;
      this.mark('cit');
      this.lastLoud = g.clock;
      if (!man.visible) {
        const x = clamp(this.walk.pos.x + 1.2, -4.5, 4.5);
        man.position.set(x, YB, -13.3);
        man.visible = true;
      }
      s.armed = false;
      s.spawned = false;
      this.swingStop = true;
      h.ambience.muteGarden(true, 0.2);
      await this.wait(0.4);
      this.inputLock = true;
      const from = man.position.clone();
      const room = g.room;
      const cam = room.camera.position;
      const f = this.fwd();
      const to = V(cam.x + f.x * 0.6, cam.y - 1.3, cam.z + f.z * 0.6);
      au.sfx('scare', V(to.x, to.y + 1, to.z));
      au.sfx('boom');
      g.ui.flash(100);
      this.walk.shake(0.03, 0.35);
      await this.tween(0.22, (k) => {
        const e = ease(k);
        man.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e), lerp(from.z, to.z, e));
      });
      await this.wait(0.2);
      // ekran bir an kararır
      const el = $('fade');
      el.style.transition = 'none';
      el.classList.add('on');
      void el.offsetWidth;
      man.visible = false;
      el.style.transition = 'opacity .3s';
      el.classList.remove('on');
      setTimeout(() => (el.style.transition = ''), 400);
      this.inputLock = false;
      await this.wait(2);
      h.ambience.muteGarden(false, 4);
      this.swingStop = false;
    });
  }

  // ================================================================== A3: pencerede kız
  updateA3(dt) {
    if (this.fired('pencere') || this.fired('cit') || this.active) return;
    const h = this.house;
    const w = this.walk;
    const win = V(1.4, 1.4, -2.6);
    if (w.pos.z > -6.5 && this.seen(win, 15, 3.5, 12) && Math.abs(w.pos.x - 1.4) < 8) this.run('pencere', () => this.a3());
  }

  async a3() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    this.mark('pencere');
    h.winGirl.visible = true;
    const win = V(1.4, 1.3, -2.6);
    let t = 0;
    while (t < 4) {
      await this.wait(0.1);
      t += 0.1;
      if (t > 0.6 && !this.seen(win, 28, 0, 25)) break;
    }
    h.winGirl.visible = false;
    h.litWindow.visible = false;
    au.sfx('knock', V(1.4, 1.5, -2.6), 2, 0.4);
    await this.wait(0.2);
    h.litWindow.visible = true;
  }

  // ================================================================== S7: monitörler (9. kaset alınca)
  async afterTape9() {
    const g = this.g;
    if (this.off() || this.fired('monitor') || !this.ready()) {
      this.startR1();
      return;
    }
    this.lastLoud = g.clock;
    await this.run('monitor', () => this.s7());
    if (this.has9() && !this.r.atticSealed) {
      try {
        await this.wait(1.0);
      } catch {
        return;
      }
      this.startR1();
    }
  }

  async s7() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    const w = this.walk;
    this.mark('monitor');
    const desk = h.points.desk;
    await this.wait(0.6);
    au.sfx('deckClunkAt', V(desk.x, -2.0, -1.2));
    await this.wait(0.15);
    au.sfx('deckClunkAt', V(desk.x, -2.0, -0.6));
    h.drawDecks('PLAY');
    au.sfx('tvOnAt', desk);
    this.mon = { modes: 'static' };
    h.screenFn = (clock) => this.screens(clock);
    await this.wait(0.25);
    this.mon.modes = ['trees', 'sobe', 'rec'];
    if (g.lines.k8_ebe_sobe) {
      this.wait(1.9).then(() => this.say('k8_ebe_sobe', '???', 'bilinmeyen', V(0, -1.9, 3.5), 1)).catch(() => {});
    }
    await this.wait(1.2);
    this.mon.modes = 'face';
    au.sfx('scare', V(desk.x + 0.3, -1.9, desk.z));
    h.zoneLight.color.set(this.flashSafe() ? 0xffffff : 0x9aff8a);
    h.zoneBoost = 3.0 / Math.max(0.1, h.zoneLevel);
    g.ui.flash(80);
    await this.wait(0.12);
    h.zoneBoost = 1;
    h.zoneLight.color.set(0x5d74b8);
    await this.wait(0.48);
    this.mon = null;
    h.drawMonitors('off');
    h.drawDecks('');
    h.screenFn = null;
    h.ambience.setDeck(false);
    // fener ölür: tam karanlık
    h.zoneBoost = this.flashSafe() ? 0.1 : 0;
    await w.flicker([[0, 1.6]]);
    h.zoneBoost = 1;
    await this.wait(0.2);
  }

  // ================================================================== R1: geri dönüş sayımı
  async startR1() {
    const g = this.g;
    const h = this.house;
    if (this.r1 || this.r.atticSealed || !this.has9()) return;
    this.r1 = true;
    this.r1T = 0;
    g.updateObjective();
    const line = g.lines.t1_count;
    if (line) {
      const lw = g.director.labelFor(line);
      g.ui.subtitle(lw.label, g.director.fmt(line.s || line.t), lw.cls);
      const hd = g.audio.playRoomVoice('t1_count', { pos: h.points.plushFoot, gain: 1.1, rate: 0.93, detune: -70 });
      Promise.race([hd.promise, new Promise((r) => setTimeout(r, 12000))]).then(() => g.ui.subtitle(null, null, null, 0.6));
    }
  }

  updateR1(dt) {
    if (!this.r1) return;
    const g = this.g;
    const w = this.walk;
    const h = this.house;
    if (this.r.atticSealed || !this.has9()) {
      this.r1 = false;
      return;
    }
    const pl = g.room.plush;
    // peluşun başı kameraya döner
    if (this.r.plushDown) {
      const cam = g.room.camera.position;
      if (Math.hypot(cam.x - pl.position.x, cam.z - pl.position.z) < 2 && w.level !== 'bahce') {
        const want = Math.atan2(cam.x - pl.position.x, cam.z - pl.position.z);
        let d = want - pl.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        pl.rotation.y += d * Math.min(1, dt * 4);
      }
    }
    // takipçi: yürürken arkada ayak sesi, durunca durur
    const moving = Math.hypot(w.vel.x, w.vel.z) > 0.3;
    if ((w.level === 'zemin' || w.zone === 'merdiven') && moving && w.standing) {
      this.r1T += dt;
      if (this.r1T >= 1.3) {
        this.r1T = 0;
        const f = this.fwd();
        const p = V(w.pos.x - f.x * 4, w.pos.y + 0.05, w.pos.z - f.z * 4);
        g.audio.sfx('footCreak', p);
      }
    } else this.r1T = Math.min(this.r1T, 0.6);
  }

  // ================================================================== mühür: kapı çarpar ve kilitlenir
  updateSeal() {
    const g = this.g;
    const w = this.walk;
    const r = this.r;
    if (this.sealing || r.atticSealed || !this.has9() || !r.walk) return;
    if (w.level !== 'ust' || w.zone !== 'cati' || w.pos.z >= 2.0) return;
    if (g.panelOpen() || g.director.active || g.loadingTape) return;
    this.seal();
  }

  async seal(silent = false) {
    const g = this.g;
    const r = this.r;
    const room = g.room;
    const au = g.audio;
    const pts = room.points;
    if (r.atticSealed) return;
    if (silent) {
      r.atticSealed = true;
      r.doorOpen = false;
      room.tweens.add(room.doorPivot.rotation, 'y', 0, 0.01);
      room.doorPivot.rotation.y = 0;
      this.r1 = false;
      g.save();
      g.updateObjective();
      return;
    }
    this.sealing = true;
    const gen = this.gen;
    try {
      room.tweens.add(room.doorPivot.rotation, 'y', 0, 0.18);
      au.sfx('doorSlam', pts.door, 1.4);
      if (!g.settings.flash) room.flickerBurst(0.6);
      this.walk.shake(0.015, 0.2);
      await this.wait(0.5);
      await this.say('n_count_end', '???', 'bilinmeyen', pts.door, 1.3);
      au.sfx('keyTurn', pts.door);
      r.atticSealed = true;
      r.doorOpen = false;
      this.r1 = false;
      g.save();
      g.updateObjective();
      g.ui.toast('Kapı arkandan çarparak kapandı. Kilit kendi kendine döndü. Anahtar artık kilide girmiyor.', 6);
      await this.wait(2);
      au.sfx('breath', pts.door, 2);
    } catch (e) {
      if (e !== CANCEL) console.error(e);
      // iptal edilse bile mühür tamamlanır
      if (!r.atticSealed) {
        r.atticSealed = true;
        r.doorOpen = false;
        room.doorPivot.rotation.y = 0;
        g.save();
      }
    } finally {
      if (this.gen === gen) this.sealing = false;
    }
  }

  // ================================================================== ortam olayları A1, A2
  updateAmbient(dt) {
    const g = this.g;
    const h = this.house;
    const w = this.walk;
    const r = this.r;
    const au = g.audio;
    // A1: üstten ayak sesleri
    if (!this.fired('ust') && (w.zone === 'montaj' || w.zone === 'mutfak') && this.leftAtticAt != null && g.clock - this.leftAtticAt >= 20) {
      this.mark('ust');
      this.run('ust', async () => {
        const f = this.fwd();
        for (let i = 0; i < 4; i++) {
          au.sfx('footCreak', V(w.pos.x + f.x * (1 + i * 0.8), 0.05, w.pos.z + f.z * (1 + i * 0.8)));
          await this.wait(1.2);
        }
        au.sfx('woodScrape', V(0, 0.3, 0.72), 0.5);
        await this.wait(1.2);
        au.sfx('whistle', g.room.points.tv, 0.5);
      });
    }
    // A2: Nermin'in kapısının ardında müzik kutusu
    if (!this.fired('kutu') && !this.fired('delik') && w.zone === 'hol' && Math.hypot(w.pos.x - 0.9, w.pos.z - 4.0) < 3) {
      this.mark('kutu');
      this.stopBox = au.sfx('musicBox', h.points.nermin, 0.55, 3);
      this.musicBoxPlaying = true;
      this.wait(24)
        .then(() => this.stopMusicBox())
        .catch(() => {});
    }
  }

  stopMusicBox() {
    if (this.stopBox) {
      try {
        this.stopBox();
      } catch {
        /* sessiz */
      }
      this.stopBox = null;
    }
    this.musicBoxPlaying = false;
  }

  // ================================================================== S8: anahtar deliği
  async keyhole() {
    const g = this.g;
    const au = g.audio;
    const h = this.house;
    if (this.busyKey) return;
    this.busyKey = true;
    try {
      this.stopMusicBox();
      this.lastLoud = g.clock;
      const stop = au.sfx('musicBox', V(2.5, -2.0, 4.0), 0.7, 1);
      await g.ui.keyhole(() => au.sfx('scare', h.points.nermin));
      stop?.();
      this.mark('delik');
      g.ui.toast('Kapının öbür yanından ayak sesleri uzaklaştı.', 5);
    } finally {
      this.busyKey = false;
    }
  }
}

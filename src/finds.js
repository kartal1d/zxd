// Kasetler arası bulmacalar (tavan arası tarafı): sandık, kilitler, ilk izlemeden sonraki olaylar,
// yürüyerek sıcak-soğuk oyunu, sandalye altındaki kaset ve kapı ritüeli. Evdeki buluntular: houseflow.js.
// Adımlar ve hedef yazıları: flow.js (docs/ev-akisi.md).
import * as THREE from 'three';
import * as S from './draw/scenes.js';
import { has as hasWord } from './util.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Yürüyerek sıcak-soğuk (docs/ev-akisi.md §2.5): bölge -> söz */
const HC_ZONE = { cati: 'Buz gibi', salon: 'Buz gibi', banyo: 'Buz gibi', sahanlik: 'Uzaksın', merdiven: 'Uzaksın', giris: 'Uzaksın', hol: 'Isınıyorsun', mutfak: 'Isınıyorsun', montaj: 'Isınıyorsun' };
const HC_LINE = { 'Buz gibi': 'k8_room_ice', 'Uzaksın': 'k8_room_cold', 'Isınıyorsun': 'k8_room_warm', 'Sıcak!': 'k8_room_hot', 'Yandın!': 'k8_room_burn' };
export function hotColdBand(zone, distToSwing) {
  if (zone === 'bahce') {
    const d = distToSwing;
    return d <= 2.2 ? 'Yandın!' : d <= 5 ? 'Sıcak!' : d <= 9 ? 'Isınıyorsun' : d <= 13 ? 'Uzaksın' : 'Buz gibi';
  }
  return HC_ZONE[zone] || 'Buz gibi';
}

export class Finds {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.seekingFor = null;
    this.wrong = {};
    this.hc = { band: null, pending: null, since: 0, lastSaid: -10, sameT: 0, start: 0 };
    this.ritual = null;
    this.stopRing?.();
    this.stopRing = null;
    this.stopHiss?.();
    this.stopHiss = null;
  }

  get st() {
    return this.g.state;
  }
  get room() {
    return (this.st.room = this.st.room || {});
  }
  has(n) {
    return (this.st.tapes || []).includes(n);
  }

  /** Şu an aranan kaset (yoksa null) */
  seeking() {
    const s = this.st.stage;
    if (s < 2 || s >= 10) return null;
    const n = s + 1;
    return this.has(n) ? null : n;
  }

  objective() {
    return this.g.flow?.objective() ?? null;
  }

  toast(text, sec = 5) {
    this.g.ui.toast(text, sec);
  }

  /** Odadan konuşma (kaset oynamıyorken): konumlu ses + altyazı */
  async roomSay(id, pos) {
    const line = this.g.lines[id];
    if (!line) return;
    const d = this.g.director;
    const w = d.labelFor(line);
    this.g.ui.subtitle(w.label, d.fmt(line.s || line.t), w.cls);
    const h = this.g.audio.playRoomVoice(id, { pos, gain: 1.3 });
    await h.promise;
    this.g.ui.subtitle(null, null, null, 0.4);
  }

  // ================================================================ etiketler
  label(id) {
    const st = this.st;
    const r = this.room;
    const s = st.stage;
    switch (id) {
      case 'sheet':
        return r.furnitureMoved ? 'Çarşaf' : 'Örtülü eşya';
      case 'chest':
        if (!r.furnitureMoved) return 'Örtülü eşya';
        if (s >= 3 && !r.chestOpen) return '<b>Sandığın harf kilidi</b>';
        if (r.chestOpen && !r.key) return '<b>Anahtarı al</b>';
        if (r.t4Chest && !this.has(4)) return '<b>Kaseti al</b>';
        if (r.falseBottom && !r.fbOpen) return '<b>Sahte dibin kilidi</b>';
        return 'Oyuncak sandığı';
      case 'phone':
        return 'Telefon';
      case 'floorboard':
        if (!r.kilimLifted || this.has(5)) return '';
        return r.boardOpen ? '<b>Kaseti al</b>' : '<b>Gevşek tahta</b>';
      case 'giftbox':
        return this.has(6) ? 'Hediye kutusu' : r.giftOpen ? '<b>Kaseti al</b>' : '<b>Hediye kutusu</b>';
      case 'chairleg':
        return s === 6 && !this.has(7) ? '<b>Bantlı kaset</b>' : '';
      case 'chain':
        return '<b>Zinciri çek</b>';
      case 'doortape':
        return '<b>Kaseti al</b>';
      default:
        return null;
    }
  }

  // ================================================================ etkileşimler
  /** true döndürürse etkileşim burada işlendi */
  async interact(id) {
    const PUZZLE = ['sheet', 'chest', 'phone', 'floorboard', 'giftbox', 'chairleg', 'chain', 'doortape'];
    if ((this.g.director.active || this.g.loadingTape) && PUZZLE.includes(id)) {
      this.toast('Önce kaset bitsin.', 2.5);
      return true;
    }
    const st = this.st;
    const r = this.room;
    const s = st.stage;
    const g = this.g;
    const au = g.audio;
    switch (id) {
      case 'sheet':
      case 'chest': {
        if (!r.furnitureMoved) {
          this.toast('Çarşafın altı buz gibi.');
          return true;
        }
        if (s >= 3 && !r.chestOpen) {
          const ok = await this.lock('chest', 'SOBE', 4, 'OYUNCAK SANDIĞI', [
            'Beste bu hafta bir sihirli söz öğretmişti.',
            'Saklambaçta birini bulunca bağırılan söz.',
            'S _ _ E.',
          ]);
          if (ok) {
            r.chestOpen = true;
            g.room.attic.openChest();
            au.sfx('boxOpen', g.room.points.chest);
            g.save();
            g.updateObjective();
            // ev şimdi kurulur: kurulum takılması bir sonraki okuyucunun arkasında kalsın
            g.house?.ensureBuilt();
            await sleep(1200);
            await this.takeKey();
          }
          return true;
        }
        if (r.chestOpen && !r.key) {
          await this.takeKey();
          return true;
        }
        if (r.t4Chest && !this.has(4)) {
          // eski kayıt: 4. kaset hâlâ sandıkta
          au.sfx('pickup');
          g.addTape(4);
          this.toast('Sandıkta bir kaset duruyordu. Etiketinde "Beste 4 — Kaybolursan Ne Yaparsın?" yazıyor.', 6);
          g.updateObjective();
          return true;
        }
        if (r.falseBottom && !r.fbOpen) {
          const ok = await this.lock('falsebottom', 'EBE', 3, 'SAHTE DİP', [
            'Nermin onun adı diyor: ağaçların arasındaki adamın adı.',
            'Saklambaçta sayan, arayan kişi.',
            'Üç harf. E ile başlar, E ile biter.',
          ]);
          if (ok) {
            r.fbOpen = true;
            g.room.attic.openFalseBottom();
            au.sfx('boxOpen', g.room.points.chest);
            await sleep(1400);
            au.sfx('pickup');
            g.room.attic.apply(this.st); // MONTAJ anahtarı sandıktan alındı
            g.house?.ensureBuilt();
            g.house?.apply(this.st);
            this.toast("Sahte dibin altına bantlanmış bir anahtar var. Kâğıt etiketinde 'MONTAJ' yazıyor. Yanında iki kâğıt.", 7);
            g.save();
            g.updateObjective();
            await g.readDoc('memo');
            await g.readDoc('ifade');
            g.save();
            g.updateObjective();
          }
          return true;
        }
        if (r.fbOpen) {
          this.toast('Sandığın sahte dibi açık. İçi boş.');
          return true;
        }
        if (r.chestOpen && s < 8) {
          this.toast('Sandığın dibi tuhaf, çift katlı gibi. Şimdilik kıpırdamıyor.');
          return true;
        }
        this.toast('Mavi bir oyuncak sandığı. Üstünde sarı bir yıldız var.');
        return true;
      }
      case 'phone': {
        // tavan arası telefonu artık yalnız bir eşya: çalan telefon aşağıda, girişte
        if (s < 4) this.toast('Eski, krem rengi, çevirmeli bir telefon. Kadranın ortasında 364 51 80 yazıyor. Kablosu duvara bağlı değil.', 5);
        else if (s === 4 && !r.holCall && !r.kilimLifted && !this.has(5)) this.toast('Bu telefonun kablosu duvara bağlı değil. Çalan telefon aşağıda, girişte.', 5);
        else this.toast('Telefon sessiz. Kablosu hâlâ duvara bağlı değil.');
        return true;
      }
      case 'floorboard': {
        if (!r.kilimLifted || this.has(5)) return true;
        if (!r.boardOpen) {
          r.boardOpen = true;
          g.room.attic.openBoard();
          au.sfx('woodScrape', g.room.points.floorboard, 0.8);
          await sleep(900);
        }
        au.sfx('pickup');
        g.addTape(5);
        this.toast('Tahtanın altında bir kaset, yıldızlı bir saç tokası ve katlanmış bir gazete var.', 6);
        await g.readDoc('news2');
        g.updateObjective();
        return true;
      }
      case 'giftbox': {
        if (this.has(6)) {
          await g.readDoc('dogumgunu');
          return true;
        }
        if (!r.boxToppled) return true;
        if (!r.giftOpen) {
          const ok = await this.giftKeypad();
          if (!ok) return true;
          r.giftOpen = true;
          g.room.attic.openGift();
          au.sfx('boxOpen', g.room.points.giftbox);
          await sleep(700);
        }
        au.sfx('pickup');
        g.addTape(6);
        this.toast('Kutunun içinde bir kaset ve bir zarf var.');
        await g.readDoc('dogumgunu');
        g.updateObjective();
        return true;
      }
      case 'chairleg': {
        if (!(s === 6 && !this.has(7))) return true;
        this.stopHiss?.();
        this.stopHiss = null;
        au.sfx('pickup');
        g.addTape(7);
        this.toast("Sandalyenin ayağına bantlanmış bir kaset. Etiketinde 'Beste 1 — Tanışalım' yazıyor. Ama 1. kaset dolabın üstünde duruyor.", 7);
        g.updateObjective();
        g.scares?.onTape7Pickup();
        return true;
      }
      case 'chain':
        this.pullChain();
        return true;
      case 'doortape': {
        if (this.has(10)) return true;
        au.sfx('pickup');
        g.addTape(10);
        this.toast('Kaset hâlâ sıcak. Etiketinde tek kelime kalmış: SON.', 5);
        g.updateObjective();
        return true;
      }
      default:
        return false;
    }
  }

  /** SOBE sandığından: ALT KAT anahtarı, el feneri ve resim */
  async takeKey() {
    const g = this.g;
    const r = this.room;
    if (r.key) return;
    g.audio.sfx('pickup');
    r.key = true;
    g.room.attic.apply(this.st);
    this.toast("Sandıkta eski bir anahtar, küçük bir el feneri, mum boya bir resim ve turuncu, kesik bir peluş kuyruğu var. Anahtarın etiketinde 'ALT KAT' yazıyor.", 7);
    g.save();
    g.updateObjective();
    await g.readDoc('resim');
    g.updateObjective();
  }

  /** Beste'nin evini arama tuş takımı (giriş telefonu; eski kayıtlarda tavan arası). true: doğru numara çevrildi */
  async dialHome() {
    const g = this.g;
    const au = g.audio;
    g.releasePointer();
    const hints = ["Beste'nin şarkıdaki ev numarası. Yedi rakam.", '364 ile başlıyordu. Sonra iki kere en sevdiği sayı.', '364 27 27.'];
    const ok = await g.ui.keypad(
      (code) => {
        if (code === '3642727') return true;
        if (code === '3645180') {
          au.sfx('busy', 6);
          return 'Hat meşgul. Hat sanki başka bir yerde de açık.';
        }
        return 'Aradığınız numaraya şu anda ulaşılamıyor.';
      },
      {
        len: 7,
        mask: '___ __ __',
        title: 'ÇEVİR',
        help: 'Numarayı rakamlarla çevir · Esc: kapat',
        onDigit: (k) => au.sfx('rotaryDial', +k, au.room),
        onWrong: () => this.wrongHint('phone', hints),
      },
    );
    g.lockPointer();
    return ok;
  }

  /** Bağlantı kurulunca Beste'nin iki fısıltısı ahizeden (pos: telefon) */
  async homeCall(p) {
    const au = this.g.audio;
    const dur = au.sfx('ringback', 2) || 8;
    await sleep(Math.min(dur, 8) * 1000 * 0.5);
    au.sfx('phonePickup', p);
    await sleep(600);
    await this.roomSay('k5_room_real1', p);
    await this.roomSay('k5_room_real2', p);
    au.sfx('hangup', p);
  }

  /** Hediye kutusunun gün/ay kilidi */
  async giftKeypad() {
    const g = this.g;
    g.releasePointer();
    const ok = await g.ui.keypad((code) => (code === '0302' ? true : code === '0203' ? 'Neredeyse. Önce gün, sonra ay.' : false), {
      len: 4,
      mask: '__/__',
      title: 'GG/AA',
      help: 'Gün ve ay · Esc: kapat',
      onWrong: () => this.wrongHint('gift', ['Etikete göre doğum gününde açılacak...', 'Metal kutudaki okul kartına bak.', 'Gün ve ay: 03 02.']),
    });
    g.lockPointer();
    return ok;
  }

  /** Harf kilidi; yanlışlarda 2/4/6. denemede ipucu */
  lock(key, word, len, title, hints) {
    this.g.releasePointer();
    const p = this.g.ui.wordlock((w) => hasWord(w, word) && w.trim().length <= len + 1, {
      len,
      title,
      onWrong: () => this.wrongHint(key, hints),
    });
    return p.then((ok) => {
      this.g.lockPointer();
      return ok;
    });
  }

  wrongHint(key, hints) {
    const n = (this.wrong[key] = (this.wrong[key] || 0) + 1);
    const i = n === 2 ? 0 : n === 4 ? 1 : n >= 6 ? 2 : -1;
    if (i >= 0) setTimeout(() => this.toast(hints[i], 6), 500);
  }

  // ================================================================ ilk izlemeden sonraki oda olayları
  async afterFirst(n) {
    const g = this.g;
    const r = this.room;
    const pts = g.room.points;
    const au = g.audio;
    const h = g.house;
    if (n === 3) {
      await sleep(2500);
      r.furnitureMoved = true;
      au.sfx('woodScrape', pts.chest, 2.2);
      au.sfx('clothSlide', pts.chest, 1.6);
      g.room.attic.moveFurniture();
      this.toast('Arkanda bir şey yer değiştirdi.', 4);
    } else if (n === 4) {
      // girişteki telefon çalar (çalma, house.updateLeads'te duruma bağlı sürer)
      await sleep(1500);
      if (!r.kilimLifted && !r.holCall) this.toast('Aşağıdan bir telefon sesi geliyor. Girişten.', 5);
    } else if (n === 5) {
      await sleep(2000);
      if (!r.boxToppled && !r.koliDown) {
        r.koliDown = true;
        h?.ensureBuilt();
        h?.toppleKoli(true);
        this.toast('Aşağıdan, mutfak tarafından bir gürültü geldi. Bir şey devrildi.', 5);
      }
    } else if (n === 6) {
      // ampul 6. kasette söndü; 7. kaset oynayana kadar karanlık
      r.bulbDead = true;
      this.applyLight();
      this.toast('Ampul söndü. Fenerin var: ayağa kalkınca kendiliğinden yanar (Q).', 6);
    } else if (n === 7) {
      r.hotcold = true;
      r.arkaUnlocked = true;
      g.room.attic.apply(this.st);
      g.save();
      this.hc = { band: null, pending: null, since: 0, lastSaid: -10, sameT: 0, start: g.clock + 4.5 };
      await sleep(1500);
      if (h?.built) au.sfx('boltSlide', h.points.backDoor, 1.4);
      this.toast('Aşağıda bir kapının sürgüsü kendiliğinden açıldı.', 5);
    } else if (n === 8) {
      await sleep(1500);
      r.falseBottom = true;
      au.sfx('chestLid', pts.chest);
      g.room.attic.raiseFalseBottom();
      this.toast('Sağ tarafta bir kapak gıcırdadı.', 4);
    } else if (n === 9) {
      await sleep(1500);
      r.chain = true;
      g.room.attic.apply(this.st);
      au.sfx('pop', pts.bulb);
      this.toast('Ampulün yanından bir zincir sarkıyor. Az önce orada değildi.', 5);
    }
    // ilk izlemede applyStage çağrılmaz: evdeki eşyalar (salıncaktaki kaset, şerit...) yeni aşamaya göre yerleşsin
    if (h?.built && !g.playingTape) h.apply(this.st);
    g.save();
    this.t = 0;
    g.updateObjective();
  }

  /** Bir kaset oynamaya başlarken (7. kaset ışığı geri getirir) */
  onTapeStart(n) {
    if (n === 7 && this.room.bulbDead) {
      this.room.bulbDead = false;
      this.applyLight();
    }
    this.stopHiss?.();
    this.stopHiss = null;
  }

  /** Ampul durumu: 6. kasetten sonra ölü, zincirle söndürülmüş ya da açık */
  applyLight() {
    const r = this.room;
    const off = r.bulbDead || r.lightOff;
    this.g.room.setBulb(off ? 0 : this.g.room.moodBase ?? 1, 0.15);
    this.g.room.moon.intensity = r.bulbDead ? 0.32 : this.g.room.moon.intensity;
  }

  /** 7. kaset için: karanlıkta sandalyenin altından bant hışırtısı */
  hiss() {
    if (this.stopHiss) return;
    const au = this.g.audio;
    const p = this.g.room.points.chairLeg;
    const out = au.at(p.x, p.y, p.z, 0.15);
    const src = au.loopNoise();
    const f = au.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 4200;
    f.Q.value = 0.6;
    const gn = au.ctx.createGain();
    gn.gain.value = 0.05;
    src.connect(f).connect(gn).connect(out);
    this.stopHiss = () => {
      gn.gain.setTargetAtTime(0, au.now, 0.1);
      setTimeout(() => src.stop(), 500);
    };
    this.toast('Karanlıkta bant hışırtısı. Çok yakından geliyor.', 5);
  }

  // ================================================================ zincir ve ritüel
  pullChain() {
    const g = this.g;
    const r = this.room;
    g.audio.sfx('click');
    g.audio.sfx('pop', g.room.points.bulb);
    r.lightOff = !r.lightOff;
    this.applyLight();
    if (r.lightOff && this.st.stage === 9 && !this.has(10) && !r.ritualDone && !this.ritual) this.startRitual();
    else if (!r.lightOff && this.ritual && !this.ritual.past) {
      // sessizlik sırasında ışık yandı: ritüel baştan
      this.ritual.cancelled = true;
      this.ritual = null;
    }
  }

  async startRitual() {
    const g = this.g;
    const pts = g.room.points;
    const au = g.audio;
    const rit = (this.ritual = { cancelled: false, past: false });
    g.tv.p.power = 0;
    await sleep(8000);
    if (rit.cancelled || this.ritual !== rit || g.mode === 'title') {
      g.tv.p.power = 1;
      return;
    }
    rit.past = true;
    const alive = () => this.ritual === rit && g.mode !== 'title';
    // merdivenden yavaş adımlar
    for (let i = 0; i < 5; i++) {
      const k = i / 4;
      au.sfx('footCreak', new THREE.Vector3(-1.2, -1.6 + k * 1.6, 6.0 - k * 2.4));
      await sleep(1100);
      if (!alive()) return;
    }
    au.sfx('knock', pts.door, 3, 0.6);
    await sleep(2400);
    if (!alive()) return;
    g.room.doorGlow(0.3);
    await sleep(1800);
    if (!alive()) return g.room.doorGlow(0);
    au.sfx('woodScrape', pts.door, 0.7);
    g.room.attic.showDoorTape(true);
    g.room.attic.doorTape.position.z = 2.62;
    g.room.tweens.add(g.room.attic.doorTape.position, 'z', 2.45, 0.7);
    await sleep(900);
    await this.roomSay('k10_room_door', pts.door);
    await sleep(1200);
    g.room.doorGlow(0);
    this.room.ritualDone = true;
    this.room.lightOff = false;
    if (!g.settings.flash) g.room.flickerBurst(1.2);
    this.applyLight();
    g.tv.p.power = 1;
    this.ritual = null;
    this.toast('Kapının altından bir kaset kaydı. Kenarları erimiş, hâlâ sıcak. Etiketinden geriye tek kelime kalmış: SON.', 8);
    g.save();
    g.updateObjective();
  }

  // ================================================================ her kare
  update(dt) {
    const g = this.g;
    // ayaktayken sandalyenin oturağına bakınca da 7. kaset bulunur
    const at = g.room.attic;
    const live = at.chairTape.visible;
    const want = live && !!g.walk?.standing;
    if (at.chairHit2.visible !== want) at.chairHit2.visible = want;
    if (g.mode !== 'play' || g.director.active || g.loadingTape || g.overlay) return;
    const n = this.seeking();
    if (n !== this.seekingFor) {
      this.seekingFor = n;
      this.t = 0;
    }
    if (n == null) {
      if (g.house) g.house.swingHold = false;
      return;
    }
    this.t += dt;
    if (n === 8 && this.room.hotcold) this.updateHotCold(dt);
    else if (g.house) g.house.swingHold = false;
  }

  /** Yürüyerek sıcak-soğuk: oyuncunun bulunduğu oda ve bahçede salıncağa uzaklık (§2.5) */
  updateHotCold(dt) {
    const g = this.g;
    const hc = this.hc;
    if (g.clock < (hc.start || 0) || g.panelOpen() || g.playingTape) return;
    const w = g.walk;
    const zone = w?.standing ? w.zone : 'cati';
    const sw = g.house?.points.swingSeat;
    const d = sw && zone === 'bahce' ? Math.hypot(w.pos.x - sw.x, w.pos.z - sw.z) : 99;
    const word = hotColdBand(zone, d);
    const now = g.clock;
    if (word !== hc.pending) {
      hc.pending = word;
      hc.since = now;
    }
    const moving = !!w?.standing && Math.hypot(w.vel.x, w.vel.z) > 0.3;
    if (word === hc.band) {
      if (moving) hc.sameT += dt;
      if (hc.sameT >= 10 && now - hc.lastSaid >= 1.5) {
        hc.sameT = 0;
        hc.lastSaid = now;
        this.sayBand(word, 0.6);
      }
    } else if (now - hc.since >= 0.6 && now - hc.lastSaid >= 1.5) {
      const before = hc.band;
      hc.band = word;
      hc.lastSaid = now;
      hc.sameT = 0;
      this.sayBand(word, 1.0);
      if ((before === 'Yandın!') !== (word === 'Yandın!')) g.updateObjective(true);
    }
    if (g.house) g.house.swingHold = hc.band === 'Sıcak!' || hc.band === 'Yandın!';
  }

  /** Beste'nin sesi sağ kulağın hemen arkasından */
  sayBand(word, gain) {
    const g = this.g;
    const id = HC_LINE[word];
    const line = g.lines[id];
    if (!line) return;
    const cam = g.room.camera;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
    const pos = cam.position.clone().addScaledVector(fwd, -0.45).addScaledVector(right, 0.15);
    const d = g.director;
    const w = d.labelFor(line);
    g.ui.subtitle(w.label, d.fmt(line.s || line.t), w.cls);
    const h = g.audio.playRoomVoice(id, { pos, gain });
    this.lastBandId = id;
    Promise.race([h.promise, sleep(4000)]).then(() => {
      if (this.lastBandId === id) g.ui.subtitle(null, null, null, 0.4);
    });
  }

  /** Kaset oynamıyorken TV'de gösterilecek bir şey varsa çizer ve true döner */
  drawTv(ctx, clock) {
    if (this.seeking() === 8 && this.room.hotcold) {
      S.staticNoise(ctx, clock, 1);
      if (this.hc.band) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(0, 190, 640, 100);
        S.bigText(ctx, this.hc.band.toLocaleUpperCase('tr'), { color: this.hc.band === 'Yandın!' ? '#ff5050' : '#ffffff', font: `72px ${S.FONT_OSD}`, y: 240 });
        ctx.restore();
      }
      return true;
    }
    if (this.ritual) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 640, 480);
      return true;
    }
    return false;
  }
}

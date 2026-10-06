// HTML arayüzü: altyazı, ipuçları, belgeler, şifreli kutu, menüler.
const $ = (id) => document.getElementById(id);

export const SECRETS = {
  siluet: 'Ağaçların arasındaki adam',
  ayakkabi: 'Çalının altındaki ayakkabı',
  yardim: 'Jenerikten sonraki kare',
  fotograf: 'Dolaptaki fotoğraf',
  'ters-mesaj': 'Geriye doğru konuşan kız',
  pencere: 'Penceredeki yüz',
  yuz: 'Karın içindeki yüz',
};

export const DOCS = {
  letter: {
    cls: 'letter',
    html: `<p>Sevgili yeğenim,</p>
<p>Bu mektubu okuyorsan ben artık yokum, ev de artık senin. Tavan arasındaki kasetlere dokunma.</p>
<p>1998'de Yıldız Çocuk Yapım'da kurgucuydum. <i>Beste'nin Sihirli Dünyası</i> bizim programımızdı. Beste'yi küçük bir kız seslendiriyordu; onun adı da Beste'ydi. Çamlık'taki dış çekimden sonra onu bir daha gören olmadı.</p>
<p>Çekimlerden sonra kasetlerde olmaması gereken şeyler görmeye başladık. Hiçbirini yayınlamadık. Kasetleri yakmayı denedim, her seferinde geri döndüler.</p>
<p>Bir şey daha: kasetler bazen geriye doğru konuşuyor.</p>
<p>İzlersen, ekrandaki kız ne isterse istesin ona yardım etme. O, Beste değil.</p>
<p style="text-align:right">— Halan Nermin</p>`,
  },
  news: {
    cls: 'news',
    html: `<p class="paper-name"><span>EGE POSTASI</span><span>16 MAYIS 1998 · CUMARTESİ</span></p>
<h3>Çamlık'ta kayıp çocuk alarmı</h3>
<p>Karşıyaka'da yerel bir kanal için çekilen çocuk programının dış çekimleri sırasında, programa sesini veren <b>7 yaşındaki B.A.</b> <b>iki gündür</b> kayıp.</p>
<p>Jandarma ve gönüllüler Çamlık mesire alanını gece boyunca aradı. Çekim ekibinden bir kişi, küçük kızın son olarak "ağaçların arasındaki adamla saklambaç oynadığını" söyledi. Olay yerinde yalnızca bir piknik sepeti ve bir parça ip bulundu.</p>
<p>Yapımcı Yıldız Çocuk Yapım, programın yayınını süresiz durdurduğunu açıkladı. Ailesi, kızlarını gören ya da <span class="torn">█████ ███████ ██ ████ ███ ██████</span></p>`,
  },
  card: {
    cls: 'card',
    html: `<div class="photo" role="img" aria-label="Soluk bir vesikalık fotoğraf"></div>
<h3>ÖĞRENCİ KİMLİK KARTI</h3>
<p>KARŞIYAKA ÇAMLIK İLKOKULU<br>1997–1998</p>
<p>Adı: <b>BESTE</b><br>Soyadı: <b>AYDIN</b><br>Sınıfı: 1-B<br>Doğum tarihi: 03.02.1991</p>
<p style="font-family:var(--font-hand);font-size:26px">Arkasında: "Beni unutma."</p>`,
  },
};

export class UI {
  constructor(game) {
    this.g = game;
    this.subTimer = 0;
  }

  show(id, on = true) {
    $(id).hidden = !on;
  }

  subtitle(who, text, cls = '', clearDelay = 0) {
    const el = $('subtitles');
    clearTimeout(this.subTimer);
    if (!who && !text) {
      this.subTimer = setTimeout(() => (el.innerHTML = ''), clearDelay * 1000);
      return;
    }
    if (!this.g.settings.subs) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = '';
    const line = document.createElement('span');
    line.className = 'line';
    if (who) {
      const w = document.createElement('span');
      w.className = 'who ' + (cls || '');
      w.textContent = who + ':';
      line.appendChild(w);
    }
    line.appendChild(document.createTextNode(text));
    el.appendChild(line);
  }

  beginTyping() {
    const a = $('answer');
    a.value = '';
    this.show('type-hint', true);
    this.show('vcr-hint', false);
    if (this.g.isTouch) this.show('mobile-type', true);
    else a.focus({ preventScroll: true });
  }

  endTyping() {
    const a = $('answer');
    a.value = '';
    a.blur();
    this.show('type-hint', false);
    this.show('mobile-type', false);
    if (this.g.director?.active) this.show('vcr-hint', true);
  }

  hover(text) {
    $('hover-label').innerHTML = text || '';
    $('crosshair').classList.toggle('active', !!text);
  }

  toast(text, sec = 4) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('show'), sec * 1000);
  }

  secret(text) {
    const el = $('secret-toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.secretT);
    this.secretT = setTimeout(() => el.classList.remove('show'), 4500);
  }

  objective(text) {
    const el = $('objective');
    if (!text) {
      el.classList.remove('show');
      return;
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.objT);
    this.objT = setTimeout(() => el.classList.remove('show'), 7000);
  }

  inventory(label) {
    this.show('inventory', !!label);
    $('inventory-label').textContent = label || '';
  }

  /** Belge okuma ekranı; kapanınca çözülür. */
  read(key) {
    const doc = DOCS[key];
    const el = $('reader-doc');
    el.className = doc.cls;
    el.innerHTML = doc.html;
    this.show('reader', true);
    this.g.overlay = 'reader';
    return new Promise((resolve) => (this.closeReader = () => {
      this.show('reader', false);
      this.g.overlay = null;
      this.closeReader = null;
      resolve();
    }));
  }

  /** Dört haneli şifre ekranı. check(code) true dönerse kapanır. */
  keypad(check) {
    const disp = $('keypad-display');
    let code = '';
    const render = () => (disp.textContent = (code + '----').slice(0, 4));
    disp.classList.remove('ok');
    render();
    this.show('keypad', true);
    this.g.overlay = 'keypad';
    return new Promise((resolve) => {
      const close = (ok) => {
        this.show('keypad', false);
        this.g.overlay = null;
        this.keypadKey = null;
        resolve(ok);
      };
      this.keypadKey = (k) => {
        if (k === 'close') return close(false);
        if (k === 'clear') {
          code = '';
          render();
          return;
        }
        if (!/^\d$/.test(k) || code.length >= 4) return;
        code += k;
        this.g.audio.sfx('beep', true);
        render();
        if (code.length === 4) {
          if (check(code)) {
            disp.classList.add('ok');
            setTimeout(() => close(true), 700);
          } else {
            setTimeout(() => {
              this.g.audio.sfx('beep', false);
              code = '';
              render();
            }, 350);
          }
        }
      };
    });
  }

  ending(kind, secretsFound) {
    const good = kind === 'good';
    $('ending-kind').textContent = good ? 'GİZLİ SON' : 'KÖTÜ SON';
    const t = $('ending-title');
    t.textContent = good ? 'Kaset Yakıldı' : 'Artık Dışarıda';
    t.classList.toggle('bad', !good);
    $('ending-text').textContent = good
      ? "Geri sardın ve gerçek Beste'yi buldun. Sabah olunca kaseti bahçede yaktın. Duman, bir çocuk gülüşü gibi kıvrılarak yükseldi."
      : 'Ona istediği her şeyi verdin: tarihini, yaşını ve adını. Kaset kapandı ama kapı açık kaldı.';
    const total = Object.keys(SECRETS).length;
    $('ending-secrets').textContent = `Bulunan gizli kareler: ${secretsFound.length} / ${total}` + (good ? '' : ' · Başka bir son daha var. Kaset geriye doğru da konuşuyor.');
    this.show('hud', false);
    this.show('ending', true);
  }
}

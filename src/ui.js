// HTML arayüzü: altyazı, ipuçları, belgeler, şifreli kutu, menüler.
const $ = (id) => document.getElementById(id);

export const SECRETS = {
  siluet: 'Ağaçların arasındaki adam',
  oyma: 'Ağaçtaki oyma',
  ayakkabi: 'Çalının altındaki ayakkabı',
  yardim: 'Jenerikten sonraki kare',
  fotograf: 'Dolaptaki fotoğraf',
  arkana: 'Uyarıdaki yazı',
  oduydu: 'Sihirli sözün arkası',
  telefon: 'Arkadan çekilmiş oda',
  ayna: 'Aynadaki kız',
  misafir: 'Senin sandalyen',
  pamuk: "Tonton'un yeri",
  yil: 'Ağaçtaki yıl',
  oyuncu: 'Kütüğün arkasındaki adam',
  kural5: 'Beşinci kural',
  klaket: 'Klaketteki isim',
  yedinci: 'Yedinci klip',
  pencere: 'Penceredeki yüz',
  yuz: 'Karın içindeki yüz',
};

/** Geri sarınca duyulan ters mesajlar (kayıtta 'ters-<id>' olarak tutulur) */
export const REVERSED = {
  b2_real: 'Geriye doğru konuşan kız',
  k3_ters: 'Heykelin arasındaki fısıltı',
  k4_ters: 'Telefondaki ikinci ses',
  k6_ters: 'Mumların arasındaki dilek',
  k7_ters: 'Kopyanın altındaki ses',
  k8_ters: 'Saklanan kızın fısıltısı',
  k9_ters: 'Montajdan kesilen ses',
  k10_ters: 'Kapılardaki uyarı',
};

/** kaydedilmiş listeden sayımlar */
export function secretCounts(list = []) {
  return {
    frames: list.filter((s) => SECRETS[s]).length,
    framesTotal: Object.keys(SECRETS).length,
    rev: list.filter((s) => s.startsWith('ters-') && REVERSED[s.slice(5)]).length,
    revTotal: Object.keys(REVERSED).length,
  };
}

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
<p>Yapımcı Yıldız Çocuk Yapım, programın yayınını süresiz durdurduğunu açıkladı. Ailesi, kızlarını gören ya da duyanların <b>364 <span class="torn">██ ██</span></b> numaralı telefonu aramalarını rica ediyor.</p>`,
  },
  resim: {
    cls: 'drawing',
    html: `<p class="doc-kind">Mum boya bir resim</p>
<p>Uzun yeşil ağaçlar. Ağaçların arasında çok uzun kollu, gri, yüzü olmayan bir amca.</p>
<p>Büyük bir çamın önünde gözlerini kapatmış, saçı topuz bir kadın. Kadının yanına rakamlar yazılmış: <b>1 2 3 4 5 6 7</b>. Sonra rakamlar griye dönüyor: <span class="grey">8 9 10</span>.</p>
<p>Bir ağacın arkasında sarı elbiseli küçük bir kız amcaya el sallıyor.</p>
<p class="crayon">AĞAÇLARIN ARASINDAKİ AMCA BENİMLE SAKLAMBAÇ OYNUYOR. HİÇ SOBELENMİYOR.</p>
<p class="small">Köşede: BESTE, 1-B · Arkasında: 13 MAYIS. YARIN ÇAMLIK'A GİDİYORUZ.</p>`,
  },
  news2: {
    cls: 'news',
    html: `<p class="paper-name"><span>EGE POSTASI</span><span>14 MAYIS 1999 · CUMA</span></p>
<h3>Çamlık'ta bir yıl: Küçük Beste hâlâ kayıp</h3>
<p>Karşıyaka'da çocuk programı çekimleri sırasında kaybolan 7 yaşındaki Beste Aydın'dan bir yıldır haber alınamıyor. Aydın ailesi geçen ay Karşıyaka'dan taşındı.</p>
<p>Mesire alanındaki yaşlı bir çama kazınmış "B.A. 14.05" yazısını kimin kazıdığı bilinmiyor. Her gün orada yürüyenler, yazının bir yıl önce orada olmadığını söylüyor.</p>
<p>Jandarma, çekim ekibinin kamera kayıtlarının "teknik bir arıza nedeniyle incelenemediğini" açıkladı. Yapımcı R. Yıldız gazetemize yalnızca "Konuşacak bir şeyim yok." dedi.</p>
<p>Annesi, evin eski telefonunu hiç kapatmadıklarını söylüyor.</p>`,
  },
  dogumgunu: {
    cls: 'letter',
    html: `<p>Canım Beste,</p>
<p>Bugün 3 Şubat 1999. Sekiz yaşına girdin.</p>
<p>Bu hediyeyi sana kendi elimle vermek isterdim. Herkes seni ormanda aradı. Ben hâlâ kasetlerde arıyorum.</p>
<p>Bazen geceleri bandı geri sarınca sesini duyuyorum.</p>
<p style="text-align:right">— Nermin Abla</p>`,
  },
  memo: {
    cls: 'memo',
    html: `<p class="paper-name"><span>YILDIZ ÇOCUK YAPIM</span><span>İÇ YAZIŞMA · 20.05.1998</span></p>
<p>Kimden: R. Yıldız<br>Kime: Nermin Hn. (Kurgu)</p>
<ol>
<li>Kalan bölümler elimizdeki ses kayıtlarıyla tamamlanacak.</li>
<li>Kanal pilotu cuma istiyor.</li>
<li>Çamlık kaydı (Kamera 1, 14.05) jandarmaya verilmeyecek; kayıt arızalı sayılacak.</li>
<li>İş bitince bütün kasetler imha edilecek.</li>
<li>Bu konu dışarıda konuşulmayacak.</li>
</ol>
<p class="hand">Pilot asla bitmeyecek. Kaseti ben saklıyorum. Listede benim işaretlemediğim bir klip var: 7. Ham kayıt aşağıda, montaj odamda; kendi rafında değil. —N.</p>`,
  },
  ifade: {
    cls: 'memo',
    html: `<p class="paper-name"><span>JANDARMA İFADE TUTANAĞI</span><span>15.05.1998</span></p>
<p>İfade veren: Nermin Ş., 34, kurgucu (Yıldız Çocuk Yapım)</p>
<p>Öğle arasında Beste saklambaç oynamak istedi. Ebe bendim. Büyük çamın önünde gözlerimi kapatıp saymaya başladım. Yediye geldiğimde biri benim yerime saydı. Gözümü açmadım, çünkü kural öyleydi.</p>
<p>Gözümü açtığımda Beste yoktu. Piknik sepeti ve atlama ipi ağacın dibindeydi.</p>
<p>Kameraman Kâmil kamerayı kapatmamıştı. Kayıtta her şey vardır.</p>`,
  },
  // ---- ev (src/house.js)
  defter: { cls: 'letter', html: `<p class="doc-kind">Kurgu defteri · N.</p>
<p><b>21.05.98</b> — Bölüm 3 için ses yok. Rıza: "Eskilerden kes, yapıştır." Beste'nin kelimelerinden yeni cümleler kurdum. Hiçbirini o söylemedi.</p>
<p><b>02.06.98</b> — Gece montajda yalnızdım. Monitörde Beste, benim kurmadığım bir cümle söyledi: "Nermin abla, sıra sende." Geri sardım. O kare bantta yok.</p>
<p><b>19.06.98</b> — Rıza bütün kasetleri istiyor. Vermeyeceğim.</p>
<p><b>03.02.99</b> — Bugün sekiz yaşına girecekti. Hediyesini kolilerin arkasına sakladım. Açmaya kıyamadım.</p>
<p><b>14.05.99</b> — Bir yıl. Ham kaydın yerini buraya yazmıyorum. Bahçedeki ağacın dibindeki kutuya yazdım. Ağaç her şeyi hatırlıyor.</p>` },
  teneke: { cls: 'letter', html: `<p class="doc-kind">Paslı bir bisküvi kutusu · içinde bir Polaroid ve bir not</p>
<p class="small">Polaroid: Büyük çamın önünde sarı elbiseli küçük bir kız kameraya el sallıyor. Arkasındaki ağaçların arasında, odak dışında, çok uzun, gri bir leke. Altında: 14.05.98 · 13.40</p>
<p>Rıza bütün Mayıs kasetlerini topladı. Hepsini yaktığını sanıyor.</p>
<p>Ham kaydı arşive koydum ama kendi rafına değil. Hiç kutlanmayan bir günün kasetine sakladım. Hediyesini o gün açacaktı.</p>
<p>Bu çamı bahçeye kimse dikmedi. Bir sabah uyandım, buradaydı. Yaşlı bir ağaç. Üstünde aynı rakamlar vardı.</p>
<p style="text-align:right">— N.</p>` },
  riza: { cls: 'memo', html: `<p class="paper-name"><span>YILDIZ ÇOCUK YAPIM</span><span>11.11.1999</span></p>
<p>Nermin Hanım,</p>
<p>Kasetleri yaktığınızı söylemiştiniz. Dün gece stüdyodaki bütün monitörlerde program oynuyordu. Jenerik müziği. Kimse kaset takmamıştı.</p>
<p>Elinizde ne kaldıysa getirin. Kimseye göstermeyin. Jandarmaya hiç.</p>
<p>Ben o gün yalnızca "kamera açık kalsın" dedim. Başka hiçbir şey demedim.</p>
<p>R. Yıldız</p>
<p class="hand">Gece biri telefonda ona kadar sayıyor. Sekizden sonrasını o sayıyor.</p>` },
  fotograf: { cls: 'card', html: `<div class="photo" role="img" aria-label="Soluk bir fotoğraf"></div>
<h3>STÜDYO 2 · 02.05.98</h3>
<p>Mikrofonun önünde ters çevrilmiş bir kutunun üstüne çıkmış küçük bir kız ve yanında gülen bir kadın. Kızın kucağında turuncu, kuyruklu bir peluş kedi.</p>
<p style="font-family:var(--font-hand);font-size:24px">Arkasında: "İlk kayıt günü. Mikrofona yetişemedi, kutunun üstüne çıktı. Bana sordu: 'Nermin abla, sesim kaydedilince ben de kasette mi yaşayacağım?' — N."</p>` },
  kamil: { cls: 'memo', html: `<p class="paper-name"><span>JANDARMA İFADE TUTANAĞI</span><span>16.05.1998</span></p>
<p>İfade veren: Kâmil T., 41, kameraman (Yıldız Çocuk Yapım)</p>
<p>Rıza Bey öğle arasında kamerayı kapatmamamı söyledi, ışığı kaçırmayalım diye. Kamera sehpadaydı, ben sepetin yanındaydım.</p>
<p>Saat ikiye doğru kuşlar sustu. Kızı ağaçların arasında, çok uzun boylu birine doğru yürürken gördüm. Ekipten biri sandım. Ekipte o boyda kimse yok.</p>
<p>Kasetin o dakikası bozuk çıktı. Bozukluğun içinde bir ses var. Biri ona kadar sayıyor.</p>` },
  card: {
    cls: 'card',
    html: `<div class="photo" role="img" aria-label="Soluk bir vesikalık fotoğraf"></div>
<h3>ÖĞRENCİ KİMLİK KARTI</h3>
<p>KARŞIYAKA ÇAMLIK İLKOKULU<br>1997–1998</p>
<p>Adı: <b>BESTE</b><br>Soyadı: <b>AYDIN</b><br>Sınıfı: 1-B<br>Doğum tarihi: 03.02.1991</p>
<p style="font-family:var(--font-hand);font-size:26px">Arkasında: "Beni unutma."</p>`,
  },
};

/** Gizli kasetlerin sonları (Gizli Kaset 1: 'kamera', Gizli Kaset 2: 'kul') */
const SECRET_ENDINGS = {
  kamera: {
    title: 'Kayıt Sürüyor',
    text: "Kâmil'in kamerası hiç kapanmadı: ne Çamlık'ta, ne montaj odasında, ne bu gece. Beste'yi 'kameranın arkasına' o sakladı; sekizi sayan, bütün bölümleri anlatan ses onundu. Şimdi kasette, koltuğun arkasından çekilmiş bir tavan arası var. Koltukta biri oturuyor ve televizyona bakıyor. Arkasında kırmızı bir ışık yanıp sönüyor. Kayıt sürüyor.",
  },
  kul: {
    title: 'Kül',
    text: "Kibriti çaktın. Nermin'in bahçede yakamadığı bant, izlendiği yerde bir anda tutuştu. Alevler tavan arasını sararken arkandan ince bir ses 'Sıcak' dedi, sonra teşekkür etti. Merdivenden nasıl indiğini hatırlamıyorsun. Sabah küllerin arasında erimiş kasetler, boş bir kibrit kutusu ve küçük, gri bir çocuk ayakkabısı vardı. Beste artık üşümüyor. Sesi de artık hiçbir kasette yok.",
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

  /** Geri sarma şu an açıksa VCR ipucunda gösterilir */
  rewindHint(on) {
    const el = $('rw-hint');
    if (el) el.hidden = !on;
  }

  /** Fare kilidi için tıklama gerektiğinde ortada yanıp sönen ipucu */
  clickHint(on) {
    const el = $('click-hint');
    if (el) el.hidden = !on;
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

  objective(text, pulse = false) {
    const el = $('objective');
    if (!text) {
      el.classList.remove('show');
      return;
    }
    el.textContent = text;
    el.classList.add('show');
    if (pulse) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
      clearTimeout(this.objPulseT);
      this.objPulseT = setTimeout(() => el.classList.remove('pulse'), 1200);
    }
    clearTimeout(this.objT);
    this.objT = setTimeout(() => el.classList.remove('show'), 7000);
  }

  inventory(label) {
    this.show('inventory', !!label);
    $('inventory-label').textContent = label || '';
  }

  /** Tam ekran beyaz çakma (korkutma). 'Titreşimi azalt' ayarında hiçbir şey yapmaz. */
  flash(ms = 80) {
    if (this.g.settings?.flash) return;
    const el = $('flash');
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = '0.85';
    void el.offsetWidth;
    el.style.transition = `opacity ${ms}ms ease-out`;
    el.style.opacity = '0';
  }

  /** Yürüme ipucu (WASD...) birkaç saniye gösterilir */
  walkHint(on = true, sec = 6) {
    const el = $('walk-hint');
    if (!el) return;
    clearTimeout(this.walkHintT);
    el.hidden = !on;
    if (on) this.walkHintT = setTimeout(() => (el.hidden = true), sec * 1000);
  }

  /**
   * Anahtar deliğinden bakış (S8): loş bir yatak odası, müzik kutusu; 1.6 sn sonra kanlı bir göz deliği doldurur.
   * onEye() göz belirdiği an çağrılır. Overlay kapanınca çözülür.
   */
  keyhole(onEye) {
    const cv = $('keyhole-canvas');
    const x = cv.getContext('2d');
    this.show('keyhole', true);
    this.g.overlay = 'keyhole';
    const W = cv.width, H = cv.height;
    const t0 = performance.now();
    let eye = false;
    const hole = () => {
      x.beginPath();
      x.arc(W / 2, 190, 74, 0, Math.PI * 2);
      x.moveTo(W / 2 - 22, 240);
      x.lineTo(W / 2 + 22, 240);
      x.lineTo(W / 2 + 46, 410);
      x.lineTo(W / 2 - 46, 410);
      x.closePath();
    };
    const draw = (t) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, W, H);
      x.save();
      hole();
      x.clip();
      // oda
      const wall = x.createLinearGradient(0, 100, 0, 330);
      wall.addColorStop(0, '#16151d');
      wall.addColorStop(1, '#241d1d');
      x.fillStyle = wall;
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#120d0b';
      x.fillRect(0, 330, W, 160);
      // perde ve ay ışığı şeridi
      x.fillStyle = '#2b1c26';
      x.fillRect(180, 90, 70, 250);
      x.fillStyle = 'rgba(140,160,220,.16)';
      x.fillRect(255, 100, 36, 235);
      // yatak
      x.fillStyle = '#3a2a2a';
      x.fillRect(360, 270, 190, 70);
      x.fillStyle = '#5a4a48';
      x.fillRect(360, 252, 54, 24);
      // komodin ve müzik kutusu
      x.fillStyle = '#1e1511';
      x.fillRect(290, 285, 60, 55);
      x.fillStyle = '#6b4a2e';
      x.fillRect(298, 262, 44, 26);
      x.fillStyle = '#c9b88f';
      x.fillRect(318, 244, 4, 18);
      x.beginPath();
      x.arc(320, 241, 4, 0, Math.PI * 2);
      x.fill();
      // titreşen ışık
      x.fillStyle = `rgba(0,0,0,${0.15 + 0.1 * Math.sin(t * 11)})`;
      x.fillRect(0, 0, W, H);
      if (t >= 1.6) {
        const k = Math.min(1, (t - 1.6) / 0.25);
        const r = 30 + 90 * k;
        x.fillStyle = '#d9c9bd';
        x.fillRect(0, 0, W, H);
        const cx = W / 2, cy = 215;
        x.strokeStyle = 'rgba(160,20,20,.75)';
        x.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + 0.2;
          x.beginPath();
          x.moveTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
          x.lineTo(cx + Math.cos(a + 0.1) * r * 0.55, cy + Math.sin(a + 0.1) * r * 0.55);
          x.stroke();
        }
        const g = x.createRadialGradient(cx, cy, 2, cx, cy, r * 0.62);
        g.addColorStop(0, '#000');
        g.addColorStop(0.34, '#000');
        g.addColorStop(0.36, '#5b2a14');
        g.addColorStop(1, '#2a1208');
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,.8)';
        x.beginPath();
        x.arc(cx - r * 0.12, cy - r * 0.14, r * 0.07, 0, Math.PI * 2);
        x.fill();
      }
      x.restore();
      // delik kenarı
      x.save();
      hole();
      x.lineWidth = 10;
      x.strokeStyle = '#2a2420';
      x.stroke();
      x.restore();
    };
    return new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - t0) / 1000;
        draw(t);
        if (t >= 1.6 && !eye) {
          eye = true;
          onEye?.();
        }
        if (t >= 2.1) {
          this.show('keyhole', false);
          this.g.overlay = null;
          resolve();
        } else setTimeout(tick, 33);
      };
      tick();
    });
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

  /**
   * Rakamlı şifre ekranı. check(code) -> true (doğru) | false | 'mesaj' (yanlış, mesaj gösterilir).
   * o.len hane sayısı, o.mask görünüm ('____', '___ __ __', '__/__'), o.title başlık, o.help alt yazı,
   * o.onDigit(k) her rakamda (ör. telefon kadranı sesi), o.onWrong(code, msg) her yanlışta.
   */
  keypad(check, o = {}) {
    const len = o.len || 4;
    const mask = o.mask || '_'.repeat(len);
    const disp = $('keypad-display');
    $('keypad-title').textContent = o.title || 'KİLİTLİ KUTU';
    $('keypad-help').textContent = o.help || 'Rakamları klavyeden de girebilirsin · Esc: kapat';
    disp.classList.toggle('long', len > 4);
    let code = '';
    const render = () => {
      let i = 0;
      disp.textContent = mask.replace(/_/g, () => (i < code.length ? code[i++] : (i++, '-')));
    };
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
      let busy = false;
      this.keypadKey = (k) => {
        if (k === 'close') return close(false);
        if (busy) return;
        if (k === 'clear') {
          code = '';
          render();
          return;
        }
        if (!/^\d$/.test(k) || code.length >= len) return;
        code += k;
        if (o.onDigit) o.onDigit(k);
        else this.g.audio.sfx('beep', true);
        render();
        if (code.length === len) {
          busy = true;
          const res = check(code);
          if (res === true) {
            disp.classList.add('ok');
            setTimeout(() => close(true), 700);
          } else {
            setTimeout(() => {
              this.g.audio.sfx('beep', false);
              o.onWrong?.(code, typeof res === 'string' ? res : null);
              if (typeof res === 'string') this.toast(res, 4);
              code = '';
              busy = false;
              render();
            }, o.onDigit ? 900 : 350);
          }
        }
      };
    });
  }

  /**
   * Harfli kilit (kelime yazılır, ENTER ile denenir). check(word) -> true | false | 'mesaj'.
   * o.len harf sayısı, o.title, o.help, o.onWrong(word, msg).
   */
  wordlock(check, o = {}) {
    const len = o.len || 4;
    const input = $('wordlock-input');
    const slots = $('wordlock-slots');
    $('wordlock-title').textContent = o.title || 'HARF KİLİDİ';
    $('wordlock-help').textContent = o.help || `${len} harf yaz · ENTER: dene · Esc: kapat`;
    input.value = '';
    input.maxLength = len;
    const render = () => {
      const v = input.value.toLocaleUpperCase('tr');
      slots.textContent = Array.from({ length: len }, (_, i) => v[i] || '_').join(' ');
    };
    render();
    this.show('wordlock', true);
    this.g.overlay = 'wordlock';
    setTimeout(() => input.focus({ preventScroll: true }), 30);
    return new Promise((resolve) => {
      const close = (ok) => {
        input.oninput = null;
        input.blur();
        this.show('wordlock', false);
        this.g.overlay = null;
        this.wordlockKey = null;
        resolve(ok);
      };
      input.oninput = render;
      this.wordlockKey = (k) => {
        if (k === 'close') return close(false);
        if (k !== 'Enter') return;
        const word = input.value.trim();
        if (!word) return;
        const res = check(word);
        if (res === true) {
          slots.classList.add('ok');
          this.g.audio.sfx('boxClick', this.g.room.points.chest);
          setTimeout(() => {
            slots.classList.remove('ok');
            close(true);
          }, 700);
        } else {
          this.g.audio.sfx('beep', false);
          o.onWrong?.(word, typeof res === 'string' ? res : null);
          if (typeof res === 'string') this.toast(res, 4);
          input.value = '';
          render();
        }
      };
    });
  }

  /**
   * Kaset seçme ekranı. list = [{ n, name, watched }], preferred = seçili başlayacak kaset.
   * Seçilen kaset numarasıyla, vazgeçilirse null ile çözülür.
   */
  chooseTape(list, preferred) {
    const box = $('tapes-list');
    box.innerHTML = '';
    let idx = Math.max(0, list.findIndex((t) => t.n === preferred));
    const buttons = list.map((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tape-choice';
      b.innerHTML = `<span class="tape-key">${t.key ?? t.n}</span><span class="tape-name"></span><span class="tape-tag">${t.watched ? 'izlendi' : 'YENİ'}</span>`;
      b.querySelector('.tape-name').textContent = t.name;
      b.onclick = () => close(t.n);
      // seçim yalnızca gerçek fare hareketiyle değişir: liste açılınca imlecin altında kalan kaset
      // (tarayıcının sahte mouseenter olayı) yeni kasetin ön seçimini bozmasın
      b.onmousemove = (e) => {
        if ((e.movementX || e.movementY) && idx !== i) select(i);
      };
      box.appendChild(b);
      return b;
    });
    const select = (i) => {
      idx = (i + list.length) % list.length;
      buttons.forEach((b, j) => b.classList.toggle('sel', j === idx));
      buttons[idx].focus({ preventScroll: true });
    };
    let resolveFn;
    const close = (n) => {
      this.show('tapes', false);
      this.g.overlay = null;
      this.tapeKey = null;
      this.closeTapes = null;
      resolveFn(n);
    };
    this.show('tapes', true);
    this.g.overlay = 'tapes';
    select(idx);
    this.closeTapes = close;
    this.tapeKey = (k) => {
      if (k === 'close') return close(null);
      if (k === 'ArrowUp' || k === 'ArrowLeft') return select(idx - 1);
      if (k === 'ArrowDown' || k === 'ArrowRight') return select(idx + 1);
      if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') return close(list[idx].n);
      const hit = list.find((t) => String(t.key ?? t.n) === k);
      if (hit) close(hit.n);
    };
    return new Promise((r) => (resolveFn = r));
  }

  ending(kind, secretsFound) {
    const good = kind === 'good';
    // gizli kasetlerin sonları (src/secrets.js)
    const sec = SECRET_ENDINGS[kind];
    $('ending-kind').textContent = sec ? 'GİZLİ SON' : good ? 'İYİ SON' : 'KÖTÜ SON';
    const t = $('ending-title');
    t.textContent = sec ? sec.title : good ? 'Sobe' : 'Ebe Sensin';
    t.classList.toggle('bad', !good && !sec);
    $('ending-text').textContent = sec
      ? sec.text
      : good
      ? "Geri sardın ve gerçek Beste'yi buldun. Oyun, herkes bulununca biter: Sobe. Sabah kasetleri bahçede yaktın. Bu sefer geri dönmediler. Ertesi gün gazeteler, Çamlık'taki büyük çamın dibinde küçük, gri bir çocuk ayakkabısı bulunduğunu yazdı."
      : 'Ona istediği her şeyi verdin: tarihini, yaşını ve adını. Kaset kapandı ama kapı açık kaldı. İlk sobelenen ebe olur. Artık ebe sensin.';
    const c = secretCounts(secretsFound);
    $('ending-secrets').textContent =
      `Gizli kareler: ${c.frames} / ${c.framesTotal} · Ters mesajlar: ${c.rev} / ${c.revTotal}` +
      (sec ? ' · Bir gizli kelime ve başka sonlar daha var.' : good ? '' : ' · Başka bir son daha var. Kapılarda geri sar ve bırakma.');
    this.show('hud', false);
    this.show('ending', true);
  }
}

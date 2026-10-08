# Beste'nin Sihirli Dünyası

*Amanda the Adventurer* tarzında, Türkçe seslendirmeli, tarayıcıda çalışan retro VHS korku oyunu.

1998'de İzmir'de çekilmiş, yayınlanmamış bir çocuk programının kasetlerini, rahmetli halanın tavan arasında buluyorsun. Kaseti oynatıyorsun. Ekrandaki neşeli kız Beste soru soruyor, sen klavyeden cevap yazıyorsun. Kasetler ilerledikçe renkler soluyor, ses bozuluyor ve Beste'nin gülümsemesi donuyor.

## Nasıl oynanır

```bash
npm start            # bağımlılık yok, sadece Node.js gerekir
# tarayıcıda: http://localhost:8080
```

### Windows için exe

[Releases](https://github.com/kartal1d/zxd/releases) sayfasından indir:

- `...-Tasinabilir.exe`: kurulum yok, çift tıkla ve oyna.
- `...-Kurulum.exe`: oyunu kurar, masaüstüne kısayol koyar.

Windows "Bilgisayarınız korundu" derse **Ek bilgi → Yine de çalıştır** (exe imzasız). **F11** tam ekran yapar.

Exe'yi kendin derlemek için: `cd desktop && npm install && npm run dist` (Windows'ta). Commit mesajına `[exe]` yazınca GitHub Actions güncel sürümü, `[exe3]` yazınca 3 bölümlük sürümü derleyip Releases'a koyar.

Kulaklıkla ve karanlıkta oynaman önerilir. Oyun akıcı çalışsın diye her zaman düşük grafik kalitesinde açılır. Oyunda yanıp sönen ışıklar var; **Ayarlar → Yanıp sönmeyi azalt** ile kısılabilir.

| Tuş | İşlev |
| --- | --- |
| Fare | Etrafa bak (önce ekrana tıkla) |
| Sol tık / **E** | Al, oku, kaseti tak |
| Klavye + **ENTER** | Beste soru sorduğunda cevabını yaz |
| **F** | Televizyona odaklan / geri çekil (kaset oynarken kilitli) |
| **W A S D**, **Shift**, **Q** | 3. kasetten sonra: yürü, koş, el feneri |
| **Boşluk** | Kaseti duraklat (Beste fark edebilir) |
| **◀ Sol ok** (basılı tut) | Kaseti geri sar (yalnızca ekranda "◀ geri sar" yazdığında) |
| **Esc** | Duraklatma menüsü |
| **F11** | Tam ekran |

İzlediğin kasetler dolabın üstünde durur. Video oynatıcıya tıklayıp istediğini **tekrar izleyebilirsin**, ipucunu unuttuysan geri dönüp bakmak için. Tekrar izlemek hikâyeyi ilerletmez. Beste adını sormaz, seni hatırlar.

İlerleme tarayıcıda otomatik kaydedilir (localStorage).

## Bölümler

On kaset var. Her kaset 4–8 dakika sürer; aradaki tavan arası bulmacaları ve ev keşfiyle birlikte ilk oynayış yaklaşık 1,5–2 saat.

1. **Beste ile Tanışalım!** Tanışma, elmalar, piknik, saklambaç.
2. **Tonton Kedi'nin Kuyruğu.** Kurallar ve gerçek bir el.
3. **Tonton Kedi Geri Döndü!** Dikişli Tonton ve Heykel oyunu: farenle kımıldama.
4. **Kaybolursan Ne Yaparsın?** Ev telefonu şarkısı; arkandaki gerçek telefon çalar.
5. **Bugün Sen Beste'sin!** Roller değişir; ayna, sessizlik ve sahte bir son.
6. **İyi ki Doğdun Beste!** Doğum günü yalanını yakala; mumlar sönünce ampul de söner.
7. **Bir Daha!** Kopyanın kopyası; her turda bir şey değişir, kapına vurulur.
8. **Ebe Sensin!** Duraklatmak gözlerini kapamaktır; biri ona kadar sayar.
9. **HAM KAYIT, Çamlık 14.05.98.** Çizgi film yok: Nermin'in montaj odasındaki klipler.
10. **Zamanın Sonu.** Üç kapı ve iki son.

Beste'nin cevabı olan bir sorusunu 3 kez bilemezsen gerçeği söyler ve o an başka bir şey olur.

**Gizli kasetler:** oyunda iki gizli kelime var. Beste'nin herhangi bir sorusuna cevap olarak yazılırsa evde bir **gizli kaset** belirir; izlersen oyun kendine özgü bir gizli sonla biter. Kasetler her zaman sırayla, birer birer alınır; 10. kaset hep en son çıkar.

**3. kasetten sonra yürüyebilirsin:** oyuncak sandığındaki anahtarla çatı kapısını aç, aşağı in; sonraki kasetler evin içinde ve arka bahçede saklı. Hedef satırı hep nereye gideceğini söyler; takılırsan ipuçları gelir. Kasetler yalnızca tavan arasındaki televizyonda, oturarak izlenir. **W A S D** yürü, **Shift** koş, **Q** ya da sağ tık el feneri, **E** etkileşim. Ani korkutmalar yalnızca evde yürürken olur, kaset izlerken olmaz. Her yeni oyunda, daha önce görmediğin küçük nadir korkutmalar da çıkabilir; oyunu ne kadar çok tekrar oynarsan ihtimalleri o kadar artar.

<details>
<summary><b>Spoiler: çözümler, sonlar ve gizli kareler</b></summary>

- Metal kutunun şifresi **1405**: 1. kasette ormandaki ağaca büyük harflerle kazınmış (saklambaçta "ağaç" seçilmese de bir an ekrana gelir). Takvimde 14 Mayıs daire içinde, gazete 16 Mayıs tarihli ve kız "iki gündür" kayıp.
- Üç kapı (bir soruya 3 kez yanlış cevap verirsen Beste doğrusunu söyler ve kapının üstüne yazar): ağacın hatırladığı sayı (**1405**), Beste'nin yaşı (**7**, elmalar ve gazete), gerçek soyadı (**Aydın**, kutudaki okul kartı).
- **Kötü son (Artık Dışarıda):** üç cevabı verip ÇIKIŞ yazarsın. Kaset çöker, ışıklar söner, kapı çalınır.
- **Gizli son (Kaset Yakıldı):** 2. kasetin sonundaki tersten konuşmayı geri sararak dinlersen gerçek Beste seni uyarır: "Ona soyadımı söyleme. Sıkışırsan, kaseti geri sar." 3. kasette kapı sorularında **sol oku 3 saniye basılı tut**.
- 7 gizli kare: ağaçlardaki adam, çalının altındaki ayakkabı, jenerikten sonraki "YARDIM ET", dolaptaki fotoğraf, ters mesaj, penceredeki yüz, karın içindeki yüz. Hepsi duraklatarak ya da geri sararak yakalanır.
- Gizli kelimeler: **KAMİL** → Gizli Kaset 1 "Kamera Arkası" → gizli son **Kayıt Sürüyor**; **KİBRİT** → Gizli Kaset 2 "Kül" → gizli son **Kül**. Kaset, kelime yazıldığında evde dolaşma başlamamışsa tavan arasında, başlamışsa aşağıda (giriş konsolu / mutfak tezgâhı) çıkar.
- Sepete ip koyarsan, ismini "Beste" yazarsan ya da 2. kasette duraklatırsan Beste farklı tepki verir.

</details>

## Teknik yapı

Görsel ya da ses dosyası indirilmeden, her şey kodla üretilir:

- **3D tavan arası:** Three.js. Prosedürel dokular (ahşap, lekeli duvar kâğıdı, kilim, karton), sallanan ampulden gölgeler, ay ışığı, toz, bloom ve film greni.
- **Kasetler:** 640×480 Canvas 2D'de çizilen çizgi film; ekrana VHS shader'ı ile yansıtılır (kavis, renk kayması, tracking bandı, kar, satır titremesi, açılma/kapanma). TV'deki görüntünün rengi odaya ışık olarak vurur.
- **Ses:** Web Audio. TV sesi gerçekten televizyonun konumundan gelir (HRTF), VHS zincirinden geçer (bant kayması, bozulma, bölüme göre metalik yankı). Müzik kutusu ve jenerik müziği gerçek zamanlı sentezlenir; 3. bölümde minöre döner ve yavaşlar. Kapı vuruşu ve son fısıltı arkandan gelir.
- **Geri sarma:** Son ~10 saniyenin kareleri tamponda tutulur; sol ok bunları tersten oynatır.

```
index.html, style.css     arayüz
src/main.js               oyun döngüsü, kontroller, oda bulmacaları, kayıt
src/room.js               3D sahne, ışıklar, kamera
src/tv.js                 TV ekranı ve VHS shader'ı
src/director.js           kaset oynatıcı: replik, soru-cevap, duraklatma, geri sarma
src/tapes/tape1-3.js      kaset senaryoları
src/draw/                 Beste, Tonton Kedi ve sahnelerin çizimi
src/data/lines.json       tüm replikler (oyun ve seslendirme aynı dosyayı kullanır)
assets/audio/voice/       üretilmiş seslendirmeler (mp3)
tools/gen_voices.py       seslendirme üreticisi
```

## Seslendirme

107 replik, Türkçe Piper sesleriyle **çevrimdışı** üretildi (sherpa-onnx). Ardından WORLD vokoderiyle karaktere göre işlendi:

| Stil | Nasıl |
| --- | --- |
| `beste` | perde ×1.5, formant ×1.16, abartılı tonlama (çizgi film kızı) |
| `beste_cold` | aynı ses, tonlama düzleştirilmiş, yavaş (donuk gülümseme) |
| `beste_deep` | perde ×0.5, formant ×0.86, hırıltı ("Yanlış cevap...") |
| `beste_digital` | sabit perde + bir oktav alttan ikinci ses (3. bölüm) |
| `beste_whisper` | tamamen fısıltı (son sahne) |
| `beste_real` | nefesli, titrek (gerçek Beste, ters mesaj) |
| `tonton`, `tonton_sad` | perde ×1.85, formant ×1.28, ağlarken titreme |
| `narrator`, `narrator_slow` | 90'lar anlatıcısı ve yavaşlamış hali |

Anlaşılırlık Whisper ile otomatik ölçüldü: stillerin ortalaması %85–100.

Replik eklemek ya da değiştirmek için:

```bash
bash tools/fetch_models.sh                       # Türkçe Piper sesleri (CC0)
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
# src/data/lines.json'u düzenle, sonra:
.venv/bin/python tools/gen_voices.py             # sadece değişen replikleri üretir
```

Kullanılan sesler (`fettah`, `fahrettin`) CC0 lisanslıdır, oyun ticari olarak da dağıtılabilir. `dfki` sesi ticari olmayan lisanslı olduğu için bilerek kullanılmadı.

## Gerçekçi karakterler

Kasetlerdeki çizgi film tarzı bilerek 2D (Amanda'daki gibi). Odadaki "gerçek" dünya 3D, ışık ve gölgeler gerçek zamanlı. Kapı arkasındaki çocuk silueti gibi sahnelere gerçekçi insan modeli koymak istersen `.glb` model (Mixamo, Ready Player Me, Sketchfab CC0) `assets/models/` altına konup `src/room.js` içinde Three.js `GLTFLoader` ile yüklenebilir.

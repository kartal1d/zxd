# Ev akışı: kasetler 4–10 evde bulunur (tasarım v2)

This is the new flow design. It is written in English; every player-facing string is given in Turkish exactly as it should appear.

It **supersedes** these parts of `docs/ev-tasarim.md`: §0 (unlock after Tape 8), §4.1, §4.2 and §4.4 (the key now comes from the SOBE chest), the arming conditions in §6, §8 (objectives and hints) and §10 (flags). The geometry (§1), props (§2), controls (§3), the ARŞİV rack (§5), the scare mechanics in §6, the searchables (§7) and the lighting (§9) still apply. The `roomChain` rows 4–9 in `docs/kasetler-tasarim.json` are replaced by §2 below; rows 3 and 10 stay.

Nothing in `src/tapes/*` or `src/draw/scenes*.js` changes. The in-tape room events that point at attic props (the attic phone ringing in Tape 4, the creak at the attic boxes in Tape 5, the chest lid in Tape 8, the door knocks in Tapes 6–10) keep working as they are.

---

## 0. Summary

| | |
|---|---|
| Problem | Players spent almost all their time watching tapes and found the game hard to follow. WASD started only after Tape 8. |
| Change | Walking unlocks right after **Tape 3**. The SOBE chest now holds the attic door key ("ALT KAT") and the flashlight. From then on every tape (4–9) is found by walking through the house, one clear step at a time. Tape 10 stays the attic ritual. Tapes are still watched only on the attic TV, seated. |
| Clarity | One objective line that always says **where** and **what** (`Oda — eylem.`), updated the moment a step is done. A hint ladder (about 45 / 90 / 150 s) that ends in a direct instruction and a glint on the target. A toast whenever something happens elsewhere. A positional sound leads to every find. |
| Scares | Only while standing and walking, never during a tape. 12 new one-time scares plus the 8 existing ones, spread over stages 3–9 (§4). Loud ones are at least 12 s apart. All respect `settings.flash`. |
| Saves | Saves at stage ≥ 4 (and stage 3 with the chest already open) get walking and an unlocked attic door. Owned tapes stay owned. A half-finished find keeps working where it was. The user's stage-6 save (Tape 7 under the attic chair) works unchanged (§6). |

**Stage** means the same as in code: `st.stage` = number of tapes watched for the first time. At stage N the player seeks Tape N+1 (`finds.seeking()`).

---

## 1. Route overview

Directions in the house (checked against `ev-tasarim.md` §1). Coming down the stairs you face +z:

- the **salon** doorway (x = -1.70) is on the **right**;
- the **giriş** console with the phone and the answering machine (x ≈ 0.7) is ahead on the **left**, next to the front door;
- the **hol** is to the left and back, running beside the stairs toward the kitchen (−z);
- walking down the hol (facing −z): the bathroom and Nermin's room are on the **right**, the cupboard and, at the very end, the **montaj** door are on the **left**; the **mutfak** is straight ahead;
- in the mutfak the **back door** is in the far right corner; in the **garden** the old pine is to the right and the swing to the left.

| Seek | Room | Find | Puzzle | Lead (positional sound) | Gate opened at this stage |
|---|---|---|---|---|---|
| 4 | Tavan arası → **Salon** | SOBE chest gives key + flashlight; the key opens the attic door; Tape 4 lies on top of the salon TV | Word lock SOBE (existing), then walk | The salon TV switches itself on with the show's title card and plays the jingle as a music box | Attic door, whole ground floor except montaj; back door bolted |
| 5 | **Giriş** telephone → **Hol** rug | Dial 364 27 27 on the hall phone; Beste whispers "Halının altına bak"; the hall runner's corner lifts; loose board below | Rotary keypad (existing) | The hall phone rings | — |
| 6 | **Mutfak** | Moving boxes topple in the kitchen corner; a gift box sits behind them | Date lock 03 02 (existing) | Topple heard from upstairs; a music box plays inside the gift box | — |
| 7 | **Tavan arası** (dark) | Tape taped under the front edge of the player's chair (unchanged) | Look down, click | Tape hiss under the chair | — |
| 8 | **Bahçe** (swing) | Walking hot/cold: Beste's voice says Buz gibi / Uzaksın / Isınıyorsun / Sıcak! / Yandın! | Follow the voice | Beste's voice behind the player; swing creak outside | Back door unbolted |
| 9 | Tavan arası → **Montaj** → **Bahçe** → **Montaj** | EBE false bottom gives the MONTAJ key; montaj desk log → pine tin → ARŞİV rack box C4 (existing) | Word lock EBE (existing), rack (existing) | Blue light and deck hum under the montaj door | Montaj door |
| 10 | Tavan arası | Bulb-chain ritual, tape slid under the sealed door (unchanged) | Pull the chain, wait | Bulb buzz | Attic sealed after Tape 9 (unchanged) |

---

## 2. Stages in detail

Every step below has an **id** (used by `flow.step()`, §3), the objective text, its hint ladder and its props. Unless stated, a hint is a 6 s toast. "Glint" is the target glint (§3.3).

### 2.1 Stage 3 → Tape 4 (attic, then salon)

**Steps**

1. Tape 3 ends → `afterFirst(3)` (existing): the sheet-covered furniture slides, `furnitureMoved`. Toast `Arkanda bir şey yer değiştirdi.` (existing).
2. **`s3_sandik`**: interact `chest` → SOBE lock (existing hints at wrong tries 2/4/6). On success:
   - `boxOpen` at the chest; set `chestOpen`.
   - Call `house.ensureBuilt()` now, so the build hitch is hidden behind the reader in the next step.
   - 1.2 s later: `pickup`; set `key = true`; `attic.apply()` hides the key group.
   - Toast (7 s): `Sandıkta eski bir anahtar, küçük bir el feneri, mum boya bir resim ve turuncu, kesik bir peluş kuyruğu var. Anahtarın etiketinde 'ALT KAT' yazıyor.`
   - `readDoc('resim')`, save, update the objective.
3. **`s3_kapi`**: interact `door` (label `<b>Kapıyı anahtarla aç</b>`): exactly as in `ev-tasarim.md` §4.4 "fbOpen, not walk", but gated on `key` instead of `fbOpen`. It sets `walk`, `doorOpen` and the default `doors` (§5). Its toast changes to `Anahtar zorlanarak döndü. Kapı kendiliğinden aralandı. Aşağıdan çok kısık bir müzik geliyor.` Then `#walk-hint` for 10 s.
4. **`s3_salon`**: the lead starts (`house.leads`, §3.4):
   - the salon TV shows `drawSalon('title')`, a new mode: a blue screen with `SİHİRLİ DÜNYA` in `S.bigText` and a small `▶ OYNAT` OSD;
   - `musicBox(salonTv, 0.8, 2)` every 14 s, plus `staticAt(salonTv, …, 0.12)`.

   S1 `tonton` fires on the first descent.
5. Interact **`ev:kaset4`** (label `<b>Kaseti al</b>`): `pickup`, `addTape(4)`. Toast `Televizyonun üstünde bir kaset. Etiketinde 'Beste 4 — Kaybolursan Ne Yaparsın?' yazıyor.` The lead stops, then S3 `tv` follows (§4).
6. **`izle_yukari` / `izle`**: carry the tape up and click the VCR (`walk.sitDown()` and the chooser, both existing). Scare `ayak` happens on the stairs.

**Props**

- Attic: the existing `attic.chestKey` group (brass key, paper tag, flashlight) moves from under the false bottom into the main compartment, at the old `chestTape4` spot (-0.1, 0.375, 0.04) relative to the chest. Its tag stays `ALT KAT`. Visible while `chestOpen && !key`.
- Attic: `chestTape4` is visible only for the legacy case `t4Chest && !has(4)` (§6).
- Attic: a new `attic.fbKey` group under the false bottom (the old `chestKey` slot, without the flashlight) has the tag `MONTAJ`. The note on the false bottom becomes `Montaj odasının anahtarı burada.` / `Kilidi, onun adını öğrenen açsın. — N.`
- Salon: `ev:kaset4`, a tape mesh (`room.makeTape('4')`) on top of the salon TV at (-3.05, -1.887, 2.95), rot.y 0.3. Visible iff `stage === 3 && walk && !has(4) && !t4Chest`.

| Step | Objective | Hints |
|---|---|---|
| `s3_sandik` | `Tavan arası — Sağ tarafa kayan oyuncak sandığının harf kilidini aç.` | 45: `Çarşafın altından mavi bir sandık görünüyor. Kilidi dört harfli.` · 90: `Kilit, Beste'nin bu kasette öğrettiği sihirli söz: saklambaçta birini bulunca bağırılan söz.` · 150: `Sandığa tıkla ve SOBE yaz.` + glint on the chest |
| `s3_kapi` | `Tavan arası — Arkandaki kapıyı 'ALT KAT' anahtarıyla aç.` | 25: `Kapı, oturduğun yerin arkasında, sol tarafta.` · 50: `Fareyle arkana dön, ahşap kapıya bak ve tıkla.` + glint |
| `s3_salon` | Outside the salon: `Salon — Aşağı in. Müziğin geldiği salondaki televizyona git.` In zone `salon`: `Salon — Televizyonun üstündeki kaseti al.` | 20 (only if the player never stood up): `#walk-hint` again · 45: `W A S D ile yürü. Kapıdan çık, merdivenden aşağı in.` · 90: `Merdivenin dibinde sağdaki geniş kapı salona açılıyor. Müzik oradan geliyor.` · 150: `Salondaki eski televizyonun üstünde bir kaset var. Ona bak ve E'ye bas.` + glint |

### 2.2 Stage 4 → Tape 5 (giriş phone, hol rug)

**Steps**

1. Tape 4 ends → `afterFirst(4)`: there is no attic ring any more. After 1.5 s the hall phone rings (`phoneRing` at `points.hallPhone`). Toast `Aşağıdan bir telefon sesi geliyor. Girişten.` From then on the ring is a state lead (§3.4).
2. **`s4_telefon`**: interact **`ev:telefon`**.
   - The first time, scare `hat` (§4) runs, then the keypad opens.
   - Later times: `phonePickup`, then the keypad.
   - The keypad is exactly the existing `phone` branch of `finds.interact`: 7 digits, mask `___ __ __`, the busy line for 364 51 80, wrong-try hints, positions moved to `hallPhone`.
   - On success: `ringback`, `phonePickup`, `k5_room_real1`, `k5_room_real2` (from the receiver), `hangup`. Set `holCall`.
   - The hall runner's corner lifts (`clothSlide` at `points.rugCorner`). Toast `Holde, halının köşesi kendiliğinden kalktı.` Save. Scare `zil` follows.
3. **`s4_tahta`**: interact **`ev:tahta`** (`<b>Gevşek tahta</b>`):
   - the board opens (`woodScrape`); 0.9 s later `pickup`, `addTape(5)`, set `holBoard`;
   - toast `Tahtanın altında bir kaset, yıldızlı bir saç tokası ve katlanmış bir gazete var.`;
   - `readDoc('news2')`.

   This is the same code as the attic `floorboard`, with new ids.
4. `izle_yukari`.

The attic phone stays as a prop (it rings inside Tape 4). From stage 4 on, its toast is `Bu telefonun kablosu duvara bağlı değil. Çalan telefon aşağıda, girişte.` (stage 4 and `!holCall`), otherwise `Telefon sessiz. Kablosu hâlâ duvara bağlı değil.` It never opens the keypad again.

**Props**

- `ev:telefon`: black bakelite rotary phone, a clone of `attic.buildPhone()` recoloured 0x141210, with the cord going into the wall. On the giriş console at (0.72, -2.06, 8.48), facing −x. `points.hallPhone = (0.72, -2.0, 8.48)`.
  - Labels:
    - stage < 4: `Telefon`, toast `Siyah, çevirmeli bir telefon. Ahizede yalnızca hışırtı var.`;
    - stage 4 and `!holCall`: `<b>Telefonu aç</b>` while ringing, otherwise `<b>Telefonu çevir</b>`;
    - after `holCall`: `Telefon`, toast `Telefon sessiz.`;
    - after scare `zil`: `Telefon (ahize kalkık)`, toast `Ahize kalkık. Hatta kimse yok. Çok uzaktan biri sayıyor.`
- Hall rug corner: a triangular flap (legs 0.5 m) at the rug's +x/+z corner (0.6, YG, 7.4). It folds back like `attic.kilimFlap`. `points.rugCorner = (0.45, YG + 0.02, 7.2)`.
- `ev:tahta`: a loose plank under the corner, x [0.28, 0.42], z [6.85, 7.35], hinged on its +x edge. Under it, a cavity holding a tape, the star hair clip and the newspaper at (0.35, YG + 0.01, 7.1).
- Labels: flat (`''`) until `holCall`; then `<b>Gevşek tahta</b>`; empty after `has(5)`.

| Step | Objective | Hints |
|---|---|---|
| `s4_telefon` | `Giriş — Aşağıda çalan telefonu aç ve Beste'nin evini ara.` | 45: `Telefon girişte, dış kapının yanındaki konsolun üstünde. Merdivenin dibinde sola dön.` · 90: `Beste'nin ev numarası telefon şarkısındaydı: 364 ile başlıyor, sonra iki kere en sevdiği sayı.` · 150: `Telefona tıkla ve 364 27 27 çevir.` + glint |
| `s4_tahta` | `Hol — Halının kalkan köşesindeki gevşek tahtaya bak.` | 30: `Halının köşesi telefonun hemen arkasında, holün başında kalktı.` · 60: `Kalkan köşenin altındaki tahtaya bak ve E'ye bas.` + glint |

### 2.3 Stage 5 → Tape 6 (mutfak)

**Steps**

1. Tape 5 ends → `afterFirst(5)`: 2 s later, set `koliDown`.
   - The top box topples (0.5 s tween), with `woodScrape(koli, 0.5)` and, 0.45 s later, `thud(koli)` at gain 1.6. The kitchen is right under the attic, so it is heard through the floor.
   - Toast `Aşağıdan, mutfak tarafından bir gürültü geldi. Bir şey devrildi.`
   - No attic box topples any more.
2. **`s5_hediye`**: interact **`ev:hediye`** (`<b>Hediye kutusu</b>`). This is the existing `giftbox` branch with new ids: GG/AA keypad, `0302`; `0203` → `Neredeyse. Önce gün, sonra ay.`; wrong-try hints. It opens, then `pickup`, `addTape(6)`, toast `Kutunun içinde bir kaset ve bir zarf var.`, then `readDoc('dogumgunu')`. Set `hediyeOpen`.
   - The tag on the box reads (labelTex, Caveat): `Beste'ye. Sekizinci yaş gününde açılsın. — Nermin Abla`.
   - Its hover label shows the tag: `<b>Hediye kutusu</b>` and, under it, the small text `"Sekizinci yaş gününde açılsın."` (if the label renderer supports a second line; otherwise put it in the first-click toast).
3. `izle_yukari`. On the way: scares `buzdolabi` and `sandalye`, and ambient A1 `ust`.

**Props** (kitchen, far right corner; the back-door leaf sweeps x [2.6, 3.45], so x ≥ 3.65 is clear)

- Box A (floor): x [3.70, 4.30], z [-3.12, -2.62], height 0.50. Collider.
- Box B (on A, front edge): x [3.75, 4.25], z [-2.90, -2.55], y [YG+0.50, YG+0.90]. It topples toward −x/+z and lands at (3.55, YG, -2.15), rotation (0, 0.4, 1.57). Collider after it falls: x [3.25, 3.85], z [-2.45, -1.85].
- Box C (tall): x [4.32, 4.58], z [-3.12, -2.50], height 0.75.
- `ev:hediye`: gift box, 0.30 cube, on box A behind B, centre (4.0, YG + 0.65, -2.95). Wrapping as in the attic gift. Hidden behind B until it falls (it stays clickable only once `koliDown`). `points.gift = (4.0, -2.2, -2.95)`.
- Fridge door (for `buzdolabi`): a leaf x [3.95, 4.00], z [-0.95, -0.25], y [YG, YG+1.6], hinged at (3.97, ·, -0.95), open angle -1.9 rad. Behind it, an interior plane at x = 4.05 (MeshBasic, 0x1a1c1e, which turns 0xdff4ff when lit). The existing child's drawing `ev:buzdolabi` is parented to the leaf.
- Table chair 2 (for `sandalye`): the chair on the table's +x side, at (2.45, YG, -0.7). It gets its own mesh (taken out of the merge) so it can move.

| Step | Objective | Hints |
|---|---|---|
| `s5_hediye` | `Mutfak (holün sonunda) — Devrilen kolilerin arkasındaki hediye kutusunu aç.` | 25, only if the player has not yet entered `mutfak`: `Mutfak, merdivenin yanındaki holün sonunda.` · 45: `Hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.' Kilit gün ve ay istiyor.` · 90: `Beste'nin doğum tarihi, tavan arasındaki metal kutudaki okul kartında yazıyor.` · 150: `Hediye kutusuna 03 02 yaz.` + glint |

### 2.4 Stage 6 → Tape 7 (attic chair, dark): unchanged find

The bulb dies in Tape 6 (`bulbDead`, existing). Tape 7 stays taped under the front edge of the player's chair (`chairleg`, existing hitbox and code). **This is where the user is now.**

- **How to look under the chair**
  - Seated: move the mouse down toward your knees (the seated pitch goes down to -1.42) until the label `<b>Bantlı kaset</b>` appears, then click.
  - Standing (new): press W to stand up (feet at (0, 0, 0.25), just in front of the chair). Turn around with the mouse and look down at the front edge of the seat. The flashlight lights it, and the hitbox (0.6 m box at (-0.1, 0.32, 0.45)) is within the 2.0 m reach.
- After Tape 6 (`afterFirst(6)`): toast `Ampul söndü. Fenerin var: ayağa kalkınca kendiliğinden yanar (Q).` (6 s).
- The hiss lead (existing `finds.hiss()`) starts at **10 s** instead of 20 s.
- Pickup: the existing toast and `addTape(7)`. Scare `fener` follows if the player is standing.

| Step | Objective | Hints |
|---|---|---|
| `s6_sandalye` | `Tavan arası — 'Oturduğun yerin altında.' Sandalyenin altına bak.` | 10: hiss + toast `Karanlıkta bant hışırtısı. Çok yakından geliyor.` (existing) · 45: `Oturduğun yerde fareyle aşağı, dizlerine doğru bak. Ya da ayağa kalk (W), arkanı dön ve fenerle sandalyeye bak.` · 75: `Sandalyenin ön kenarına bantlanmış kasete bak ve tıkla.` + glint on `attic.chairTape` |

### 2.5 Stage 7 → Tape 8 (walking hot/cold, garden swing)

**Steps**

1. Tape 7 ends → `afterFirst(7)`: set `hotcold` and `arkaUnlocked`.
   - 1.5 s later: `boltSlide` (new SFX: a metal bolt scrape plus a clack) at `points.backDoor`, gain 1.4. Toast `Aşağıda bir kapının sürgüsü kendiliğinden açıldı.`
   - 3 s later the hot/cold voice starts with `Buz gibi.`
2. **`s7_sicak`**: the walking hot/cold game (it replaces `finds.updateHotCold`; the attic-window find is removed). Every frame while seeking 8, `hotcold`, `mode === 'play'`, no panel and no tape, compute the **band**:

   | Where the player is | Band |
   |---|---|
   | `cati`, `salon`, `banyo` | `Buz gibi` → `k8_room_ice` |
   | `sahanlik`, `merdiven`, `giris` | `Uzaksın` → `k8_room_cold` |
   | `hol`, `mutfak` | `Isınıyorsun` → `k8_room_warm` |
   | `bahce`, distance d to the swing seat (horizontal) | d ≤ 2.2 `Yandın!` (`k8_room_burn`), ≤ 5 `Sıcak!` (`k8_room_hot`), ≤ 9 `Isınıyorsun`, ≤ 13 `Uzaksın`, else `Buz gibi` |

   - A band is spoken when it has held for 0.6 s and at least 1.5 s have passed since the last line.
   - If the band does not change for 10 s while the player moves, it is repeated at gain 0.6.
   - Voice: `playRoomVoice(id, {pos, gain: 1.0})` with pos = camera + (−forward × 0.45) + (right × 0.15), i.e. just behind the right ear. Subtitle label `BESTE` (via `director.labelFor`).
   - The attic TV keeps its static OSD with the current band word (`finds.drawTv`, unchanged), which is useful when the player looks back at it.
   - When the band is `Sıcak!` or `Yandın!`, the swing slows to a stop over 1.5 s (`scares.swingStop = true`).
3. **`s7_al`** (the band is `Yandın!`): interact **`ev:kaset8`** (`<b>Kaseti al</b>`): `pickup`, `addTape(8)`, toast `Salıncağın oturağında bir kaset. Etiketinde 'Ebe Sensin!' yazıyor. Oturak buz gibi.` Then S6 `cit` (§4).
4. `izle_yukari`.

**Props**

- `ev:kaset8`: a tape parented to the swing seat, at world (-3.0, YB + 0.47, -8.5), rot.y 0.5. Visible iff `stage === 7 && !has(8)`. `points.swingSeat = (-3.0, YB + 0.45, -8.5)`.
- Back door: label before `arkaUnlocked` is `Arka kapı (sürgülü)`, toast `Arka kapının sürgüsü paslanmış, kıpırdamıyor. Camından bahçedeki sis görünüyor.` After it, the existing toggle and first-open toast.
- Attic window: always `Pencere` with toast `Pencere sıkışmış.` (no tape on the sill any more; `attic.windowTape` stays hidden).

| Step | Objective | Hints |
|---|---|---|
| `s7_sicak` | `Ev — Sıcak-soğuk: Beste'nin sesini izle. 'Isınıyorsun' dedikçe doğru yoldasın.` | 60: `Beste 'Buz gibi' diyorsa yanlış yöndesin. Aşağı in, holden mutfağa yürü.` · 120: `Mutfağın arka kapısının sürgüsü açıldı. Bahçeye çık.` · 180: `Kaset bahçenin sol tarafındaki salıncağın oturağında.` + glint |
| `s7_al` | `Bahçe — Salıncaktaki kaseti al.` | 20: `Salıncağın oturağındaki kasete bak ve E'ye bas.` + glint |

### 2.6 Stage 8 → Tape 9 (EBE → montaj → bahçe → montaj)

**Steps**

1. Tape 8 ends → `afterFirst(8)` (existing): the false bottom rises; toast `Sağ tarafta bir kapak gıcırdadı.`
2. **`s8_sahte`**: the existing EBE lock on the chest (hints unchanged). On success: `fbOpen`, the false bottom opens, `pickup`.
   - Toast `Sahte dibin altına bantlanmış bir anahtar var. Kâğıt etiketinde 'MONTAJ' yazıyor. Yanında iki kâğıt.`
   - `readDoc('memo')`, `readDoc('ifade')` (existing).
   - The memo's handwritten line ("…Ham kayıt aşağıda, montaj odamda; kendi rafında değil.") now points straight to the next step.
3. **`s8_montaj`**: lead: a blue light strip under the montaj door, plus `deckHum` that can be heard in the hol (§3.4). Interact `ev:kapi:montaj`:
   - locked (`!montajOpen`), before `fbOpen`: label `Montaj odası (kilitli)`, toast `Kapı kilitli. Üstüne bantlanmış bir kâğıt: 'MONTAJ — GİRMEYİN — N.'`;
   - with `fbOpen`: label `<b>Kapıyı anahtarla aç</b>`. It plays `keyTurn`, swings the door to 90° over 1.6 s, sets `montajOpen` and `doors.montaj = true`, and toasts `Kilit döndü. Montaj odasında monitörlerin fanı uğulduyor.`
4. **`s8_defter`** → **`s8_cam`** → **`s8_raf`** → **`don9`**: exactly `ev-tasarim.md` §5, §6 S5 / S7, §6.2 R1 and §4.5 (desk log, pine tin, ARŞİV rack box C4, the return count, the seal). The only change is scare `cam` at the tin; S6 `cit` has moved to stage 7.
   - The tin is gated before stage 8: label `Paslı kutu`, toast `Ağacın köklerinin arasında paslı bir bisküvi kutusu. Kapağı paslanıp yapışmış.`

**Props**

- Montaj door sign: a 0.21 × 0.15 labelTex plane at (-0.69, -1.55, 1.98) facing +x, reading `MONTAJ — GİRMEYİN — N.`
- Light strip: a MeshBasic plane 0.75 × 0.06 lying on the hol floor at x [-0.69, -0.63], z [1.60, 2.35], y YG + 0.005, colour 0x3a5cff, opacity 0.55. Visible iff `fbOpen && !montajOpen`.

**Text changes** (location-neutral, so they work for both new and old saves):

- `ui.js` DOCS `defter`, the 03.02.99 line: `Bugün sekiz yaşına girecekti. Hediyesini kolilerin arkasına sakladım. Açmaya kıyamadım.`
- `house.js` `RACK_HINTS[1]`: `Hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.'`

| Step | Objective | Hints |
|---|---|---|
| `s8_sahte` | `Tavan arası — Sandığın sahte dibi kalktı. Üç harfli kilidi aç.` | 45: `Nermin'in notu: 'Kilidi, onun adını öğrenen açsın.' Bilmecenin cevabı.` · 90: `Saklambaçta gözünü kapatıp sayan kişi.` · 150: `Sahte dibe EBE yaz.` + glint |
| `s8_montaj` | `Hol — Montaj odasının kapısını 'MONTAJ' anahtarıyla aç (holün sonunda, solda).` | 60: `Merdivenden in, hol boyunca mutfağa doğru yürü. Montaj odası en sonda, solda; kapısının altından mavi ışık sızıyor.` · 120: `Montaj kapısına bak ve E'ye bas: anahtar sende.` + glint |
| `s8_defter` | `Montaj odası — Nermin'in masasındaki kurgu defterini oku.` | 45: `Masa sol duvarda, monitörlerin önünde. Açık defter masanın ucunda.` · 90: `Masadaki açık deftere bak ve E'ye bas.` + glint |
| `s8_cam` | `Bahçe — Yaşlı çamın dibindeki paslı kutuyu aç.` | 60: `Mutfağın arka kapısından bahçeye çık. Büyük çam sağ tarafta.` · 120: `Çamın orman tarafına, köklerin arasına bak.` + glint |
| `s8_raf` | `Montaj odası — Arşiv rafından doğru kaseti çek.` | 90: `Raftaki etiketler tarih. Nermin hangi günden söz ediyordu?` · 180: `Hediye kutusundaki mektubun tarihi: 3 Şubat 1999.` · 240: `C rafı, dördüncü kutu: ✶ 03.02.99 ✶.` + glint. The wrong-pick ladder in §5 stays. |
| `don9` | `Tavan arası — Kaseti yukarı götür.` | 60: `Kaseti oynatabileceğin tek yer tavan arası.` |

### 2.7 Stage 9 → Tape 10 (attic ritual): unchanged find

The ritual is unchanged (`finds.startRitual`, with the footsteps on the real stairs). The attic is sealed, so walking is possible inside the attic only. Scares `esik` and `tokat` live here.

| Step | Objective | Hints |
|---|---|---|
| `s9_zincir` | `Tavan arası — Beste ışığı söndürmeni istedi. Ampulün zincirini çek.` | 60: `Ampul vızıldıyor. Karanlık olmadan kimse gelmeyecek.` (existing) · 120: `Ampulün yanındaki zincire tıkla ve karanlıkta bekle.` + glint on the chain |
| `s9_bekle` (`lightOff` or a ritual is running) | `Tavan arası — Karanlıkta bekle. Işığı yakma.` | — |
| `s9_al` (`ritualDone`) | `Tavan arası — Kapının önündeki kaseti al.` | 30: `Kapının dibindeki kasete bak ve tıkla.` + glint |

### 2.8 Carrying a tape (every stage)

| Step | When | Objective | Hints |
|---|---|---|---|
| `izle` | `newTape()` and zone `cati` | `Kaseti televizyonun altındaki video oynatıcıya tak.` (existing string, kept) | 60: `Video oynatıcıya tıkla: kendiliğinden oturursun ve kaset başlar.` |
| `izle_yukari` | `newTape()` and any other zone | `Tavan arası — Kaseti yukarı götür ve video oynatıcıya tıkla.` | 60: `Kasetler yalnızca tavan arasındaki televizyonda oynar. Merdivenden yukarı çık.` · 120: `Tavan arasında, televizyonun altındaki video oynatıcıya tıkla.` + glint on the VCR when in `cati` |

**Before every tape:** `playTape()` closes the attic door if it is open: tween to 0 over 0.6 s, `latch`, `doorOpen = false`. This keeps the in-tape knocks and handle rattles believable. It also calls `scares.cancelAll()` before the tape starts. The door does not reopen by itself; the label `Kapıyı aç` is enough.

---

## 3. Clarity systems

### 3.1 `src/flow.js` (new, about 200 lines)

```js
export const FLOW = { s3_sandik: { obj, hints: [[45, text|fn], ...], target: () => Vector3|Object3D }, ... };
export function step(g) { ... }  // returns a step id or null
```

`step(g)` checks these in order:

1. `playingTape` → null; `main.objectiveText` keeps `Kaseti izle…`.
2. `newTape() === 9 && !atticSealed` → `don9`.
3. `newTape()` → `izle` if zone is `cati`, otherwise `izle_yukari`.
4. stage < 3 → null (the existing stage 0–2 texts stay).
5. By stage:

| Stage | Step |
|---|---|
| 3 | `t4Chest` → `s3_sandik_kaset` (legacy: `Tavan arası — Sandıktaki kaseti al.`); `!chestOpen` → `s3_sandik`; `!walk` → `s3_kapi`; else `s3_salon` |
| 4 | `kilimLifted` → `s4_eski_tahta` (legacy: `Tavan arası — Kilimin kalkan köşesindeki gevşek tahtaya bak.`); `!holCall` → `s4_telefon`; else `s4_tahta` |
| 5 | `boxToppled` → `s5_eski_hediye` (legacy: `Tavan arası — Devrilen kutuların arkasındaki hediye kutusunu aç.`); else `s5_hediye` |
| 6 | `s6_sandalye` |
| 7 | band is `Yandın!` → `s7_al`; else `s7_sicak` |
| 8 | `!fbOpen` → `s8_sahte`; `!montajOpen` → `s8_montaj`; `tinOpen` → `s8_raf`; `deskRead` → `s8_cam`; else `s8_defter` |
| 9 | `ritualDone` → `s9_al`; `lightOff` or a ritual running → `s9_bekle`; else `s9_zincir` |

Wiring:

- `finds.objective()` returns `FLOW[step].obj`, which can be a function of the zone.
- `finds.TIME_HINTS`, `house.OBJ9`, `house.HINTS9`, `house.step9()` and `house.objective9()` are removed; their texts are in the tables above.
- Legacy steps get the same hint style:
  - `s4_eski_tahta`: 30: `Sandalyenin arkasında, kilimin köşesi kalktı. Altındaki tahtaya tıkla.`
  - `s5_eski_hediye`: the `s5_hediye` ladder with `tavan arasındaki` in place of `mutfaktaki`.

### 3.2 Objective updates and the hint ladder

- `g.updateObjective()` is called on every flag change (each step above) and with `quiet = true` on each zone change, because some objectives depend on the zone.
- On a step change, the objective line pulses once: the existing `ui.objective` CSS highlight for 1.2 s.
- **Ladder timer:** it resets on a step change. It counts only while `mode === 'play' && !panelOpen() && !director.active && !loadingTape`. Each rung fires once per step. Rung text is a 6 s toast and is also stored as `g.lastHint`.
- **Pause screen:** under `Hedef: …` it shows `Son ipucu: …` when `g.lastHint` is set for the current step.
- The existing wrong-try ladders (`finds.wrongHint`) stay unchanged and independent.

### 3.3 Target glint

- One shared additive `Sprite` (0.14 m, a radial white canvas texture made once in `house` at boot) is placed at `FLOW[step].target()`.
- Its opacity pulses 0 → 0.8 → 0 at 1.5 Hz for 8 s.
- It shows on the last rung and then every 30 s while the step stays the same.
- `depthTest: true`; with `settings.flash` the pulse is 0.5 Hz.
- It adds no light, so there is no shader recompile.

### 3.4 Event toasts and positional leads

All leads are **state-driven** in `house.updateLeads(dt)`: they resume after a reload and stop as soon as their condition is false. One-shot events are fired by `afterFirst`.

| Condition | Lead | One-shot toast (when it starts) |
|---|---|---|
| stage 3, `walk`, `!has(4)`, `!t4Chest` | Salon TV `title` screen; `musicBox(salonTv, 0.8, 2)` every 14 s; `staticAt` 0.12 | `…Aşağıdan çok kısık bir müzik geliyor.` (part of the door toast) |
| stage 4, `!holCall`, `!kilimLifted` | `phoneRing(hallPhone, 8)` (about 24 s), then 25 s of silence, repeated. Paused while a panel is open or the player is in `giris` and within 2 m (it keeps ringing until picked up). | `Aşağıdan bir telefon sesi geliyor. Girişten.` Every 3rd ring burst while the player is in `cati`: `Telefon hâlâ çalıyor. Aşağıda, girişte.` |
| stage 4, `holCall`, `!has(5)` | Soft `clothSlide` at the rug corner every 30 s (gain 0.3) | `Holde, halının köşesi kendiliğinden kalktı.` |
| stage 5, `koliDown`, `!hediyeOpen` | `musicBox(gift, 0.5, 1)` every 20 s, gain 0.5 | `Aşağıdan, mutfak tarafından bir gürültü geldi. Bir şey devrildi.` |
| stage 6, `!has(7)` | Hiss under the chair (existing `hiss()`, from 10 s) | `Ampul söndü. Fenerin var: ayağa kalkınca kendiliğinden yanar (Q).` |
| stage 7, `!has(8)` | Hot/cold voice (§2.5); the swing creak is audible from the kitchen with the back door open | `Aşağıda bir kapının sürgüsü kendiliğinden açıldı.` |
| stage 8, `fbOpen`, `!montajOpen` | Blue strip under the montaj door; `deckHum` at the door, gain 0.03 within 6 m | — |
| stage 9 | Existing bulb buzz | existing chain toast |

**Migrated players:** the first time a migrated save loads, toast `Güncelleme: Artık W A S D ile yürüyebilirsin. Tavan arası kapısının kilidi açık; kasetler artık evin içinde saklı.` (8 s). Set `flowNote`.

---

## 4. Scares (walking only)

### 4.1 Rules (`scares.js`)

These are the existing common rules (`ev-tasarim.md` §6) plus:

- **Never during a tape:**
  - `ready()` already needs `walk.standing && !director.active && !loadingTape`;
  - `playTape()` calls `scares.cancelAll()`;
  - tapes are only ever played seated.
- **Gating:** each scare has a `minStage` and an optional `maxStage`. It also has a **kind**:
  - `place`: it fires on its trigger whenever stage ≥ minStage, once;
  - `moment`: it is tied to a puzzle moment; if that moment has passed (stage > maxStage), it uses its listed fallback or is skipped.
- **Loud** = `tv zil ayna buzdolabi delik kapida cit cam monitor tokat`.
  - At least 12 s between any two loud scares (`LOUD_GAP`, existing).
  - A `moment` loud scare waits up to 15 s for the gap and then drops to its fallback.
  - No loud scare in the first 8 s after standing up, or within 2 s after a doc or keypad closes, unless the scare is defined as "on close".
- **Unpredictability:** where marked, triggers use random delays and look-away conditions. Scares come at different points of a step: on pickup, after a call, on the return trip, mid-walk, at a lock. No two stages use the same pattern twice in a row.
- **`settings.flash`:** no `#flash`; flicker patterns become one soft dip; shake ×0.4. Every scare still happens with its full sound and image.
- **Persistent after-states** (`house.apply`, keyed off `r.scares`):
  - `tv`: TV unplugged;
  - `zil`: handset lifted;
  - `buzdolabi`: fridge door open, light off;
  - `sandalye`: chair pulled out and turned;
  - `kapi`: montaj door closed;
  - `tokat`: handprint smudge on the attic window;
  - `tonton`: the plush at the stair foot.

### 4.2 Table

L = loud. Positions are from `ev-tasarim.md` and §2 above.

| Stage | Id | L | Kind | Trigger | What happens | Dur. |
|---|---|---|---|---|---|---|
| 3+ | `tonton` (S1) | | place | First descent (existing) | Existing S1 | 2.6 s |
| 3 | `tv` (S3, re-staged) | L | moment (fallback: existing S3 proximity trigger at stage ≥ 4) | Picking up `ev:kaset4` | The lead music cuts. At t0.6 the screen goes to static with `staticAt` 0.6 and the zone light turns TV-blue and flickers. From t1.2, once the TV is seen within 25° (normally at once), the existing S3 phase 2 runs: Beste's face, `scare` 1.2, `ui.flash(80)`, shake. Not seen within 20 s → the TV switches off silently and the fallback is armed. | 0.6 s face |
| 3+ | `ayak` (new) | | place | First climb up the stairs while carrying an unwatched tape (`vel.z < -0.2`), at a random z in [5.2, 6.8] | `footCreak` ×3, 0.9 s apart, coming **down** toward the player: landing (-1.2, 0.05, 3.4), then stairY(4.4), then stairY(4.9), the last 1.5 m above the player. The flashlight dips softly to 0.15 for 1.2 s. When it comes back, silence; if the attic door is open, it creaks 0.3 rad toward closed and stops. Nothing is seen. | ~4 s |
| 4 | `hat` (new) | | moment | First interact with `ev:telefon` at stage 4 | `phonePickup`; the ring stops. `machineHiss(hallPhone, 1.5)`; `breath` close to the listener (gain 0.5). `k7_room_yedi` (`Yedi.`) at the phone, label `???`. Then `hangup` and a long dial-tone `beep`. The keypad opens; toast `Hat boşa düştü. Beste'nin evini ara.` | ~3.5 s |
| 4 | `zil` (new) | L | moment (skipped if missed) | A random 1.5–3 s after the call sequence ends, if within 6 m of the phone. Otherwise, the next time within 3 m of it before `has(5)`. | One ring right at the phone, `phoneRing(hallPhone, 1)` at gain 1.5. The flashlight cuts to 0 for 0.35 s on the bell; `shake(0.02, 0.2)`. Silence. The handset is now lifted off the cradle (tween 0.1 s, out of view). 1 s later `k6_room_sekiz` (`Sekiz.`) from the receiver, gain 0.6, label `???`. | 2.5 s |
| 4+ | `adam` (S2) | | place | Existing (zone giris/hol, z ≥ 5, sees the hall end). minStage 4. It normally fires while walking from the phone to the rug corner. | Existing S2 | 2.4 s |
| 4+ | `ayna` (S4) | L | place (optional room) | Existing (medicine cabinet closed, or the mirror stare fallback). minStage 4. | Existing S4 | 0.75 s |
| 5 | `buzdolabi` (new) | L | moment (fallback at stage ≥ 6: first time in `mutfak`, within 3 m of the fridge with it behind the player (> 110°) for 2 s) | Stage 5, `koliDown`: within 1.8 m of `ev:hediye` with the fridge > 110° behind, for a random 0.8–2.5 s; or right when the gift keypad closes, if not fired yet | The fridge door bangs open (0 → -1.9 rad in 0.18 s; `doorSlam(fridge, 1.1)`). The interior plane flashes white 0xdff4ff; `scare` at gain 0.7; shake 0.015. The fridge hum (HouseAmbience) jumps ×3. After 6 s the light goes out with a `click` and the hum drops. Toast later on `ev:buzdolabi`: `Buzdolabının kapağı açık. İçi boş ve ılık. Fişi prizde değil.` | 0.5 s + 6 s hum |
| 5+ | `sandalye` (new) | | place | In `mutfak` ≥ 4 s, with the table (1.8, YG, -0.7) out of view (> 100°) for a random 1.5–4 s | Chair 2 slides 0.4 m out from the table and turns to face the player, with one short `woodScrape(chair, 0.35)` at gain 0.3. When it is seen (30°, 0.3 s): `heartbeat(2)` soft. Nothing else. | 0.4 s |
| 5+ | `ust` (A1) | | place | Existing (first time in mutfak or montaj ≥ 20 s after leaving the attic). minStage 5. | Existing A1 | ~8 s |
| 5+ | `kutu` (A2) / `delik` (S8) | –/L | place (optional) | Existing. minStage 5. | Existing | — |
| 6 | `kapida` (new) | L | moment (stage 6 only) | Stage 6, `!has(7)`, standing in `cati`, flashlight on: the attic door in view within 25° at 1.2–4.5 m for 0.3 s | **Door open:** `house.ghost` (`TX.besteGhost`, scaled 0.6 × 0.9) stands on the landing at (-1.2, 0.45, 3.3), head tilted, in the flashlight beam. At t0.35 the flashlight strobes `[0,.06],[1,.05],[0,.12]` and she is gone. The door slams shut (tween 0.15 s; `doorSlam(door, 1.2)`), `scare` 1.0, `ui.flash(70)`, `shake(0.02, 0.25)`; `doorOpen = false`. **Door closed:** `handle(door, 4)`, then `knock(door, 3, 0.3)` at gain 1.2, then silence (no flash). | 1.2 s |
| 6 | `fener` (new) | | moment (only if standing at pickup; otherwise skipped for good) | Picking up Tape 7 while standing | The flashlight dies (lightK → 0 in 0.1 s) for 2.5 s; total dark. At 0.8 s, `ev_buldun` from behind the left ear (camera − forward × 0.3 − right × 0.2), gain 0.9, label `???`. At 2.5 s the light flickers back. | 2.5 s |
| 6+ | `kosan` (new) | | place | First time on level `zemin` at stage ≥ 6, a random 6–20 s after arrival, while in giris/hol | Light, fast child steps (`step(…, 'wood', true, 0.25)` every 0.28 s, 8 steps) cross from the bathroom door (0.9, YG, 7.0) to the salon doorway (-1.7, YG, 8.5), starting from the end behind the player. Then `b_laugh_cold` (`Hihihihi.`) from the salon at gain 0.5, label `???`. Nothing is seen. | ~3 s |
| 7 | `cit` (S6, re-staged) | L | moment (fallback at stage ≥ 8: the old tin trigger) | Picking up `ev:kaset8` | Existing S6 with a new spawn point: of the fence points (x = ±6.3 for z in [-4, -13], and z = -13.3 for x in [-5.5, 5.5], every 1 m), pick the one most behind the player (angle ≥ 120°) at 4–10 m. The swing is already stopped; the crickets cut in 0.5 s. Then the existing seen → lunge sequence. | ~1 s + 2 s silence |
| 7+ | `arka` (new) | | place | First time in `bahce` more than 4 m from the back door | The back door slowly creaks shut (`creak(backDoor, 2.0)`, tween to 0 over 2 s), then `latch`. 1.5 s later, 3 soft knocks from the kitchen side (`knock(backDoor + (0, 0, 0.3), 3)` at gain 0.5). It is not locked. | ~5 s |
| 7+ | `pencere` (A3) | | place | Existing (garden, attic window seen). minStage 7 (the bulb is back on after Tape 7). | Existing A3 | ≤ 4 s |
| 8 | `kapi` (S5) | | moment | Existing (after the desk log, montaj door open) | Existing S5 | 0.5 s |
| 8 | `cam` (new) | L | moment (skipped if missed) | 1.2 s after the `teneke` reader closes, within 3 m of the tin | Crickets go to 0 in 0.4 s and the swing stops. `house.man` is placed behind the pine trunk on the far side from the camera: tree + dir × 0.45, shifted 0.28 m sideways, so the head and one shoulder lean out at about 2.1 m; head tilt 0.3 rad. Once it is seen within 15° for 0.4 s (max wait 6 s): he jerks 0.25 m further out, `scare` 1.3 + `boom`, `ui.flash(80)`, `shake(0.03, 0.3)`. The flashlight cuts out for 0.6 s; when it returns he is gone. Crickets fade back over 4 s. | ~1.5 s |
| 8 | `monitor` (S7) + R1 + seal | L | moment | Existing (box C4) | Existing | 4.4 s + R1 |
| 9 | `esik` (new) | | place | Stage 9, `atticSealed`, `!ritualDone`, standing within 1.4 m of the attic door | The gap under the door glows faintly (`doorGlow(0.12)`). The existing "feet" shadow passes under the gap left to right over 1.5 s. One `breath` behind the door (gain 0.6). Glow off. | 2 s |
| 9 | `tokat` (new) | L | place | Stage 9, standing within 1.6 m of the attic window (1.4, ·, -2.6), looking at it within 20° for 0.6 s | A small pale hand (new `TX.childHand()`, a 0.11 × 0.15 plane at (1.32 + rnd·0.15, 1.45, -2.66), facing +z) slaps the outside of the glass: `knock(window, 1)` at gain 1.5, `scare` 0.9, `ui.flash(60)`, `shake(0.02, 0.2)`. After 0.25 s it slides down 0.1 m and vanishes, leaving a smudged handprint decal. | 0.5 s |

**Count per stage** (one-time, excluding the A4 swing):

| Stage | Main scares | Optional, in side rooms |
|---|---|---|
| 3 | tonton, tv, ayak | — |
| 4 | hat, zil, adam | ayna |
| 5 | buzdolabi, sandalye, ust | kutu, delik |
| 6 | kapida, fener, kosan | — |
| 7 | cit, arka, pencere | — |
| 8 | kapi, cam, monitor (+ R1, seal) | — |
| 9 | esik, tokat | — |

---

## 5. State flags (`st.room`; absent = false)

| Flag | Set by | Meaning |
|---|---|---|
| `flow` | migration | `2` once the save has been migrated to this flow (idempotent) |
| `flowNote` | first load after migration | The update toast was shown |
| `key` | SOBE chest | Attic door key and flashlight taken (this replaces `fbOpen` as the gate for the attic door label) |
| `walk` | attic door unlock | WASD allowed; the attic door is unlocked |
| `doorOpen` | attic door toggle, tape start | Attic door at 90° |
| `doors` | house doors | `{montaj: false, banyo: true, arka: false, dolap: false}` when `walk` is first set |
| `t4Chest` | migration only | Legacy: Tape 4 is still in the chest |
| `holCall` | hall phone success | Hall rug corner lifted |
| `holBoard` | `ev:tahta` | Hall board open |
| `koliDown` | `afterFirst(5)` or migration | Kitchen boxes toppled; gift box revealed |
| `hediyeOpen` | `ev:hediye` | Kitchen gift box open |
| `hotcold` | `afterFirst(7)` or migration | Walking hot/cold active |
| `arkaUnlocked` | `afterFirst(7)` or migration | Back door unbolted |
| `falseBottom`, `fbOpen` | existing | `fbOpen` now means: MONTAJ key + `memo` + `ifade` taken |
| `montajOpen` | montaj door key | Montaj door unlocked |
| `deskRead`, `tinOpen`, `atticSealed`, `plushDown`, `scares`, `seen` | existing | Unchanged |
| Legacy (kept and read, never set by new code) | — | `kilimLifted`, `boardOpen`, `boxToppled`, `giftOpen`, `windowOpen` |

`house.ensureBuilt()` runs when `walk` is set, at load if `walk`, or at the SOBE success. It no longer depends on `stage >= 8 || fbOpen`.

---

## 6. Save migration (`enterHouse()`, once, when `r.flow !== 2`)

| Save | Rule |
|---|---|
| stage ≤ 2 | nothing |
| stage 3, `!chestOpen` | nothing; the new flow starts at the chest |
| stage 3, `chestOpen`, `!has(4)` | `walk = key = true`, `t4Chest = true` (Tape 4 stays in the chest, label `<b>Kaseti al</b>`; taking it uses the existing chest branch) |
| stage 3, `has(4)` | `walk = key = true` |
| stage ≥ 4 | `walk = key = true`, `doorOpen = false`, `doors ??= {montaj: false, banyo: true, arka: false, dolap: false}` |
| stage 4, `kilimLifted`, `!has(5)` | Legacy attic board stays live (existing `floorboard` branch); the hall phone and rug stay inert |
| stage 4, `!kilimLifted` | New hall phone flow (the ring lead starts) |
| stage 5, `boxToppled`, `!has(6)` | Legacy attic gift stays live (existing `giftbox` branch); kitchen boxes stand, no gift shown |
| stage 5, `!boxToppled`, `!has(6)` | `koliDown = true` (silent; the music-box lead plays) |
| **stage 6** (the user) | Nothing more. Tape 7 under the chair works as before; the attic stays dark (`bulbDead`); the flashlight works when standing. Downstairs, the old find spots are inert: rug flat, boxes standing, salon TV top empty. |
| stage ≥ 7 | `arkaUnlocked = true`; at stage 7 with `!has(8)`: `hotcold = true` (walking version; the window find is off) |
| stage 8, `fbOpen` | `montajOpen = true`, `doors.montaj = true` (in the old flow the montaj room was open once the key was taken) |
| stage ≥ 9 | `montajOpen = true`; the existing rules stay (`has(9) && !atticSealed` → silent seal) |
| always | `st.tapes` untouched; `flow = 2`; save |

- **Legacy attic props:** `attic.apply` keeps showing the lifted kilim, the open board and the toppled gift exactly as their legacy flags say. New code never sets those flags.
- **Old scares:** saves with old scare ids keep them. New ids simply have not fired yet; their `moment` fallbacks follow §4.

---

## 7. Lines

### New (`src/data/lines/ev.json` + the `EV_LINES` fallback in `house.js`; the integrator generates the voice)

```json
"ev_buldun": { "v": "beste_whisper", "t": "Buldun. Şimdi sıra sende.", "w": "???" }
```

### Reused (no new recording)

- `k8_room_ice` / `k8_room_cold` / `k8_room_warm` / `k8_room_hot` / `k8_room_burn`: the walking hot/cold (`Buz gibi.` / `Uzaksın.` / `Isınıyorsun.` / `Sıcak!` / `Yandın!`).
- `k5_room_real1`, `k5_room_real2`: the hall phone.
- `k7_room_yedi`: `hat`.
- `k6_room_sekiz`: `zil`.
- `b_laugh_cold`: `kosan`.
- `k8_ebe_sobe`: S7.
- `t1_count`: R1.
- `n_count_end`: seal.
- `k10_room_door`: ritual.
- `ev_tel1`, `ev_tel2`, `ev_dolap`: unchanged.

### New SFX (`houseaudio.js`)

- `boltSlide(t, pos)`: a 0.35 s band-passed metal scrape plus a click.

Everything else reuses existing SFX.

### New textures (`textures.js`)

- `childHand()`: a pale small hand on a transparent 64 × 96 canvas.
- `glint()`: a radial white dot, 64 × 64.

---

## 8. Code touch list (local edits)

- **`src/flow.js` (new):** `FLOW`, `step(g)`, the hint ladder runner (moved out of finds/house), glint placement.
- **`finds.js`**
  - SOBE branch: key + flashlight + `resim`, no Tape 4.
  - `afterFirst` 4 / 5 / 6 / 7 per §2.
  - `phone` and `giftbox` become shared helpers used by both the attic (legacy) and the house ids.
  - The walking hot/cold replaces `updateHotCold`; the `window` find is removed.
  - The hiss starts at 10 s.
  - `objective()` → `flow`.
- **`attic.js`**: key group moved into the main compartment, `fbKey` with the `MONTAJ` tag, the new note text, `apply` visibility per §2 / §6.
- **`house.js`**
  - New props: `ev:kaset4`, `ev:telefon`, rug flap and `ev:tahta`, the boxes and `ev:hediye`, the fridge door, chair 2, `ev:kaset8`, the montaj sign and light strip, the glint sprite, the hand plane.
  - Labels and interacts for them; montaj door lock; back-door bolt; the `door` gate on `key`.
  - `updateLeads()`; `apply()` after-states.
  - `debugFind(n)` for n = 4..9, which runs each find through the real code paths.
  - `OBJ9`, `HINTS9` and `step9` removed.
- **`scares.js`**: the 12 new scares, the `minStage` / kind table, re-staged S3 / S6, the spawn chooser for `cit`.
- **`main.js`**: migration (§6); `enterHouse` builds when `walk`; `playTape` closes the door and calls `cancelAll()`; `objectiveText` → flow; pause `Son ipucu`.
- **`ui.js`**: the `defter` line; the pause hint line.
- **`audio`, `textures`, `lines/ev.json`**: per §7.

**Performance guardrails** (the user reported low FPS; the house now exists from stage 3):

- No new lights.
- New props are merged per room except the interactables.
- In zone `cati` only the `ust` chunk may render, and only while the attic door is open.
- The salon TV canvas redraws at most 15 Hz, and only while its lead or scare runs.
- `renderer.info.programs.length` must not grow after the first full walk.
- Check ≤ 180 draw calls in any view.

---

## 9. Test plan (one browser at a time; logic tests use `debug = {noRender: true}`)

1. **`flow-test.js` (new; `noScares`):** start from `{stage: 3, tapes: [1, 2, 3], room: {furnitureMoved: true}}` and run every stage through to Tape 10 with `teleport` and the real interact ids, simulating each first viewing with `stage = n; finds.afterFirst(n)`.
   - At every step, assert the exact objective string from §2.
   - Advance the ladder clock and assert the rung toasts and the glint.
   - Assert the flags in §5, the owned tapes, and the door auto-close in `playTape`.
2. **`hotcold-test.js` (new):** teleport to the chair, salon, stairs, hol, mutfak and garden at 12 / 7 / 4 / 1.5 m from the swing. Expect the bands Buz gibi, Buz gibi, Uzaksın, Isınıyorsun, Isınıyorsun, Uzaksın / Isınıyorsun / Sıcak! / Yandın!. Spy on `playRoomVoice`: the ids are right and calls are ≥ 1.5 s apart.
3. **`migrate-test.js` (new):** load each save shape in §6. Assert the flags, that `st.tapes` is unchanged, that a second load changes nothing, and that the active step is the expected legacy or new one.
   - **The user's save:** `{stage: 6, tapes: [1..6], room: {furnitureMoved, chestOpen, kilimLifted, boardOpen, boxToppled, giftOpen, bulbDead}}`.
     - `walk` and `key` are set; `label('chairleg') === '<b>Bantlı kaset</b>'`.
     - Seated with pitch -1.3, the hover id is `chairleg`.
     - Standing at (0, 0, 0.25) with yaw π and pitch -1.0, the hover id is `chairleg`.
     - Interact → `has(7)`.
4. **`house-scares.js` (update):**
   - for each stage, satisfy each trigger and assert that each id fires exactly once and in the stage it belongs to;
   - assert that loud timestamps are ≥ 12 s apart;
   - with `settings.flash = true`, `#flash` opacity is never > 0 (sample every 20 ms);
   - hold the trigger conditions during `playTape(1)` → nothing fires; seated → nothing fires;
   - reload → nothing re-fires;
   - check the `moment` fallbacks for a migrated stage-6 save (`tv`, `buzdolabi`, `cit`).
5. **`chain.js` / `fullrun.js`:** use `g.house.debugFind(n)` for n = 4..9 in place of the attic finds. `tapetest.js` 4–10 must be unchanged (no tape files were touched).
6. **`house-shots.js`:** at most 6 shots, logging `render.calls` and `triangles`:
   - salon TV with the title card and Tape 4;
   - the giriş console with the phone;
   - the hall rug corner lifted;
   - the kitchen boxes and gift;
   - the garden swing with the tape;
   - the montaj door with the sign and light strip.
7. **`ctrltest.js`:**
   - Esc and resume while standing relocks the pointer;
   - no WASD while any panel is open;
   - the attic door closes on tape start;
   - VCR click while standing → seated, then the chooser opens.

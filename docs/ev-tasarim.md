# Ev: serbest yürüyüş bölümü (tasarım)

> **Akış v2:** kilit açma, hedefler, bayraklar ve korkutma tetikleri için `docs/ev-akisi.md` geçerlidir (yürüyüş 3. kasetten sonra; kasetler 4–9 evde bulunur). Geometri, eşyalar, kontroller, ARŞİV rafı ve korkutma mekanikleri burada anlatıldığı gibidir.

This is the design for the free-walk section that opens after Tape 8. It is written in English. Every player-facing string is given in Turkish exactly as it should appear in the game.

It replaces row 9 of `roomChain` in `docs/kasetler-tasarim.json`: the EBE false bottom no longer holds Tape 9. Everything else in that file still applies.

---

## 0. Summary

| | |
|---|---|
| Unlock | Tape 8 ends → the false bottom of the chest rises (existing). EBE opens it. Inside: the attic door **key** (paper tag "ALT KAT"), a small **flashlight**, and the docs `memo` and `ifade`. Using the key on the attic door (reachable from the chair, 2.4 m) unlocks it and sets `st.room.walk = true`. From then on WASD works whenever no tape is playing. |
| Goal | Go down to Nermin's edit room (montaj odası). Read her edit log, which says only the tree knows. Go out through the kitchen back door into the foggy garden. At the foot of the old pine with "14.05" carved in it is a tin with the clue. Go back to the montaj room and pull the right box from the archive rack (the one labelled for Beste's 8th birthday, which never came: **✶ 03.02.99 ✶**). That box holds Tape 9. Carry it up while stitched Tonton counts to seven. The attic door slams and locks behind you, and "Sekiz. Dokuz. On." is heard from the other side. |
| Scares | 7 scripted one-time scares (S1–S7), 1 optional one the player triggers (S8), 4 ambient events (A1–A4), and the return-count set piece (R1). |
| New code | `src/house.js` (geometry, props, doors, interactables, zones), `src/walk.js` (controller, collision, flashlight, footsteps, hints), `src/scares.js` (scripted events). Small local edits in main, room, finds, attic, ui, audio, textures, index.html and style.css. |
| Saved | Flags in `st.room` only. The player's position is never saved; on load the player always starts seated. |
| Playtime | 12–18 minutes. |

---

## 1. Coordinates and floor plan

Units are metres. The axes are those of `room.js`: +x is to the right when facing the TV at yaw 0, and −z points toward the TV and the window.

```
Levels
  YA = 0.00   attic floor and stair landing (top of the slab)
  YC = -0.20  ground-floor ceiling (slab underside)
  YG = -2.90  ground floor (top surface)
  YB = -3.05  garden ground (one small step down from the back door)
Player
  EYE = 1.60 above the feet when standing (seated SEAT y = 1.12, unchanged)
  R   = 0.22 collision radius
Stairs
  x ∈ [-1.70, -0.70]  (1.00 wide, centred on the attic door x = -1.2)
  top edge z = 3.80 (y = 0) → foot z = 7.80 (y = -2.90)
  16 risers × 0.18125, treads 0.25, pitch 0.725
  stairY(z) = -(z - 3.80) * 0.725   (walk on a continuous ramp; the steps are only visual)
```

### 1.1 Plan view (ground floor; the landing and stairs are drawn over it)

`+z` is up the page (front of the house), `−z` is down (back, garden).

```
 z= 9.20 ┌───────────────────┬──[DIŞ KAPI]──────┬────────────┬ - - - - ┐
         │                   │  GİRİŞ  coat rack│  BANYO     │ (void,   |
         │      SALON        [door  console+tel.│  tub (z≈8.8)  mirror  |
         │                   │  clock   (x .9)  │  mirror x=3.2 shell)  |
 z= 7.80 │  sideboard+photo  ├───┬ stair foot ──┤ door       ├ - - - - ┘
         │  (x -4.6)         │ M │              [x=.9        │ z=6.40
         │  window x=-4.6    │ E │   HOL         ├────────────┴─────────┐
         │                   │ R │  (x -.7….9)  │                      │
         │  sofa (z 5.6)     │ D │              │  NERMİN'İN ODASI     │
         │                   │ İ │              [door x=.9 z 3.6–4.4   │
         │  coffee table     │ V [cupboard door │  (locked, not built) │
         │                   │ E │ z 3.95–4.60) │                      │
         │  TV (z≈3.0)       │ N │              │                      │
 z= 2.62 ├───────────────────┴───┤ montaj door  │                      │
         │                       [ z 1.55–2.40  │                      │
         │      MONTAJ ODASI     │              │                      │
 z= 1.00 │  edit desk on x=-4.6  ├──── archway ─┴──────────────────────┤
         │  (z -1.5 … 0.9)       │                                     │
         │  folder shelf, pano   │           MUTFAK                    │
         │  (z = 2.6 wall)       │  calendar on x=-.7   table (1.8,-.7)│
         │                       │                      fridge x=4.6   │
         │  ARŞİV rack on z=-3.2 │  counter + sink under window         │
 z=-3.20 └──(x -3.70 … -1.50)────┴──[window x .4–1.5]──[ARKA KAPI x 2.6–3.45]
          x=-4.60          -1.70 -0.70       0.90                 4.60
                                     ▼  GARDEN  (z -3.2 … -13.0, x ±6)
```

### 1.2 Rooms (inner faces of the walls)

| Zone id | Room | x | z | Floor | Openings |
|---|---|---|---|---|---|
| `cati` | Attic (existing) | [-3, 3], walkable [-1.95, 1.95] | [-2.6, 2.6] | YA | Door hole x [-1.64, -0.76], y [0, 1.98] in the back gable z = 2.6 |
| `sahanlik` | Landing | [-1.70, -0.70] | [2.62, 3.80] | YA | Attic door (z = 2.6); stairs at z = 3.80 |
| `merdiven` | Stairs | [-1.70, -0.70] | [3.80, 7.80] | stairY | Opens into GİRİŞ at z = 7.80 |
| `giris` | Entrance hall | [-1.70, 0.90] | [7.80, 9.20] | YG | Front door z = 9.20, x [-0.55, 0.30] (locked); salon doorway x = -1.70, z [8.05, 8.90] (no leaf); open to HOL |
| `hol` | Hall | [-0.70, 0.90] | [1.00, 7.80] | YG | Montaj door x = -0.70, z [1.55, 2.40]; cupboard door x = -0.70, z [3.95, 4.60], h 1.6; Nermin's door x = 0.90, z [3.60, 4.40]; bathroom door x = 0.90, z [6.70, 7.45]; full-width archway into the kitchen at z = 1.00 (header at y = -0.60) |
| `salon` | Living room | [-4.60, -1.70] | [2.62, 9.20] | YG | Window x = -4.60, z [5.4, 6.6], y [-2.0, -0.7] |
| `montaj` | Edit room | [-4.60, -0.70] | [-3.20, 2.62] | YG | Blacked-out window x = -4.60, z [1.3, 2.3] |
| `mutfak` | Kitchen | [-0.70, 4.60] | [-3.20, 1.00] | YG | Window z = -3.20, x [0.40, 1.50], y [-1.85, -0.85]; back door z = -3.20, x [2.60, 3.45] |
| `banyo` | Bathroom | [0.90, 3.20] | [6.40, 9.20] | YG | Frosted window z = 9.20, x [1.8, 2.4], y [-1.0, -0.5] |
| `dolap` | Under-stair cupboard | [-1.70, -0.70] | [2.62, 5.00] | YG | Only its door opens; the player cannot walk in |
| — | Nermin's room | [0.90, 4.60] | [1.00, 6.40] | — | Never built inside (locked; seen only through the keyhole overlay) |
| `bahce` | Back garden | [-6.0, 6.0] | [-13.0, -3.2] | YB | Back door threshold z [-3.40, -3.20] ramps from YG to YB |

The ground-floor ceiling is at YC = -0.20 (2.70 m high).

The space over the stairs is closed by two walls (x = -1.70 and x = -0.70, from z = 2.62 to 7.80) and a soffit. The soffit height is `min(2.10, stairY(z) + 2.70)`: flat at 2.10 over the landing and the top steps, then sloping down to YC at the stair foot, so headroom is a constant 2.70 m. A small skylight (dark blue emissive, 0.5 × 0.6) sits in the soffit above the landing at (-1.2, 2.09, 3.2).

### 1.3 The attic door, landing and finale

- The existing BackSide corridor box in `room.js` is hidden once the house is built. Keep a reference to it: `this.corridor = corr`.
- `corridorLight` (-1.2, 1.6, 4.4), `gap`, `spill` and the girl plane (z 3.7 → 3.15, y 0.6) stay exactly as they are. The girl now stands on the landing floor (which runs to z = 3.80). The corridor light now hangs over the stairwell, so in `doorGlow(1)` it washes the stairwell walls blue behind her and the steps fall away into the dark. The dawn() warm corridor light lights the same walls.
- A yellow child's raincoat hangs on a hook on the landing wall at (-1.69, 1.2, 3.5) ("ev:yagmurluk"). It is visible in the finale beside the girl.
- **Chunk visibility rule (checked every frame):** in zone `cati`, the `ust` chunk (landing and stairs) is visible only while `room.doorPivot.rotation.y > 0.02`. This covers the walk-mode door and the finale's `openDoor(0.45)`.
- Attic door collision: closed means a wall. Open (rotation ≥ 1.2) adds an AABB for the panel, x [-1.68, -1.58], z [1.72, 2.60].

### 1.4 Exterior and garden

- The garden ground is a plane at YB, x [-6, 6], z [-13, -3.2], with a grass texture. Outside the fence there is a dark ground plane, 80 × 60, at YB − 0.01.
- **Fence:** wooden pickets, 1.3 m, as one `InstancedMesh` of about 220 pickets plus posts every 2 m. It runs along x = ±6 and z = -13, plus short pieces at z = -3.2 for |x| in [4.6, 6].
- **Gate:** in the back fence at x [-0.6, 0.6], chained shut ("ev:bahcekapisi").
- **Old pine (yaşlı çam):** trunk at (2.0, YB, -6.4), radius 0.34 tapering to 0.15, 10 m tall, with five stacked cones of foliage from y -0.5 to 7.5 and a few dead low branches.
  - Carving **"14.05"** at y = -1.6 (1.45 m above the ground) on the face toward the forest (−z), with fresh, pale wood.
  - The tin sits between the roots on the same side, at (2.0, YB + 0.06, -6.85).
  - To read the carving or open the tin, the player stands at about z = -7.4 facing +z, with the back fence behind them. S6 depends on this.
- **Swing:** an A-frame at (-3.0, ·, -8.5) with its top bar 2.3 m above the ground and a seat at YB + 0.45 on two ropes. It sways by itself (A4).
- **Forest:** about 40 low-poly pines (cone + trunk, `InstancedMesh`) in z [-16, -34], x [-22, 22], plus side bands |x| in [8, 20], z [-13, 0].
- **Sky:** one plane far away (z = -48, y = 8, 140 × 50, `TX.skyTexture('night')`, `fog: false`), visible only in zone `bahce`. The attic's own `room.sky` plane (0.9 m outside the attic window) must be hidden in `bahce`, because from below it would float in the air.
- **House exterior** (seen only from the garden):
  - plaster back wall at z = -3.2 from YB up to 0.10;
  - a flat tar roof at y = 0.10 over the parts outside the attic;
  - exterior cladding for the attic gable at z = -2.63 (facing −z), with a hole matching the attic window (x 1.4 ± 0.35, y 1.55 ± 0.4);
  - knee-wall cladding at x = ±3.02.
  - The attic roof slopes are already double-sided wood and read as a wooden roof.
- **Lit attic window:** a warm emissive plane just inside the glass at (1.4, 1.55, -2.58). Its strength follows `room.bulbLevel`, so from the garden the window looks lit while the bulb is on. A3 uses it.
- **Kitchen window:** looks onto the garden (the pine is visible). The `bahce` chunk is visible from zone `mutfak`.

---

## 2. Props per room

All props are low-poly boxes and cylinders, merged per room and material with `BufferGeometryUtils.mergeGeometries`. Copy that file from three 0.180.0 (it exists in the scratchpad `threepkg`) to `vendor/three/addons/utils/`. Interactable props stay as separate meshes.

| Room | Props (centre / extent) |
|---|---|
| Landing | Raincoat on a hook; a dead potted plant at (-0.85, 0, 2.85); a handrail (cylinder) along the x = -0.70 wall from the landing to the foot. |
| Stairs | 16 tread+riser boxes (floor plank material), and wallpaper on both walls in a darker tint (`color 0x8a8078`). |
| GİRİŞ | Front door leaf (locked). Coat rack at (0.62, YG, 9.0) with a beige cardigan. Console table x [0.55, 0.88], z [7.90, 8.60], top at -2.10. On the console, an **answering machine** at (0.72, -2.05, 8.25) whose red LCD blinks "2". **Wall clock** at (0.88, -1.15, 8.25) facing −x, stopped at 13:59. **Light switch** at (-1.68, -1.75, 7.92). |
| HOL | Runner rug (`TX.kilim()`) x [-0.4, 0.6], z [1.4, 7.4]. A framed pine-forest painting at (0.88, -1.4, 5.6). The montaj door leaf is hinged at z = 2.40 and opens into the montaj room. The cupboard door leaf (1.6 high) is hinged at z = 4.60 and opens into the hall. Nermin's door is a leaf with a brass keyhole plate at (0.89, -1.95, 4.32). |
| SALON | **CRT TV** in a wooden cabinet: cabinet x [-3.6, -2.7], z [2.70, 3.20], 0.5 high; TV 0.62 × 0.5 × 0.45 on top, screen centre (-3.15, -2.15, 3.18), facing +z; `CanvasTexture` 320 × 240. Sofa centred (-3.15, YG, 5.6), 1.8 × 0.85, facing the TV. Coffee table (-3.15, YG, 4.4). Armchair (-2.2, YG, 4.6). **Sideboard** x [-4.6, -4.15], z [7.0, 8.6], 0.9 high, with a **framed photo** at (-4.35, -1.95, 7.8) facing +x. Dead floor lamp (-4.3, YG, 3.2). Curtains at the window. |
| MONTAJ | **Edit desk** against x = -4.60: x [-4.6, -3.8], z [-1.5, 0.9], top at -2.15. On it: three CRT monitors at z = -0.9, -0.2, 0.5 (0.45 wide, facing +x, sharing one 512 × 128 canvas atlas); two VCR decks stacked at z [-1.4, -1.0] with small display planes; a jog-wheel box; the **kurgu defteri** (open notebook) at (-3.95, -2.13, 0.6). Chair (-3.4, YG, -0.2). **ARŞİV rack** against z = -3.20: x [-3.70, -1.50], 0.35 deep, sign "ARŞİV — DOKUNMAYIN — N.", 4 shelves (A to D, top to bottom) of 6 upright tape boxes (0.12 × 0.20 spines); see §5. **Folder shelf** x [-1.3, -0.8] on the z = 2.6 wall at y -1.6 with binders. **Corkboard** with storyboard at (-2.6, -1.4, 2.58). Cardboard boxes of tapes at (-1.2, YG, -2.6) and (-1.4, YG, -1.9). Black cardboard over the window, with a thin slit of moonlight. |
| MUTFAK | Counter along z = -3.20 for x [-0.65, 2.45], 0.6 deep, top at -2.0. The sink sits under the window. The **drawer** front is at (1.9, -2.15, -2.59). Stove at x [-0.6, 0.0]. **Fridge** (old, rounded) against x = 4.60: z [-0.95, -0.25], 1.6 high, facing −x, with a child's drawing on the door at (3.94, -1.6, -0.6). Table (1.8, YG, -0.7) with two chairs. **Calendar** on the x = -0.70 wall at (-0.68, -1.4, -0.8) facing +x. Dead fluorescent tube. |
| BANYO | Tiles (new `TX.tiles`). **Mirror cabinet** on the x = 3.20 wall, centre (3.19, -1.35, 7.10), mirror 0.50 (z) × 0.65 (y), with the sink under it at -2.05. **Bathtub** x [1.2, 3.15], z [8.45, 9.15], 0.55 high, with a closed **shower curtain**. Toilet (2.85, YG, 6.75). The door leaf is hinged at z = 6.70 and opens inward. |
| DOLAP | Seen only through the open door: a pile of burnt, melted tapes at (-1.2, YG, 3.6), a moth-eaten blanket, a cardboard box. |

### 2.1 Mirror (no extra render pass)

The mirror is a hole in the x = 3.20 wall covered by a dark glass plane (`MeshStandard`, color 0x1a1c20, opacity 0.55, roughness 0.15, with a grime canvas).

Behind the glass, in the void x [3.2, 5.5], sits a **mirrored shell** of the bathroom: a `Group` holding clones of the bathroom's static merged meshes (walls, tub, door frame, toilet), with `scale.x = -1` about the plane x = 3.20. three.js flips the winding for a negative determinant. The shell is visible only in zone `banyo`. From the garden the void cannot be seen, and the house exterior hides it.

The S4 ghost is placed inside this shell at the mirror image of a point behind the player.

---

## 3. Controls, controller and camera

| Input | Action |
|---|---|
| **W A S D** (`e.code` KeyW/KeyA/KeyS/KeyD, so Turkish-F and Q layouts both work) | Move. Any of them while seated stands the player up, only when `st.room.walk` is set and no tape is playing. |
| **Shift** | Run (short) |
| Mouse | Look. Standing pitch clamp ±1.35. The seated clamps are unchanged. |
| **E** / left click | Interact. Reach is **2.0 m** standing and 3.6 m seated (unchanged). |
| **F** | Only when seated: focus / unfocus the TV (unchanged). Standing within 2.5 m of the chair in the attic, F sits the player down and focuses. Elsewhere it shows the toast `F yalnızca televizyonun karşısında otururken çalışır.` |
| **Q** / right click | Toggle the flashlight while standing |
| Esc | Pause (existing). Also clears held movement keys. |

Movement rules (in `walk.js`):

- **Can move** = `mode === 'play' && !g.panelOpen() && !director.active && !g.loadingTape && st.room.walk && !room.locked && !scares.inputLock && !transition`.
- **Held keys** are cleared on pause, window blur, any overlay opening, tape start, and on reaching the title screen.
- **Speed:**
  - walk 1.55 m/s; backwards ×0.8; on the stairs ×0.8;
  - run 2.9 m/s with 2.5 s of stamina; it regenerates at 0.6 s per second once the player has not run for 1 s;
  - when stamina runs out, play `breath` at the listener (feedback only, no HUD bar);
  - acceleration 10 m/s².
- **Head bob:** vertical 0.028·|sin φ|, lateral 0.012·sin(φ/2); φ advances 2π per 1.1 m. Amplitude ×0.5 when `settings.flash` is on.
- **Stand up** (0.45 s): tween from SEAT to the feet at (0, YA, 0.25), eye at y 1.6; `creak` at the chair (short) plus one footstep.
- **Sit down** (0.7 s): tween the eye to SEAT, yaw to 0, pitch to -0.04. If the player is more than 1.5 m from the chair, do a 0.25 s fade-out, reposition, then fade in instead.
  - Interacting with `vcr`, `tv` or `tapestack` while standing first awaits `walk.sitDown()`, then runs the normal action. For `tv` that action is `room.setFocus(true)`, not a toggle.
  - `playTape()` also calls `sitDown()` as a safety net. Tapes are only ever watched seated.
- **Camera:** `room.walkCam` (a Vector3) overrides the SEAT/FOCUS lerp in `room.update`, and the breathing sway is kept. The flashlight SpotLight is a child of the camera.
- **Collision:** a circle (R = 0.22) against axis-aligned XZ boxes, tagged by level (`ust`, `zemin`, `bahce`). The player is pushed out along the axis of least penetration, in two passes.
  - Door leaves are dynamic boxes: closed means a wall segment; open (90°) means a box along the wall.
  - Wall segments with gaps for the openings in §1.2.
  - Furniture boxes as in §2.
  - Attic obstacles:
    - TV cabinet x [-0.58, 0.58], z [-2.6, -1.5];
    - tape box x [-1.28, -0.68], z [-1.42, -0.94];
    - side table x [0.76, 1.40], z [-1.45, -0.95];
    - chair x [-0.25, 0.25], z [0.48, 0.96];
    - moved chest x [1.15, 1.75], z [-0.33, 0.53];
    - gift box x [1.42, 1.78], z [1.27, 1.63];
    - toppled box x [1.75, 2.25], z [1.3, 1.8];
    - box stack x [1.6, 2.1], z [1.98, 2.42].
  - Attic bounds: |x| ≤ 1.95 (because of the roof slope), z ≥ -2.35, z ≤ 2.38, except inside the door corridor x [-1.42, -0.98], which leads to the landing.
  - The cupboard doorway, the front door, Nermin's door and the gate are always solid.
  - Garden: fence boxes, the pine trunk (0.45 box), the swing posts, and the house wall except the back-door gap.
- **Floor height:** `level` changes only through the stairs (top ↔ ground at z = 3.80 / 7.80) and through the back-door threshold (ground ↔ garden).
  - Feet y = 0 at the top level, stairY(z) on the stairs, YG on the ground floor, and a lerp from YG to YB across the threshold z [-3.40, -3.20].
  - The camera y is smoothed (k = 12/s) so the stairs feel stepped.
  - If no valid floor is found, the player is reset to the last valid position.
- **Footsteps:** every 0.62 m when walking and every 0.75 m when running, positioned at the feet, gain 0.5 walking and 0.8 running. Surface by zone:
  - `wood`: cati, sahanlik, giris, hol, salon, montaj;
  - `stair` (wood plus a random creak, 1 in 3): merdiven;
  - `tile`: mutfak, banyo;
  - `grass`: bahce.
- **Flashlight:**
  - `SpotLight(0xfff0d8)`, intensity 12 (tune), distance 9, angle 0.38, penumbra 0.6, decay 1.4, no shadow.
  - Position (0.12, -0.12, 0) on the camera, target (0.02, -0.05, -1).
  - It switches on automatically when standing (0.3 s fade, `click`) and off when seated. Q / right click toggle it.
  - `walk.flicker(pattern)` runs a list of `[level, seconds]`. With `settings.flash` on, any pattern collapses to one smooth dip to 0.12 for the same total duration (no strobe).
- **Shake:** `walk.shake(amp, sec)` adds a random camera offset and roll. Amplitude ×0.4 with `settings.flash`.
- **Touch** (stretch goal): four DOM arrow buttons bottom-left mapped to WASD, plus a "Koş" button. Not needed for the exe.

### 3.1 HUD

- `#walk-hint` (styled like `#vcr-hint`):
  `<b>W A S D</b> yürü · <b>Shift</b> koş · <b>E</b> / tık: etkileşim · <b>Q</b> fener · oturmak için video oynatıcıya tıkla`
  - Shown for 8 s after the door unlocks, and for 6 s on each of the first two stand-ups.
  - Shown again by the 20 s hint if the player has never stood up.
  - Hidden whenever a tape plays.
- `#flash`: full-screen white div, `pointer-events: none`. `ui.flash(ms)` sets its opacity to 0.85 and fades it out over `ms`. It is a no-op when `g.settings.flash` is true.
- New KONTROLLER rows:
  - `W A S D`: `Yürü (tavan arası kapısı açıldıktan sonra; bir yön tuşu seni ayağa kaldırır)`
  - `Shift`: `Kısa bir süre koş`
  - `Q / Sağ tık`: `El fenerini aç / kapat`
- The existing F row becomes: `Televizyona odaklan / geri çekil (yalnızca otururken; kaset oynarken ekrandan ayrılamazsın)`.

---

## 4. The chain: exact hooks

### 4.1 `finds.js` (chest, false-bottom branch)

```js
if (r.falseBottom && !r.fbOpen) {               // label: '<b>Sahte dibin kilidi</b>'
  const ok = await this.lock('falsebottom', 'EBE', 3, 'SAHTE DİP', [ ...same 3 hints... ]);
  if (ok) {
    r.fbOpen = true;
    g.room.attic.openFalseBottom();
    au.sfx('boxOpen', g.room.points.chest);
    await sleep(1400);
    au.sfx('pickup');
    g.room.attic.apply(this.st);                 // hides key + flashlight
    this.toast("Sahte dibin altına bantlanmış eski bir anahtar var. Kâğıt etiketinde 'ALT KAT' yazıyor. Yanında küçük bir el feneri ve iki kâğıt.", 7);
    await g.readDoc('memo');
    await g.readDoc('ifade');
    g.save(); g.updateObjective();
  }
  return true;
}
```

- After `fbOpen`, the chest label is `Oyuncak sandığı` and its toast is `Sandığın sahte dibi açık. İçi boş.`
- `objective()`: for `n === 9 && r.fbOpen`, return `g.house.objective9()` (see §8).
- `startRitual()` (Tape 10 find): the footsteps now climb the real stairs:
  ```js
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    au.sfx('footCreak', new THREE.Vector3(-1.2, -1.6 + k * 1.6, 6.0 - k * 2.4));
    await sleep(1100);
  }
  ```
  `room.points.stairs` becomes `(-1.2, -1.6, 6.0)`.

### 4.2 `attic.js`

- `chestTape9` (under the false bottom) is replaced by `this.chestKey`, a Group with three parts:
  - a brass key (shaft cylinder 0.07, torus bow r 0.018, box bit);
  - a 0.06 × 0.03 paper tag reading `ALT KAT` (labelTex, Caveat);
  - a small black flashlight (cylinder r 0.018, h 0.14, with a glass lens disc).

  Two masking-tape strips hold them where the tape was.
- The note on the false bottom changes to `Aşağının anahtarı burada.` / `Kilidi, onun adını öğrenen açsın. — N.`
- In `apply()`, `this.chestKey.visible = !room.fbOpen` (no dependency on `has(9)`).

### 4.3 `ui.js`

The memo's handwritten line gains one sentence:

`Pilot asla bitmeyecek. Kaseti ben saklıyorum. Listede benim işaretlemediğim bir klip var: 7. Ham kayıt aşağıda, montaj odamda; kendi rafında değil. —N.`

### 4.4 Attic door (handled by `house.label/interact('door')` when `st.room.fbOpen`; otherwise the existing toasts)

| State | Label | Interact |
|---|---|---|
| fbOpen, not walk | `<b>Kapıyı anahtarla aç</b>` | `keyTurn` + `creak` at the door. The door swings by itself to 1.0 (90°) over 2.5 s. Sets `st.room.walk = true` and `doorOpen = true`. Toast `Anahtar zorlanarak döndü. Kapı kendiliğinden aralandı. Aşağıdan nemli, soğuk bir hava geliyor.` 1.5 s later, `#walk-hint`. Save. |
| walk, open | `Kapıyı kapat` | Tween to 0 over 0.8 s, `latch`, `doorOpen = false` |
| walk, closed | `Kapıyı aç` | Tween to 1.0 over 0.9 s, `creak` |
| atticSealed | `Kapı (kilitli)` | `vcrStuck` at the door. Toast `Kilitli. Anahtar artık kilide girmiyor. Kapının öbür yanında biri nefes alıyor.` |

### 4.5 Return and seal (R1 end, §6)

Trigger: `has(9) && !atticSealed && zone === 'cati' && feet.z < 2.0`.

1. The door tweens to 0 in 0.18 s.
2. `doorSlam` at `points.door`; `flickerBurst(0.6)` unless `settings.flash`.
3. After 0.5 s, `audio.playRoomVoice('n_count_end', {pos: points.door, gain: 1.3})` with the subtitle label `???`.
4. Then `keyTurn` at the door (the lock turns by itself).
5. Set `atticSealed = true`, `doorOpen = false`, save.
6. Toast `Kapı arkandan çarparak kapandı. Kilit kendi kendine döndü. Anahtar artık kilide girmiyor.`
7. After 2 s, `breath` at the door.

After this the objective falls through to the existing `Kaseti televizyonun altındaki video oynatıcıya tak.` Walking inside the attic stays possible.

**On load or continue:** if `has(9) && !atticSealed`, seal silently (the player always starts in the chair).

**Old-save migration:** if `fbOpen && has(9) && !walk`, set `walk = true` and `atticSealed = true`.

### 4.6 `main.js` routing

- `label(id)`: `finds.label` → `house.label` → existing switch.
- `interact(id)`: finds → house → existing.
- `objectiveText()`: if `newTape() === 9 && !st.room.atticSealed`, return `Kaseti tavan arasına götür.`
- `panelOpen()` also checks `#keyhole`.
- The `door` default toast stays for players without the key.

---

## 5. The Tape 9 puzzle: ARŞİV rack

**Clue chain:**
1. `ev:defter` (montaj desk) says the location is written in the box at the tree's foot. Sets `deskRead`.
2. `ev:teneke` (garden) holds the note `Hiç kutlanmayan bir günün kasetine sakladım. Hediyesini o gün açacaktı.` Sets `tinOpen`.
3. The player knows from Tape 6's gift box (tag `Sekizinci yaş gününde açılsın`, letter dated `3 Şubat 1999`) and the school card (`03.02.1991`) that the day is **03.02.99**.

**Rack layout:** 24 boxes, each its own mesh tagged `ev:arsiv:<slot>`. One 1024 × 512 canvas atlas holds all the spines (Caveat, cream label, a few coloured dots). Facing the rack (−z), slot 1 is at the left (x = -3.45) and slot 6 at the right (x = -1.75); spacing is 0.34. Shelf heights are y -1.25 (A), -1.70 (B), -2.15 (C) and -2.60 (D). The hover label is the spine text.

| | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| **A** | BÖLÜM 1 — TANIŞALIM — MASTER | BÖLÜM 2 — KUYRUK — MASTER | BÖLÜM 3 — SES YOK | PİLOT — İPTAL | JENERİK — 07.05.98 | TONTON KUKLA PROVA — 28.04.98 |
| **B** | SES KAYDI 1 — 02.05.98 | SES KAYDI 2 — 06.05.98 | SES KAYDI 3 — 09.05.98 | 14.05.98 — ÇAMLIK | ARAMA — 15.05.98 | REKLAM ARALARI 97 |
| **C** | YILBAŞI — 31.12.97 | NERMİN 34 — 21.03.98 | 23 NİSAN GÖSTERİSİ — 23.04.98 | **✶ 03.02.99 ✶** | KÂMİL'İN DÜĞÜNÜ — 12.07.97 | KARNE GÜNÜ — 16.06.98 |
| **D** | RIZA BEY 50. YAŞ — 09.11.97 (KOPYA) | BOŞ | BOŞ | SİLİNDİ | KANAL TANITIM — 98 | ARŞİV LİSTESİ |

**Behaviour:**

- **Before `tinOpen`**, any box shows `Raflarca kaset. Nermin hepsine tarih yazmış. Hangisi olduğunu bilmeden hepsini açamazsın.` It does not count as wrong.
- **After `tinOpen`, a wrong box** slides out 0.12 m, `woodScrape` plays (short), and it slides back. Its toast is the default `'{etiket}' — kurgu kopyası. Aradığın bu değil.`, except:
  - B4: `Kutu boş. İçine kırmızı kalemle yazılmış: 'JANDARMAYA VERİLMEDİ. İMHA EDİLDİ. — R.Y.'`
  - C6: `Boş bir kaset. Hiç kayıt yapılmamış. Etiketin köşesine küçük harflerle 'gelmedi' yazılmış. Yakın... ama Nermin hediyeden söz ediyordu.`
  - C2: `Nermin'in doğum günü. Kasette mum üfleyen bir kadın, yanında alkışlayan küçük bir kız. Beste. Bu değil.`
  - D2 / D3: `Boş kutu.`
  - D4: `Kutunun içinde kesik kesik bant parçaları. Birinin üstüne kurşun kalemle 'AY—' yazılmış.`
  - A3: `Kutunun içine yapıştırılmış bir kâğıt: 'Ses yok. Eskilerden kes, yapıştır. — R.Y.'`
- **Wrong-pick hints** use `finds.wrongHint('arsiv', …)` at the 2nd, 4th and 6th wrong pick:
  - `Nermin'in notu: hiç kutlanmayan bir gün. Hediyesi o gün açılacaktı.`
  - `Tavan arasındaki hediye kutusunun etiketi: 'Sekizinci yaş gününde açılsın.'`
  - `Beste'nin sekizinci doğum günü: 03.02.99. C rafı, dördüncü kutu.`
- **C4 after `tinOpen`:** the box slides out and opens; `pickup`; `g.addTape(9)`. Toast `Kutunun içinde etiketi kazınmış bir kaset. Kapağın içine bantlanmış bir not: 'HAM KAYIT — ÇAMLIK 14.05.98 — YAYINLANMAZ. İyi ki doğdun, Beste. — N.'` Then S7, then R1. From then on, C4 shows `Boş kutu. Not hâlâ kapağın içinde.`

---

## 6. Scares

**Common rules** (in `scares.js`):

- Each scare fires once: its id is pushed to `st.room.scares` and saved immediately.
- A scare fires only when `mode === 'play'`, `!panelOpen()`, `!director.active` and `walk.standing`.
- Loud scares (S3, S4, S6, S7, S8) keep **at least 12 s apart**. A satisfied trigger waits for the cooldown.
- All timers run on `g.clock` and are cancelled on quit to title.
- **`settings.flash` on:** no `#flash`, no strobe flicker (the dip variant is used instead), and shake ×0.4. Every scare still happens with its full sound and image.
- "Seen" means the angle between the camera forward vector and the direction to the target is under N° and the distance is in range, held for the given time. Use the camera position for the test; walls between are not checked, because every trigger zone has a clear line of sight.

| # | Id / name | Arming condition | Trigger | What is seen and heard | Duration |
|---|---|---|---|---|---|
| S1 | `tonton`: Tonton on the stairs | `walk`, `!plushDown` | Feet on the stairs at z ≥ 5.9 (step 9), moving down. Fallback: reaching the foot z ≥ 7.6. | (1) `room.plush` is teleported to the landing (-1.2, 0.02, 3.6) while the player faces down. (2) A loud `thud` at the landing (gain 1.4), right behind the head. (3) The plush tumbles down 2 steps per hop at 0.2 s per hop, with a 0.25 arc and a tumble of 2.4 rad per hop. Each landing plays `thud` (gain 0.6–0.9). It passes the player 0.3 m to the side with a close `whoosh`. (4) It rolls to (-0.9, YG, 8.35) and sits up facing the camera. (5) After 0.6 s of silence, a tiny positional `squeak` (new sfx; the stitched Tonton). Set `plushDown = true`; from then on `house.apply` puts the plush at the stair foot. No flash, no shriek. | 2.6 s |
| S2 | `adam`: the man at the end of the hall | S1 done ≥ 6 s ago, zone giris/hol, z ≥ 5.0 | The grey man (billboard `TX.greyMan()`, 2.30 m, head bent under the archway header) stands at (0.15, YG, 1.30). He is seen within 18°, at 3.5–9 m, for 0.5 s. If the player is at z < 5 without having seen him, he is not shown; re-arm. | t0: `ambience.setDrone(0.25, 1)`; his head tilts 0 → 0.25 rad over 1.2 s, silhouetted against the blue kitchen window. t1.3: flashlight flicker `[0,.08],[1,.06],[0,.10],[1,.05],[0,.35]`; he is removed during the last off. t1.95: the light returns on an empty hall; `sting` at his position plus `heartbeat(4)`; the drone fades over 4 s. If the flashlight is off, the same pattern runs on the zone light. | 2.4 s (+3.4 s heartbeat) |
| S3 | `tv`: the living-room TV | zone salon, ≥ 2 s in the room, ≤ 4.0 m from the TV | Phase 1 (proximity): the TV switches on. Phase 2: the TV is seen within 25° ≥ 0.6 s after switching on. If it is never seen, the static runs up to 60 s, then the TV turns off and re-arms. | Phase 1: `tvOn` click and loud positional static (new `staticAt`, gain 0.7); `S.staticNoise` on the screen canvas; the zone light turns TV-blue and flickers 0.4–1.2. Phase 2: the screen cuts to `S.scareFace(ctx, t, 'beste')` (canvas scaled 0.5); `scare` at the TV (gain 1.2); zone light burst to 3.0 for 0.1 s (red only with flash off-setting); `ui.flash(80)`; `walk.shake(0.02, 0.25)`. Then `tvOff`, a black screen and a fading white afterglow dot (1.5 s). Afterwards the TV toast changes (§7). | 0.6 s face |
| S4 | `ayna`: the bathroom mirror | zone banyo | Primary: the player closes the medicine cabinet (`ev:ecza` toast dismissed; the mirror door swings shut in 0.35 s with `boxClick`) while facing the mirror within 30°. Fallback: within 1.4 m and facing it within 20° for 2.0 s. | t0.25: Beste's ghost (`TX.besteGhost()`, 0.5 × 0.75) appears **in the reflection only**, at the mirror image of the point 0.55 m behind and 0.25 m right of the camera, recomputed every frame. `scare` placed behind the player; `ui.flash(80)`. Her head tilts slightly. t1.0: short flashlight flicker, then she is gone. If the player turns more than 60° before that, she vanishes at once; nothing is behind them. Afterwards the bathroom door behind slowly creaks shut (2.5 s, `creak` at the door). It opens normally. | 0.75 s visible |
| S5 | `kapi`: the montaj door slams | zone montaj, the montaj door open, player ≥ 2.5 m from the door | Right after the `defter` reader closes. Otherwise when within 1.0 m of the desk for 1.5 s. | `doorSlam` at the door (very loud: boom, wood clack, rattle); the leaf tweens shut in 0.15 s; `shake(0.025, 0.2)`. The three monitors flash static for 0.3 s with a `tvOn` crackle, then go dark (foreshadowing S7). `doors.montaj = false`. No `#flash`. | 0.5 s |
| S6 | `cit`: the figure at the fence | zone bahce, `tinOpen`, after the tin reader closes | 1 s after the reader closes, the grey man spawns just outside the back fence at (clamp(player.x + 1.2, -4.5, 4.5), YB, -13.3), behind the player. The swing stops dead and the crickets fade to 0 in 0.5 s; the silence is the cue. Trigger: seen within 20° for 0.35 s. After 25 s unseen: one swing creak and a twig snap at the fence (attention cue); keep waiting. If the player leaves the garden first, cancel and re-arm for the next visit (spawning out of view). | t0.4: **lunge**. The figure (the arms-raised variant of the texture) slides from the fence to 0.6 m in front of the camera in 0.22 s (ease-in, billboarded). `scare` at the figure (gain 1.4) plus `boom`; `ui.flash(100)`; `shake(0.03, 0.35)`. t0.62: `#fade` on instantly, then off over 0.3 s; the figure is removed. 2 s of total silence, then the crickets fade back over 4 s and the swing resumes. | ~1 s + 2 s silence |
| S7 | `monitor`: the monitors | Right after C4 gives Tape 9 | — | t0.6: two positional `deckClunk`s; the deck displays light up `PLAY`. Monitors switch on with `tvOn` and static. t1.0: monitor 1 shows the grey man between trees (`S.drawSilhouette` scene); monitor 2 shows `SOBE` in big OSD letters; monitor 3 shows a dark room with a figure seen from behind at a shelf (the player) and a `REC ●` OSD. t2.2: all three cut to `S.scareFace(…, 'man')`; `scare` at the desk (gain 1.3); zone light green-white burst (green only with the setting); `ui.flash(80)`. t2.8: everything goes off; the flashlight dies for 1.6 s (a dip to 0.1 with the setting): total darkness. t4.4: the light returns and R1 begins. If `g.lines.k8_ebe_sobe` exists, play it from the hall at t2.9. | 4.4 s |
| S8 | `delik`: the keyhole (optional, started by the player) | Nermin's door has been tried once | Interact `<b>Anahtar deliğinden bak</b>`. | A `#keyhole` overlay (`g.overlay = 'keyhole'`, input blocked) shows a keyhole-shaped canvas view of a dim bedroom: a bed, a music box and curtains, with the music box tinkling. After 1.6 s a bloodshot eye fills the keyhole, with `scare` (gain 1.0) and no `#flash` (the eye is the image). The overlay closes after 0.5 s. Toast `Kapının öbür yanından ayak sesleri uzaklaştı.` A2 ends for good. | 2.1 s |

### 6.1 Ambient events (quieter, once each)

| Id | Where / condition | Content |
|---|---|---|
| A1 `ust` | First time in zone montaj or mutfak, ≥ 20 s after leaving the attic | Four slow `footCreak`s overhead at y = 0.05, starting 1 m ahead of the player and moving away. Then a chair scrape (`woodScrape` 0.5 s at (0, 0.3, 0.72)). Then the show's jingle whistled faintly from the attic TV (`whistle` at `points.tv`, speed 0.5). Nothing visible. |
| A2 `kutu` | First time within 3 m of Nermin's door, and S8 not done | A new `musicBox` sfx plays the jingle's notes slowed at (2.5, -2.0, 4.0), behind the door. It stops the moment the player touches the door. Door toast while it plays: `Nermin'in odası. Kilitli. İçeriden çok kısık bir müzik kutusu sesi geliyor.` |
| A3 `pencere` | Zone bahce, before S6. The attic window is seen within 15° from ≥ 3.5 m from the house wall | A girl silhouette (`TX.girlSilhouette()`, 0.5 × 1.0) stands inside the lit attic window at (1.4, 1.1, -2.45) for as long as she is watched (max 4 s). Then the lit-window plane goes dark for 0.2 s with two soft knocks on the glass (`knock` 2, gain 0.4, at the window). When it comes back she is gone. |
| A4 `salincak` | Always in the garden (paused during S6) | The swing sways ±0.12 rad at 0.45 Hz with a `swingCreak` at each end of the swing. |

### 6.2 R1: the return count (set piece, not a jumpscare)

1. It starts 1.0 s after S7 ends. Tonton's original count from Tape 1, `t1_count` (`Bir... iki... üç... dört... beş... altı... yedi...`), plays from the plush at the stair foot. Use `playRoomVoice`, `rate 0.93`, `detune -70` (stitched Tonton), gain 1.1, label `TONTON`. The player has to walk toward it and past it.
2. The objective becomes `Kaseti tavan arasına götür.`
3. **Follower:** while the player moves in `zemin` or `merdiven`, every 1.3 s a `footCreak` sounds 4 m behind them (along −forward, at floor level), gain 0.5. It stops when the player stands still (statues). Nothing is ever visible.
4. When the player is within 2 m of the plush, its head turns to follow the camera.
5. The count ends at seven. What follows is silence until the seal in §4.5, where `n_count_end` (`Sekiz. Dokuz. On.`) finishes it from behind the door, exactly as in Tape 1.

---

## 7. Searchables and other interactables (Turkish text)

Ids use the prefix `ev:`. A label is **bold** while unexamined and plain afterwards; seen ids go in `st.room.seen`.

### 7.1 Searchables (10)

| # | Id | Room | Label | Result |
|---|---|---|---|---|
| 1 | `ev:portmanto` | GİRİŞ | `Portmanto` | Toast: `Askıda bej bir hırka. Nermin'in. Cebinde katlanmış bir otobüs bileti: KARŞIYAKA — ÇAMLIK, 14.05.1999. Bir yıl sonra oraya tek başına gitmiş.` |
| 2 | `ev:telesekreter` | GİRİŞ | `Telesekreter (2 mesaj)` | (1) `beep`, then subtitle label `TELESEKRETER · 14.05.98 · 21.30` and voice `ev_tel1`. (2) `beep`, then label `TELESEKRETER · 15.05.98 · 03.12`, tape hiss and `ev_tel2`. (3) `beep` and toast `İkinci mesaj, Beste'nin kaybolduğu günün gecesi bırakılmış.` Afterwards the label is `Telesekreter`; replays are allowed. |
| 3 | `ev:dolap` | HOL | `Merdiven altı dolabı` | The door opens; `ev_dolap` whispers from inside (positional). Toast: `Dolabın içi yanık kokuyor. Erimiş, kararmış kasetler. Hepsinin etiketi aynı: 'Beste 1 — Tanışalım'. En üstteki hâlâ ılık.` On closing, two soft knocks from inside. |
| 4 | `ev:fotograf` | SALON | `Çerçeveli fotoğraf` | Doc `fotograf` |
| 5 | `ev:takvim` | MUTFAK | `Takvim` | Toast: `Mayıs 1998'de kalmış bir takvim. 14'ün kutusuna 'ÇAMLIK DIŞ ÇEKİM 09.00' yazılmış. Sonraki bütün günlere küçük harflerle aynı soru yazılmış: 'bulundu mu?'` |
| 6 | `ev:buzdolabi` | MUTFAK | `Buzdolabındaki resim` | Toast: `Mıknatısla tutturulmuş bir çocuk resmi: el ele bir kadın ve sarı elbiseli bir kız. Altında: NERMİN ABLAMA. Kenara sonradan, kurşun kalemle, çok uzun, gri bir adam eklenmiş. Çizgiler çocuk eli değil.` |
| 7 | `ev:cekmece` | MUTFAK | `Çekmece` | Toast `Çekmecede mumlar, kibrit, faturalar. Altında Yıldız Çocuk Yapım antetli bir zarf.`, then doc `riza` |
| 8 | `ev:ecza` | BANYO | `Ecza dolabı` | Toast (8 s): `Ecza dolabında bir kutu uyku hapı ve bir reçete. Arkasına Nermin not almış: 'Doktor sesleri benim uydurduğumu söylüyor. Sayıları da ben sayıyormuşum. Ama sekizden sonrasını ben saymıyorum.'` The mirror door closes when the toast ends, and S4 can follow. |
| 9 | `ev:defter` | MONTAJ | `Kurgu defteri` | Doc `defter`. Sets `deskRead`. S5 can follow. |
| 10 | `ev:klasor` | MONTAJ | `Klasör` | Doc `kamil` |

### 7.2 Puzzle objects

| Id | Label | Result |
|---|---|---|
| `ev:cam` | `Yaşlı çam` | `Yaşlı bir çam. Kabuğuna taze bir yazı kazınmış: 14.05. Reçine hâlâ akıyor. Köklerin arasında paslı bir kutu var.` After the tin, the last sentence is dropped. |
| `ev:teneke` | `<b>Paslı kutu</b>` | `paper` sfx, then doc `teneke`. Sets `tinOpen`. S6 arms when the reader closes. |
| `ev:arsiv:A1…D6` | spine text | §5 |

### 7.3 Flavour interactables

| Id | Label | Toast |
|---|---|---|
| `ev:saat` | `Duvar saati` | `Duvar saati 13.59'da durmuş. Ama tik tak sesi hâlâ geliyor.` |
| `ev:diskapi` | `Dış kapı (kilitli)` | `Dış kapı kilitli. Kilidin içinde kırık bir anahtar ucu var. Bu kapıdan uzun zamandır kimse çıkmamış.` |
| `ev:dugme` | `Işık düğmesi` | `Düğmeye bastın. Hiçbir şey olmadı. Aşağı katta elektrik yok.` (`click`) |
| `ev:nermin` | `Nermin'in odası (kilitli)`; after one try `<b>Anahtar deliğinden bak</b>`; after S8 `Nermin'in odası (kilitli)` | First: `Nermin'in odası. Kilitli.` (or the A2 variant). After S8: `Nermin'in odası. Kilitli. İçeride artık ses yok.` |
| `ev:salontv` | `Televizyon` | Before S3: `Eski, ahşap kasalı bir televizyon. Kapalı, ama ekranından ince bir vınlama geliyor.` After: `Televizyonun fişi prizden çekilmiş. Kablonun ucu kesik.` |
| `ev:monitor` | `Monitörler` | Before S7: `Üç monitör, iki video kaydedici. Fişleri takılı ama hiçbiri açılmıyor.` After: `Monitörler kapalı. Camları hâlâ sıcak.` |
| `ev:pano` | `Mantar pano` | `Mantar panoda 1. bölümün hikâye taslağı. Son karede Beste kameraya el sallıyor. Biri karenin arkasına kurşun kalemle uzun bir gölge çizmiş.` |
| `ev:perde` | `Duş perdesi` | `Perdeyi araladın. Küvetin içinde sarı, lastik bir ördek. Kupkuru.` |
| `ev:salincak` | `Salıncak` | `Eski bir salıncak. Oturağına çakıyla BESTE yazılmış. Rüzgâr yok ama hafifçe sallanıyor.` |
| `ev:bahcekapisi` | `Bahçe kapısı (zincirli)` | `Bahçe kapısı paslı bir zincirle kilitli. Ötesi çam ormanı. Sis, ağaçların arasından bahçeye doğru akıyor.` |
| `ev:yagmurluk` | `Sarı yağmurluk` | `Askıda sarı bir çocuk yağmurluğu. Cebinde kuru çam iğneleri.` |
| `ev:kapi:montaj`, `ev:kapi:banyo` | `Kapıyı aç` / `Kapıyı kapat` | Toggle: 0.9 s tween, `creak` / `latch`, collision updated |
| `ev:kapi:arka` | `Arka kapı` → `Kapıyı aç` / `Kapıyı kapat` | First opening toast: `Arka kapı gıcırdayarak açıldı. Dışarıda sis, ıslak toprak ve çam kokusu.` |
| `plush` (when `plushDown`) | `Tonton peluşu` | `Tonton. Merdivenden kendi kendine yuvarlandı. Tek düğme gözü sana bakıyor.` This overrides the main.js plush toast while `plushDown && stage < 10`. |

### 7.4 New docs (`ui.js` DOCS, existing classes, plain HTML)

```js
defter: { cls: 'letter', html: `<p class="doc-kind">Kurgu defteri · N.</p>
<p><b>21.05.98</b> — Bölüm 3 için ses yok. Rıza: "Eskilerden kes, yapıştır." Beste'nin kelimelerinden yeni cümleler kurdum. Hiçbirini o söylemedi.</p>
<p><b>02.06.98</b> — Gece montajda yalnızdım. Monitörde Beste, benim kurmadığım bir cümle söyledi: "Nermin abla, sıra sende." Geri sardım. O kare bantta yok.</p>
<p><b>19.06.98</b> — Rıza bütün kasetleri istiyor. Vermeyeceğim.</p>
<p><b>03.02.99</b> — Bugün sekiz yaşına girecekti. Hediyesini tavan arasına kaldırdım.</p>
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
```

### 7.5 New voice lines

Put them in `src/data/lines/ev.json`, and extend `tools/merge_lines.py` to accept the regex `k(\d+)|ev`. The integrator generates the voices.

```json
{
  "_info": "Ev (serbest yürüyüş) replikleri.",
  "ev_tel1": { "v": "riza", "t": "Nermin Hanım, ben Rıza. Jandarmayla konuşmayın. Yarın sabah kasetleri bana getirin.", "w": "TELESEKRETER" },
  "ev_tel2": { "v": "beste_kiz", "t": "Nermin abla? Neredesin? Ben saklandım ama kimse gelmedi.", "w": "TELESEKRETER" },
  "ev_dolap": { "v": "beste_whisper", "t": "Burası dolu. Başka yere saklan.", "w": "???" }
}
```

- `ev_tel1` uses the riza talkback band-pass if `audio` exposes it (Tape 9 work); otherwise plain.
- Reused lines: `t1_count` (R1), `n_count_end` (seal), and `k8_ebe_sobe` (S7, only if present).

---

## 8. Objectives and hint timers

`house.objective9()` is used while Tape 9 is the tape being sought and `fbOpen` is set.

| Step | Condition | Objective | Hints (timer resets on step change; counts only while playing and no panel is open) |
|---|---|---|---|
| `anahtar` | falseBottom, !fbOpen | `Oyuncak sandığına bak.` (existing) | Existing lock hints |
| `kapi` | fbOpen, !walk | `Tavan arası kapısını anahtarla aç.` | 25 s: `Anahtarın etiketinde ALT KAT yazıyor. Arkandaki kapı.` |
| `montaj` | walk, !deskRead | `Aşağı in. Nermin'in montaj odasını bul.` | 20 s if the player has never stood up: show `#walk-hint` again. 90 s: `Nermin kurgucuydu. Montaj odası aşağıda olmalı.` 180 s: `Merdivenden in, koridor boyunca mutfağa doğru yürü. Montaj odası solda.` |
| `bahce` | deskRead, !tinOpen | `Ham kaydın yerini ağaç biliyor. Bahçeye çık.` | 60 s: `Mutfağın arka kapısı bahçeye açılıyor.` 150 s: `Bahçedeki yaşlı çamın dibine bak.` |
| `raf` | tinOpen, !has(9) | `Montaj odasındaki arşiv rafında doğru kaseti bul.` (shown even if `deskRead` is false) | 90 s: `Raftaki etiketler tarih. Nermin hangi günden söz ediyordu?` 180 s: `Tavan arasındaki hediye kutusundaki mektubun tarihi: 3 Şubat 1999.` Plus the wrong-pick ladder in §5. |
| `don` | has(9), !atticSealed | `Kaseti tavan arasına götür.` (via main.objectiveText) | 60 s: `Kaseti oynatabileceğin tek yer tavan arası.` |

The steps are independent of order: the tin can be opened before the desk is read.

---

## 9. Ambience and lighting per zone

**Light inventory.** Lights are never added, removed or hidden after boot; that would recompile every shader. Only intensity, colour and position change.

- Two new lights, created in `House`'s constructor at boot with intensity 0:
  - `flashlight` (SpotLight on the camera);
  - `zoneLight`, a PointLight (0x5d74b8, distance 6, decay 2) that is moved to each zone's main window and recoloured for scares.
- Existing lights:
  - `bulb` intensity × `room.bulbZone`;
  - `moon` × factor;
  - `hemi` × factor;
  - fog colour and density per zone.
- After building, call `renderer.compileAsync(scene, camera)` once to prewarm the shaders.

| Zone | bulbZone | moon | hemi | Fog (colour, density) | zoneLight (position, intensity) | Ambient sound |
|---|---|---|---|---|---|---|
| cati | 1 | 0.5 (existing) | 0.35 | 0x040405, 0.045 | off | Existing (wind at the window, bulb buzz) |
| sahanlik | 1 | 0.35 | 0.25 | 0x040405, 0.05 | skylight (-1.2, 1.9, 3.2), 0.25 | Draught from below (band-passed noise at the stair foot, 0.02); stair creaks |
| merdiven | lerp 1 → 0 as feet y goes 0 → -1.4 | 0.2 | 0.15 | 0x030304, 0.06 | off | Stair creaks; attic wind fades |
| giris / hol | 0 | 0.08 | 0.10 | 0x030304, 0.06 | kitchen window glow (0.9, -1.3, -2.6), 0.5 | Wall-clock tick (1 Hz, positional, gain 0.05); far fridge hum; `drone` 0.04 |
| salon | 0 | 0.08 | 0.10 | 0x030304, 0.06 | salon window (-4.3, -1.4, 6.0), 0.55 | CRT whine before S3 (≈7.8 kHz sine, 0.004, positional at the TV); clock muffled |
| montaj | 0 | 0.06 | 0.08 | 0x030304, 0.065 | window slit (-4.4, -1.6, 1.8), 0.3 | `deckHum` 0.02 (after S7: 0); faint monitor fan noise |
| mutfak | 0 | 0.1 | 0.12 | 0x030304, 0.06 | kitchen window (0.95, -1.3, -2.9), 0.6 | Fridge hum (60 Hz + harmonics, positional); tap drip every 1.7 s at the sink; crickets low-passed at 700 Hz, gain 0.3 (×2 if the back door is open) |
| banyo | 0 | 0.06 | 0.08 | 0x030304, 0.06 | frosted window (2.1, -1.0, 9.0), 0.35 | Drip in the tub (every 2.3 s); occasional pipe knock (every 25–40 s) |
| bahce | 0 | 0.65 | 0.25 | 0x0b0f18, 0.085 | off (moon) | Crickets (new loop, full band); wind in the pines (existing wind source, re-positioned, 0.06); swing creak; one distant dog bark on the first visit; attic `Ambience.setWind(0.01)` while outside |

- Garden sounds start lazily the first time the back door opens. The loops live in a new `HouseAmbience` in `audio.js`; `walk` calls `setZone(zone)` with 1 s gain ramps.
- **Visibility chunks:**
  - `ust` (landing + stairs);
  - `zemin` (all ground rooms, cupboard and mirror shell);
  - `bahce` (garden, exterior, forest, sky).
- **The existing attic meshes:** take a snapshot of `room.scene.children` before the house is built, excluding lights, the plush and the window group.

| Zone | Visible | Attic meshes |
|---|---|---|
| cati | `ust` only if the door is open | shown |
| sahanlik / merdiven | `ust` + `zemin` | shown |
| ground rooms | `ust` + `zemin` (+ `bahce` in mutfak) | hidden |
| bahce | `bahce` + `zemin` | hidden, except the roof slopes, the front gable, the window group and the lit-window plane |

- The mirror shell is shown only in `banyo`, and `room.sky` is hidden in `bahce`.
- House meshes are created with `castShadow = receiveShadow = false`. Do not use `room.box()`, which turns shadows on; `house.js` has its own `box()`.

---

## 10. State flags (`st.room`, all optional; absent = false)

| Flag | Set by | Meaning |
|---|---|---|
| `falseBottom`, `fbOpen` | existing / §4.1 | `fbOpen` now means the key, flashlight and docs were taken |
| `walk` | attic door unlock | WASD allowed (also the "door unlocked" flag) |
| `doorOpen` | attic door toggles | Attic door rotation is 1.0 (otherwise 0) |
| `doors` | house door toggles | `{ montaj, banyo, arka, dolap }` booleans. The default `{montaj: true, banyo: true, arka: false, dolap: false}` is applied when `walk` is first set. |
| `plushDown` | S1 | The plush sits at the stair foot |
| `scares` | scares.js | Array of fired ids: `tonton adam tv ayna kapi cit monitor delik ust kutu pencere` |
| `seen` | house.interact | Array of examined `ev:*` ids (for bold labels and hints) |
| `deskRead` | `ev:defter` | Edit log read |
| `tinOpen` | `ev:teneke` | Clue read; the rack becomes live |
| `atticSealed` | seal (§4.5) | Attic door closed and locked again for good |

- Tape 9 itself is `st.tapes.includes(9)`.
- Never saved: position, level, zone, stamina, flashlight state, R1 progress.
- `house.apply(st)` sets the door angles, the plush position, the empty C4 box, the TV and monitors off, and the swing. It is called from the end of `room.applyStage()` and from `enterGame()`.

---

## 11. Module and file plan

### New files

- `src/house.js`, `export class House`
  - `constructor(game)` builds the chunks into `room.scene` lazily via `ensureBuilt()`:
    - called from `enterGame` when `stage >= 8 || st.room.fbOpen`, otherwise at `fbOpen`;
    - the two lights are created eagerly.
  - Other members:
    - `apply(st)`
    - `setZone(z)`
    - `update(dt, clock)`: doors, swing, billboards, active screen canvases only
    - `label(id)` / `interact(id)`: `ev:*` and `door` when `fbOpen`
    - `objective9()`
    - `colliders(level)`
    - `floorY(level, x, z)`
    - `zoneAt(level, x, z)`
    - `extraInteractables(zone)`
    - debug `debugRun9()`: runs desk, tin, C4 and seal through the same code paths, without walking, for `fullrun.js`
  - About 900 lines.
- `src/walk.js`, `export class Walk`
  - `onKeyDown(e)` / `onKeyUp(e)` (return true if consumed), `clearKeys()`, `canMove()`
  - `standUp()`, `sitDown()` (both return Promises)
  - `update(dt)`: movement, collision, floor, camera via `room.walkCam`, bob, footsteps, flashlight, zone → `house.setZone` and `audio.houseAmbience.setZone`, hint timers
  - `flicker(pattern)`, `shake(a, s)`, `resetSeated()`
  - Debug: `teleport(x, y, z, yaw, pitch)` (stands up and sets the level), `info()`
  - Also exposes `standing`, `pos`, `level`, `zone`, `light`.
  - About 450 lines.
- `src/scares.js`, `export class Scares`
  - `update(dt)` (trigger checks), `fire(id)`, `seen(target, deg, dist)`, `cancelAll()`
  - S1–S8, A1–A4, R1 and `seal()`
  - `inputLock` (true only during the S6 lunge, 0.62 s)
  - Honours `g.debug.noScares`
  - About 450 lines.
- `src/data/lines/ev.json` (3 lines).
- `vendor/three/addons/utils/BufferGeometryUtils.js` (three 0.180.0, unchanged).

### Edits to existing files (keep each diff local)

- **`main.js`**
  - Import and construct `house`, `walk` and `scares` in `boot()` after `Room`.
  - `onKey`: after the `d.input` block, `if (this.walk.onKeyDown(e)) return;`
  - keyup → `walk.onKeyUp`; blur, `pause()` and `quitToTitle()` → `walk.clearKeys()`, and `scares.cancelAll()` on quit.
  - `update()` order: `walk.update` → `room.update` → `house.update` → `scares.update`.
  - Routing in `label()` and `interact()`; sit down before `vcr`, `tv` and `tapestack`; F rule (§3); `objectiveText` hook.
  - `enterGame()`: `walk.resetSeated()`, `house.ensureBuilt()` / `apply()`, the silent seal (§4.5), the migration.
  - `playTape()` safety `sitDown()`.
  - `panelOpen()` adds `keyhole`.
- **`room.js`**
  - `walkCam` override in `update()`; standing pitch clamp in `look()`.
  - `raycaster.far = this.reach` (3.6 seated, 2.0 standing).
  - `extraInteractables` concatenated into the hover raycast.
  - `this.corridor = corr`; `points.stairs = (-1.2, -1.6, 6.0)`.
  - `bulbZone` factor on the bulb intensity and emissive.
  - `this.g.house?.apply(st)` at the end of `applyStage()`.
- **`finds.js`**: §4.1 (false-bottom branch, label, objective, ritual footsteps).
- **`attic.js`**: §4.2 (key and flashlight meshes, note text, `apply`).
- **`ui.js`**: five DOCS, the memo sentence, `flash(ms)`, `walkHint(on, sec)`, and the keyhole overlay helper `keyhole()` (returns a Promise and draws on its own canvas).
- **`audio.js`**
  - New SFX:
    - `step(t, pos, surface, run)`
    - `doorSlam(t, pos)`
    - `latch(t, pos)`
    - `keyTurn(t, pos)`
    - `squeak(t, pos)`
    - `staticAt(t, pos, dur, gain)`
    - `drip(t, pos)`
    - `swingCreak(t, pos)`
    - `musicBox(t, pos)`
    - `pipeKnock(t, pos)`
  - Optional `pos` for `deckClunk`.
  - `HouseAmbience` class: clock, fridge, crickets, pine wind, draught, monitor fan; `setZone(z)` and `setOutdoor(open)`.
- **`textures.js`**: `tiles()`, `plaster()`, `grass()`, `bark()`, `greyMan({ arms })` (tall faceless billboard on a transparent canvas), `besteGhost()` (pale cartoon head and shoulders, hollow eyes, transparent background).
- **`index.html`**: `#walk-hint`, `#flash`, `<section id="keyhole" class="screen" hidden><canvas id="keyhole-canvas" width="640" height="480"></canvas></section>`, and the new KONTROLLER rows.
- **`style.css`**: `#walk-hint` (as `#vcr-hint`), `#flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 40 }`, and `#keyhole` (a black screen with the canvas centred).
- **`tools/merge_lines.py`**: accept `ev.json`.

**Performance budget** (check with `renderer.info`):
- ≤ 180 draw calls and ≤ 150k triangles in any view of the house;
- `renderer.info.programs.length` must not grow after the first walk through every zone;
- screen canvases redraw only while their scare is active, at most 30 Hz.

---

## 12. Test plan

The scripts live in the scratchpad `pw/` folder. Run one browser at a time. Logic tests use `g.debug = { noRender: true }`; tests that are not about scares also use `noScares: true`.

**`walktest.js`** (logic):

1. Stage 8, room `{furnitureMoved, chestOpen, falseBottom}`. Interact `chest` and type `EBE`.
   - Expect `fbOpen`; Tape 9 not owned.
   - The reader shows `memo`, then `ifade` (close both).
   - Objective `Tavan arası kapısını anahtarla aç.`; `attic.chestKey.visible === false`.
2. `label('door') === '<b>Kapıyı anahtarla aç</b>'`; interact.
   - `st.room.walk === true`.
   - After 3 s, `doorPivot.rotation.y ≈ π/2`.
   - `#walk-hint` is visible; objective `Aşağı in. Nermin'in montaj odasını bul.`
3. Gating: `playTape(1)` → hold `KeyW` for 1 s → `walk.standing === false` and the camera is at SEAT. Abort the tape. Also: open the keypad (metal box) → `KeyW` does nothing.
4. Stand and walk: hold `KeyW` for 0.8 s → standing, camera y ≈ 1.6. Shift+W for 4 s → speed drops after about 2.5 s.
5. Collision:
   - teleport (0, 0, -0.9) facing −z, hold W 2 s → z ≥ -1.28;
   - teleport (-1.2, 0, 1.6) facing +z, hold W → passes the door, y follows stairY, ends at YG with `level === 'zemin'`;
   - walk into each house wall → never crosses it.
6. Scares (`noScares` off; run once with `settings.flash = false` and once with `true`):
   - teleport and aim to satisfy each trigger; check `st.room.scares` gets each id exactly once and the order of the cooldown;
   - with `flash = true`, `#flash` opacity is never > 0 (sample every 20 ms);
   - after a reload, nothing re-fires.
7. Puzzle:
   - `ev:arsiv:C4` before the tin → gated toast and no wrong count;
   - `ev:defter` → `deskRead`; `ev:teneke` → `tinOpen`;
   - B1, C6, A2 → the 2nd-wrong hint toast;
   - C4 → Tape 9 owned; S7 fires; objective `Kaseti tavan arasına götür.`; R1 voice `t1_count` started (spy on `audio.playRoomVoice`).
8. Seal:
   - teleport inside the attic (0, 0, 1.0) → `atticSealed`, door → 0 within 0.3 s, `n_count_end` played, `label('door') === 'Kapı (kilitli)'`;
   - hold W toward the door → feet z ≤ 2.4;
   - walking inside the attic still works.
9. VCR while standing: teleport (0, 0, -0.9) and interact `vcr` → after ≤ 1 s `walk.standing === false`, `focusTarget === 1`, chooser open.
10. Save/load:
    - reload and continue → seated, flags kept;
    - save with Tape 9 owned and not sealed → load → sealed silently;
    - an old save `{fbOpen, tapes: […9]}` with no `walk` → migrated.
11. Pause and blur: hold W, press Esc → paused and no drift; blur clears keys; after resume no stuck movement.
12. Ritual: stage 9 sealed, pull the chain → spy shows the `footCreak` positions on the stair line (z 6.0 → 3.6); the door tape appears.

**`house-shots.js`** (render, about 5 s per shot; look at each one):
- a) attic, door open, from SEAT (yaw 2.58, pitch -0.2);
- b) landing looking down the stairs;
- c) entrance down the hall with the grey man placed;
- d) salon TV showing the face frame;
- e) bathroom mirror with the ghost;
- f) montaj desk and rack;
- g) garden: pine, house back wall and lit attic window;
- h) **the finale door**: stage 9 sealed, `doorGlow(1)`, `showGirl(true)`, `openDoor(0.45)`, from SEAT. Compare with `door-final.png`: the girl stands on the landing, the blue-lit stairwell is behind her, and no corridor box is visible.

Log `renderer.info.render.calls` and `triangles` for each shot.

**Regression:**
- Update `chain.js` step 8→9: expect the key, then call `g.house.debugRun9()`.
- `fullrun.js` uses `debugRun9()` at stage 8.
- `ctrltest.js` gains: Esc relock while standing, and no WASD while any panel is open.
- `tapetest.js` 9 and 10 must be unchanged.
- `electron-test.js` smoke: unlock, W for 1 s, no page errors.

---

## 13. Risks and notes

- **Light through walls:** house meshes neither cast nor receive shadows.
  - The attic bulb is silenced downstairs by `bulbZone`.
  - The moon is scaled down indoors.
  - The flashlight can light a surface behind a wall only where that surface is hidden by depth anyway.
- **Same XZ, two levels:** the ground rooms lie under the attic. Collision, zone and floor are always looked up by `level`, never by XZ alone.
- **The finale is unchanged** because tapes always play seated, and the door is sealed and closed before Tape 10.
- **Order of edits:** another agent is editing the fast-forward / rewind code in `director.js`, `tv.js` and `audio.js` at the same time. The house work touches `audio.js` only by appending to `SFX` and adding the new class at the end. Re-read before editing.

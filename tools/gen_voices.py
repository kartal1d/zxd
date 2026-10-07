#!/usr/bin/env python3
"""
Beste'nin Sihirli Dunyasi - seslendirme ureticisi.

src/data/lines.json icindeki her replik icin:
  1. Piper (sherpa-onnx) Turkce sesle konusmayi sentezler (tamamen cevrimdisi),
  2. WORLD vokoderi (pyworld) ile perde / formant / tonlama / fisilti islemesi yapar,
  3. ffmpeg ile assets/audio/voice/<id>.mp3 olarak kaydeder.

Kurulum:
  bash tools/fetch_models.sh            # Turkce Piper seslerini indirir
  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
  .venv/bin/python tools/gen_voices.py  # degisen replikleri uretir (--all: hepsi)
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pyworld as pw
import sherpa_onnx
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINES = os.path.join(ROOT, "src", "data", "lines.json")
OUT = os.path.join(ROOT, "assets", "audio", "voice")
MANIFEST = os.path.join(OUT, "manifest.json")
MODELS = os.environ.get("TTS_MODELS", os.path.join(ROOT, "tools", ".models"))

# Ses stilleri. Sadece CC0 lisansli modeller kullanilir (fettah, fahrettin), oyun ticari olarak da dagitilabilir.
#   model:   Piper modeli (fettah = en tiz erkek ses, karikatur cocuk sesine en uygun taban)
#   speed:   konusma hizi
#   f0:      perde carpani
#   contour: tonlama genisligi (1 = dogal, <1 = monoton / donuk, >1 = abartili cizgi film)
#   formant: formant kaydirma (>1 = daha kucuk ses yolu, cocuksu)
#   whisper: 0..1 fisilti orani
#   vibrato: (hz, derinlik) titreme
#   octave:  bir oktav asagidaki kopyanin karisim orani (dijital / seytani cift ses)
STYLES = {
    "beste":         dict(model="fettah",    speed=1.00, f0=1.50, contour=1.35, formant=1.16),
    "beste_cold":    dict(model="fettah",    speed=0.86, f0=1.45, contour=0.30, formant=1.16),
    "beste_deep":    dict(model="fettah",    speed=0.82, f0=0.50, contour=0.50, formant=0.86, whisper=0.18),
    "beste_digital": dict(model="fettah",    speed=0.88, f0=1.35, contour=0.00, formant=1.12, octave=0.45),
    "beste_whisper": dict(model="fettah",    speed=0.80, f0=1.45, contour=0.80, formant=1.16, whisper=1.0),
    "beste_real":    dict(model="fettah",    speed=0.88, f0=1.55, contour=0.90, formant=1.20, whisper=0.45, vibrato=(5.5, 0.02)),
    "tonton":        dict(model="fahrettin", speed=1.05, f0=1.85, contour=1.40, formant=1.28),
    "tonton_sad":    dict(model="fahrettin", speed=0.85, f0=1.80, contour=1.10, formant=1.28, whisper=0.2, vibrato=(6.5, 0.035)),
    "narrator":      dict(model="fettah",    speed=0.92, f0=0.72, contour=1.10, formant=0.92),
    "narrator_slow": dict(model="fettah",    speed=0.74, f0=0.58, contour=0.60, formant=0.90),
    # 3-10. kasetler: Nermin hala (kurgucu), yapımcı Rıza Bey, 1998'deki gerçek, yaşayan Beste
    "nermin":        dict(model="fettah",    speed=0.92, f0=1.32, contour=0.80, formant=1.09, whisper=0.12),
    "riza":          dict(model="fahrettin", speed=1.00, f0=0.86, contour=0.55, formant=0.93),
    "beste_kiz":     dict(model="fettah",    speed=0.98, f0=1.58, contour=1.00, formant=1.22, whisper=0.06, vibrato=(5.0, 0.01)),
}

# Ileri yonde ters calinan (geri sarinca anlasilan) replikler.
REVERSED = {"b2_real", "k3_ters", "k4_ters", "k6_ters", "k7_ters", "k8_ters", "k9_ters", "k10_ters"}

_tts_cache = {}


def get_tts(name):
    if name not in _tts_cache:
        d = os.path.join(MODELS, f"vits-piper-tr_TR-{name}-medium")
        onnx = os.path.join(d, f"tr_TR-{name}-medium.onnx")
        if not os.path.exists(onnx):
            sys.exit(f"Model bulunamadi: {onnx}\nOnce: bash tools/fetch_models.sh")
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                    model=onnx,
                    tokens=os.path.join(d, "tokens.txt"),
                    data_dir=os.path.join(d, "espeak-ng-data"),
                ),
                num_threads=max(1, os.cpu_count() or 1),
            ),
        )
        _tts_cache[name] = sherpa_onnx.OfflineTts(cfg)
    return _tts_cache[name]


def warp_envelope(sp, alpha):
    """Spektral zarfi frekans ekseninde alpha kadar esnetir (formant kaydirma)."""
    if abs(alpha - 1.0) < 1e-3:
        return sp
    n = sp.shape[1]
    src = np.clip(np.arange(n) / alpha, 0, n - 1)
    lo = np.floor(src).astype(int)
    hi = np.minimum(lo + 1, n - 1)
    w = src - lo
    return np.ascontiguousarray(sp[:, lo] * (1 - w) + sp[:, hi] * w)


def rms(y):
    return float(np.sqrt(np.mean(y ** 2)) + 1e-9)


def process(x, fs, st):
    x = x.astype(np.float64)
    fp = 5.0
    f0, t = pw.harvest(x, fs, frame_period=fp, f0_floor=60, f0_ceil=500)
    sp = pw.cheaptrick(x, f0, t, fs)
    ap = pw.d4c(x, f0, t, fs)
    sp = warp_envelope(sp, st.get("formant", 1.0))

    voiced = f0 > 0
    med = float(np.median(f0[voiced])) if voiced.any() else 150.0
    lf = np.log(np.where(voiced, f0, med))
    lm = np.log(med)
    nf = np.exp(lm + (lf - lm) * st.get("contour", 1.0)) * st.get("f0", 1.0)
    if "vibrato" in st:
        rate, depth = st["vibrato"]
        jitter = np.cumsum(np.random.default_rng(7).normal(0, 0.02, len(t)))
        nf *= 1 + depth * np.sin(2 * np.pi * rate * t + jitter)
    nf = np.where(voiced, nf, 0.0)

    whisper = st.get("whisper", 0.0)
    y = pw.synthesize(nf, sp, ap, fs, fp) if whisper < 1 else None
    if whisper > 0:
        # f0 = 0 ile sentez: titresimsiz (fisilti) uyarim, ayni zarf
        yw = pw.synthesize(np.zeros_like(nf), sp, ap, fs, fp)
        if y is None:
            y = yw
        else:
            yw *= rms(y) / rms(yw)
            y = (1 - whisper) * y + whisper * yw
    if st.get("octave"):
        yo = pw.synthesize(nf * 0.5, sp, ap, fs, fp)
        n = min(len(y), len(yo))
        y = y[:n] + st["octave"] * yo[:n]
    return y


def finish(y, fs):
    y = y - np.mean(y)
    y *= 10 ** (-18 / 20) / rms(y)           # ~-18 dBFS RMS
    peak = np.max(np.abs(y))
    if peak > 0.95:                           # yumusak sinirlayici
        y = np.tanh(y / peak * 1.5) / np.tanh(1.5) * 0.95
    pad = np.zeros(int(0.06 * fs))
    fade = int(0.012 * fs)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    return np.concatenate([pad, y, pad]).astype(np.float32)


def to_mp3(y, fs, path):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, y, fs)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
             "-ac", "1", "-ar", "22050", "-b:a", "56k", path],
            check=True,
        )
    os.unlink(tmp.name)


def line_hash(line):
    st = STYLES[line["v"]]
    blob = json.dumps([line["t"], st, line.get("v")], sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(blob.encode()).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="hepsini yeniden uret")
    ap.add_argument("ids", nargs="*", help="sadece bu replikler")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    lines = {k: v for k, v in json.load(open(LINES, encoding="utf-8")).items() if not k.startswith("_")}
    try:
        manifest = json.load(open(MANIFEST, encoding="utf-8"))
    except FileNotFoundError:
        manifest = {}

    todo = args.ids or list(lines)
    for i, lid in enumerate(todo):
        line = lines[lid]
        h = line_hash(line)
        out = os.path.join(OUT, f"{lid}.mp3")
        if not args.all and not args.ids and manifest.get(lid, {}).get("hash") == h and os.path.exists(out):
            continue
        st = STYLES[line["v"]]
        tts = get_tts(st["model"])
        audio = tts.generate(line["t"], sid=0, speed=st["speed"])
        fs = audio.sample_rate
        y = finish(process(np.array(audio.samples), fs, st), fs)
        to_mp3(y, fs, out)
        entry = {"hash": h, "dur": round(len(y) / fs, 3)}
        if lid in REVERSED:
            to_mp3(y[::-1].copy(), fs, os.path.join(OUT, f"{lid}_rev.mp3"))
            entry["rev"] = True
        manifest[lid] = entry
        print(f"[{i + 1}/{len(todo)}] {lid:22s} {entry['dur']:5.2f}s  ({line['v']})", flush=True)

    for lid in list(manifest):
        if lid not in lines:
            del manifest[lid]
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1, sort_keys=True)
    print("tamam:", len(manifest), "replik")
    # yayın paketi (assets/audio/pack) güncel kalsın
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "pack_voices.py")], check=False)


if __name__ == "__main__":
    main()

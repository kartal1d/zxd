#!/usr/bin/env python3
"""Seslendirme mp3'lerini birkaç paket dosyasında toplar (assets/audio/pack/).

Yayın ortamlarında yüzlerce küçük dosya yerine birkaç büyük dosya indirilir.
audio.js önce pack.json'a bakar; yoksa tek tek mp3'leri yükler.

    python3 tools/pack_voices.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.path.join(ROOT, "assets", "audio", "voice")
OUT = os.path.join(ROOT, "assets", "audio", "pack")
LIMIT = 4_000_000  # paket başına yaklaşık bayt

manifest = json.load(open(os.path.join(VOICE, "manifest.json"), encoding="utf-8"))
ids = []
for vid, m in manifest.items():
    ids.append(vid)
    if m.get("rev"):
        ids.append(vid + "_rev")

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
files, items, cur, n = [], {}, bytearray(), 0


def flush():
    global cur, n
    if not cur:
        return
    name = f"voice-{n}.mp3"
    open(os.path.join(OUT, name), "wb").write(cur)
    files.append(name)
    cur = bytearray()
    n += 1


for vid in ids:
    p = os.path.join(VOICE, vid + ".mp3")
    if not os.path.exists(p):
        continue
    data = open(p, "rb").read()
    if cur and len(cur) + len(data) > LIMIT:
        flush()
    items[vid] = [len(files), len(cur), len(data)]
    cur += data
flush()
json.dump({"files": files, "items": items}, open(os.path.join(OUT, "pack.json"), "w"), separators=(",", ":"))
print(f"{len(items)} ses, {len(files)} paket")

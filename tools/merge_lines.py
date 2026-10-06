#!/usr/bin/env python3
"""Kaset başına yazılmış replik parçalarını (src/data/lines/kN.json) ana dosyaya katar.

Ana dosyanın düzeni korunur: her replik tek satır, kasetler arasında boş satır.
Ana dosyada zaten olan bir anahtar parçada da varsa satırı yerinde güncellenir.

    python3 tools/merge_lines.py            # bütün parçalar
    python3 tools/merge_lines.py 3 4        # sadece k3 ve k4
"""
import json
import os
import re
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN = os.path.join(ROOT, "src", "data", "lines.json")
FRAG = os.path.join(ROOT, "src", "data", "lines")


def one_line(key, val):
    body = ", ".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in val.items())
    return f'  "{key}": {{ {body} }}'


def main():
    nums = sys.argv[1:] or sorted((m.group(1) for f in os.listdir(FRAG) if (m := re.fullmatch(r"k(\d+)\.json", f))), key=int)
    text = open(MAIN, encoding="utf-8").read()
    have = json.loads(text, object_pairs_hook=OrderedDict)
    added = updated = 0
    for n in nums:
        frag = json.load(open(os.path.join(FRAG, f"k{n}.json"), encoding="utf-8"), object_pairs_hook=OrderedDict)
        new = []
        for key, val in frag.items():
            if key.startswith("_"):
                continue
            if key in have:
                if have[key] != val:
                    pat = re.compile(r'^  "' + re.escape(key) + r'": \{.*?\}(,?)$', re.M)
                    if not pat.search(text):
                        sys.exit(f"{key}: ana dosyada tek satır değil, elle düzelt")
                    text = pat.sub(lambda m: one_line(key, val) + m.group(1), text, count=1)
                    updated += 1
            else:
                new.append(one_line(key, val))
            have[key] = val
        if new:
            body = text.rstrip()
            assert body.endswith("}")
            text = body[:-1].rstrip() + ",\n\n" + ",\n".join(new) + "\n}\n"
            added += len(new)
    json.loads(text)  # bozulmadığından emin ol
    open(MAIN, "w", encoding="utf-8").write(text)
    print(f"eklendi: {added}, güncellendi: {updated}")


if __name__ == "__main__":
    main()

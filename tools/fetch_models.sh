#!/usr/bin/env bash
# Turkce Piper TTS modellerini (sherpa-onnx paketleri) tools/.models altina indirir.
set -euo pipefail
DIR="${TTS_MODELS:-$(cd "$(dirname "$0")" && pwd)/.models}"
mkdir -p "$DIR"
# Yalnizca CC0 lisansli sesler (dfki CC BY-NC-SA oldugu icin kullanilmiyor)
for v in fahrettin fettah; do
  n="vits-piper-tr_TR-$v-medium"
  if [ -d "$DIR/$n" ]; then echo "var: $n"; continue; fi
  echo "indiriliyor: $n"
  curl -fsSL "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/$n.tar.bz2" | tar xj -C "$DIR"
done

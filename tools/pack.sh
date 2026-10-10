#!/bin/sh
# Sestaví web a zabalí ho do _balicek/U-Cmelaka-ukazka.zip
set -e
cd "$(dirname "$0")/.."
node build.mjs
mkdir -p _balicek
rm -f _balicek/U-Cmelaka-ukazka.zip
cp dokumenty/PRECTI-ME.txt out/PRECTI-ME.txt
(cd out && zip -qr ../_balicek/U-Cmelaka-ukazka.zip . -x "_*")
rm out/PRECTI-ME.txt
ls -la _balicek/U-Cmelaka-ukazka.zip

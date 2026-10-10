"""Akceptační test C-007 — tools/fotky.py (zmenšené varianty fotek pro web)."""
from __future__ import annotations

import json

from PIL import Image

from tools import fotky as F


def _obr(cesta, w, h, barva=(200, 150, 40)):
    Image.new("RGB", (w, h), barva).save(cesta)


def test_sirky_variant():
    assert F.sirky_variant(3000, [640, 1280, 1920]) == [640, 1280, 1920]
    assert F.sirky_variant(1536, [640, 1280, 1920]) == [640, 1280, 1536]
    assert F.sirky_variant(1280, [640, 1280, 1920]) == [640, 1280]
    assert F.sirky_variant(500, [640, 1280]) == [500]


def test_vyrez_na_pomer():
    img = Image.new("RGB", (1536, 1024))
    assert F.vyrez_na_pomer(img, 1.0).size == (1024, 1024)
    assert F.vyrez_na_pomer(img, 16 / 9).size == (1536, 864)
    assert F.vyrez_na_pomer(img, None).size == (1536, 1024)
    assert F.vyrez_na_pomer(Image.new("RGB", (1000, 1000)), 0.8).size == (800, 1000)


def test_zpracuj_slozku(tmp_path):
    zdroj = tmp_path / "zdroj"
    zdroj.mkdir()
    _obr(zdroj / "terasa.png", 1536, 1024)
    _obr(zdroj / "pivo.png", 1024, 1024)
    (zdroj / "poznamka.txt").write_text("nic")
    cil = tmp_path / "web" / "foto"
    manifest = F.zpracuj(zdroj, cil, sirky=[640, 1280], pomery={"terasa": 16 / 9})
    assert sorted(manifest) == ["pivo", "terasa"]
    assert manifest["terasa"] == {"sirka": 1536, "vyska": 864, "varianty": [640, 1280, 1536]}
    assert manifest["pivo"] == {"sirka": 1024, "vyska": 1024, "varianty": [640, 1024]}
    for w in (640, 1280, 1536):
        for ext in ("webp", "jpg"):
            p = cil / f"terasa-{w}.{ext}"
            assert p.exists(), p
            with Image.open(p) as im:
                assert im.size == (w, round(w * 864 / 1536))
    with Image.open(cil / "pivo-1024.jpg") as im:
        assert im.size == (1024, 1024) and im.mode == "RGB"
    assert not (cil / "pivo-1280.webp").exists()
    assert json.loads((cil / "fotky.json").read_text(encoding="utf-8")) == manifest


def test_preskoci_hotove(tmp_path):
    zdroj = tmp_path / "z"
    zdroj.mkdir()
    _obr(zdroj / "a.png", 800, 600)
    cil = tmp_path / "c"
    F.zpracuj(zdroj, cil, sirky=[640])
    t = (cil / "a-640.webp").stat().st_mtime_ns
    F.zpracuj(zdroj, cil, sirky=[640])
    assert (cil / "a-640.webp").stat().st_mtime_ns == t

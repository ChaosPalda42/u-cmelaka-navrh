"""Akceptační test C-009 — src/php/fotky.php (nahraná fotka -> varianty pro web)."""
from __future__ import annotations

import hashlib
import re

from PIL import Image

from tests.phpmod import lint, php, php1

S = "fotky.php"


def _jpg(cesta, w, h, barva=(200, 150, 40), orientace=None):
    img = Image.new("RGB", (w, h), barva)
    # levá polovina červená, ať jde poznat otočení
    img.paste((255, 0, 0), (0, 0, w // 2, h))
    if orientace:
        exif = Image.Exif()
        exif[0x0112] = orientace
        img.save(cesta, quality=90, exif=exif.tobytes())
    else:
        img.save(cesta, quality=90)


def test_lint():
    lint(S)


def test_sirky():
    assert php(S, [("cm_sirky_variant", [3000, [640, 1280, 1920]]), ("cm_sirky_variant", [1536, [640, 1280, 1920]]),
                   ("cm_sirky_variant", [1280, [640, 1280, 1920]]), ("cm_sirky_variant", [500, [640, 1280]])]) == [
        [640, 1280, 1920], [640, 1280, 1536], [640, 1280], [500]]


def test_zpracuj_jpg(tmp_path):
    src = tmp_path / "IMG_0001.JPG"
    _jpg(src, 1600, 1200)
    cil = tmp_path / "web" / "foto"
    r = php1(S, "cm_zpracuj_fotku", str(src), "Detsky Koutek!", str(cil))
    verze = hashlib.sha1(src.read_bytes()).hexdigest()[:8]
    assert r == {"ok": True, "chyba": "", "jmeno": "detsky-koutek", "verze": verze, "sirka": 1600, "vyska": 1200, "varianty": [640, 1280, 1600]}
    for w in (640, 1280, 1600):
        for ext in ("webp", "jpg"):
            p = cil / f"detsky-koutek-{verze}-{w}.{ext}"
            assert p.exists(), p
            with Image.open(p) as im:
                assert im.size == (w, round(w * 1200 / 1600))
    assert sorted(p.name for p in cil.iterdir()) == sorted(f"detsky-koutek-{verze}-{w}.{e}" for w in (640, 1280, 1600) for e in ("webp", "jpg"))


def test_pomer_a_vymena_stare_verze(tmp_path):
    cil = tmp_path / "foto"
    a = tmp_path / "a.jpg"; _jpg(a, 1000, 1000, (10, 200, 10))
    b = tmp_path / "b.jpg"; _jpg(b, 2000, 1000, (10, 10, 200))
    r1 = php1(S, "cm_zpracuj_fotku", str(a), "terasa", str(cil), [640, 1280])
    (cil / "pizza-0123abcd-640.webp").write_bytes(b"x")  # cizí fotka zůstane
    r2 = php1(S, "cm_zpracuj_fotku", str(b), "terasa", str(cil), [640, 1280], 1.5)
    assert (r2["sirka"], r2["vyska"], r2["varianty"]) == (1500, 1000, [640, 1280])
    zbylo = sorted(p.name for p in cil.iterdir())
    assert not any(r1["verze"] in n for n in zbylo), "stará verze téže fotky se smaže"
    assert "pizza-0123abcd-640.webp" in zbylo
    with Image.open(cil / f"terasa-{r2['verze']}-640.jpg") as im:
        assert im.size == (640, 427)


def test_exif_otoceni(tmp_path):
    src = tmp_path / "telefon.jpg"
    _jpg(src, 800, 600, orientace=6)  # telefon na výšku: uložené 800×600, zobrazit 600×800
    r = php1(S, "cm_zpracuj_fotku", str(src), "hriste", str(tmp_path / "f"), [640])
    assert (r["sirka"], r["vyska"]) == (600, 800)
    with Image.open(tmp_path / "f" / f"hriste-{r['verze']}-600.jpg") as im:
        assert im.size == (600, 800)
        # orientace 6 = otočit o 90° po směru hodinek: levá (červená) polovina skončí nahoře
        horni = im.getpixel((300, 100)); dolni = im.getpixel((300, 700))
        assert horni[0] > 180 and dolni[0] < 230 and dolni[1] > 100


def test_png_s_pruhlednosti_na_bilou(tmp_path):
    src = tmp_path / "logo.png"
    Image.new("RGBA", (400, 300), (0, 0, 0, 0)).save(src)
    r = php1(S, "cm_zpracuj_fotku", str(src), "logo", str(tmp_path / "f"), [640])
    with Image.open(tmp_path / "f" / f"logo-{r['verze']}-400.jpg") as im:
        assert im.getpixel((10, 10))[0] > 245


def test_webp_vstup(tmp_path):
    src = tmp_path / "x.webp"
    Image.new("RGB", (700, 400), (1, 2, 3)).save(src, "WEBP")
    r = php1(S, "cm_zpracuj_fotku", str(src), "x", str(tmp_path / "f"), [640, 1280])
    assert r["ok"] is True and r["varianty"] == [640, 700]


def test_neni_fotka(tmp_path):
    src = tmp_path / "virus.jpg"
    src.write_text("<?php echo 1;", encoding="utf-8")
    r = php1(S, "cm_zpracuj_fotku", str(src), "x", str(tmp_path / "f"))
    assert r == {"ok": False, "chyba": "Tohle není fotka – nahrajte prosím JPG, PNG, WebP nebo HEIC z telefonu.", "jmeno": "x", "verze": "", "sirka": 0, "vyska": 0, "varianty": []}
    assert not (tmp_path / "f").exists() or not any((tmp_path / "f").iterdir())
    r = php1(S, "cm_zpracuj_fotku", str(tmp_path / "neni.jpg"), "x", str(tmp_path / "f"))
    assert r["ok"] is False


def test_jmeno():
    assert php(S, [("cm_jmeno_souboru", ["Dětské hřiště 2"]), ("cm_jmeno_souboru", ["../../etc/passwd"]), ("cm_jmeno_souboru", ["  "]),
                   ("cm_jmeno_souboru", ["ČMELÁK__na--LEVANDULI"])]) == ["detske-hriste-2", "etc-passwd", "foto", "cmelak-na-levanduli"]


def test_smaz(tmp_path):
    cil = tmp_path / "f"
    src = tmp_path / "a.jpg"; _jpg(src, 700, 500)
    r = php1(S, "cm_zpracuj_fotku", str(src), "akce-dyne", str(cil), [640])
    (cil / "akce-dynea-0123abcd-640.jpg").write_bytes(b"x")
    assert php1(S, "cm_smaz_fotku", "akce-dyne", str(cil)) == 4
    assert [p.name for p in cil.iterdir()] == ["akce-dynea-0123abcd-640.jpg"]

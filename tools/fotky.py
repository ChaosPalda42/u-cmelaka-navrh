"""Zmenšené varianty fotek pro web (webp + jpg) a manifest.

Zpracuje `zdroje/fotky` -> `src/assets/foto` se šířkami [640, 1280, 1920]
a poměry POMERY. Spuštění: `python -m tools.fotky`.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

POMERY: dict[str, float] = {}

PRIPUSTENE_PRIPONY = {".png", ".jpg", ".jpeg", ".webp"}


def sirky_variant(sirka: int, sirky: list[int]) -> list[int]:
    """Šířky variant pro obrázek o šířce `sirka` z požadovaných `sirky`.

    Šířky z `sirky` menší než `sirka`, vzestupně; pak navíc sama `sirka`,
    pokud v seznamu ještě není a je menší než největší požadovaná šířka
    nebo rovna některé z nich. Bez duplicit, vzestupně.
    """
    vysledky = [w for w in sirky if w < sirka]
    if sirka <= 1.5 * max(sirky):
        vysledky.append(sirka)
    return sorted(set(vysledky))


def vyrez_na_pomer(img: Image.Image, pomer: float | None) -> Image.Image:
    """Středový ořez na co největší výřez s poměrem šířka/výška = pomer.

    None -> img beze změny.
    """
    if pomer is None:
        return img
    sirka, vyska = img.size
    if sirka / vyska > pomer:
        nova_sirka = round(vyska * pomer)
        nova_vyska = vyska
    else:
        nova_sirka = sirka
        nova_vyska = round(sirka / pomer)
    x0 = (sirka - nova_sirka) // 2
    y0 = (vyska - nova_vyska) // 2
    return img.crop((x0, y0, x0 + nova_sirka, y0 + nova_vyska))


def zpracuj(zdroj, cil, sirky: list[int] = [640, 1280, 1920], pomery: dict | None = None) -> dict:
    """Zpracuje fotky ze složky `zdroj` do `cil` a vrací manifest."""
    zdroj = Path(zdroj)
    cil = Path(cil)
    cil.mkdir(parents=True, exist_ok=True)
    pomery = pomery or {}

    manifest: dict[str, dict] = {}
    for soubor in sorted(zdroj.iterdir(), key=lambda p: p.name):
        if soubor.suffix.lower() not in PRIPUSTENE_PRIPONY or not soubor.is_file():
            continue
        jmeno = soubor.stem
        with Image.open(soubor) as im:
            im = im.convert("RGB")
            im = vyrez_na_pomer(im, pomery.get(jmeno))
            sirka, vyska = im.size
            varianty = sirky_variant(sirka, sirky)
            for w in varianty:
                cil_sirka, cil_vyska = w, round(w * vyska / sirka)
                zmensene = im.resize((cil_sirka, cil_vyska), Image.LANCZOS)
                for ext, kwargs in (
                    ("webp", {"quality": 80}),
                    ("jpg", {"quality": 82, "progressive": True}),
                ):
                    cil_soubor = cil / f"{jmeno}-{w}.{ext}"
                    if cil_soubor.exists() and cil_soubor.stat().st_mtime_ns >= soubor.stat().st_mtime_ns:
                        continue
                    zmensene.save(cil_soubor, **kwargs)
        manifest[jmeno] = {"sirka": sirka, "vyska": vyska, "varianty": varianty}

    with open(cil / "fotky.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    return manifest


def main() -> None:
    zpracuj(Path("zdroje/fotky"), Path("src/assets/foto"), sirky=[640, 1280, 1920], pomery=POMERY)


if __name__ == "__main__":
    main()

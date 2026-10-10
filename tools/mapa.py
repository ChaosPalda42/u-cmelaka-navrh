"""Kreslená mapa okolí z dat OpenStreetMap (zdroje/osm/okoli.json) -> src/assets/mapa.svg.

Barvy nese CSS (třídy m-*), takže mapa sedí ve světlém i tmavém režimu.
Data © přispěvatelé OpenStreetMap, ODbL.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
CIL = (49.8413551, 14.2783515)  # Řadová 546
SIRKA, VYSKA = 900, 620  # px
METRU_NA_PX = 0.95

SILNICE = {"secondary": 9, "tertiary": 8, "unclassified": 6.5, "residential": 6, "service": 3.5,
           "track": 2.2, "footway": 1.6, "path": 1.6, "pedestrian": 4}
ZELEN = {"grass", "meadow", "garden", "orchard", "park", "pitch", "playground", "recreation_ground"}
LES = {"forest", "wood"}
POLE = {"farmland", "farmyard"}


def projekce(lat, lon):
    ky = 111_320
    kx = 111_320 * math.cos(math.radians(CIL[0]))
    x = (lon - CIL[1]) * kx / METRU_NA_PX + SIRKA / 2
    y = -(lat - CIL[0]) * ky / METRU_NA_PX + VYSKA / 2
    return round(x, 1), round(y, 1)


def cesta(body, zavrit=False):
    if not body:
        return ""
    d = "M" + " L".join(f"{x},{y}" for x, y in body)
    return d + (" Z" if zavrit else "")


def delka(body):
    return sum(math.dist(a, b) for a, b in zip(body, body[1:]))


def uvnitr(body, okraj=60):
    return any(-okraj <= x <= SIRKA + okraj and -okraj <= y <= VYSKA + okraj for x, y in body)


def main():
    data = json.loads((KOREN / "zdroje/osm/okoli.json").read_text(encoding="utf-8"))
    plochy, budovy, cesty, popisky = [], [], [], {}
    for e in data["elements"]:
        t = e.get("tags", {})
        body = [projekce(g["lat"], g["lon"]) for g in e.get("geometry", [])]
        if len(body) < 2 or not uvnitr(body):
            continue
        druh = t.get("landuse") or t.get("leisure")
        if "building" in t:
            budovy.append(cesta(body, True))
        elif druh in LES:
            plochy.append(("m-les", cesta(body, True)))
        elif druh in ZELEN:
            plochy.append(("m-zelen", cesta(body, True)))
        elif druh in POLE:
            plochy.append(("m-pole", cesta(body, True)))
        elif t.get("highway") in SILNICE:
            hw = t["highway"]
            cesty.append((SILNICE[hw], hw, cesta(body)))
            jmeno = t.get("name")
            if jmeno and hw not in ("footway", "path", "track", "service"):
                if jmeno not in popisky or delka(body) > delka(popisky[jmeno]):
                    popisky[jmeno] = body
    cesty.sort(key=lambda c: c[0])
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIRKA} {VYSKA}" class="mapa-svg" role="img" '
           f'aria-label="Mapa okolí: U Čmeláka, Řadová 546, Nová Ves pod Pleší">',
           f'<rect class="m-podklad" width="{SIRKA}" height="{VYSKA}"/>']
    for trida, d in plochy:
        out.append(f'<path class="{trida}" d="{d}"/>')
    out.append('<g class="m-budovy">' + "".join(f'<path d="{d}"/>' for d in budovy) + "</g>")
    out.append('<g class="m-obrys">' + "".join(
        f'<path d="{d}" stroke-width="{w + 2.4}"/>' for w, hw, d in cesty if w >= 3.5) + "</g>")
    out.append('<g class="m-cesty">' + "".join(
        f'<path class="m-{ "pesi" if hw in ("footway", "path", "track") else "silnice"}" d="{d}" stroke-width="{w}"/>'
        for w, hw, d in cesty) + "</g>")
    out.append("<defs>")
    texty = []
    for i, (jmeno, body) in enumerate(sorted(popisky.items())):
        if delka(body) < 90:
            continue
        if body[0][0] > body[-1][0]:
            body = body[::-1]
        out.append(f'<path id="ul{i}" d="{cesta(body)}"/>')
        texty.append(f'<text class="m-ulice" dy="3.5"><textPath href="#ul{i}" startOffset="50%" text-anchor="middle">{jmeno}</textPath></text>')
    out.append("</defs>")
    out.extend(texty)
    cx, cy = SIRKA / 2, VYSKA / 2
    out.append(f'<g class="m-cil" transform="translate({cx},{cy})">'
               '<circle class="m-cil-vlna" r="26"/><circle class="m-cil-bod" r="11"/>'
               '<path class="m-cil-pruh" d="M-7,-3 h14 M-7,3 h14"/></g>')
    out.append(f'<text class="m-cil-text" x="{cx + 20}" y="{cy - 16}">U Čmeláka</text>')
    out.append(f'<text class="m-autor" x="{SIRKA - 8}" y="{VYSKA - 8}" text-anchor="end">© přispěvatelé OpenStreetMap</text>')
    out.append("</svg>")
    cil = KOREN / "src/assets/mapa.svg"
    cil.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(cil, len(budovy), "budov,", len(cesty), "cest,", len(texty), "popisků")


if __name__ == "__main__":
    main()

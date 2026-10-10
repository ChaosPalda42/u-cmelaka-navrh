"""Akceptační test C-011 — src/php/pomoc.php (pomocníci pro stránky; musí dávat totéž co JS moduly)."""
from __future__ import annotations

from tests.jsmod import run_js
from tests.phpmod import lint, normalizuj, php

S = "pomoc.php"
R = [None, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"},
     {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "21:00"}]
R2 = [{"od": "11:00", "do": "14:00"}] * 5 + [None, None]
R3 = [None] * 7


def js(modul, fce, args):
    return run_js(modul, f"out(A.v.map((a) => m.{fce}(...a)));", args={"v": args})


def test_lint():
    lint(S)


def test_cena_jako_js():
    vstupy = [[0], [55], [189], [1250], [12345], [1234567]]
    assert php(S, [("cm_format_cena", a) for a in vstupy]) == js("menu.mjs", "formatCena", vstupy)


def test_tyden_jako_js():
    vstupy = [[R], [R2], [R3]]
    assert normalizuj(php(S, [("cm_tyden_radky", a) for a in vstupy])) == normalizuj(js("oteviraci.mjs", "tydenRadky", vstupy))


def test_datumy_a_sklonovani_jako_js():
    d = [["2026-10-17"], ["2026-12-24"], ["2027-01-01"], ["2026-03-29"]]
    assert php(S, [("cm_datum_cesky", a) for a in d]) == js("cestina.mjs", "datumCesky", d)
    assert php(S, [("cm_datum_kratce", a) for a in d]) == js("cestina.mjs", "datumKratce", d)
    t = ["pizza", "pizzy", "pizz"]
    n = [[k, t] for k in (0, 1, 2, 4, 5, 11, 21, -3)]
    assert php(S, [("cm_sklonuj", a) for a in n]) == js("cestina.mjs", "sklonuj", n)


def test_text_html():
    vstupy = ["Pizza z pece a *zahrada*, kde",
              "<script>alert(1)</script> & \"uvozovky\"",
              "Řádek 1\nŘádek 2",
              "*jen hvězdička",
              "**", "a * b * c", ""]
    assert php(S, [("cm_text_html", [v]) for v in vstupy]) == [
        "Pizza z pece a <em>zahrada</em>, kde",
        "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;uvozovky&quot;",
        "Řádek 1<br>Řádek 2",
        "*jen hvězdička",
        "**", "a <em> b </em> c", ""]


def test_esc_a_atribut():
    assert php(S, [("cm_e", ["<a href=\"x\">'</a>"]), ("cm_e", [None]), ("cm_e", [42])]) == ["&lt;a href=&quot;x&quot;&gt;&#039;&lt;/a&gt;", "", "42"]


def test_telefon_odkaz():
    assert php(S, [("cm_tel", ["+420 774 160 240"]), ("cm_tel", [""])]) == ["tel:+420774160240", ""]

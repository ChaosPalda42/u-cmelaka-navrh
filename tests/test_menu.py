"""Akceptační test C-004 — src/lib/menu.mjs (filtrování a výpis jídelního lístku)."""
from __future__ import annotations

from tests.jsmod import run_js

M = [
    {"id": "margherita", "nazev": "Margherita", "kategorie": "pizza", "slozeni": "rajčatový základ, mozzarella, bazalka", "stitky": ["vege"], "alergeny": [1, 7]},
    {"id": "sunkova", "nazev": "Šunková se žampiony", "kategorie": "pizza", "slozeni": "rajčatový základ, mozzarella, šunka, žampiony", "stitky": [], "alergeny": [1, 7]},
    {"id": "diabolo", "nazev": "Diabolo", "kategorie": "pizza", "slozeni": "rajčatový základ, mozzarella, pikantní salám, jalapeňos", "stitky": ["palive"], "alergeny": [1, 7, 10]},
    {"id": "spenatova", "nazev": "Špenátová", "kategorie": "pizza", "slozeni": "smetanový základ, mozzarella, špenát, česnek, vejce", "stitky": ["vege", "smetana"], "alergeny": [1, 3, 7]},
    {"id": "hranolky", "nazev": "Hranolky", "kategorie": "snacky", "slozeni": "", "stitky": ["vege"], "alergeny": []},
    {"id": "dort", "nazev": "Domácí dort", "kategorie": "dezerty", "slozeni": "podle denní nabídky", "stitky": ["vege"], "alergeny": [1, 3, 7, 8]},
    {"id": "limonada", "nazev": "Domácí limonáda", "kategorie": "napoje", "slozeni": "máta, citron", "stitky": ["vege"], "alergeny": []},
]


def js(body, **a):
    return run_js("menu.mjs", body, args={"M": M, **a})


def ids(body, **a):
    return [p["id"] for p in js(body, **a)]


def test_bez_diakritiky():
    assert js('out([m.bezDiakritiky("Šunková se ŽAMPIONY"), m.bezDiakritiky(""), m.bezDiakritiky(undefined), m.bezDiakritiky("Jalapeňos")]);') == [
        "sunkova se zampiony", "", "", "jalapenos"]


def test_filtr_bez_podminek_vrati_vse_v_poradi():
    assert ids("out(m.filtruj(A.M, {}));") == [p["id"] for p in M]
    assert ids("out(m.filtruj(A.M));") == [p["id"] for p in M]


def test_hledani_bez_diakritiky_a_vsechna_slova():
    assert ids('out(m.filtruj(A.M, {hledat: "sunk"}));') == ["sunkova"]
    assert ids('out(m.filtruj(A.M, {hledat: "  ŠPENÁT  "}));') == ["spenatova"]
    assert ids('out(m.filtruj(A.M, {hledat: "mozzarella pikant"}));') == ["diabolo"]
    assert ids('out(m.filtruj(A.M, {hledat: "domaci"}));') == ["dort", "limonada"]
    assert ids('out(m.filtruj(A.M, {hledat: "ananas"}));') == []


def test_kategorie_stitky_alergeny():
    assert ids('out(m.filtruj(A.M, {kategorie: "pizza", stitky: ["vege"]}));') == ["margherita", "spenatova"]
    assert ids('out(m.filtruj(A.M, {stitky: ["vege", "smetana"]}));') == ["spenatova"]
    assert ids('out(m.filtruj(A.M, {kategorie: "pizza", bezAlergenu: [3, 10]}));') == ["margherita", "sunkova"]
    assert ids('out(m.filtruj(A.M, {kategorie: ""}));') == [p["id"] for p in M]
    assert ids('out(m.filtruj(A.M, {kategorie: "pizza", hledat: "smetan", bezAlergenu: [1]}));') == []


def test_seskup():
    s = js('out(m.seskup(A.M, ["pizza", "napoje", "polevky", "snacky"]).map(g => [g.kategorie, g.polozky.map(p => p.id)]));')
    assert s == [
        ["pizza", ["margherita", "sunkova", "diabolo", "spenatova"]],
        ["napoje", ["limonada"]],
        ["snacky", ["hranolky"]],
        ["dezerty", ["dort"]],
    ]
    assert js("out(m.seskup([], [\"pizza\"]));") == []


def test_format_ceny_a_alergenu():
    assert js("out([m.formatCena(189), m.formatCena(1250), m.formatCena(0), m.formatCena(1234567)]);") == [
        "189 Kč", "1 250 Kč", "0 Kč", "1 234 567 Kč"]
    assert js("out([m.alergenyText([7, 1, 3, 7]), m.alergenyText([]), m.alergenyText(undefined), m.alergenyText([10, 2])]);") == [
        "1, 3, 7", "", "", "2, 10"]


def test_nemutuje():
    assert js('const s = JSON.stringify(A.M); m.filtruj(A.M, {hledat: "x", stitky: ["vege"]}); m.seskup(A.M, ["pizza"]); m.alergenyText(A.M[5].alergeny); out(JSON.stringify(A.M) === s);') is True

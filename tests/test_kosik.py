"""Akceptační test C-002 — src/lib/kosik.mjs (košík objednávky na vyzvednutí)."""
from __future__ import annotations

from tests.jsmod import run_js

M = [
    {"id": "margherita", "nazev": "Margherita", "cena": 159, "kategorie": "pizza"},
    {"id": "salam", "nazev": "Salámová", "cena": 189, "kategorie": "pizza"},
    {"id": "limonada", "nazev": "Domácí limonáda", "cena": 59, "kategorie": "napoje"},
]
P = [{"id": "syr", "nazev": "extra sýr", "cena": 30}, {"id": "vejce", "nazev": "vejce", "cena": 20}]


def js(body, **a):
    return run_js("kosik.mjs", body, args={"M": M, "P": P, **a})


def test_klic_radku():
    assert js('out([m.klicRadku("margherita", []), m.klicRadku("margherita", ["vejce", "syr"]), m.klicRadku("a", undefined)]);') == [
        "margherita|", "margherita|syr,vejce", "a|"]


def test_pridej_slucuje_stejne_radky():
    k = js('let k = m.pridej([], "margherita"); k = m.pridej(k, "margherita", {pocet: 2}); out(k);')
    assert k == [{"klic": "margherita|", "id": "margherita", "pocet": 3, "priplatky": []}]


def test_pridej_s_priplatky_je_novy_radek_a_seradi_je():
    k = js('let k = m.pridej([], "margherita"); k = m.pridej(k, "margherita", {priplatky: ["vejce", "syr"]}); out(k);')
    assert k == [
        {"klic": "margherita|", "id": "margherita", "pocet": 1, "priplatky": []},
        {"klic": "margherita|syr,vejce", "id": "margherita", "pocet": 1, "priplatky": ["syr", "vejce"]},
    ]


def test_strop_20_a_neplatny_pocet():
    assert js('let k = m.pridej([], "salam", {pocet: 25}); k = m.pridej(k, "salam", {pocet: 3}); out(k[0].pocet);') == 20
    assert js('out([m.pridej([], "salam", {pocet: 0}), m.pridej([], "salam", {pocet: -2})]);') == [[], []]
    assert js('out(m.pridej([], "salam", {pocet: 2.7})[0].pocet);') == 2


def test_zmen_pocet_a_odeber():
    base = 'let k = m.pridej([], "margherita"); k = m.pridej(k, "limonada", {pocet: 2});'
    assert js(base + 'out(m.zmenPocet(k, "limonada|", 0).map(r => r.klic));') == ["margherita|"]
    assert js(base + 'out(m.zmenPocet(k, "limonada|", 50)[1].pocet);') == 20
    assert js(base + 'out(m.zmenPocet(k, "limonada|", 4)[1].pocet);') == 4
    assert js(base + 'out(m.zmenPocet(k, "neni|", 4));') == js(base + "out(k);")
    assert js(base + 'out(m.odeber(k, "margherita|").map(r => r.klic));') == ["limonada|"]


def test_souhrn():
    body = ('let k = m.pridej([], "margherita", {pocet: 3});'
            'k = m.pridej(k, "margherita", {priplatky: ["vejce", "syr"]});'
            'k = m.pridej(k, "limonada", {pocet: 2});'
            'out(m.souhrn(k, A.M, A.P, {krabice: 15}));')
    assert js(body) == {
        "radky": [
            {"klic": "margherita|", "id": "margherita", "nazev": "Margherita", "pocet": 3, "priplatky": [], "jednotkova": 159, "celkem": 477},
            {"klic": "margherita|syr,vejce", "id": "margherita", "nazev": "Margherita", "pocet": 1, "priplatky": ["extra sýr", "vejce"], "jednotkova": 209, "celkem": 209},
            {"klic": "limonada|", "id": "limonada", "nazev": "Domácí limonáda", "pocet": 2, "priplatky": [], "jednotkova": 59, "celkem": 118},
        ],
        "pocetKusu": 6,
        "pocetPizz": 4,
        "mezisoucet": 804,
        "obaly": 60,
        "celkem": 864,
    }


def test_souhrn_neznama_polozka_a_priplatek_a_bez_krabic():
    k = [{"klic": "zmizela|", "id": "zmizela", "pocet": 2, "priplatky": []},
         {"klic": "salam|bazalka", "id": "salam", "pocet": 1, "priplatky": ["bazalka"]}]
    s = js("out(m.souhrn(A.k, A.M, A.P));", k=k)
    assert s["radky"] == [{"klic": "salam|bazalka", "id": "salam", "nazev": "Salámová", "pocet": 1, "priplatky": [], "jednotkova": 189, "celkem": 189}]
    assert (s["pocetKusu"], s["pocetPizz"], s["mezisoucet"], s["obaly"], s["celkem"]) == (1, 1, 189, 0, 189)
    assert js("out(m.souhrn([], A.M, A.P, {krabice: 15}));") == {
        "radky": [], "pocetKusu": 0, "pocetPizz": 0, "mezisoucet": 0, "obaly": 0, "celkem": 0}


def test_serializace_a_nacteni():
    assert js('const k = m.pridej(m.pridej([], "salam", {priplatky: ["vejce"]}), "limonada"); out(m.nactiKosik(m.serializuj(k)));') == [
        {"klic": "salam|vejce", "id": "salam", "pocet": 1, "priplatky": ["vejce"]},
        {"klic": "limonada|", "id": "limonada", "pocet": 1, "priplatky": []},
    ]
    spinavy = ('[{"id":"salam","pocet":2,"priplatky":["vejce"]},{"id":"","pocet":1},{"id":"x","pocet":0},'
               '{"id":"y","pocet":1.5},{"pocet":1},{"id":"salam","pocet":30,"priplatky":["vejce"]},'
               '{"id":"z","pocet":1,"priplatky":"syr"},"text",null]')
    assert js("out(m.nactiKosik(A.t));", t=spinavy) == [
        {"klic": "salam|vejce", "id": "salam", "pocet": 20, "priplatky": ["vejce"]},
        {"klic": "z|", "id": "z", "pocet": 1, "priplatky": []},
    ]
    assert js('out([m.nactiKosik("nesmysl{"), m.nactiKosik("{}"), m.nactiKosik(null), m.nactiKosik("")]);') == [[], [], [], []]


def test_nemutuje():
    assert js('const k = m.pridej([], "salam"); const s = JSON.stringify(k);'
              'm.pridej(k, "salam"); m.zmenPocet(k, "salam|", 5); m.odeber(k, "salam|"); m.souhrn(k, A.M, A.P, {krabice: 15});'
              'out(JSON.stringify(k) === s);') is True

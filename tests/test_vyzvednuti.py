"""Akceptační test C-003 — src/lib/vyzvednuti.mjs (časy vyzvednutí objednávky)."""
from __future__ import annotations

from tests.jsmod import run_js

R = [None, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"},
     {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "21:00"}]


def js(body, **a):
    return run_js("vyzvednuti.mjs", body, args={"R": R, **a})


def test_doba_pripravy():
    assert js("out([0,1,2,3,4,5,6,7,8,20].map(m.dobaPripravy));") == [20, 20, 20, 25, 25, 30, 30, 35, 35, 65]


def test_sloty_vecer():
    assert js("out(m.sloty(A.R, 1, 1200, {pocetPizz: 2}));") == [
        {"cas": "20:30", "minuty": 1230, "volno": 6, "dostupny": True},
        {"cas": "20:45", "minuty": 1245, "volno": 6, "dostupny": True},
    ]


def test_sloty_pred_otevrenim_s_obsazenim():
    s = js('out(m.sloty(A.R, 1, 600, {pocetPizz: 3, obsazeno: {"15:30": 6, "15:45": 4, "16:00": 9}}));')
    assert len(s) == 22
    assert s[0] == {"cas": "15:30", "minuty": 930, "volno": 0, "dostupny": False}
    assert s[1] == {"cas": "15:45", "minuty": 945, "volno": 2, "dostupny": False}
    assert s[2] == {"cas": "16:00", "minuty": 960, "volno": 0, "dostupny": False}
    assert s[3] == {"cas": "16:15", "minuty": 975, "volno": 6, "dostupny": True}
    assert s[-1] == {"cas": "20:45", "minuty": 1245, "volno": 6, "dostupny": True}


def test_zaokrouhleni_nahoru_na_krok():
    assert [x["cas"] for x in js("out(m.sloty(A.R, 4, 1240, {pocetPizz: 1}));")] == ["21:00", "21:15", "21:30", "21:45"]
    assert [x["cas"] for x in js("out(m.sloty(A.R, 4, 1250, {pocetPizz: 1}));")] == ["21:15", "21:30", "21:45"]
    assert [x["cas"] for x in js("out(m.sloty(A.R, 4, 1240, {pocetPizz: 1, krok: 30}));")] == ["21:00", "21:30"]


def test_vlastni_kapacita_a_rezerva():
    s = js('out(m.sloty(A.R, 2, 1170, {pocetPizz: 4, kapacita: 8, rezerva: 30, obsazeno: {"20:00": 5}}));')
    assert s == [
        {"cas": "20:00", "minuty": 1200, "volno": 3, "dostupny": False},
        {"cas": "20:15", "minuty": 1215, "volno": 8, "dostupny": True},
        {"cas": "20:30", "minuty": 1230, "volno": 8, "dostupny": True},
    ]


def test_bez_pizzy_staci_jakykoli_slot():
    s = js('out(m.sloty(A.R, 3, 1200, {pocetPizz: 0, obsazeno: {"20:30": 6}}));')
    assert s == [
        {"cas": "20:30", "minuty": 1230, "volno": 0, "dostupny": True},
        {"cas": "20:45", "minuty": 1245, "volno": 6, "dostupny": True},
    ]


def test_prazdne():
    assert js("out([m.sloty(A.R, 1, 1230, {pocetPizz: 1}), m.sloty(A.R, 0, 900, {pocetPizz: 1}), m.sloty(A.R, 1, 1300, {})]);") == [[], [], []]


def test_nejblizsi():
    assert js('out(m.nejblizsi(m.sloty(A.R, 1, 600, {pocetPizz: 3, obsazeno: {"15:30": 6, "15:45": 4}})));') == {
        "cas": "16:00", "minuty": 960, "volno": 6, "dostupny": True}
    assert js("out(m.nejblizsi([]));") is None
    assert js('out(m.nejblizsi([{cas: "20:00", minuty: 1200, volno: 0, dostupny: false}]));') is None


def test_obsazenost_z_objednavek():
    obj = [{"cas": "16:00", "pizz": 2}, {"cas": "16:00", "pizz": 3}, {"cas": "17:15", "pizz": 1}, {"cas": "", "pizz": 4}, {"cas": "18:00"}]
    assert js("out(m.obsazenost(A.o));", o=obj) == {"16:00": 5, "17:15": 1, "18:00": 0}


def test_nemutuje():
    assert js('const o = {"16:00": 2}; const s = JSON.stringify([A.R, o]); m.sloty(A.R, 1, 600, {pocetPizz: 2, obsazeno: o}); out(JSON.stringify([A.R, o]) === s);') is True

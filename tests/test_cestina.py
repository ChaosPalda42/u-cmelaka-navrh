"""Akceptační test C-005 — src/lib/cestina.mjs (skloňování, data a akce)."""
from __future__ import annotations

from tests.jsmod import run_js


def js(body, **a):
    return run_js("cestina.mjs", body, args=a)


def test_sklonuj():
    t = ["pizza", "pizzy", "pizz"]
    assert js("out([0,1,2,4,5,11,21,22,-1,-3].map(n => m.sklonuj(n, A.t)));", t=t) == [
        "0 pizz", "1 pizza", "2 pizzy", "4 pizzy", "5 pizz", "11 pizz", "21 pizz", "22 pizz", "-1 pizza", "-3 pizzy"]


def test_datum_cesky_a_kratce():
    v = ["2026-10-17", "2026-12-24", "2027-01-01", "2026-10-12"]
    assert js("out(A.v.map(m.datumCesky));", v=v) == ["sobota 17. října", "čtvrtek 24. prosince", "pátek 1. ledna", "pondělí 12. října"]
    assert js("out(A.v.map(m.datumKratce));", v=v) == ["so 17. 10.", "čt 24. 12.", "pá 1. 1.", "po 12. 10."]


def test_za_dni():
    v = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-13", "2026-10-15", "2026-11-10", "2027-01-01"]
    assert js('out(A.v.map(d => m.zaDni("2026-10-10", d)));', v=v) == [
        "proběhlo", "dnes", "zítra", "za 3 dny", "za 5 dní", "za 31 dní", "za 83 dní"]
    assert js('out(m.zaDni("2026-03-28", "2026-03-30"));') == "za 2 dny"


def test_nadchazejici():
    akce = [
        {"id": "a", "datum": "2026-10-24", "cas": "18:00"},
        {"id": "b", "datum": "2026-10-03", "cas": "17:00"},
        {"id": "c", "datum": "2026-10-10", "cas": "19:30"},
        {"id": "d", "datum": "2026-10-24", "cas": "10:00"},
        {"id": "e", "datum": "2026-11-07"},
        {"id": "f", "datum": "2026-10-10", "cas": "15:00"},
    ]
    assert [x["id"] for x in js('out(m.nadchazejici(A.a, "2026-10-10"));', a=akce)] == ["f", "c", "d", "a", "e"]
    assert [x["id"] for x in js('out(m.nadchazejici(A.a, "2026-10-10", 2));', a=akce)] == ["f", "c"]
    assert [x["id"] for x in js('out(m.nadchazejici(A.a, "2026-11-08"));', a=akce)] == []
    assert js('const s = JSON.stringify(A.a); m.nadchazejici(A.a, "2026-10-10"); out(JSON.stringify(A.a) === s);', a=akce) is True

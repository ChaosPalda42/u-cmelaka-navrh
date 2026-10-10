"""Akceptační test C-006 — src/lib/objednavka.mjs (kontrola a souhrn objednávky na vyzvednutí)."""
from __future__ import annotations

from tests.jsmod import run_js

DOBRE = {"jmeno": "Jana Nováková", "telefon": "777 123 456", "email": "", "poznamka": "", "souhlas": True}


def js(body, **a):
    return run_js("objednavka.mjs", body, args=a)


def test_zkontroluj_ok():
    assert js('out(m.zkontroluj(A.u, {pocetKusu: 2, cas: "17:30"}));', u=DOBRE) == {"ok": True, "errors": {}}


def test_zkontroluj_chyby():
    u = {"jmeno": " J ", "telefon": "12345", "email": "jana@", "poznamka": "x" * 301, "souhlas": False}
    assert js('out(m.zkontroluj(A.u, {pocetKusu: 0, cas: ""}));', u=u) == {
        "ok": False,
        "errors": {"jmeno": "min", "telefon": "telefon", "email": "email", "poznamka": "max", "souhlas": "souhlas", "kosik": "prazdny", "cas": "required"},
    }
    assert js("out(m.zkontroluj({}, {}));")["errors"] == {
        "jmeno": "required", "telefon": "required", "souhlas": "souhlas", "kosik": "prazdny", "cas": "required"}


def test_hlasky():
    h = js('out(m.hlaskyObjednavky({jmeno: "required", telefon: "telefon", kosik: "prazdny", cas: "required", jine: "x"}));')
    assert h == {
        "jmeno": "Napište prosím, na jaké jméno objednávku připravíme.",
        "telefon": "Telefon nevypadá jako české číslo – zkontrolujte ho prosím.",
        "kosik": "Košík je zatím prázdný.",
        "cas": "Vyberte čas, kdy si pro jídlo přijdete.",
        "jine": "x",
    }


def test_cislo_objednavky():
    assert js('out([m.cisloObjednavky("2026-10-10", 7), m.cisloObjednavky("2027-01-05", 123), m.cisloObjednavky("2026-12-31", 1000)]);') == [
        "1010-007", "0105-123", "1231-1000"]


def test_text_pro_kuchyni():
    souhrn = {
        "radky": [
            {"klic": "margherita|", "nazev": "Margherita", "pocet": 3, "priplatky": [], "jednotkova": 159, "celkem": 477},
            {"klic": "margherita|syr,vejce", "nazev": "Margherita", "pocet": 1, "priplatky": ["extra sýr", "vejce"], "jednotkova": 209, "celkem": 209},
            {"klic": "limonada|", "nazev": "Domácí limonáda", "pocet": 2, "priplatky": [], "jednotkova": 59, "celkem": 118},
        ],
        "pocetKusu": 6, "pocetPizz": 4, "mezisoucet": 804, "obaly": 60, "celkem": 864,
    }
    u = {"jmeno": "  Jana Nováková ", "telefon": "777123456", "poznamka": " bez oliv prosím \n"}
    t = js('out(m.textProKuchyni({cislo: "1010-007", cas: "17:30", udaje: A.u, souhrn: A.s}));', u=u, s=souhrn)
    assert t == "\n".join([
        "Objednávka 1010-007 – vyzvednutí v 17:30",
        "Jana Nováková, +420 777 123 456",
        "",
        "3× Margherita",
        "1× Margherita (+ extra sýr, vejce)",
        "2× Domácí limonáda",
        "",
        "Krabice: 4× | Celkem k úhradě: 864 Kč",
        "Poznámka: bez oliv prosím",
    ])
    u2 = {"jmeno": "Petr", "telefon": "+420601000111", "poznamka": "   "}
    s2 = {"radky": [{"klic": "a|", "nazev": "Hranolky", "pocet": 1, "priplatky": [], "jednotkova": 49, "celkem": 49}],
          "pocetKusu": 1, "pocetPizz": 0, "mezisoucet": 1250, "obaly": 0, "celkem": 1250}
    assert js('out(m.textProKuchyni({cislo: "1010-008", cas: "18:00", udaje: A.u, souhrn: A.s}));', u=u2, s=s2) == "\n".join([
        "Objednávka 1010-008 – vyzvednutí v 18:00",
        "Petr, +420 601 000 111",
        "",
        "1× Hranolky",
        "",
        "Celkem k úhradě: 1 250 Kč",
    ])

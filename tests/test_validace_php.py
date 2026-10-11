"""Akceptační test C-010 — src/php/validace.php (kontrola a úprava dat z administrace)."""
from __future__ import annotations

from tests.phpmod import lint, normalizuj, php, php1

S = "validace.php"


def test_lint():
    lint(S)


def test_slug_a_cena():
    assert php(S, [("cm_slug", ["Šunková se žampiony"]), ("cm_slug", ["  Quattro   formaggi!! "]), ("cm_slug", [""]), ("cm_slug", ["Pivo 12°"])]) == [
        "sunkova-se-zampiony", "quattro-formaggi", "polozka", "pivo-12"]
    vstupy = [189, "189", " 189 Kč", "1 250", "1 250 Kč", "", None, "0", "-5", "12,50", "abc", 3.0, 3.5, True]
    assert php(S, [("cm_cena", [v]) for v in vstupy]) == [
        189, 189, 189, 1250, 1250, None, None, 0, False, False, False, 3, False, False]


MENU = {
    "kategorie": [{"id": "pizza", "nazev": "Pizzy z naší pece", "popis": "32 cm"}, {"nazev": "Pití", "popis": ""}],
    "polozky": [
        {"id": "margherita", "cislo": "1", "nazev": " Margherita ", "kategorie": "pizza", "cena": "175 Kč", "slozeni": "tomatový základ", "stitky": ["vege", "nesmysl"], "objednat": "1"},
        {"nazev": "Margherita", "kategorie": "pizza", "cena": 190, "objednat": False, "na_uvodu": True},
        {"nazev": "Pilsner Urquell", "kategorie": "piti", "cena": "", "slozeni": "0,5 l"},
    ],
    "priplatky": [{"nazev": "extra sýr", "cena": "40"}],
    "priplatky_text": " uzeniny 40 Kč ",
    "neznamy_klic": 1,
}


def test_menu_ok():
    r = php1(S, "cm_over_menu", MENU)
    assert r["ok"] is True and normalizuj(r["chyby"]) == []
    d = r["data"]
    assert list(d) == ["kategorie", "polozky", "priplatky", "priplatky_text"]
    assert d["kategorie"] == [{"id": "pizza", "nazev": "Pizzy z naší pece", "popis": "32 cm"}, {"id": "piti", "nazev": "Pití", "popis": ""}]
    assert d["polozky"][0] == {"id": "margherita", "cislo": 1, "nazev": "Margherita", "kategorie": "pizza", "cena": 175, "slozeni": "tomatový základ",
                               "stitky": ["vege"], "objednat": True, "na_uvodu": False}
    assert d["polozky"][1]["id"] == "margherita-2" and d["polozky"][1]["cislo"] is None and d["polozky"][1]["na_uvodu"] is True
    assert d["polozky"][1]["objednat"] is False and d["polozky"][1]["stitky"] == [] and d["polozky"][1]["slozeni"] == ""
    assert d["polozky"][2]["cena"] is None and d["polozky"][2]["id"] == "pilsner-urquell"
    assert d["priplatky"] == [{"id": "extra-syr", "nazev": "extra sýr", "cena": 40}]
    assert d["priplatky_text"] == "uzeniny 40 Kč"


def test_menu_chyby():
    zle = {
        "kategorie": [{"id": "pizza", "nazev": "  "}],
        "polozky": [
            {"nazev": "", "kategorie": "pizza", "cena": 100},
            {"nazev": "Diabolo", "kategorie": "neni", "cena": "levná"},
            {"nazev": "x" * 81, "kategorie": "pizza", "cena": 1},
        ],
        "priplatky": [{"nazev": "sýr", "cena": ""}],
    }
    r = php1(S, "cm_over_menu", zle)
    assert r["ok"] is False
    assert r["chyby"] == {
        "kategorie.0.nazev": "Vyplňte název kategorie.",
        "polozky.0.nazev": "Vyplňte název.",
        "polozky.1.kategorie": "Vyberte kategorii.",
        "polozky.1.cena": "Cena musí být celé číslo v korunách (nebo nechte prázdné).",
        "polozky.2.nazev": "Název je moc dlouhý (nejvýš 80 znaků).",
        "priplatky.0.cena": "Příplatek musí mít cenu v korunách.",
    }


def test_menu_prazdne_a_spatny_tvar():
    r = php1(S, "cm_over_menu", {})
    assert normalizuj(r) == normalizuj({"ok": True, "chyby": {}, "data": {"kategorie": [], "polozky": [], "priplatky": [], "priplatky_text": ""}})
    r = php1(S, "cm_over_menu", {"kategorie": "x", "polozky": [1, "a", None], "priplatky": None})
    assert r["ok"] is True and r["data"]["polozky"] == []


AKCE = {"akce": [
    {"id": "dyne", "datum": "2026-10-24", "cas": "15:00", "nazev": " Dýňování ", "pro": "děti", "text": "Vyřezáváme.", "foto": "akce-dyne"},
    {"datum": "2026-10-30", "cas": "", "nazev": "Kvíz", "pro": "nevim", "text": ""},
]}


def test_akce():
    r = php1(S, "cm_over_akce", AKCE)
    assert r["ok"] is True
    assert r["data"]["akce"] == [
        {"id": "dyne", "datum": "2026-10-24", "cas": "15:00", "nazev": "Dýňování", "pro": "děti", "text": "Vyřezáváme.", "foto": "akce-dyne"},
        {"id": "kviz", "datum": "2026-10-30", "cas": "", "nazev": "Kvíz", "pro": "všichni", "text": "", "foto": ""},
    ]
    r = php1(S, "cm_over_akce", {"akce": [{"datum": "2026-02-30", "cas": "25:00", "nazev": ""}, {"datum": "30. 10. 2026", "nazev": "A", "cas": "9:5"}]})
    assert r["ok"] is False
    assert r["chyby"] == {"akce.0.datum": "Neplatné datum.", "akce.0.cas": "Čas pište jako 18:00.", "akce.0.nazev": "Vyplňte název akce.",
                          "akce.1.datum": "Neplatné datum.", "akce.1.cas": "Čas pište jako 18:00."}
    assert php1(S, "cm_over_akce", {"akce": [{"datum": "2026-10-30", "cas": "9:05", "nazev": "Ráno"}]})["data"]["akce"][0]["cas"] == "09:05"


SCHEMA = [
    {"klic": "uvod.nadpis", "typ": "text", "max": 120, "vychozi": "Pizza z pece"},
    {"klic": "uvod.perex", "typ": "odstavec", "max": 400, "vychozi": ""},
    {"klic": "uvod.body", "typ": "seznam", "max": 80, "vychozi": ["a", "b"]},
]


def test_obsah():
    r = php1(S, "cm_over_obsah", {"uvod.nadpis": "  Ahoj  ", "uvod.perex": "Řádek 1\r\nŘádek 2", "uvod.body": ["  x ", "", "y"], "cizi": "pryč"}, SCHEMA)
    assert normalizuj(r) == normalizuj({"ok": True, "chyby": {}, "data": {"uvod.nadpis": "Ahoj", "uvod.perex": "Řádek 1\nŘádek 2", "uvod.body": ["x", "y"]}})
    r = php1(S, "cm_over_obsah", {}, SCHEMA)
    assert r["data"] == {"uvod.nadpis": "Pizza z pece", "uvod.perex": "", "uvod.body": ["a", "b"]}
    r = php1(S, "cm_over_obsah", {"uvod.nadpis": "x" * 121, "uvod.body": ["y" * 81], "uvod.perex": "Jeden\nřádek"}, SCHEMA)
    assert r["ok"] is False and r["chyby"] == {"uvod.nadpis": "Text je moc dlouhý (nejvýš 120 znaků).", "uvod.body.0": "Text je moc dlouhý (nejvýš 80 znaků)."}
    r = php1(S, "cm_over_obsah", {"uvod.nadpis": "Dva\nřádky", "uvod.body": "a\nb"}, SCHEMA)
    assert r["data"]["uvod.nadpis"] == "Dva řádky" and r["data"]["uvod.body"] == ["a", "b"]


PODNIK = {
    "telefon": "774160240", "email": " Objednavky@U-cmelaka.cz ",
    "adresa": {"ulice": "Řadová 546", "psc": "26204", "obec": "Nová Ves pod Pleší"},
    "rozvrh": [None, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"},
               {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "21:00"}],
    "krabice": "15", "od_roku": 2021, "navic": "x",
}


def test_podnik():
    r = php1(S, "cm_over_podnik", PODNIK)
    assert r["ok"] is True, r["chyby"]
    d = r["data"]
    assert d["telefon"] == "+420 774 160 240" and d["email"] == "objednavky@u-cmelaka.cz"
    assert d["adresa"] == {"ulice": "Řadová 546", "psc": "262 04", "obec": "Nová Ves pod Pleší"}
    assert d["rozvrh"][0] is None and d["rozvrh"][4] == {"od": "15:00", "do": "22:00"}
    assert d["krabice"] == 15 and d["od_roku"] == 2021 and "navic" not in d
    zle = dict(PODNIK, telefon="123", email="nekde", rozvrh=[None, {"od": "21:00", "do": "15:00"}, {"od": "x", "do": "21:00"}] + [None] * 4, krabice="-1")
    r = php1(S, "cm_over_podnik", zle)
    assert r["ok"] is False
    assert r["chyby"] == {"telefon": "Telefon nevypadá jako české číslo.", "email": "E-mail nevypadá správně.",
                          "rozvrh.1": "Zavírá se dřív, než se otevírá.", "rozvrh.2": "Čas pište jako 15:00.",
                          "krabice": "Cena musí být celé číslo v korunách."}
    r = php1(S, "cm_over_podnik", dict(PODNIK, rozvrh=[None] * 5))
    assert r["chyby"] == {"rozvrh": "Otevírací doba musí mít 7 dní."}

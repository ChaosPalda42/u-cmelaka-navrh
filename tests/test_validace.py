"""Akceptační test C-001 — src/lib/validace.mjs."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("validace.mjs", body, args=args)

    return call


def test_je_email(js):
    dobre = ["info@fofrmont.cz", "a.b+c@sub.domena.co.uk", "x@y.io"]
    spatne = ["", "info@fofrmont", "a@b.c", "a b@c.cz", "a@@b.cz", "@b.cz", "a@.cz", "a@b..cz", "a@b.c1"]
    assert js("out(A.v.map(m.jeEmail));", v=dobre) == [True] * 3
    assert js("out(A.v.map(m.jeEmail));", v=spatne) == [False] * len(spatne)
    assert js("out(m.jeEmail(undefined));") is False


def test_normalizuj_telefon(js):
    assert js('out(m.normalizujTelefon("777 123 456"));') == "+420777123456"
    assert js('out(m.normalizujTelefon("00420 777 123 456"));') == "+420777123456"
    assert js('out(m.normalizujTelefon("420777123456"));') == "+420777123456"
    assert js('out(m.normalizujTelefon("+420 (777) 123-456"));') == "+420777123456"
    assert js('out(m.normalizujTelefon("+49 30 123456"));') == "+4930123456"
    assert js("out(m.normalizujTelefon(undefined));") == ""


def test_je_telefon_cz(js):
    assert js('out(["777123456", "+420 601 000 111", "212345678"].map(m.jeTelefonCz));') == [True, True, True]
    assert js('out(["123456789", "77712345", "+49301234567", ""].map(m.jeTelefonCz));') == [False] * 4


def test_je_ico(js):
    assert js('out(["02911973", "19667531", "10000020", "10000071"].map(m.jeIco));') == [True] * 4
    assert js('out(["02911974", "1234567", "123456789", "abcdefgh", ""].map(m.jeIco));') == [False] * 5
    assert js('out(m.jeIco("029 119 73"));') is True


def test_je_psc_a_formatovani(js):
    assert js('out(["130 00", "13000", "60200"].map(m.jePsc));') == [True] * 3
    assert js('out(["03000", "1300", "130000", "abcde"].map(m.jePsc));') == [False] * 4
    assert js('out(m.formatujPsc("13000"));') == "130 00"
    assert js('out(m.formatujPsc("abc"));') == "abc"


def test_formatuj_telefon(js):
    assert js('out(m.formatujTelefon("777123456"));') == "+420 777 123 456"
    assert js('out(m.formatujTelefon("+49301234567"));') == "+49301234567"


def test_validuj_projde(js):
    pravidla = {"jmeno": ["required"], "email": ["required", "email"], "telefon": ["telefon"],
                "souhlas": ["souhlas"]}
    hodnoty = {"jmeno": "Jan", "email": "a@b.cz", "telefon": "", "souhlas": True}
    assert js("out(m.validuj(A.h, A.p));", h=hodnoty, p=pravidla) == {"ok": True, "errors": {}}


def test_validuj_vraci_prvni_nesplnene_pravidlo(js):
    pravidla = {"email": ["required", "email"]}
    assert js("out(m.validuj({}, A.p).errors);", p=pravidla) == {"email": "required"}
    assert js('out(m.validuj({ email: "nic" }, A.p).errors);', p=pravidla) == {"email": "email"}


def test_validuj_prazdne_hodnoty_nekontroluje_format(js):
    pravidla = {"ico": ["ico"], "psc": ["psc"], "telefon": ["telefon"]}
    assert js('out(m.validuj({ ico: "", psc: "   " }, A.p).ok);', p=pravidla) is True
    assert js('out(m.validuj({ ico: "02911974" }, A.p).errors.ico);', p=pravidla) == "ico"


def test_validuj_required_a_nula(js):
    pravidla = {"pocet": ["required"], "souhlas": ["required"], "obory": ["required"]}
    v = js("out(m.validuj({ pocet: 0, souhlas: false, obory: [] }, A.p).errors);", p=pravidla)
    assert v == {"souhlas": "required", "obory": "required"}


def test_validuj_min_max_delka(js):
    pravidla = {"zprava": [{"typ": "min", "hodnota": 10}], "plocha": [{"typ": "max", "hodnota": 500}],
                "kod": [{"typ": "delka", "hodnota": 4}], "obory": [{"typ": "min", "hodnota": 1}]}
    hodnoty = {"zprava": "krátká", "plocha": 900, "kod": "abc", "obory": []}
    assert js("out(m.validuj(A.h, A.p).errors);", h=hodnoty, p=pravidla) == {
        "zprava": "min", "plocha": "max", "kod": "delka", "obory": "min"}
    ok = {"zprava": "dost dlouhá zpráva", "plocha": 100, "kod": "abcd", "obory": ["vzt"]}
    assert js("out(m.validuj(A.h, A.p).ok);", h=ok, p=pravidla) is True


def test_validuj_souhlas(js):
    assert js('out(m.validuj({ souhlas: "ano" }, { souhlas: ["souhlas"] }).errors.souhlas);') == "souhlas"
    assert js('out(m.validuj({ souhlas: true }, { souhlas: ["souhlas"] }).ok);') is True


def test_hlasky(js):
    katalog = {"email.email": "Zkontrolujte tvar e-mailu.", "required": "Vyplňte prosím."}
    errors = {"email": "email", "jmeno": "required", "ico": "ico"}
    assert js("out(m.hlasky(A.e, A.k));", e=errors, k=katalog) == {
        "email": "Zkontrolujte tvar e-mailu.", "jmeno": "Vyplňte prosím.", "ico": "ico"}

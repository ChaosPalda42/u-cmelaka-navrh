"""Akceptační test C-001 — src/lib/oteviraci.mjs (otevírací doba a stav „teď“)."""
from __future__ import annotations

import pytest

from tests.jsmod import run_js

R = [None, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"}, {"od": "15:00", "do": "21:00"},
     {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "22:00"}, {"od": "15:00", "do": "21:00"}]


def js(body, **a):
    return run_js("oteviraci.mjs", body, args={"R": R, **a})


def test_na_minuty_a_format():
    assert js('out([m.naMinuty("15:00"), m.naMinuty("0:05"), m.naMinuty("21:30"), m.naMinuty("00:00")]);') == [900, 5, 1290, 0]
    assert js("out([m.formatCas(0), m.formatCas(905), m.formatCas(1290), m.formatCas(65)]);") == ["00:00", "15:05", "21:30", "01:05"]


@pytest.mark.parametrize("den,minuty,cekam", [
    (1, 900, {"otevreno": True, "do": "21:00", "zaviraZa": 360, "otevira": None}),
    (1, 1259, {"otevreno": True, "do": "21:00", "zaviraZa": 1, "otevira": None}),
    (4, 1300, {"otevreno": True, "do": "22:00", "zaviraZa": 20, "otevira": None}),
    (1, 1260, {"otevreno": False, "do": None, "zaviraZa": None, "otevira": {"den": 2, "cas": "15:00", "zaDni": 1}}),
    (0, 600, {"otevreno": False, "do": None, "zaviraZa": None, "otevira": {"den": 1, "cas": "15:00", "zaDni": 1}}),
    (6, 1290, {"otevreno": False, "do": None, "zaviraZa": None, "otevira": {"den": 1, "cas": "15:00", "zaDni": 2}}),
    (1, 100, {"otevreno": False, "do": None, "zaviraZa": None, "otevira": {"den": 1, "cas": "15:00", "zaDni": 0}}),
])
def test_stav(den, minuty, cekam):
    assert js("out(m.stav(A.R, A.d, A.m));", d=den, m=minuty) == cekam


def test_stav_vse_zavreno_a_jediny_den():
    assert js("out(m.stav([null,null,null,null,null,null,null], 2, 600));") == {
        "otevreno": False, "do": None, "zaviraZa": None, "otevira": None}
    r2 = [None, None, None, None, {"od": "11:00", "do": "14:00"}, None, None]
    assert js("out(m.stav(A.r2, 4, 900));", r2=r2)["otevira"] == {"den": 4, "cas": "11:00", "zaDni": 7}


def test_popis_stavu():
    body = "out(A.v.map(([d, x]) => m.popisStavu(m.stav(A.R, d, x))));"
    v = [[1, 900], [1, 1200], [1, 1230], [1, 1259], [1, 1260], [0, 600], [6, 1290], [1, 100]]
    assert js(body, v=v) == [
        "Otevřeno do 21:00",
        "Otevřeno, zavíráme za 60 min",
        "Otevřeno, zavíráme za 30 min",
        "Otevřeno, zavíráme za 1 min",
        "Zavřeno, otevíráme zítra v 15:00",
        "Zavřeno, otevíráme zítra v 15:00",
        "Zavřeno, otevíráme v úterý v 15:00",
        "Zavřeno, otevíráme dnes v 15:00",
    ]
    assert js("out(m.popisStavu(m.stav([null,null,null,null,null,null,null], 2, 600)));") == "Zavřeno"
    r2 = [None, None, {"od": "11:00", "do": "14:00"}, {"od": "11:00", "do": "14:00"}, None, None, None]
    assert js("out([m.popisStavu(m.stav(A.r2, 0, 600)), m.popisStavu(m.stav(A.r2, 4, 600))]);", r2=r2) == [
        "Zavřeno, otevíráme ve středu v 11:00", "Zavřeno, otevíráme ve středu v 11:00"]


def test_prazsky_cas():
    body = "out(A.v.map((s) => m.prazskyCas(new Date(s))));"
    v = ["2026-10-10T19:14:00Z", "2026-12-31T23:30:00Z", "2026-03-29T01:30:00Z", "2026-01-05T14:59:00Z"]
    assert js(body, v=v) == [
        {"den": 5, "minuty": 1274, "datum": "2026-10-10"},
        {"den": 4, "minuty": 30, "datum": "2027-01-01"},
        {"den": 6, "minuty": 210, "datum": "2026-03-29"},
        {"den": 0, "minuty": 959, "datum": "2026-01-05"},
    ]


def test_tyden_pro_vypis():
    assert js("out(m.tydenRadky(A.R));") == [
        {"dny": "pondělí", "cas": "zavřeno"},
        {"dny": "úterý – čtvrtek", "cas": "15:00 – 21:00"},
        {"dny": "pátek – sobota", "cas": "15:00 – 22:00"},
        {"dny": "neděle", "cas": "15:00 – 21:00"},
    ]
    assert js("out(m.tydenRadky([null,null,null,null,null,null,null]));") == [{"dny": "pondělí – neděle", "cas": "zavřeno"}]


def test_nemutuje():
    assert js("const k = JSON.stringify(A.R); m.stav(A.R, 3, 1000); m.tydenRadky(A.R); out(JSON.stringify(A.R) === k);") is True

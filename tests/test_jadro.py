"""Akceptační test C-008 — src/php/jadro.php (úložiště se zálohami, heslo, brzda, CSRF)."""
from __future__ import annotations

import json
import re

from tests.phpmod import lint, php, php1

S = "jadro.php"


def test_lint():
    lint(S)


def test_nacteni_bez_vedlejsich_ucinku(tmp_path):
    out = php(S, [("cm_slozka", [])], data=str(tmp_path / "d"))
    assert out == [str(tmp_path / "d")]
    assert (tmp_path / "d").is_dir()


def test_vychozi_slozka_je_nad_webem():
    # src/php/jadro.php se na hostingu nasazuje do web/inc/jadro.php -> data jsou dvě úrovně výš
    out = php(S, [("cm_slozka", [])], env={"CM_DATA": ""})
    assert out[0].endswith("/U Cmelaka/data") or out[0].endswith("/data")
    assert "/src/php" not in out[0]


def test_nacti_a_uloz(tmp_path):
    d = str(tmp_path)
    assert php1(S, "cm_nacti", "menu", data=d) == []
    assert php1(S, "cm_nacti", "menu", {"x": 1}, data=d) == {"x": 1}
    assert php1(S, "cm_uloz", "menu", {"polozky": [{"nazev": "Čmelák", "cena": 229}]}, data=d) is True
    assert json.loads((tmp_path / "menu.json").read_text(encoding="utf-8")) == {"polozky": [{"nazev": "Čmelák", "cena": 229}]}
    assert "Čmelák" in (tmp_path / "menu.json").read_text(encoding="utf-8"), "JSON bez \\u escapů"
    assert php1(S, "cm_nacti", "menu", data=d) == {"polozky": [{"nazev": "Čmelák", "cena": 229}]}
    assert not any(p.name.startswith(".") or p.suffix == ".tmp" for p in tmp_path.iterdir()), "dočasné soubory po sobě uklidit"


def test_jmeno_se_cisti(tmp_path):
    d = str(tmp_path)
    assert php1(S, "cm_uloz", "../ven/Menu!", {"a": 1}, data=d) is True
    assert (tmp_path / "venmenu.json").exists()
    assert not (tmp_path.parent / "ven").exists()
    (tmp_path / "rozbite.json").write_text("{nesmysl", encoding="utf-8")
    assert php1(S, "cm_nacti", "rozbite", {"v": 1}, data=d) == {"v": 1}
    (tmp_path / "cislo.json").write_text("42", encoding="utf-8")
    assert php1(S, "cm_nacti", "cislo", data=d) == []


def test_zalohy(tmp_path):
    d = str(tmp_path)
    php(S, [("cm_uloz", ["obsah", {"v": i}]) for i in range(4)], data=d)
    zal = php1(S, "cm_zalohy", "obsah", data=d)
    assert len(zal) == 3, "první uložení nemá co zálohovat"
    assert all(re.fullmatch(r"obsah-\d{8}-\d{6}-\d{3}\.json", z) for z in zal)
    assert zal == sorted(zal, reverse=True)
    obsahy = [json.loads((tmp_path / "zalohy" / z).read_text(encoding="utf-8")) for z in zal]
    assert sorted(o["v"] for o in obsahy) == [0, 1, 2]
    assert php1(S, "cm_zalohy", "menu", data=d) == []


def test_zaloh_nejvys_30(tmp_path):
    d = str(tmp_path)
    php(S, [("cm_uloz", ["menu", {"v": i}]) for i in range(35)], data=d)
    zal = php1(S, "cm_zalohy", "menu", data=d)
    assert len(zal) == 30
    vals = sorted(json.loads((tmp_path / "zalohy" / z).read_text(encoding="utf-8"))["v"] for z in zal)
    assert vals == list(range(4, 34)), "drží se nejnovějších 30"


def test_obnova(tmp_path):
    d = str(tmp_path)
    php(S, [("cm_uloz", ["akce", {"v": "stará"}]), ("cm_uloz", ["akce", {"v": "nová"}])], data=d)
    zal = php1(S, "cm_zalohy", "akce", data=d)
    assert php1(S, "cm_obnov", "akce", zal[0], data=d) is True
    assert php1(S, "cm_nacti", "akce", data=d) == {"v": "stará"}
    assert len(php1(S, "cm_zalohy", "akce", data=d)) == 2, "obnovení zálohuje i to, co přepisuje"
    assert php1(S, "cm_obnov", "akce", "../heslo.json", data=d) is False
    assert php1(S, "cm_obnov", "akce", "menu-20260101-120000.json", data=d) is False
    assert php1(S, "cm_obnov", "akce", "akce-20200101-120000.json", data=d) is False


def test_heslo(tmp_path):
    d = str(tmp_path)
    assert php1(S, "cm_heslo_nastaveno", data=d) is False
    assert php1(S, "cm_zalozeni_povoleno", data=d) is False
    (tmp_path / "zalozit-heslo").write_text("", encoding="utf-8")
    assert php1(S, "cm_zalozeni_povoleno", data=d) is True
    assert php1(S, "cm_nastav_heslo", "kratke", "kratke", data=d) == {"ok": False, "chyba": "Heslo musí mít aspoň 10 znaků."}
    assert php1(S, "cm_nastav_heslo", "čmelákčmelák", "čmelákčmeláx", data=d) == {"ok": False, "chyba": "Hesla se neshodují."}
    assert php1(S, "cm_over_heslo", "cokoli", data=d) is False
    assert php1(S, "cm_nastav_heslo", "pizza z pece 32", "pizza z pece 32", data=d) == {"ok": True, "chyba": ""}
    assert not (tmp_path / "zalozit-heslo").exists()
    ulozene = json.loads((tmp_path / "heslo.json").read_text(encoding="utf-8"))
    assert ulozene["hash"].startswith("$") and "pizza" not in json.dumps(ulozene)
    assert php(S, [("cm_heslo_nastaveno", []), ("cm_zalozeni_povoleno", []), ("cm_over_heslo", ["pizza z pece 32"]), ("cm_over_heslo", ["pizza z pece 33"]), ("cm_over_heslo", [""])], data=d) == [True, False, True, False, False]
    # devítiznakové heslo z vícebajtových znaků je pořád krátké
    assert php1(S, "cm_nastav_heslo", "ččččččččč", "ččččččččč", data=d)["ok"] is False


def test_zalozeni_po_nastaveni_nejde(tmp_path):
    d = str(tmp_path)
    (tmp_path / "zalozit-heslo").write_text("", encoding="utf-8")
    php1(S, "cm_nastav_heslo", "1234567890", "1234567890", data=d)
    (tmp_path / "zalozit-heslo").write_text("", encoding="utf-8")
    assert php1(S, "cm_zalozeni_povoleno", data=d) is False, "už nastavené heslo se přes příznak nepřepíše"


def test_brzda(tmp_path):
    d = str(tmp_path)
    t = 1_800_000_000
    vol = [("cm_brzda_zaznamenej", ["1.2.3.4", t + i]) for i in range(7)]
    vol += [("cm_brzda_blokovano", ["1.2.3.4", t + 10]), ("cm_brzda_zaznamenej", ["1.2.3.4", t + 11]),
            ("cm_brzda_blokovano", ["1.2.3.4", t + 12]), ("cm_brzda_blokovano", ["5.6.7.8", t + 12]),
            ("cm_brzda_blokovano", ["1.2.3.4", t + 15 * 60 + 11]),
            ("cm_brzda_zaznamenej", ["1.2.3.4", t + 20]), ("cm_brzda_vymaz", ["1.2.3.4"]), ("cm_brzda_blokovano", ["1.2.3.4", t + 21])]
    out = php(S, vol, data=d)
    assert out[7:] == [False, None, True, False, False, None, None, False]


def test_csrf_a_prihlaseni_v_cli(tmp_path):
    out = php(S, [("cm_csrf_token", []), ("cm_csrf_token", []), ("cm_prihlasen", [])], data=str(tmp_path))
    assert re.fullmatch(r"[0-9a-f]{32}", out[0]) and out[0] == out[1]
    assert out[2] is False
    cizi = php(S, [("cm_csrf_token", [])], data=str(tmp_path))[0]
    chk = php(S, [("cm_csrf_token", []), ("cm_over_csrf", [cizi]), ("cm_over_csrf", [""])], data=str(tmp_path))
    assert chk[1] is False and chk[2] is False, "token z jiného běhu ani prázdný neplatí"


def test_csrf_over_v_jednom_behu(tmp_path):
    kod = "$t = cm_csrf_token(); echo json_encode([cm_over_csrf($t), cm_over_csrf($t . 'x'), cm_over_csrf(strtoupper($t))]);"
    import subprocess, os
    from tests.phpmod import ROOT
    proc = subprocess.run(["php", "-r", f"require {json.dumps(str(ROOT / 'src/php/jadro.php'))}; {kod}"], capture_output=True, text=True,
                          env={**os.environ, "CM_DATA": str(tmp_path)})
    assert json.loads(proc.stdout) == [True, False, False], proc.stderr

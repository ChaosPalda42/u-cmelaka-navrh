"""Volání funkcí z PHP souborů v src/php a porovnání s JS moduly ze src/lib."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def php(soubor: str, volani: list, *, data: str | None = None, pred: str = "", env: dict | None = None) -> list:
    """Načte src/php/<soubor>, zavolá funkce [(jmeno, [argumenty]), ...] a vrátí jejich výsledky.
    `data` = složka úložiště (proměnná prostředí CM_DATA)."""
    kod = (
        "date_default_timezone_set('Europe/Prague');"
        + pred
        + f"require_once {json.dumps(str(ROOT / 'src' / 'php' / soubor))};"
        + "$v = json_decode(stream_get_contents(STDIN), true); $out = [];"
        + "foreach ($v as [$f, $a]) { if (!function_exists($f)) { fwrite(STDERR, 'chybí funkce ' . $f); exit(3); } $out[] = call_user_func_array($f, $a); }"
        + "echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);"
    )
    prostredi = dict(os.environ)
    if data is not None:
        prostredi["CM_DATA"] = data
    prostredi.update(env or {})
    proc = subprocess.run(["php", "-d", "display_errors=stderr", "-r", kod], input=json.dumps(volani, ensure_ascii=False),
                          capture_output=True, text=True, timeout=60, env=prostredi)
    if proc.returncode != 0 or not proc.stdout:
        raise AssertionError("php selhal:\n" + (proc.stderr or proc.stdout)[:3000])
    return json.loads(proc.stdout)


def php1(soubor: str, funkce: str, *args, **kw):
    return php(soubor, [(funkce, list(args))], **kw)[0]


def lint(soubor: str) -> None:
    proc = subprocess.run(["php", "-l", str(ROOT / "src" / "php" / soubor)], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout + proc.stderr


def normalizuj(x):
    """PHP prázdné pole [] a JS {} jsou totéž; čísla 5.0 a 5 taky."""
    if isinstance(x, dict):
        if not x:
            return []
        if [str(k) for k in x] == [str(i) for i in range(len(x))]:
            return [normalizuj(x[k]) for k in x]
        return {str(k): normalizuj(v) for k, v in x.items()}
    if isinstance(x, list):
        return [normalizuj(v) for v in x] if x else []
    if isinstance(x, float) and x.is_integer():
        return int(x)
    return x

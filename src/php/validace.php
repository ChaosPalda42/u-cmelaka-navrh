<?php

/**
 * C-010 — Kontrola a úprava dat z administrace: menu, akce, texty, provoz.
 * Všechny cm_over_* vrací ["ok" => bool, "chyby" => [klíč => hláška], "data" => upravená data].
 */

/** Tabulka české diakritiky (malá + velká) pro strtr. */
function cm_tabulka_diacritiky(): array
{
    static $tabulka = null;
    if ($tabulka === null) {
        $tabulka = [];
        $pary = [
            'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
            'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
            'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z',
        ];
        foreach ($pary as $z => $c) {
            $tabulka[$z] = $c;
            $tabulka[mb_strtoupper($z)] = mb_strtoupper($c);
        }
    }
    return $tabulka;
}

/** Trim i s nezlomitelnou mezerou U+00A0 na krajích. */
function cm_trim(string $text): string
{
    return trim($text, " \t\n\r\0\x0B\u{00A0}");
}

/** Malá písmena bez diakritiky; úseky mimo [a-z0-9] -> jedna pomlčka; prázdné -> "polozka". */
function cm_slug(string $text): string
{
    $text = strtr($text, cm_tabulka_diacritiky());
    $text = mb_strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
    $text = trim($text, '-');
    return $text === '' ? 'polozka' : $text;
}

/** Je řetězec platný slug (výsledek cm_slug, kromě "polozka" se neliší). */
function cm_platny_slug(string $s): bool
{
    return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $s) === 1;
}

/**
 * Cena v korunách: int >= 0 -> to číslo; float s celou hodnotou -> int;
 * bool -> false; null / prázdný řetězec po trim -> null;
 * řetězec: bez mezer a bez koncového "Kč" musí být jen číslice -> int; jinak false.
 */
function cm_cena($v)
{
    if (is_bool($v)) {
        return false;
    }
    if ($v === null) {
        return null;
    }
    if (is_int($v)) {
        return $v >= 0 ? $v : false;
    }
    if (is_float($v)) {
        return $v >= 0 && floor($v) === $v ? (int) $v : false;
    }
    if (is_string($v)) {
        $s = cm_trim($v);
        if ($s === '') {
            return null;
        }
        $s = str_replace([" ", "\u{00A0}"], '', $s);
        if (preg_match('/Kč$/iu', $s)) {
            $s = preg_replace('/Kč$/iu', '', $s) ?? '';
        }
        if ($s !== '' && preg_match('/^\d+$/', $s)) {
            return (int) $s;
        }
        return false;
    }
    return false;
}

/** true jen pro true, 1, "1", "true", "on". */
function cm_prazdne_pole($v): array
{
    return is_array($v) ? $v : [];
}

function cm_pravda($v): bool
{
    return in_array($v, [true, 1, '1', 'true', 'on'], true);
}

/**
 * Výsledek cm_over_*: prázdné "chyby" se serializuje jako JSON objekt {},
 * ne jako pole [] (PHP prázdné pole by se jinak zapisovalo jako []).
 */
class cm_over_vysledek extends ArrayObject
{
    public function jsonSerialize(): array
    {
        $d = $this->getArrayCopy();
        if ($d['chyby'] === []) {
            $d['chyby'] = new stdClass();
        }
        return $d;
    }
}

/** Přidá příponu -2, -3, … dokud id není unikátní. */
function cm_unikatni_id(string $id, array &$pouzito): string
{
    if (!isset($pouzito[$id])) {
        $pouzito[$id] = true;
        return $id;
    }
    $n = 2;
    while (isset($pouzito[$id . '-' . $n])) {
        $n++;
    }
    $pouzito[$id . '-' . $n] = true;
    return $id . '-' . $n;
}

/** Normalizace času H:MM / HH:MM (minuty vždy dvě číslice) -> "HH:MM", jinak null. */
function cm_cas(string $s): ?string
{
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', $s, $m)) {
        return null;
    }
    $h = (int) $m[1];
    $min = (int) $m[2];
    if ($h > 23 || $min > 59) {
        return null;
    }
    return sprintf('%02d:%02d', $h, $min);
}

function cm_over_menu($m): object
{
    $m = cm_prazdne_pole($m);
    $chyby = [];

    // kategorie
    $kategorie = [];
    $pouzite_kat = [];
    foreach (cm_prazdne_pole($m['kategorie'] ?? null) as $i => $k) {
        if (!is_array($k)) {
            continue;
        }
        $nazev = cm_trim((string) ($k['nazev'] ?? ''));
        if ($nazev === '') {
            $chyby["kategorie.$i.nazev"] = 'Vyplňte název kategorie.';
        }
        $id = (string) ($k['id'] ?? '');
        $id = cm_platny_slug($id) ? $id : cm_slug($nazev);
        $id = cm_unikatni_id($id, $pouzite_kat);
        $kategorie[] = [
            'id' => $id,
            'nazev' => $nazev,
            'popis' => cm_trim((string) ($k['popis'] ?? '')),
        ];
    }
    $platne_kategorie = array_flip(array_column($kategorie, 'id'));

    // polozky
    $polozky = [];
    $pouzite_pol = [];
    foreach (cm_prazdne_pole($m['polozky'] ?? null) as $i => $p) {
        if (!is_array($p)) {
            continue;
        }
        $nazev = cm_trim((string) ($p['nazev'] ?? ''));
        if ($nazev === '') {
            $chyby["polozky.$i.nazev"] = 'Vyplňte název.';
        } elseif (mb_strlen($nazev) > 80) {
            $chyby["polozky.$i.nazev"] = 'Název je moc dlouhý (nejvýš 80 znaků).';
        }
        $id = (string) ($p['id'] ?? '');
        $id = cm_platny_slug($id) ? $id : cm_slug($nazev);
        $id = cm_unikatni_id($id, $pouzite_pol);

        $cislo = null;
        $c = $p['cislo'] ?? null;
        if (is_int($c) && $c > 0) {
            $cislo = $c;
        } elseif (is_string($c) && preg_match('/^\d+$/', cm_trim($c)) && (int) cm_trim($c) > 0) {
            $cislo = (int) cm_trim($c);
        }

        $kategorieId = (string) ($p['kategorie'] ?? '');
        if (!isset($platne_kategorie[$kategorieId])) {
            $chyby["polozky.$i.kategorie"] = 'Vyberte kategorii.';
        }

        $cena = cm_cena($p['cena'] ?? null);
        if ($cena === false) {
            $chyby["polozky.$i.cena"] = 'Cena musí být celé číslo v korunách (nebo nechte prázdné).';
            $cena = null;
        }

        $stitky = [];
        foreach (cm_prazdne_pole($p['stitky'] ?? null) as $s) {
            if (in_array($s, ['vege', 'palive', 'smetana'], true) && !in_array($s, $stitky, true)) {
                $stitky[] = $s;
            }
        }

        $polozky[] = [
            'id' => $id,
            'cislo' => $cislo,
            'nazev' => $nazev,
            'kategorie' => $kategorieId,
            'cena' => $cena,
            'slozeni' => cm_trim((string) ($p['slozeni'] ?? '')),
            'stitky' => $stitky,
            'objednat' => cm_pravda($p['objednat'] ?? false),
            'na_uvodu' => cm_pravda($p['na_uvodu'] ?? false),
        ];
    }

    // priplatky
    $priplatky = [];
    $pouzite_pri = [];
    foreach (cm_prazdne_pole($m['priplatky'] ?? null) as $i => $p) {
        if (!is_array($p)) {
            continue;
        }
        $nazev = cm_trim((string) ($p['nazev'] ?? ''));
        if ($nazev === '') {
            $chyby["priplatky.$i.nazev"] = 'Vyplňte název.';
        }
        $id = (string) ($p['id'] ?? '');
        $id = cm_platny_slug($id) ? $id : cm_slug($nazev);
        $id = cm_unikatni_id($id, $pouzite_pri);
        $cena = cm_cena($p['cena'] ?? null);
        if (!is_int($cena)) {
            $chyby["priplatky.$i.cena"] = 'Příplatek musí mít cenu v korunách.';
            $cena = null;
        }
        $priplatky[] = [
            'id' => $id,
            'nazev' => $nazev,
            'cena' => $cena,
        ];
    }

    $data = [
        'kategorie' => $kategorie,
        'polozky' => $polozky,
        'priplatky' => $priplatky,
        'priplatky_text' => cm_trim((string) ($m['priplatky_text'] ?? '')),
    ];
    return new cm_over_vysledek(['ok' => $chyby === [], 'chyby' => $chyby, 'data' => $data]);
}

function cm_over_akce($a): object
{
    $a = cm_prazdne_pole($a);
    $chyby = [];
    $akce = [];
    $pouzite = [];
    foreach (cm_prazdne_pole($a['akce'] ?? null) as $i => $x) {
        if (!is_array($x)) {
            continue;
        }
        $datum = (string) ($x['datum'] ?? '');
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $datum, $md)
            || !checkdate((int) $md[2], (int) $md[3], (int) $md[1])) {
            $chyby["akce.$i.datum"] = 'Neplatné datum.';
        }

        $cas = (string) ($x['cas'] ?? '');
        if ($cas !== '') {
            $cas = cm_cas($cas);
            if ($cas === null) {
                $chyby["akce.$i.cas"] = 'Čas pište jako 18:00.';
                $cas = '';
            }
        }

        $nazev = cm_trim((string) ($x['nazev'] ?? ''));
        if ($nazev === '') {
            $chyby["akce.$i.nazev"] = 'Vyplňte název akce.';
        } elseif (mb_strlen($nazev) > 80) {
            $chyby["akce.$i.nazev"] = 'Název je moc dlouhý (nejvýš 80 znaků).';
        }

        $pro = (string) ($x['pro'] ?? '');
        if (!in_array($pro, ['děti', 'dospělí', 'všichni'], true)) {
            $pro = 'všichni';
        }

        $text = cm_trim((string) ($x['text'] ?? ''));
        if (mb_strlen($text) > 600) {
            $chyby["akce.$i.text"] = 'Text je moc dlouhý (nejvýš 600 znaků).';
        }

        $foto = (string) ($x['foto'] ?? '');
        if (!cm_platny_slug($foto)) {
            $foto = '';
        }

        $id = (string) ($x['id'] ?? '');
        $id = cm_platny_slug($id) ? $id : cm_slug($nazev);
        $id = cm_unikatni_id($id, $pouzite);

        $akce[] = [
            'id' => $id,
            'datum' => $datum,
            'cas' => $cas,
            'nazev' => $nazev,
            'pro' => $pro,
            'text' => $text,
            'foto' => $foto,
        ];
    }
    return new cm_over_vysledek(['ok' => $chyby === [], 'chyby' => $chyby, 'data' => ['akce' => $akce]]);
}

function cm_over_obsah($o, array $schema): object
{
    $o = cm_prazdne_pole($o);
    $chyby = [];
    $data = [];
    foreach ($schema as $pole) {
        $klic = (string) $pole['klic'];
        $typ = (string) $pole['typ'];
        $max = (int) $pole['max'];
        $vychozi = $pole['vychozi'];
        $hodnota = array_key_exists($klic, $o) ? $o[$klic] : $vychozi;

        if ($typ === 'text') {
            $t = (string) $hodnota;
            $t = str_replace(["\r\n", "\n"], ' ', $t);
            $t = cm_trim($t);
            if (mb_strlen($t) > $max) {
                $chyby[$klic] = "Text je moc dlouhý (nejvýš $max znaků).";
            }
            $data[$klic] = $t;
        } elseif ($typ === 'odstavec') {
            $t = (string) $hodnota;
            $t = str_replace("\r\n", "\n", $t);
            $t = cm_trim($t);
            if (mb_strlen($t) > $max) {
                $chyby[$klic] = "Text je moc dlouhý (nejvýš $max znaků).";
            }
            $data[$klic] = $t;
        } else { // seznam
            $zdroj = is_array($hodnota) ? $hodnota : explode("\n", (string) $hodnota);
            $seznam = [];
            foreach ($zdroj as $radek) {
                $r = cm_trim((string) $radek);
                if ($r !== '') {
                    $seznam[] = $r;
                }
            }
            foreach ($seznam as $j => $r) {
                if (mb_strlen($r) > $max) {
                    $chyby["$klic.$j"] = "Text je moc dlouhý (nejvýš $max znaků).";
                }
            }
            $data[$klic] = $seznam;
        }
    }
    return new cm_over_vysledek(['ok' => $chyby === [], 'chyby' => $chyby, 'data' => $data]);
}

function cm_over_podnik($p): object
{
    $p = cm_prazdne_pole($p);
    $chyby = [];

    // telefon
    $t = (string) ($p['telefon'] ?? '');
    $t = str_replace([" ", '(', ')', '-', '/'], '', $t);
    if (str_starts_with($t, '00420')) {
        $t = '+420' . substr($t, 5);
    } elseif (!str_starts_with($t, '+') && str_starts_with($t, '420') && strlen($t) === 12) {
        $t = '+' . $t;
    } elseif (!str_starts_with($t, '+') && preg_match('/^\d{9}$/', $t)) {
        $t = '+420' . $t;
    }
    if (preg_match('/^\+420(\d{9})$/', $t, $mt) && in_array($mt[1][0], ['2', '3', '5', '6', '7', '9'], true)) {
        $telefon = '+420 ' . substr($mt[1], 0, 3) . ' ' . substr($mt[1], 3, 3) . ' ' . substr($mt[1], 6);
    } else {
        $chyby['telefon'] = 'Telefon nevypadá jako české číslo.';
        $telefon = $t;
    }

    // email
    $email = mb_strtolower(cm_trim((string) ($p['email'] ?? '')));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $chyby['email'] = 'E-mail nevypadá správně.';
    }

    // adresa
    $ad = cm_prazdne_pole($p['adresa'] ?? null);
    $ulice = cm_trim((string) ($ad['ulice'] ?? ''));
    $psc = cm_trim((string) ($ad['psc'] ?? ''));
    if (preg_match('/^\d{5}$/', $psc)) {
        $psc = substr($psc, 0, 3) . ' ' . substr($psc, 3);
    }
    $adresa = [
        'ulice' => $ulice,
        'psc' => $psc,
        'obec' => cm_trim((string) ($ad['obec'] ?? '')),
    ];

    // rozvrh
    $r = $p['rozvrh'] ?? null;
    if (!is_array($r) || count($r) !== 7) {
        $chyby['rozvrh'] = 'Otevírací doba musí mít 7 dní.';
        $rozvrh = array_fill(0, 7, null);
    } else {
        $rozvrh = [];
        foreach ($r as $i => $den) {
            if ($den === null || $den === '') {
                $rozvrh[] = null;
                continue;
            }
            $od = cm_cas((string) (($den['od'] ?? '')));
            $do = cm_cas((string) (($den['do'] ?? '')));
            if ($od === null || $do === null) {
                $chyby["rozvrh.$i"] = 'Čas pište jako 15:00.';
                $rozvrh[] = null;
                continue;
            }
            if ($od >= $do) {
                $chyby["rozvrh.$i"] = 'Zavírá se dřív, než se otevírá.';
                $rozvrh[] = null;
                continue;
            }
            $rozvrh[] = ['od' => $od, 'do' => $do];
        }
    }

    // krabice
    $krabice = cm_cena($p['krabice'] ?? null);
    if (!is_int($krabice)) {
        $chyby['krabice'] = 'Cena musí být celé číslo v korunách.';
        $krabice = 0;
    }

    // od_roku
    $od_roku = is_int($p['od_roku'] ?? null) ? $p['od_roku'] : null;

    $data = [
        'telefon' => $telefon,
        'email' => $email,
        'adresa' => $adresa,
        'rozvrh' => $rozvrh,
        'krabice' => $krabice,
        'od_roku' => $od_roku,
    ];
    return new cm_over_vysledek(['ok' => $chyby === [], 'chyby' => $chyby, 'data' => $data]);
}

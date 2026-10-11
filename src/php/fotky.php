<?php

/**
 * Nahraná fotka -> varianty pro web (GD, otočení podle EXIF, WebP + JPG, verze v názvu).
 * Načtení tohoto souboru nemá žádné vedlejší účinky – jen definice funkcí.
 */

/** Bezdiakritické, malé, pomlčkované jméno souboru; prázdné -> "foto". */
function cm_jmeno_souboru(string $text): string
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
    $text = strtr($text, $tabulka);
    $text = mb_strtolower($text);
    // Zbytky z transliterace (apostrofy, uvozovky…) odstraň PŘED nahrazováním úseků,
    // ať se pomlčka nevytvoří uvnitř slova.
    $text = str_replace(["'", '"', '`', '^', '~'], '', $text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
    $text = trim($text, '-');
    return $text === '' ? 'foto' : $text;
}

/** Šířky variant: z $sirky menší než $sirka + min($sirka, max($sirky)), bez duplicit, vzestupně. */
function cm_sirky_variant(int $sirka, array $sirky): array
{
    $sirky = array_values(array_unique(array_map('intval', $sirky)));
    sort($sirky);
    $vysledky = array_values(array_filter($sirky, static fn (int $w): bool => $w < $sirka));
    $vysledky[] = min($sirka, max($sirky));
    if ($sirka <= (int) round(1.1 * max($sirky))) {
        $vysledky[] = $sirka;
    }
    $vysledky = array_values(array_unique($vysledky));
    sort($vysledky);
    return $vysledky;
}

/** Smaže v $cil soubory ^{jmeno}-[0-9a-f]{8}-\d+\.(webp|jpg)$ (volitelně jen s jinou verzí než $verze). */
function cm_smaz_starou_verzi(string $jmeno, string $cil, ?string $verze = null): int
{
    if (!is_dir($cil)) {
        return 0;
    }
    $vzor = '/^' . preg_quote($jmeno, '/') . '-[0-9a-f]{8}-\d+\.(webp|jpg)$/';
    $smazano = 0;
    foreach (scandir($cil) as $soubor) {
        if ($soubor === '.' || $soubor === '..' || !preg_match($vzor, $soubor)) {
            continue;
        }
        if ($verze !== null) {
            $zaver = substr($soubor, strlen($jmeno) + 1, 8);
            if ($zaver === $verze) {
                continue;
            }
        }
        if (is_file($cil . '/' . $soubor) && @unlink($cil . '/' . $soubor)) {
            $smazano++;
        }
    }
    return $smazano;
}

/** Smaže všechny verze fotky $jmeno v $cil a vrátí počet smazaných souborů (složka chybí -> 0). */
function cm_smaz_fotku(string $jmeno, string $cil): int
{
    return cm_smaz_starou_verzi(cm_jmeno_souboru($jmeno), $cil);
}

/**
 * Zpracuje nahranou fotku do variant pro web.
 * Vrací vždy: ok, chyba, jmeno, verze, sirka, vyska, varianty.
 */
function cm_zpracuj_fotku(string $zdroj, string $jmeno, string $cil, array $sirky = [640, 1280, 1920], $pomer = null): array
{
    $jmeno = cm_jmeno_souboru($jmeno);
    $chyba = static function () use ($jmeno): array {
        return [
            'ok' => false,
            'chyba' => 'Tohle není fotka – nahrajte prosím JPG, PNG, WebP nebo HEIC z telefonu.',
            'jmeno' => $jmeno,
            'verze' => '',
            'sirka' => 0,
            'vyska' => 0,
            'varianty' => [],
        ];
    };

    if (!is_file($zdroj)) {
        return $chyba();
    }
    $info = @getimagesize($zdroj);
    if ($info === false) {
        return $chyba();
    }
    $typ = $info[2];
    $docasny = null;
    if (!in_array($typ, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        // HEIC z telefonu: zkusit přes Imagick (když je nainstalovaný).
        if (class_exists('Imagick')) {
            $im = new Imagick();
            $im->readImage($zdroj);
            $im->setImageFormat('jpeg');
            $im->setImageCompressionQuality(92);
            $docasny = tempnam(sys_get_temp_dir(), 'cmheic_');
            if ($docasny !== false && $im->writeImage($docasny . '.jpg')) {
                $im->clear();
                $zdroj = $docasny . '.jpg';
                $info = @getimagesize($zdroj);
                if ($info !== false && $info[2] === IMAGETYPE_JPEG) {
                    $typ = IMAGETYPE_JPEG;
                } else {
                    return $chyba();
                }
            } else {
                return $chyba();
            }
        } else {
            return $chyba();
        }
    }

    $verze = substr(sha1_file($zdroj), 0, 8);
    if ($verze === false || $verze === '') {
        return $chyba();
    }

    $obrazek = null;
    if ($typ === IMAGETYPE_JPEG) {
        $obrazek = @imagecreatefromjpeg($zdroj);
    } elseif ($typ === IMAGETYPE_PNG) {
        $obrazek = @imagecreatefrompng($zdroj);
    } elseif ($typ === IMAGETYPE_WEBP) {
        $obrazek = @imagecreatefromwebp($zdroj);
    }
    if ($docasny !== null) {
        @unlink($docasny . '.jpg');
    }
    if ($obrazek === false) {
        return $chyba();
    }

    // 2) Otočení podle EXIF Orientation (jen JPEG).
    if ($typ === IMAGETYPE_JPEG) {
        $exif = @exif_read_data($zdroj);
        $orientace = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
        $uhel = null;
        if ($orientace === 3) {
            $uhel = 180;
        } elseif ($orientace === 6) {
            $uhel = -90; // 90° po směru hodinek
        } elseif ($orientace === 8) {
            $uhel = 90;
        }
        if ($uhel !== null) {
            $bila = imagecolorallocate($obrazek, 255, 255, 255);
            $otocene = imagerotate($obrazek, $uhel, $bila);
            if ($otocene !== false) {
                // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)
                $obrazek = $otocene;
            }
        }
    }

    // 3) Průhlednost slož na bílé pozadí.
    $sirka = imagesx($obrazek);
    $vyska = imagesy($obrazek);
    $plavno = imagecreatetruecolor($sirka, $vyska);
    $bila = imagecolorallocate($plavno, 255, 255, 255);
    imagefill($plavno, 0, 0, $bila);
    imagecopy($plavno, $obrazek, 0, 0, 0, 0, $sirka, $vyska);
    // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)
    $obrazek = $plavno;

    // 4) Středový ořez na požadovaný poměr šířka/výška.
    if (is_numeric($pomer) && (float) $pomer > 0) {
        $pomer = (float) $pomer;
        if ($sirka / $vyska > $pomer) {
            $nova_sirka = (int) round($vyska * $pomer);
            $nova_vyska = $vyska;
        } else {
            $nova_sirka = $sirka;
            $nova_vyska = (int) round($sirka / $pomer);
        }
        $nova_sirka = max(1, min($nova_sirka, $sirka));
        $nova_vyska = max(1, min($nova_vyska, $vyska));
        if ($nova_sirka !== $sirka || $nova_vyska !== $vyska) {
            $x0 = (int) floor(($sirka - $nova_sirka) / 2);
            $y0 = (int) floor(($vyska - $nova_vyska) / 2);
            $vyrez = imagecreatetruecolor($nova_sirka, $nova_vyska);
            imagecopy($vyrez, $obrazek, 0, 0, $x0, $y0, $nova_sirka, $nova_vyska);
            // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)
            $obrazek = $vyrez;
            $sirka = $nova_sirka;
            $vyska = $nova_vyska;
        }
    }

    // 5) Varianty.
    if (!is_dir($cil) && !mkdir($cil, 0755, true) && !is_dir($cil)) {
        // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)
        return $chyba();
    }
    $varianty = cm_sirky_variant($sirka, $sirky);
    foreach ($varianty as $w) {
        $h = (int) round($w * $vyska / $sirka);
        $h = max(1, $h);
        $zmensene = imagecreatetruecolor($w, $h);
        imagecopyresampled($zmensene, $obrazek, 0, 0, 0, 0, $w, $h, $sirka, $vyska);
        imagewebp($zmensene, $cil . '/' . $jmeno . '-' . $verze . '-' . $w . '.webp', 80);
        imageinterlace($zmensene, true);
        imagejpeg($zmensene, $cil . '/' . $jmeno . '-' . $verze . '-' . $w . '.jpg', 82);
        // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)
    }
    // (imagedestroy je od PHP 8 zbytečné a v 8.5 zastaralé)

    // 6) Starší verze téže fotky smaž.
    cm_smaz_starou_verzi($jmeno, $cil, $verze);

    return [
        'ok' => true,
        'chyba' => '',
        'jmeno' => $jmeno,
        'verze' => $verze,
        'sirka' => $sirka,
        'vyska' => $vyska,
        'varianty' => $varianty,
    ];
}

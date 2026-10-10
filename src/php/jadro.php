<?php

/**
 * Jádro administrace: úložiště JSON se zálohami, heslo, brzda proti hádání, relace a CSRF.
 */

function cm_slozka(): string
{
    $slozka = getenv("CM_DATA");
    if ($slozka === false || $slozka === "") {
        $slozka = dirname(__DIR__, 2) . "/data";
    }
    $slozka = rtrim($slozka, "/");
    if (!is_dir($slozka)) {
        mkdir($slozka, 0700, true);
    }
    return $slozka;
}

function cm_jmeno(string $jmeno): string
{
    return preg_replace('/[^a-z0-9-]/', '', strtolower($jmeno)) ?? '';
}

function cm_nacti(string $jmeno, array $vychozi = []): array
{
    $cesta = cm_slozka() . '/' . cm_jmeno($jmeno) . '.json';
    if (!is_file($cesta)) {
        return $vychozi;
    }
    $obsah = file_get_contents($cesta);
    if ($obsah === false) {
        return $vychozi;
    }
    $data = json_decode($obsah, true);
    if (!is_array($data)) {
        return $vychozi;
    }
    return $data;
}

function cm_uloz(string $jmeno, array $data): bool
{
    $jmeno = cm_jmeno($jmeno);
    $slozka = cm_slozka();
    $cile = $slozka . '/' . $jmeno . '.json';

    if (is_file($cile)) {
        $zalohy_dir = $slozka . '/zalohy';
        if (!is_dir($zalohy_dir)) {
            mkdir($zalohy_dir, 0700, true);
        }
        
        $datum = date('Ymd-His');
        $nejvyssi = 0;
        foreach (cm_zalohy($jmeno) as $existujici) {
            // Jen zálohy se STEJNÝM {jmeno}-{YYYYmmdd}-{HHiiss} se počítají do pořadí.
            if (str_starts_with($existujici, $jmeno . '-' . $datum . '-')) {
                $n = (int) substr($existujici, -7, 3);
                if ($n > $nejvyssi) {
                    $nejvyssi = $n;
                }
            }
        }
        // Nikdy ne „nejmenší volné“ číslo: po smazání nejstarší zálohy by se 000 uvolnilo
        // a nová záloha by se seřadila jako nejstarší.
        $nazev_zalohy = sprintf('%s-%s-%03d.json', $jmeno, $datum, $nejvyssi + 1);
        copy($cile, $zalohy_dir . '/' . $nazev_zalohy);

        $zbyvajici = cm_zalohy($jmeno);
        // cm_zalohy returns newest first. We want to keep 30.
        // If count > 30, we delete from index 30 onwards.
        if (count($zbyvajici) > 30) {
            foreach (array_slice($zbyvajici, 30) as $stará) {
                @unlink($zalohy_dir . '/' . $stará);
            }
        }
    }

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    $docasny = $slozka . '/' . $jmeno . '.' . bin2hex(random_bytes(8)) . '.tmp';
    if (file_put_contents($docasny, $json) === false) {
        return false;
    }
    $uspech = rename($docasny, $cile);
    if (!$uspech && is_file($docasny)) {
        @unlink($docasny);
    }
    if ($uspech && function_exists('opcache_invalidate')) {
        opcache_invalidate($cile, true);
    }
    return $uspech;
}

function cm_zalohy(string $jmeno): array
{
    $jmeno = cm_jmeno($jmeno);
    $zalohy_dir = cm_slozka() . '/zalohy';
    if (!is_dir($zalohy_dir)) {
        return [];
    }
    $vzor = '/^' . preg_quote($jmeno, '/') . '-\d{8}-\d{6}-\d{3}\.json$/';
    $nalezeno = [];
    foreach (scandir($zalohy_dir) as $soubor) {
        if (preg_match($vzor, $soubor)) {
            $nalezeno[] = $soubor;
        }
    }
    // Sort descending (newest first)
    rsort($nalezeno);
    return $nalezeno;
}

function cm_obnov(string $jmeno, string $zaloha): bool
{
    $jmeno = cm_jmeno($jmeno);
    if (!preg_match('/^' . preg_quote($jmeno, '/') . '-\d{8}-\d{6}-\d{3}\.json$/', $zaloha)) {
        return false;
    }
    $cesta = cm_slozka() . '/zalohy/' . $zaloha;
    if (!is_file($cesta)) {
        return false;
    }
    $obsah = file_get_contents($cesta);
    if ($obsah === false) {
        return false;
    }
    $data = json_decode($obsah, true);
    if (!is_array($data)) {
        return false;
    }
    return cm_uloz($jmeno, $data);
}

function cm_heslo_nastaveno(): bool
{
    $heslo = cm_nacti('heslo');
    return isset($heslo['hash']) && is_string($heslo['hash']) && $heslo['hash'] !== '';
}

function cm_zalozeni_povoleno(): bool
{
    return is_file(cm_slozka() . '/zalozit-heslo') && !cm_heslo_nastaveno();
}

function cm_nastav_heslo(string $heslo, string $potvrzeni): array
{
    if (mb_strlen($heslo) < 10) {
        return ['ok' => false, 'chyba' => 'Heslo musí mít aspoň 10 znaků.'];
    }
    if ($heslo !== $potvrzeni) {
        return ['ok' => false, 'chyba' => 'Hesla se neshodují.'];
    }
    cm_uloz('heslo', ['hash' => password_hash($heslo, PASSWORD_DEFAULT), 'zmeneno' => date('c')]);
    $priznak = cm_slozka() . '/zalozit-heslo';
    if (is_file($priznak)) {
        @unlink($priznak);
    }
    return ['ok' => true, 'chyba' => ''];
}

function cm_over_heslo(string $heslo): bool
{
    if ($heslo === '' || !cm_heslo_nastaveno()) {
        return false;
    }
    return password_verify($heslo, cm_nacti('heslo')['hash']);
}

function cm_brzda_zaznamenej(string $ip, ?int $ted = null): void
{
    $ted = $ted ?? time();
    $brzda = cm_nacti('brzda');
    $brzda[$ip][] = $ted;
    foreach ($brzda as $adresa => $casys) {
        $brzda[$adresa] = array_values(array_filter($casys, static fn ($cas) => $cas > $ted - 900));
        if ($brzda[$adresa] === []) {
            unset($brzda[$adresa]);
        }
    }
    cm_zapis_primo('brzda', $brzda);
}

function cm_brzda_blokovano(string $ip, ?int $ted = null): bool
{
    $ted = $ted ?? time();
    $casys = cm_nacti('brzda');
    $casys = $casys[$ip] ?? [];
    $zpeti = count(array_filter($casys, static fn ($cas) => $cas > $ted - 900));
    return $zpeti >= 8;
}

function cm_brzda_vymaz(string $ip): void
{
    $brzda = cm_nacti('brzda');
    unset($brzda[$ip]);
    cm_zapis_primo('brzda', $brzda);
}

/** Atomický zápis bez zálohování (pro brzdu, ať neplní zalohy/). */
function cm_zapis_primo(string $jmeno, array $data): void
{
    $jmeno = cm_jmeno($jmeno);
    $slozka = cm_slozka();
    $cile = $slozka . '/' . $jmeno . '.json';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return;
    }
    $docasny = $slozka . '/' . $jmeno . '.' . bin2hex(random_bytes(8)) . '.tmp';
    if (file_put_contents($docasny, $json) === false) {
        return;
    }
    if (!rename($docasny, $cile) && is_file($docasny)) {
        @unlink($docasny);
    }
    if (function_exists('opcache_invalidate')) {
        opcache_invalidate($cile, true);
    }
}

function cm_relace(): void
{
    if (PHP_SAPI === 'cli') {
        return;
    }
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']),
            'path' => '/',
        ]);
        session_name('cmadmin');
        session_start();
    }
}

function cm_prihlas(): void
{
    cm_relace();
    if (PHP_SAPI === 'cli') {
        $GLOBALS['cm_prihlasen'] = true;
        return;
    }
    session_regenerate_id(true);
    $_SESSION['cm_prihlasen'] = true;
}

function cm_odhlas(): void
{
    if (PHP_SAPI === 'cli') {
        unset($GLOBALS['cm_prihlasen']);
        return;
    }
    cm_relace();
    $_SESSION = [];
    session_destroy();
}

function cm_prihlasen(): bool
{
    if (PHP_SAPI === 'cli') {
        return !empty($GLOBALS['cm_prihlasen']);
    }
    cm_relace();
    return ($_SESSION['cm_prihlasen'] ?? null) === true;
}

function cm_csrf_token(): string
{
    if (PHP_SAPI === 'cli') {
        if (empty($GLOBALS['cm_csrf'])) {
            $GLOBALS['cm_csrf'] = bin2hex(random_bytes(16));
        }
        return $GLOBALS['cm_csrf'];
    }
    cm_relace();
    if (empty($_SESSION['cm_csrf'])) {
        $_SESSION['cm_csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['cm_csrf'];
}

function cm_over_csrf(string $token): bool
{
    if (PHP_SAPI === 'cli') {
        $ulozeny = $GLOBALS['cm_csrf'] ?? '';
    } else {
        cm_relace();
        $ulozeny = $_SESSION['cm_csrf'] ?? '';
    }
    if ($ulozeny === '' || $token === '') {
        return false;
    }
    return hash_equals($ulozeny, $token);
}

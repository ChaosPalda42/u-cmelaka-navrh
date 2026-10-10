<?php
// C-011 — Pomocníci pro stránky v PHP (stejný výstup jako JS moduly ze src/lib).

declare(strict_types=1);

const CM_NBSP = "\u{00a0}";
const CM_POMLCKA = " \u{2013} ";

const CM_DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
const CM_DNY_K = ["po", "út", "st", "čt", "pá", "so", "ne"];
const CM_MESICE_2P = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
];

/** Jako formatCena: tisíce oddělené U+00A0, pak U+00A0 a "Kč". */
function cm_format_cena(int $kc): string
{
    $n = $kc;
    $cislice = (string) abs($n);
    $casti = [];
    while (strlen($cislice) > 3) {
        array_unshift($casti, substr($cislice, -3));
        $cislice = substr($cislice, 0, -3);
    }
    array_unshift($casti, $cislice);
    $predpona = $n < 0 ? "-" : "";
    return $predpona . implode(CM_NBSP, $casti) . CM_NBSP . "Kč";
}

function cm_stejna_doba(?array $a, ?array $b): bool
{
    if ($a === null || $b === null) {
        return $a === $b;
    }
    return $a["od"] === $b["od"] && $a["do"] === $b["do"];
}

/** Jako tydenRadky: [["dny" => …, "cas" => …], …], pomlčka U+2013 s mezerami. */
function cm_tyden_radky(array $rozvrh): array
{
    $radky = [];
    $zacatek = 0;
    for ($i = 1; $i <= 7; $i++) {
        if ($i === 7 || !cm_stejna_doba($rozvrh[$i] ?? null, $rozvrh[$zacatek] ?? null)) {
            $dny = ($i - $zacatek === 1)
                ? CM_DNY[$zacatek]
                : CM_DNY[$zacatek] . CM_POMLCKA . CM_DNY[$i - 1];
            $cas = ($rozvrh[$zacatek] ?? null) === null
                ? "zavřeno"
                : $rozvrh[$zacatek]["od"] . CM_POMLCKA . $rozvrh[$zacatek]["do"];
            $radky[] = ["dny" => $dny, "cas" => $cas];
            $zacatek = $i;
        }
    }
    return $radky;
}

/** Pondělí = 0 … neděle = 6 pro datum "R-RR-DD". */
function cm_den_tydne(string $d): int
{
    $dt = DateTime::createFromFormat("Y-m-d", $d, new DateTimeZone("UTC"));
    if ($dt === false) {
        throw new InvalidArgumentException("neplatné datum: $d");
    }
    return (int) $dt->format("N") - 1;
}

/** Jako datumCesky ("sobota 17. října"). */
function cm_datum_cesky(string $d): string
{
    $casti = array_map("intval", explode("-", $d));
    [$r, $m, $den] = $casti;
    return CM_DNY[cm_den_tydne($d)] . " " . $den . ". " . CM_MESICE_2P[$m - 1];
}

/** Jako datumKratce ("so 17. 10."). */
function cm_datum_kratce(string $d): string
{
    $casti = array_map("intval", explode("-", $d));
    [$r, $m, $den] = $casti;
    return CM_DNY_K[cm_den_tydne($d)] . " " . $den . ". " . $m . ".";
}

/** Jako sklonuj. */
function cm_sklonuj(int $n, array $tvary): string
{
    $abs = abs($n);
    $tvar = $abs === 1 ? $tvary[0] : ($abs >= 2 && $abs <= 4 ? $tvary[1] : $tvary[2]);
    return $n . " " . $tvar;
}

/** htmlspecialchars; null -> "". */
function cm_e($v): string
{
    if ($v === null) {
        return "";
    }
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401, "UTF-8");
}

/** Text z administrace na HTML: nejdřív cm_e, pak *něco* -> <em>něco</em>, pak \n -> <br>. */
function cm_text_html(string $t): string
{
    $t = cm_e($t);
    $t = preg_replace('/\*([^*\n]+)\*/u', '<em>$1</em>', $t);
    $t = str_replace("\n", "<br>", $t);
    return $t;
}

/** "tel:" + telefon bez mezer; prázdný -> "". */
function cm_tel(string $telefon): string
{
    if ($telefon === "") {
        return "";
    }
    return "tel:" . str_replace(" ", "", $telefon);
}

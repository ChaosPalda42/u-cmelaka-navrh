<?php
/**
 * Stránky webu U Čmeláka skládané na serveru z uloženého obsahu.
 * Data: úložiště (cm_nacti) s výchozími hodnotami z inc/vychozi/*.json; SVG kresby z inc/svg.json (vyrábí build.mjs).
 */
require_once __DIR__ . "/jadro.php";
require_once __DIR__ . "/pomoc.php";
require_once __DIR__ . "/obsah-schema.php";

const CM_STITKY = ["vege" => "bez masa", "palive" => "pálivá", "smetana" => "smetanový základ"];
const CM_STRANKY = ["index", "menu", "objednavka", "zahrada", "akce", "kontakt"];

function cm_vychozi(string $jmeno): array
{
    $f = __DIR__ . "/vychozi/$jmeno.json";
    $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    return is_array($d) ? $d : [];
}

/** Všechna data webu: uložená, a kde chybí, výchozí. */
function cm_data(): array
{
    static $d = null;
    if ($d !== null) return $d;
    $obsah = cm_nacti("obsah", []);
    $texty = [];
    foreach (cm_obsah_schema() as $p) {
        $texty[$p["klic"]] = array_key_exists($p["klic"], $obsah) ? $obsah[$p["klic"]] : $p["vychozi"];
    }
    $d = [
        "podnik" => cm_nacti("podnik", cm_vychozi("podnik")),
        "menu" => cm_nacti("menu", cm_vychozi("menu")),
        "akce" => cm_nacti("akce", cm_vychozi("akce"))["akce"] ?? [],
        "texty" => $texty,
        "fotky" => cm_nacti("fotky", []),
        "manifest" => cm_vychozi("manifest"),
        "svg" => cm_vychozi("svg"),
    ];
    return $d;
}

function T(string $klic): string
{
    $v = cm_data()["texty"][$klic] ?? "";
    return is_array($v) ? implode("\n", $v) : (string) $v;
}
function H(string $klic): string { return cm_text_html(T($klic)); }
function L(string $klic): array
{
    $v = cm_data()["texty"][$klic] ?? [];
    return is_array($v) ? $v : array_values(array_filter(array_map("trim", explode("\n", (string) $v))));
}

/* ------------------------------------------------------------------ kresby */
function cm_ikona(string $jmeno, string $trida = ""): string
{
    $vnitrek = cm_data()["svg"]["ikony"][$jmeno] ?? "";
    return '<svg class="ik ' . cm_e($trida) . '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . $vnitrek . "</svg>";
}
function cm_cmelak(string $trida = ""): string
{
    return str_replace("%TRIDA%", cm_e($trida), cm_data()["svg"]["cmelak"] ?? "");
}
function cm_plastev(string $trida = ""): string
{
    return str_replace("%TRIDA%", cm_e($trida), cm_data()["svg"]["plastev"] ?? "");
}
function cm_logo(string $trida, string $id, string $popis = ""): string
{
    $aria = $popis !== "" ? 'role="img" aria-label="' . cm_e($popis) . '"' : 'aria-hidden="true" focusable="false"';
    return str_replace(["%TRIDA%", "%ID%", "%ARIA%"], [cm_e($trida), $id, $aria], cm_data()["svg"]["logo"] ?? "");
}
function cm_mapa(): string { return cm_data()["svg"]["mapa"] ?? ""; }

/* ------------------------------------------------------------------ fotky */
/** Fotka podle slotu (nahraná v administraci), nebo podle jména výchozí fotky. */
function cm_foto(string $klic, string $sizes = "100vw", bool $eager = false, string $trida = "", ?string $alt = null): string
{
    $D = cm_data();
    $slot = null;
    foreach (cm_foto_sloty() as $s) if ($s["id"] === $klic) $slot = $s;
    $nahrana = $D["fotky"][$klic] ?? null;
    $alt = $alt ?? ($nahrana["alt"] ?? null) ?? ($slot["alt"] ?? "");
    if ($nahrana && !empty($nahrana["verze"]) && !empty($nahrana["varianty"])) {
        $f = $nahrana;
        $cesta = fn($w, $ext) => "foto/{$f["jmeno"]}-{$f["verze"]}-$w.$ext";
    } else {
        $jmeno = $slot["vychozi"] ?? $klic;
        $f = $D["manifest"][$jmeno] ?? null;
        if (!$f) return '<div class="foto-chybi ' . cm_e($trida) . '" role="img" aria-label="' . cm_e($alt) . '"></div>';
        $cesta = fn($w, $ext) => "assets/foto/$jmeno-$w.$ext";
    }
    $srcset = fn($ext) => implode(", ", array_map(fn($w) => $cesta($w, $ext) . " {$w}w", $f["varianty"]));
    $stred = $f["varianty"][count($f["varianty"]) - 1];
    foreach ($f["varianty"] as $w) if ($w >= 1280) { $stred = $w; break; }
    return '<picture class="foto ' . cm_e($trida) . '"><source type="image/webp" srcset="' . $srcset("webp") . '" sizes="' . $sizes . '">'
        . '<img src="' . $cesta($stred, "jpg") . '" srcset="' . $srcset("jpg") . '" sizes="' . $sizes . '" width="' . (int) $f["sirka"] . '" height="' . (int) $f["vyska"] . '" alt="' . cm_e($alt) . '"'
        . ($eager ? ' fetchpriority="high"' : ' loading="lazy"') . ' decoding="async"></picture>';
}

/* ------------------------------------------------------------------ kousky */
function cm_karta_jidla(array $p): string
{
    $tl = !empty($p["objednat"])
        ? '<button class="pridat" type="button" data-pridat="' . cm_e($p["id"]) . '" aria-label="Přidat ' . cm_e($p["nazev"]) . ' do košíku">' . cm_ikona("plus") . "<span>Přidat</span></button>"
        : '<span class="jen-na-miste" title="Podáváme jen na místě">jen u nás</span>';
    $stitky = "";
    foreach ($p["stitky"] ?? [] as $s) $stitky .= '<span class="stitek stitek-' . cm_e($s) . '">' . cm_e(CM_STITKY[$s] ?? $s) . "</span>";
    $cena = ($p["cena"] ?? null) === null ? "dle nabídky" : cm_format_cena((int) $p["cena"]);
    return '<article class="jidlo" data-jidlo="' . cm_e($p["id"]) . '">'
        . '<div class="jidlo-hlava">' . (!empty($p["cislo"]) ? '<span class="jidlo-cislo" aria-hidden="true">' . (int) $p["cislo"] . "</span>" : "")
        . '<h3 class="jidlo-nazev">' . cm_e($p["nazev"]) . '</h3><span class="tecky" aria-hidden="true"></span><span class="jidlo-cena">' . $cena . "</span></div>"
        . (!empty($p["slozeni"]) ? '<p class="jidlo-slozeni">' . cm_e($p["slozeni"]) . "</p>" : "")
        . '<div class="jidlo-pata"><div class="stitky">' . $stitky . "</div>" . $tl . "</div></article>";
}

function cm_akce_karta(array $a): string
{
    $kr = explode(" ", cm_datum_kratce($a["datum"]));
    $pro = ["děti" => "pro děti", "dospělí" => "pro dospělé"][$a["pro"] ?? ""] ?? "pro všechny";
    $foto = !empty($a["foto"]) ? $a["foto"] : "";
    return '<article class="akce-karta" data-akce="' . cm_e($a["id"]) . '" data-datum="' . cm_e($a["datum"]) . '">'
        . ($foto !== "" ? '<div class="akce-foto">' . cm_foto($foto, "(min-width: 900px) 30vw, 90vw", false, "", "") . "</div>" : "")
        . '<div class="akce-datum"><span class="akce-den">' . cm_e($kr[1] ?? "") . '</span><span class="akce-mesic">' . cm_e(implode(" ", array_slice($kr, 2))) . '</span><span class="akce-dvt">' . cm_e($kr[0] ?? "") . "</span></div>"
        . '<div class="akce-telo"><p class="akce-meta"><span>' . cm_e(cm_datum_cesky($a["datum"])) . (!empty($a["cas"]) ? ", " . cm_e($a["cas"]) : "") . '</span><span class="akce-pro akce-pro-' . cm_e($a["pro"] ?? "všichni") . '">' . $pro . "</span></p>"
        . "<h3>" . cm_e($a["nazev"]) . "</h3>" . (!empty($a["text"]) ? "<p>" . cm_text_html($a["text"]) . "</p>" : "")
        . '<p class="akce-za" data-za-dni="' . cm_e($a["datum"]) . '"></p></div></article>';
}

/** Akce od dneška dál, seřazené. */
function cm_akce_budouci(): array
{
    $dnes = date("Y-m-d");
    $a = array_values(array_filter(cm_data()["akce"], fn($x) => ($x["datum"] ?? "") >= $dnes));
    usort($a, fn($x, $y) => strcmp(($x["datum"] ?? "") . ($x["cas"] ?: "99:99"), ($y["datum"] ?? "") . ($y["cas"] ?: "99:99")));
    return $a;
}

function cm_vycet(array $polozky, array $ikony): string
{
    $out = "";
    foreach (array_values($polozky) as $i => $text) $out .= "<li>" . cm_ikona($ikony[$i % count($ikony)]) . cm_text_html($text) . "</li>";
    return $out === "" ? "" : '<ul class="vycet">' . $out . "</ul>";
}

function cm_hodiny_html(string $trida): string
{
    $out = "";
    foreach (cm_tyden_radky(cm_data()["podnik"]["rozvrh"] ?? []) as $r) $out .= "<div><dt>" . cm_e($r["dny"]) . "</dt><dd>" . cm_e($r["cas"]) . "</dd></div>";
    return '<dl class="' . $trida . '">' . $out . "</dl>";
}

/* ------------------------------------------------------------------ stránky */
function cm_stranka_index(): string
{
    $D = cm_data();
    $p = $D["podnik"];
    $tel = cm_e($p["telefon"] ?? "");
    $oblibene = array_values(array_filter($D["menu"]["polozky"] ?? [], fn($x) => !empty($x["na_uvodu"])));
    $akce = array_slice(cm_akce_budouci(), 0, 3);
    $pravidla = "";
    for ($i = 1; $i <= 4; $i++) {
        if (trim(T("uvod.pravidlo{$i}_nadpis")) === "") continue;
        $pravidla .= "<li><strong>" . H("uvod.pravidlo{$i}_nadpis") . "</strong> " . H("uvod.pravidlo{$i}_text") . "</li>";
    }
    ob_start(); ?>
<section class="hero">
  <div class="hero-text">
    <p class="nadtitul"><?= H("uvod.nadtitul") ?></p>
    <h1><?= H("uvod.nadpis") ?></h1>
    <p class="perex"><?= H("uvod.perex") ?></p>
    <div class="tlacitka">
      <a class="btn btn-med" href="objednavka.html" data-pristani><?= cm_ikona("pizza") ?>Objednat na vyzvednutí</a>
      <a class="btn btn-obrys" href="menu.html">Jídelní lístek</a>
    </div>
    <div class="dnes" data-dnes>
      <div class="dnes-radek"><?= cm_ikona("hodiny") ?><span><strong data-stav-text>Otevírací dobu najdete dole</strong></span></div>
      <div class="dnes-radek" data-dnes-slot hidden><?= cm_ikona("pizza") ?><span>Nejbližší vyzvednutí <strong data-slot-cas></strong></span></div>
    </div>
  </div>
  <div class="hero-obraz">
    <div class="hero-blob"><?= cm_foto("hero", "(min-width: 900px) 55vw, 100vw", true) ?></div>
    <div class="hero-cedule" aria-hidden="true"><?= cm_logo("", "lgo") ?></div>
  </div>
  <svg class="let" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true"><path data-let-cesta d="M1180 70 C 1000 -20, 860 160, 960 210 S 1150 150, 1010 300 S 640 260, 560 360 S 380 520, 250 470"/></svg>
  <div class="letec" data-letec aria-hidden="true"><?= cm_cmelak("letec-cmelak") ?></div>
</section>

<section class="pas pas-kroky" aria-labelledby="sebou-h">
  <div class="sekce-hlava">
    <p class="nadtitul"><?= H("uvod.sebou_nadtitul") ?></p>
    <h2 id="sebou-h"><?= H("uvod.sebou_nadpis") ?></h2>
  </div>
  <ol class="kroky">
    <li><span class="krok-cislo">1</span><h3><?= H("uvod.krok1_nadpis") ?></h3><p><?= H("uvod.krok1_text") ?><?php if ($tel !== ""): ?> <a href="<?= cm_e(cm_tel($p["telefon"])) ?>"><?= $tel ?></a><?php endif ?></p></li>
    <li><span class="krok-cislo">2</span><h3><?= H("uvod.krok2_nadpis") ?></h3><p><?= H("uvod.krok2_text") ?></p></li>
    <li><span class="krok-cislo">3</span><h3><?= H("uvod.krok3_nadpis") ?></h3><p><?= H("uvod.krok3_text") ?></p></li>
  </ol>
  <p class="kroky-cta"><a class="btn btn-med" href="objednavka.html">Sestavit objednávku <?= cm_ikona("sipka") ?></a></p>
</section>

<section class="zahrada-uvod" aria-labelledby="zahrada-h">
  <div class="zahrada-fotky">
    <div class="zf zf-1"><?= cm_foto("uvod-koutek", "(min-width: 900px) 34vw, 90vw") ?></div>
    <div class="zf zf-2"><?= cm_foto("uvod-oslava", "(min-width: 900px) 24vw, 60vw") ?></div>
    <?= cm_plastev("zf-plastev") ?>
  </div>
  <div class="zahrada-text">
    <p class="nadtitul"><?= H("uvod.zahrada_nadtitul") ?></p>
    <h2 id="zahrada-h"><?= H("uvod.zahrada_nadpis") ?></h2>
    <p><?= H("uvod.zahrada_text") ?></p>
    <?= cm_vycet(L("uvod.zahrada_body"), ["dite", "strom", "zidle", "wifi"]) ?>
    <a class="odkaz-sipka" href="zahrada.html">Jak to u nás vypadá <?= cm_ikona("sipka") ?></a>
  </div>
</section>

<?php if ($oblibene): ?>
<section class="pas pas-listek" aria-labelledby="listek-h">
  <div class="sekce-hlava sekce-hlava-radek">
    <div><p class="nadtitul">Z lístku</p><h2 id="listek-h"><?= H("uvod.listek_nadpis") ?></h2></div>
    <a class="odkaz-sipka" href="menu.html">Celý jídelní lístek <?= cm_ikona("sipka") ?></a>
  </div>
  <div class="listek-uvod">
    <div class="listek-foto"><?= cm_foto("uvod-pizza", "(min-width: 900px) 40vw, 100vw") ?><?php if (T("uvod.listek_pozn") !== ""): ?><p class="listek-foto-pozn"><?= H("uvod.listek_pozn") ?></p><?php endif ?></div>
    <div class="listek-karty"><?= implode("", array_map("cm_karta_jidla", array_slice($oblibene, 0, 6))) ?></div>
  </div>
</section>
<?php endif ?>

<?php if ($akce): ?>
<section class="pas pas-akce" aria-labelledby="akce-h">
  <div class="sekce-hlava sekce-hlava-radek">
    <div><p class="nadtitul"><?= H("uvod.akce_nadtitul") ?></p><h2 id="akce-h"><?= H("uvod.akce_nadpis") ?></h2></div>
    <a class="odkaz-sipka" href="akce.html">Celý program <?= cm_ikona("sipka") ?></a>
  </div>
  <div class="akce-mrizka" data-akce-seznam data-limit="3"><?= implode("", array_map("cm_akce_karta", $akce)) ?></div>
</section>
<?php endif ?>

<?php if ($pravidla !== ""): ?>
<section class="pravidla" aria-labelledby="pravidla-h">
  <div class="pravidla-in">
    <?= cm_cmelak("pravidla-cmelak") ?>
    <div>
      <p class="nadtitul"><?= H("uvod.pravidla_nadtitul") ?></p>
      <h2 id="pravidla-h"><?= H("uvod.pravidla_nadpis") ?></h2>
      <ul class="pravidla-seznam"><?= $pravidla ?></ul>
    </div>
  </div>
</section>
<?php endif ?>

<section class="pas pas-kontakt" aria-labelledby="kontakt-h">
  <div class="kontakt-uvod">
    <div class="kontakt-text">
      <p class="nadtitul">Kde nás najdete</p>
      <h2 id="kontakt-h"><?= cm_e($p["adresa"]["ulice"] ?? "") ?>, <?= cm_e($p["adresa"]["obec"] ?? "") ?></h2>
      <?= cm_hodiny_html("hodiny") ?>
      <?php if ($tel !== ""): ?><p class="kontakt-tel"><a class="btn btn-obrys" href="<?= cm_e(cm_tel($p["telefon"])) ?>"><?= cm_ikona("telefon") ?><?= $tel ?></a></p><?php endif ?>
    </div>
    <a class="mapa-ram" href="kontakt.html" aria-label="Mapa a cesta k nám"><?= cm_mapa() ?></a>
  </div>
</section>
<?php
    return (string) ob_get_clean();
}

function cm_stranka_menu(): string
{
    $m = cm_data()["menu"];
    $kat = $m["kategorie"] ?? [];
    $pol = $m["polozky"] ?? [];
    ob_start(); ?>
<section class="stranka-hlava stranka-hlava-menu">
  <p class="nadtitul">Jídelní lístek</p>
  <h1><?= H("menu.nadpis") ?></h1>
  <p class="perex"><?= H("menu.perex") ?></p>
</section>

<section class="filtry" aria-label="Filtr jídelního lístku" data-filtry>
  <label class="hledat"><?= cm_ikona("hledat") ?><span class="sr">Hledat v lístku</span><input type="search" placeholder="Hledat – třeba „slanina“ nebo „bez masa“" data-hledat autocomplete="off"></label>
  <div class="chipy" role="group" aria-label="Kategorie">
    <button type="button" class="chip" data-kat="" aria-pressed="true">Vše</button>
    <?php foreach ($kat as $c): ?><button type="button" class="chip" data-kat="<?= cm_e($c["id"]) ?>" aria-pressed="false"><?= cm_e($c["nazev"]) ?></button><?php endforeach ?>
  </div>
  <div class="chipy" role="group" aria-label="Vlastnosti">
    <?php foreach (CM_STITKY as $s => $n): ?><button type="button" class="chip chip-stitek" data-stitek="<?= $s ?>" aria-pressed="false"><?= $n ?></button><?php endforeach ?>
  </div>
</section>

<div class="listek-obsah" data-listek>
<?php foreach ($kat as $i => $c):
    $polozky = array_values(array_filter($pol, fn($x) => ($x["kategorie"] ?? "") === $c["id"]));
    if (!$polozky) continue;
    $kompakt = count(array_filter($polozky, fn($x) => !empty($x["objednat"]))) * 2 < count($polozky); ?>
<section class="listek-skupina" data-skupina="<?= cm_e($c["id"]) ?>" aria-labelledby="k-<?= cm_e($c["id"]) ?>">
  <header class="skupina-hlava"><h2 id="k-<?= cm_e($c["id"]) ?>"><?= cm_e($c["nazev"]) ?></h2><?php if (!empty($c["popis"])): ?><p><?= cm_e($c["popis"]) ?></p><?php endif ?></header>
  <?php if ($i === 0 && !empty($m["priplatky_text"])): ?><div class="priplatky-info"><?= cm_ikona("plus") ?><p><strong>Něco navíc?</strong> <?= cm_e($m["priplatky_text"]) ?></p></div><?php endif ?>
  <div class="jidla<?= $kompakt ? " jidla-kompakt" : "" ?>"><?= implode("", array_map("cm_karta_jidla", $polozky)) ?></div>
</section>
<?php endforeach ?>
<p class="nic-nenalezeno" data-nic hidden>Tohle na lístku nemáme. Zkuste jiné slovo – nebo se zeptejte u baru, třeba to upečeme.</p>
</div>

<?php if (T("menu.alergeny") !== ""): ?><p class="alergeny-pozn"><?= H("menu.alergeny") ?></p><?php endif ?>

<dialog class="dialog" data-dialog-pizza aria-labelledby="dp-nazev">
  <form method="dialog" class="dialog-in" data-dialog-form>
    <button class="dialog-zavrit ikona-btn" value="zrusit" aria-label="Zavřít"><?= cm_ikona("krizek") ?></button>
    <p class="nadtitul">Do košíku</p>
    <h2 id="dp-nazev" data-dp-nazev></h2>
    <p class="dialog-slozeni" data-dp-slozeni></p>
    <fieldset class="priplatky"><legend>Přidat navíc</legend>
      <?php foreach ($m["priplatky"] ?? [] as $x): ?><label class="priplatek"><input type="checkbox" name="priplatek" value="<?= cm_e($x["id"]) ?>"><span><?= cm_e($x["nazev"]) ?></span><span class="priplatek-cena">+<?= cm_format_cena((int) $x["cena"]) ?></span></label><?php endforeach ?>
    </fieldset>
    <div class="dialog-pata">
      <div class="pocitadlo" data-pocitadlo><button type="button" data-ubrat aria-label="Ubrat"><?= cm_ikona("minus") ?></button><output data-dp-pocet>1</output><button type="button" data-pridat-kus aria-label="Přidat kus"><?= cm_ikona("plus") ?></button></div>
      <button class="btn btn-med" value="pridat" data-dp-potvrdit>Přidat · <span data-dp-cena></span></button>
    </div>
  </form>
</dialog>
<div class="toast" data-toast role="status" aria-live="polite" hidden></div>
<?php
    return (string) ob_get_clean();
}

function cm_objednavky_emailem(): bool
{
    $o = cm_data()["podnik"]["objednavky"] ?? [];
    return !empty($o["zapnuto"]) && filter_var((string) ($o["email"] ?? ""), FILTER_VALIDATE_EMAIL);
}

function cm_stranka_objednavka(): string
{
    $p = cm_data()["podnik"];
    $email = cm_objednavky_emailem();
    ob_start(); ?>
<section class="stranka-hlava">
  <p class="nadtitul">Na vyzvednutí</p>
  <h1><?= H("objednavka.nadpis") ?></h1>
  <p class="perex"><?= H("objednavka.perex") ?></p>
</section>

<div class="objednavka" data-objednavka>
  <section class="obj-kosik" aria-labelledby="kosik-h">
    <h2 id="kosik-h"><?= cm_ikona("kosik") ?>Košík</h2>
    <div data-kosik-radky></div>
    <div class="kosik-prazdny" data-kosik-prazdny>
      <?= cm_cmelak("prazdny-cmelak") ?>
      <p>Košík je zatím prázdný.</p>
      <a class="btn btn-med" href="menu.html">Vybrat z lístku</a>
    </div>
    <dl class="souhrn" data-souhrn hidden>
      <div><dt>Jídlo a pití</dt><dd data-s-mezisoucet></dd></div>
      <div><dt data-s-krabice-popis>Krabice</dt><dd data-s-obaly></dd></div>
      <div class="souhrn-celkem"><dt>Celkem při vyzvednutí</dt><dd data-s-celkem></dd></div>
    </dl>
    <a class="odkaz-sipka" href="menu.html" data-pridat-dalsi hidden>Přidat ještě něco <?= cm_ikona("sipka") ?></a>
  </section>

  <form class="obj-form" data-obj-form novalidate aria-labelledby="udaje-h">
    <fieldset class="obj-cas">
      <legend><span class="krok-cislo">1</span>Kdy si přijdete?</legend>
      <p class="obj-stav" data-obj-stav></p>
      <div class="sloty" data-sloty role="radiogroup" aria-label="Čas vyzvednutí"></div>
      <p class="chyba" data-chyba="cas" hidden></p>
      <p class="pozn" data-priprava></p>
    </fieldset>
    <?php if ($email): ?>
    <fieldset class="obj-udaje">
      <legend id="udaje-h"><span class="krok-cislo">2</span>Na koho to bude?</legend>
      <div class="pole"><label for="o-jmeno">Jméno</label><input id="o-jmeno" name="jmeno" autocomplete="name" required><p class="chyba" data-chyba="jmeno" hidden></p></div>
      <div class="pole"><label for="o-telefon">Telefon</label><input id="o-telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" placeholder="777 123 456" required><p class="chyba" data-chyba="telefon" hidden></p><p class="pozn">Zavoláme jen, kdyby se něco nepovedlo.</p></div>
      <div class="pole"><label for="o-email">E-mail <span class="nepovinne">nepovinné – pošleme potvrzení</span></label><input id="o-email" name="email" type="email" autocomplete="email"><p class="chyba" data-chyba="email" hidden></p></div>
      <div class="pole"><label for="o-poznamka">Poznámka <span class="nepovinne">nepovinné</span></label><textarea id="o-poznamka" name="poznamka" rows="2" maxlength="300" placeholder="Třeba „bez oliv“ nebo „nakrájet na menší kousky pro děti“"></textarea><p class="chyba" data-chyba="poznamka" hidden></p></div>
      <label class="souhlas"><input type="checkbox" name="souhlas"><span>Souhlasím, aby U Čmeláka použil jméno a telefon k vyřízení objednávky.</span></label>
      <p class="chyba" data-chyba="souhlas" hidden></p>
      <input class="sr" type="text" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">
    </fieldset>
    <?php endif ?>
    <p class="chyba chyba-kosik" data-chyba="kosik" hidden></p>
    <button class="btn btn-med btn-velke" type="submit" data-odeslat><?= $email ? "Odeslat objednávku" : "Hotovo – co nám říct do telefonu" ?> <span data-odeslat-cena></span></button>
    <?php if (!$email): ?><p class="pozn pozn-stred">Objednávky zatím bereme telefonem na <a href="<?= cm_e(cm_tel($p["telefon"] ?? "")) ?>"><?= cm_e($p["telefon"] ?? "") ?></a>. Tady si ji v klidu sestavíte a pak jen nadiktujete.</p><?php endif ?>
  </form>
</div>

<section class="potvrzeni" data-potvrzeni hidden tabindex="-1" aria-labelledby="potvrzeni-h">
  <?= cm_cmelak("potvrzeni-cmelak") ?>
<?php if ($email): ?>
  <p class="nadtitul">Objednávka odeslána</p>
  <h2 id="potvrzeni-h">Díky! Pizzu chystáme na <span data-p-cas></span>.</h2>
  <p>Kdyby bylo potřeba něco upřesnit, zavoláme vám. Najdete nás v ulici <?= cm_e($p["adresa"]["ulice"] ?? "") ?>, zaplatíte u baru kartou nebo hotově.</p>
  <div class="kuchyne"><p class="kuchyne-popis">Co jsme od vás dostali:</p><pre data-p-text></pre></div>
<?php else: ?>
  <p class="nadtitul">Skoro hotovo</p>
  <h2 id="potvrzeni-h">Teď nám zavolejte – na <span data-p-cas></span> to bude.</h2>
  <p><a class="btn btn-med btn-velke" href="<?= cm_e(cm_tel($p["telefon"] ?? "")) ?>"><?= cm_ikona("telefon") ?>Zavolat <?= cm_e($p["telefon"] ?? "") ?></a></p>
  <div class="kuchyne"><p class="kuchyne-popis">Do telefonu nám stačí říct:</p><pre data-p-text></pre></div>
  <p class="pozn">Zaplatíte až při vyzvednutí, kartou nebo hotově.</p>
<?php endif ?>
  <p><a class="btn btn-obrys" href="menu.html">Zpět na lístek</a></p>
</section>
<?php
    return (string) ob_get_clean();
}

function cm_stranka_zahrada(): string
{
    ob_start(); ?>
<section class="stranka-hlava stranka-hlava-foto">
  <div>
    <p class="nadtitul">Zahrada a děti</p>
    <h1><?= H("zahrada.nadpis") ?></h1>
    <p class="perex"><?= H("zahrada.perex") ?></p>
  </div>
  <div class="hlava-foto"><?= cm_foto("zahrada-hlava", "(min-width: 900px) 50vw, 100vw", true) ?></div>
</section>

<section class="pas dvojice">
  <div class="dvojice-foto"><?= cm_foto("zahrada-koutek", "(min-width: 900px) 45vw, 100vw") ?></div>
  <div>
    <p class="nadtitul"><?= H("zahrada.koutek_nadtitul") ?></p>
    <h2><?= H("zahrada.koutek_nadpis") ?></h2>
    <p><?= H("zahrada.koutek_text") ?></p>
    <?= cm_vycet(L("zahrada.koutek_body"), ["dite", "zidle", "list", "slunce"]) ?>
  </div>
</section>

<section class="pas dvojice dvojice-obracene">
  <div class="dvojice-foto"><?= cm_foto("zahrada-terasa", "(min-width: 900px) 45vw, 100vw") ?></div>
  <div>
    <p class="nadtitul"><?= H("zahrada.terasa_nadtitul") ?></p>
    <h2><?= H("zahrada.terasa_nadpis") ?></h2>
    <p><?= H("zahrada.terasa_text") ?></p>
    <?= cm_vycet(L("zahrada.terasa_body"), ["strom", "ohen", "wifi", "karta"]) ?>
  </div>
</section>

<section class="mozaika" aria-label="Fotografie">
  <?php for ($i = 1; $i <= 4; $i++): ?><div class="mz mz-<?= $i ?>"><?= cm_foto("mozaika-$i", "(min-width: 900px) 25vw, 50vw") ?></div><?php endfor ?>
</section>

<section class="pas pas-cta">
  <h2><?= H("zahrada.cta_nadpis") ?></h2>
  <p><?= H("zahrada.cta_text") ?></p>
  <a class="btn btn-med" href="akce.html#oslavy"><?= cm_ikona("balonky") ?>Poptat oslavu</a>
</section>
<?php
    return (string) ob_get_clean();
}

function cm_stranka_akce(): string
{
    $akce = cm_akce_budouci();
    ob_start(); ?>
<section class="stranka-hlava">
  <p class="nadtitul">Akce</p>
  <h1><?= H("akce.nadpis") ?></h1>
  <p class="perex"><?= H("akce.perex") ?></p>
</section>

<section class="pas">
  <div class="akce-seznam" data-akce-seznam><?= implode("", array_map("cm_akce_karta", $akce)) ?></div>
  <p class="nic-nenalezeno" data-akce-nic<?= $akce ? " hidden" : "" ?>><?= H("akce.prazdno") ?></p>
</section>

<section class="pas oslavy" id="oslavy" aria-labelledby="oslavy-h">
  <div class="oslavy-text">
    <p class="nadtitul"><?= H("akce.oslavy_nadtitul") ?></p>
    <h2 id="oslavy-h"><?= H("akce.oslavy_nadpis") ?></h2>
    <p><?= H("akce.oslavy_text") ?></p>
    <?= cm_vycet(L("akce.oslavy_body"), ["balonky", "pivo", "hudba", "dort"]) ?>
    <div class="oslavy-foto"><?= cm_foto("oslavy", "(min-width: 900px) 40vw, 100vw") ?></div>
  </div>
  <?php if (cm_objednavky_emailem()): ?>
  <form class="karta-form" data-oslava-form novalidate>
    <h3>Poptávka oslavy</h3>
    <div class="pole-radek">
      <div class="pole"><label for="os-datum">Kdy</label><input id="os-datum" name="datum" type="date" required><p class="chyba" data-chyba="datum" hidden></p></div>
      <div class="pole"><label for="os-hoste">Kolik vás bude</label><input id="os-hoste" name="hoste" type="number" min="4" max="120" inputmode="numeric" placeholder="např. 20" required><p class="chyba" data-chyba="hoste" hidden></p></div>
    </div>
    <div class="pole"><label for="os-typ">Co slavíte</label><select id="os-typ" name="typ"><option>Dětské narozeniny</option><option>Narozeniny, výročí</option><option>Křtiny</option><option>Sraz, rozlučka</option><option>Firemní akce</option><option>Něco jiného</option></select></div>
    <div class="pole"><label for="os-jmeno">Jméno</label><input id="os-jmeno" name="jmeno" autocomplete="name" required><p class="chyba" data-chyba="jmeno" hidden></p></div>
    <div class="pole"><label for="os-telefon">Telefon</label><input id="os-telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" required><p class="chyba" data-chyba="telefon" hidden></p></div>
    <div class="pole"><label for="os-zprava">Představa <span class="nepovinne">nepovinné</span></label><textarea id="os-zprava" name="zprava" rows="3"></textarea></div>
    <label class="souhlas"><input type="checkbox" name="souhlas"><span>Souhlasím se zpracováním údajů kvůli poptávce.</span></label>
    <p class="chyba" data-chyba="souhlas" hidden></p>
    <button class="btn btn-med" type="submit">Odeslat poptávku</button>
    <input class="sr" type="text" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="form-hotovo" data-hotovo hidden tabindex="-1"><strong>Díky!</strong> Ozveme se do druhého dne a domluvíme podrobnosti.</div>
    <p class="chyba" data-chyba-odeslani hidden></p>
  </form>
  <?php else: $p = cm_data()["podnik"]; ?>
  <div class="karta-form oslava-telefon">
    <h3>Domluvíme se po telefonu</h3>
    <p>Zavolejte nám, kdy a kolik vás bude – připravíme stůl, pizzu na prkýnkách i sud.</p>
    <p><a class="btn btn-med" href="<?= cm_e(cm_tel($p["telefon"] ?? "")) ?>"><?= cm_ikona("telefon") ?>Zavolat <?= cm_e($p["telefon"] ?? "") ?></a></p>
    <?php if (!empty($p["email"])): ?><p class="pozn">nebo napište na <a href="mailto:<?= cm_e($p["email"]) ?>"><?= cm_e($p["email"]) ?></a></p><?php endif ?>
  </div>
  <?php endif ?>
</section>
<?php
    return (string) ob_get_clean();
}

function cm_stranka_kontakt(): string
{
    $p = cm_data()["podnik"];
    $a = $p["adresa"] ?? [];
    $mapy = "https://mapy.cz/zakladni?q=" . rawurlencode(($a["ulice"] ?? "") . ", " . ($a["obec"] ?? ""));
    ob_start(); ?>
<section class="stranka-hlava">
  <p class="nadtitul">Kontakt</p>
  <h1><?= H("kontakt.nadpis") ?></h1>
</section>

<section class="pas kontakt">
  <div class="kontakt-karty">
    <div class="karta">
      <h2><?= cm_ikona("hodiny") ?>Otevřeno</h2>
      <?= cm_hodiny_html("hodiny") ?>
      <?php if (T("kontakt.hodiny_pozn") !== ""): ?><p class="pozn"><?= H("kontakt.hodiny_pozn") ?></p><?php endif ?>
    </div>
    <div class="karta">
      <h2><?= cm_ikona("telefon") ?>Zavolejte</h2>
      <p class="velky-tel"><a href="<?= cm_e(cm_tel($p["telefon"] ?? "")) ?>"><?= cm_e($p["telefon"] ?? "") ?></a></p>
      <?php if (T("kontakt.telefon_pozn") !== ""): ?><p><?= H("kontakt.telefon_pozn") ?></p><?php endif ?>
      <?php if (!empty($p["email"])): ?><p><a href="mailto:<?= cm_e($p["email"]) ?>"><?= cm_e($p["email"]) ?></a></p><?php endif ?>
    </div>
    <div class="karta">
      <h2><?= cm_ikona("mapa") ?>Adresa</h2>
      <p>U Čmeláka<br><?= cm_e($a["ulice"] ?? "") ?><br><?= cm_e($a["psc"] ?? "") ?> <?= cm_e($a["obec"] ?? "") ?></p>
      <p><a class="odkaz-sipka" href="<?= cm_e($mapy) ?>" rel="noopener" target="_blank">Otevřít v Mapy.cz <?= cm_ikona("sipka") ?></a></p>
      <?php if (!empty($p["ico"])): ?><p class="pozn">IČO <?= cm_e($p["ico"]) ?></p><?php endif ?>
    </div>
  </div>
  <div class="mapa-ram mapa-velka"><?= cm_mapa() ?></div>
  <?php if (T("kontakt.cesta") !== ""): ?><p class="pozn"><?= H("kontakt.cesta") ?></p><?php endif ?>
</section>
<?php
    return (string) ob_get_clean();
}

function cm_stranka_404(): string
{
    ob_start(); ?>
<section class="chyba-404">
  <?= cm_cmelak("ztraceny-cmelak") ?>
  <p class="nadtitul">Chyba 404</p>
  <h1>Tady čmelák nic nenašel</h1>
  <p class="perex">Stránka, kterou hledáte, odletěla. Zkuste úvod nebo rovnou lístek.</p>
  <div class="tlacitka"><a class="btn btn-med" href="/">Na úvod</a><a class="btn btn-obrys" href="/menu.html">Jídelní lístek</a></div>
</section>
<?php
    return (string) ob_get_clean();
}

/* ------------------------------------------------------------------ kostra */
const CM_NAV = [["index.html", "Úvod"], ["menu.html", "Jídelní lístek"], ["objednavka.html", "Na vyzvednutí"], ["zahrada.html", "Zahrada a děti"], ["akce.html", "Akce"], ["kontakt.html", "Kontakt"]];
const CM_TITULKY = [
    "index" => ["Bistro U Čmeláka – pizza z pece, terasa a dětský koutek | Nová Ves pod Pleší", "Pizza 32 cm z pece i s sebou, Pilsner z čepu, terasa a dětský koutek. Bistro U Čmeláka, Řadová 546, Nová Ves pod Pleší (u Mníšku pod Brdy)."],
    "menu" => ["Jídelní lístek a ceny – pizza, pochutiny, pití | Bistro U Čmeláka", "Pizzy z naší pece (32 cm) na tomatovém i smetanovém základu, pochutiny k pivu, Pilsner Urquell, víno a míchané nápoje. Aktuální ceny."],
    "objednavka" => ["Pizza s sebou – objednávka na vyzvednutí | Bistro U Čmeláka", "Objednejte si pizzu na vyzvednutí v Nové Vsi pod Pleší. Vyberete si čas, upečeme ji, než dojdete."],
    "zahrada" => ["Terasa a dětský koutek | Bistro U Čmeláka, Nová Ves pod Pleší", "Posezení na terase pod světýlky a dětský koutek s pískovištěm na dohled od stolů. Ideální na rodinné odpoledne i oslavy."],
    "akce" => ["Akce, koncerty a oslavy | Bistro U Čmeláka", "Program bistra U Čmeláka – koncerty na zahradě, kvízy, dětská odpoledne. Oslavu nebo narozeniny u nás uspořádáme i vám."],
    "kontakt" => ["Kontakt a otevírací doba | Bistro U Čmeláka, Řadová 546", "Řadová 546, 262 04 Nová Ves pod Pleší. Otevírací doba, telefon na objednávky a mapa, jak k nám."],
    "404" => ["Stránka nenalezena | Bistro U Čmeláka", "Tady čmelák nic nenašel."],
];

function cm_web_url(string $cesta = ""): string
{
    $domena = cm_data()["podnik"]["web"] ?? "bistroucmelaka.cz";
    return "https://" . $domena . "/" . ltrim($cesta, "/");
}

/** Absolutní adresa JPG fotky slotu (pro náhledy na sociálních sítích). */
function cm_foto_url(string $klic, int $chci = 1280): string
{
    $D = cm_data();
    $n = $D["fotky"][$klic] ?? null;
    if ($n && !empty($n["verze"])) {
        $w = end($n["varianty"]); foreach ($n["varianty"] as $x) if ($x >= $chci) { $w = $x; break; }
        return cm_web_url("foto/{$n["jmeno"]}-{$n["verze"]}-$w.jpg");
    }
    $jmeno = $klic; foreach (cm_foto_sloty() as $s) if ($s["id"] === $klic) $jmeno = $s["vychozi"];
    $m = $D["manifest"][$jmeno] ?? null;
    if (!$m) return "";
    $w = end($m["varianty"]); foreach ($m["varianty"] as $x) if ($x >= $chci) { $w = $x; break; }
    return cm_web_url("assets/foto/$jmeno-$w.jpg");
}

/** Strukturovaná data pro Google (schema.org JSON-LD). */
function cm_jsonld(string $stranka): string
{
    $D = cm_data();
    $p = $D["podnik"];
    $dny = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    $hodiny = [];
    foreach ($p["rozvrh"] ?? [] as $i => $r) if ($r) $hodiny[] = ["@type" => "OpeningHoursSpecification", "dayOfWeek" => $dny[$i], "opens" => $r["od"], "closes" => $r["do"]];
    $ceny = array_filter(array_map(fn($x) => $x["kategorie"] === "pizza" ? $x["cena"] : null, $D["menu"]["polozky"] ?? []), fn($c) => $c !== null);
    $podnik = array_filter([
        "@context" => "https://schema.org",
        "@type" => "Restaurant",
        "@id" => cm_web_url("#bistro"),
        "name" => "Bistro U Čmeláka",
        "alternateName" => "U Čmeláka",
        "url" => cm_web_url(),
        "image" => cm_foto_url("hero"),
        "logo" => cm_web_url("assets/logo-u-cmelaka.svg"),
        "telephone" => str_replace(" ", "", $p["telefon"] ?? ""),
        "email" => $p["email"] ?? "",
        "address" => ["@type" => "PostalAddress", "streetAddress" => $p["adresa"]["ulice"] ?? "", "postalCode" => $p["adresa"]["psc"] ?? "",
                      "addressLocality" => $p["adresa"]["obec"] ?? "", "addressRegion" => "Středočeský kraj", "addressCountry" => "CZ"],
        "geo" => isset($p["gps"]) ? ["@type" => "GeoCoordinates", "latitude" => $p["gps"]["lat"], "longitude" => $p["gps"]["lon"]] : null,
        "openingHoursSpecification" => $hodiny,
        "servesCuisine" => ["Pizza", "Bistro"],
        "priceRange" => $ceny ? min($ceny) . "–" . max($ceny) . " Kč" : null,
        "hasMenu" => cm_web_url("menu.html"),
        "acceptsReservations" => "True",
        "paymentAccepted" => "Hotovost, platební karta",
        "currenciesAccepted" => "CZK",
        "amenityFeature" => [
            ["@type" => "LocationFeatureSpecification", "name" => "Terasa", "value" => true],
            ["@type" => "LocationFeatureSpecification", "name" => "Dětský koutek", "value" => true],
            ["@type" => "LocationFeatureSpecification", "name" => "Wi-Fi", "value" => true],
        ],
    ], fn($v) => $v !== null && $v !== "" && $v !== []);
    $grafy = [$podnik];
    if ($stranka === "akce" || $stranka === "index") {
        foreach (cm_akce_budouci() as $a) {
            $grafy[] = array_filter([
                "@context" => "https://schema.org", "@type" => "Event", "name" => $a["nazev"],
                "startDate" => $a["datum"] . (!empty($a["cas"]) ? "T" . $a["cas"] . ":00+" . (date("I", strtotime($a["datum"])) ? "02:00" : "01:00") : ""),
                "description" => $a["text"] ?? "", "eventStatus" => "https://schema.org/EventScheduled",
                "eventAttendanceMode" => "https://schema.org/OfflineEventAttendanceMode",
                "location" => ["@type" => "Place", "name" => "Bistro U Čmeláka", "address" => $podnik["address"]],
                "organizer" => ["@type" => "Organization", "name" => "Bistro U Čmeláka", "url" => cm_web_url()],
                "image" => !empty($a["foto"]) ? cm_foto_url($a["foto"]) : cm_foto_url("hero"),
                "url" => cm_web_url("akce.html"),
            ], fn($v) => $v !== "");
        }
    }
    $out = "";
    foreach ($grafy as $g) $out .= '<script type="application/ld+json">' . str_replace("</", "<\\/", json_encode($g, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . "</script>\n";
    return $out;
}

/** sitemap.xml */
function cm_sitemap(): string
{
    $x = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach (CM_STRANKY as $s) {
        $x .= "  <url><loc>" . cm_e(cm_web_url($s === "index" ? "" : "$s.html")) . "</loc><changefreq>" . ($s === "akce" || $s === "menu" ? "weekly" : "monthly") . "</changefreq><priority>" . ($s === "index" ? "1.0" : "0.7") . "</priority></url>\n";
    }
    return $x . "</urlset>\n";
}

function cm_vykresli(string $stranka, string $verze = ""): string
{
    $D = cm_data();
    $p = $D["podnik"];
    if (!isset(CM_TITULKY[$stranka])) $stranka = "404";
    [$titulek, $popis] = CM_TITULKY[$stranka];
    $obsah = ["index" => "cm_stranka_index", "menu" => "cm_stranka_menu", "objednavka" => "cm_stranka_objednavka", "zahrada" => "cm_stranka_zahrada",
              "akce" => "cm_stranka_akce", "kontakt" => "cm_stranka_kontakt", "404" => "cm_stranka_404"][$stranka]();
    $v = $verze !== "" ? "?v=" . rawurlencode($verze) : "";
    $menuJs = array_values(array_map(fn($x) => ["id" => $x["id"], "nazev" => $x["nazev"], "cena" => (int) $x["cena"], "kategorie" => $x["kategorie"], "slozeni" => $x["slozeni"] ?? ""],
        array_filter($D["menu"]["polozky"] ?? [], fn($x) => !empty($x["objednat"]) && ($x["cena"] ?? null) !== null)));
    $data = ["rozvrh" => $p["rozvrh"] ?? [], "krabice" => (int) ($p["krabice"] ?? 0), "koren" => "", "emailem" => cm_objednavky_emailem(), "telefon" => $p["telefon"] ?? "", "menu" => ["polozky" => $menuJs, "priplatky" => $D["menu"]["priplatky"] ?? []]];
    $json = str_replace("<", "\\u003c", json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $aktivni = $stranka . ".html";
    ob_start(); ?>
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= cm_e($titulek) ?></title>
<meta name="description" content="<?= cm_e($popis) ?>">
<?php if (!empty($p["skryt_pred_vyhledavaci"]) || $stranka === "404"): ?><meta name="robots" content="noindex">
<?php endif ?>
<?php if ($stranka !== "404"): ?><link rel="canonical" href="<?= cm_e(cm_web_url($stranka === "index" ? "" : "$stranka.html")) ?>">
<meta property="og:type" content="restaurant">
<meta property="og:site_name" content="Bistro U Čmeláka">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="<?= cm_e($titulek) ?>">
<meta property="og:description" content="<?= cm_e($popis) ?>">
<meta property="og:url" content="<?= cm_e(cm_web_url($stranka === "index" ? "" : "$stranka.html")) ?>">
<meta property="og:image" content="<?= cm_e(cm_foto_url($stranka === "zahrada" ? "zahrada-hlava" : ($stranka === "menu" ? "uvod-pizza" : "hero"))) ?>">
<meta name="twitter:card" content="summary_large_image">
<?= cm_jsonld($stranka) ?>
<?php endif ?>
<meta name="theme-color" content="#fbf4e4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c150e" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<base href="/">
<link rel="preload" href="assets/fonts/fraunces-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/style.css<?= $v ?>">
<script>try{var t=localStorage.getItem("cm-tema");if(t)document.documentElement.dataset.tema=t}catch(e){}</script>
</head>
<body class="str-<?= $stranka === "index" ? "uvod" : $stranka ?>">
<a class="preskocit" href="#obsah">Přeskočit na obsah</a>
<header class="hlavicka" data-hlavicka>
  <div class="hlavicka-in">
    <a class="logo" href="/" aria-label="U Čmeláka – úvod"><?= cm_logo("logo-znak", "lgh") ?><span class="logo-text"><span class="logo-bistro">Bistro</span><span><span class="logo-u">U</span> Čmeláka</span></span></a>
    <nav class="nav" id="nav" aria-label="Hlavní navigace"><ul>
      <?php foreach (CM_NAV as [$href, $text]): ?><li><a href="<?= $href === "index.html" ? "/" : $href ?>"<?= $href === $aktivni ? ' aria-current="page"' : "" ?>><?= $text ?></a></li><?php endforeach ?>
    </ul></nav>
    <div class="hlavicka-akce">
      <span class="stav-pill" data-stav hidden><span class="stav-tecka"></span><span data-stav-text></span></span>
      <button class="ikona-btn" type="button" data-prepni-tema aria-label="Přepnout světlý a tmavý režim"><?= cm_ikona("mesic", "jen-svetly") ?><?= cm_ikona("slunce", "jen-tmavy") ?></button>
      <a class="kosik-btn" href="objednavka.html" data-kosik-btn aria-label="Košík"><?= cm_ikona("kosik") ?><span class="kosik-pocet" data-kosik-pocet hidden>0</span></a>
      <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    </div>
  </div>
</header>
<main id="obsah">
<?= $obsah ?>
</main>
<footer class="paticka">
  <div class="paticka-in">
    <div class="paticka-znacka">
      <?= cm_logo("paticka-logo", "lgf", "U Čmeláka – logo") ?>
      <p class="paticka-motto"><?= H("paticka.motto") ?></p>
    </div>
    <div>
      <h2 class="paticka-nadpis">Kde nás najdete</h2>
      <p><?= cm_e($p["adresa"]["ulice"] ?? "") ?><br><?= cm_e($p["adresa"]["psc"] ?? "") ?> <?= cm_e($p["adresa"]["obec"] ?? "") ?></p>
      <p><a href="<?= cm_e(cm_tel($p["telefon"] ?? "")) ?>"><?= cm_e($p["telefon"] ?? "") ?></a><?php if (!empty($p["email"])): ?><br><a href="mailto:<?= cm_e($p["email"]) ?>"><?= cm_e($p["email"]) ?></a><?php endif ?></p>
    </div>
    <div>
      <h2 class="paticka-nadpis">Otevřeno</h2>
      <?= cm_hodiny_html("hodiny-mini") ?>
    </div>
    <div>
      <h2 class="paticka-nadpis">Rychle</h2>
      <ul class="paticka-odkazy">
        <li><a href="objednavka.html">Objednat na vyzvednutí</a></li>
        <li><a href="menu.html">Jídelní lístek</a></li>
        <li><a href="akce.html#oslavy">Oslava u nás</a></li>
        <li><a href="kontakt.html">Jak k nám</a></li>
      </ul>
    </div>
  </div>
  <div class="paticka-spodek">
    <p>© <?= date("Y") ?> U Čmeláka<?= !empty($p["ico"]) ? " · IČO " . cm_e($p["ico"]) : "" ?></p>
    <?php if (T("paticka.poznamka") !== ""): ?><p class="ukazka-pozn"><?= H("paticka.poznamka") ?></p><?php endif ?>
  </div>
</footer>
<script>window.CM_DATA = <?= $json ?>;</script>
<script src="assets/knihovny.js<?= $v ?>"></script>
<script src="assets/web.js<?= $v ?>"></script>
</body>
</html>
<?php
    return (string) ob_get_clean();
}

<?php
/** Jen pro lokální náhled (php -S): napodobí pravidla z .htaccess. Na hosting se nenahrává. */
$cesta = (string) parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
if (preg_match('~^/inc(/|$)~', $cesta)) { http_response_code(403); exit; }
if ($cesta === "/admin") { header("Location: /admin/"); exit; }
if ($cesta === "/admin/") { require __DIR__ . "/admin/index.php"; return true; }
$soubor = __DIR__ . $cesta;
if ($cesta !== "/" && is_file($soubor)) {
    if (str_ends_with($soubor, ".php")) { require $soubor; return true; }
    return false;
}
if (preg_match('~^/(menu|objednavka|zahrada|akce|kontakt)\.html$~', $cesta, $m)) $_GET["s"] = $m[1];
elseif ($cesta === "/" || $cesta === "/index.html") $_GET["s"] = "index";
elseif ($cesta === "/sitemap.xml") $_GET["s"] = "sitemap";
else $_GET["s"] = "404";
require __DIR__ . "/index.php";
return true;

<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
/** Vstup webu: složí stránku z uloženého obsahu. */
require __DIR__ . "/inc/sablony.php";
require __DIR__ . "/inc/verze.php";

$s = (string) ($_GET["s"] ?? "");
if ($s === "") {
    $cesta = (string) parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
    $s = ($cesta === "/" || $cesta === "/index.php") ? "index" : preg_replace('~^/|\.html$~', "", $cesta);
}
if ($s === "sitemap" || $s === "sitemap.xml") {
    header("Content-Type: application/xml; charset=utf-8");
    echo cm_sitemap();
    exit;
}
if (!in_array($s, CM_STRANKY, true)) {
    http_response_code(404);
    $s = "404";
}
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-cache");
echo cm_vykresli($s, CM_VERZE);

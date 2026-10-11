<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
/** API administrace. Odpovídá vždy JSONem {ok, …}. Všechno kromě stavu a přihlášení chce přihlášení a CSRF token. */
require __DIR__ . "/../inc/jadro.php";
require __DIR__ . "/../inc/validace.php";
require __DIR__ . "/../inc/fotky.php";
require __DIR__ . "/../inc/sablony.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Robots-Tag: noindex");

function odpoved(array $d, int $kod = 200): never
{
    http_response_code($kod);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

cm_relace();
$akce = (string) ($_GET["akce"] ?? "");
$telo = [];
if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST" && str_starts_with((string) ($_SERVER["CONTENT_TYPE"] ?? ""), "application/json")) {
    $telo = json_decode((string) file_get_contents("php://input"), true);
    if (!is_array($telo)) $telo = [];
}
$ip = (string) ($_SERVER["REMOTE_ADDR"] ?? "");
$POSTUJE = ($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST";

/* ---------- bez přihlášení ---------- */
if ($akce === "stav") {
    odpoved(["ok" => true, "prihlasen" => cm_prihlasen(), "heslo_nastaveno" => cm_heslo_nastaveno(), "zalozeni_povoleno" => cm_zalozeni_povoleno(), "csrf" => cm_csrf_token()]);
}
if ($akce === "prihlasit" && $POSTUJE) {
    if (cm_brzda_blokovano($ip)) odpoved(["ok" => false, "chyba" => "Moc pokusů. Zkuste to prosím za čtvrt hodiny."], 429);
    if (!cm_over_heslo((string) ($telo["heslo"] ?? ""))) {
        cm_brzda_zaznamenej($ip);
        odpoved(["ok" => false, "chyba" => "Heslo nesedí."], 401);
    }
    cm_brzda_vymaz($ip);
    cm_prihlas();
    odpoved(["ok" => true, "csrf" => cm_csrf_token()]);
}
if ($akce === "zalozit" && $POSTUJE) {
    if (!cm_zalozeni_povoleno()) odpoved(["ok" => false, "chyba" => "Heslo už je nastavené."], 403);
    $r = cm_nastav_heslo((string) ($telo["heslo"] ?? ""), (string) ($telo["potvrzeni"] ?? ""));
    if (!$r["ok"]) odpoved(["ok" => false, "chyba" => $r["chyba"]], 400);
    cm_prihlas();
    odpoved(["ok" => true, "csrf" => cm_csrf_token()]);
}

/* ---------- dál jen přihlášený ---------- */
if (!cm_prihlasen()) odpoved(["ok" => false, "chyba" => "Nejste přihlášeni.", "odhlasen" => true], 401);
if ($POSTUJE && !cm_over_csrf((string) ($_SERVER["HTTP_X_CSRF"] ?? ""))) odpoved(["ok" => false, "chyba" => "Platnost stránky vypršela, načtěte ji prosím znovu."], 403);

const CM_CO = ["obsah", "menu", "akce", "podnik"];
$WEB = dirname(__DIR__);

function fotky_stav(): array
{
    $D = cm_data();
    $out = [];
    foreach (cm_foto_sloty() as $s) {
        $n = $D["fotky"][$s["id"]] ?? null;
        $out[] = ["id" => $s["id"], "nazev" => $s["nazev"], "alt" => $n["alt"] ?? $s["alt"], "nahrana" => !empty($n["verze"]), "nahled" => nahled($s["id"])];
    }
    return $out;
}

function nahled(string $klic): string
{
    $D = cm_data();
    $n = $D["fotky"][$klic] ?? null;
    if ($n && !empty($n["verze"])) return "/foto/{$n["jmeno"]}-{$n["verze"]}-{$n["varianty"][0]}.jpg";
    $vychozi = $klic;
    foreach (cm_foto_sloty() as $s) if ($s["id"] === $klic) $vychozi = $s["vychozi"];
    $m = $D["manifest"][$vychozi] ?? null;
    return $m ? "/assets/foto/$vychozi-{$m["varianty"][0]}.jpg" : "";
}

switch ($akce) {
    case "odhlasit":
        cm_odhlas();
        odpoved(["ok" => true]);

    case "nacti":
        $D = cm_data();
        $menu = cm_over_menu($D["menu"])["data"];
        $akceData = cm_over_akce(["akce" => $D["akce"]])["data"]["akce"];
        foreach ($akceData as &$a) $a["nahled"] = $a["foto"] !== "" ? nahled($a["foto"]) : "";
        unset($a);
        odpoved([
            "ok" => true,
            "skupiny" => cm_obsah_skupiny(),
            "obsah" => $D["texty"],
            "menu" => $menu,
            "akce" => $akceData,
            "podnik" => $D["podnik"],
            "fotky" => fotky_stav(),
            "vychozi_fotky" => array_values(array_unique(array_map(fn($s) => $s["vychozi"], cm_foto_sloty()))),
            "zalohy" => array_combine(CM_CO, array_map("cm_zalohy", CM_CO)),
        ]);

    case "uloz":
        $co = (string) ($telo["co"] ?? "");
        $data = $telo["data"] ?? [];
        if (!in_array($co, CM_CO, true)) odpoved(["ok" => false, "chyba" => "Neznámá sekce."], 400);
        $r = match ($co) {
            "obsah" => cm_over_obsah($data, cm_obsah_schema()),
            "menu" => cm_over_menu($data),
            "akce" => cm_over_akce(["akce" => $data]),
            "podnik" => cm_over_podnik($data),
        };
        if (!$r["ok"]) odpoved(["ok" => false, "chyba" => "Něco je potřeba opravit – je to označené červeně.", "chyby" => $r["chyby"]], 400);
        $ulozit = $r["data"];
        if ($co === "podnik") {
            $puvodni = cm_data()["podnik"];
            foreach (["ico", "gps", "web", "platby"] as $k) if (isset($puvodni[$k])) $ulozit[$k] = $puvodni[$k];
            $ulozit["skryt_pred_vyhledavaci"] = !empty($data["skryt_pred_vyhledavaci"]);
            $o = is_array($data["objednavky"] ?? null) ? $data["objednavky"] : [];
            $oEmail = mb_strtolower(trim((string) ($o["email"] ?? "")));
            if ($oEmail !== "" && !filter_var($oEmail, FILTER_VALIDATE_EMAIL)) {
                odpoved(["ok" => false, "chyba" => "Něco je potřeba opravit – je to označené červeně.", "chyby" => ["objednavky.email" => "E-mail nevypadá správně."]], 400);
            }
            if (!empty($o["zapnuto"]) && $oEmail === "") {
                odpoved(["ok" => false, "chyba" => "Něco je potřeba opravit – je to označené červeně.", "chyby" => ["objednavky.email" => "Napište, kam se mají objednávky posílat."]], 400);
            }
            $ulozit["objednavky"] = ["zapnuto" => !empty($o["zapnuto"]), "email" => $oEmail];
        }
        if ($co === "akce") {
            // fotky smazaných akcí uklidit
            $nove = array_column($ulozit["akce"], "foto");
            $fotky = cm_nacti("fotky", []);
            foreach (array_keys($fotky) as $k) {
                if (str_starts_with($k, "akce-") && !in_array($k, $nove, true)) {
                    cm_smaz_fotku($k, $WEB . "/foto");
                    unset($fotky[$k]);
                }
            }
            cm_uloz("fotky", $fotky);
        }
        if (!cm_uloz($co, $ulozit)) odpoved(["ok" => false, "chyba" => "Uložení se nepovedlo. Zkuste to prosím znovu."], 500);
        odpoved(["ok" => true, "zalohy" => cm_zalohy($co)]);

    case "nahraj_fotku":
        $klic = (string) ($_POST["slot"] ?? "");
        $sloty = array_column(cm_foto_sloty(), null, "id");
        $jeAkce = (bool) preg_match('/^akce-[a-z0-9-]{1,60}$/', $klic);
        if (!isset($sloty[$klic]) && !$jeAkce) odpoved(["ok" => false, "chyba" => "Neznámé místo pro fotku."], 400);
        $f = $_FILES["soubor"] ?? null;
        if (!$f || ($f["error"] ?? 1) !== UPLOAD_ERR_OK) {
            $chyba = ($f["error"] ?? 0) === UPLOAD_ERR_INI_SIZE ? "Fotka je moc velká." : "Fotka se nenahrála. Zkuste to prosím znovu.";
            odpoved(["ok" => false, "chyba" => $chyba], 400);
        }
        $pomer = $jeAkce ? 1.6 : ($sloty[$klic]["pomer"] ?? null);
        $r = cm_zpracuj_fotku($f["tmp_name"], $klic, $WEB . "/foto", [640, 1280, 1920], $pomer);
        if (!$r["ok"]) odpoved(["ok" => false, "chyba" => $r["chyba"]], 400);
        $fotky = cm_nacti("fotky", []);
        $alt = (string) ($_POST["alt"] ?? ($fotky[$klic]["alt"] ?? ($sloty[$klic]["alt"] ?? "")));
        $fotky[$klic] = ["jmeno" => $r["jmeno"], "verze" => $r["verze"], "sirka" => $r["sirka"], "vyska" => $r["vyska"], "varianty" => $r["varianty"], "alt" => $alt];
        cm_uloz("fotky", $fotky);
        odpoved(["ok" => true, "nahled" => "/foto/{$r["jmeno"]}-{$r["verze"]}-{$r["varianty"][0]}.jpg"]);

    case "foto_popis":
        $klic = (string) ($telo["slot"] ?? "");
        $fotky = cm_nacti("fotky", []);
        $alt = mb_substr(trim((string) ($telo["alt"] ?? "")), 0, 200);
        $fotky[$klic] = array_merge($fotky[$klic] ?? [], ["alt" => $alt]);
        cm_uloz("fotky", $fotky);
        odpoved(["ok" => true]);

    case "foto_puvodni":
        $klic = (string) ($telo["slot"] ?? "");
        $fotky = cm_nacti("fotky", []);
        cm_smaz_fotku($klic, $WEB . "/foto");
        unset($fotky[$klic]);
        cm_uloz("fotky", $fotky);
        odpoved(["ok" => true, "nahled" => nahled($klic)]);

    case "obnov":
        $co = (string) ($telo["co"] ?? "");
        if (!in_array($co, CM_CO, true) || !cm_obnov($co, (string) ($telo["zaloha"] ?? ""))) odpoved(["ok" => false, "chyba" => "Zálohu se nepovedlo obnovit."], 400);
        odpoved(["ok" => true]);

    case "zmen_heslo":
        if (!cm_over_heslo((string) ($telo["stare"] ?? ""))) odpoved(["ok" => false, "chyba" => "Současné heslo nesedí."], 400);
        $r = cm_nastav_heslo((string) ($telo["nove"] ?? ""), (string) ($telo["potvrzeni"] ?? ""));
        odpoved(["ok" => $r["ok"], "chyba" => $r["chyba"]], $r["ok"] ? 200 : 400);
}
odpoved(["ok" => false, "chyba" => "Neznámá akce."], 404);

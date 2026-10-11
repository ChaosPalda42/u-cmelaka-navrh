<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
/** Příjem objednávky s sebou a poptávky oslavy z webu. Posílá e-mail, jen když je to v administraci zapnuté. */
require __DIR__ . "/inc/sablony.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

function konec(array $d, int $kod = 200): never
{
    http_response_code($kod);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") konec(["ok" => false, "chyba" => "Jen POST."], 405);
$p = cm_data()["podnik"];
$nastaveni = $p["objednavky"] ?? [];
$komu = (string) ($nastaveni["email"] ?? "");
if (empty($nastaveni["zapnuto"]) || !filter_var($komu, FILTER_VALIDATE_EMAIL)) {
    konec(["ok" => false, "rezim" => "telefon", "chyba" => "Objednávky přes web teď nepřijímáme – zavolejte nám prosím."], 409);
}

$d = json_decode((string) file_get_contents("php://input"), true);
if (!is_array($d)) konec(["ok" => false, "chyba" => "Nesrozumitelná objednávka."], 400);
if (!empty($d["web"])) konec(["ok" => true]); // past na roboty (skryté pole)

$ip = "obj:" . ($_SERVER["REMOTE_ADDR"] ?? "");
if (cm_brzda_blokovano($ip)) konec(["ok" => false, "chyba" => "Moc objednávek najednou. Zavolejte nám prosím."], 429);
cm_brzda_zaznamenej($ip);

$typ = ($d["typ"] ?? "") === "oslava" ? "oslava" : "objednavka";
$jmeno = trim(mb_substr((string) ($d["jmeno"] ?? ""), 0, 60));
$telefon = trim(mb_substr((string) ($d["telefon"] ?? ""), 0, 30));
$text = trim(mb_substr((string) ($d["text"] ?? ""), 0, 4000));
if (mb_strlen($jmeno) < 2 || !preg_match('/^[+0-9 ()\/-]{9,}$/', $telefon) || $text === "") {
    konec(["ok" => false, "chyba" => "Chybí jméno, telefon nebo obsah objednávky."], 400);
}

$predmet = $typ === "oslava" ? "Poptávka oslavy z webu – $jmeno" : "Objednávka s sebou z webu – $jmeno";
$telo = $text . "\n\n—\nOdesláno z webu " . cm_web_url() . " " . date("j. n. Y H:i") . "\nZákazníkovi zavolejte na $telefon, pokud je cokoli potřeba upřesnit.";
$od = "web@" . ($p["web"] ?? "bistroucmelaka.cz");
$hlavicky = [
    "From: Web U Čmeláka <$od>",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "MIME-Version: 1.0",
];
$email = filter_var((string) ($d["email"] ?? ""), FILTER_VALIDATE_EMAIL);
if ($email) $hlavicky[] = "Reply-To: $email";
$ok = @mail($komu, "=?UTF-8?B?" . base64_encode($predmet) . "?=", $telo, implode("\r\n", $hlavicky), "-f$od");
if (!$ok) konec(["ok" => false, "chyba" => "Objednávku se nepovedlo odeslat. Zavolejte nám prosím."], 500);
konec(["ok" => true]);

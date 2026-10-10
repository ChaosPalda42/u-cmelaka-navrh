<?php
/**
 * Texty webu, které jde měnit v administraci. Skupiny = stránky, jak je majitel vidí.
 * typ: text (jeden řádek), odstavec (víc řádků; Enter = nový řádek), seznam (každý řádek jedna odrážka).
 * V textu jde *slovo v hvězdičkách* zvýraznit (na webu kurzívou medovou barvou).
 */

function cm_obsah_skupiny(): array
{
    $t = fn(string $klic, string $popisek, string $vychozi, int $max = 120) => ["klic" => $klic, "typ" => "text", "max" => $max, "popisek" => $popisek, "vychozi" => $vychozi];
    $o = fn(string $klic, string $popisek, string $vychozi, int $max = 600) => ["klic" => $klic, "typ" => "odstavec", "max" => $max, "popisek" => $popisek, "vychozi" => $vychozi];
    $s = fn(string $klic, string $popisek, array $vychozi, int $max = 80) => ["klic" => $klic, "typ" => "seznam", "max" => $max, "popisek" => $popisek, "vychozi" => $vychozi];

    return [
        ["id" => "uvod", "nazev" => "Úvodní stránka", "pole" => [
            $t("uvod.nadtitul", "Malý nápis nad hlavním nadpisem", "Bistro · pizzerie · kavárna v Nové Vsi pod Pleší"),
            $o("uvod.nadpis", "Hlavní nadpis", "Pizza z pece, pivo z čepu a *zahrada*, kde si děti hrají.", 140),
            $o("uvod.perex", "Text pod nadpisem", "U Čmeláka se zastavíte na kafe, na Pilsner po práci nebo na celé odpoledne s dětmi. A když nemáte čas sedět, upečeme vám pizzu s sebou.", 400),
            $t("uvod.sebou_nadtitul", "Vyzvednutí – malý nápis", "Na vyzvednutí"),
            $o("uvod.sebou_nadpis", "Vyzvednutí – nadpis", "Rozvoz zatím nemáme.\nZato pizzu upečeme, než dojdete.", 140),
            $t("uvod.krok1_nadpis", "Krok 1 – nadpis", "Vyberete", 40),
            $o("uvod.krok1_text", "Krok 1 – text (telefon se doplní sám za text)", "Na webu, nebo zavoláte. Stačí jméno a telefon, platí se až na místě.", 300),
            $t("uvod.krok2_nadpis", "Krok 2 – nadpis", "Upečeme", 40),
            $o("uvod.krok2_text", "Krok 2 – text", "Dvě pizzy jsou hotové zhruba za 20 minut. Čas vyzvednutí si vyberete sami, počítáme s ním.", 300),
            $t("uvod.krok3_nadpis", "Krok 3 – nadpis", "Vyzvednete", 40),
            $o("uvod.krok3_text", "Krok 3 – text", "U baru, v krabici, ještě horkou. Zaplatíte kartou nebo hotově – a když chcete, dáte si u nás mezitím pivo.", 300),
            $t("uvod.zahrada_nadtitul", "Zahrada – malý nápis", "Zahrada a děti"),
            $o("uvod.zahrada_nadpis", "Zahrada – nadpis", "Rodiče sedí, děti lítají. Všichni na dohled.", 140),
            $o("uvod.zahrada_text", "Zahrada – text", "Za bistrem je terasa se stoly pod světýlky a hned vedle dětský koutek s pískovištěm, skluzavkou a domečkem. Stoly stojí tak, abyste na děti viděli – a mohli si v klidu dopít kafe."),
            $s("uvod.zahrada_body", "Zahrada – odrážky (každý řádek jedna)", ["Dětský koutek přímo u stolů", "Terasa se stínem a světýlky", "Domácí limonády a pítíčko pro děti", "Wi-Fi a bezbariérový vstup"]),
            $t("uvod.listek_nadpis", "Ukázka z lístku – nadpis (které pizzy, se vybírá v Jídelním lístku)", "Pizzy z naší pece"),
            $t("uvod.listek_pozn", "Popisek na fotce pizzy", "32 cm · tomatový nebo smetanový základ", 60),
            $t("uvod.akce_nadtitul", "Akce – malý nápis", "Co chystáme"),
            $o("uvod.akce_nadpis", "Akce – nadpis", "Koncerty, kvízy, dýně a Mikuláš", 140),
            $t("uvod.pravidla_nadtitul", "Jak to tu chodí – malý nápis", "Jak to tu chodí"),
            $t("uvod.pravidla_nadpis", "Jak to tu chodí – nadpis", "Hospoda pro celou ves"),
            $t("uvod.pravidlo1_nadpis", "Pravidlo 1 – tučně", "Když je plno, přisedněte si.", 80),
            $o("uvod.pravidlo1_text", "Pravidlo 1 – text", "Velké stoly jsou od toho, aby se u nich sedělo spolu.", 200),
            $t("uvod.pravidlo2_nadpis", "Pravidlo 2 – tučně", "Děti vítáme. Psy taky.", 80),
            $o("uvod.pravidlo2_text", "Pravidlo 2 – text", "Misku s vodou dostane každý.", 200),
            $t("uvod.pravidlo3_nadpis", "Pravidlo 3 – tučně", "Pizzu s sebou upečeme i do zavíračky.", 80),
            $o("uvod.pravidlo3_text", "Pravidlo 3 – text", "Poslední objednávku bereme čtvrt hodiny před koncem.", 200),
            $t("uvod.pravidlo4_nadpis", "Pravidlo 4 – tučně (prázdné = schovat)", "Slavíte? Řekněte si.", 80),
            $o("uvod.pravidlo4_text", "Pravidlo 4 – text", "Zahradu i bistro půjčíme na narozeniny, křtiny i sraz spolužáků.", 200),
        ]],
        ["id" => "menu", "nazev" => "Jídelní lístek (texty kolem)", "pole" => [
            $o("menu.nadpis", "Nadpis", "Pizzy z naší pece,\npochutiny a pití", 120),
            $o("menu.perex", "Text pod nadpisem", "Pizzy mají 32 centimetrů, na tomatovém nebo smetanovém základu. Co má tlačítko Přidat, upečeme i s sebou.", 300),
            $o("menu.alergeny", "Poznámka o alergenech dole", "Alergeny v jednotlivých jídlech vám rádi řekneme u baru.", 300),
        ]],
        ["id" => "objednavka", "nazev" => "Objednávka s sebou", "pole" => [
            $t("objednavka.nadpis", "Nadpis", "Objednávka s sebou"),
            $o("objednavka.perex", "Text pod nadpisem", "Vyberte jídlo a čas, kdy si pro něj přijdete. Platí se až při vyzvednutí, kartou i hotově. Rozvoz zatím nemáme.", 300),
        ]],
        ["id" => "zahrada", "nazev" => "Zahrada a děti", "pole" => [
            $o("zahrada.nadpis", "Nadpis", "Místo, kde se *neřeší*, že je hluk", 140),
            $o("zahrada.perex", "Text pod nadpisem", "Terasa pod světýlky, dětský koutek na dohled od stolů a obsluha, která si pamatuje, co pijete. U Čmeláka se nesedí na čas.", 400),
            $t("zahrada.koutek_nadtitul", "Dětský koutek – malý nápis", "Dětský koutek"),
            $o("zahrada.koutek_nadpis", "Dětský koutek – nadpis", "Pískoviště, skluzavka, domeček a kýbl lopatek", 140),
            $o("zahrada.koutek_text", "Dětský koutek – text", "Koutek je oplocený a stoly kolem něj stojí tak, aby na něj bylo vidět. Děti si hrají, vy dojíte. Když se setmí, rozsvítíme."),
            $s("zahrada.koutek_body", "Dětský koutek – odrážky", ["Oplocený koutek u stolů", "Vysoké židličky a přebalovací pult", "Domácí limonády, lízátka a pítíčko"]),
            $t("zahrada.terasa_nadtitul", "Terasa – malý nápis", "Terasa"),
            $o("zahrada.terasa_nadpis", "Terasa – nadpis", "Od jara do podzimu pod širým nebem", 140),
            $o("zahrada.terasa_text", "Terasa – text", "Dřevěné stoly pro velké partie i pro dva, stín pod stromy a večer světýlka. Na podzim zapneme ohřívače a půjčíme deky. V létě tu hrajeme koncerty a promítáme."),
            $s("zahrada.terasa_body", "Terasa – odrážky", ["Zhruba 60 míst venku, 30 uvnitř", "Ohřívače a deky na chladné večery", "Wi-Fi pro všechny", "Platba kartou"]),
            $o("zahrada.cta_nadpis", "Výzva dole – nadpis", "Slavíte? Zahradu vám půjčíme.", 120),
            $o("zahrada.cta_text", "Výzva dole – text", "Dětské narozeniny, oslava padesátin, sraz po letech nebo firemní grilovačka – připravíme pizzu na prkýnkách, sud a místo pro dort.", 400),
        ]],
        ["id" => "akce", "nazev" => "Akce a oslavy (texty kolem)", "pole" => [
            $o("akce.nadpis", "Nadpis", "Co se U Čmeláka chystá", 120),
            $o("akce.perex", "Text pod nadpisem", "Koncerty na zahradě, kvízy, odpoledne pro děti a sousedské večery. Vstup je, pokud není napsáno jinak, volný.", 400),
            $o("akce.prazdno", "Text, když není žádná akce", "Program na další týdny teprve chystáme. Sledujte nás – nebo se zeptejte u baru.", 300),
            $t("akce.oslavy_nadtitul", "Oslavy – malý nápis", "Oslava u nás"),
            $o("akce.oslavy_nadpis", "Oslavy – nadpis", "Narozeniny, křtiny, sraz spolužáků", 140),
            $o("akce.oslavy_text", "Oslavy – text", "Půjčíme celou zahradu nebo jen velký stůl. Připravíme pizzu na prkýnkách, něco sladkého, sud piva a limonády. Dort si klidně přineste vlastní."),
            $s("akce.oslavy_body", "Oslavy – odrážky", ["Dětské oslavy s koutkem jen pro vás", "Sud piva na stůl", "Místo pro kapelu nebo reproduktor"]),
        ]],
        ["id" => "kontakt", "nazev" => "Kontakt", "pole" => [
            $o("kontakt.nadpis", "Nadpis", "Řadová 546,\nNová Ves pod Pleší", 120),
            $o("kontakt.hodiny_pozn", "Poznámka pod otevírací dobou", "Pizzu s sebou bereme do čtvrt hodiny před zavíračkou.", 200),
            $o("kontakt.telefon_pozn", "Text pod telefonem", "Objednávky s sebou, rezervace stolů a oslav.", 200),
            $o("kontakt.cesta", "Jak k nám (pod mapou)", "Bistro najdete v Řadové ulici, kousek od Mníšecké. Okolní ulice se tu jmenují Včelnická a Ke Včelníku – čmelák si to místo nevybral náhodou.", 400),
        ]],
        ["id" => "paticka", "nazev" => "Patička (dole na každé stránce)", "pole" => [
            $o("paticka.motto", "Motto vedle loga", "Bzučíme v Nové Vsi pod Pleší\nod roku 2021.", 120),
            $o("paticka.poznamka", "Malá poznámka úplně dole (prázdné = nic)", "", 300),
        ]],
    ];
}

/** Ploché schéma pro cm_over_obsah(). */
function cm_obsah_schema(): array
{
    $out = [];
    foreach (cm_obsah_skupiny() as $sk) {
        foreach ($sk["pole"] as $p) {
            $out[] = ["klic" => $p["klic"], "typ" => $p["typ"], "max" => $p["max"], "vychozi" => $p["vychozi"]];
        }
    }
    return $out;
}

/** Fotky na webu: kde se která ukazuje. pomer = ořez při nahrání (null = nechat, jak je). */
function cm_foto_sloty(): array
{
    return [
        ["id" => "hero", "nazev" => "Úvod – velká fotka nahoře", "vychozi" => "terasa", "alt" => "Terasa za podvečera: dřevěné stoly, světýlka, rodiny u pizzy", "pomer" => null],
        ["id" => "uvod-koutek", "nazev" => "Úvod – dětské hřiště", "vychozi" => "detsky-koutek", "alt" => "Dětský koutek na zahradě s pískovištěm a skluzavkou", "pomer" => null],
        ["id" => "uvod-oslava", "nazev" => "Úvod – menší fotka u hřiště", "vychozi" => "oslava", "alt" => "Oslava s přáteli u dlouhého stolu na terase", "pomer" => null],
        ["id" => "uvod-pizza", "nazev" => "Úvod – pizza u ukázky z lístku", "vychozi" => "pizza", "alt" => "Pizza z pece na dřevěném prkénku", "pomer" => null],
        ["id" => "zahrada-hlava", "nazev" => "Zahrada a děti – fotka nahoře", "vychozi" => "terasa", "alt" => "Terasa U Čmeláka", "pomer" => null],
        ["id" => "zahrada-koutek", "nazev" => "Zahrada a děti – dětský koutek", "vychozi" => "detsky-koutek", "alt" => "Dětský koutek s pískovištěm, skluzavkou a domečkem", "pomer" => null],
        ["id" => "zahrada-terasa", "nazev" => "Zahrada a děti – terasa", "vychozi" => "koncert", "alt" => "Večer na zahradě", "pomer" => null],
        ["id" => "mozaika-1", "nazev" => "Zahrada a děti – mozaika 1", "vychozi" => "pivo", "alt" => "Točené pivo", "pomer" => 1.0],
        ["id" => "mozaika-2", "nazev" => "Zahrada a děti – mozaika 2", "vychozi" => "kava-dort", "alt" => "Káva na zahradě", "pomer" => 1.0],
        ["id" => "mozaika-3", "nazev" => "Zahrada a děti – mozaika 3", "vychozi" => "pec", "alt" => "Pizza vytahovaná z pece", "pomer" => 1.0],
        ["id" => "mozaika-4", "nazev" => "Zahrada a děti – mozaika 4", "vychozi" => "cmelak", "alt" => "Čmelák na levanduli", "pomer" => 1.0],
        ["id" => "oslavy", "nazev" => "Akce – fotka u oslav", "vychozi" => "oslava", "alt" => "Oslava na terase", "pomer" => null],
    ];
}

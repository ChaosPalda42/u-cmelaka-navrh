/** Obsah jednotlivých stránek. Texty jsou návrh – menu, ceny a akce jsou smyšlené. */
import { esc, foto } from "./layout.mjs";
import { ikona, cmelak, plastev } from "./ikony.mjs";

const fmtKc = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";

const STITKY = { vege: "bez masa", palive: "pálivá", smetana: "smetanový základ", deti: "pro děti", specialita: "specialita domu" };

function stitkyHtml(p) {
  return (p.stitky || []).map((s) => `<span class="stitek stitek-${s}">${STITKY[s] || s}</span>`).join("");
}

/** Karta jídla pro lístek i výběr na úvodu. */
export function kartaJidla(p, { koren = "", velka = false } = {}) {
  const tlacitko = p.objednat
    ? `<button class="pridat" type="button" data-pridat="${p.id}" aria-label="Přidat ${esc(p.nazev)} do košíku">${ikona("plus")}<span>Přidat</span></button>`
    : `<span class="jen-na-miste" title="Podáváme jen na místě">jen u nás</span>`;
  return `<article class="jidlo${velka ? " jidlo-velke" : ""}" data-jidlo="${p.id}">
  <div class="jidlo-hlava"><h3 class="jidlo-nazev">${esc(p.nazev)}</h3><span class="tecky" aria-hidden="true"></span><span class="jidlo-cena">${fmtKc(p.cena)}</span></div>
  ${p.slozeni ? `<p class="jidlo-slozeni">${esc(p.slozeni)}</p>` : ""}
  <div class="jidlo-pata"><div class="stitky">${stitkyHtml(p)}${p.alergeny?.length ? `<span class="alergeny" title="Alergeny">A: ${[...new Set(p.alergeny)].sort((a, b) => a - b).join(", ")}</span>` : ""}</div>${tlacitko}</div>
</article>`;
}

function akceKarta(a, koren, { fotka = true } = {}) {
  return `<article class="akce-karta" data-akce="${a.id}" data-datum="${a.datum}">
  ${fotka ? `<div class="akce-foto">${foto(a.foto, "", { koren, sizes: "(min-width: 900px) 30vw, 90vw" })}</div>` : ""}
  <div class="akce-datum"><span class="akce-den">${a.datumKratce.split(" ")[1]}</span><span class="akce-mesic">${a.datumKratce.split(" ").slice(2).join(" ")}</span><span class="akce-dvt">${a.datumKratce.split(" ")[0]}</span></div>
  <div class="akce-telo">
    <p class="akce-meta"><span>${a.datumCesky}${a.cas ? `, ${a.cas}` : ""}</span><span class="akce-pro akce-pro-${a.pro}">${a.pro === "děti" ? "pro děti" : a.pro === "dospělí" ? "pro dospělé" : "pro všechny"}</span></p>
    <h3>${esc(a.nazev)}</h3>
    <p>${esc(a.text)}</p>
    <p class="akce-za" data-za-dni="${a.datum}"></p>
  </div>
</article>`;
}

/* ---------------------------------------------------------------- úvod */
export function uvod({ podnik, menu, akce, mapa, tyden }) {
  const k = "";
  const oblibene = ["cmelak", "margherita", "diabolo", "spenatova"].map((id) => menu.polozky.find((p) => p.id === id));
  return `
<section class="hero">
  <div class="hero-text">
    <p class="nadtitul">Bistro · pizzerie · kavárna v Nové Vsi pod Pleší</p>
    <h1>Pizza z pece, pivo z čepu a <span class="nezlomit"><em>zahrada</em>,</span> kde si děti hrají.</h1>
    <p class="perex">U Čmeláka se zastavíte na kafe a dort, na pivo po práci nebo na celé odpoledne s dětmi. A když nemáte čas sedět, upečeme vám pizzu s sebou.</p>
    <div class="tlacitka">
      <a class="btn btn-med" href="objednavka.html" data-pristani>${ikona("pizza")}Objednat na vyzvednutí</a>
      <a class="btn btn-obrys" href="menu.html">Jídelní lístek</a>
    </div>
    <div class="dnes" data-dnes>
      <div class="dnes-radek">${ikona("hodiny")}<span><strong data-stav-text>Otevřeno od úterý do neděle od 15:00</strong></span></div>
      <div class="dnes-radek" data-dnes-slot hidden>${ikona("pizza")}<span>Nejbližší vyzvednutí <strong data-slot-cas></strong></span></div>
    </div>
  </div>
  <div class="hero-obraz">
    <div class="hero-blob">${foto("terasa", "Terasa za podvečera: dřevěné stoly, světýlka, rodiny u pizzy", { sizes: "(min-width: 900px) 55vw, 100vw", eager: true })}</div>
    <div class="hero-cedule" aria-hidden="true"><span>Od roku</span><strong>${podnik.od_roku}</strong></div>
  </div>
  <svg class="let" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true"><path data-let-cesta d="M1180 70 C 1000 -20, 860 160, 960 210 S 1150 150, 1010 300 S 640 260, 560 360 S 380 520, 250 470"/></svg>
  <div class="letec" data-letec aria-hidden="true">${cmelak("letec-cmelak")}</div>
</section>

<section class="pas pas-kroky" aria-labelledby="sebou-h">
  <div class="sekce-hlava">
    <p class="nadtitul">Na vyzvednutí</p>
    <h2 id="sebou-h">Rozvoz zatím nemáme.<br>Zato pizzu upečeme, než dojdete.</h2>
  </div>
  <ol class="kroky">
    <li><span class="krok-cislo">1</span><h3>Vyberete</h3><p>Na webu, nebo zavoláte na <a href="tel:${podnik.telefon.replace(/\s/g, "")}">${podnik.telefon}</a>. Stačí jméno a telefon, platí se až na místě.</p></li>
    <li><span class="krok-cislo">2</span><h3>Upečeme</h3><p>Dvě pizzy jsou hotové zhruba za 20 minut. Čas vyzvednutí si vyberete sami, počítáme s ním.</p></li>
    <li><span class="krok-cislo">3</span><h3>Vyzvednete</h3><p>U baru, v krabici, ještě horkou. Zaplatíte kartou nebo hotově – a když chcete, dáte si u nás mezitím pivo.</p></li>
  </ol>
  <p class="kroky-cta"><a class="btn btn-med" href="objednavka.html">Sestavit objednávku ${ikona("sipka")}</a></p>
</section>

<section class="zahrada-uvod" aria-labelledby="zahrada-h">
  <div class="zahrada-fotky">
    <div class="zf zf-1">${foto("detsky-koutek", "Dětský koutek na zahradě s pískovištěm a skluzavkou", { sizes: "(min-width: 900px) 34vw, 90vw" })}</div>
    <div class="zf zf-2">${foto("oslava", "Oslava s přáteli u dlouhého stolu na terase", { sizes: "(min-width: 900px) 24vw, 60vw" })}</div>
    ${plastev("zf-plastev")}
  </div>
  <div class="zahrada-text">
    <p class="nadtitul">Zahrada a děti</p>
    <h2 id="zahrada-h">Rodiče sedí, děti lítají. Všichni na dohled.</h2>
    <p>Za bistrem je terasa se stoly pod světýlky a hned vedle dětský koutek s pískovištěm, skluzavkou a domečkem. Stoly stojí tak, abyste na děti viděli – a mohli si v klidu dopít kafe.</p>
    <ul class="vycet">
      <li>${ikona("dite")}Dětský koutek přímo u stolů</li>
      <li>${ikona("strom")}Terasa se stínem a světýlky</li>
      <li>${ikona("zidle")}Vysoké židličky a dětská pizza</li>
      <li>${ikona("wifi")}Wi-Fi a bezbariérový vstup</li>
    </ul>
    <a class="odkaz-sipka" href="zahrada.html">Jak to u nás vypadá ${ikona("sipka")}</a>
  </div>
</section>

<section class="pas pas-listek" aria-labelledby="listek-h">
  <div class="sekce-hlava sekce-hlava-radek">
    <div><p class="nadtitul">Z lístku</p><h2 id="listek-h">Co se u nás peče nejčastěji</h2></div>
    <a class="odkaz-sipka" href="menu.html">Celý jídelní lístek ${ikona("sipka")}</a>
  </div>
  <div class="listek-uvod">
    <div class="listek-foto">${foto("pizza", "Pizza se salámem a bazalkou na dřevěném prkénku", { sizes: "(min-width: 900px) 40vw, 100vw" })}<p class="listek-foto-pozn">32 cm · rajčatový nebo smetanový základ</p></div>
    <div class="listek-karty">${oblibene.map((p) => kartaJidla(p, { koren: k })).join("")}</div>
  </div>
</section>

<section class="pas pas-akce" aria-labelledby="akce-h">
  <div class="sekce-hlava sekce-hlava-radek">
    <div><p class="nadtitul">Co chystáme</p><h2 id="akce-h">Koncerty, kvízy, dýně a Mikuláš</h2></div>
    <a class="odkaz-sipka" href="akce.html">Celý program ${ikona("sipka")}</a>
  </div>
  <div class="akce-mrizka" data-akce-seznam data-limit="3">${akce.slice(0, 3).map((a) => akceKarta(a, k)).join("")}</div>
</section>

<section class="pravidla" aria-labelledby="pravidla-h">
  <div class="pravidla-in">
    ${cmelak("pravidla-cmelak")}
    <div>
      <p class="nadtitul">Jak to tu chodí</p>
      <h2 id="pravidla-h">Hospoda pro celou ves</h2>
      <ul class="pravidla-seznam">
        <li><strong>Když je plno, přisedněte si.</strong> Velké stoly jsou od toho, aby se u nich sedělo spolu.</li>
        <li><strong>Děti vítáme. Psy taky.</strong> Misku s vodou dostane každý.</li>
        <li><strong>Pizzu s sebou upečeme i do zavíračky.</strong> Poslední objednávku bereme čtvrt hodiny před koncem.</li>
        <li><strong>Slavíte? Řekněte si.</strong> Zahradu i bistro půjčíme na narozeniny, křtiny i sraz spolužáků.</li>
      </ul>
    </div>
  </div>
</section>

<section class="pas pas-kontakt" aria-labelledby="kontakt-h">
  <div class="kontakt-uvod">
    <div class="kontakt-text">
      <p class="nadtitul">Kde nás najdete</p>
      <h2 id="kontakt-h">${esc(podnik.adresa.ulice)}, ${esc(podnik.adresa.obec)}</h2>
      <dl class="hodiny">${tyden.map((r) => `<div><dt>${r.dny}</dt><dd>${r.cas}</dd></div>`).join("")}</dl>
      <p class="kontakt-tel"><a class="btn btn-obrys" href="tel:${podnik.telefon.replace(/\s/g, "")}">${ikona("telefon")}${podnik.telefon}</a></p>
    </div>
    <a class="mapa-ram" href="kontakt.html" aria-label="Mapa a cesta k nám">${mapa}</a>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- jídelní lístek */
export function menuStranka({ menu }) {
  const kat = menu.kategorie;
  const skupiny = kat.map((c) => ({ ...c, polozky: menu.polozky.filter((p) => p.kategorie === c.id) }));
  return `
<section class="stranka-hlava stranka-hlava-menu">
  <p class="nadtitul">Jídelní lístek</p>
  <h1>Pizza, něco k pivu<br>a sladké ke kávě</h1>
  <p class="perex">Pizzy mají 32 centimetrů a těsto nechává zrát do druhého dne. Co má tlačítko <span class="inline-pridat">${ikona("plus")}Přidat</span>, upečeme i s sebou.</p>
</section>

<section class="filtry" aria-label="Filtr jídelního lístku" data-filtry>
  <label class="hledat">${ikona("hledat")}<span class="sr">Hledat v lístku</span><input type="search" placeholder="Hledat – třeba „slanina“ nebo „bez masa“" data-hledat autocomplete="off"></label>
  <div class="chipy" role="group" aria-label="Kategorie">
    <button type="button" class="chip" data-kat="" aria-pressed="true">Vše</button>
    ${kat.map((c) => `<button type="button" class="chip" data-kat="${c.id}" aria-pressed="false">${c.nazev}</button>`).join("")}
  </div>
  <div class="chipy" role="group" aria-label="Vlastnosti">
    ${["vege", "smetana", "palive", "deti"].map((s) => `<button type="button" class="chip chip-stitek" data-stitek="${s}" aria-pressed="false">${STITKY[s]}</button>`).join("")}
    <button type="button" class="chip chip-stitek" data-bez-lepku aria-pressed="false" title="Skryje jídla s alergenem 1">bez lepku</button>
  </div>
</section>

<div class="listek-obsah" data-listek>
${skupiny.map((s) => `<section class="listek-skupina" data-skupina="${s.id}" aria-labelledby="k-${s.id}">
  <header class="skupina-hlava"><h2 id="k-${s.id}">${s.nazev}</h2><p>${esc(s.popis)}</p></header>
  ${s.id === "pizza" ? `<div class="priplatky-info">${ikona("plus")}<p>K pizze přidáme: ${menu.priplatky.map((p) => `${p.nazev} ${fmtKc(p.cena)}`).join(" · ")}. Krabice ${fmtKc(15)}.</p></div>` : ""}
  <div class="jidla">${s.polozky.map((p) => kartaJidla(p)).join("")}</div>
</section>`).join("\n")}
<p class="nic-nenalezeno" data-nic hidden>Tohle na lístku nemáme. Zkuste jiné slovo – nebo se zeptejte u baru, třeba to upečeme.</p>
</div>

<section class="alergeny-legenda" aria-labelledby="alergeny-h">
  <h2 id="alergeny-h">Alergeny</h2>
  <p>1 lepek · 2 korýši · 3 vejce · 4 ryby · 5 arašídy · 6 sója · 7 mléko · 8 ořechy · 9 celer · 10 hořčice · 11 sezam · 12 oxid siřičitý · 13 lupina · 14 měkkýši</p>
</section>

<dialog class="dialog" data-dialog-pizza aria-labelledby="dp-nazev">
  <form method="dialog" class="dialog-in" data-dialog-form>
    <button class="dialog-zavrit ikona-btn" value="zrusit" aria-label="Zavřít">${ikona("krizek")}</button>
    <p class="nadtitul">Do košíku</p>
    <h2 id="dp-nazev" data-dp-nazev></h2>
    <p class="dialog-slozeni" data-dp-slozeni></p>
    <fieldset class="priplatky"><legend>Přidat navíc</legend>
      ${menu.priplatky.map((p) => `<label class="priplatek"><input type="checkbox" name="priplatek" value="${p.id}"><span>${p.nazev}</span><span class="priplatek-cena">+${fmtKc(p.cena)}</span></label>`).join("")}
    </fieldset>
    <div class="dialog-pata">
      <div class="pocitadlo" data-pocitadlo><button type="button" data-ubrat aria-label="Ubrat">${ikona("minus")}</button><output data-dp-pocet>1</output><button type="button" data-pridat-kus aria-label="Přidat kus">${ikona("plus")}</button></div>
      <button class="btn btn-med" value="pridat" data-dp-potvrdit>Přidat · <span data-dp-cena></span></button>
    </div>
  </form>
</dialog>
<div class="toast" data-toast role="status" aria-live="polite" hidden></div>`;
}

/* ---------------------------------------------------------------- objednávka */
export function objednavkaStranka({ podnik }) {
  return `
<section class="stranka-hlava">
  <p class="nadtitul">Na vyzvednutí</p>
  <h1>Objednávka s sebou</h1>
  <p class="perex">Vyberte jídlo a čas, kdy si pro něj přijdete. Platí se až při vyzvednutí, kartou i hotově. Rozvoz zatím nemáme.</p>
</section>

<div class="demo-pruh" data-demo-cas>
  <p><strong>Ukázka:</strong> časy vyzvednutí se počítají podle skutečné otevírací doby a aktuálního času. Mimo otevírací dobu si můžete vyzkoušet, jak by to vypadalo</p>
  <label><span class="sr">Předstíraný čas</span><select data-predstirat>
    <option value="">teď</option>
    <option value="1,960">v úterý v 16:00</option>
    <option value="4,1110">v pátek v 18:30</option>
    <option value="6,1200">v neděli ve 20:00</option>
  </select></label>
</div>

<div class="objednavka" data-objednavka>
  <section class="obj-kosik" aria-labelledby="kosik-h">
    <h2 id="kosik-h">${ikona("kosik")}Košík</h2>
    <div data-kosik-radky></div>
    <div class="kosik-prazdny" data-kosik-prazdny>
      ${cmelak("prazdny-cmelak")}
      <p>Košík je zatím prázdný.</p>
      <a class="btn btn-med" href="menu.html">Vybrat z lístku</a>
    </div>
    <dl class="souhrn" data-souhrn hidden>
      <div><dt>Jídlo a pití</dt><dd data-s-mezisoucet></dd></div>
      <div><dt data-s-krabice-popis>Krabice</dt><dd data-s-obaly></dd></div>
      <div class="souhrn-celkem"><dt>Celkem při vyzvednutí</dt><dd data-s-celkem></dd></div>
    </dl>
    <a class="odkaz-sipka" href="menu.html" data-pridat-dalsi hidden>Přidat ještě něco ${ikona("sipka")}</a>
  </section>

  <form class="obj-form" data-obj-form novalidate aria-labelledby="udaje-h">
    <fieldset class="obj-cas">
      <legend><span class="krok-cislo">1</span>Kdy si přijdete?</legend>
      <p class="obj-stav" data-obj-stav></p>
      <div class="sloty" data-sloty role="radiogroup" aria-label="Čas vyzvednutí"></div>
      <p class="chyba" data-chyba="cas" hidden></p>
      <p class="pozn" data-priprava></p>
    </fieldset>

    <fieldset class="obj-udaje">
      <legend id="udaje-h"><span class="krok-cislo">2</span>Na koho to bude?</legend>
      <div class="pole"><label for="o-jmeno">Jméno</label><input id="o-jmeno" name="jmeno" autocomplete="name" required><p class="chyba" data-chyba="jmeno" hidden></p></div>
      <div class="pole"><label for="o-telefon">Telefon</label><input id="o-telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" placeholder="777 123 456" required><p class="chyba" data-chyba="telefon" hidden></p><p class="pozn">Zavoláme jen, kdyby se něco nepovedlo.</p></div>
      <div class="pole"><label for="o-email">E-mail <span class="nepovinne">nepovinné – pošleme potvrzení</span></label><input id="o-email" name="email" type="email" autocomplete="email"><p class="chyba" data-chyba="email" hidden></p></div>
      <div class="pole"><label for="o-poznamka">Poznámka <span class="nepovinne">nepovinné</span></label><textarea id="o-poznamka" name="poznamka" rows="2" maxlength="300" placeholder="Třeba „bez oliv“ nebo „nakrájet na menší kousky pro děti“"></textarea><p class="chyba" data-chyba="poznamka" hidden></p></div>
      <label class="souhlas"><input type="checkbox" name="souhlas"><span>Souhlasím, aby U Čmeláka použil jméno a telefon k vyřízení objednávky.</span></label>
      <p class="chyba" data-chyba="souhlas" hidden></p>
    </fieldset>
    <p class="chyba chyba-kosik" data-chyba="kosik" hidden></p>
    <button class="btn btn-med btn-velke" type="submit" data-odeslat>Objednat na vyzvednutí <span data-odeslat-cena></span></button>
    <p class="pozn pozn-stred">Ukázka – objednávka se nikam neodešle.</p>
  </form>
</div>

<section class="potvrzeni" data-potvrzeni hidden tabindex="-1" aria-labelledby="potvrzeni-h">
  ${cmelak("potvrzeni-cmelak")}
  <p class="nadtitul">Objednávka <span data-p-cislo></span></p>
  <h2 id="potvrzeni-h">Pečeme! Přijďte v <span data-p-cas></span>.</h2>
  <p>Najdete nás v ulici ${esc(podnik.adresa.ulice)}. Zaplatíte u baru, kartou nebo hotově.</p>
  <div class="kuchyne">
    <p class="kuchyne-popis">Takhle by objednávka dorazila do kuchyně (SMS a e-mail):</p>
    <pre data-p-text></pre>
  </div>
  <p><a class="btn btn-obrys" href="menu.html">Zpět na lístek</a></p>
</section>`;
}

/* ---------------------------------------------------------------- zahrada a děti */
export function zahradaStranka({ podnik }) {
  return `
<section class="stranka-hlava stranka-hlava-foto">
  <div>
    <p class="nadtitul">Zahrada a děti</p>
    <h1>Místo, kde se <em>neřeší</em>, že je hluk</h1>
    <p class="perex">Terasa pod světýlky, dětský koutek na dohled od stolů a obsluha, která si pamatuje, co pijete. U Čmeláka se nesedí na čas.</p>
  </div>
  <div class="hlava-foto">${foto("terasa", "Terasa U Čmeláka za podvečera", { sizes: "(min-width: 900px) 50vw, 100vw", eager: true })}</div>
</section>

<section class="pas dvojice">
  <div class="dvojice-foto">${foto("detsky-koutek", "Dětský koutek s pískovištěm, skluzavkou a domečkem", { sizes: "(min-width: 900px) 45vw, 100vw" })}</div>
  <div>
    <p class="nadtitul">Dětský koutek</p>
    <h2>Pískoviště, skluzavka, domeček a kýbl lopatek</h2>
    <p>Koutek je oplocený a stoly kolem něj stojí tak, aby na něj bylo vidět. Děti si hrají, vy dojíte. Když se setmí, rozsvítíme.</p>
    <ul class="vycet">
      <li>${ikona("dite")}Oplocený koutek u stolů</li>
      <li>${ikona("pizza")}Dětská pizza Malý čmelák (24 cm)</li>
      <li>${ikona("zidle")}Vysoké židličky a přebalovací pult</li>
      <li>${ikona("dort")}Palačinky, zmrzlina a domácí limonáda</li>
    </ul>
  </div>
</section>

<section class="pas dvojice dvojice-obracene">
  <div class="dvojice-foto">${foto("koncert", "Akustický koncert na zahradě večer", { sizes: "(min-width: 900px) 45vw, 100vw" })}</div>
  <div>
    <p class="nadtitul">Terasa</p>
    <h2>Od jara do podzimu pod širým nebem</h2>
    <p>Dřevěné stoly pro velké partie i pro dva, stín pod stromy a večer světýlka. Na podzim zapneme ohřívače a půjčíme deky. V létě tu hrajeme koncerty a promítáme.</p>
    <ul class="vycet">
      <li>${ikona("strom")}Zhruba 60 míst venku, 30 uvnitř</li>
      <li>${ikona("ohen")}Ohřívače a deky na chladné večery</li>
      <li>${ikona("wifi")}Wi-Fi pro všechny</li>
      <li>${ikona("karta")}Platba kartou</li>
    </ul>
  </div>
</section>

<section class="mozaika" aria-label="Fotografie">
  <div class="mz mz-1">${foto("pivo", "Točené pivo", { sizes: "(min-width: 900px) 25vw, 50vw" })}</div>
  <div class="mz mz-2">${foto("kava-dort", "Cappuccino a domácí dort", { sizes: "(min-width: 900px) 25vw, 50vw" })}</div>
  <div class="mz mz-3">${foto("pec", "Pizza vytahovaná z pece", { sizes: "(min-width: 900px) 25vw, 50vw" })}</div>
  <div class="mz mz-4">${foto("cmelak", "Čmelák na levanduli", { sizes: "(min-width: 900px) 25vw, 50vw" })}</div>
</section>

<section class="pas pas-cta">
  <h2>Slavíte? Zahradu vám půjčíme.</h2>
  <p>Dětské narozeniny, oslava padesátin, sraz po letech nebo firemní grilovačka – připravíme pizzu na prkýnkách, sud a místo pro dort.</p>
  <a class="btn btn-med" href="akce.html#oslavy">${ikona("balonky")}Poptat oslavu</a>
</section>`;
}

/* ---------------------------------------------------------------- akce */
export function akceStranka({ akce }) {
  return `
<section class="stranka-hlava">
  <p class="nadtitul">Akce</p>
  <h1>Co se U Čmeláka chystá</h1>
  <p class="perex">Koncerty na zahradě, kvízy, odpoledne pro děti a sousedské večery. Vstup je, pokud není napsáno jinak, volný.</p>
</section>

<section class="pas">
  <div class="akce-seznam" data-akce-seznam>${akce.map((a) => akceKarta(a, "")).join("")}</div>
  <p class="nic-nenalezeno" data-akce-nic hidden>Program na další týdny teprve chystáme. Sledujte nás – nebo se zeptejte u baru.</p>
</section>

<section class="pas oslavy" id="oslavy" aria-labelledby="oslavy-h">
  <div class="oslavy-text">
    <p class="nadtitul">Oslava u nás</p>
    <h2 id="oslavy-h">Narozeniny, křtiny, sraz spolužáků</h2>
    <p>Půjčíme celou zahradu nebo jen velký stůl. Připravíme pizzu na prkýnkách, něco sladkého, sud piva a limonády. Dort si klidně přineste vlastní.</p>
    <ul class="vycet">
      <li>${ikona("balonky")}Dětské oslavy s koutkem jen pro vás</li>
      <li>${ikona("pivo")}Sud piva na stůl</li>
      <li>${ikona("hudba")}Místo pro kapelu nebo reproduktor</li>
    </ul>
    <div class="oslavy-foto">${foto("oslava", "Oslava na terase", { sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
  </div>
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
    <p class="pozn">Ukázka – poptávka se nikam neodešle.</p>
    <div class="form-hotovo" data-hotovo hidden tabindex="-1"><strong>Díky!</strong> Ozveme se do druhého dne a domluvíme podrobnosti.</div>
  </form>
</section>`;
}

/* ---------------------------------------------------------------- kontakt */
export function kontaktStranka({ podnik, mapa, tyden }) {
  const a = podnik.adresa;
  const mapyCz = `https://mapy.cz/zakladni?q=${encodeURIComponent(`${a.ulice}, ${a.obec}`)}`;
  return `
<section class="stranka-hlava">
  <p class="nadtitul">Kontakt</p>
  <h1>Řadová 546,<br>Nová Ves pod Pleší</h1>
</section>

<section class="pas kontakt">
  <div class="kontakt-karty">
    <div class="karta">
      <h2>${ikona("hodiny")}Otevřeno</h2>
      <dl class="hodiny" data-hodiny>${tyden.map((r) => `<div><dt>${r.dny}</dt><dd>${r.cas}</dd></div>`).join("")}</dl>
      <p class="pozn">Pizzu s sebou bereme do čtvrt hodiny před zavíračkou.</p>
    </div>
    <div class="karta">
      <h2>${ikona("telefon")}Zavolejte</h2>
      <p class="velky-tel"><a href="tel:${podnik.telefon.replace(/\s/g, "")}">${podnik.telefon}</a></p>
      <p>Objednávky s sebou, rezervace stolů a oslav.</p>
      <p><a href="mailto:${podnik.email}">${podnik.email}</a></p>
    </div>
    <div class="karta">
      <h2>${ikona("mapa")}Adresa</h2>
      <p>U Čmeláka<br>${esc(a.ulice)}<br>${esc(a.psc)} ${esc(a.obec)}</p>
      <p><a class="odkaz-sipka" href="${mapyCz}" rel="noopener" target="_blank">Otevřít v Mapy.cz ${ikona("sipka")}</a></p>
      <p class="pozn">IČO ${esc(podnik.ico)} · platba ${podnik.platby.join(" i ")}</p>
    </div>
  </div>
  <div class="mapa-ram mapa-velka">${mapa}</div>
  <p class="pozn">Bistro najdete v Řadové ulici, kousek od Mníšecké. Okolní ulice se tu jmenují Včelnická a Ke Včelníku – čmelák si to místo nevybral náhodou.</p>
</section>`;
}

export function chybaStranka() {
  return `
<section class="chyba-404">
  ${cmelak("ztraceny-cmelak")}
  <p class="nadtitul">Chyba 404</p>
  <h1>Tady čmelák nic nenašel</h1>
  <p class="perex">Stránka, kterou hledáte, odletěla. Zkuste úvod nebo rovnou lístek.</p>
  <div class="tlacitka"><a class="btn btn-med" data-koren-odkaz href="index.html">Na úvod</a><a class="btn btn-obrys" data-koren-odkaz href="menu.html">Jídelní lístek</a></div>
</section>`;
}

/** Kostra stránky: hlavička, navigace, patička. */
import { logo, ikona, cmelak } from "./ikony.mjs";
import { logoOdznak } from "./logo.mjs";

export const NAV = [
  ["index.html", "Úvod"],
  ["menu.html", "Jídelní lístek"],
  ["objednavka.html", "Na vyzvednutí"],
  ["zahrada.html", "Zahrada a děti"],
  ["akce.html", "Akce"],
  ["kontakt.html", "Kontakt"],
];

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let FOTKY = {};
export function nastavFotky(manifest) { FOTKY = manifest || {}; }

/** <picture> z variant připravených tools/fotky.py. */
export function foto(jmeno, alt, { koren = "", sizes = "100vw", trida = "", eager = false } = {}) {
  const f = FOTKY[jmeno];
  if (!f) return `<div class="foto-chybi ${trida}" role="img" aria-label="${esc(alt)}"></div>`;
  const srcset = (ext) => f.varianty.map((w) => `${koren}assets/foto/${jmeno}-${w}.${ext} ${w}w`).join(", ");
  const stred = f.varianty.find((w) => w >= 1280) || f.varianty[f.varianty.length - 1];
  return `<picture class="foto ${trida}"><source type="image/webp" srcset="${srcset("webp")}" sizes="${sizes}">` +
    `<img src="${koren}assets/foto/${jmeno}-${stred}.jpg" srcset="${srcset("jpg")}" sizes="${sizes}" width="${f.sirka}" height="${f.vyska}" alt="${esc(alt)}"${eager ? ` fetchpriority="high"` : ` loading="lazy"`} decoding="async"></picture>`;
}

function hlavicka(aktivni, koren) {
  const odkazy = NAV.map(([href, text]) =>
    `<li><a href="${koren}${href}"${href === aktivni ? ` aria-current="page"` : ""}>${text}</a></li>`).join("");
  return `<header class="hlavicka" data-hlavicka>
  <div class="hlavicka-in">
    ${logo(koren)}
    <nav class="nav" id="nav" aria-label="Hlavní navigace"><ul>${odkazy}</ul></nav>
    <div class="hlavicka-akce">
      <span class="stav-pill" data-stav hidden><span class="stav-tecka"></span><span data-stav-text></span></span>
      <button class="ikona-btn" type="button" data-prepni-tema aria-label="Přepnout světlý a tmavý režim">${ikona("mesic", "jen-svetly")}${ikona("slunce", "jen-tmavy")}</button>
      <a class="kosik-btn" href="${koren}objednavka.html" data-kosik-btn aria-label="Košík">${ikona("kosik")}<span class="kosik-pocet" data-kosik-pocet hidden>0</span></a>
      <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    </div>
  </div>
</header>`;
}

function paticka(podnik, koren, tyden) {
  const a = podnik.adresa;
  return `<footer class="paticka">
  <div class="paticka-in">
    <div class="paticka-znacka">
      ${logoOdznak({ trida: "paticka-logo", id: "lgf" })}
      <p class="paticka-motto">Bzučíme v Nové Vsi pod Pleší<br>od roku ${podnik.od_roku}.</p>
    </div>
    <div>
      <h2 class="paticka-nadpis">Kde nás najdete</h2>
      <p>${esc(a.ulice)}<br>${esc(a.psc)} ${esc(a.obec)}</p>
      <p><a href="tel:${podnik.telefon.replace(/\s/g, "")}">${esc(podnik.telefon)}</a><br><a href="mailto:${podnik.email}">${esc(podnik.email)}</a></p>
    </div>
    <div>
      <h2 class="paticka-nadpis">Otevřeno</h2>
      <dl class="hodiny-mini">${tyden.map((r) => `<div><dt>${r.dny}</dt><dd>${r.cas}</dd></div>`).join("")}</dl>
    </div>
    <div>
      <h2 class="paticka-nadpis">Rychle</h2>
      <ul class="paticka-odkazy">
        <li><a href="${koren}objednavka.html">Objednat na vyzvednutí</a></li>
        <li><a href="${koren}menu.html">Jídelní lístek</a></li>
        <li><a href="${koren}akce.html#oslavy">Oslava u nás</a></li>
        <li><a href="${koren}kontakt.html">Jak k nám</a></li>
      </ul>
    </div>
  </div>
  <div class="paticka-spodek">
    <p>© ${new Date().getFullYear()} U Čmeláka · IČO ${esc(podnik.ico)}</p>
    <p class="ukazka-pozn"><strong>Ukázka návrhu webu.</strong> Jídelní lístek je podle tištěného lístku; akce jsou smyšlené a fotky ilustrační (vygenerované). Objednávky se nikam neodesílají.</p>
  </div>
</footer>`;
}

let VERZE = "";
export function nastavVerzi(v) { VERZE = v; }

export function stranka({ titulek, popis, aktivni, obsah, koren = "", podnik, tyden, menu, trida = "", skripty = "" }) {
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulek)}</title>
<meta name="description" content="${esc(popis)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#fbf4e4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c150e" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${koren}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${koren}assets/fonts/fraunces-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${koren}assets/style.css?v=${VERZE}">
<script>try{var t=localStorage.getItem("cm-tema");if(t)document.documentElement.dataset.tema=t}catch(e){}</script>
</head>
<body class="${trida}">
<a class="preskocit" href="#obsah">Přeskočit na obsah</a>
${hlavicka(aktivni, koren)}
<main id="obsah">
${obsah}
</main>
${paticka(podnik, koren, tyden)}
<script>window.CM_DATA = ${JSON.stringify({ rozvrh: podnik.rozvrh, krabice: podnik.krabice, koren, menu: { polozky: menu.polozky.filter((p) => p.objednat).map(({ id, nazev, cena, kategorie, slozeni }) => ({ id, nazev, cena, kategorie, slozeni })), priplatky: menu.priplatky } }).replace(/</g, "\\u003c")};</script>
<script src="${koren}assets/knihovny.js?v=${VERZE}"></script>
<script src="${koren}assets/web.js?v=${VERZE}"></script>
${skripty}
</body>
</html>
`;
}

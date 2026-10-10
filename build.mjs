/** Sestavení statického webu do out/. Node 24, bez závislostí. */
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stranka, nastavFotky } from "./src/templates/layout.mjs";
import * as S from "./src/templates/stranky.mjs";
import { logoCmelak, logoOdznak } from "./src/templates/logo.mjs";

const KOREN = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(KOREN, "out");

function nazvyExportu(zdroj) {
  const jmena = new Set();
  const re = /export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(zdroj))) jmena.add(m[1]);
  return [...jmena];
}

/** Moduly z src/lib se sesypou do jednoho klasického skriptu pod globální CM.<modul>. */
async function svazekKnihoven() {
  const dir = path.join(KOREN, "src", "lib");
  const vsechny = (await readdir(dir)).filter((f) => f.endsWith(".mjs")).sort();
  const zdroje = {};
  for (const f of vsechny) zdroje[f] = await readFile(path.join(dir, f), "utf8");
  const soubory = [];
  const navstiveno = new Set();
  const pridej = (f) => {
    if (navstiveno.has(f)) return;
    navstiveno.add(f);
    for (const m of zdroje[f].matchAll(/from\s*["']\.\/([\w-]+\.mjs)["']/g)) if (zdroje[m[1]]) pridej(m[1]);
    soubory.push(f);
  };
  vsechny.forEach(pridej);
  const kusy = [];
  for (const soubor of soubory) {
    let zdroj = zdroje[soubor];
    const jmena = nazvyExportu(zdroj);
    zdroj = zdroj.replace(/^\s*import\s*\{([^}]*)\}\s*from\s*["']\.\/([\w-]+)\.mjs["'];?[ \t]*$/gm,
      (_, co, mod) => `const {${co}} = CM.${mod.replace(/-/g, "_")};`);
    const telo = zdroj.replace(/^\s*export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\s)/gm, "");
    kusy.push(`CM.${soubor.replace(/\.mjs$/, "").replace(/-/g, "_")} = (function () {\n${telo}\nreturn { ${jmena.join(", ")} };\n})();`);
  }
  return `(function (global) {\n"use strict";\nvar CM = global.CM = global.CM || {};\n${kusy.join("\n")}\n})(typeof window !== "undefined" ? window : globalThis);\n`;
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><circle cx="200" cy="200" r="198" fill="#2a1f14"/><circle cx="200" cy="200" r="172" fill="#efe2c4"/>
<g transform="translate(200 214) scale(.95) translate(-200 -200)">${logoCmelak({ id: "fav" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></svg>`;

async function main() {
  const podnik = JSON.parse(await readFile(path.join(KOREN, "data/podnik.json"), "utf8"));
  const menu = JSON.parse(await readFile(path.join(KOREN, "data/menu.json"), "utf8"));
  const { akce: akceData } = JSON.parse(await readFile(path.join(KOREN, "data/akce.json"), "utf8"));
  const manifestCesta = path.join(KOREN, "src/assets/foto/fotky.json");
  nastavFotky(existsSync(manifestCesta) ? JSON.parse(await readFile(manifestCesta, "utf8")) : {});

  // Knihovny z Factory použijeme i při sestavení – výpis otevírací doby a české datumy.
  const O = await import("./src/lib/oteviraci.mjs");
  const C = await import("./src/lib/cestina.mjs");
  const tyden = O.tydenRadky(podnik.rozvrh);
  const akce = akceData.map((a) => ({ ...a, datumCesky: C.datumCesky(a.datum), datumKratce: C.datumKratce(a.datum) }))
    .sort((a, b) => (a.datum + (a.cas || "")).localeCompare(b.datum + (b.cas || "")));
  const mapa = (await readFile(path.join(KOREN, "src/assets/mapa.svg"), "utf8")).trim();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, "assets"), { recursive: true });
  await cp(path.join(KOREN, "src/assets"), path.join(OUT, "assets"), { recursive: true });
  await rm(path.join(OUT, "assets/mapa.svg"), { force: true });
  await writeFile(path.join(OUT, "assets/knihovny.js"), await svazekKnihoven());
  await cp(path.join(KOREN, "src/ui/web.js"), path.join(OUT, "assets/web.js"));
  await writeFile(path.join(OUT, "favicon.svg"), FAVICON);
  await writeFile(path.join(OUT, "assets/logo-u-cmelaka.svg"), logoOdznak({ id: "lg" }).replace("<svg ", '<svg width="800" height="800" '));
  await writeFile(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n");

  const spolecne = { podnik, tyden, menu };
  const STRANKY = [
    ["index.html", "U Čmeláka – bistro, pizza a zahrada v Nové Vsi pod Pleší", "Pizza z pece na vyzvednutí, pivo z čepu, terasa a dětský koutek. Bistro U Čmeláka, Řadová 546, Nová Ves pod Pleší.", S.uvod({ podnik, menu, akce, mapa, tyden }), "str-uvod"],
    ["menu.html", "Jídelní lístek – U Čmeláka", "Pizza 32 cm na rajčatovém i smetanovém základu, něco k pivu, dorty a káva.", S.menuStranka({ menu }), "str-menu"],
    ["objednavka.html", "Objednávka na vyzvednutí – U Čmeláka", "Objednejte pizzu s sebou a vyberte si čas vyzvednutí.", S.objednavkaStranka({ podnik }), "str-objednavka"],
    ["zahrada.html", "Zahrada a děti – U Čmeláka", "Terasa pod světýlky, dětský koutek na dohled od stolů, oslavy na zahradě.", S.zahradaStranka({ podnik }), "str-zahrada"],
    ["akce.html", "Akce a oslavy – U Čmeláka", "Koncerty, kvízy, odpoledne pro děti a oslavy na zahradě.", S.akceStranka({ akce }), "str-akce"],
    ["kontakt.html", "Kontakt – U Čmeláka", "Řadová 546, Nová Ves pod Pleší. Otevírací doba, telefon a mapa.", S.kontaktStranka({ podnik, mapa, tyden }), "str-kontakt"],
    ["404.html", "Stránka nenalezena – U Čmeláka", "Tady čmelák nic nenašel.", S.chybaStranka(), "str-404"],
  ];
  for (const [soubor, titulek, popis, obsah, trida] of STRANKY) {
    await writeFile(path.join(OUT, soubor), stranka({ ...spolecne, titulek, popis, obsah, trida, aktivni: soubor }));
  }
  console.log(`out/: ${STRANKY.length} stránek`);
}

main().catch((e) => { console.error(e); process.exit(1); });

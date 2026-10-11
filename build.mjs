/** Sestavení webu do out/ (kořen webu pro PHP hosting). Node 24, bez závislostí.
 *  Stránky skládá na serveru src/php/sablony.php z uloženého obsahu; tady se jen připraví soubory. */
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHash } from "node:crypto";
import { ikona, IKONY, cmelak, plastev } from "./src/templates/ikony.mjs";
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
  const OUT_INC = path.join(OUT, "inc");
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT_INC, "vychozi"), { recursive: true });

  // statické soubory
  await cp(path.join(KOREN, "src/assets"), path.join(OUT, "assets"), { recursive: true });
  await rm(path.join(OUT, "assets/mapa.svg"), { force: true });
  await writeFile(path.join(OUT, "assets/knihovny.js"), await svazekKnihoven());
  await cp(path.join(KOREN, "src/ui/web.js"), path.join(OUT, "assets/web.js"));
  await writeFile(path.join(OUT, "favicon.svg"), FAVICON);
  await writeFile(path.join(OUT, "assets/logo-u-cmelaka.svg"), logoOdznak({ id: "lg" }));
  await cp(path.join(KOREN, "src/web"), OUT, { recursive: true });

  // PHP knihovny a šablony
  for (const f of await readdir(path.join(KOREN, "src/php"))) {
    if (f.endsWith(".php")) await cp(path.join(KOREN, "src/php", f), path.join(OUT_INC, f));
  }
  // výchozí data (dokud majitel v administraci nic neuloží)
  for (const f of ["podnik", "menu", "akce"]) await cp(path.join(KOREN, "data", f + ".json"), path.join(OUT_INC, "vychozi", f + ".json"));
  await cp(path.join(KOREN, "src/assets/foto/fotky.json"), path.join(OUT_INC, "vychozi/manifest.json"));
  // kresby jako JSON pro PHP
  const logo = logoOdznak({ trida: "%TRIDA%", id: "%ID%", popis: "%POPIS%" }).replace('role="img" aria-label="%POPIS%"', "%ARIA%");
  const svg = {
    ikony: Object.fromEntries(Object.keys(IKONY).map((k) => [k, IKONY[k]])),
    cmelak: cmelak("%TRIDA%"),
    plastev: plastev("%TRIDA%"),
    logo,
    mapa: (await readFile(path.join(KOREN, "src/assets/mapa.svg"), "utf8")).trim(),
  };
  await writeFile(path.join(OUT_INC, "vychozi/svg.json"), JSON.stringify(svg));

  // otisk verze: změněné styly a skripty se nestáhnou z mezipaměti prohlížeče
  const otisk = createHash("sha1");
  for (const f of ["assets/style.css", "assets/knihovny.js", "assets/web.js", "assets/admin.css", "assets/admin.js"]) otisk.update(await readFile(path.join(OUT, f)));
  const verze = otisk.digest("hex").slice(0, 10);
  await writeFile(path.join(OUT_INC, "verze.php"), `<?php\nconst CM_VERZE = ${JSON.stringify(verze)};\n`);
  await writeFile(path.join(OUT_INC, ".htaccess"), "Require all denied\n");
  console.log(`out/: PHP web, verze ${verze}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

// C-002 — Košík objednávky na vyzvednutí.

export const MAX = 20;

export function klicRadku(id, priplatky) {
  const seznam = Array.isArray(priplatky) ? priplatky.filter((p) => typeof p === "string") : [];
  const serazene = [...seznam].sort();
  return id + "|" + serazene.join(",");
}

function kopieRadku(radek) {
  return { klic: radek.klic, id: radek.id, pocet: radek.pocet, priplatky: [...radek.priplatky] };
}

function kopieKosiku(kosik) {
  return kosik.map(kopieRadku);
}

export function pridej(kosik, id, volby = {}) {
  const vysledek = kopieKosiku(kosik);
  const pocet = Math.floor(volby.pocet === undefined ? 1 : volby.pocet);
  if (pocet < 1) return vysledek;
  const priplatky = Array.isArray(volby.priplatky)
    ? [...volby.priplatky].filter((p) => typeof p === "string").sort()
    : [];
  const klic = klicRadku(id, priplatky);
  const index = vysledek.findIndex((r) => r.klic === klic);
  if (index >= 0) {
    vysledek[index].pocet = Math.min(vysledek[index].pocet + pocet, MAX);
  } else {
    vysledek.push({ klic, id, pocet: Math.min(pocet, MAX), priplatky });
  }
  return vysledek;
}

export function zmenPocet(kosik, klic, pocet) {
  const vysledek = kopieKosiku(kosik);
  const index = vysledek.findIndex((r) => r.klic === klic);
  if (index < 0) return vysledek;
  if (pocet <= 0) {
    vysledek.splice(index, 1);
  } else {
    vysledek[index].pocet = Math.min(Math.floor(pocet), MAX);
  }
  return vysledek;
}

export function odeber(kosik, klic) {
  return zmenPocet(kosik, klic, 0);
}

export function souhrn(kosik, menu, priplatky, volby = {}) {
  const krabice = volby.krabice || 0;
  const menuMap = new Map((menu || []).map((p) => [p.id, p]));
  const priplatkyMap = new Map((priplatky || []).map((p) => [p.id, p]));
  const radky = [];
  let pocetKusu = 0;
  let pocetPizz = 0;
  let mezisoucet = 0;
  for (const radek of kosik || []) {
    const polozka = menuMap.get(radek.id);
    if (!polozka) continue;
    const seznam = Array.isArray(radek.priplatky) ? radek.priplatky : [];
    const nazvy = [];
    let doplatek = 0;
    for (const pid of seznam) {
      const p = priplatkyMap.get(pid);
      if (!p) continue;
      nazvy.push(p.nazev);
      doplatek += p.cena;
    }
    const jednotkova = polozka.cena + doplatek;
    const celkem = jednotkova * radek.pocet;
    radky.push({
      klic: radek.klic,
      id: radek.id,
      nazev: polozka.nazev,
      pocet: radek.pocet,
      priplatky: nazvy,
      jednotkova,
      celkem,
    });
    pocetKusu += radek.pocet;
    if (polozka.kategorie === "pizza") pocetPizz += radek.pocet;
    mezisoucet += celkem;
  }
  const obaly = pocetPizz * krabice;
  return { radky, pocetKusu, pocetPizz, mezisoucet, obaly, celkem: mezisoucet + obaly };
}

export function serializuj(kosik) {
  return JSON.stringify(kosik);
}

export function nactiKosik(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const vysledek = [];
  const indexy = new Map();
  for (const polozka of data) {
    if (!polozka || typeof polozka !== "object" || Array.isArray(polozka)) continue;
    if (typeof polozka.id !== "string" || polozka.id === "") continue;
    if (!Number.isInteger(polozka.pocet) || polozka.pocet < 1) continue;
    const pocet = Math.min(polozka.pocet, MAX);
    let priplatky = [];
    if (Array.isArray(polozka.priplatky)) {
      priplatky = polozka.priplatky.filter((p) => typeof p === "string").sort();
    }
    const klic = klicRadku(polozka.id, priplatky);
    const existujici = indexy.get(klic);
    if (existujici !== undefined) {
      vysledek[existujici].pocet = Math.min(vysledek[existujici].pocet + pocet, MAX);
    } else {
      indexy.set(klic, vysledek.length);
      vysledek.push({ klic, id: polozka.id, pocet, priplatky });
    }
  }
  return vysledek;
}

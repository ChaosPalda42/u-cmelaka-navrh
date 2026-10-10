(function (global) {
"use strict";
var CM = global.CM = global.CM || {};
CM.cestina = (function () {
// C-005 — Čeština: skloňování podle čísla, česká data, nadcházející akce.

const DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
const DNY_K = ["po", "út", "st", "čt", "pá", "so", "ne"];
const MESICE_2P = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

function denTydne(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  const wd = new Date(Date.UTC(r, m - 1, d)).getUTCDay(); // 0 = neděle
  return (wd + 6) % 7; // pondělí = 0
}
function sklonuj(n, tvary) {
  const abs = Math.abs(n);
  const tvar = abs === 1 ? tvary[0] : abs >= 2 && abs <= 4 ? tvary[1] : tvary[2];
  return `${n} ${tvar}`;
}
function datumCesky(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return `${DNY[denTydne(datum)]} ${d}. ${MESICE_2P[m - 1]}`;
}
function datumKratce(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return `${DNY_K[denTydne(datum)]} ${d}. ${m}.`;
}

function denStredne(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return Date.UTC(r, m - 1, d) / 86400000;
}
function zaDni(dnes, datum) {
  const n = Math.round(denStredne(datum) - denStredne(dnes));
  if (n < 0) return "proběhlo";
  if (n === 0) return "dnes";
  if (n === 1) return "zítra";
  return "za " + sklonuj(n, ["den", "dny", "dní"]);
}
function nadchazejici(akce, dnes, limit) {
  const vybrane = akce
    .map((a, i) => ({ a, i }))
    .filter((x) => x.a.datum >= dnes)
    .sort((x, y) => {
      if (x.a.datum !== y.a.datum) return x.a.datum < y.a.datum ? -1 : 1;
      const cx = x.a.cas ?? "99:99";
      const cy = y.a.cas ?? "99:99";
      if (cx !== cy) return cx < cy ? -1 : 1;
      return x.i - y.i;
    })
    .map((x) => x.a);
  return limit === undefined ? vybrane : vybrane.slice(0, limit);
}

return { sklonuj, datumCesky, datumKratce, zaDni, nadchazejici };
})();
CM.kosik = (function () {
// C-002 — Košík objednávky na vyzvednutí.
const MAX = 20;
function klicRadku(id, priplatky) {
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
function pridej(kosik, id, volby = {}) {
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
function zmenPocet(kosik, klic, pocet) {
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
function odeber(kosik, klic) {
  return zmenPocet(kosik, klic, 0);
}
function souhrn(kosik, menu, priplatky, volby = {}) {
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
function serializuj(kosik) {
  return JSON.stringify(kosik);
}
function nactiKosik(text) {
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

return { MAX, klicRadku, pridej, zmenPocet, odeber, souhrn, serializuj, nactiKosik };
})();
CM.menu = (function () {
// C-004 — Jídelní lístek: hledání, filtry, seskupení, formát cen.

const NBSP = "\u00a0";
function bezDiakritiky(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function filtruj(polozky, f = {}) {
  const slova =
    f.hledat !== undefined && f.hledat !== null && String(f.hledat).trim() !== ""
      ? bezDiakritiky(String(f.hledat).trim()).split(/\s+/).filter((s) => s !== "")
      : [];
  const kategorie = f.kategorie !== undefined && f.kategorie !== null && f.kategorie !== "" ? f.kategorie : null;
  const stitky = Array.isArray(f.stitky) ? f.stitky : [];
  const bezAlergenu = Array.isArray(f.bezAlergenu) ? f.bezAlergenu : [];

  return polozky.filter((p) => {
    if (kategorie !== null && p.kategorie !== kategorie) return false;
    if (stitky.length > 0 && !stitky.every((s) => (p.stitky || []).includes(s))) return false;
    if (bezAlergenu.length > 0 && bezAlergenu.some((a) => (p.alergeny || []).includes(a))) return false;
    if (slova.length > 0) {
      const text = bezDiakritiky((p.nazev || "") + " " + (p.slozeni || ""));
      if (!slova.every((s) => text.includes(s))) return false;
    }
    return true;
  });
}
function seskup(polozky, poradi) {
  const rad = Array.isArray(poradi) ? poradi : [];
  const vRadu = new Set(rad);
  const skupiny = new Map();
  for (const p of polozky) {
    if (!skupiny.has(p.kategorie)) skupiny.set(p.kategorie, []);
    skupiny.get(p.kategorie).push(p);
  }
  const vysledek = [];
  for (const k of rad) {
    if (skupiny.has(k)) {
      vysledek.push({ kategorie: k, polozky: skupiny.get(k) });
      skupiny.delete(k);
    }
  }
  for (const [k, pol] of skupiny) vysledek.push({ kategorie: k, polozky: pol });
  return vysledek;
}
function formatCena(kc) {
  const n = Math.round(Number(kc));
  const cislice = String(Math.abs(n));
  const casti = [];
  let rest = cislice;
  while (rest.length > 3) {
    casti.unshift(rest.slice(-3));
    rest = rest.slice(0, -3);
  }
  casti.unshift(rest);
  const predpona = n < 0 ? "-" : "";
  return predpona + casti.join(NBSP) + NBSP + "Kč";
}
function alergenyText(cisla) {
  if (!Array.isArray(cisla) || cisla.length === 0) return "";
  return [...new Set(cisla)].sort((a, b) => a - b).join(", ");
}

return { bezDiakritiky, filtruj, seskup, formatCena, alergenyText };
})();
CM.validace = (function () {
// C-004 — Validace formulářů: e-mail, telefon, IČO, PSČ a pravidlový motor.

function jePrazdne(hodnota) {
  if (hodnota === undefined || hodnota === null) return true;
  if (typeof hodnota === "string" && hodnota.trim() === "") return true;
  if (Array.isArray(hodnota) && hodnota.length === 0) return true;
  return false;
}
function jeEmail(hodnota) {
  if (typeof hodnota !== "string") return false;
  if (hodnota.includes(" ")) return false;
  if (hodnota === "") return false;
  const zavinace = hodnota.split("@");
  if (zavinace.length !== 2) return false;
  const [lokalni, domena] = zavinace;
  if (lokalni === "") return false;
  const casti = domena.split(".");
  if (casti.length < 2) return false;
  if (casti.some((c) => c === "")) return false;
  const tld = casti[casti.length - 1];
  if (tld.length < 2) return false;
  if (!/^[A-Za-z]+$/.test(tld)) return false;
  return true;
}
function normalizujTelefon(hodnota) {
  if (hodnota === undefined || hodnota === null) return "";
  const ocistene = String(hodnota).replace(/[ ()\-/]/g, "");
  if (ocistene.startsWith("00420")) return "+420" + ocistene.slice(5);
  if (!ocistene.startsWith("+") && ocistene.startsWith("420") && ocistene.length === 12) {
    return "+" + ocistene;
  }
  if (!ocistene.startsWith("+") && /^\d{9}$/.test(ocistene)) {
    return "+420" + ocistene;
  }
  return ocistene;
}
function jeTelefonCz(hodnota) {
  const n = normalizujTelefon(hodnota);
  if (!n.startsWith("+420")) return false;
  const cislice = n.slice(4);
  if (!/^\d{9}$/.test(cislice)) return false;
  return "672359".includes(cislice[0]);
}
function jeIco(hodnota) {
  if (typeof hodnota !== "string") return false;
  const ocistene = hodnota.replace(/ /g, "");
  if (!/^\d{8}$/.test(ocistene)) return false;
  const vahy = [8, 7, 6, 5, 4, 3, 2];
  let soucet = 0;
  for (let i = 0; i < 7; i++) soucet += Number(ocistene[i]) * vahy[i];
  const zbytek = soucet % 11;
  const kontrolni = (11 - zbytek) % 10;
  return Number(ocistene[7]) === kontrolni;
}
function jePsc(hodnota) {
  if (typeof hodnota !== "string") return false;
  const ocistene = hodnota.replace(/ /g, "");
  if (!/^\d{5}$/.test(ocistene)) return false;
  return ocistene[0] !== "0";
}
function formatujPsc(hodnota) {
  if (typeof hodnota !== "string") return "";
  const ocistene = hodnota.replace(/ /g, "");
  if (jePsc(ocistene)) return ocistene.slice(0, 3) + " " + ocistene.slice(3);
  return ocistene;
}
function formatujTelefon(hodnota) {
  const n = normalizujTelefon(hodnota);
  if (jeTelefonCz(hodnota)) {
    return "+420 " + n.slice(4, 7) + " " + n.slice(7, 10) + " " + n.slice(10);
  }
  return n;
}

function splnujePravidlo(hodnota, pravidlo) {
  if (typeof pravidlo === "string") {
    switch (pravidlo) {
      case "required":
        return !(
          hodnota === undefined ||
          hodnota === null ||
          hodnota === false ||
          (typeof hodnota === "string" && hodnota.trim() === "") ||
          (Array.isArray(hodnota) && hodnota.length === 0)
        );
      case "email":
        return jePrazdne(hodnota) || jeEmail(hodnota);
      case "telefon":
        return jePrazdne(hodnota) || jeTelefonCz(hodnota);
      case "ico":
        return jePrazdne(hodnota) || jeIco(hodnota);
      case "psc":
        return jePrazdne(hodnota) || jePsc(hodnota);
      case "souhlas":
        return hodnota === true;
      default:
        return true;
    }
  }
  const { typ, hodnota: limit } = pravidlo;
  if (typ === "min" || typ === "max") {
    let velikost;
    if (typeof hodnota === "number") velikost = hodnota;
    else if (typeof hodnota === "string") velikost = hodnota.trim().length;
    else if (Array.isArray(hodnota)) velikost = hodnota.length;
    else return false;
    return typ === "min" ? velikost >= limit : velikost <= limit;
  }
  if (typ === "delka") {
    if (typeof hodnota !== "string") return false;
    return hodnota.trim().length === limit;
  }
  return true;
}
function validuj(hodnoty, pravidla) {
  const errors = {};
  for (const pole of Object.keys(pravidla)) {
    const seznam = pravidla[pole];
    const hodnota = hodnoty ? hodnoty[pole] : undefined;
    for (const pravidlo of seznam) {
      const kod = typeof pravidlo === "string" ? pravidlo : pravidlo.typ;
      if (!splnujePravidlo(hodnota, pravidlo)) {
        errors[pole] = kod;
        break;
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
function hlasky(errors, katalog) {
  const vysledek = {};
  for (const pole of Object.keys(errors)) {
    const kod = errors[pole];
    vysledek[pole] =
      (katalog && katalog[pole + "." + kod]) || (katalog && katalog[kod]) || kod;
  }
  return vysledek;
}

return { jeEmail, normalizujTelefon, jeTelefonCz, jeIco, jePsc, formatujPsc, formatujTelefon, validuj, hlasky };
})();
CM.objednavka = (function () {
// C-006 — Objednávka na vyzvednutí: kontrola údajů, číslo objednávky, text pro kuchyni.
const { validuj, formatujTelefon } = CM.validace;

const PRavidLA = {
  jmeno: ["required", { typ: "min", hodnota: 2 }, { typ: "max", hodnota: 60 }],
  telefon: ["required", "telefon"],
  email: ["email"],
  poznamka: [{ typ: "max", hodnota: 300 }],
  souhlas: ["souhlas"],
};
function zkontroluj(udaje, kontext = {}) {
  const hodnota = { ...(udaje || {}) };
  for (const pole of ["jmeno", "telefon", "email", "poznamka"]) {
    if (typeof hodnota[pole] !== "string") hodnota[pole] = "";
  }
  const { ok, errors } = validuj(hodnota, PRavidLA);
  if (!(kontext.pocetKusu > 0)) errors.kosik = "prazdny";
  if (typeof kontext.cas !== "string" || kontext.cas === "") errors.cas = "required";
  return { ok: Object.keys(errors).length === 0, errors };
}
const HLASKY = {
  jmeno: "Napište prosím, na jaké jméno objednávku připravíme.",
  telefon: "Telefon nevypadá jako české číslo – zkontrolujte ho prosím.",
  email: "E-mail nevypadá správně.",
  poznamka: "Poznámka je moc dlouhá, zkraťte ji prosím na 300 znaků.",
  souhlas: "Potvrďte prosím souhlas se zpracováním údajů.",
  kosik: "Košík je zatím prázdný.",
  cas: "Vyberte čas, kdy si pro jídlo přijdete.",
};
function hlaskyObjednavky(errors) {
  const vysledek = {};
  for (const pole of Object.keys(errors || {})) {
    vysledek[pole] = HLASKY[pole] || errors[pole];
  }
  return vysledek;
}
function cisloObjednavky(datum, poradi) {
  const mmdd = String(datum).slice(5, 7) + String(datum).slice(8, 10);
  return mmdd + "-" + String(poradi).padStart(3, "0");
}

function formatujCena(celkem) {
  const cislice = String(Math.round(celkem)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cislice + " Kč";
}
function textProKuchyni({ cislo, cas, udaje, souhrn }) {
  const radky = (souhrn.radky || []).map((r) => {
    const zaklad = `${r.pocet}× ${r.nazev}`;
    return r.priplatky && r.priplatky.length ? `${zaklad} (+ ${r.priplatky.join(", ")})` : zaklad;
  });
  const celkem =
    souhrn.obaly > 0
      ? `Krabice: ${souhrn.pocetPizz}× | Celkem k úhradě: ${formatujCena(souhrn.celkem)}`
      : `Celkem k úhradě: ${formatujCena(souhrn.celkem)}`;
  const casti = [
    `Objednávka ${cislo} – vyzvednutí v ${cas}`,
    `${udaje.jmeno.trim()}, ${formatujTelefon(udaje.telefon)}`,
    "",
    ...radky,
    "",
    celkem,
  ];
  const poznamka = (udaje.poznamka || "").trim();
  if (poznamka !== "") casti.push(`Poznámka: ${poznamka}`);
  return casti.join("\n");
}

return { zkontroluj, HLASKY, hlaskyObjednavky, cisloObjednavky, textProKuchyni };
})();
CM.oteviraci = (function () {
// C-001 — Otevírací doba: je teď otevřeno, kdy otevíráme, výpis týdne.

const DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
const DNY_V = ["v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu", "v neděli"];
function naMinuty(text) {
  const [h, m] = String(text).split(":");
  return Number(h) * 60 + Number(m);
}
function formatCas(minuty) {
  const h = Math.floor(minuty / 60);
  const m = minuty % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
function stav(rozvrh, den, minuty) {
  const dnes = rozvrh[den];
  if (dnes !== null && naMinuty(dnes.od) <= minuty && minuty < naMinuty(dnes.do)) {
    return {
      otevreno: true,
      do: dnes.do,
      zaviraZa: naMinuty(dnes.do) - minuty,
      otevira: null,
    };
  }
  let otevira = null;
  if (dnes !== null && minuty < naMinuty(dnes.od)) {
    otevira = { den, cas: dnes.od, zaDni: 0 };
  } else {
    for (let k = 1; k <= 7; k++) {
      const d = (den + k) % 7;
      if (rozvrh[d] !== null) {
        otevira = { den: d, cas: rozvrh[d].od, zaDni: k };
        break;
      }
    }
  }
  return { otevreno: false, do: null, zaviraZa: null, otevira };
}
function popisStavu(st) {
  if (st.otevreno) {
    if (st.zaviraZa <= 60) return `Otevřeno, zavíráme za ${st.zaviraZa} min`;
    return `Otevřeno do ${st.do}`;
  }
  if (st.otevira === null) return "Zavřeno";
  const kdy =
    st.otevira.zaDni === 0 ? "dnes" : st.otevira.zaDni === 1 ? "zítra" : DNY_V[st.otevira.den];
  return `Zavřeno, otevíráme ${kdy} v ${st.otevira.cas}`;
}
function prazskyCas(datum) {
  const casti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Prague",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(datum);
  const z = {};
  for (const c of casti) z[c.type] = c.value;
  const den = (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(z.weekday) + 7) % 7;
  return {
    den,
    minuty: Number(z.hour) * 60 + Number(z.minute),
    datum: `${z.year}-${z.month}-${z.day}`,
  };
}

function stejnaDoba(a, b) {
  if (a === null || b === null) return a === b;
  return a.od === b.od && a.do === b.do;
}
function tydenRadky(rozvrh) {
  const radky = [];
  let zacatek = 0;
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || !stejnaDoba(rozvrh[i], rozvrh[zacatek])) {
      const dny =
        i - zacatek === 1
          ? DNY[zacatek]
          : `${DNY[zacatek]} – ${DNY[i - 1]}`;
      const cas =
        rozvrh[zacatek] === null ? "zavřeno" : `${rozvrh[zacatek].od} – ${rozvrh[zacatek].do}`;
      radky.push({ dny, cas });
      zacatek = i;
    }
  }
  return radky;
}

return { naMinuty, formatCas, stav, popisStavu, prazskyCas, tydenRadky };
})();
CM.vyzvednuti = (function () {
// C-003 — Časy vyzvednutí objednávky podle otevírací doby a kapacity kuchyně.

function naMinuty(cas) {
  const [h, m] = cas.split(":").map(Number);
  return h * 60 + m;
}

function naCas(minuty) {
  const h = Math.floor(minuty / 60);
  const m = minuty % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
function dobaPripravy(pocetPizz) {
  return 20 + 5 * Math.ceil(Math.max(0, pocetPizz - 2) / 2);
}
function sloty(rozvrh, den, minuty, volby = {}) {
  const {
    pocetPizz = 0,
    krok = 15,
    kapacita = 6,
    rezerva = 15,
    obsazeno = {},
  } = volby;

  const denOtevreno = rozvrh[den];
  if (!denOtevreno) return [];

  const start = Math.ceil((Math.max(minuty, naMinuty(denOtevreno.od)) + dobaPripravy(pocetPizz)) / krok) * krok;
  const posledni = naMinuty(denOtevreno.do) - rezerva;

  const vysledek = [];
  for (let m = start; m <= posledni; m += krok) {
    const cas = naCas(m);
    const volno = Math.max(0, kapacita - (obsazeno[cas] || 0));
    vysledek.push({ cas, minuty: m, volno, dostupny: volno >= pocetPizz });
  }
  return vysledek;
}
function nejblizsi(seznam) {
  return seznam.find((s) => s.dostupny === true) ?? null;
}
function obsazenost(objednavky) {
  const vysledek = {};
  for (const o of objednavky) {
    if (!o || !o.cas) continue;
    vysledek[o.cas] = (vysledek[o.cas] || 0) + (o.pizz || 0);
  }
  return vysledek;
}

return { dobaPripravy, sloty, nejblizsi, obsazenost };
})();
})(typeof window !== "undefined" ? window : globalThis);

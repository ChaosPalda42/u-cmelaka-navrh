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

export function dobaPripravy(pocetPizz) {
  return 20 + 5 * Math.ceil(Math.max(0, pocetPizz - 2) / 2);
}

export function sloty(rozvrh, den, minuty, volby = {}) {
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

export function nejblizsi(seznam) {
  return seznam.find((s) => s.dostupny === true) ?? null;
}

export function obsazenost(objednavky) {
  const vysledek = {};
  for (const o of objednavky) {
    if (!o || !o.cas) continue;
    vysledek[o.cas] = (vysledek[o.cas] || 0) + (o.pizz || 0);
  }
  return vysledek;
}

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

export function sklonuj(n, tvary) {
  const abs = Math.abs(n);
  const tvar = abs === 1 ? tvary[0] : abs >= 2 && abs <= 4 ? tvary[1] : tvary[2];
  return `${n} ${tvar}`;
}

export function datumCesky(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return `${DNY[denTydne(datum)]} ${d}. ${MESICE_2P[m - 1]}`;
}

export function datumKratce(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return `${DNY_K[denTydne(datum)]} ${d}. ${m}.`;
}

function denStredne(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return Date.UTC(r, m - 1, d) / 86400000;
}

export function zaDni(dnes, datum) {
  const n = Math.round(denStredne(datum) - denStredne(dnes));
  if (n < 0) return "proběhlo";
  if (n === 0) return "dnes";
  if (n === 1) return "zítra";
  return "za " + sklonuj(n, ["den", "dny", "dní"]);
}

export function nadchazejici(akce, dnes, limit) {
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

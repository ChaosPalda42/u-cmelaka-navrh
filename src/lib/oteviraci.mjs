// C-001 — Otevírací doba: je teď otevřeno, kdy otevíráme, výpis týdne.

const DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
const DNY_V = ["v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu", "v neděli"];

export function naMinuty(text) {
  const [h, m] = String(text).split(":");
  return Number(h) * 60 + Number(m);
}

export function formatCas(minuty) {
  const h = Math.floor(minuty / 60);
  const m = minuty % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function stav(rozvrh, den, minuty) {
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

export function popisStavu(st) {
  if (st.otevreno) {
    if (st.zaviraZa <= 60) return `Otevřeno, zavíráme za ${st.zaviraZa} min`;
    return `Otevřeno do ${st.do}`;
  }
  if (st.otevira === null) return "Zavřeno";
  const kdy =
    st.otevira.zaDni === 0 ? "dnes" : st.otevira.zaDni === 1 ? "zítra" : DNY_V[st.otevira.den];
  return `Zavřeno, otevíráme ${kdy} v ${st.otevira.cas}`;
}

export function prazskyCas(datum) {
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

export function tydenRadky(rozvrh) {
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

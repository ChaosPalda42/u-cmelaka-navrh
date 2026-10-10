import { logoOdznak } from "./logo.mjs";
/** Maskot čmelák a drobné ikony. Barvy nese CSS (currentColor a proměnné), takže sedí ve světlém i tmavém režimu. */

/** Čmelák zboku: chlupaté tělo s pruhy, křídla mávají (třída .cm-kridla), tykadla. */
export function cmelak(trida = "", popis = "") {
  const aria = popis ? `role="img" aria-label="${popis}"` : `aria-hidden="true"`;
  return `<svg class="cmelak ${trida}" viewBox="0 0 120 96" ${aria} focusable="false">
<g class="cm-kridla">
  <ellipse class="cm-kridlo" cx="58" cy="22" rx="17" ry="24" transform="rotate(-28 58 22)"/>
  <ellipse class="cm-kridlo cm-kridlo-2" cx="74" cy="24" rx="13" ry="19" transform="rotate(18 74 24)"/>
</g>
<g class="cm-telo">
  <path class="cm-nohy" d="M46 76 l-6 12 M60 80 l-2 12 M74 78 l4 11"/>
  <ellipse class="cm-zluta" cx="62" cy="58" rx="38" ry="28"/>
  <path class="cm-pruh" d="M44 32 q-10 26 0 52 l13 1 q-9-27 0-55z"/>
  <path class="cm-pruh" d="M70 30 q9 28 0 56 l12-3 q8-25 0-50z"/>
  <path class="cm-zadek" d="M96 50 q8 8 0 18 q-4-9 0-18z"/>
  <path class="cm-chlup" d="M30 46 q-3-4 1-6 M38 36 q-1-5 3-6 M88 38 q3-4 6-1 M96 60 q5 1 4 5 M80 84 q1 4-3 5 M50 86 q-2 4-6 2"/>
  <circle class="cm-hlava" cx="27" cy="58" r="17"/>
  <circle class="cm-oko" cx="20" cy="54" r="4.2"/>
  <circle class="cm-lesk" cx="18.6" cy="52.6" r="1.4"/>
  <path class="cm-usmev" d="M15 64 q5 4 10 1"/>
  <ellipse class="cm-tvar" cx="29" cy="64" rx="3.4" ry="2.2"/>
  <path class="cm-tykadla" d="M24 42 q-4-12-12-15 M31 41 q2-13 10-17"/>
  <circle class="cm-tykadlo" cx="12" cy="27" r="2.4"/><circle class="cm-tykadlo" cx="41" cy="24" r="2.4"/>
</g>
</svg>`;
}

/** Logo: čmelák + jméno. */
export function logo(koren) {
  return `<a class="logo" href="${koren}index.html" aria-label="U Čmeláka – úvod">${logoOdznak({ trida: "logo-znak", id: "lgh", popis: "" })}<span class="logo-text"><span class="logo-bistro">Bistro</span><span><span class="logo-u">U</span> Čmeláka</span></span></a>`;
}

export const IKONY = {
  pizza: `<path d="M12 2 2.5 20.5a1 1 0 0 0 1.3 1.3L22 12.3A10.5 10.5 0 0 0 12 2z"/><circle cx="10" cy="11" r="1.4"/><circle cx="13.5" cy="15" r="1.4"/><circle cx="8" cy="16.5" r="1.2"/><path d="M5 15.5c3 0 7 2 8.6 5"/>`,
  kosik: `<path d="M3 6h18l-2 11H5z"/><path d="M8 6l3-4M16 6l-3-4"/><circle cx="8" cy="21" r="1.2"/><circle cx="17" cy="21" r="1.2"/>`,
  hodiny: `<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.5"/>`,
  dite: `<circle cx="12" cy="5" r="2.6"/><path d="M12 8v7m-5-4 5-2 5 2M9 21l3-6 3 6"/>`,
  strom: `<path d="M12 22v-7"/><path d="M12 15c-5 0-8-3-6.5-7C7 4 10 2 12 2s5 2 6.5 6c1.5 4-1.5 7-6.5 7z"/>`,
  pivo: `<path d="M5 7h11v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M16 10h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H16"/><path d="M5 7c0-2.5 2-4 4-3.5C10 2 13 2 14 3.8 16 3.6 17 5 16 7"/>`,
  telefon: `<path d="M6.6 2.5 9 3l1.5 4.6-2.3 1.6a12 12 0 0 0 6.6 6.6l1.6-2.3L21 15l.5 2.4c.2 1.4-1 3.1-2.6 3.1C10.5 20.5 3.5 13.5 3.5 5.1c0-1.6 1.7-2.8 3.1-2.6z"/>`,
  mapa: `<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>`,
  kalendar: `<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>`,
  hudba: `<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="16" r="2.6"/>`,
  dort: `<path d="M3 21h18M4.5 21v-8h15v8M4.5 16c2 1.4 3.5 1.4 5 0s3-1.4 5 0 3.5 1.4 5 0"/><path d="M12 13V9m0-3.5c.8.8.8 2 0 2.5-.8-.5-.8-1.7 0-2.5z"/>`,
  sipka: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  krizek: `<path d="M6 6l12 12M18 6 6 18"/>`,
  slunce: `<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>`,
  mesic: `<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>`,
  hledat: `<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>`,
  list: `<path d="M5 21c0-9 5-15 15-17-1 10-6 15-15 17z"/><path d="M5 21 14 12"/>`,
  ohen: `<path d="M12 22c4.4 0 7-2.8 7-6.6 0-4.4-4-6.4-4.6-10.4-2.6 1.6-3.6 4-3.4 6.6C9.6 10.4 9 9 9 7.4 6.6 9.6 5 12.4 5 15.4 5 19.2 7.6 22 12 22z"/>`,
  karta: `<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>`,
  wifi: `<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10.5 10.5 0 0 1 14 0M8.4 16a5.5 5.5 0 0 1 7.2 0"/><circle cx="12" cy="19.5" r="1.1"/>`,
  zidle: `<path d="M7 3v18M7 12h10v9M7 8h10V3"/>`,
  balonky: `<ellipse cx="9" cy="8" rx="4.5" ry="5.5"/><ellipse cx="16" cy="9.5" rx="3.6" ry="4.6"/><path d="M9 13.5c0 3 2 4 1 8M16 14c0 2.6-1.2 3.6-.6 7.5"/>`,
};

export function ikona(jmeno, trida = "") {
  return `<svg class="ik ${trida}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IKONY[jmeno] || ""}</svg>`;
}

/** Plástev – šestiúhelník jako dekorace. */
export function plastev(trida = "") {
  return `<svg class="plastev ${trida}" viewBox="0 0 100 115" aria-hidden="true" focusable="false"><path d="M50 3 96 29.5v56L50 112 4 85.5v-56z"/></svg>`;
}

// C-006 — Objednávka na vyzvednutí: kontrola údajů, číslo objednávky, text pro kuchyni.
import { validuj, formatujTelefon } from "./validace.mjs";

const PRavidLA = {
  jmeno: ["required", { typ: "min", hodnota: 2 }, { typ: "max", hodnota: 60 }],
  telefon: ["required", "telefon"],
  email: ["email"],
  poznamka: [{ typ: "max", hodnota: 300 }],
  souhlas: ["souhlas"],
};

export function zkontroluj(udaje, kontext = {}) {
  const hodnota = { ...(udaje || {}) };
  for (const pole of ["jmeno", "telefon", "email", "poznamka"]) {
    if (typeof hodnota[pole] !== "string") hodnota[pole] = "";
  }
  const { ok, errors } = validuj(hodnota, PRavidLA);
  if (!(kontext.pocetKusu > 0)) errors.kosik = "prazdny";
  if (typeof kontext.cas !== "string" || kontext.cas === "") errors.cas = "required";
  return { ok: Object.keys(errors).length === 0, errors };
}

export const HLASKY = {
  jmeno: "Napište prosím, na jaké jméno objednávku připravíme.",
  telefon: "Telefon nevypadá jako české číslo – zkontrolujte ho prosím.",
  email: "E-mail nevypadá správně.",
  poznamka: "Poznámka je moc dlouhá, zkraťte ji prosím na 300 znaků.",
  souhlas: "Potvrďte prosím souhlas se zpracováním údajů.",
  kosik: "Košík je zatím prázdný.",
  cas: "Vyberte čas, kdy si pro jídlo přijdete.",
};

export function hlaskyObjednavky(errors) {
  const vysledek = {};
  for (const pole of Object.keys(errors || {})) {
    vysledek[pole] = HLASKY[pole] || errors[pole];
  }
  return vysledek;
}

export function cisloObjednavky(datum, poradi) {
  const mmdd = String(datum).slice(5, 7) + String(datum).slice(8, 10);
  return mmdd + "-" + String(poradi).padStart(3, "0");
}

function formatujCena(celkem) {
  const cislice = String(Math.round(celkem)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cislice + " Kč";
}

export function textProKuchyni({ cislo, cas, udaje, souhrn }) {
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

// C-004 — Jídelní lístek: hledání, filtry, seskupení, formát cen.

const NBSP = "\u00a0";

export function bezDiakritiky(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filtruj(polozky, f = {}) {
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

export function seskup(polozky, poradi) {
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

export function formatCena(kc) {
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

export function alergenyText(cisla) {
  if (!Array.isArray(cisla) || cisla.length === 0) return "";
  return [...new Set(cisla)].sort((a, b) => a - b).join(", ");
}

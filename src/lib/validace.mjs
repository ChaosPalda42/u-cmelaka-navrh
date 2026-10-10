// C-004 — Validace formulářů: e-mail, telefon, IČO, PSČ a pravidlový motor.

function jePrazdne(hodnota) {
  if (hodnota === undefined || hodnota === null) return true;
  if (typeof hodnota === "string" && hodnota.trim() === "") return true;
  if (Array.isArray(hodnota) && hodnota.length === 0) return true;
  return false;
}

export function jeEmail(hodnota) {
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

export function normalizujTelefon(hodnota) {
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

export function jeTelefonCz(hodnota) {
  const n = normalizujTelefon(hodnota);
  if (!n.startsWith("+420")) return false;
  const cislice = n.slice(4);
  if (!/^\d{9}$/.test(cislice)) return false;
  return "672359".includes(cislice[0]);
}

export function jeIco(hodnota) {
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

export function jePsc(hodnota) {
  if (typeof hodnota !== "string") return false;
  const ocistene = hodnota.replace(/ /g, "");
  if (!/^\d{5}$/.test(ocistene)) return false;
  return ocistene[0] !== "0";
}

export function formatujPsc(hodnota) {
  if (typeof hodnota !== "string") return "";
  const ocistene = hodnota.replace(/ /g, "");
  if (jePsc(ocistene)) return ocistene.slice(0, 3) + " " + ocistene.slice(3);
  return ocistene;
}

export function formatujTelefon(hodnota) {
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

export function validuj(hodnoty, pravidla) {
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

export function hlasky(errors, katalog) {
  const vysledek = {};
  for (const pole of Object.keys(errors)) {
    const kod = errors[pole];
    vysledek[pole] =
      (katalog && katalog[pole + "." + kod]) || (katalog && katalog[kod]) || kod;
  }
  return vysledek;
}

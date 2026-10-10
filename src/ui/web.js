/* U Čmeláka – chování stránek. Logika (otevírací doba, košík, časy, menu, čeština, objednávka) je v CM.* z src/lib. */
(function () {
  "use strict";
  var D = window.CM_DATA || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var KLIC_KOSIK = "cm-kosik";
  var KLIC_TEMA = "cm-tema";
  var KLIC_OBJ = "cm-poradi";
  var klidne = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  function uloz(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function nacti(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var kc = function (n) { return CM.menu.formatCena(n); };

  /* ---------- režim ---------- */
  var btnTema = $("[data-prepni-tema]");
  if (btnTema) btnTema.addEventListener("click", function () {
    var tmavyTed = document.documentElement.dataset.tema === "tmavy" ||
      (!document.documentElement.dataset.tema && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var nove = tmavyTed ? "svetly" : "tmavy";
    document.documentElement.dataset.tema = nove;
    uloz(KLIC_TEMA, nove);
  });

  /* ---------- hlavička a mobilní menu ---------- */
  var hlavicka = $("[data-hlavicka]");
  var posun = function () { if (hlavicka) hlavicka.classList.toggle("je-posunuto", window.scrollY > 8); };
  window.addEventListener("scroll", posun, { passive: true }); posun();
  var menuBtn = $("[data-menu-btn]"), nav = $("#nav");
  if (menuBtn && nav) {
    var zavri = function () { nav.classList.remove("otevreno"); menuBtn.setAttribute("aria-expanded", "false"); };
    menuBtn.addEventListener("click", function () {
      var otevrit = menuBtn.getAttribute("aria-expanded") !== "true";
      nav.classList.toggle("otevreno", otevrit); menuBtn.setAttribute("aria-expanded", String(otevrit));
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") zavri(); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", zavri); });
  }

  /* ---------- čas: skutečný, nebo předstíraný v ukázce ---------- */
  var predstirany = null;
  function ted() {
    var p = CM.oteviraci.prazskyCas(new Date());
    return predstirany ? { den: predstirany.den, minuty: predstirany.minuty, datum: p.datum } : p;
  }

  /* ---------- otevřeno / zavřeno ---------- */
  var DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
  function obnovStav() {
    var t = ted();
    var st = CM.oteviraci.stav(D.rozvrh, t.den, t.minuty);
    var text = CM.oteviraci.popisStavu(st);
    $$("[data-stav-text]").forEach(function (el) { el.textContent = text; });
    $$("[data-dnes]").forEach(function (el) { el.classList.toggle("je-otevreno", st.otevreno); });
    // dnešní řádek v otevírací době
    $$(".hodiny div, .hodiny-mini div").forEach(function (div) {
      var dt = div.querySelector("dt"); if (!dt) return;
      var casti = dt.textContent.split(" – ");
      var od = DNY.indexOf(casti[0]), doo = DNY.indexOf(casti[casti.length - 1]);
      div.classList.toggle("dnes-den", od >= 0 && t.den >= od && t.den <= doo);
    });
    // nejbližší vyzvednutí na úvodu
    var slotRadek = $("[data-dnes-slot]");
    if (slotRadek) {
      var s = CM.vyzvednuti.nejblizsi(CM.vyzvednuti.sloty(D.rozvrh, t.den, t.minuty, { pocetPizz: 2, obsazeno: demoObsazeno() }));
      slotRadek.hidden = !s;
      if (s) $("[data-slot-cas]", slotRadek).textContent = "dnes v " + s.cas;
    }
    return st;
  }

  /** Ukázka: pár už přijatých objednávek, aby bylo vidět, že se sloty plní. */
  function demoObsazeno() {
    return CM.vyzvednuti.obsazenost([
      { cas: "17:30", pizz: 4 }, { cas: "17:30", pizz: 2 }, { cas: "18:00", pizz: 5 }, { cas: "18:15", pizz: 3 }, { cas: "19:00", pizz: 6 }
    ]);
  }

  /* ---------- košík ---------- */
  function kosik() { return CM.kosik.nactiKosik(nacti(KLIC_KOSIK)); }
  function ulozKosik(k) { uloz(KLIC_KOSIK, CM.kosik.serializuj(k)); obnovOdznak(); }
  function souhrn(k) { return CM.kosik.souhrn(k, D.menu.polozky, D.menu.priplatky, { krabice: D.krabice }); }
  function obnovOdznak(bzuk) {
    var s = souhrn(kosik());
    $$("[data-kosik-pocet]").forEach(function (el) { el.hidden = s.pocetKusu === 0; el.textContent = s.pocetKusu; });
    var b = $("[data-kosik-btn]");
    if (b) {
      b.setAttribute("aria-label", s.pocetKusu ? "Košík: " + CM.cestina.sklonuj(s.pocetKusu, ["položka", "položky", "položek"]) + ", " + kc(s.celkem) : "Košík je prázdný");
      if (bzuk && !klidne) { b.classList.remove("bzuci"); void b.offsetWidth; b.classList.add("bzuci"); }
    }
  }
  obnovOdznak();
  window.addEventListener("storage", function (e) { if (e.key === KLIC_KOSIK) { obnovOdznak(); if (stranaObjednavky) vykresliKosik(); } });

  var toastTimer;
  function toast(html) {
    var t = $("[data-toast]");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); t.dataset.toast = ""; document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }
  function polozka(id) { return D.menu.polozky.filter(function (p) { return p.id === id; })[0]; }
  function pridejDoKosiku(id, volby, tlacitko) {
    ulozKosik(CM.kosik.pridej(kosik(), id, volby));
    obnovOdznak(true);
    var p = polozka(id), n = (volby && volby.pocet) || 1;
    toast("<span>" + (n > 1 ? n + "× " : "") + esc(p ? p.nazev : "") + " je v košíku</span><a href=\"" + (D.koren || "") + "objednavka.html\">Do košíku →</a>");
    if (tlacitko) {
      tlacitko.classList.add("pridano");
      var span = tlacitko.querySelector("span"); var puvodni = span ? span.textContent : "";
      if (span) span.textContent = "V košíku";
      setTimeout(function () { tlacitko.classList.remove("pridano"); if (span) span.textContent = puvodni; }, 1600);
    }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

  /* dialog s příplatky k pizze */
  var dialog = $("[data-dialog-pizza]");
  var dpId = null, dpPocet = 1, dpTlacitko = null;
  function dpCena() {
    var p = polozka(dpId); if (!p) return;
    var zvolene = $$("input[name=priplatek]:checked", dialog).map(function (i) { return i.value; });
    var cena = p.cena + D.menu.priplatky.filter(function (x) { return zvolene.indexOf(x.id) >= 0; }).reduce(function (a, x) { return a + x.cena; }, 0);
    $("[data-dp-cena]", dialog).textContent = kc(cena * dpPocet);
    $("[data-dp-pocet]", dialog).textContent = dpPocet;
  }
  if (dialog) {
    dialog.addEventListener("change", dpCena);
    $("[data-ubrat]", dialog).addEventListener("click", function () { dpPocet = Math.max(1, dpPocet - 1); dpCena(); });
    $("[data-pridat-kus]", dialog).addEventListener("click", function () { dpPocet = Math.min(20, dpPocet + 1); dpCena(); });
    dialog.addEventListener("close", function () {
      if (dialog.returnValue === "pridat" && dpId) {
        var zvolene = $$("input[name=priplatek]:checked", dialog).map(function (i) { return i.value; });
        pridejDoKosiku(dpId, { pocet: dpPocet, priplatky: zvolene }, dpTlacitko);
      }
      if (dpTlacitko) dpTlacitko.focus();
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close("zrusit"); });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pridat]"); if (!b) return;
    var id = b.getAttribute("data-pridat"), p = polozka(id); if (!p) return;
    if (p.kategorie === "pizza" && dialog && typeof dialog.showModal === "function") {
      dpId = id; dpPocet = 1; dpTlacitko = b;
      $("[data-dp-nazev]", dialog).textContent = p.nazev;
      $("[data-dp-slozeni]", dialog).textContent = p.slozeni || "";
      $$("input[name=priplatek]", dialog).forEach(function (i) { i.checked = false; });
      dialog.returnValue = ""; dpCena(); dialog.showModal();
    } else {
      pridejDoKosiku(id, { pocet: 1 }, b);
    }
  });

  /* ---------- jídelní lístek: filtry ---------- */
  var filtry = $("[data-filtry]");
  if (filtry) {
    var vsechnaJidla = $$("[data-jidlo]").map(function (el) {
      return { id: el.dataset.jidlo, el: el, nazev: $(".jidlo-nazev", el).textContent, slozeni: ($(".jidlo-slozeni", el) || { textContent: "" }).textContent,
        kategorie: el.closest("[data-skupina]").dataset.skupina,
        stitky: $$(".stitek", el).map(function (s) { return s.className.replace(/.*stitek-/, ""); }),
        alergeny: (($(".alergeny", el) || { textContent: "" }).textContent.replace("A:", "").split(",").map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; })) };
    });
    var stavF = { hledat: "", kategorie: "", stitky: [], bezAlergenu: [] };
    var proved = function () {
      var hledat = stavF.hledat, stitky = stavF.stitky.slice();
      // „bez masa“ napsané do hledání = štítek vege
      if (/\bbez masa\b/.test(CM.menu.bezDiakritiky(hledat))) { hledat = hledat.replace(/bez masa/i, ""); if (stitky.indexOf("vege") < 0) stitky.push("vege"); }
      var vysledek = CM.menu.filtruj(vsechnaJidla, { hledat: hledat, kategorie: stavF.kategorie, stitky: stitky, bezAlergenu: stavF.bezAlergenu });
      var ids = {}; vysledek.forEach(function (p) { ids[p.id] = 1; });
      vsechnaJidla.forEach(function (p) { p.el.hidden = !ids[p.id]; });
      $$("[data-skupina]").forEach(function (s) { s.hidden = !$$("[data-jidlo]", s).some(function (el) { return !el.hidden; }); });
      $("[data-nic]").hidden = vysledek.length > 0;
    };
    $("[data-hledat]", filtry).addEventListener("input", function (e) { stavF.hledat = e.target.value; proved(); });
    $$("[data-kat]", filtry).forEach(function (b) {
      b.addEventListener("click", function () {
        stavF.kategorie = b.dataset.kat;
        $$("[data-kat]", filtry).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        proved();
      });
    });
    $$("[data-stitek]", filtry).forEach(function (b) {
      b.addEventListener("click", function () {
        var s = b.dataset.stitek, i = stavF.stitky.indexOf(s);
        if (i >= 0) stavF.stitky.splice(i, 1); else stavF.stitky.push(s);
        b.setAttribute("aria-pressed", String(i < 0)); proved();
      });
    });
    var bezLepku = $("[data-bez-lepku]", filtry);
    bezLepku.addEventListener("click", function () {
      var zap = bezLepku.getAttribute("aria-pressed") !== "true";
      stavF.bezAlergenu = zap ? [1] : []; bezLepku.setAttribute("aria-pressed", String(zap)); proved();
    });
  }

  /* ---------- akce: proběhlé schovat, „za 3 dny“ ---------- */
  $$("[data-akce-seznam]").forEach(function (seznam) {
    var dnes = ted().datum;
    var karty = $$("[data-akce]", seznam);
    var budouci = CM.cestina.nadchazejici(karty.map(function (el) { return { datum: el.dataset.datum, el: el }; }), dnes);
    var limit = parseInt(seznam.dataset.limit || "0", 10) || budouci.length;
    karty.forEach(function (el) { el.hidden = true; });
    budouci.slice(0, limit).forEach(function (a) {
      a.el.hidden = false;
      var za = $("[data-za-dni]", a.el); if (za) za.textContent = CM.cestina.zaDni(dnes, a.datum);
    });
    var nic = $("[data-akce-nic]"); if (nic) nic.hidden = budouci.length > 0;
  });

  /* ---------- objednávka ---------- */
  var stranaObjednavky = $("[data-objednavka]");
  var zvolenyCas = "";
  function vykresliKosik() {
    var k = kosik(), s = souhrn(k);
    var radky = $("[data-kosik-radky]");
    radky.innerHTML = s.radky.map(function (r) {
      return "<div class=\"radek\" data-radek=\"" + esc(r.klic) + "\">" +
        "<span class=\"radek-nazev\">" + esc(r.nazev) + "</span>" +
        "<span class=\"radek-cena\">" + kc(r.celkem) + "</span>" +
        (r.priplatky.length ? "<span class=\"radek-priplatky\">+ " + esc(r.priplatky.join(", ")) + "</span>" : "") +
        "<div class=\"radek-ovladani\"><div class=\"pocitadlo pocitadlo-male\">" +
        "<button type=\"button\" data-zmena=\"-1\" aria-label=\"Ubrat " + esc(r.nazev) + "\"><svg class=\"ik\" viewBox=\"0 0 24 24\"><path d=\"M5 12h14\"/></svg></button>" +
        "<output aria-label=\"Počet\">" + r.pocet + "</output>" +
        "<button type=\"button\" data-zmena=\"1\" aria-label=\"Přidat " + esc(r.nazev) + "\"><svg class=\"ik\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></svg></button></div>" +
        "<span class=\"radek-jednotkova\">" + kc(r.jednotkova) + " / ks</span>" +
        "<button type=\"button\" class=\"odebrat\" data-odebrat>Odebrat</button></div></div>";
    }).join("");
    var prazdny = s.radky.length === 0;
    $("[data-kosik-prazdny]").hidden = !prazdny;
    $("[data-souhrn]").hidden = prazdny;
    $("[data-pridat-dalsi]").hidden = prazdny;
    $("[data-s-mezisoucet]").textContent = kc(s.mezisoucet);
    $("[data-s-obaly]").textContent = kc(s.obaly);
    $("[data-s-krabice-popis]").textContent = s.pocetPizz ? "Krabice (" + CM.cestina.sklonuj(s.pocetPizz, ["kus", "kusy", "kusů"]) + " × " + kc(D.krabice) + ")" : "Krabice";
    $("[data-s-obaly]").parentNode.hidden = s.pocetPizz === 0;
    $("[data-s-celkem]").textContent = kc(s.celkem);
    $("[data-odeslat-cena]").textContent = prazdny ? "" : "· " + kc(s.celkem);
    vykresliSloty();
  }
  function vykresliSloty() {
    var t = ted(), s = souhrn(kosik());
    var st = CM.oteviraci.stav(D.rozvrh, t.den, t.minuty);
    var sloty = CM.vyzvednuti.sloty(D.rozvrh, t.den, t.minuty, { pocetPizz: s.pocetPizz, obsazeno: demoObsazeno() });
    var box = $("[data-sloty]");
    var stavEl = $("[data-obj-stav]");
    if (!sloty.length) {
      stavEl.innerHTML = esc(CM.oteviraci.popisStavu(st)) + ". Dnes už pizzu s sebou nestihneme – objednávky přijímáme v otevírací době, nebo zavolejte.";
      box.innerHTML = ""; zvolenyCas = "";
    } else {
      stavEl.textContent = CM.oteviraci.popisStavu(st) + ". Vyberte, kdy si pro jídlo přijdete:";
      if (zvolenyCas && !sloty.some(function (x) { return x.cas === zvolenyCas && x.dostupny; })) zvolenyCas = "";
      box.innerHTML = sloty.map(function (x) {
        return "<label class=\"slot\"><input type=\"radio\" name=\"cas\" value=\"" + x.cas + "\"" + (x.dostupny ? "" : " disabled") + (x.cas === zvolenyCas ? " checked" : "") + ">" +
          "<span>" + x.cas + "</span>" + (x.dostupny ? (x.volno < 6 && s.pocetPizz ? "<small class=\"slot-plno\">zbývá " + x.volno + "</small>" : "") : "<small class=\"slot-plno\">plno</small>") + "</label>";
      }).join("");
    }
    $("[data-priprava]").textContent = s.pocetPizz
      ? CM.cestina.sklonuj(s.pocetPizz, ["pizza", "pizzy", "pizz"]) + " – příprava zhruba " + CM.vyzvednuti.dobaPripravy(s.pocetPizz) + " minut. Plné časy už mají v peci jiné objednávky."
      : "";
  }
  if (stranaObjednavky) {
    var pred = $("[data-predstirat]");
    if (pred) pred.addEventListener("change", function () {
      predstirany = pred.value ? { den: +pred.value.split(",")[0], minuty: +pred.value.split(",")[1] } : null;
      obnovStav(); vykresliSloty();
    });
    $("[data-kosik-radky]").addEventListener("click", function (e) {
      var radek = e.target.closest("[data-radek]"); if (!radek) return;
      var klic = radek.dataset.radek, k = kosik();
      var r = k.filter(function (x) { return x.klic === klic; })[0]; if (!r) return;
      var zmena = e.target.closest("[data-zmena]");
      if (zmena) ulozKosik(CM.kosik.zmenPocet(k, klic, r.pocet + parseInt(zmena.dataset.zmena, 10)));
      else if (e.target.closest("[data-odebrat]")) ulozKosik(CM.kosik.odeber(k, klic));
      else return;
      vykresliKosik();
      var znovu = $("[data-radek=\"" + (window.CSS && CSS.escape ? CSS.escape(klic) : klic) + "\"] [data-zmena=\"" + (zmena ? zmena.dataset.zmena : "1") + "\"]");
      if (znovu) znovu.focus();
    });
    $("[data-sloty]").addEventListener("change", function (e) { if (e.target.name === "cas") { zvolenyCas = e.target.value; ukazChyby({}, "cas"); } });
    var form = $("[data-obj-form]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var k = kosik(), s = souhrn(k);
      var udaje = { jmeno: form.jmeno.value, telefon: form.telefon.value, email: form.email.value, poznamka: form.poznamka.value, souhlas: form.souhlas.checked };
      var v = CM.objednavka.zkontroluj(udaje, { pocetKusu: s.pocetKusu, cas: zvolenyCas });
      var hl = CM.objednavka.hlaskyObjednavky(v.errors);
      if (v.errors.telefon === "required") hl.telefon = "Napište prosím telefon, ať se vám můžeme ozvat.";
      ukazChyby(hl);
      if (!v.ok) {
        var prvni = $(".ma-chybu input, .ma-chybu textarea", form) || (v.errors.cas ? $("[data-sloty] input:not(:disabled)") : null);
        if (prvni) prvni.focus(); else if (v.errors.kosik) $("[data-kosik-prazdny] a").focus();
        return;
      }
      var poradi = (parseInt(nacti(KLIC_OBJ) || "0", 10) || 0) + 1; uloz(KLIC_OBJ, String(poradi));
      var cislo = CM.objednavka.cisloObjednavky(ted().datum, poradi);
      $("[data-p-cislo]").textContent = cislo;
      $("[data-p-cas]").textContent = zvolenyCas;
      $("[data-p-text]").textContent = CM.objednavka.textProKuchyni({ cislo: cislo, cas: zvolenyCas, udaje: udaje, souhrn: s });
      ulozKosik([]);
      stranaObjednavky.hidden = true; $("[data-demo-cas]").hidden = true;
      $(".stranka-hlava").hidden = true;
      var p = $("[data-potvrzeni]"); p.hidden = false; p.focus(); window.scrollTo(0, 0);
    });
    form.addEventListener("input", function (e) { if (e.target.name) ukazChyby({}, e.target.name); });
    vykresliKosik();
  }
  function ukazChyby(hlasky, jenPole) {
    $$("[data-chyba]").forEach(function (el) {
      var pole = el.dataset.chyba;
      if (jenPole && pole !== jenPole) return;
      var h = hlasky[pole];
      el.hidden = !h; el.textContent = h || "";
      var obal = el.closest(".pole"); if (obal) obal.classList.toggle("ma-chybu", !!h);
      var vstup = obal ? obal.querySelector("input, textarea") : null;
      if (vstup) { vstup.setAttribute("aria-invalid", h ? "true" : "false"); if (h) { el.id = el.id || "chyba-" + pole; vstup.setAttribute("aria-describedby", el.id); } }
    });
  }

  /* ---------- poptávka oslavy ---------- */
  var oslava = $("[data-oslava-form]");
  if (oslava) {
    var dnesIso = ted().datum;
    oslava.datum.min = dnesIso;
    oslava.addEventListener("submit", function (e) {
      e.preventDefault();
      var h = { datum: oslava.datum.value, hoste: oslava.hoste.value === "" ? "" : Number(oslava.hoste.value), jmeno: oslava.jmeno.value, telefon: oslava.telefon.value, souhlas: oslava.souhlas.checked };
      var v = CM.validace.validuj(h, { datum: ["required"], hoste: ["required", { typ: "min", hodnota: 4 }, { typ: "max", hodnota: 120 }], jmeno: ["required", { typ: "min", hodnota: 2 }], telefon: ["required", "telefon"], souhlas: ["souhlas"] });
      if (!v.errors.datum && h.datum < dnesIso) v.errors.datum = "minulost";
      var texty = CM.validace.hlasky(v.errors, {
        "datum.required": "Vyberte datum oslavy.", "datum.minulost": "Tohle datum už bylo.",
        "hoste.required": "Kolik vás přibližně bude?", "hoste.min": "Oslavy chystáme od 4 lidí.", "hoste.max": "Na víc než 120 lidí se raději domluvme telefonem.",
        "jmeno.required": "Napište prosím jméno.", "jmeno.min": "Napište prosím celé jméno.",
        "telefon.required": "Bez telefonu se vám neozveme.", "telefon.telefon": "Telefon nevypadá jako české číslo.", "souhlas": "Potvrďte prosím souhlas."
      });
      $$("[data-chyba]", oslava).forEach(function (el) {
        var t = texty[el.dataset.chyba]; el.hidden = !t; el.textContent = t || "";
        var obal = el.closest(".pole"); if (obal) obal.classList.toggle("ma-chybu", !!t);
      });
      if (Object.keys(v.errors).length) { var f = $(".ma-chybu input", oslava); if (f) f.focus(); return; }
      var hotovo = $("[data-hotovo]", oslava); hotovo.hidden = false; hotovo.focus();
      $$("input, select, textarea, button", oslava).forEach(function (x) { x.disabled = true; });
    });
  }

  /* ---------- 404 v podsložce: odkazy na kořen webu ---------- */
  $$("[data-koren-odkaz]").forEach(function (a) {
    var casti = location.pathname.split("/").filter(Boolean);
    var koren = location.hostname.endsWith("github.io") && casti.length ? "/" + casti[0] + "/" : "/";
    a.href = koren + a.getAttribute("href");
  });

  /* ---------- odhalování při posunu ---------- */
  if ("IntersectionObserver" in window && !klidne) {
    var io = new IntersectionObserver(function (zaznamy) {
      zaznamy.forEach(function (z) { if (z.isIntersecting) { z.target.classList.add("videt"); io.unobserve(z.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".jidlo, .akce-karta, .kroky li, .zahrada-fotky, .karta, .dvojice > *, .mz, .pravidla-in, .mapa-ram").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("odhalit"); io.observe(el); }
    });
  }

  /* ---------- čmelák přiletí na tlačítko ---------- */
  var hero = $(".hero"), letec = $("[data-letec]"), cil = $("[data-pristani]"), letSvg = $(".let"), letCesta = $("[data-let-cesta]");
  if (hero && letec && cil && !klidne) {
    var leti = false;
    var spust = function () {
      if (leti) return; leti = true;
      var h = hero.getBoundingClientRect(), b = cil.getBoundingClientRect();
      var W = h.width, H = h.height, vel = letec.offsetWidth || 64;
      var x1 = b.right - h.left - 26, y1 = b.top - h.top - vel * .22;
      var x0 = W + 40, y0 = H * .08;
      var d = "M" + x0 + "," + y0 +
        " C" + (W * .72) + "," + (-H * .08) + " " + (W * .58) + "," + (H * .42) + " " + (W * .74) + "," + (H * .44) +
        " S" + (W * .9) + "," + (H * .2) + " " + (W * .66) + "," + (H * .22) +
        " S" + (x1 + W * .12) + "," + (y1 - H * .3) + " " + x1 + "," + y1;
      letSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      letSvg.setAttribute("preserveAspectRatio", "none");
      letCesta.setAttribute("d", d);
      var L = letCesta.getTotalLength();
      letCesta.style.strokeDashoffset = "0";
      letSvg.classList.add("vidim");
      letec.classList.add("leti");
      var start = null, DOBA = 3600;
      var krok = function (cas) {
        if (start === null) start = cas;
        var t = Math.min(1, (cas - start) / DOBA);
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var p = letCesta.getPointAtLength(e * L), q = letCesta.getPointAtLength(Math.min(L, e * L + 2));
        var bzz = Math.sin(cas / 55) * 2.2 * (1 - t);
        letec.style.transform = "translate(" + (p.x - vel / 2) + "px," + (p.y - vel / 2 + bzz) + "px) rotate(" + Math.max(-18, Math.min(18, (q.y - p.y) * 6)) + "deg)";
        letec.classList.toggle("otocit", q.x > p.x);
        if (t < 1) requestAnimationFrame(krok);
        else {
          cil.classList.add("pristal");
          setTimeout(function () { letSvg.classList.remove("vidim"); }, 600);
          letec.classList.remove("otocit");
          leti = false;
        }
      };
      requestAnimationFrame(krok);
    };
    setTimeout(spust, 700);
    var zmena;
    window.addEventListener("resize", function () {
      clearTimeout(zmena);
      zmena = setTimeout(function () {
        if (leti) return;
        var h = hero.getBoundingClientRect(), b = cil.getBoundingClientRect(), vel = letec.offsetWidth || 64;
        letec.style.transform = "translate(" + (b.right - h.left - 26 - vel / 2) + "px," + (b.top - h.top - vel * .22 - vel / 2) + "px)";
      }, 120);
    });
    cil.addEventListener("mouseenter", function () { cil.classList.remove("pristal"); void cil.offsetWidth; cil.classList.add("pristal"); });
  }

  obnovStav();
  setInterval(function () { obnovStav(); if (stranaObjednavky && $("[data-potvrzeni]").hidden) vykresliSloty(); }, 60000);
})();

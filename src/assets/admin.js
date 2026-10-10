/* Administrace U Čmeláka. Bez knihoven: stav v paměti, uložení po sekcích přes /admin/api.php. */
(function () {
  "use strict";
  var API = "/admin/api.php";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var csrf = "";
  var S = null;            // načtená data
  var PRAC = {};           // pracovní kopie sekcí
  var sekce = "texty";
  var spinave = false;
  var otevrene = {};       // které položky lístku/akce jsou rozbalené
  var DNY = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];
  var STITKY = { vege: "bez masa", palive: "pálivá", smetana: "smetanový základ" };
  var PRO = { "všichni": "pro všechny", "děti": "pro děti", "dospělí": "pro dospělé" };
  var CO = { texty: "obsah", listek: "menu", akce: "akce", provoz: "podnik" };

  /* ---------- pomocníci ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    }
    return el;
  }
  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function slug(t) {
    var mapa = { "á": "a", "č": "c", "ď": "d", "é": "e", "ě": "e", "í": "i", "ň": "n", "ó": "o", "ř": "r", "š": "s", "ť": "t", "ú": "u", "ů": "u", "ý": "y", "ž": "z" };
    return String(t || "").toLowerCase().replace(/[áčďéěíňóřšťúůýž]/g, function (c) { return mapa[c]; }).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "polozka";
  }
  function kc(n) { return n == null || n === "" ? "dle nabídky" : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč"; }
  function toast(text, chyba) {
    var t = $("[data-toast]"); t.textContent = text; t.classList.toggle("chyba", !!chyba); t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, chyba ? 6000 : 3000);
  }
  function api(akce, telo, form) {
    var o = { method: telo || form ? "POST" : "GET", headers: { "X-CSRF": csrf }, credentials: "same-origin" };
    if (form) o.body = form;
    else if (telo) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(telo); }
    return fetch(API + "?akce=" + akce, o).then(function (r) {
      return r.json().catch(function () { return { ok: false, chyba: "Server odpověděl nesrozumitelně (" + r.status + ")." }; });
    }).then(function (d) {
      if (d && d.odhlasen) { location.reload(); }
      return d;
    }).catch(function () { return { ok: false, chyba: "Nejde se spojit se serverem. Jste připojeni k internetu?" }; });
  }
  function zmena() {
    if (!spinave) { spinave = true; $("[data-ukladani]").hidden = false; }
  }
  function cisto() { spinave = false; $("[data-ukladani]").hidden = true; }
  function pole(popisek, input, napoveda, klicChyby) {
    return h("label", { class: "a-pole", "data-chyba-klic": klicChyby || null }, h("span", null, popisek), input, napoveda ? h("small", null, napoveda) : null, h("p", { class: "a-chyba", hidden: true }));
  }
  function vstup(hodnota, onzmena, attrs) {
    var a = Object.assign({ class: "a-input", value: hodnota == null ? "" : hodnota }, attrs || {});
    a.oninput = function (e) { onzmena(e.target.value); zmena(); };
    var el = h("input", a); el.value = hodnota == null ? "" : hodnota; return el;
  }
  function oblast(hodnota, onzmena, radky) {
    var el = h("textarea", { rows: radky || 3, oninput: function (e) { onzmena(e.target.value); zmena(); } });
    el.value = hodnota || ""; return el;
  }
  function ukazChyby(chyby) {
    $$("[data-chyba-klic]").forEach(function (el) {
      var k = el.getAttribute("data-chyba-klic"), t = chyby[k];
      el.classList.toggle("ma-chybu", !!t);
      var p = $(".a-chyba", el); if (p) { p.hidden = !t; p.textContent = t || ""; }
    });
    var prvni = $(".ma-chybu");
    if (prvni) {
      var det = prvni.closest("details"); if (det) det.open = true;
      prvni.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---------- start a přihlášení ---------- */
  function start() {
    api("stav").then(function (d) {
      $("[data-nacitani]").hidden = true;
      csrf = d.csrf || "";
      if (d.prihlasen) return nactiVse();
      $("[data-vstup]").hidden = false;
      if (d.heslo_nastaveno) $("[data-form-prihlasit]").hidden = false;
      else if (d.zalozeni_povoleno) $("[data-form-zalozit]").hidden = false;
      else $("[data-zavreno]").hidden = false;
    });
  }
  $("[data-form-prihlasit]").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, ch = $("[data-chyba]", f);
    api("prihlasit", { heslo: f.heslo.value }).then(function (d) {
      if (!d.ok) { ch.hidden = false; ch.textContent = d.chyba; f.heslo.select(); return; }
      csrf = d.csrf; $("[data-vstup]").hidden = true; nactiVse();
    });
  });
  $("[data-form-zalozit]").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, ch = $("[data-chyba]", f);
    api("zalozit", { heslo: f.heslo.value, potvrzeni: f.potvrzeni.value }).then(function (d) {
      if (!d.ok) { ch.hidden = false; ch.textContent = d.chyba; return; }
      csrf = d.csrf; $("[data-vstup]").hidden = true; nactiVse();
    });
  });
  $("[data-odhlasit]").addEventListener("click", function () {
    if (spinave && !confirm("Máte neuložené změny. Opravdu odhlásit?")) return;
    api("odhlasit", {}).then(function () { location.reload(); });
  });

  function nactiVse(ponechSekci) {
    return api("nacti").then(function (d) {
      if (!d.ok) { toast(d.chyba || "Data se nenačetla.", true); return; }
      S = d;
      PRAC = { texty: kopie(d.obsah), listek: kopie(d.menu), akce: kopie(d.akce), provoz: kopie(d.podnik) };
      $("[data-app]").hidden = false;
      cisto();
      otevriSekci(ponechSekci ? sekce : (location.hash.slice(1) || "domu"), true);
    });
  }

  /* ---------- přepínání sekcí ---------- */
  $$("[data-sekce-btn]").forEach(function (b) {
    b.addEventListener("click", function () { otevriSekci(b.getAttribute("data-sekce-btn")); });
  });
  function otevriSekci(s, vynutit) {
    if (!SEKCE[s]) s = "domu";
    if (!vynutit && s === sekce) return;
    if (spinave && !confirm("V této části máte neuložené změny. Zahodit je?")) return;
    if (spinave) zahodit(true);
    sekce = s;
    history.replaceState(null, "", "#" + s);
    $$("[data-sekce-btn]").forEach(function (b) { b.setAttribute("aria-current", String(b.getAttribute("data-sekce-btn") === s)); });
    vykresli();
    window.scrollTo(0, 0);
  }
  function vykresli() {
    var o = $("[data-obsah]"); o.innerHTML = ""; o.appendChild(SEKCE[sekce]());
  }
  function zahodit(tise) {
    var zdroj = { texty: S.obsah, listek: S.menu, akce: S.akce, provoz: S.podnik }[sekce];
    if (zdroj) PRAC[sekce] = kopie(zdroj);
    cisto();
    if (!tise) { vykresli(); toast("Změny zahozeny."); }
  }
  $("[data-zahodit]").addEventListener("click", function () { zahodit(false); });
  $("[data-ulozit]").addEventListener("click", ulozit);
  window.addEventListener("beforeunload", function (e) { if (spinave) { e.preventDefault(); e.returnValue = ""; } });

  function ulozit() {
    var co = CO[sekce]; if (!co) return;
    var b = $("[data-ulozit]"); b.disabled = true; b.textContent = "Ukládám…";
    api("uloz", { co: co, data: PRAC[sekce] }).then(function (d) {
      b.disabled = false; b.textContent = "Uložit změny";
      if (!d.ok) { toast(d.chyba || "Uložení se nepovedlo.", true); if (d.chyby) ukazChyby(d.chyby); return; }
      toast("Uloženo. Na webu je to vidět hned.");
      nactiVse(true);
    });
  }

  /* ================================================================ ZAČÍT */
  var SEKCE = {};
  SEKCE.domu = function () {
    var dlazdice = [
      ["listek", "🍕", "Změnit jídlo nebo cenu", "Přidat novou pizzu, upravit cenu, složení, smazat, co už neděláte."],
      ["fotky", "▣", "Vyměnit fotku", "Třeba fotku dětského hřiště nebo terasy. Stačí vybrat z telefonu."],
      ["akce", "★", "Přidat akci", "Koncert, kvíz, dětské odpoledne – ukáže se na úvodu i v programu."],
      ["provoz", "⏰", "Otevírací doba a telefon", "Když se mění otevírací doba, dovolená, nový telefon."],
      ["texty", "✎", "Přepsat texty", "Nadpisy a odstavce na všech stránkách webu."],
    ];
    var akce = PRAC.akce.filter(function (a) { var d = new Date(); return a.datum >= d.toISOString().slice(0, 10); }).length;
    return h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Dobrý den! Co chcete na webu změnit?"),
        h("p", null, "Vyberte, co potřebujete. Všechno se dá kdykoli vrátit – při každém uložení se dělá záloha.")),
      h("div", { class: "a-dlazdice" }, dlazdice.map(function (d) {
        return h("button", { class: "a-dlazdice-btn", type: "button", onclick: function () { otevriSekci(d[0]); } },
          h("span", { class: "a-dlazdice-ik", "aria-hidden": "true" }, d[1]), h("b", null, d[2]), h("span", null, d[3]));
      })),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Jak to funguje"),
        h("ol", { class: "a-navod" },
          h("li", null, "Vyberte nahoře (v telefonu dole) část webu."),
          h("li", null, "Přepište, co potřebujete. Dole se objeví žlutá lišta „Uložit změny“."),
          h("li", null, "Klepněte na „Uložit změny“. Na webu je to vidět hned – zkuste „Zobrazit web“."),
          h("li", null, "Fotky se ukládají samy hned po nahrání.")),
        h("p", { class: "a-pozn" }, "Na lístku je teď " + PRAC.listek.polozky.length + " položek, naplánovaných akcí " + akce + ".")));
  };

  /* ================================================================ TEXTY */
  SEKCE.texty = function () {
    var obal = h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Texty na webu"),
        h("p", null, "Rozklikněte stránku a přepište, co potřebujete. Slovo v *hvězdičkách* se na webu zvýrazní medovou kurzívou. Enter v delším textu = nový řádek. Na konci dole uložte.")));
    S.skupiny.forEach(function (sk, i) {
      var det = h("details", { class: "a-skupina", open: i === 0 ? true : null },
        h("summary", null, sk.nazev, h("small", null, sk.pole.length + " textů")));
      var telo = h("div", { class: "a-skupina-telo" });
      sk.pole.forEach(function (p) {
        var hodnota = PRAC.texty[p.klic];
        var input;
        if (p.typ === "seznam") {
          input = oblast((hodnota || []).join("\n"), function (v) { PRAC.texty[p.klic] = v.split("\n"); }, Math.max(3, (hodnota || []).length + 1));
          telo.appendChild(pole(p.popisek, input, "Každý řádek = jedna odrážka.", p.klic));
        } else if (p.typ === "odstavec") {
          input = oblast(hodnota, function (v) { PRAC.texty[p.klic] = v; }, Math.min(6, Math.max(2, Math.ceil(String(hodnota || "").length / 60))));
          telo.appendChild(pole(p.popisek, input, null, p.klic));
        } else {
          input = vstup(hodnota, function (v) { PRAC.texty[p.klic] = v; }, { maxlength: p.max });
          telo.appendChild(pole(p.popisek, input, null, p.klic));
        }
      });
      det.appendChild(telo);
      obal.appendChild(det);
    });
    return obal;
  };

  /* ================================================================ LÍSTEK */
  SEKCE.listek = function () {
    var M = PRAC.listek;
    var obal = h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Jídelní lístek"),
        h("p", null, "Jídla jsou rozdělená do kategorií. Klepněte na jídlo a upravte ho. Šipkami měníte pořadí. Na konci dole uložte.")));
    M.kategorie.forEach(function (k, ki) {
      var polozky = M.polozky.filter(function (p) { return p.kategorie === k.id; });
      var det = h("details", { class: "a-skupina", open: otevrene["k:" + k.id] || ki === 0 ? true : null, ontoggle: function (e) { otevrene["k:" + k.id] = e.target.open; } },
        h("summary", null, k.nazev || "(bez názvu)", h("small", null, polozky.length + " položek")));
      var telo = h("div", { class: "a-skupina-telo" });
      telo.appendChild(h("div", { class: "a-kategorie-hlava" },
        pole("Název kategorie", vstup(k.nazev, function (v) { k.nazev = v; }), null, "kategorie." + ki + ".nazev"),
        pole("Krátký popis (nepovinné)", vstup(k.popis, function (v) { k.popis = v; }), null, "kategorie." + ki + ".popis"),
        h("div", { class: "a-ovladani" },
          h("button", { class: "a-ikona-btn", type: "button", title: "Posunout kategorii výš", disabled: ki === 0, onclick: function () { presun(M.kategorie, ki, -1); } }, "↑"),
          h("button", { class: "a-ikona-btn", type: "button", title: "Posunout kategorii níž", disabled: ki === M.kategorie.length - 1, onclick: function () { presun(M.kategorie, ki, 1); } }, "↓"),
          h("button", { class: "a-btn a-btn-tenky a-btn-cerveny", type: "button", onclick: function () {
            if (polozky.length && !confirm("Kategorie „" + k.nazev + "“ obsahuje " + polozky.length + " položek. Smazat ji i s nimi?")) return;
            M.polozky = M.polozky.filter(function (p) { return p.kategorie !== k.id; });
            M.kategorie.splice(ki, 1); zmena(); vykresli();
          } }, "Smazat kategorii"))));
      var seznam = h("div");
      polozky.forEach(function (p) { seznam.appendChild(polozkaEl(M, p)); });
      telo.appendChild(seznam);
      telo.appendChild(h("button", { class: "a-btn a-pridat", type: "button", onclick: function () {
        var id = slug("nova " + Date.now().toString(36));
        var nova = { id: id, cislo: null, nazev: "", kategorie: k.id, cena: null, slozeni: "", stitky: [], objednat: k.id === "pizza", na_uvodu: false };
        var posledni = -1; M.polozky.forEach(function (x, i) { if (x.kategorie === k.id) posledni = i; });
        M.polozky.splice(posledni + 1, 0, nova); otevrene["p:" + id] = true; zmena(); vykresli();
        setTimeout(function () { var el = $("[data-polozka='" + id + "'] input"); if (el) el.focus(); }, 50);
      } }, "+ Přidat do „" + (k.nazev || "kategorie") + "“"));
      det.appendChild(telo);
      obal.appendChild(det);
    });
    obal.appendChild(h("button", { class: "a-btn a-pridat", type: "button", onclick: function () {
      var nazev = prompt("Jak se má nová kategorie jmenovat? (např. Saláty)");
      if (!nazev) return;
      var id = slug(nazev), n = 2; while (M.kategorie.some(function (k) { return k.id === id; })) id = slug(nazev) + "-" + n++;
      M.kategorie.push({ id: id, nazev: nazev, popis: "" }); otevrene["k:" + id] = true; zmena(); vykresli();
    } }, "+ Nová kategorie"));

    // příplatky
    var pr = h("details", { class: "a-skupina", open: otevrene.priplatky ? true : null, ontoggle: function (e) { otevrene.priplatky = e.target.open; } },
      h("summary", null, "Příplatky k pizze", h("small", null, M.priplatky.length + " surovin")));
    var prt = h("div", { class: "a-skupina-telo" });
    prt.appendChild(pole("Věta pod nadpisem pizz", oblast(M.priplatky_text, function (v) { M.priplatky_text = v; }, 2), "Např. „Uzeniny a sýry 40 Kč za surovinu, ostatní 20 Kč.“", "priplatky_text"));
    M.priplatky.forEach(function (x, i) {
      prt.appendChild(h("div", { class: "a-kategorie-hlava" },
        pole("Surovina", vstup(x.nazev, function (v) { x.nazev = v; }), null, "priplatky." + i + ".nazev"),
        pole("Cena v Kč", vstup(x.cena, function (v) { x.cena = v; }, { inputmode: "numeric" }), null, "priplatky." + i + ".cena"),
        h("button", { class: "a-ikona-btn", type: "button", title: "Smazat surovinu", onclick: function () { M.priplatky.splice(i, 1); zmena(); vykresli(); } }, "✕")));
    });
    prt.appendChild(h("button", { class: "a-btn a-pridat", type: "button", onclick: function () { M.priplatky.push({ id: "", nazev: "", cena: 20 }); otevrene.priplatky = true; zmena(); vykresli(); } }, "+ Přidat surovinu"));
    pr.appendChild(prt);
    obal.appendChild(pr);
    return obal;
  };
  function presun(pole_, i, smer) {
    var j = i + smer; if (j < 0 || j >= pole_.length) return;
    var x = pole_[i]; pole_[i] = pole_[j]; pole_[j] = x; zmena(); vykresli();
  }
  function polozkaEl(M, p) {
    var idx = M.polozky.indexOf(p);
    var otevrena = !!otevrene["p:" + p.id];
    var el = h("div", { class: "a-polozka" + (otevrena ? " otevrena" : ""), "data-polozka": p.id });
    var radek = h("div", { class: "a-polozka-radek", role: "button", tabindex: "0", "aria-expanded": String(otevrena),
      onclick: function () { otevrene["p:" + p.id] = !otevrena; vykresli(); },
      onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); otevrene["p:" + p.id] = !otevrena; vykresli(); } } },
      p.cislo ? h("span", { class: "a-cislo" }, String(p.cislo)) : null,
      h("b", null, p.nazev || "(nové jídlo – vyplňte název)"),
      h("span", { class: "a-znacky" }, p.objednat ? h("span", { class: "a-znacka-mala zelena" }, "s sebou") : null, p.na_uvodu ? h("span", { class: "a-znacka-mala zluta" }, "na úvodu") : null),
      h("span", { class: "a-cena" }, kc(p.cena)), h("span", { "aria-hidden": "true" }, otevrena ? "▴" : "▾"));
    el.appendChild(radek);
    if (!otevrena) return el;
    var stejne = M.polozky.filter(function (x) { return x.kategorie === p.kategorie; });
    var poradi = stejne.indexOf(p);
    var det = h("div", { class: "a-polozka-detail" },
      h("div", { class: "a-mrizka-2" },
        pole("Název", vstup(p.nazev, function (v) { p.nazev = v; radek.querySelector("b").textContent = v || "(nové jídlo)"; }, { maxlength: 80 }), null, "polozky." + idx + ".nazev"),
        pole("Cena v Kč", vstup(p.cena, function (v) { p.cena = v; radek.querySelector(".a-cena").textContent = kc(v); }, { inputmode: "numeric", placeholder: "prázdné = dle nabídky" }), null, "polozky." + idx + ".cena")),
      pole("Složení / popis", oblast(p.slozeni, function (v) { p.slozeni = v; }, 2), null, "polozky." + idx + ".slozeni"),
      h("div", { class: "a-mrizka-2" },
        pole("Číslo na lístku (nepovinné)", vstup(p.cislo, function (v) { p.cislo = v; }, { inputmode: "numeric" }), null, "polozky." + idx + ".cislo"),
        pole("Kategorie", (function () {
          var s = h("select", { onchange: function (e) { p.kategorie = e.target.value; zmena(); vykresli(); } });
          M.kategorie.forEach(function (k) { var o = h("option", { value: k.id }, k.nazev); if (k.id === p.kategorie) o.selected = true; s.appendChild(o); });
          return s;
        })(), null, "polozky." + idx + ".kategorie")),
      h("div", { class: "a-stitky" }, Object.keys(STITKY).map(function (s) {
        return h("label", { class: "a-zaskrt" }, (function () { var c = h("input", { type: "checkbox", onchange: function (e) {
          p.stitky = (p.stitky || []).filter(function (x) { return x !== s; }); if (e.target.checked) p.stitky.push(s); zmena(); } }); c.checked = (p.stitky || []).indexOf(s) >= 0; return c; })(), STITKY[s]);
      })),
      h("div", { class: "a-stitky" },
        h("label", { class: "a-zaskrt" }, (function () { var c = h("input", { type: "checkbox", onchange: function (e) { p.objednat = e.target.checked; zmena(); } }); c.checked = !!p.objednat; return c; })(), "Jde objednat s sebou přes web"),
        h("label", { class: "a-zaskrt" }, (function () { var c = h("input", { type: "checkbox", onchange: function (e) { p.na_uvodu = e.target.checked; zmena(); } }); c.checked = !!p.na_uvodu; return c; })(), "Ukázat na úvodní stránce")),
      h("div", { class: "a-ovladani" },
        h("button", { class: "a-ikona-btn", type: "button", title: "Posunout výš", disabled: poradi === 0, onclick: function () { prohod(M, p, stejne[poradi - 1]); } }, "↑"),
        h("button", { class: "a-ikona-btn", type: "button", title: "Posunout níž", disabled: poradi === stejne.length - 1, onclick: function () { prohod(M, p, stejne[poradi + 1]); } }, "↓"),
        h("span", { style: "flex:1" }),
        h("button", { class: "a-btn a-btn-tenky a-btn-cerveny", type: "button", onclick: function () {
          if (!confirm("Smazat „" + (p.nazev || "toto jídlo") + "“ z lístku?")) return;
          M.polozky.splice(M.polozky.indexOf(p), 1); zmena(); vykresli();
        } }, "Smazat jídlo")));
    el.appendChild(det);
    return el;
  }
  function prohod(M, a, b) {
    var i = M.polozky.indexOf(a), j = M.polozky.indexOf(b);
    M.polozky[i] = b; M.polozky[j] = a; zmena(); vykresli();
  }

  /* ================================================================ FOTKY */
  SEKCE.fotky = function () {
    var obal = h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Fotky na webu"),
        h("p", null, "Každá karta je jedno místo na webu. Klepněte na „Vyměnit fotku“ a vyberte fotku z telefonu nebo počítače – hned se zmenší a objeví na webu. Nic dalšího ukládat nemusíte.")));
    var mrizka = h("div", { class: "a-fotky" });
    S.fotky.forEach(function (f) { mrizka.appendChild(fotoKarta(f)); });
    obal.appendChild(mrizka);
    return obal;
  };
  function fotoKarta(f) {
    var obr = h("div", { class: "a-foto-obr", style: "background-image:url('" + f.nahled + "')" }, f.nahrana ? h("span", { class: "a-znacka-mala zelena" }, "vaše fotka") : h("span", { class: "a-znacka-mala" }, "původní ilustrační"));
    var alt = vstup(f.alt, function () {}, { maxlength: 200 });
    alt.oninput = null;
    alt.addEventListener("change", function () {
      api("foto_popis", { slot: f.id, alt: alt.value }).then(function (d) { toast(d.ok ? "Popisek uložen." : d.chyba, !d.ok); });
    });
    var soubor = h("input", { type: "file", accept: "image/*" });
    soubor.addEventListener("change", function () {
      if (!soubor.files[0]) return;
      nahrajFotku(f.id, soubor.files[0], obr, function (d) { f.nahled = d.nahled; f.nahrana = true; vykresli(); });
    });
    return h("div", { class: "a-foto" }, obr,
      h("div", { class: "a-foto-telo" }, h("h3", null, f.nazev),
        h("label", { class: "a-btn a-btn-med a-soubor" }, "Vyměnit fotku", soubor),
        pole("Popis fotky (pro nevidomé a Google)", alt, "Uloží se, když kliknete jinam."),
        f.nahrana ? h("button", { class: "a-btn a-btn-tenky", type: "button", onclick: function () {
          if (!confirm("Vrátit sem původní ilustrační fotku?")) return;
          api("foto_puvodni", { slot: f.id }).then(function (d) { if (d.ok) { f.nahled = d.nahled; f.nahrana = false; vykresli(); toast("Vráceno."); } else toast(d.chyba, true); });
        } }, "Vrátit původní") : null));
  }
  function nahrajFotku(slot, soubor, obr, hotovo) {
    if (soubor.size > 60 * 1024 * 1024) { toast("Fotka je moc velká (víc než 60 MB).", true); return; }
    var fd = new FormData(); fd.append("slot", slot); fd.append("soubor", soubor);
    obr.classList.add("nahrava");
    api("nahraj_fotku", null, fd).then(function (d) {
      obr.classList.remove("nahrava");
      if (!d.ok) { toast(d.chyba || "Fotka se nenahrála.", true); return; }
      toast("Fotka je na webu.");
      hotovo(d);
    });
  }

  /* ================================================================ AKCE */
  SEKCE.akce = function () {
    var A = PRAC.akce;
    var dnes = new Date(); var dnesIso = dnes.getFullYear() + "-" + String(dnes.getMonth() + 1).padStart(2, "0") + "-" + String(dnes.getDate()).padStart(2, "0");
    var obal = h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Akce"),
        h("p", null, "Koncerty, kvízy, dětská odpoledne… Na webu se ukazují jen akce od dneška dál, proběhlé se schovají samy. Na konci dole uložte.")),
      h("button", { class: "a-btn a-btn-med", type: "button", style: "margin-bottom:14px", onclick: function () {
        var id = "akce-" + Date.now().toString(36);
        A.unshift({ id: id, datum: dnesIso, cas: "18:00", nazev: "", pro: "všichni", text: "", foto: "" });
        otevrene["a:" + id] = true; zmena(); vykresli();
        setTimeout(function () { var el = $("[data-akce='" + id + "'] input[type=text], [data-akce='" + id + "'] input"); if (el) el.focus(); }, 50);
      } }, "+ Přidat akci"));
    if (!A.length) obal.appendChild(h("div", { class: "a-karta" }, h("p", { class: "a-pozn" }, "Zatím tu není žádná akce. Na webu se místo programu ukáže text z „Texty → Akce a oslavy“.")));
    var serazene = A.slice().sort(function (a, b) { return (a.datum + (a.cas || "")).localeCompare(b.datum + (b.cas || "")); });
    serazene.forEach(function (a) {
      var idx = A.indexOf(a);
      var otevrena = !!otevrene["a:" + a.id];
      var d = (a.datum || "").split("-");
      var karta = h("div", { class: "a-karta a-akce" + (a.datum < dnesIso ? " probehla" : ""), "data-akce": a.id });
      karta.appendChild(h("div", { class: "a-akce-hlava", role: "button", tabindex: "0", style: "cursor:pointer",
        onclick: function () { otevrene["a:" + a.id] = !otevrena; vykresli(); } },
        h("div", { class: "a-akce-datum" }, (+d[2] || "?") + ".", h("small", null, (+d[1] || "") + ". " + (d[0] || ""))),
        h("div", { style: "flex:1;min-width:0" }, h("b", null, a.nazev || "(nová akce – vyplňte název)"), h("div", { class: "a-napoveda" }, (a.cas ? a.cas + " · " : "") + (PRO[a.pro] || "") + (a.datum < dnesIso ? " · už proběhla" : ""))),
        h("span", null, otevrena ? "▴" : "▾")));
      if (otevrena) {
        var foto = h("div", { class: "a-akce-nahled", style: a.nahled ? "background-image:url('" + a.nahled + "')" : "" });
        var vyber = h("select", { onchange: function (e) { a.foto = e.target.value; a.nahled = e.target.value ? "/assets/foto/" + e.target.value + "-640.jpg" : ""; zmena(); vykresli(); } },
          h("option", { value: "" }, "bez fotky"),
          (a.foto && a.foto.indexOf("akce-") === 0) ? h("option", { value: a.foto, selected: true }, "vlastní nahraná fotka") : null,
          S.vychozi_fotky.map(function (v) { var o = h("option", { value: v }, "ilustrační: " + v.replace(/-/g, " ")); if (v === a.foto) o.selected = true; return o; }));
        var soubor = h("input", { type: "file", accept: "image/*" });
        soubor.addEventListener("change", function () {
          if (!soubor.files[0]) return;
          var slot = "akce-" + slug(a.id).replace(/^akce-/, "");
          nahrajFotku(slot, soubor.files[0], foto, function (dd) { a.foto = slot; a.nahled = dd.nahled; zmena(); vykresli(); toast("Fotka nahraná – nezapomeňte akci uložit."); });
        });
        karta.appendChild(h("div", { class: "a-mrizka", style: "margin-top:14px" },
          pole("Název akce", vstup(a.nazev, function (v) { a.nazev = v; }, { maxlength: 80 }), null, "akce." + idx + ".nazev"),
          h("div", { class: "a-mrizka-2" },
            pole("Datum", vstup(a.datum, function (v) { a.datum = v; }, { type: "date" }), null, "akce." + idx + ".datum"),
            pole("Začátek", vstup(a.cas, function (v) { a.cas = v; }, { type: "time" }), "Nechte prázdné, když čas nevíte.", "akce." + idx + ".cas")),
          pole("Pro koho", (function () {
            var s = h("select", { onchange: function (e) { a.pro = e.target.value; zmena(); } });
            Object.keys(PRO).forEach(function (k) { var o = h("option", { value: k }, PRO[k]); if (k === a.pro) o.selected = true; s.appendChild(o); });
            return s;
          })(), null, "akce." + idx + ".pro"),
          pole("Popis", oblast(a.text, function (v) { a.text = v; }, 3), "Pár vět – co se bude dít, jestli je vstupné, jestli je potřeba rezervace.", "akce." + idx + ".text"),
          h("div", { class: "a-pole" }, h("span", null, "Fotka"), foto, vyber, h("label", { class: "a-btn a-btn-tenky a-soubor" }, "Nahrát vlastní fotku", soubor)),
          h("div", { class: "a-ovladani" }, h("span", { style: "flex:1" }),
            h("button", { class: "a-btn a-btn-tenky a-btn-cerveny", type: "button", onclick: function () {
              if (!confirm("Smazat akci „" + (a.nazev || "bez názvu") + "“?")) return;
              A.splice(A.indexOf(a), 1); zmena(); vykresli();
            } }, "Smazat akci"))));
      }
      obal.appendChild(karta);
    });
    return obal;
  };

  /* ================================================================ PROVOZ */
  SEKCE.provoz = function () {
    var P = PRAC.provoz;
    P.adresa = P.adresa || {};
    var rozvrh = h("div");
    (P.rozvrh || []).forEach(function (r, i) {
      var zavreno = !r;
      var od = vstup(r ? r.od : "15:00", function (v) { P.rozvrh[i] = P.rozvrh[i] || {}; P.rozvrh[i].od = v; }, { type: "time", "aria-label": DNY[i] + " od" });
      var doo = vstup(r ? r.do : "21:00", function (v) { P.rozvrh[i] = P.rozvrh[i] || {}; P.rozvrh[i].do = v; }, { type: "time", "aria-label": DNY[i] + " do" });
      var casy = h("div", { class: "a-den-casy", hidden: zavreno }, od, "–", doo);
      var chk = h("input", { type: "checkbox", onchange: function (e) {
        if (e.target.checked) P.rozvrh[i] = null; else P.rozvrh[i] = { od: od.value || "15:00", do: doo.value || "21:00" };
        casy.hidden = e.target.checked; zmena();
      } });
      chk.checked = zavreno;
      rozvrh.appendChild(h("div", { class: "a-den", "data-chyba-klic": "rozvrh." + i }, h("b", null, DNY[i]), h("label", { class: "a-zaskrt" }, chk, "zavřeno"), casy, h("p", { class: "a-chyba", hidden: true, style: "grid-column:1/-1" })));
    });
    var zalohy = h("div", { class: "a-zalohy" });
    var nazvy = { obsah: "Texty", menu: "Jídelní lístek", akce: "Akce", podnik: "Provoz a kontakt" };
    Object.keys(nazvy).forEach(function (co) {
      (S.zalohy[co] || []).slice(0, 8).forEach(function (z) {
        var m = z.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
        zalohy.appendChild(h("div", { class: "a-zaloha" },
          h("span", null, nazvy[co] + " – stav z " + (m ? (+m[3]) + ". " + (+m[2]) + ". " + m[1] + " " + m[4] + ":" + m[5] : z)),
          h("button", { class: "a-btn a-btn-tenky", type: "button", onclick: function () {
            if (!confirm("Vrátit „" + nazvy[co] + "“ do tohoto stavu? Současný stav se taky zazálohuje.")) return;
            api("obnov", { co: co, zaloha: z }).then(function (d) { if (d.ok) { toast("Obnoveno."); nactiVse(true); } else toast(d.chyba, true); });
          } }, "Vrátit")));
      });
    });
    if (!zalohy.children.length) zalohy.appendChild(h("p", { class: "a-pozn" }, "Zálohy vznikají při každém uložení. Zatím žádné nejsou."));

    var heslo = { stare: "", nove: "", potvrzeni: "" };
    return h("div", null,
      h("div", { class: "a-uvod" }, h("h1", null, "Provoz a kontakt"),
        h("p", null, "Otevírací doba, telefon a adresa se ukazují na každé stránce webu a počítají se z nich i časy vyzvednutí. Na konci dole uložte.")),
      h("div", { class: "a-karta" }, h("h2", null, "Otevírací doba"), rozvrh, h("p", { class: "a-chyba", hidden: true, "data-chyba-klic": "rozvrh" })),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Kontakt"),
        h("div", { class: "a-mrizka-2" },
          pole("Telefon", vstup(P.telefon, function (v) { P.telefon = v; }, { type: "tel", inputmode: "tel" }), null, "telefon"),
          pole("E-mail (nepovinné)", vstup(P.email, function (v) { P.email = v; }, { type: "email" }), "Prázdné = na webu se neukáže.", "email")),
        h("div", { class: "a-mrizka-2" },
          pole("Ulice a číslo", vstup(P.adresa.ulice, function (v) { P.adresa.ulice = v; }), null, "adresa.ulice"),
          pole("PSČ", vstup(P.adresa.psc, function (v) { P.adresa.psc = v; }, { inputmode: "numeric" }), null, "adresa.psc")),
        pole("Obec", vstup(P.adresa.obec, function (v) { P.adresa.obec = v; }), null, "adresa.obec")),
      (function () {
        P.objednavky = P.objednavky || { zapnuto: false, email: "" };
        var O = P.objednavky;
        var emailPole = pole("Kam objednávky posílat (e-mail)", vstup(O.email, function (v) { O.email = v; }, { type: "email" }), "Sem přijde každá objednávka i poptávka oslavy. Dobré je mít e-mail v telefonu, ať ho uvidíte hned.", "objednavky.email");
        emailPole.hidden = !O.zapnuto;
        var c = h("input", { type: "checkbox", onchange: function (e) { O.zapnuto = e.target.checked; emailPole.hidden = !e.target.checked; zmena(); } });
        c.checked = !!O.zapnuto;
        return h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Objednávky přes web"),
          h("p", { class: "a-pozn" }, "Vypnuté: zákazník si na webu sestaví košík a čas a pak vám zavolá. Zapnuté: objednávka vám přijde e-mailem a zákazník dostane potvrzení na webu."),
          h("label", { class: "a-zaskrt" }, c, "Posílat objednávky z webu e-mailem"), emailPole);
      })(),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Objednávky s sebou"),
        h("div", { class: "a-mrizka-2" },
          pole("Cena krabice na pizzu (Kč)", vstup(P.krabice, function (v) { P.krabice = v; }, { inputmode: "numeric" }), null, "krabice"),
          pole("Fungujeme od roku", vstup(P.od_roku, function (v) { P.od_roku = v; }, { inputmode: "numeric" }), null, "od_roku"))),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Vyhledávače"),
        h("label", { class: "a-zaskrt" }, (function () { var c = h("input", { type: "checkbox", onchange: function (e) { P.skryt_pred_vyhledavaci = e.target.checked; zmena(); } }); c.checked = !!P.skryt_pred_vyhledavaci; return c; })(),
          "Skrýt web před Googlem (jen když se web teprve chystá)")),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Zálohy"),
        h("p", { class: "a-pozn" }, "Když se něco pokazí, jde se vrátit k dřívějšímu stavu. Ukazujeme posledních 8 uložení každé části."), zalohy),
      h("div", { class: "a-karta a-mrizka" }, h("h2", null, "Heslo do administrace"),
        h("p", { class: "a-pozn" }, "Heslo je jedno společné pro všechny, kdo web upravují."),
        h("div", { class: "a-mrizka-2" },
          pole("Současné heslo", h("input", { type: "password", autocomplete: "current-password", oninput: function (e) { heslo.stare = e.target.value; } })),
          h("span")),
        h("div", { class: "a-mrizka-2" },
          pole("Nové heslo", h("input", { type: "password", autocomplete: "new-password", oninput: function (e) { heslo.nove = e.target.value; } }), "Aspoň 10 znaků."),
          pole("Nové heslo ještě jednou", h("input", { type: "password", autocomplete: "new-password", oninput: function (e) { heslo.potvrzeni = e.target.value; } }))),
        h("div", null, h("button", { class: "a-btn", type: "button", onclick: function () {
          api("zmen_heslo", heslo).then(function (d) { toast(d.ok ? "Heslo změněno." : d.chyba, !d.ok); });
        } }, "Změnit heslo"))));
  };

  start();
})();

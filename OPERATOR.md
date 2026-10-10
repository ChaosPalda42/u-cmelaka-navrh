# OPERATOR — u-cmelaka

## Co a proč
Návrh webu pro bistro a pizzerii U Čmeláka v Nové Vsi pod Pleší – pizza na vyzvednutí s online objednávkou, terasa, dětský koutek, akce

## Kde jsme
Viz STATE.md (generuje harness). Poslední shrnutí operátora: —

## Rozhodnutí
- 2026-10-10: projekt založen.

## Pravidla projektu
- Stack: python
- Testy: `uv run pytest -q`
- Nic nad rámec harnessu; obecná pravidla jsou v ~/factory/docs.

## Jak spustit
- `factory run` — spustí běh (kontrakty → workeři → brány → checkpointy)
- `factory status` — stav, otevřené balíčky
- `factory packets` — balíčky čekající na rozhodnutí; `factory answer <id> …`

## 2026-10-10: první verze ukázky
- Zadání (Michael): U Čmeláka nemá web, postavit ukázku. Bez rozvozu, jídlo na vyzvednutí;
  krásná terasa, prostor pro děti, přátelská atmosféra.
- Zjištěno z webu (firmy.cz, 10. 10. 2026): Řadová 546, 262 04 Nová Ves pod Pleší, tel. +420 774 160 240,
  IČO 05483166, pizzerie (32 cm, rajčatový/smetanový základ), točené pivo, Út–Čt 15–21, Pá–So 15–22,
  Ne 15–21, Po zavřeno, platba kartou, Wi-Fi, sezení na zahradě. Doména u-cmelaka.cz existuje (WEDOS),
  hosting vypnutý. Inzerát na ceskereality.cz: bistro/kavárna/cukrárna od 2021, terasa, dětský
  koutek, zahrada, bezbariérové, akce a koncerty.
- Smyšlené: jídelní lístek a ceny, příplatky, krabice 15 Kč, akce, kapacity, e-mail objednavky@u-cmelaka.cz.
  Fotky jsou ilustrační, generované lokálně (`factory image`, z-image-turbo, zdroje/generuj.sh).
- Vzhled: med + čokoláda + jetel + levandule, Fraunces (SOFT/WONK) + Figtree, maskot čmelák (SVG),
  čmelák v hero přiletí po čárkované dráze na tlačítko „Objednat“. Mapa z OSM (tools/mapa.py) –
  v okolí ulice Včelnická a Ke Včelníku.
- Factory: 7 kontraktů (otevírací doba, košík, časy vyzvednutí, menu, čeština, objednávka, fotky),
  běh ve worktree `../U Cmelaka-factory` (větev factory). Šablony, CSS, web.js píše operátor.
- Build `node build.mjs` → out/, náhled `.claude/launch.json` → `cmelak` (port 4410),
  kontrola `uv run --with playwright python tools/kontrola/kontrola.py http://localhost:4410/`.

## 2026-10-10 (večer): skutečný jídelní lístek
- Michael poslal fotky tištěného lístku (2× HEIC). Zapracováno do data/menu.json: 13 pizz
  (32 cm, čísla 1–13 jako na lístku), pochutiny, nealko, pivo (Pilsner Urquell 0,3/0,5), teplé,
  míchané, alkohol 0,04 l, vína po 1 dcl. Příplatky: uzeniny a sýry 40 Kč, ostatní 20 Kč,
  krabice 15 Kč – konkrétní seznam surovin je odvozený ze surovin na pizzách.
- Alergeny lístek neuvádí → smyšlená čísla alergenů a filtr „bez lepku“ odstraněny,
  místo nich věta „alergeny řekneme u baru“. Pryč i dětská pizza, dorty, palačinky.
- Na lístku je jejich logo (čmelák s pivem a pizzou) a plástve – návrh s nimi ladí.

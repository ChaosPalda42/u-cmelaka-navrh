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

## 2026-10-11 (noc): ostrý provoz na Active24 + administrace
- Doména **bistroucmelaka.cz** (Active24, hosting palecek_michael_gmail_com_2). Omylem koupená bitroucmelaka.cz
  zůstává nevyužitá. GitHub Pages už se nenasazuje (web je v PHP); poslední statická ukázka tam zůstala.
- Web je teď PHP: `src/php/sablony.php` skládá stránky z uloženého obsahu (data mimo web: `bistroucmelaka.cz/data`,
  JSON + zálohy), výchozí obsah `inc/vychozi/*.json`. Vstup `src/web/index.php`, pravidla `src/web/.htaccess`,
  lokálně `out/_router.php` (launch.json → `cmelak-php`, port 4411, data `.data-dev/`).
- Administrace `/admin` (`src/web/admin/`, `src/assets/admin.{js,css}`): Začít (rozcestník) · Texty (schéma
  `src/php/obsah-schema.php`) · Lístek · Fotky (sloty, nahrání = hned na webu, verze v názvu souboru) · Akce ·
  Provoz (otevírací doba, kontakt, objednávky e-mailem, skrytí před Googlem, zálohy, změna hesla).
- Jedno společné heslo. Zakládá ho první návštěvník /admin, jen když existuje `data/zalozit-heslo` (vytvořeno
  11. 10. ve 2:16 pro Michaela). Reset hesla: smazat `data/heslo.json` a vytvořit `data/zalozit-heslo`.
- Factory C-008 až C-011 (jádro, fotky GD/HEIC, validace, pomocníci) zelené. Dvě chyby byly v mém zadání/testu:
  číslování záloh („nejmenší volné“ se po smazání znovu použije) a `{}` vs `[]` u prázdných chyb z PHP.
  PATH_POLICY vrátila i úpravu `contracts/` za běhu — kontrakt opravovat jen při zastaveném běhu.
- PHP 8.5: `imagedestroy()` je deprecated a jeho hláška zkazila JSON odpověď → odstraněno, vstupy mají
  display_errors=0, test fotek hlídá, že PHP nic nevypíše.
- Objednávky: ve výchozím stavu „po telefonu“ (košík + čas → co nahlásit + tlačítko Zavolat); e-mailem
  (`src/web/objednat.php`, mail()) jen po zapnutí v administraci. Smyšlené akce i obsazenost slotů pryč.
- SEO: titulky a popisy, canonical, Open Graph, JSON-LD Restaurant (+ Event pro akce), sitemap.xml, robots.txt.
  Web je zatím `noindex` (Provoz → „Skrýt web před Googlem“) – vypnout po kontrole textů a výměně fotek.
- Nasazení: aktivovat základní konzoli v Active24 (1 h, pokaždé jiný port) a `CM_SSH_PORT=… ./tools/nasad.sh`.
  Kontroly: `tools/kontrola/admin.py` (81 kontrol proklikání), `kontrola.py <adresa>` (98 kombinací).

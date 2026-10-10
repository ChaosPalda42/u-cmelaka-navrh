<?php
require __DIR__ . "/../inc/verze.php";
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-store");
header("X-Robots-Tag: noindex, nofollow");
$v = rawurlencode(CM_VERZE);
?><!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Administrace – U Čmeláka</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/admin.css?v=<?= $v ?>">
</head>
<body>
<div class="a-nacitani" data-nacitani>Načítám…</div>

<section class="a-vstup" data-vstup hidden>
  <div class="a-vstup-karta">
    <img class="a-vstup-logo" src="/assets/logo-u-cmelaka.svg" alt="" width="96" height="96">
    <h1>Administrace webu</h1>
    <form data-form-prihlasit hidden>
      <label class="a-pole"><span>Heslo</span><input type="password" name="heslo" autocomplete="current-password" required autofocus></label>
      <p class="a-chyba" data-chyba hidden></p>
      <button class="a-btn a-btn-med" type="submit">Přihlásit se</button>
    </form>
    <form data-form-zalozit hidden>
      <p class="a-pozn">Vítejte! Nejdřív si zvolte heslo do administrace. Aspoň 10 znaků – klidně celá věta, třeba „pizza z pece každý den“.</p>
      <label class="a-pole"><span>Nové heslo</span><input type="password" name="heslo" autocomplete="new-password" minlength="10" required></label>
      <label class="a-pole"><span>Heslo ještě jednou</span><input type="password" name="potvrzeni" autocomplete="new-password" minlength="10" required></label>
      <p class="a-chyba" data-chyba hidden></p>
      <button class="a-btn a-btn-med" type="submit">Uložit heslo a pokračovat</button>
    </form>
    <p class="a-pozn" data-zavreno hidden>Heslo do administrace ještě není nastavené. Ozvěte se prosím správci webu.</p>
  </div>
</section>

<div class="a-app" data-app hidden>
  <header class="a-hlava">
    <a class="a-znacka" href="/" target="_blank" rel="noopener"><img src="/assets/logo-u-cmelaka.svg" alt="" width="40" height="40"><span>U Čmeláka<small>administrace</small></span></a>
    <nav class="a-nav" aria-label="Sekce administrace">
      <button type="button" data-sekce-btn="domu"><span class="a-nav-ik">⌂</span>Začít</button>
      <button type="button" data-sekce-btn="texty"><span class="a-nav-ik">✎</span>Texty</button>
      <button type="button" data-sekce-btn="listek"><span class="a-nav-ik">🍕</span>Lístek</button>
      <button type="button" data-sekce-btn="fotky"><span class="a-nav-ik">▣</span>Fotky</button>
      <button type="button" data-sekce-btn="akce"><span class="a-nav-ik">★</span>Akce</button>
      <button type="button" data-sekce-btn="provoz"><span class="a-nav-ik">⏰</span>Provoz</button>
    </nav>
    <div class="a-hlava-akce">
      <a class="a-btn a-btn-tenky" href="/" target="_blank" rel="noopener">Zobrazit web ↗</a>
      <button class="a-btn a-btn-tenky" type="button" data-odhlasit>Odhlásit</button>
    </div>
  </header>
  <main class="a-obsah" data-obsah></main>
  <div class="a-ukladani" data-ukladani hidden>
    <span data-ukladani-text>Máte neuložené změny</span>
    <button class="a-btn a-btn-tenky" type="button" data-zahodit>Zahodit</button>
    <button class="a-btn a-btn-med" type="button" data-ulozit>Uložit změny</button>
  </div>
  <div class="a-toast" data-toast role="status" aria-live="polite" hidden></div>
</div>
<script src="/assets/admin.js?v=<?= $v ?>"></script>
</body>
</html>

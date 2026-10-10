"""Kontrola ukázky: stránky × šířky × témata × (čistý / vracející se návštěvník). Hlásí chyby JS, síť, přetékání do strany a uřezaný text."""
import asyncio, sys
from playwright.async_api import async_playwright
Z = sys.argv[1]
STRANKY = ["", "menu.html", "objednavka.html", "zahrada.html", "akce.html", "kontakt.html", "neexistuje"]
# vracející se návštěvník: uložený tmavý režim, plný košík i s rozbitými řádky, starší pořadí objednávek
NAVRAT = """try{localStorage.setItem('cm-tema','tmavy');localStorage.setItem('cm-poradi','41');
localStorage.setItem('cm-kosik',JSON.stringify([{id:'cmelak',pocet:2,priplatky:['vejce','syr']},{id:'zmizela',pocet:1},{id:'limonada',pocet:3},{id:'hranolky',pocet:1}]))}catch(e){}"""
MER = """(sirka) => { const ch = [];
 if (document.documentElement.scrollWidth > sirka + 1) ch.push('scrollWidth ' + document.documentElement.scrollWidth);
 if (!document.querySelector('main h1')) ch.push('bez h1');
 document.querySelectorAll('.odhalit').forEach(e => e.classList.add('videt'));
 for (const e of document.querySelectorAll('main *, header *, footer *')) {
  if (e.closest('svg, dialog, .chipy, .let, .letec, .hero-blob, .hlava-foto, .nav, .sr')) continue; if (e.classList.contains('hero')) continue;
  const r = e.getBoundingClientRect(); if (!r.width) continue; const cs = getComputedStyle(e);
  if (cs.visibility === 'hidden' || cs.display === 'none') continue;
  if (r.right > sirka + 1 && !e.closest('.zahrada-fotky, .hero-obraz, .pas-kroky::before')) ch.push('ven:' + (e.className || e.tagName) + ' ' + Math.round(r.right));
  else if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && cs.overflowX !== 'visible' && e.textContent.trim()) ch.push('orez:' + (e.className || e.tagName) + " '" + e.textContent.trim().slice(0, 25) + "'");
  if (ch.length > 5) break; }
 return ch; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True)
        pocet = nalezy = 0
        for navrat in (False, True):
            for sirka, tema in ((320, "light"), (375, "light"), (375, "dark"), (768, "light"), (1024, "dark"), (1440, "light"), (1440, "dark")):
                ctx = await b.new_context(viewport={"width": sirka, "height": 850}, color_scheme=tema, is_mobile=sirka < 700, has_touch=sirka < 700)
                if navrat: await ctx.add_init_script(NAVRAT)
                page = await ctx.new_page(); chyby = []
                page.on("pageerror", lambda e: chyby.append("JS: " + str(e)))
                page.on("console", lambda m: chyby.append("console: " + m.text) if m.type == "error" else None)
                page.on("requestfailed", lambda r: chyby.append("síť: " + r.url))
                for url in STRANKY:
                    chyby.clear()
                    await page.goto(Z + url, wait_until="networkidle")
                    await page.wait_for_timeout(300)
                    r = await page.evaluate(MER, sirka)
                    pocet += 1
                    if r or chyby:
                        nalezy += 1; print("návrat" if navrat else "čistý", sirka, tema, url, r, chyby)
                await ctx.close()
        await b.close()
        print(f"zkontrolováno {pocet} kombinací, nálezů {nalezy}")
asyncio.run(main())

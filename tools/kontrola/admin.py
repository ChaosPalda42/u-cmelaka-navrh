"""Proklikání celé administrace proti lokálnímu PHP serveru s čistým úložištěm.

Použití: uv run --with playwright python tools/kontrola/admin.py [--snimky SLOZKA]
Spustí si vlastní `php -S` na portu 4412 s dočasnou složkou dat (CM_DATA), založí heslo (náhodné, jen pro tento běh),
a projde: texty, lístek (přidání, chyba, smazání), fotky (nahrání, vrácení), akce, provoz (otevírací doba, chyba),
zálohy, odhlášení a špatné heslo. Každý krok ověří na veřejném webu. Vypíše OK / CHYBA a konzolové chyby.
"""
from __future__ import annotations

import asyncio
import os
import re
import secrets
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

KOREN = Path(__file__).resolve().parents[2]
OUT = KOREN / "out"
PORT = 4412
Z = f"http://127.0.0.1:{PORT}"
SNIMKY = None
if "--snimky" in sys.argv:
    SNIMKY = Path(sys.argv[sys.argv.index("--snimky") + 1])
    SNIMKY.mkdir(parents=True, exist_ok=True)

vysledky: list[tuple[bool, str]] = []


def ok(podminka: bool, text: str) -> None:
    vysledky.append((bool(podminka), text))
    print(("OK     " if podminka else "CHYBA  ") + text, flush=True)


async def snimek(page, jmeno):
    if SNIMKY:
        await page.screenshot(path=str(SNIMKY / f"{jmeno}.png"), full_page=True)


async def uloz(page):
    await page.evaluate("document.querySelector('[data-toast]').hidden = true")
    await page.click("[data-ulozit]")
    await page.wait_for_selector("[data-toast]:not([hidden])")
    t = await page.inner_text("[data-toast]")
    await page.wait_for_timeout(400)
    return t


async def main():
    data = Path(tempfile.mkdtemp(prefix="cm-data-"))
    (data / "zalozit-heslo").write_text("")
    # fotky nahrané v testu nesmí zůstat v out/ – server dostane vlastní kopii webu
    web = Path(tempfile.mkdtemp(prefix="cm-web-"))
    subprocess.run(["cp", "-R", f"{OUT}/.", str(web)], check=True)
    srv_log = open(data.parent / f"cm-srv-{os.getpid()}.log", "w+")

    def spust_server():
        s = subprocess.Popen(["php", "-S", f"127.0.0.1:{PORT}", "-t", str(web), str(web / "_router.php")],
                             env={**os.environ, "CM_DATA": str(data)}, stdout=subprocess.DEVNULL, stderr=srv_log)
        time.sleep(0.8)
        return s
    srv = spust_server()
    heslo = "test-" + secrets.token_hex(8)
    foto = data.parent / f"test-hriste-{os.getpid()}.jpg"
    img = Image.new("RGB", (1800, 1200), (40, 160, 60))
    img.paste((230, 200, 30), (0, 0, 900, 1200))
    img.save(foto, quality=90)
    chyby_konzole: list[str] = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(channel="chrome", headless=True)
            for sirka in [int(x) for x in os.environ.get("SIRKY", "390,1280").split(",")]:
                srv.terminate(); srv.wait(); srv = spust_server()  # vestavěný server PHP visí na spojeních z minulého kontextu
                mobil = sirka < 700
                ctx = await b.new_context(viewport={"width": sirka, "height": 900}, is_mobile=mobil, has_touch=mobil)
                page = await ctx.new_page()
                page.on("pageerror", lambda e: chyby_konzole.append(f"{sirka} JS: {e}"))
                page.on("console", lambda m: chyby_konzole.append(f"{sirka} console: {m.text}") if m.type == "error" and not re.search(r"status of 40[01]", m.text) else None)
                page.on("dialog", lambda d: asyncio.ensure_future(d.accept(d.default_value or "Saláty")))
                print(f"\n=== šířka {sirka} ===")

                # --- založení hesla / přihlášení
                await page.goto(Z + "/admin")
                await page.wait_for_selector("[data-vstup]:not([hidden]), [data-app]:not([hidden])")
                if await page.is_visible("[data-form-zalozit]"):
                    await page.fill("[data-form-zalozit] [name=heslo]", "kratke")
                    await page.fill("[data-form-zalozit] [name=potvrzeni]", "kratke")
                    await page.click("[data-form-zalozit] button")
                    await page.wait_for_selector("[data-form-zalozit] [data-chyba]:not([hidden])")
                    ok("aspoň 10 znaků" in await page.inner_text("[data-form-zalozit] [data-chyba]"), "krátké heslo odmítnuto")
                    await page.fill("[data-form-zalozit] [name=heslo]", heslo)
                    await page.fill("[data-form-zalozit] [name=potvrzeni]", heslo)
                    await page.click("[data-form-zalozit] button")
                    await page.wait_for_selector("[data-app]:not([hidden])")
                    ok(not (data / "zalozit-heslo").exists(), "příznak založení po nastavení hesla zmizel")
                else:
                    await page.fill("[data-form-prihlasit] [name=heslo]", heslo)
                    await page.click("[data-form-prihlasit] button")
                await page.wait_for_selector("[data-app]:not([hidden])")
                ok(True, "přihlášeno, administrace se načetla")
                await snimek(page, f"{sirka}-texty")

                # --- texty
                await page.click("[data-sekce-btn=texty]")
                nadpis = f"Pizza a *zahrada* {sirka}"
                await page.fill("[data-chyba-klic='uvod.nadpis'] textarea", nadpis)
                ok(await page.is_visible("[data-ukladani]"), "lišta neuložených změn se ukázala")
                ok("Uloženo" in await uloz(page), "texty uložené")
                await page.goto(Z + "/")
                h1 = await page.inner_html("h1")
                ok(f"Pizza a <em>zahrada</em> {sirka}" in h1, "nový nadpis je na webu i se zvýrazněním")
                await page.goto(Z + "/admin/#texty")
                await page.wait_for_selector("[data-app]:not([hidden])")
                await page.fill("[data-chyba-klic='uvod.nadtitul'] input", "x" * 119)
                await page.fill("[data-chyba-klic='uvod.listek_pozn'] input", "")
                ok("Uloženo" in await uloz(page), "prázdný a dlouhý text projde v mezích")

                # --- lístek
                await page.click("[data-sekce-btn=listek]")
                await page.wait_for_selector(".a-pridat")
                await snimek(page, f"{sirka}-listek")
                await page.click("text=+ Přidat do „Pizzy z naší pece“")
                pole_nazev = page.locator(".a-polozka.otevrena [data-chyba-klic$='.nazev'] input").first
                await pole_nazev.fill(f"Testovací pizza {sirka}")
                await page.locator(".a-polozka.otevrena [data-chyba-klic$='.cena'] input").first.fill("levná")
                t = await uloz(page)
                ok("opravit" in t and await page.locator(".a-polozka .ma-chybu, .ma-chybu").count() > 0, "nesmyslná cena se nedá uložit a je označená")
                await page.locator(".a-polozka.otevrena [data-chyba-klic$='.cena'] input").first.fill("199 Kč")
                ok("Uloženo" in await uloz(page), "nová pizza uložená")
                await page.goto(Z + "/menu.html")
                ok(await page.locator(f"text=Testovací pizza {sirka}").count() == 1, "nová pizza je na lístku")
                ok(await page.locator(f"[data-jidlo='testovaci-pizza-{sirka}']").count() == 1, "dostala adresu podle názvu (testovaci-pizza-…)")
                ok("199" in await page.inner_text(f"[data-jidlo='testovaci-pizza-{sirka}']"), "s cenou 199 Kč")
                # přidat do košíku z lístku (dialog s příplatky)
                await page.click(f"[data-jidlo='testovaci-pizza-{sirka}'] [data-pridat]")
                await page.wait_for_selector("dialog[open]")
                await page.locator("dialog [name=priplatek]").first.check()
                await page.click("[data-dp-potvrdit]")
                await page.wait_for_timeout(300)
                ok(await page.inner_text("[data-kosik-pocet]") == "1", "pizza z administrace jde přidat do košíku")
                # smazat
                await page.goto(Z + "/admin/#listek")
                await page.wait_for_selector("[data-app]:not([hidden])")
                await page.click(f"text=Testovací pizza {sirka}")
                await page.click(".a-polozka.otevrena >> text=Smazat jídlo")
                ok("Uloženo" in await uloz(page), "smazání uložené")
                await page.goto(Z + "/menu.html")
                ok(await page.locator(f"text=Testovací pizza {sirka}").count() == 0, "pizza z lístku zmizela")
                # přesun a štítek: první pizzu na úvod ne/ano
                await page.goto(Z + "/admin/#listek")
                await page.wait_for_selector("[data-app]:not([hidden])")
                druha = (await page.locator(".a-polozka-radek b").nth(1).inner_text()).strip()
                await page.locator(".a-polozka-radek").nth(1).click()
                await page.click(".a-polozka.otevrena >> text=↑")
                ok("Uloženo" in await uloz(page), "změna pořadí uložená")
                await page.goto(Z + "/menu.html")
                prvni = (await page.locator("[data-skupina=pizza] .jidlo-nazev").first.inner_text()).strip()
                ok(prvni == druha, f"pořadí se změnilo (první je teď {prvni})")

                # --- fotky
                await page.goto(Z + "/admin/#fotky")
                await page.wait_for_selector(".a-foto")
                await snimek(page, f"{sirka}-fotky")
                karta = page.locator(".a-foto", has_text="Úvod – dětské hřiště")
                await karta.locator("input[type=file]").set_input_files(str(foto))
                try:
                    await page.wait_for_selector(".a-foto:has-text('Úvod – dětské hřiště') >> text=vaše fotka", timeout=20000)
                except Exception:
                    print("toast:", await page.inner_text("[data-toast]"))
                    raise
                ok(True, "fotka dětského hřiště nahraná")
                await page.goto(Z + "/")
                src = await page.locator(".zf-1 img").get_attribute("src")
                ok(src is not None and re.match(r"foto/uvod-koutek-[0-9a-f]{8}-1280\.jpg", src), f"na úvodu je nová fotka ({src})")
                r = await page.request.get(Z + "/" + src)
                ok(r.status == 200 and r.headers.get("content-type", "").startswith("image/"), "nová fotka se načte")
                await page.goto(Z + "/admin/#fotky")
                await page.wait_for_selector(".a-foto")
                karta = page.locator(".a-foto", has_text="Úvod – dětské hřiště")
                await karta.locator("input.a-input").fill("Naše hřiště")
                await karta.locator("input.a-input").press("Tab")
                await page.wait_for_selector("text=Popisek uložen")
                await page.goto(Z + "/")
                ok(await page.locator(".zf-1 img").get_attribute("alt") == "Naše hřiště", "popisek fotky je na webu")
                await page.goto(Z + "/admin/#fotky")
                await page.wait_for_selector(".a-foto")
                await page.locator(".a-foto", has_text="Úvod – dětské hřiště").locator("text=Vrátit původní").click()
                await page.wait_for_selector("text=Vráceno")
                await page.goto(Z + "/")
                ok("assets/foto/detsky-koutek" in (await page.locator(".zf-1 img").get_attribute("src") or ""), "původní fotka vrácená")

                # --- akce
                await page.goto(Z + "/admin/#akce")
                await page.wait_for_selector("[data-app]:not([hidden])")
                await page.click("text=+ Přidat akci")
                zitra = time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400))
                karta = page.locator(".a-akce").first
                await karta.locator("[data-chyba-klic$='.nazev'] input").fill(f"Testovací koncert {sirka}")
                await karta.locator("[data-chyba-klic$='.datum'] input").fill(zitra)
                await karta.locator("[data-chyba-klic$='.text'] textarea").fill("Hraje kapela. Vstup volný.")
                await karta.locator("input[type=file]").set_input_files(str(foto))
                await page.wait_for_selector("text=nezapomeňte akci uložit", timeout=20000)
                await snimek(page, f"{sirka}-akce")
                ok("Uloženo" in await uloz(page), "akce uložená")
                await page.goto(Z + "/akce.html")
                ok(await page.locator(f"text=Testovací koncert {sirka}").count() == 1, "akce je na webu")
                ok(await page.locator(".akce-karta img[src*='foto/akce-']").count() == 1, "s vlastní fotkou")
                ok('"@type":"Event","name":"Testovací koncert' in await page.content(), "akce je i ve strukturovaných datech pro Google")
                await page.goto(Z + "/")
                ok(await page.locator(f"text=Testovací koncert {sirka}").count() == 1, "akce je i na úvodu")
                await page.goto(Z + "/admin/#akce")
                await page.wait_for_selector(".a-akce")
                await page.locator(".a-akce-hlava").first.click()
                await page.click("text=Smazat akci")
                ok("Uloženo" in await uloz(page), "smazání akce uložené")
                await page.goto(Z + "/akce.html")
                ok(await page.locator(".akce-karta").count() == 0 and await page.is_visible("[data-akce-nic]"), "bez akcí se ukáže náhradní text")
                ok(not any(p.name.startswith("akce-") for p in (web / "foto").glob("*")), "fotka smazané akce je uklizená")

                # --- provoz
                await page.goto(Z + "/admin/#provoz")
                await page.wait_for_selector(".a-den")
                await snimek(page, f"{sirka}-provoz")
                po = page.locator(".a-den").first
                await po.locator("input[type=checkbox]").uncheck()
                await po.locator("input[type=time]").nth(0).fill("16:00")
                await po.locator("input[type=time]").nth(1).fill("15:00")
                t = await uloz(page)
                ok("opravit" in t and "dřív" in await po.inner_text(), "zavírací čas před otevřením se nedá uložit")
                await po.locator("input[type=time]").nth(1).fill("20:00")
                await page.fill("[data-chyba-klic=telefon] input", "774 160 240")
                ok("Uloženo" in await uloz(page), "otevírací doba uložená")
                await page.goto(Z + "/kontakt.html")
                txt = await page.inner_text(".hodiny")
                ok("pondělí" in txt and "16:00 – 20:00" in txt, "na webu je nová pondělní doba")
                ok('"opens":"16:00"' in await page.inner_html("head"), "a v datech pro Google taky")
                # zpět zavřeno
                await page.goto(Z + "/admin/#provoz")
                await page.wait_for_selector(".a-den")
                await page.locator(".a-den").first.locator("input[type=checkbox]").check()
                ok("Uloženo" in await uloz(page), "pondělí zase zavřeno")

                # --- zálohy
                await page.goto(Z + "/admin/#provoz")
                await page.wait_for_selector(".a-zaloha")
                ok(await page.locator(".a-zaloha").count() >= 3, "zálohy se ukazují")

                # --- neuložené změny při přepnutí
                await page.click("[data-sekce-btn=texty]")
                await page.fill("[data-chyba-klic='uvod.perex'] textarea", "rozepsané")
                await page.click("[data-sekce-btn=listek]")
                ok(not await page.is_visible("[data-ukladani]"), "přepnutí s neuloženou změnou se zeptá a zahodí")

                # --- odhlášení a špatné heslo
                await page.click("[data-odhlasit]")
                await page.wait_for_selector("[data-form-prihlasit]:not([hidden])")
                await page.fill("[data-form-prihlasit] [name=heslo]", "spatne-heslo")
                await page.click("[data-form-prihlasit] button")
                await page.wait_for_selector("[data-form-prihlasit] [data-chyba]:not([hidden])")
                ok("nesedí" in await page.inner_text("[data-form-prihlasit] [data-chyba]"), "špatné heslo odmítnuto")
                r = await page.request.post(Z + "/admin/api.php?akce=uloz", data={"co": "obsah", "data": {}})
                ok(r.status == 401, "API bez přihlášení nic neuloží")
                await ctx.close()

            # --- přímý přístup k citlivým věcem
            srv.terminate(); srv.wait(); srv = spust_server()
            ctx = await b.new_context()
            page = await ctx.new_page()
            for cesta, ocek in (("/inc/jadro.php", 403), ("/inc/vychozi/menu.json", 403), ("/neexistuje", 404), ("/sitemap.xml", 200), ("/robots.txt", 200)):
                r = await page.request.get(Z + cesta)
                ok(r.status == ocek, f"{cesta} vrací {r.status} (čekám {ocek})")
            await b.close()
    finally:
        srv.terminate()
        srv_log.seek(0)
        err = srv_log.read()
        php_chyby = [r for r in err.splitlines() if re.search(r"(Fatal|Warning|Notice|Deprecated|Parse error)", r)]
        foto.unlink(missing_ok=True)
    for c in chyby_konzole:
        ok(False, c)
    for c in php_chyby[:20]:
        ok(False, "PHP: " + c)
    spatne = [t for v, t in vysledky if not v]
    print(f"\n{len(vysledky)} kontrol, chyb {len(spatne)}")
    sys.exit(1 if spatne else 0)


asyncio.run(main())

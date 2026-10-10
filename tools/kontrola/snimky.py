"""Snímky stránek pro vizuální kontrolu: python snimky.py <adresa> <cil> [stranky…]"""
import asyncio, sys
from playwright.async_api import async_playwright
Z, CIL = sys.argv[1], sys.argv[2]
STR = sys.argv[3:] or ["index.html", "menu.html", "objednavka.html", "zahrada.html", "akce.html", "kontakt.html", "404.html"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True)
        for sirka, tema in ((1440, "light"), (390, "light"), (1440, "dark")):
            ctx = await b.new_context(viewport={"width": sirka, "height": 900}, color_scheme=tema, device_scale_factor=1, is_mobile=sirka < 700)
            page = await ctx.new_page()
            for s in STR:
                await page.goto(Z + s, wait_until="networkidle")
                await page.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); document.querySelectorAll('.odhalit').forEach(e=>e.classList.add('videt')); document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager'); await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); }")
                await page.wait_for_timeout(4500 if s == "index.html" else 400)
                await page.screenshot(path=f"{CIL}/{s[:-5]}-{sirka}-{tema}.png", full_page=True)
            await ctx.close()
        await b.close()
asyncio.run(main())

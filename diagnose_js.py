import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen to page errors and console messages
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err.name}\nMessage: {err.message}\nStack:\n{err.stack}"))
        page.on("console", lambda msg: print(f"CONSOLE {msg.type.upper()}: {msg.text}") if msg.type in ["error", "warning"] else None)

        print("Navigating to login page...")
        await page.goto("http://127.0.0.1:8000/login/")

        print("Logging in...")
        await page.fill("#id_username", "operador1")
        await page.fill("#id_password", "Clave12345")
        await page.click("button[type='submit']")

        # Wait for redirection to remates or home
        await page.wait_for_timeout(2000)
        print(f"Current URL: {page.url}")

        if "remates" in page.url:
            print("Selecting or creating a remate...")
            # If there's an active remate, we might see "Entrar al sistema" or "Trabajar aquí"
            # Let's try to click "Trabajar aquí" if visible, or "Entrar al sistema"
            try:
                await page.click("text=Trabajar aquí")
            except Exception:
                try:
                    await page.click("text=Entrar al sistema")
                except Exception:
                    pass
            await page.wait_for_timeout(2000)
            print(f"Current URL after selection: {page.url}")

        print("Checking toggleDesktopViewBtn...")
        try:
            btn = await page.query_selector("#toggleDesktopViewBtn")
            if btn:
                print("Found toggleDesktopViewBtn. Clicking it to enable desktop view...")
                await btn.click()
                await page.wait_for_timeout(1000)
                print("Clicking toggleDesktopViewBtn again to return to mobile view...")
                await btn.click()
                await page.wait_for_timeout(1000)
            else:
                print("toggleDesktopViewBtn not found on page.")
        except Exception as e:
            print(f"Error clicking toggleDesktopViewBtn: {e}")

        # Let's check other buttons, like mobile nav buttons
        print("Checking navRegistros...")
        try:
            nav = await page.query_selector("#navRegistros")
            if nav:
                print("Found navRegistros. Clicking it...")
                await nav.click()
                await page.wait_for_timeout(1000)
            else:
                print("navRegistros not found on page.")
        except Exception as e:
            print(f"Error clicking navRegistros: {e}")

        # Fetch served HTML content and print lines around 1792
        html = await page.content()
        lines = html.splitlines()
        print("\n--- SERVED HTML LINES 1780 to 1805 ---")
        for idx in range(1779, min(1810, len(lines))):
            print(f"{idx+1}: {lines[idx]}")
        print("---------------------------------------\n")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

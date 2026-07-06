import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("https://norastudy.vercel.app")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Sign in' link to open the login form.
        # Sign in link
        elem = page.get_by_role('link', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the Email field with 'test@norastudy.app', fill the Password field with 'TestNora2026!', then click the 'Sign in →' button.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("test@norastudy.app")
        
        # -> Fill the Email field with 'test@norastudy.app', fill the Password field with 'TestNora2026!', then click the 'Sign in →' button.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("TestNora2026!")
        
        # -> Fill the Email field with 'test@norastudy.app', fill the Password field with 'TestNora2026!', then click the 'Sign in →' button.
        # Sign in → button
        elem = page.get_by_role('button', name='Sign in →', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Skip tour' button to dismiss the 'Start here' popover, then open the Knowledge Web page by navigating to the 'Knowledge Web' route.
        # Skip tour button
        elem = page.get_by_role('button', name='Skip tour', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Skip tour' button to dismiss the 'Start here' popover, then open the Knowledge Web page by navigating to the 'Knowledge Web' route.
        await page.goto("https://norastudy.vercel.app/app/knowledge-web")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the page shows the 'Knowledge Web' heading and, below it, a 'Generate Knowledge Web' button (the empty state for an account with no generated web yet). Finding either the heading with that button, or an already-rendered node graph, means PASS; a 404 or blank page means FAIL.
        # Assert: The 'Generate Knowledge Web' button is present and labeled correctly.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div/button").nth(0)).to_have_text("Generate Knowledge Web", timeout=15000), "The 'Generate Knowledge Web' button is present and labeled correctly."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
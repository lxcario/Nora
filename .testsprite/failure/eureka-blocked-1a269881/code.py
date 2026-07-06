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
        
        # -> Fill the Email and Password fields and click the 'Sign in →' button to log in.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("test@norastudy.app")
        
        # -> Fill the Email and Password fields and click the 'Sign in →' button to log in.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("TestNora2026!")
        
        # -> Fill the Email and Password fields and click the 'Sign in →' button to log in.
        # Sign in → button
        elem = page.get_by_role('button', name='Sign in →', exact=True)
        await elem.click(timeout=10000)
        
        # -> Dismiss the tour by clicking the 'Skip tour' button, then navigate to the '/app/eureka' page and wait for it to load.
        # Skip tour button
        elem = page.get_by_role('button', name='Skip tour', exact=True)
        await elem.click(timeout=10000)
        
        # -> Dismiss the tour by clicking the 'Skip tour' button, then navigate to the '/app/eureka' page and wait for it to load.
        await page.goto("https://norastudy.vercel.app/app/eureka")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the connections explorer area below the header renders real content -- either a control to generate/reveal a connection and connection cards, OR a clear empty-state or prompt message -- rather than an empty or broken container
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[1]/button").nth(0).scroll_into_view_if_needed()
        # Assert: The connections explorer displays the 'Discover connections' control.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[1]/button").nth(0)).to_be_visible(timeout=15000), "The connections explorer displays the 'Discover connections' control."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
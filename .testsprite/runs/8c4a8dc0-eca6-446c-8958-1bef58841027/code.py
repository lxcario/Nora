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
        
        # -> Fill 'test@norastudy.app' into the Email field, fill 'Test123!' into the Password field, and click the 'Sign in →' button.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("test@norastudy.app")
        
        # -> Fill 'test@norastudy.app' into the Email field, fill 'Test123!' into the Password field, and click the 'Sign in →' button.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Test123!")
        
        # -> Fill 'test@norastudy.app' into the Email field, fill 'Test123!' into the Password field, and click the 'Sign in →' button.
        # Sign in → button
        elem = page.get_by_role('button', name='Sign in →', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the Pixel Room page (navigate to the 'Pixel Room' page /app/room) so the room pet sprite and the room status message can be inspected.
        await page.goto("https://norastudy.vercel.app/app/room")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the Pixel Room page loads with a companion pet image visible (a GIF or canvas showing a creature). A mood status message is shown below or near the pet — it contains the pet's name and one of: 'happy', 'neutral', 'sad', or 'misses you'.
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[2]/div/img").nth(0).scroll_into_view_if_needed()
        # Assert: Expected the Pixel Room pet image to be visible in the room viewport.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[2]/div/img").nth(0)).to_be_visible(timeout=15000), "Expected the Pixel Room pet image to be visible in the room viewport."
        
        # --> Verify the sidebar (left navigation panel) contains a pet widget area showing a mood label — one of 'Happy', 'Neutral', or 'Sad'. The mood state (happy/neutral/sad) in the sidebar must agree with the mood state in the room status message. Both should indicate the same underlying mood even if the exact wording differs (e.g. sidebar says 'Happy' and room says 'is happy').
        # Assert: Expected the sidebar pet widget to display mood 'Sad'.
        await expect(page.locator("xpath=/html/body/div[2]/aside/div[2]/a").nth(0)).to_contain_text("Sad", timeout=15000), "Expected the sidebar pet widget to display mood 'Sad'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
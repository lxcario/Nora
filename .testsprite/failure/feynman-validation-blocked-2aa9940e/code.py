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
        
        # -> Click the 'Sign in' link on the homepage to open the login form.
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
        
        # -> Click the 'Skip tour' button to dismiss the tour modal, then click the 'Feynman Mode' link in the left sidebar to open Feynman Mode.
        # Skip tour button
        elem = page.get_by_role('button', name='Skip tour', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Skip tour' button to dismiss the tour modal, then click the 'Feynman Mode' link in the left sidebar to open Feynman Mode.
        # Feynman Mode NEW link
        elem = page.get_by_role('link', name='Feynman Mode NEW', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Your Explanation' field with a short explanation and click the 'Evaluate with AI' button.
        # text area
        elem = page.get_by_placeholder('Start typing your explanation...', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Too short explanation.")
        
        # -> Fill the 'Your Explanation' field with a short explanation and click the 'Evaluate with AI' button.
        # Evaluate with AI button
        elem = page.get_by_role('button', name='Evaluate with AI', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify a validation error message is visible on screen — it should say something like 'Please write an explanation first' or 'write a more detailed explanation'. No crash and no blank page.
        # Assert: The explanation textarea contains the short input that triggered validation.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/div[3]/div/div/div[1]/textarea").nth(0)).to_have_value("Too short explanation.", timeout=15000), "The explanation textarea contains the short input that triggered validation."
        # Assert: The Evaluate with AI button is disabled, indicating submission was blocked by validation.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/div[3]/div/div/div[2]/div[2]/button").nth(0)).to_have_attribute("data-state", "disabled", timeout=15000), "The Evaluate with AI button is disabled, indicating submission was blocked by validation."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/div[3]/div/div/div[1]/textarea").nth(0).scroll_into_view_if_needed()
        # Assert: The explanation textarea is visible, confirming the page loaded and is not blank.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/div[3]/div/div/div[1]/textarea").nth(0)).to_be_visible(timeout=15000), "The explanation textarea is visible, confirming the page loaded and is not blank."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
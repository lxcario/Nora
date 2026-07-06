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
        
        # -> Click the 'Sign in' link to open the authentication page.
        # Sign in link
        elem = page.get_by_role('link', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the Email field with 'test@norastudy.app' and the Password field with 'TestNora2026!', then click the 'Sign in →' button to submit.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("test@norastudy.app")
        
        # -> Fill the Email field with 'test@norastudy.app' and the Password field with 'TestNora2026!', then click the 'Sign in →' button to submit.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("TestNora2026!")
        
        # -> Fill the Email field with 'test@norastudy.app' and the Password field with 'TestNora2026!', then click the 'Sign in →' button to submit.
        # Sign in → button
        elem = page.get_by_role('button', name='Sign in →', exact=True)
        await elem.click(timeout=10000)
        
        # -> Dismiss the onboarding tour by clicking the 'Skip tour' button, then open the 'History' page (History view).
        # Skip tour button
        elem = page.get_by_role('button', name='Skip tour', exact=True)
        await elem.click(timeout=10000)
        
        # -> Dismiss the onboarding tour by clicking the 'Skip tour' button, then open the 'History' page (History view).
        await page.goto("https://norastudy.vercel.app/app/history")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify this is the real History page — it shows a heading or filter controls related to history, and is NOT a '404 / route doesn't exist' page and NOT a blank container
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[1]/button[1]").nth(0).scroll_into_view_if_needed()
        # Assert: The History filter button 'All' is visible, confirming filter controls are present.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[2]/div[1]/button[1]").nth(0)).to_be_visible(timeout=15000), "The History filter button 'All' is visible, confirming filter controls are present."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/div/div[1]/span[3]").nth(0).scroll_into_view_if_needed()
        # Assert: A history entry timestamp '11:32 AM' is visible, confirming activity content is rendered.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/div/div[1]/span[3]").nth(0)).to_be_visible(timeout=15000), "A history entry timestamp '11:32 AM' is visible, confirming activity content is rendered."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[2]/div/div/div[1]/span[3]").nth(0).scroll_into_view_if_needed()
        # Assert: A history entry timestamp '11:06 AM' is visible, confirming multiple activity entries are shown.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[2]/div/div/div[1]/span[3]").nth(0)).to_be_visible(timeout=15000), "A history entry timestamp '11:06 AM' is visible, confirming multiple activity entries are shown."
        
        # --> Verify the page shows EITHER a list of past study activity entries grouped by date, OR a clear empty-state message indicating no history yet — either confirms the History view rendered its content correctly
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[1]/div/div/div/button").nth(0).scroll_into_view_if_needed()
        # Assert: A date group is present (expand control for the first date) on the History page.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[1]/div/div/div/button").nth(0)).to_be_visible(timeout=15000), "A date group is present (expand control for the first date) on the History page."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[1]/div/div/div/div/div[2]/div/span").nth(0).scroll_into_view_if_needed()
        # Assert: An entry summary/count is visible under the first date group, indicating entries exist.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[1]/div/div/div/div/div[2]/div/span").nth(0)).to_be_visible(timeout=15000), "An entry summary/count is visible under the first date group, indicating entries exist."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/button").nth(0).scroll_into_view_if_needed()
        # Assert: A second date group is present (expand control for another date) on the History page.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/button").nth(0)).to_be_visible(timeout=15000), "A second date group is present (expand control for another date) on the History page."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/div/div[1]/span[3]").nth(0).scroll_into_view_if_needed()
        # Assert: A history entry timestamp ('11:32 AM') is visible, confirming an activity item is listed.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/section[2]/div/div[1]/div/div/div[1]/span[3]").nth(0)).to_be_visible(timeout=15000), "A history entry timestamp ('11:32 AM') is visible, confirming an activity item is listed."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
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
        
        # -> Click the 'Sign in' link to open the sign-in form.
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
        
        # -> Dismiss the onboarding by clicking the 'Skip tour' button, then open 'Today's Memories' from the left navigation.
        # Skip tour button
        elem = page.get_by_role('button', name='Skip tour', exact=True)
        await elem.click(timeout=10000)
        
        # -> Dismiss the onboarding by clicking the 'Skip tour' button, then open 'Today's Memories' from the left navigation.
        # Today's Memories NEW link
        elem = page.get_by_role('link', name="Today's Memories NEW", exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the "Maybe" confidence button, press Space to reveal the answer, then press '3' to grade the card as 'Good' and observe the next card or session-complete screen.
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' confidence button on the current review card to set pre-reveal confidence.
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Reveal Answer' button to show the answer for the current card.
        # Reveal Answer button
        elem = page.get_by_role('button', name='Reveal Answer', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Good' button to grade the current review card and proceed to the next card or session-complete screen.
        # Good Remembered button
        elem = page.get_by_role('button', name='Good Remembered', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' pre-reveal confidence button on the current review card.
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Reveal Answer' button to show the card's answer.
        # Reveal Answer button
        elem = page.get_by_role('button', name='Reveal Answer', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Good' button to grade the current review card.
        # Good Remembered button
        elem = page.get_by_role('button', name='Good Remembered', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' confidence button to set pre-reveal confidence for the current card.
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Reveal Answer' button to show the card's answer.
        # Reveal Answer button
        elem = page.get_by_role('button', name='Reveal Answer', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Good' button to grade the current review card.
        # Good Remembered button
        elem = page.get_by_role('button', name='Good Remembered', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' pre-reveal confidence button to set pre-reveal confidence for the current card.
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' pre-reveal confidence button to set confidence for the current card, then reveal the answer.
        # ( Maybe )
        elem = page.get_by_text('(Maybe)', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' pre-reveal confidence button to set confidence for the current card, then reveal the answer.
        # Reveal Answer button
        elem = page.get_by_role('button', name='Reveal Answer', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Good' button to grade the current revealed card and then verify that the next card or the session-complete screen appears.
        # Good Remembered button
        elem = page.get_by_role('button', name='Good Remembered', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Maybe' pre-reveal confidence button for the current card and wait for the UI to update (so the 'Reveal Answer' control appears).
        # 3 Maybe button
        elem = page.get_by_role('button', name='3 Maybe', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the page is the real Review/Memories page — it shows EITHER (a) a card with a question and confidence buttons (1-5), OR (b) a session-complete screen with an encouraging message, OR (c) an empty state saying all memories are safe for now — any of these confirms the review flow is working correctly and is NOT a 404 or blank page
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[1]").nth(0).scroll_into_view_if_needed()
        # Assert: The review card's '1 Can't recall' confidence button is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[1]").nth(0)).to_be_visible(timeout=15000), "The review card's '1 Can't recall' confidence button is visible."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[3]").nth(0).scroll_into_view_if_needed()
        # Assert: The review card's '3 Maybe' confidence button is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[3]").nth(0)).to_be_visible(timeout=15000), "The review card's '3 Maybe' confidence button is visible."
        await page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[5]").nth(0).scroll_into_view_if_needed()
        # Assert: The review card's '5 Certain' confidence button is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[4]/div[3]/div/div[3]/div/div/button[5]").nth(0)).to_be_visible(timeout=15000), "The review card's '5 Certain' confidence button is visible."
        # Assert: The page indicates 6 cards due today.
        await expect(page.locator("xpath=/html/body/div[2]/div/main/div/div[3]/div/span[1]").nth(0)).to_have_text("6", timeout=15000), "The page indicates 6 cards due today."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
from playwright.async_api import async_playwright, Playwright, Browser


async def create_browser(headless: bool = True) -> tuple[Playwright, Browser]:
    """
    Create and return Playwright instance + Chromium browser.

    Important:
    The caller must close BOTH browser and playwright.
    """
    headless_bool = bool(headless)
    playwright = None
    
    try:
        playwright = await async_playwright().start()

        browser = await playwright.chromium.launch(
            headless=headless_bool,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--disable-extensions",
                "--disable-setuid-sandbox",
                "--no-first-run",
            ],
        )

        return playwright, browser

    except Exception as exc:
        if playwright is not None:
            await playwright.stop()
        raise exc

# Daraz requests share a process, but cookies/pages are isolated per scrape.
import asyncio
from contextlib import asynccontextmanager
from urllib.parse import urlparse

_browser = None
_playwright = None
_launch_lock = asyncio.Lock()
_page_slots = asyncio.Semaphore(2)


@asynccontextmanager
async def browser_page():
    global _browser, _playwright
    async with _page_slots:
        async with _launch_lock:
            if _browser is None or not _browser.is_connected():
                if _playwright is not None:
                    await _playwright.stop()
                _playwright, _browser = await create_browser()
            browser = _browser
        context = await browser.new_context(locale='en-US')
        try:
            async def route_request(route):
                outside_storefront = (route.request.resource_type == 'document' and
                    urlparse(route.request.url).hostname not in ('daraz.com.np', 'www.daraz.com.np'))
                if outside_storefront or route.request.resource_type in ('image', 'media', 'font'):
                    await route.abort()
                else:
                    await route.continue_()
            await context.route('**/*', route_request)
            page = await context.new_page()
            page.set_default_timeout(2000)
            yield page
        finally:
            await context.close()


async def close_shared_browser():
    global _browser, _playwright
    async with _launch_lock:
        try:
            if _browser is not None:
                await _browser.close()
        finally:
            if _playwright is not None:
                await _playwright.stop()
            _browser = _playwright = None

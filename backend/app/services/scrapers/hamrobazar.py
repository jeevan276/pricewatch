from app.services.scrapers.errors import ProductRemovedError
import json
import re
from typing import Any

from app.services.browser import create_browser
from app.services.scrapers.base import BaseScraper


class HamroBazarScraper(BaseScraper):

    # ==========================================================
    # GENERIC HELPERS
    # ==========================================================

    async def _get_text(
        self,
        page,
        selectors: list[str],
    ) -> str | None:
        for selector in selectors:
            try:
                locator = page.locator(selector).first

                if await locator.count() == 0:
                    continue

                text = await locator.text_content(timeout=2000)

                if text and text.strip():
                    return text.strip()

            except Exception:
                continue

        return None

    async def _get_attribute(
        self,
        page,
        selectors: list[str],
        attribute: str,
    ) -> str | None:
        for selector in selectors:
            try:
                locator = page.locator(selector).first

                if await locator.count() == 0:
                    continue

                value = await locator.get_attribute(
                    attribute,
                    timeout=2000,
                )

                if value and value.strip():
                    return value.strip()

            except Exception:
                continue

        return None

    # ==========================================================
    # PRICE CLEANING
    # ==========================================================

    def _extract_price_from_text(
        self,
        text: str | None,
    ) -> float | None:
        if not text:
            return None

        # Remove unnecessary whitespace
        text = " ".join(text.split())

        matches = re.findall(
            r"(?:Rs\.?|NPR|रू)?\s*(\d[\d,]*(?:\.\d+)?)",
            text,
            flags=re.IGNORECASE,
        )

        if not matches:
            return None

        candidates = []

        for value in matches:
            try:
                number = float(value.replace(",", ""))

                if number > 0:
                    candidates.append(number)

            except ValueError:
                continue

        if not candidates:
            return None

        return max(candidates)

    # ==========================================================
    # JSON-LD PRICE
    # ==========================================================

    async def _get_jsonld_price(self, page) -> float | None:
        try:
            scripts = await page.locator(
                'script[type="application/ld+json"]'
            ).all_text_contents()

            for script in scripts:
                try:
                    data = json.loads(script)
                except Exception:
                    continue

                price = self._find_price_in_json(data)

                if price is not None:
                    return price

        except Exception:
            pass

        return None

    def _find_price_in_json(
        self,
        data: Any,
    ) -> float | None:
        if isinstance(data, dict):
            # Direct price
            if "price" in data:
                price = data.get("price")
                try:
                    if isinstance(price, (int, float)):
                        return float(price)

                    if isinstance(price, str):
                        extracted = self._extract_price_from_text(price)
                        if extracted is not None:
                            return extracted
                except Exception:
                    pass

            # Offers
            if "offers" in data:
                price = self._find_price_in_json(data["offers"])
                if price is not None:
                    return price

            # Product
            if "product" in data:
                price = self._find_price_in_json(data["product"])
                if price is not None:
                    return price

            # Search nested values
            for value in data.values():
                price = self._find_price_in_json(value)
                if price is not None:
                    return price

        elif isinstance(data, list):
            for item in data:
                price = self._find_price_in_json(item)
                if price is not None:
                    return price

        return None

    # ==========================================================
    # PRICE
    # ==========================================================

    async def _get_price(self, page) -> float:
        # 1. JSON-LD
        price = await self._get_jsonld_price(page)

        if price is not None:
            print("HAMROBAZAAR PRICE FROM JSON-LD:", price)
            return price

        # 2. Common price selectors
        selectors = [
            "[class*='price']",
            "[class*='Price']",
            "[class*='amount']",
            "[class*='Amount']",
            "[data-testid*='price']",
            "[data-testid*='Price']",
            "[aria-label*='price']",
            "[aria-label*='Price']",
        ]

        for selector in selectors:
            try:
                locator = page.locator(selector)
                count = await locator.count()

                if count == 0:
                    continue

                for index in range(min(count, 5)):
                    element = locator.nth(index)

                    try:
                        text = await element.text_content(timeout=1000)
                    except Exception:
                        continue

                    if not text:
                        continue

                    extracted = self._extract_price_from_text(text.strip())

                    if extracted is not None:
                        print("HAMROBAZAAR PRICE TEXT:", text.strip())
                        print("HAMROBAZAAR EXTRACTED PRICE:", extracted)
                        return extracted

            except Exception:
                continue

        # 3. Meta price
        meta_selectors = [
            'meta[property="product:price:amount"]',
            'meta[property="og:price:amount"]',
            'meta[itemprop="price"]',
        ]

        for selector in meta_selectors:
            try:
                value = await page.locator(selector).first.get_attribute("content")

                if not value:
                    value = await page.locator(selector).first.get_attribute("value")

                extracted = self._extract_price_from_text(value)

                if extracted is not None:
                    print("HAMROBAZAAR PRICE FROM META:", extracted)
                    return extracted

            except Exception:
                continue

        # 4. Visible page text fallback
        try:
            body_text = await page.locator("body").inner_text(timeout=3000)

            currency_matches = re.findall(
                r"(?:Rs\.?|NPR|रू)\s*[\d,]+(?:\.\d+)?",
                body_text,
                flags=re.IGNORECASE,
            )

            for match in currency_matches:
                extracted = self._extract_price_from_text(match)
                if extracted is not None:
                    print("HAMROBAZAAR PRICE FROM BODY:", match)
                    print("HAMROBAZAAR EXTRACTED PRICE:", extracted)
                    return extracted

        except Exception:
            pass

        # DEBUG
        print("\n========== HAMROBAZAAR PRICE DEBUG ==========")
        try:
            print("URL:", page.url)
            print("TITLE:", await page.title())
            body_text = await page.locator("body").inner_text(timeout=3000)
            print("BODY TEXT PREVIEW:", body_text[:3000])
        except Exception as error:
            print("DEBUG ERROR:", error)
        print("==============================================\n")

        raise ValueError("Could not find HamroBazaar product price")

    # ==========================================================
    # PRODUCT NAME
    # ==========================================================

    async def _get_product_name(self, page) -> str:
        selectors = [
            "h1",
            "[class*='title']",
            "[class*='Title']",
            "[class*='name']",
            "[class*='Name']",
        ]

        name = await self._get_text(page, selectors)
        if name:
            return name

        # OpenGraph title
        try:
            title = await page.locator('meta[property="og:title"]').first.get_attribute("content")
            if title and title.strip():
                return title.strip()
        except Exception:
            pass

        # Page title
        try:
            title = await page.title()
            if title and title.strip():
                title = re.sub(
                    r"\s*[-|]\s*HamroBazaar.*$",
                    "",
                    title,
                    flags=re.IGNORECASE,
                )
                if title.strip():
                    return title.strip()
        except Exception:
            pass

        raise ValueError("Could not find HamroBazaar product name")

    # ==========================================================
    # PRODUCT IMAGE
    # ==========================================================

    async def _get_product_image(self, page, base_url: str) -> str | None:
        # 1. OpenGraph image
        image_url = await self._get_attribute(
            page,
            [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
            ],
            "content",
        )

        if image_url:
            return self.normalize_url(base_url, image_url)

        # 2. Product image
        selectors = [
            "img[src]",
            "img[data-src]",
            "img[data-lazy-src]",
        ]

        for selector in selectors:
            try:
                locator = page.locator(selector)
                count = await locator.count()

                for index in range(min(count, 10)):
                    image = locator.nth(index)
                    src = await image.get_attribute("src")

                    if not src:
                        src = await image.get_attribute("data-src")

                    if not src:
                        src = await image.get_attribute("data-lazy-src")

                    if src and not src.startswith("data:"):
                        norm_src = self.normalize_url(base_url, src)
                        if norm_src and norm_src.startswith(("http://", "https://")):
                            return norm_src

            except Exception:
                continue

        return None

    async def _navigate_and_wait(self, page, url: str) -> None:
        response = await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=60000,
        )

        if response:
            if response.status in (404, 410):
                raise ProductRemovedError("HamroBazaar product page no longer exists")
            if response.status >= 400:
                raise ValueError(f"HamroBazaar returned HTTP {response.status}")

        try:
            await page.wait_for_selector(
                "h1, [class*='price'], [class*='Price']",
                state="attached",
                timeout=5000,
            )
        except Exception:
            try:
                await page.wait_for_load_state("networkidle", timeout=3000)
            except Exception:
                pass

    # ==========================================================
    # SCRAPE PRODUCT
    # ==========================================================

    async def scrape_product(self, url: str) -> dict:
        playwright, browser = await create_browser()

        try:
            page = await browser.new_page()

            await self._navigate_and_wait(page, url)

            name = await self._get_product_name(page)
            price = await self._get_price(page)
            image_url = await self._get_product_image(page, url)

            result = {
                "name": name,
                "price": price,
                "image_url": image_url,
            }

            print("\n========== HAMROBAZAAR PRODUCT ==========")
            print("NAME:", name)
            print("PRICE:", price)
            print("IMAGE:", image_url)
            print("=========================================\n")

            return result

        finally:
            await browser.close()
            await playwright.stop()

    # ==========================================================
    # SCRAPE PRICE
    # ==========================================================

    async def scrape_price(self, url: str) -> float:
        playwright, browser = await create_browser()

        try:
            page = await browser.new_page()

            await self._navigate_and_wait(page, url)

            price = await self._get_price(page)

            return price

        finally:
            await browser.close()
            await playwright.stop()
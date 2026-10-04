from app.services.scrapers.errors import ProductRemovedError
import json
import re
from typing import Any

from app.services.browser import create_browser
from app.services.scrapers.base import BaseScraper


class OnlineSathiScraper(BaseScraper):

    # ==========================================================
    # TEXT HELPER
    # ==========================================================

    async def _get_text(
        self,
        page,
        selectors: list[str],
    ) -> str | None:
        for selector in selectors:
            try:
                locator = page.locator(selector)
                count = await locator.count()

                if count == 0:
                    continue

                for i in range(min(count, 5)):
                    try:
                        text = await locator.nth(i).text_content(timeout=1500)
                    except Exception:
                        continue

                    if text and text.strip():
                        return text.strip()

            except Exception:
                continue

        return None

    # ==========================================================
    # PRICE EXTRACTION
    # ==========================================================

    def _extract_price(
        self,
        text: str | None,
    ) -> float | None:
        if not text:
            return None

        text = " ".join(text.split())

        patterns = [
            r"(?:Rs\.?|NPR|रू)\s*([\d,]+(?:\.\d+)?)",
            r"([\d,]+(?:\.\d+)?)\s*(?:Rs\.?|NPR|रू)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)

            for match in matches:
                try:
                    price = float(match.replace(",", ""))

                    if price > 0:
                        return price

                except (ValueError, AttributeError):
                    continue

        return None

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
            if "price" in data:
                value = data.get("price")

                if isinstance(value, (int, float)):
                    if float(value) > 0:
                        return float(value)

                if isinstance(value, str):
                    price = self._extract_price(value)
                    if price is not None:
                        return price

            if "offers" in data:
                price = self._find_price_in_json(data["offers"])
                if price is not None:
                    return price

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
    # PRODUCT PRICE
    # ==========================================================

    async def _get_product_price(self, page) -> float:
        # 1. JSON-LD
        price = await self._get_jsonld_price(page)

        if price is not None:
            print("ONLINE SAATHI PRICE FROM JSON-LD:", price)
            return price

        # 2. CSS SELECTORS
        selectors = [
            ".price",
            ".product-price",
            ".current-price",
            ".details-product-price",
            ".sale-price",
            ".special-price",
            ".selling-price",
            ".regular-price",
            ".discount-price",
            "[class*='product-price']",
            "[class*='current-price']",
            "[class*='selling-price']",
            "[class*='selling_price']",
            "[class*='price']",
            "[class*='Price']",
            "[class*='amount']",
            "[class*='Amount']",
            "[data-price]",
            "[data-product-price]",
            "[data-sale-price]",
            "[data-current-price]",
            "[data-testid*='price']",
            "[data-testid*='Price']",
        ]

        for selector in selectors:
            try:
                locator = page.locator(selector)
                count = await locator.count()

                if count == 0:
                    continue

                for i in range(min(count, 5)):
                    try:
                        text = await locator.nth(i).text_content(timeout=1000)
                    except Exception:
                        continue

                    if not text:
                        continue

                    price = self._extract_price(text.strip())

                    if price is not None:
                        print("ONLINE SAATHI PRICE TEXT:", text.strip())
                        print("ONLINE SAATHI PRICE:", price)
                        return price

            except Exception:
                continue

        # 3. META PRICE
        meta_selectors = [
            'meta[property="product:price:amount"]',
            'meta[property="og:price:amount"]',
            'meta[itemprop="price"]',
        ]

        for selector in meta_selectors:
            try:
                element = page.locator(selector).first
                value = await element.get_attribute("content")
                price = self._extract_price(value)

                if price is not None:
                    return price

            except Exception:
                continue

        # 4. BODY TEXT
        try:
            body_text = await page.locator("body").inner_text(timeout=3000)

            matches = re.findall(
                r"(?:Rs\.?|NPR|रू)\s*[\d,]+(?:\.\d+)?",
                body_text,
                flags=re.IGNORECASE,
            )

            for match in matches:
                price = self._extract_price(match)
                if price is not None:
                    print("ONLINE SAATHI PRICE FROM BODY:", match)
                    return price

        except Exception:
            pass

        # DEBUG
        print("\n========== ONLINE SAATHI DEBUG ==========")
        try:
            print("URL:", page.url)
            print("TITLE:", await page.title())
            body_text = await page.locator("body").inner_text(timeout=3000)
            print("\nBODY TEXT:")
            print(body_text[:5000])
        except Exception as error:
            print("DEBUG ERROR:", error)
        print("=========================================\n")

        raise ValueError("Could not find OnlineSaathi product price")

    # ==========================================================
    # PRODUCT NAME
    # ==========================================================

    async def _get_product_name(self, page) -> str:
        selectors = [
            "h1",
            ".product-title",
            ".product-name",
            "[class*='product-title']",
            "[class*='product-name']",
            ".details-product-name",
            "[class*='productName']",
            "[class*='ProductName']",
        ]

        name = await self._get_text(page, selectors)
        if name:
            return name

        # OpenGraph title
        try:
            element = page.locator('meta[property="og:title"]').first
            name = await element.get_attribute("content")
            if name and name.strip():
                return name.strip()
        except Exception:
            pass

        # Page title
        try:
            title = await page.title()
            if title and title.strip():
                return title.strip()
        except Exception:
            pass

        raise ValueError("Could not find OnlineSaathi product name")

    # ==========================================================
    # IMAGE VALIDATION
    # ==========================================================

    async def _validate_product_image(self, image, base_url: str) -> str | None:
        try:
            src = await image.get_attribute("src")

            if not src:
                src = await image.get_attribute("data-src")

            if not src:
                src = await image.get_attribute("data-lazy-src")

            if not src:
                src = await image.get_attribute("data-original")

            if not src or src.startswith("data:"):
                return None

            src = self.normalize_url(base_url, src)
            if not src:
                return None

            src_lower = src.lower()

            blocked_words = [
                "logo",
                "onlinesathi-",
                "favicon",
                "icon",
                "placeholder",
                "default",
                "banner",
                "header",
                "footer",
                "facebook",
                "instagram",
                "youtube",
                "twitter",
                "whatsapp",
                "payment",
                "visa",
                "mastercard",
                "esewa",
                "khalti",
            ]

            for word in blocked_words:
                if word in src_lower:
                    print("SKIPPED NON-PRODUCT IMAGE:", src)
                    return None

            try:
                width = await image.get_attribute("width")
                height = await image.get_attribute("height")

                if width and width.isdigit() and int(width) < 150:
                    return None

                if height and height.isdigit() and int(height) < 150:
                    return None

            except Exception:
                pass

            return src

        except Exception:
            return None

    # ==========================================================
    # FIND IMAGE IN JSON-LD
    # ==========================================================

    def _find_image_in_json(self, data: Any) -> str | None:
        if isinstance(data, dict):
            if "image" in data:
                image = data.get("image")
                if isinstance(image, str):
                    return image
                if isinstance(image, list):
                    for item in image:
                        if isinstance(item, str):
                            return item

            for value in data.values():
                result = self._find_image_in_json(value)
                if result:
                    return result

        elif isinstance(data, list):
            for item in data:
                result = self._find_image_in_json(item)
                if result:
                    return result

        return None

    # ==========================================================
    # PRODUCT IMAGE
    # ==========================================================

    async def _get_product_image(self, page, base_url: str) -> str | None:
        # 1. Product-specific image containers
        product_selectors = [
            ".product-image img",
            ".product-gallery img",
            ".product-detail img",
            ".product-details img",
            ".product-img img",
            ".details-product-image img",
            ".woocommerce-product-gallery img",
            "[class*='product-image'] img",
            "[class*='product-gallery'] img",
            "[class*='product-detail'] img",
        ]

        for selector in product_selectors:
            try:
                images = page.locator(selector)
                count = await images.count()

                for i in range(min(count, 5)):
                    image = images.nth(i)
                    result = await self._validate_product_image(image, base_url)

                    if result:
                        print("ONLINE SAATHI PRODUCT IMAGE:", result)
                        return result

            except Exception:
                continue

        # 2. Search images near H1 (bounded to max 3 levels)
        try:
            h1 = page.locator("h1").first
            if await h1.count() > 0:
                container = h1
                for _ in range(3):
                    container = container.locator("..")
                    images = container.locator("img")
                    count = await images.count()

                    for i in range(min(count, 5)):
                        result = await self._validate_product_image(images.nth(i), base_url)
                        if result:
                            print("ONLINE SAATHI PRODUCT IMAGE:", result)
                            return result

        except Exception:
            pass

        # 3. JSON-LD product image
        try:
            scripts = await page.locator(
                'script[type="application/ld+json"]'
            ).all_text_contents()

            for script in scripts:
                try:
                    data = json.loads(script)
                except Exception:
                    continue

                image_url = self._find_image_in_json(data)
                if not image_url:
                    continue

                norm_url = self.normalize_url(base_url, image_url)
                if not norm_url:
                    continue

                image_lower = norm_url.lower()
                blocked = [
                    "logo",
                    "onlinesathi-",
                    "placeholder",
                    "favicon",
                    "icon",
                    "banner",
                    "header",
                    "footer",
                ]

                if any(word in image_lower for word in blocked):
                    continue

                if norm_url.startswith(("http://", "https://")):
                    print("ONLINE SAATHI IMAGE FROM JSON-LD:", norm_url)
                    return norm_url

        except Exception:
            pass

        print("ONLINE SAATHI PRODUCT IMAGE: None")
        return None

    # ==========================================================
    # SCRAPE PRODUCT
    # ==========================================================

    async def scrape_product(self, url: str) -> dict:
        playwright, browser = await create_browser()

        try:
            page = await browser.new_page()

            response = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=60000,
            )

            if response:
                if response.status in (404, 410):
                    raise ProductRemovedError("OnlineSaathi product page no longer exists")
                if response.status >= 400:
                    raise ValueError(f"OnlineSaathi returned HTTP {response.status}")

            try:
                await page.wait_for_selector(
                    "h1, .price, [class*='price']",
                    state="attached",
                    timeout=5000,
                )
            except Exception:
                try:
                    await page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass

            name = await self._get_product_name(page)
            price = await self._get_product_price(page)
            image_url = await self._get_product_image(page, url)

            print("\n==================================================")
            print("PRODUCT TRACKING")
            print("URL:", url)
            print("NAME:", name)
            print("PRICE:", price)
            print("IMAGE:", image_url)
            print("==================================================\n")

            return {
                "name": name,
                "price": price,
                "image_url": image_url,
            }

        finally:
            await browser.close()
            await playwright.stop()

    # ==========================================================
    # SCRAPE PRICE ONLY
    # ==========================================================

    async def scrape_price(self, url: str) -> float:
        playwright, browser = await create_browser()

        try:
            page = await browser.new_page()

            response = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=60000,
            )

            if response:
                if response.status in (404, 410):
                    raise ProductRemovedError("OnlineSaathi product page no longer exists")
                if response.status >= 400:
                    raise ValueError(f"OnlineSaathi returned HTTP {response.status}")

            try:
                await page.wait_for_selector(
                    ".price, [class*='price']",
                    state="attached",
                    timeout=5000,
                )
            except Exception:
                try:
                    await page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass

            return await self._get_product_price(page)

        finally:
            await browser.close()
            await playwright.stop()
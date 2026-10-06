"""
My Choice Ecom product scraper.

HTTP-first with a Playwright fallback.

Supported site:
    https://my-choice-ecom.vercel.app/

Extracts:
    - product name
    - current price
    - image URL
    - availability
"""

import json
import math
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

from app.services.browser import browser_page
from app.services.scrapers.base import BaseScraper
from app.services.scrapers.errors import (
    ProductRemovedError,
    ScrapeUnavailableError,
)


# ============================================================
# HTML DOCUMENT PARSER
# ============================================================


class _Document(HTMLParser):
    """Small HTML parser for scripts, metadata and visible text."""

    def __init__(self):
        super().__init__()

        self.scripts: list[str] = []
        self.meta: dict[str, str] = {}
        self.text: list[str] = []

        self._script: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrs_dict = dict(attrs)

        if tag == "script":
            self._script = []

        if tag == "meta":
            key = (
                attrs_dict.get("property")
                or attrs_dict.get("name")
            )

            content = attrs_dict.get("content")

            if key and content:
                self.meta[key.lower()] = content

    def handle_endtag(self, tag):
        if (
            tag.lower() == "script"
            and self._script is not None
        ):
            self.scripts.append(
                "".join(self._script)
            )

            self._script = None

    def handle_data(self, data):
        if self._script is not None:
            self._script.append(data)
        else:
            self.text.append(data)


# ============================================================
# PRICE HELPERS
# ============================================================


def _price(value) -> float | None:
    """
    Extract one positive numeric price.

    Supports examples:
        Rs 2,999
        Rs. 2999
        NPR 2999
        रू 2999
        2999
    """

    if isinstance(value, dict):
        value = (
            value.get("value")
            or value.get("amount")
            or value.get("price")
        )

    if isinstance(value, (int, float)) and not isinstance(
        value, bool
    ):
        number = float(value)

        if math.isfinite(number) and number > 0:
            return number

        return None

    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    text = text.replace(",", "")

    match = re.search(
        r"(?:Rs\.?|NPR|रू)?\s*(\d+(?:\.\d+)?)",
        text,
        flags=re.IGNORECASE,
    )

    if not match:
        return None

    try:
        number = float(match.group(1))
    except (
        TypeError,
        ValueError,
        OverflowError,
    ):
        return None

    if not math.isfinite(number) or number <= 0:
        return None

    return number


# ============================================================
# JSON HELPERS
# ============================================================


def _nodes(value):
    """Yield every dictionary contained in nested JSON."""

    if isinstance(value, dict):
        yield value

        for child in value.values():
            yield from _nodes(child)

    elif isinstance(value, list):
        for child in value:
            yield from _nodes(child)


def _image_url(
    value,
    base_url: str,
) -> str | None:
    """Normalize an image URL."""

    if isinstance(value, list):
        value = value[0] if value else None

    if isinstance(value, dict):
        value = (
            value.get("url")
            or value.get("src")
        )

    if not isinstance(value, str):
        return None

    value = value.strip()

    if not value:
        return None

    try:
        return BaseScraper.normalize_url(
            base_url,
            value,
        )
    except Exception:
        return None


def _extract_json_objects(
    script: str,
) -> list:
    """
    Extract JSON objects from common embedded scripts.
    """

    results = []

    if not isinstance(script, str):
        return results

    script = script.strip()

    if not script:
        return results

    decoder = json.JSONDecoder()

    # --------------------------------------------------------
    # Entire script is JSON
    # --------------------------------------------------------

    try:
        value, _ = decoder.raw_decode(script)
        results.append(value)
    except (ValueError, TypeError):
        pass

    # --------------------------------------------------------
    # Common JavaScript assignments
    # --------------------------------------------------------

    patterns = (
        r"window\.__INITIAL_STATE__\s*=\s*",
        r"window\.__INITIAL_DATA__\s*=\s*",
        r"window\.__NEXT_DATA__\s*=\s*",
        r"__INITIAL_STATE__\s*=\s*",
        r"__INITIAL_DATA__\s*=\s*",
    )

    for pattern in patterns:
        try:
            matches = re.finditer(
                pattern,
                script,
                flags=re.IGNORECASE,
            )
        except re.error:
            continue

        for match in matches:
            start = match.end()

            try:
                value, _ = decoder.raw_decode(
                    script[start:].lstrip()
                )

                results.append(value)

            except (
                ValueError,
                TypeError,
            ):
                continue

    return results


# ============================================================
# PAGE DETECTION
# ============================================================


def _is_antibot_page(text: str) -> bool:
    """Detect common verification/block pages."""

    text = text.lower()

    indicators = (
        "verify you are human",
        "slide to verify",
        "captcha",
        "access denied",
        "security verification",
        "robot check",
        "checking your browser",
        "unusual traffic",
        "verify your identity",
        "security check",
    )

    return any(
        item in text
        for item in indicators
    )


def _is_removed_page(text: str) -> bool:
    """Detect common removed/not-found pages."""

    text = text.lower()

    indicators = (
        "product not found",
        "page not found",
        "product is no longer available",
        "product is unavailable",
        "this product is unavailable",
        "sorry, this product is not available",
        "404",
    )

    return any(
        item in text
        for item in indicators
    )


# ============================================================
# AVAILABILITY
# ============================================================


def _availability_from_text(text: str) -> str:
    """Determine product availability from page text."""

    text = text.lower()

    out_of_stock_indicators = (
        "out of stock",
        "out-of-stock",
        "sold out",
        "unavailable",
        "currently unavailable",
    )

    if any(
        item in text
        for item in out_of_stock_indicators
    ):
        return "out_of_stock"

    return "available"


# ============================================================
# PRODUCT PARSER
# ============================================================


def parse_product(
    html: str,
    url: str,
) -> dict | None:
    """
    Extract product information from My Choice Ecom HTML.
    """

    if not isinstance(html, str) or not html.strip():
        raise ScrapeUnavailableError(
            "My Choice returned an empty product page."
        )

    document = _Document()

    try:
        document.feed(html)
        document.close()
    except Exception as exc:
        raise ScrapeUnavailableError(
            "My Choice returned an invalid product page."
        ) from exc

    visible_text = " ".join(
        document.text
    ).strip()

    # --------------------------------------------------------
    # Anti-bot
    # --------------------------------------------------------

    if _is_antibot_page(visible_text):
        raise ScrapeUnavailableError(
            "My Choice is temporarily asking for verification."
        )

    # --------------------------------------------------------
    # Removed product
    # --------------------------------------------------------

    if _is_removed_page(visible_text):
        raise ProductRemovedError(
            "This product has been removed from My Choice."
        )

    # --------------------------------------------------------
    # Extract JSON
    # --------------------------------------------------------

    payloads = []

    for script in document.scripts:
        if not script.strip():
            continue

        payloads.extend(
            _extract_json_objects(script)
        )

    # ========================================================
    # JSON-LD Product
    # ========================================================

    for payload in payloads:

        for node in _nodes(payload):

            product_type = node.get("@type")

            is_product = (
                product_type == "Product"
                or (
                    isinstance(product_type, list)
                    and "Product" in product_type
                )
            )

            if not is_product:
                continue

            name = node.get("name")

            if not name:
                continue

            # ------------------------------------------------
            # Offers
            # ------------------------------------------------

            offers = node.get("offers")

            if isinstance(offers, dict):
                offers = [offers]

            if not isinstance(offers, list):
                offers = []

            for offer in offers:

                if not isinstance(offer, dict):
                    continue

                price = _price(
                    offer.get("price")
                    or offer.get("lowPrice")
                )

                if price is None:
                    continue

                currency = str(
                    offer.get(
                        "priceCurrency",
                        "NPR",
                    )
                ).upper()

                # My Choice is expected to use NPR.
                # Do not accidentally return another currency.
                if currency not in ("NPR", "RS", "NPR"):
                    continue

                image = (
                    node.get("image")
                    or document.meta.get("og:image")
                )

                availability_text = str(
                    offer.get(
                        "availability",
                        "",
                    )
                ).lower()

                if (
                    "outofstock" in availability_text
                    or "discontinued" in availability_text
                ):
                    availability = "out_of_stock"
                else:
                    availability = (
                        _availability_from_text(
                            visible_text
                        )
                    )

                return {
                    "name": str(name).strip(),
                    "price": price,
                    "image_url": _image_url(
                        image,
                        url,
                    ),
                    "availability": availability,
                }

    # ========================================================
    # OpenGraph / Meta fallback
    # ========================================================

    og_title = (
        document.meta.get("og:title")
        or document.meta.get(
            "twitter:title"
        )
    )

    og_image = (
        document.meta.get("og:image")
        or document.meta.get(
            "twitter:image"
        )
    )

    og_price = (
        document.meta.get(
            "product:price:amount"
        )
        or document.meta.get(
            "og:price:amount"
        )
    )

    price = _price(og_price)

    if og_title and price:
        return {
            "name": og_title.strip(),
            "price": price,
            "image_url": _image_url(
                og_image,
                url,
            ),
            "availability": _availability_from_text(
                visible_text
            ),
        }

    return None


# ============================================================
# MY CHOICE SCRAPER
# ============================================================


class MyChoiceScraper(BaseScraper):

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    # ========================================================
    # PRICE COMPATIBILITY
    # ========================================================

    @staticmethod
    def clean_price(text: str) -> float:
        """Convert My Choice price text into a positive number."""

        result = _price(text)

        if result is None:
            raise ValueError(
                "Invalid My Choice selling price."
            )

        return result

    # ========================================================
    # HTTP CLIENT
    # ========================================================

    async def _get_client(
        self,
    ) -> httpx.AsyncClient:

        if (
            self._client is None
            or self._client.is_closed
        ):
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    7.0,
                    connect=3.0,
                ),
                follow_redirects=True,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 "
                        "(Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 "
                        "(KHTML, like Gecko) "
                        "Chrome/140.0.0.0 "
                        "Safari/537.36"
                    ),
                    "Accept": (
                        "text/html,"
                        "application/xhtml+xml,"
                        "application/xml;q=0.9,"
                        "image/avif,image/webp,"
                        "*/*;q=0.8"
                    ),
                    "Accept-Language": (
                        "en-US,en;q=0.9"
                    ),
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                },
            )

        return self._client

    # ========================================================
    # CLOSE
    # ========================================================

    async def close(self):

        if self._client is not None:
            try:
                await self._client.aclose()
            finally:
                self._client = None

    # ========================================================
    # HTTP SCRAPE
    # ========================================================

    async def _scrape_http(
        self,
        url: str,
    ) -> dict | None:

        client = await self._get_client()

        try:
            response = await client.get(url)
        except httpx.TimeoutException:
            return None
        except httpx.HTTPError:
            return None

        # ----------------------------------------------------
        # Product removed
        # ----------------------------------------------------

        if response.status_code in (404, 410):
            raise ProductRemovedError(
                "This product has been removed from My Choice."
            )

        # ----------------------------------------------------
        # Anti-bot
        # ----------------------------------------------------

        if response.status_code in (403, 429):
            return None

        # ----------------------------------------------------
        # Server error
        # ----------------------------------------------------

        if response.status_code >= 500:
            return None

        # ----------------------------------------------------
        # Success
        # ----------------------------------------------------

        if response.status_code == 200:

            try:
                return parse_product(
                    response.text,
                    str(response.url),
                )
            except ProductRemovedError:
                raise
            except ScrapeUnavailableError:
                return None

        return None

    # ========================================================
    # BROWSER FALLBACK
    # ========================================================

    async def _scrape_browser(
        self,
        url: str,
    ) -> dict:

        try:

            async with browser_page() as page:

                response = await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=15000,
                )

                # --------------------------------------------
                # HTTP status
                # --------------------------------------------

                if response:

                    if response.status in (
                        404,
                        410,
                    ):
                        raise ProductRemovedError(
                            "This product has been removed "
                            "from My Choice."
                        )

                    if response.status in (
                        403,
                        429,
                    ):
                        raise ScrapeUnavailableError(
                            "My Choice is temporarily "
                            "blocking automated requests."
                        )

                    if response.status >= 500:
                        raise ScrapeUnavailableError(
                            "My Choice is temporarily unavailable."
                        )

                # --------------------------------------------
                # Allow React/Next/Vercel page to render
                # --------------------------------------------

                try:
                    await page.wait_for_load_state(
                        "networkidle",
                        timeout=5000,
                    )
                except Exception:
                    pass

                # --------------------------------------------
                # Body text checks
                # --------------------------------------------

                try:

                    body_text = await page.locator(
                        "body"
                    ).inner_text(
                        timeout=3000
                    )

                    if _is_antibot_page(
                        body_text
                    ):
                        raise ScrapeUnavailableError(
                            "My Choice is temporarily "
                            "asking for verification."
                        )

                    if _is_removed_page(
                        body_text
                    ):
                        raise ProductRemovedError(
                            "This product has been "
                            "removed from My Choice."
                        )

                except (
                    ProductRemovedError,
                    ScrapeUnavailableError,
                ):
                    raise

                except Exception:
                    body_text = ""

                # --------------------------------------------
                # Parse rendered HTML first
                # --------------------------------------------

                html = await page.content()

                try:
                    data = parse_product(
                        html,
                        url,
                    )

                    if data:
                        return data

                except ProductRemovedError:
                    raise

                except ScrapeUnavailableError:
                    pass

                # ====================================================
                # PRICE SELECTORS
                # ====================================================

                price_selectors = (
                    # Generic
                    "[data-testid='product-price']",
                    "[data-testid='price']",

                    # Common ecommerce classes
                    ".product-price",
                    ".product__price",
                    ".price",
                    ".current-price",
                    ".sale-price",

                    # Tailwind/custom React classes
                    "[class*='product-price']",
                    "[class*='current-price']",
                    "[class*='sale-price']",
                    "[class*='price']",
                )

                price = None

                for selector in price_selectors:

                    try:

                        locator = page.locator(
                            selector
                        ).first

                        if await locator.count() == 0:
                            continue

                        text = await locator.text_content(
                            timeout=2000
                        )

                        candidate = _price(text)

                        if candidate is not None:
                            price = candidate
                            break

                    except Exception:
                        continue

                if price is None:
                    raise ScrapeUnavailableError(
                        "My Choice did not return "
                        "a verifiable selling price."
                    )

                # ====================================================
                # PRODUCT NAME
                # ====================================================

                name = None

                name_selectors = (
                    "[data-testid='product-name']",
                    "[data-testid='product-title']",
                    ".product-name",
                    ".product-title",
                    ".product__title",
                    "h1",
                )

                for selector in name_selectors:

                    try:

                        locator = page.locator(
                            selector
                        ).first

                        if await locator.count() == 0:
                            continue

                        text = await locator.text_content(
                            timeout=2000
                        )

                        if text and text.strip():
                            name = text.strip()
                            break

                    except Exception:
                        continue

                # ------------------------------------------------
                # Final name fallback
                # ------------------------------------------------

                if not name:

                    try:
                        name = await page.title()
                    except Exception:
                        name = None

                if not name:
                    raise ScrapeUnavailableError(
                        "My Choice did not return "
                        "a product name."
                    )

                # ====================================================
                # IMAGE
                # ====================================================

                image_url = None

                image_selectors = (
                    "meta[property='og:image']",
                    "meta[name='twitter:image']",
                )

                for selector in image_selectors:

                    try:

                        locator = page.locator(
                            selector
                        ).first

                        if await locator.count() == 0:
                            continue

                        image_url = (
                            await locator.get_attribute(
                                "content"
                            )
                        )

                        if image_url:
                            break

                    except Exception:
                        continue

                # Product image fallback
                if not image_url:

                    image_selectors = (
                        "[data-testid='product-image']",
                        ".product-image img",
                        ".product__image img",
                        "main img",
                        "img",
                    )

                    for selector in image_selectors:

                        try:

                            locator = page.locator(
                                selector
                            ).first

                            if await locator.count() == 0:
                                continue

                            image_url = (
                                await locator.get_attribute(
                                    "src"
                                )
                            )

                            if image_url:
                                break

                        except Exception:
                            continue

                if image_url:

                    image_url = self.normalize_url(
                        url,
                        image_url,
                    )

                # ====================================================
                # AVAILABILITY
                # ====================================================

                availability = (
                    _availability_from_text(
                        body_text
                    )
                )

                return {
                    "name": name,
                    "price": price,
                    "image_url": image_url,
                    "availability": availability,
                }

        except ProductRemovedError:
            raise

        except ScrapeUnavailableError:
            raise

        except Exception as exc:
            raise ScrapeUnavailableError(
                "My Choice could not be reached or "
                "its product price could not be verified."
            ) from exc

    # ========================================================
    # SCRAPE PRODUCT
    # ========================================================

    async def scrape_product(
        self,
        url: str,
    ) -> dict:

        # ----------------------------------------------------
        # 1. HTTP first
        # ----------------------------------------------------

        data = await self._scrape_http(url)

        if data:
            return data

        # ----------------------------------------------------
        # 2. Browser fallback
        # ----------------------------------------------------

        return await self._scrape_browser(url)

    # ========================================================
    # SCRAPE PRICE
    # ========================================================

    async def scrape_price(
        self,
        url: str,
    ) -> float:

        data = await self.scrape_product(url)

        price = _price(
            data.get("price")
        )

        if price is None:
            raise ScrapeUnavailableError(
                "My Choice did not return "
                "a valid product price."
            )

        return price
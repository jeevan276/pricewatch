"""Daraz product scraper.

HTTP-first with a Playwright fallback.

This scraper reads publicly available product-page data.
It does not use a private Daraz API or bypass anti-bot verification.
"""

import json
import math
import re
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlparse

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
    """Small HTML parser used to collect scripts, metadata and text."""

    def __init__(self):
        super().__init__()
        self.scripts: list[str] = []
        self.meta: dict[str, str] = {}
        self.text: list[str] = []
        self._script: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        tag = tag.lower()

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
    """Extract one positive numeric price."""

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

    # Remove thousands separators.
    text = text.replace(",", "")

    # Supported examples:
    # Rs 29999
    # Rs. 29999
    # NPR 29999
    # रू 29999
    # 29999
    match = re.search(
        r"(?:Rs\.?|NPR|रू)?\s*(\d+(?:\.\d+)?)",
        text,
        flags=re.IGNORECASE,
    )

    if not match:
        return None

    try:
        number = float(match.group(1))
    except (TypeError, ValueError, OverflowError):
        return None

    if not math.isfinite(number) or number <= 0:
        return None

    return number


# ============================================================
# JSON HELPERS
# ============================================================


def _nodes(value):
    """Yield every dictionary contained inside nested JSON."""

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
    """Extract JSON objects from common embedded scripts."""

    results = []

    if not isinstance(script, str):
        return results

    script = script.strip()

    if not script:
        return results

    decoder = json.JSONDecoder()

    # --------------------------------------------------------
    # 1. Entire script is JSON
    # --------------------------------------------------------

    try:
        value, _ = decoder.raw_decode(script)
        results.append(value)
    except (ValueError, TypeError):
        pass

    # --------------------------------------------------------
    # 2. Common JavaScript JSON assignments
    # --------------------------------------------------------

    patterns = (
        r"__INIT_DATA__\s*=\s*",
        r"__INITIAL_STATE__\s*=\s*",
        r"app\.run\s*\(\s*",
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
            except (ValueError, TypeError):
                continue

    return results


# ============================================================
# ANTI-BOT / REMOVAL DETECTION
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
    """Detect common removed/not-found product pages."""

    text = text.lower()

    indicators = (
        "this product is no longer available",
        "the product you are looking for does not exist",
        "sorry, this product is not available",
        "product not found",
        "page not found",
        "sorry, the page you requested cannot be found",
    )

    return any(
        item in text
        for item in indicators
    )


# ============================================================
# PRODUCT PARSER
# ============================================================


def parse_product(
    html: str,
    url: str,
) -> dict | None:
    """Extract a verified Daraz product from HTML."""

    if not isinstance(html, str) or not html.strip():
        raise ScrapeUnavailableError(
            "Daraz returned an empty product page."
        )

    document = _Document()

    try:
        document.feed(html)
        document.close()
    except Exception as exc:
        raise ScrapeUnavailableError(
            "Daraz returned an invalid product page."
        ) from exc

    visible_text = " ".join(
        document.text
    ).strip()

    # --------------------------------------------------------
    # Anti-bot page
    # --------------------------------------------------------

    if _is_antibot_page(visible_text):
        raise ScrapeUnavailableError(
            "Daraz is temporarily asking for verification."
        )

    # --------------------------------------------------------
    # Requested SKU
    # --------------------------------------------------------

    parsed_url = urlparse(url)

    sku_match = re.search(
        r"-s(\d+)",
        parsed_url.path,
    )

    query_sku = parse_qs(
        parsed_url.query
    ).get(
        "skuId",
        [None],
    )[0]

    sku = (
        query_sku
        or (
            sku_match.group(1)
            if sku_match
            else None
        )
    )

    # --------------------------------------------------------
    # Extract embedded JSON
    # --------------------------------------------------------

    payloads = []

    for script in document.scripts:
        if not script.strip():
            continue

        payloads.extend(
            _extract_json_objects(script)
        )

    # --------------------------------------------------------
    # Daraz internal product data
    # --------------------------------------------------------

    for payload in payloads:
        for node in _nodes(payload):

            fields = node.get("fields")

            if not isinstance(fields, dict):
                continue

            product = fields.get("product")

            if not isinstance(product, dict):
                product = {}

            sku_infos = fields.get("skuInfos")

            if not isinstance(sku_infos, dict):
                sku_infos = {}

            selected = None

            # ------------------------------------------------
            # Exact requested SKU
            # ------------------------------------------------

            if sku:
                selected = sku_infos.get(
                    str(sku)
                )

                # Never substitute another variant.
                if selected is None:
                    continue

            # ------------------------------------------------
            # Single available variant
            # ------------------------------------------------

            elif len(sku_infos) == 1:
                selected = next(
                    iter(sku_infos.values())
                )

            if not isinstance(selected, dict):
                continue

            # ------------------------------------------------
            # Price
            # ------------------------------------------------

            price_data = selected.get("price")

            price = None

            if isinstance(price_data, dict):
                price = (
                    _price(
                        price_data.get(
                            "salePrice"
                        )
                    )
                    or _price(
                        price_data.get(
                            "discountPrice"
                        )
                    )
                    or _price(
                        price_data.get(
                            "price"
                        )
                    )
                )
            else:
                price = _price(price_data)

            # ------------------------------------------------
            # Product name
            # ------------------------------------------------

            name = (
                product.get("title")
                or product.get("name")
                or node.get("title")
                or node.get("name")
            )

            if not isinstance(name, str):
                continue

            name = name.strip()

            if not name or price is None:
                continue

            # ------------------------------------------------
            # Image
            # ------------------------------------------------

            image_data = (
                fields.get("image")
                or fields.get("images")
                or product.get("image")
                or product.get("images")
            )

            image = image_data

            if isinstance(image_data, dict):
                image = (
                    image_data.get("image")
                    or image_data.get("url")
                    or image_data.get("src")
                )

            if not image:
                image = document.meta.get(
                    "og:image"
                )

            # ------------------------------------------------
            # Availability
            # ------------------------------------------------

            stock = selected.get("stock")

            if isinstance(stock, dict):
                stock = (
                    stock.get("value")
                    or stock.get("quantity")
                )

            availability = "available"

            if stock is not None:
                try:
                    if int(stock) <= 0:
                        availability = "out_of_stock"
                except (
                    TypeError,
                    ValueError,
                ):
                    pass

            return {
                "name": name,
                "price": price,
                "image_url": _image_url(
                    image,
                    url,
                ),
                "availability": availability,
            }

    # ========================================================
    # JSON-LD STRUCTURED PRODUCT DATA
    # ========================================================

    for payload in payloads:
        for node in _nodes(payload):

            product_type = node.get(
                "@type"
            )

            is_product = (
                product_type == "Product"
                or (
                    isinstance(
                        product_type,
                        list,
                    )
                    and "Product"
                    in product_type
                )
            )

            if not is_product:
                continue

            node_sku = str(
                node.get(
                    "sku",
                    "",
                )
            ).strip()

            offers = node.get(
                "offers"
            ) or []

            if isinstance(offers, dict):
                offers = [offers]

            if not isinstance(
                offers,
                list,
            ):
                continue

            for offer in offers:

                if not isinstance(
                    offer,
                    dict,
                ):
                    continue

                offer_sku = str(
                    offer.get(
                        "sku",
                        "",
                    )
                ).strip()

                # If requested URL contains SKU,
                # structured data must match it.
                if sku and sku not in (
                    node_sku,
                    offer_sku,
                ):
                    continue

                currency = str(
                    offer.get(
                        "priceCurrency",
                        "NPR",
                    )
                ).upper()

                if currency != "NPR":
                    continue

                price = _price(
                    offer.get("price")
                )

                name = node.get("name")

                if price is None or not name:
                    continue

                image = (
                    node.get("image")
                    or document.meta.get(
                        "og:image"
                    )
                )

                availability_text = str(
                    offer.get(
                        "availability",
                        "",
                    )
                )

                availability = (
                    "out_of_stock"
                    if availability_text.endswith(
                        (
                            "OutOfStock",
                            "Discontinued",
                        )
                    )
                    else "available"
                )

                return {
                    "name": str(
                        name
                    ).strip(),
                    "price": price,
                    "image_url": _image_url(
                        image,
                        url,
                    ),
                    "availability": availability,
                }

    # ========================================================
    # OPEN GRAPH FALLBACK
    # ========================================================

    og_title = document.meta.get(
        "og:title"
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
                document.meta.get(
                    "og:image"
                ),
                url,
            ),
            "availability": "available",
        }

    # ========================================================
    # REMOVED PRODUCT
    # ========================================================

    if _is_removed_page(
        visible_text
    ):
        raise ProductRemovedError(
            "This product has been removed from Daraz."
        )

    return None


# ============================================================
# DARAZ SCRAPER
# ============================================================


class DarazScraper(BaseScraper):

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    # ========================================================
    # PRICE COMPATIBILITY
    # ========================================================

    @staticmethod
    def clean_price(text: str) -> float:
        """Convert a Daraz price string into a positive number."""

        result = _price(text)

        if result is None:
            raise ValueError(
                "Invalid Daraz selling price."
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
                follow_redirects=False,
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

        current_url = url

        for _ in range(4):

            try:
                response = await client.get(
                    current_url
                )

            except httpx.TimeoutException:
                return None

            except httpx.HTTPError:
                return None

            # ------------------------------------------------
            # Redirect
            # ------------------------------------------------

            if response.is_redirect:

                location = response.headers.get(
                    "location"
                )

                if not location:
                    return None

                try:
                    next_url = self.normalize_url(
                        current_url,
                        location,
                    )
                except Exception:
                    return None

                host = (
                    urlparse(
                        next_url
                    ).hostname
                    or ""
                ).lower()

                if host.startswith("www."):
                    host = host[4:]

                if host != "daraz.com.np":
                    raise ScrapeUnavailableError(
                        "Daraz redirected outside its product page."
                    )

                current_url = next_url
                continue

            # ------------------------------------------------
            # Removed
            # ------------------------------------------------

            if response.status_code in (
                404,
                410,
            ):
                raise ProductRemovedError(
                    "This product has been removed from Daraz."
                )

            # ------------------------------------------------
            # Anti-bot HTTP response
            # ------------------------------------------------

            if response.status_code in (
                403,
                429,
            ):
                return None

            # ------------------------------------------------
            # Server error
            # ------------------------------------------------

            if response.status_code >= 500:
                return None

            # ------------------------------------------------
            # Successful response
            # ------------------------------------------------

            if response.status_code == 200:

                try:
                    return parse_product(
                        response.text,
                        current_url,
                    )

                except ProductRemovedError:
                    raise

                except ScrapeUnavailableError:
                    # Let browser fallback handle it.
                    return None

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
                            "This product has been removed from Daraz."
                        )

                    if response.status in (
                        403,
                        429,
                    ):
                        raise ScrapeUnavailableError(
                            "Daraz is temporarily blocking automated requests."
                        )

                    if response.status >= 500:
                        raise ScrapeUnavailableError(
                            "Daraz is temporarily unavailable."
                        )

                # --------------------------------------------
                # Give the page a short chance to render.
                # --------------------------------------------

                try:
                    await page.wait_for_load_state(
                        "networkidle",
                        timeout=3000,
                    )
                except Exception:
                    pass

                # --------------------------------------------
                # Check rendered page for verification
                # --------------------------------------------

                try:
                    body_text = await page.locator(
                        "body"
                    ).inner_text(
                        timeout=2000
                    )

                    if _is_antibot_page(
                        body_text
                    ):
                        raise ScrapeUnavailableError(
                            "Daraz is temporarily asking for verification."
                        )

                    if _is_removed_page(
                        body_text
                    ):
                        raise ProductRemovedError(
                            "This product has been removed from Daraz."
                        )

                except (
                    ProductRemovedError,
                    ScrapeUnavailableError,
                ):
                    raise

                except Exception:
                    pass

                # --------------------------------------------
                # Parse rendered HTML
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

                # --------------------------------------------
                # Common price selectors
                # --------------------------------------------

                price_selectors = (
                    ".pdp-price_type_normal",
                    ".pdp-product-price",
                    "[class*='pdp-price']",
                    "[class*='product-price']",
                )

                for selector in price_selectors:

                    try:
                        locator = page.locator(
                            selector
                        ).first

                        if await locator.count() == 0:
                            continue

                        text = await locator.text_content(
                            timeout=2500
                        )

                        price = _price(text)

                        if price is None:
                            continue

                        # ------------------------------------
                        # Product name
                        # ------------------------------------

                        name = None

                        for name_selector in (
                            ".pdp-product-title",
                            "h1",
                        ):
                            try:
                                name_locator = page.locator(
                                    name_selector
                                ).first

                                if (
                                    await name_locator.count()
                                    == 0
                                ):
                                    continue

                                name = await name_locator.text_content(
                                    timeout=1500
                                )

                                if (
                                    name
                                    and name.strip()
                                ):
                                    break

                            except Exception:
                                continue

                        if not name:
                            name = await page.title()

                        if not name or not name.strip():
                            continue

                        # ------------------------------------
                        # Image
                        # ------------------------------------

                        image_url = None

                        try:
                            image_locator = page.locator(
                                'meta[property="og:image"]'
                            ).first

                            if await image_locator.count():
                                image_url = (
                                    await image_locator.get_attribute(
                                        "content"
                                    )
                                )

                        except Exception:
                            pass

                        if image_url:
                            image_url = self.normalize_url(
                                url,
                                image_url,
                            )

                        # ------------------------------------
                        # Availability
                        # ------------------------------------

                        availability = "available"

                        try:
                            body = await page.locator(
                                "body"
                            ).inner_text(
                                timeout=1500
                            )

                            if (
                                "out of stock"
                                in body.lower()
                            ):
                                availability = (
                                    "out_of_stock"
                                )

                        except Exception:
                            pass

                        return {
                            "name": name.strip(),
                            "price": price,
                            "image_url": image_url,
                            "availability": availability,
                        }

                    except Exception:
                        continue

        except ProductRemovedError:
            raise

        except ScrapeUnavailableError:
            raise

        except Exception as exc:
            raise ScrapeUnavailableError(
                "Daraz could not be reached or its product price could not be verified."
            ) from exc

        raise ScrapeUnavailableError(
            "Daraz did not return a verifiable selling price."
        )

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

        data = await self._scrape_http(
            url
        )

        if data:
            return data

        # ----------------------------------------------------
        # 2. Browser fallback
        # ----------------------------------------------------

        return await self._scrape_browser(
            url
        )

    # ========================================================
    # SCRAPE PRICE
    # ========================================================

    async def scrape_price(
        self,
        url: str,
    ) -> float:

        data = await self.scrape_product(
            url
        )

        price = _price(
            data.get("price")
        )

        if price is None:
            raise ScrapeUnavailableError(
                "Daraz did not return a valid product price."
            )

        return price


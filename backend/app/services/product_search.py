import asyncio
import re
from typing import Any, Dict, List, Optional

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)

# ============================================================
# Configuration & Constants
# ============================================================

KNOWN_BRANDS = {
    "apple",
    "samsung",
    "xiaomi",
    "redmi",
    "realme",
    "oneplus",
    "vivo",
    "oppo",
    "poco",
    "motorola",
    "nokia",
    "iqoo",
    "nothing",
}

STOP_WORDS = {
    "phone",
    "mobile",
    "smartphone",
    "price",
    "in",
    "nepal",
    "buy",
    "online",
    "official",
    "brand",
    "new",
    "used",
}

RESOURCE_EXCLUSIONS = {
    "image",
    "stylesheet",
    "font",
    "media",
    "other",
}

VARIANT_KEYWORDS = {
    "pro",
    "max",
    "plus",
    "ultra",
    "fe",
    "lite",
    "mini",
    "note",
}


# ============================================================
# Entity Extraction & Normalization
# ============================================================


def normalize_text(text: Optional[str]) -> str:
    """
    Safely normalizes text:
    - converts to lowercase
    - removes special characters
    - removes extra whitespace
    """

    if not text:
        return ""

    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)

    return " ".join(text.split())


def _extract_product_identity(title: Optional[str]) -> Dict[str, Any]:
    """
    Extracts:
    - brand
    - model
    - RAM
    - storage
    - network
    - variant flags
    - normalized tokens
    """

    normalized = normalize_text(title)

    if not normalized:
        return {
            "brand": None,
            "model": None,
            "ram": None,
            "storage": None,
            "network": None,
            "variants": set(),
            "tokens": set(),
        }

    tokens = set(normalized.split()) - STOP_WORDS

    # --------------------------------------------------------
    # Brand
    # --------------------------------------------------------

    brand = None

    for known_brand in KNOWN_BRANDS:
        if re.search(rf"\b{re.escape(known_brand)}\b", normalized):
            brand = known_brand
            break

    # --------------------------------------------------------
    # RAM
    # Examples:
    # 8GB RAM
    # 8 GB RAM
    # 8GB/128GB
    # 8 GB
    # --------------------------------------------------------

    ram = None

    ram_match = re.search(
        r"\b(\d{1,2})\s*gb\s*(?:ram)?\b",
        normalized,
    )

    if ram_match:
        ram = int(ram_match.group(1))

    # --------------------------------------------------------
    # Storage
    # Examples:
    # 128GB
    # 256 GB
    # 1TB
    # --------------------------------------------------------

    storage = None

    storage_match = re.search(
        r"\b(\d{2,4})\s*(gb|tb)\b",
        normalized,
    )

    if storage_match:
        value = int(storage_match.group(1))
        unit = storage_match.group(2)

        if unit == "tb":
            value *= 1024

        storage = value

    # --------------------------------------------------------
    # Network
    # --------------------------------------------------------

    network = None

    if re.search(r"\b5g\b", normalized):
        network = "5g"

    elif re.search(r"\b4g\b", normalized):
        network = "4g"

    # --------------------------------------------------------
    # Variants
    # --------------------------------------------------------

    variants = {word for word in tokens if word in VARIANT_KEYWORDS}

    # --------------------------------------------------------
    # Model
    #
    # Examples:
    # Redmi Note 13
    # iPhone 15
    # Galaxy A15
    # Xiaomi 14
    # --------------------------------------------------------

    model = None

    model_patterns = [
        r"\b([a-z]\d{1,3}[a-z]?)\b",
        r"\b(\d{1,3}[a-z]?)\b",
    ]

    for pattern in model_patterns:
        model_match = re.search(pattern, normalized)

        if model_match:
            model = model_match.group(1)
            break

    return {
        "brand": brand,
        "model": model,
        "ram": ram,
        "storage": storage,
        "network": network,
        "variants": variants,
        "tokens": tokens,
    }


# ============================================================
# Matching & Conflict Detection
# ============================================================


def _has_product_conflict(
    query_id: Dict[str, Any],
    candidate_id: Dict[str, Any],
) -> bool:
    """
    Detects hard conflicts between query and candidate.
    """

    # Brand conflict
    if (
        query_id["brand"]
        and candidate_id["brand"]
        and query_id["brand"] != candidate_id["brand"]
    ):
        return True

    # Network conflict
    if (
        query_id["network"]
        and candidate_id["network"]
        and query_id["network"] != candidate_id["network"]
    ):
        return True

    # RAM conflict
    if (
        query_id["ram"]
        and candidate_id["ram"]
        and query_id["ram"] != candidate_id["ram"]
    ):
        return True

    # Storage conflict
    if (
        query_id["storage"]
        and candidate_id["storage"]
        and query_id["storage"] != candidate_id["storage"]
    ):
        return True

    # Variant conflict
    query_variants = query_id["variants"]
    candidate_variants = candidate_id["variants"]

    if query_variants or candidate_variants:
        if query_variants != candidate_variants:
            return True

    return False


def _product_match_score(
    query: str,
    candidate_name: str,
) -> float:
    """
    Calculates weighted product match score.

    Token overlap: 0.25
    Model match:   0.25
    Brand match:   0.15
    Variant match: 0.10
    RAM match:     0.10
    Storage match: 0.10
    Network match: 0.05
    """

    if not query or not candidate_name:
        return 0.0

    query_id = _extract_product_identity(query)
    candidate_id = _extract_product_identity(candidate_name)

    # Hard conflict
    if _has_product_conflict(query_id, candidate_id):
        return 0.0

    score = 0.0

    # --------------------------------------------------------
    # Token overlap
    # --------------------------------------------------------

    if query_id["tokens"] and candidate_id["tokens"]:

        intersection = query_id["tokens"].intersection(candidate_id["tokens"])

        token_score = len(intersection) / max(
            len(query_id["tokens"]),
            len(candidate_id["tokens"]),
        )

        score += token_score * 0.25

    # --------------------------------------------------------
    # Model
    # --------------------------------------------------------

    if (
        query_id["model"]
        and candidate_id["model"]
        and query_id["model"] == candidate_id["model"]
    ):
        score += 0.25

    # --------------------------------------------------------
    # Brand
    # --------------------------------------------------------

    if (
        query_id["brand"]
        and candidate_id["brand"]
        and query_id["brand"] == candidate_id["brand"]
    ):
        score += 0.15

    # --------------------------------------------------------
    # Variant
    # --------------------------------------------------------

    if query_id["variants"] and query_id["variants"] == candidate_id["variants"]:
        score += 0.10

    # --------------------------------------------------------
    # RAM
    # --------------------------------------------------------

    if (
        query_id["ram"]
        and candidate_id["ram"]
        and query_id["ram"] == candidate_id["ram"]
    ):
        score += 0.10

    # --------------------------------------------------------
    # Storage
    # --------------------------------------------------------

    if (
        query_id["storage"]
        and candidate_id["storage"]
        and query_id["storage"] == candidate_id["storage"]
    ):
        score += 0.10

    # --------------------------------------------------------
    # Network
    # --------------------------------------------------------

    if (
        query_id["network"]
        and candidate_id["network"]
        and query_id["network"] == candidate_id["network"]
    ):
        score += 0.05

    return round(score, 4)


# ============================================================
# Playwright Helpers
# ============================================================


async def configure_page(page: Page) -> None:
    """
    Blocks unnecessary resources to reduce bandwidth and speed
    up scraping.
    """

    async def handle_route(route, request):
        if request.resource_type in RESOURCE_EXCLUSIONS:
            await route.abort()
        else:
            await route.continue_()

    await page.route("**/*", handle_route)


async def scrape_product_details(
    context: BrowserContext,
    url: str,
) -> Optional[Dict[str, Any]]:
    """
    Scrapes an individual product detail page.
    """

    page = await context.new_page()

    await configure_page(page)

    try:
        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=10000,
        )

        title_el = await page.query_selector("h1, .product-title, .title")

        price_el = await page.query_selector(".price, .product-price, .amount")

        title = await title_el.inner_text() if title_el else None

        price = await price_el.inner_text() if price_el else None

        if not title:
            return None

        return {
            "title": title.strip(),
            "price": price.strip() if price else None,
            "url": url,
        }

    except Exception:
        return None

    finally:
        await page.close()


# ============================================================
# URL Helper
# ============================================================


def make_absolute_url(
    base_url: str,
    url: Optional[str],
) -> Optional[str]:

    if not url:
        return None

    if url.startswith("http"):
        return url

    return f"{base_url.rstrip('/')}/{url.lstrip('/')}"


# ============================================================
# OnlineSaathi
# ============================================================


async def search_onlinesaathi(
    context: BrowserContext,
    query: str,
    max_candidates: int = 3,
) -> List[Dict[str, Any]]:

    page = await context.new_page()

    await configure_page(page)

    results: List[Dict[str, Any]] = []

    try:
        search_query = re.sub(
            r"\s+",
            "+",
            query.strip(),
        )

        search_url = f"https://onlinesaathi.com/search?q={search_query}"

        await page.goto(
            search_url,
            wait_until="domcontentloaded",
            timeout=12000,
        )

        items = await page.query_selector_all(".product-card, .search-result-item")

        candidate_urls: List[str] = []

        for item in items[:max_candidates]:

            link_el = await item.query_selector("a")

            title_el = await item.query_selector(".title, .product-name")

            if not link_el or not title_el:
                continue

            url = await link_el.get_attribute("href")
            title = await title_el.inner_text()

            initial_score = _product_match_score(
                query,
                title,
            )

            if initial_score >= 0.40 and url:

                full_url = make_absolute_url(
                    "https://onlinesaathi.com",
                    url,
                )

                if full_url:
                    candidate_urls.append(full_url)

        scraped_data = await asyncio.gather(
            *[scrape_product_details(context, url) for url in candidate_urls],
            return_exceptions=True,
        )

        for detail in scraped_data:

            if not isinstance(detail, dict):
                continue

            if not detail.get("title"):
                continue

            final_score = _product_match_score(
                query,
                detail["title"],
            )

            if final_score >= 0.65:

                detail["match_score"] = final_score
                detail["source"] = "OnlineSaathi"

                results.append(detail)

    except Exception:
        pass

    finally:
        await page.close()

    return results


# ============================================================
# HamroBazaar
# ============================================================


async def search_hamrobazar(
    context: BrowserContext,
    query: str,
    max_candidates: int = 3,
) -> List[Dict[str, Any]]:

    page = await context.new_page()

    await configure_page(page)

    results: List[Dict[str, Any]] = []

    try:
        search_query = re.sub(
            r"\s+",
            "+",
            query.strip(),
        )

        search_url = "https://hamrobazaar.com/search/product" f"?q={search_query}"

        await page.goto(
            search_url,
            wait_until="domcontentloaded",
            timeout=12000,
        )

        items = await page.query_selector_all(".card-product, .product-list-item")

        candidate_urls: List[str] = []

        for item in items[:max_candidates]:

            link_el = await item.query_selector("a")

            title_el = await item.query_selector(".product-title, h2")

            if not link_el or not title_el:
                continue

            url = await link_el.get_attribute("href")
            title = await title_el.inner_text()

            initial_score = _product_match_score(
                query,
                title,
            )

            if initial_score >= 0.40 and url:

                full_url = make_absolute_url(
                    "https://hamrobazaar.com",
                    url,
                )

                if full_url:
                    candidate_urls.append(full_url)

        scraped_data = await asyncio.gather(
            *[scrape_product_details(context, url) for url in candidate_urls],
            return_exceptions=True,
        )

        for detail in scraped_data:

            if not isinstance(detail, dict):
                continue

            if not detail.get("title"):
                continue

            final_score = _product_match_score(
                query,
                detail["title"],
            )

            if final_score >= 0.65:

                detail["match_score"] = final_score
                detail["source"] = "HamroBazaar"

                results.append(detail)

    except Exception:
        pass

    finally:
        await page.close()

    return results


# ============================================================
# MyChoice
# ============================================================


async def search_mychoice(
    context: BrowserContext,
    query: str,
    max_candidates: int = 3,
) -> List[Dict[str, Any]]:
    """
    Searches MyChoice and verifies candidate products.

    IMPORTANT:
    MyChoice selectors may change depending on the current
    website implementation. Keep selectors here isolated so
    they can be updated without affecting the matching engine.
    """

    page = await context.new_page()

    await configure_page(page)

    results: List[Dict[str, Any]] = []

    try:
        search_query = re.sub(
            r"\s+",
            "+",
            query.strip(),
        )

        # Update this URL if MyChoice uses a different
        # search endpoint.
        search_url = f"https://my-choice-ecom.vercel.app/search?q={search_query}"

        await page.goto(
            search_url,
            wait_until="domcontentloaded",
            timeout=12000,
        )

        # ----------------------------------------------------
        # MyChoice search-result selectors
        # ----------------------------------------------------
        #
        # Keep these selectors centralized.
        # If MyChoice changes its frontend, only this section
        # needs modification.
        #
        items = await page.query_selector_all(
            ".product-card, " ".product-item, " ".search-result-item, " ".product"
        )

        candidate_urls: List[str] = []

        for item in items[:max_candidates]:

            link_el = await item.query_selector("a[href]")

            title_el = await item.query_selector(
                ".title, " ".product-title, " ".product-name, " "h2, " "h3"
            )

            if not link_el or not title_el:
                continue

            url = await link_el.get_attribute("href")
            title = await title_el.inner_text()

            initial_score = _product_match_score(
                query,
                title,
            )

            if initial_score < 0.40:
                continue

            if not url:
                continue

            full_url = make_absolute_url(
                "https://my-choice-ecom.vercel.app",
                url,
            )

            if full_url:
                candidate_urls.append(full_url)

        # ----------------------------------------------------
        # Verify detail pages concurrently
        # ----------------------------------------------------

        scraped_data = await asyncio.gather(
            *[
                scrape_product_details(
                    context,
                    url,
                )
                for url in candidate_urls
            ],
            return_exceptions=True,
        )

        for detail in scraped_data:

            if not isinstance(detail, dict):
                continue

            if not detail.get("title"):
                continue

            final_score = _product_match_score(
                query,
                detail["title"],
            )

            if final_score >= 0.65:

                detail["match_score"] = final_score
                detail["source"] = "MyChoice"

                results.append(detail)

    except Exception:
        pass

    finally:
        await page.close()

    return results


# ============================================================
# Main Product Search
# ============================================================


async def search_products(
    query: str,
    max_candidates: int = 3,
) -> List[Dict[str, Any]]:
    """
    Searches across:

    1. OnlineSaathi
    2. HamroBazaar
    3. MyChoice

    All three sources run concurrently.
    """

    if not query or not query.strip():
        return []

    async with async_playwright() as p:

        browser: Browser = await p.chromium.launch(headless=True)

        context: BrowserContext = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/115.0.0.0 "
                "Safari/537.36"
            )
        )

        try:

            (
                results_saathi,
                results_hamro,
                results_mychoice,
            ) = await asyncio.gather(
                search_onlinesaathi(
                    context,
                    query,
                    max_candidates=max_candidates,
                ),
                search_hamrobazar(
                    context,
                    query,
                    max_candidates=max_candidates,
                ),
                search_mychoice(
                    context,
                    query,
                    max_candidates=max_candidates,
                ),
                return_exceptions=True,
            )

            all_results: List[Dict[str, Any]] = []

            if isinstance(results_saathi, list):
                all_results.extend(results_saathi)

            if isinstance(results_hamro, list):
                all_results.extend(results_hamro)

            if isinstance(results_mychoice, list):
                all_results.extend(results_mychoice)

            # Highest match score first
            all_results.sort(
                key=lambda item: item.get(
                    "match_score",
                    0.0,
                ),
                reverse=True,
            )

            return all_results

        finally:

            await context.close()
            await browser.close()

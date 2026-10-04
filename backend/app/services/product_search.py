import asyncio
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

# --- Configuration & Constants ---
KNOWN_BRANDS = {
    "apple", "samsung", "xiaomi", "redmi", "realme", "oneplus", 
    "vivo", "oppo", "poco", "motorola", "nokia", "iqoo", "nothing"
}

STOP_WORDS = {
    "phone", "mobile", "smartphone", "price", "in", "nepal", 
    "buy", "online", "official", "brand", "new", "used"
}

RESOURCE_EXCLUSIONS = {"image", "stylesheet", "font", "media", "other"}


# --- Entity Extraction & Normalization ---

def normalize_text(text: Optional[str]) -> str:
    """Safely normalizes input text to lower case and removes special characters."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return " ".join(text.split())


def _extract_product_identity(title: Optional[str]) -> Dict[str, Any]:
    """
    Extracts brand, model, RAM, storage, network type, and variant flags from a product title.
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
            "tokens": set()
        }

    tokens = set(normalized.split()) - STOP_WORDS

    # Extract Brand
    brand = None
    for b in KNOWN_BRANDS:
        if re.search(rf"\b{b}\b", normalized):
            brand = b
            break

    # Extract RAM (e.g., "8gb ram", "8 gb ram", "8gb/128gb")
    ram = None
    ram_match = re.search(r"\b(\d{1,2})\s*(?:gb)?\s*(?:ram|\/)", normalized)
    if ram_match:
        ram = int(ram_match.group(1))

    # Extract Storage (e.g., "128gb", "256 gb rom", "1tb")
    storage = None
    storage_match = re.search(r"\b(\d{2,4})\s*(?:gb|tb)\b", normalized)
    if storage_match:
        val = int(storage_match.group(1))
        # Convert TB to GB for uniform matching
        if "tb" in storage_match.group(0):
            val *= 1024
        storage = val

    # Extract Network (4G vs 5G)
    network = None
    if re.search(r"\b5g\b", normalized):
        network = "5g"
    elif re.search(r"\b4g\b", normalized):
        network = "4g"

    # Extract Variant Tagging
    variant_keywords = {"pro", "max", "plus", "ultra", "fe", "lite", "mini", "note"}
    variants = {word for word in tokens if word in variant_keywords}

    # Model Number / Series identification
    model_match = re.search(r"\b([a-z]\d{1,3}[a-z]?|\d{1,2}[a-z]?)\b", normalized)
    model = model_match.group(1) if model_match else None

    return {
        "brand": brand,
        "model": model,
        "ram": ram,
        "storage": storage,
        "network": network,
        "variants": variants,
        "tokens": tokens
    }


# --- Matching & Conflict Detection ---

def _has_product_conflict(query_id: Dict[str, Any], candidate_id: Dict[str, Any]) -> bool:
    """
    Checks for hard disqualifying conflicts between query and candidate product entities.
    """
    # Brand conflict
    if query_id["brand"] and candidate_id["brand"] and query_id["brand"] != candidate_id["brand"]:
        return True

    # Network conflict (e.g., query explicitly asks for 5G, candidate is 4G)
    if query_id["network"] and candidate_id["network"] and query_id["network"] != candidate_id["network"]:
        return True

    # Hardware specs conflict
    if query_id["ram"] and candidate_id["ram"] and query_id["ram"] != candidate_id["ram"]:
        return True
    if query_id["storage"] and candidate_id["storage"] and query_id["storage"] != candidate_id["storage"]:
        return True

    # Variant conflict (e.g., Pro vs non-Pro)
    query_vars = query_id["variants"]
    cand_vars = candidate_id["variants"]
    if query_vars or cand_vars:
        if query_vars != cand_vars:
            return True

    return False


def _product_match_score(query: str, candidate_name: str) -> float:
    """
    Calculates weighted match score between query and candidate title.
    Weight Distribution:
      - Token Overlap: 0.25
      - Model Match:   0.25
      - Brand Match:   0.15
      - Variant Match: 0.10
      - RAM Match:     0.10
      - Storage Match: 0.10
      - Network Match: 0.05
    """
    if not query or not candidate_name:
        return 0.0

    q_id = _extract_product_identity(query)
    c_id = _extract_product_identity(candidate_name)

    # Disqualify early on hard conflict
    if _has_product_conflict(q_id, c_id):
        return 0.0

    score = 0.0

    # Token overlap score
    if q_id["tokens"] and c_id["tokens"]:
        intersection = q_id["tokens"].intersection(c_id["tokens"])
        token_score = len(intersection) / max(len(q_id["tokens"]), len(c_id["tokens"]))
        score += token_score * 0.25

    # Model match
    if q_id["model"] and c_id["model"] and q_id["model"] == c_id["model"]:
        score += 0.25

    # Brand match
    if q_id["brand"] and c_id["brand"] and q_id["brand"] == c_id["brand"]:
        score += 0.15

    # Variant match
    if q_id["variants"] == c_id["variants"] and q_id["variants"]:
        score += 0.10

    # RAM match
    if q_id["ram"] and c_id["ram"] and q_id["ram"] == c_id["ram"]:
        score += 0.10

    # Storage match
    if q_id["storage"] and c_id["storage"] and q_id["storage"] == c_id["storage"]:
        score += 0.10

    # Network match
    if q_id["network"] and c_id["network"] and q_id["network"] == c_id["network"]:
        score += 0.05

    return round(score, 4)


# --- Playwright Browser Automation & Scraping ---

async def configure_page(page: Page) -> None:
    """Intercepts and blocks unnecessary network requests to save bandwidth and execution time."""
    await page.route(
        "**/*",
        lambda route, req: route.abort() if req.resource_type in RESOURCE_EXCLUSIONS else route.continue_()
    )


async def scrape_product_details(context: BrowserContext, url: str) -> Optional[Dict[str, Any]]:
    """Scrapes individual product detail page with route optimizations."""
    page = await context.new_page()
    await configure_page(page)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=10000)
        title_el = await page.query_selector("h1, .product-title, .title")
        price_el = await page.query_selector(".price, .product-price, .amount")

        title = await title_el.inner_text() if title_el else None
        price = await price_el.inner_text() if price_el else None

        if not title:
            return None

        return {
            "title": title.strip(),
            "price": price.strip() if price else None,
            "url": url
        }
    except Exception:
        return None
    finally:
        await page.close()


async def search_onlinesaathi(context: BrowserContext, query: str, max_candidates: int = 3) -> List[Dict[str, Any]]:
    """Searches OnlineSaathi concurrently and returns verified candidate products."""
    page = await context.new_page()
    await configure_page(page)
    results = []
    try:
        search_url = f"https://onlinesaathi.com/search?q={re.sub(r'\\s+', '+', query)}"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=12000)

        items = await page.query_selector_all(".product-card, .search-result-item")
        candidate_urls = []

        for item in items[:max_candidates]:
            link_el = await item.query_selector("a")
            title_el = await item.query_selector(".title, .product-name")
            
            if link_el and title_el:
                url = await link_el.get_attribute("href")
                title = await title_el.inner_text()
                initial_score = _product_match_score(query, title)
                if initial_score >= 0.40 and url:
                    full_url = url if url.startswith("http") else f"https://onlinesaathi.com{url}"
                    candidate_urls.append(full_url)

        # Scrape detail pages concurrently
        scraped_data = await asyncio.gather(
            *[scrape_product_details(context, u) for u in candidate_urls],
            return_exceptions=True
        )

        for detail in scraped_data:
            if isinstance(detail, dict) and detail.get("title"):
                final_score = _product_match_score(query, detail["title"])
                if final_score >= 0.65:
                    detail["match_score"] = final_score
                    detail["source"] = "OnlineSaathi"
                    results.append(detail)

    except Exception:
        pass
    finally:
        await page.close()

    return results


async def search_hamrobazar(context: BrowserContext, query: str, max_candidates: int = 3) -> List[Dict[str, Any]]:
    """Searches HamroBazaar concurrently and returns verified candidate products."""
    page = await context.new_page()
    await configure_page(page)
    results = []
    try:
        search_url = f"https://hamrobazaar.com/search/product?q={re.sub(r'\\s+', '+', query)}"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=12000)

        items = await page.query_selector_all(".card-product, .product-list-item")
        candidate_urls = []

        for item in items[:max_candidates]:
            link_el = await item.query_selector("a")
            title_el = await item.query_selector(".product-title, h2")
            
            if link_el and title_el:
                url = await link_el.get_attribute("href")
                title = await title_el.inner_text()
                initial_score = _product_match_score(query, title)
                if initial_score >= 0.40 and url:
                    full_url = url if url.startswith("http") else f"https://hamrobazaar.com{url}"
                    candidate_urls.append(full_url)

        # Scrape detail pages concurrently
        scraped_data = await asyncio.gather(
            *[scrape_product_details(context, u) for u in candidate_urls],
            return_exceptions=True
        )

        for detail in scraped_data:
            if isinstance(detail, dict) and detail.get("title"):
                final_score = _product_match_score(query, detail["title"])
                if final_score >= 0.65:
                    detail["match_score"] = final_score
                    detail["source"] = "HamroBazaar"
                    results.append(detail)

    except Exception:
        pass
    finally:
        await page.close()

    return results


async def search_products(query: str, max_candidates: int = 3) -> List[Dict[str, Any]]:
    """
    Main entry point for product searching across supported platforms.
    Manages Playwright lifecycle and aggregates matching results.
    """
    if not query or not query.strip():
        return []

    async with async_playwright() as p:
        browser: Browser = await p.chromium.launch(headless=True)
        context: BrowserContext = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )

        try:
            results_saathi, results_hamro = await asyncio.gather(
                search_onlinesaathi(context, query, max_candidates=max_candidates),
                search_hamrobazar(context, query, max_candidates=max_candidates),
                return_exceptions=True
            )

            all_results = []
            if isinstance(results_saathi, list):
                all_results.extend(results_saathi)
            if isinstance(results_hamro, list):
                all_results.extend(results_hamro)

            # Sort results by match score in descending order
            all_results.sort(key=lambda x: x.get("match_score", 0.0), reverse=True)
            return all_results

        finally:
            await context.close()
            await browser.close()
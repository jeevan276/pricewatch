import asyncio
import math
import re
import time
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from app.services.scrapers.base import BaseScraper
from app.services.scrapers.daraz import DarazScraper
from app.services.scrapers.hamrobazar import HamroBazarScraper
from app.services.scrapers.onlinesathi import OnlineSathiScraper
from app.services.scrapers.mychoice import MyChoiceScraper
from app.services.scrapers.errors import ScrapeUnavailableError

# ============================================================
# SUPPORTED SCRAPERS
# ============================================================

SCRAPERS: dict[str, BaseScraper] = {
    "daraz.com.np": DarazScraper(),
    "hamrobazaar.com": HamroBazarScraper(),
    "onlinesaathi.com": OnlineSathiScraper(),
    "my-choice-ecom.vercel.app": MyChoiceScraper(),
}


# ============================================================
# SCRAPER LOOKUP
# ============================================================


def get_scraper(url: str) -> BaseScraper:
    """
    Find the correct scraper based on the product URL.
    """

    if not url or not isinstance(url, str):
        raise ValueError("Invalid product URL")

    cleaned_url = url.strip()

    if not cleaned_url.startswith(("http://", "https://")):
        cleaned_url = "https://" + cleaned_url

    parsed = urlparse(cleaned_url)
    hostname = parsed.hostname

    if not hostname:
        raise ValueError("Invalid product URL")

    hostname = hostname.lower()

    # Remove www.
    if hostname.startswith("www."):
        hostname = hostname[4:]

    for domain, scraper in SCRAPERS.items():
        if hostname == domain or hostname.endswith("." + domain):
            return scraper

    raise ValueError(f"No scraper available for domain: {hostname}")


# ============================================================
# CACHE / IN-FLIGHT REQUESTS
# ============================================================

# Deduplicate simultaneous reads and briefly cache
# only verified successful results.
_cache: dict[str, tuple[float, dict]] = {}
_inflight: dict[str, asyncio.Task] = {}


# ============================================================
# URL NORMALIZATION
# ============================================================


def normalize_product_url(url: str) -> str:
    """
    Validate and normalize a product URL.

    Removes tracking parameters and creates a canonical
    URL for supported storefronts.
    """

    if not isinstance(url, str) or not url.strip():
        raise ValueError("Please provide a product URL.")

    parsed = urlparse(url.strip())

    host = (parsed.hostname or "").lower()

    if parsed.scheme not in ("http", "https"):
        raise ValueError("Please use a valid HTTP or HTTPS product URL.")

    if parsed.username or parsed.password:
        raise ValueError("Product URLs containing credentials are not allowed.")

    if parsed.port not in (None, 80, 443):
        raise ValueError("Product URL uses an unsupported port.")

    if host.startswith("www."):
        host = host[4:]

    # Restrict network targets to actual supported storefronts.
    if host not in SCRAPERS:
        raise ValueError(
            "Only Daraz, OnlineSaathi, HamroBazar and My Choice "
            "product URLs are supported."
        )

    # Remove common tracking parameters.
    query = [
        (key, value)
        for key, value in parse_qsl(
            parsed.query,
            keep_blank_values=True,
        )
        if not key.lower().startswith("utm_")
        and key.lower()
        not in (
            "spm",
            "scm",
            "fbclid",
            "gclid",
        )
    ]

    path = parsed.path

    # ========================================================
    # DARAZ CANONICAL URL
    # ========================================================

    if host == "daraz.com.np":
        match = re.search(
            r"-i(\d+)(?:-s(\d+))?\.html$",
            path,
            re.IGNORECASE,
        )

        if not match:
            raise ValueError(
                "Paste the full Daraz product link, " "not a search or store page."
            )

        # Slug/tracking changes do not create duplicate
        # histories; preserve SKU identity.
        query_dict = dict(query)

        sku = query_dict.get("skuId") or match.group(2)

        if sku and not sku.isdigit():
            raise ValueError("Daraz SKU must be a numeric identifier.")

        path = (
            "/products/product-i"
            + match.group(1)
            + (f"-s{sku}" if sku else "")
            + ".html"
        )

        query = []

    return urlunparse(
        (
            "https",
            host,
            path,
            "",
            urlencode(sorted(query)),
            "",
        )
    )


# ============================================================
# INTERNAL PRODUCT READ
# ============================================================


async def _read(url: str) -> dict:
    try:
        result = await asyncio.wait_for(
            get_scraper(url).scrape_product(url),
            timeout=35,
        )

        # ----------------------------------------------------
        # Validate result
        # ----------------------------------------------------

        if (
            not isinstance(result, dict)
            or not isinstance(result.get("name"), str)
            or not result["name"].strip()
        ):
            raise ScrapeUnavailableError(
                "The retailer did not return a valid product. " "Please try again."
            )

        # ----------------------------------------------------
        # Validate price
        # ----------------------------------------------------

        try:
            price = float(result.get("price"))
        except (TypeError, ValueError, OverflowError) as exc:
            raise ScrapeUnavailableError(
                "The retailer did not return a valid price. " "Please try again."
            ) from exc

        if (
            isinstance(result.get("price"), bool)
            or not math.isfinite(price)
            or price <= 0
        ):
            raise ScrapeUnavailableError(
                "The retailer did not return a valid price. " "Please try again."
            )

        # ----------------------------------------------------
        # Normalize successful result
        # ----------------------------------------------------

        result = {
            **result,
            "name": result["name"].strip(),
            "price": price,
        }

        # ----------------------------------------------------
        # Cache successful result
        # ----------------------------------------------------

        _cache[url] = (
            time.monotonic(),
            dict(result),
        )

        if len(_cache) > 256:
            _cache.pop(next(iter(_cache)))

        return result

    except asyncio.TimeoutError as exc:
        raise ScrapeUnavailableError(
            "The retailer took too long to respond. " "Please try again."
        ) from exc


# ============================================================
# IN-FLIGHT TASK CLEANUP
# ============================================================


def _finished(url: str, task: asyncio.Task) -> None:
    """
    Remove completed task from the in-flight registry and
    retrieve exceptions so they are not reported as
    unhandled task exceptions.
    """

    if _inflight.get(url) is task:
        _inflight.pop(url, None)

    if not task.cancelled():
        task.exception()


# ============================================================
# SCRAPE PRODUCT
# ============================================================


async def scrape_product(
    url: str,
    *,
    fresh: bool = False,
) -> dict:
    """
    Scrape a product with:

    - URL normalization
    - 30-second successful-result cache
    - simultaneous-request deduplication
    - 35-second timeout
    """

    url = normalize_product_url(url)

    # --------------------------------------------------------
    # Return cached result when still fresh
    # --------------------------------------------------------

    cached = _cache.get(url)

    if not fresh and cached and time.monotonic() - cached[0] < 30:
        return dict(cached[1])

    # --------------------------------------------------------
    # Reuse an existing scrape
    # --------------------------------------------------------

    task = _inflight.get(url)

    if task is None:
        task = asyncio.create_task(_read(url))
        _inflight[url] = task

        task.add_done_callback(lambda done: _finished(url, done))

    # Shield the shared task so cancellation of one caller
    # does not cancel the underlying scrape.
    return dict(await asyncio.shield(task))


# ============================================================
# SCRAPE PRICE
# ============================================================


async def scrape_price(url: str) -> float:
    """
    Scrape only the current product price.
    """

    return (await scrape_product(url))["price"]


# ============================================================
# CLOSE SCRAPERS
# ============================================================


async def close_scrapers() -> None:
    """
    Cancel active scraping tasks and close scraper resources.
    """

    tasks = list(_inflight.values())

    for task in tasks:
        task.cancel()

    await asyncio.gather(
        *tasks,
        return_exceptions=True,
    )

    # Close scrapers that expose a close() method.
    for scraper in SCRAPERS.values():
        close = getattr(scraper, "close", None)

        if close is not None:
            result = close()

            if asyncio.iscoroutine(result):
                await result

    _cache.clear()
    _inflight.clear()

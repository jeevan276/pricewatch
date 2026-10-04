from urllib.parse import urlparse

from app.services.scrapers.base import BaseScraper
from app.services.scrapers.daraz import DarazScraper
from app.services.scrapers.hamrobazar import HamroBazarScraper
from app.services.scrapers.onlinesathi import OnlineSathiScraper

SCRAPERS: dict[str, BaseScraper] = {
    "daraz.com.np": DarazScraper(),
    "hamrobazaar.com": HamroBazarScraper(),
    "onlinesaathi.com": OnlineSathiScraper(),
}


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


# Deduplicate simultaneous reads and briefly cache only verified successes.
import asyncio
import math
import re
import time
from urllib.parse import parse_qsl, urlencode, urlunparse
from app.services.scrapers.errors import ScrapeUnavailableError

_cache = {}
_inflight = {}


def normalize_product_url(url: str) -> str:
    parsed = urlparse(url.strip())
    host = (parsed.hostname or '').lower()
    if parsed.scheme not in ('http', 'https') or parsed.username or parsed.password:
        raise ValueError('Please use a valid HTTP or HTTPS product URL.')
    if parsed.port not in (None, 80, 443):
        raise ValueError('Product URL uses an unsupported port.')
    if host.startswith('www.'):
        host = host[4:]
    # Restrict network targets to actual supported storefronts.
    if host not in SCRAPERS:
        raise ValueError('Only Daraz, OnlineSaathi and HamroBazar product URLs are supported.')
    query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('spm', 'scm', 'fbclid', 'gclid')]
    path = parsed.path
    if host == 'daraz.com.np':
        match = re.search(r'-i(\d+)(?:-s(\d+))?\.html', path)
        if not match:
            raise ValueError('Paste the full Daraz product link, not a search or store page.')
        # Slug/tracking changes do not create duplicate histories; preserve SKU identity.
        sku = dict(query).get('skuId') or match[2]
        if sku and not sku.isdigit():
            raise ValueError('Daraz SKU must be a numeric identifier.')
        path = '/products/product-i' + match[1] + ('-s' + sku if sku else '') + '.html'
        query = []
    return urlunparse(('https', host, path, '', urlencode(sorted(query)), ''))


async def _read(url):
    try:
        result = await asyncio.wait_for(get_scraper(url).scrape_product(url), timeout=35)
        if not isinstance(result, dict) or not isinstance(result.get('name'), str) or not result['name'].strip():
            raise ScrapeUnavailableError('The retailer did not return a valid product. Please try again.')
        try:
            price = float(result.get('price'))
        except (TypeError, ValueError, OverflowError) as exc:
            raise ScrapeUnavailableError('The retailer did not return a valid price. Please try again.') from exc
        if isinstance(result.get('price'), bool) or not math.isfinite(price) or price <= 0:
            raise ScrapeUnavailableError('The retailer did not return a valid price. Please try again.')
        result = {**result, 'name': result['name'].strip(), 'price': price}
        _cache[url] = (time.monotonic(), dict(result))
        if len(_cache) > 256:
            _cache.pop(next(iter(_cache)))
        return result
    except asyncio.TimeoutError as exc:
        raise ScrapeUnavailableError('The retailer took too long to respond. Please try again.') from exc


def _finished(url, task):
    if _inflight.get(url) is task:
        _inflight.pop(url, None)
    # Retrieve exceptions even when the client disconnected before completion.
    if not task.cancelled():
        task.exception()


async def scrape_product(url: str, *, fresh: bool = False) -> dict:
    url = normalize_product_url(url)
    cached = _cache.get(url)
    if not fresh and cached and time.monotonic() - cached[0] < 30:
        return dict(cached[1])
    task = _inflight.get(url)
    if task is None:
        task = asyncio.create_task(_read(url))
        _inflight[url] = task
        task.add_done_callback(lambda done: _finished(url, done))
    return dict(await asyncio.shield(task))


async def scrape_price(url: str) -> float:
    return (await scrape_product(url))['price']


async def close_scrapers():
    tasks = list(_inflight.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await SCRAPERS['daraz.com.np'].close()
    _cache.clear()
    _inflight.clear()

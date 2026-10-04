"""HTTP-first Daraz reader. Public page data is not an official API."""
import asyncio
import json
import math
import re
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlparse

import httpx

from app.services.browser import browser_page
from app.services.scrapers.base import BaseScraper
from app.services.scrapers.errors import ProductRemovedError, ScrapeUnavailableError


class _Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.meta = {}
        self.text = []
        self._script = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self._script = []
        if tag == 'meta':
            key = attrs.get('property') or attrs.get('name')
            if key:
                self.meta[key] = attrs.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'script' and self._script is not None:
            self.scripts.append(''.join(self._script))
            self._script = None

    def handle_data(self, text):
        if self._script is not None:
            self._script.append(text)
        else:
            self.text.append(text)


def _price(value):
    if isinstance(value, dict):
        value = value.get('value')
    # Never merge struck-through prices, shipping fees or discount percentages.
    value = str(value or '').strip().replace(',', '')
    match = re.fullmatch(r'(?:Rs\.?\s*|NPR\s*)?(\d+(?:\.\d+)?)', value, re.I)
    if not match:
        return None
    number = float(match[1])
    return number if math.isfinite(number) and number > 0 else None


def _nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from _nodes(child)


def _image_url(value, url):
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, dict):
        value = value.get('url') or value.get('src')
    return BaseScraper.normalize_url(url, value) if isinstance(value, str) else None


def parse_product(html: str, url: str) -> dict | None:
    doc = _Document()
    doc.feed(html)
    # A CAPTCHA/anti-bot response must never become "removed".
    visible = ' '.join(doc.text).lower()
    if any(s in visible for s in ('verify you are human', 'slide to verify', 'captcha', 'access denied')):
        raise ScrapeUnavailableError('Daraz could not verify this request. Try again shortly.')
    payloads = []
    decoder = json.JSONDecoder()
    for script in doc.scripts:
        for start in [0] + [m.end() for m in re.finditer(r'(?:app\.run\s*\(|(?:__INIT_DATA__|__INITIAL_STATE__)\s*=\s*)', script)]:
            try:
                payloads.append(decoder.raw_decode(script[start:].lstrip())[0])
            except (ValueError, TypeError):
                pass
    # Prefer Daraz SKU data over generic metadata when a variant is selected.
    sku_match = re.search(r'-s(\d+)', urlparse(url).path)
    sku = parse_qs(urlparse(url).query).get('skuId', [None])[0] or (sku_match[1] if sku_match else None)
    for payload in payloads:
        for node in _nodes(payload):
            fields = node.get('fields')
            if not isinstance(fields, dict):
                continue
            product = fields.get('product') or {}
            infos = fields.get('skuInfos') or {}
            selected = infos.get(str(sku)) if sku else None
            if sku and selected is None:
                continue  # Never silently substitute another SKU's price.
            if selected is None and len(infos) == 1:
                selected = next(iter(infos.values()))
            selected = selected or {}
            price = _price(selected.get('price', {}).get('salePrice')) if isinstance(selected.get('price'), dict) else None
            name = product.get('title') or product.get('name')
            if name and price:
                images = fields.get('image') or {}
                image = images.get('image') if isinstance(images, dict) else None
                image = image or doc.meta.get('og:image')
                stock = selected.get('stock')
                if isinstance(stock, dict):
                    stock = stock.get('value')
                return {'name': name, 'price': price, 'image_url': _image_url(image, url),
                        'availability': 'out_of_stock' if stock is not None and str(stock) == '0' else 'available'}
    # Structured data is useful only when it identifies the requested variant,
    # or there is no variant-specific URL. Aggregate ranges are not a price.
    for payload in payloads:
        for node in _nodes(payload):
            types = node.get('@type', [])
            if types == 'Product' or isinstance(types, list) and 'Product' in types:
                offers = node.get('offers') or {}
                offers = offers if isinstance(offers, list) else [offers]
                for offer in offers:
                    if not isinstance(offer, dict):
                        continue
                    if sku and str(node.get('sku', '')) != str(sku) and str(offer.get('sku', '')) != str(sku):
                        continue
                    if offer.get('priceCurrency', 'NPR') != 'NPR':
                        continue
                    price = _price(offer.get('price'))
                    if price and node.get('name'):
                        image = node.get('image') or doc.meta.get('og:image')
                        state = str(offer.get('availability', ''))
                        # Discontinued is not the same as a confirmed missing page.
                        availability = 'out_of_stock' if state.endswith(('OutOfStock', 'Discontinued')) else 'available'
                        return {'name': node['name'], 'price': price,
                                'image_url': _image_url(image, url), 'availability': availability}
    if any(s in visible for s in ("this product is no longer available", "the product you are looking for does not exist", "sorry, this product is not available", "product not found", "sorry, the page you requested cannot be found")):
        raise ProductRemovedError('This product has been removed from Daraz.')
    return None


class DarazScraper(BaseScraper):
    def __init__(self):
        self._client = None

    @staticmethod
    def clean_price(text):
        # Retain compatibility for callers/tests, but accept only one price.
        result = _price(text)
        if result is None:
            raise ValueError('Invalid Daraz selling price')
        return result

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def scrape_product(self, url: str) -> dict:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(8, connect=4), follow_redirects=False,
                headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9'})
        try:
            # Follow only same-retailer redirects; don't fetch arbitrary destinations.
            current = url
            for _ in range(4):
                response = await self._client.get(current)
                if response.is_redirect:
                    next_url = self.normalize_url(current, response.headers.get('location'))
                    host = urlparse(next_url or '').hostname or ''
                    if host not in ('daraz.com.np', 'www.daraz.com.np'):
                        raise ScrapeUnavailableError('Daraz redirected away from its product page.')
                    current = next_url
                    continue
                if response.status_code in (404, 410):
                    raise ProductRemovedError('This product has been removed from Daraz.')
                if response.status_code == 200:
                    data = parse_product(response.text, url)
                    if data:
                        return data
                break
        except (httpx.HTTPError, ScrapeUnavailableError):
            pass  # Rendering may still work; no fixed sleeps or browser per request.
        try:
            async with browser_page() as page:
                response = await page.goto(url, wait_until='domcontentloaded', timeout=15000)
                if response and response.status in (404, 410):
                    raise ProductRemovedError('This product has been removed from Daraz.')
                if response and response.status >= 400:
                    raise ScrapeUnavailableError('Daraz is temporarily unavailable. Please try again.')
                data = parse_product(await page.content(), url)
                if data:
                    return data
                # Narrow selling-price selector avoids unrelated/shipping/original prices.
                await page.wait_for_selector('.pdp-price_type_normal, .pdp-product-price', timeout=6000)
                data = parse_product(await page.content(), url)
                if data:
                    return data
                name = await page.locator('.pdp-product-title, h1').first.text_content(timeout=1000)
                text = await page.locator('.pdp-price_type_normal, .pdp-product-price').first.text_content(timeout=1000)
                price = _price(text)
                image = await page.locator('meta[property="og:image"]').get_attribute('content') if await page.locator('meta[property="og:image"]').count() else None
                if name and name.strip() and price:
                    body_text = (await page.locator('body').inner_text(timeout=1000)).lower()
                    availability = 'out_of_stock' if 'out of stock' in body_text else 'available'
                    return {'name': name.strip(), 'price': price, 'image_url': self.normalize_url(url, image), 'availability': availability}
        except ProductRemovedError:
            raise
        except Exception as exc:
            raise ScrapeUnavailableError('Could not verify the Daraz product. Please try again shortly.') from exc
        raise ScrapeUnavailableError('Daraz returned no verifiable selling price. Please try again.')

    async def scrape_price(self, url: str) -> float:
        return (await self.scrape_product(url))['price']

import asyncio
import math
import re
import unicodedata
from typing import Any
from urllib.parse import urlparse

from app.services.scraper import get_scraper, scrape_product, normalize_product_url

# ============================================================
# SUPPORTED COMPARISON DOMAINS
# ============================================================

SUPPORTED_COMPARISON_DOMAINS = {
    "daraz.com.np",
    "hamrobazaar.com",
    "onlinesaathi.com",
    "my-choice-ecom.vercel.app",
}


def is_supported_comparison_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False

    try:
        normalize_product_url(url)
        return True
    except ValueError:
        return False


# ============================================================
# PRODUCT VARIANTS
# ============================================================

VARIANT_WORDS = {
    "pro",
    "plus",
    "ultra",
    "max",
    "mini",
    "lite",
    "se",
    "fe",
    "air",
    "prime",
    "neo",
    "play",
    "edge",
    "active",
    "classic",
}


NETWORK_WORDS = {
    "4g",
    "5g",
}


# ============================================================
# COMMON PRODUCT BRANDS
# ============================================================

KNOWN_BRANDS = {
    "apple",
    "iphone",
    "samsung",
    "xiaomi",
    "redmi",
    "mi",
    "oneplus",
    "realme",
    "oppo",
    "vivo",
    "huawei",
    "honor",
    "acer",
    "asus",
    "lenovo",
    "dell",
    "hp",
    "msi",
    "infinix",
    "tecno",
    "motorola",
    "nokia",
    "google",
    "pixel",
    "nothing",
    "poco",
}


# ============================================================
# NOISE WORDS
# ============================================================

NOISE_WORDS = {
    "full",
    "fresh",
    "new",
    "used",
    "second",
    "hand",
    "non",
    "repair",
    "repaired",
    "original",
    "genuine",
    "condition",
    "good",
    "excellent",
    "best",
    "price",
    "cheap",
    "sale",
    "offer",
    "discount",
    "brand",
    "sealed",
    "box",
    "pack",
    "pcs",
    "piece",
    "available",
    "limited",
    "stock",
    "only",
    "free",
    "delivery",
}


# ============================================================
# NORMALIZATION
# ============================================================


def normalize_product_name(name: str) -> str:
    """
    Normalize a product name for comparison.
    """

    if not name or not str(name).strip():
        return ""

    normalized = unicodedata.normalize(
        "NFKD",
        str(name),
    )

    normalized = normalized.lower()

    # Normalize common separators.
    normalized = normalized.replace("+", " ")
    normalized = normalized.replace("/", " ")
    normalized = normalized.replace("\\", " ")

    # Convert punctuation to spaces.
    normalized = re.sub(
        r"[-_|,(){}\[\]:;]+",
        " ",
        normalized,
    )

    # Remove remaining special characters.
    normalized = re.sub(
        r"[^a-z0-9\s]",
        " ",
        normalized,
    )

    # Normalize whitespace.
    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    ).strip()

    return normalized


def extract_product_tokens(name: str) -> set[str]:
    normalized = normalize_product_name(name)

    if not normalized:
        return set()

    return set(normalized.split())


# ============================================================
# MEMORY / STORAGE SIZE NORMALIZATION
# ============================================================


def normalize_size(value: str) -> str | None:
    if not value or not str(value).strip():
        return None

    value = str(value).lower().strip()

    match = re.fullmatch(
        r"(\d+)(gb|tb)?",
        value,
    )

    if not match:
        return None

    number = int(match.group(1))
    unit = match.group(2)

    if unit == "tb":
        number *= 1024

    return f"{number}gb"


# ============================================================
# IMPORTANT PRODUCT ATTRIBUTES
# ============================================================


def extract_attributes(name: str) -> dict[str, Any]:
    normalized = normalize_product_name(name)
    tokens = normalized.split()

    result: dict[str, Any] = {
        "brand": set(),
        "model": set(),
        "ram": set(),
        "storage": set(),
        "network": None,
        "variant": set(),
    }

    if not tokens:
        return result

    # --------------------------------------------------------
    # BRAND
    # --------------------------------------------------------

    for token in tokens:
        if token in KNOWN_BRANDS:
            result["brand"].add(token)

    # --------------------------------------------------------
    # NETWORK
    # --------------------------------------------------------

    for token in tokens:
        if token in NETWORK_WORDS:
            result["network"] = token

    # --------------------------------------------------------
    # VARIANT
    # --------------------------------------------------------

    for token in tokens:
        if token in VARIANT_WORDS:
            result["variant"].add(token)

    memory_pattern = r"\b(2|3|4|6|8|12|16|18|24|32|64|96|128)\s*(?:gb)?\s*[/+]\s*(32|64|128|256|512|1024|2048|1|2|4)\s*(gb|tb)?\b"
    model_text = str(name).lower()
    for match in re.finditer(memory_pattern, model_text):
        ram, storage = int(match[1]), int(match[2])
        if match[3] == "tb":
            storage *= 1024
        result["ram"].add(f"{ram}gb")
        result["storage"].add(f"{storage}gb")
    model_text = re.sub(memory_pattern, " ", model_text)
    explicit_memory = r"\b(\d+)\s*(gb|tb)\b"
    for match in re.finditer(explicit_memory, model_text):
        number = int(match[1]) * (1024 if match[2] == "tb" else 1)
        # 32/64 GB standalone tokens are storage; explicit RAM labels win.
        before = model_text[: match.start()]
        after = model_text[match.end() :]
        prefix_ram = bool(re.search(r"\bram\s*$", before)) and not re.search(
            r"\d+\s*(?:gb|tb)\s+ram\s*$", before
        )
        suffix_ram = bool(re.match(r"\s*ram\b", after))
        if prefix_ram or suffix_ram or number < 32:
            result["ram"].add(f"{number}gb")
        else:
            result["storage"].add(f"{number}gb")
    model_text = re.sub(explicit_memory, " ", model_text)
    ignored_tokens = (
        KNOWN_BRANDS
        | NETWORK_WORDS
        | VARIANT_WORDS
        | NOISE_WORDS
        | {"gb", "tb", "ram", "rom", "storage", "memory", "wifi", "lte"}
    )
    result["model"] = set(normalize_product_name(model_text).split()) - ignored_tokens

    return result


def extract_model_tokens(name: str) -> set[str]:
    return extract_attributes(name)["model"]


# ============================================================
# DEBUG ATTRIBUTE PRINT
# ============================================================


def print_product_comparison(
    reference_name: str,
    candidate_name: str,
) -> None:
    reference = extract_attributes(reference_name)
    candidate = extract_attributes(candidate_name)

    reference_model = reference["model"]
    candidate_model = candidate["model"]

    common_model = reference_model.intersection(candidate_model)

    if reference_model or candidate_model:
        model_union = reference_model.union(candidate_model)

        model_score = len(common_model) / len(model_union) if model_union else 0.0
    else:
        model_score = 1.0

    print("\n============================================================")
    print("PRODUCT COMPARISON")
    print("============================================================")

    print(f"REFERENCE: {reference_name}")
    print(f"CANDIDATE: {candidate_name}")

    print("\nREFERENCE ATTRIBUTES:")
    print(f"BRAND: {reference['brand']}")
    print(f"MODEL: {reference_model}")
    print(f"RAM: {reference['ram']}")
    print(f"STORAGE: {reference['storage']}")
    print(f"NETWORK: {reference['network']}")
    print(f"VARIANT: {reference['variant']}")

    print("\nCANDIDATE ATTRIBUTES:")
    print(f"BRAND: {candidate['brand']}")
    print(f"MODEL: {candidate_model}")
    print(f"RAM: {candidate['ram']}")
    print(f"STORAGE: {candidate['storage']}")
    print(f"NETWORK: {candidate['network']}")
    print(f"VARIANT: {candidate['variant']}")

    print(f"\nMODEL COMMON: {common_model}")
    print(f"MODEL SCORE: {round(model_score, 3)}")


# ============================================================
# PRODUCT SIMILARITY
# ============================================================


def product_similarity(
    reference_name: str,
    candidate_name: str,
) -> float:
    reference = extract_attributes(reference_name)
    candidate = extract_attributes(candidate_name)

    reference_model = reference["model"]
    candidate_model = candidate["model"]

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    if reference_model and candidate_model:
        common_model = reference_model.intersection(candidate_model)

        model_union = reference_model.union(candidate_model)

        model_score = len(common_model) / len(model_union) if model_union else 1.0

    elif not reference_model and not candidate_model:
        model_score = 1.0

    else:
        model_score = 0.0

    print(f"\nMODEL COMMON: " f"{reference_model.intersection(candidate_model)}")
    print(f"MODEL SCORE: {round(model_score, 3)}")

    # --------------------------------------------------------
    # BRAND
    # --------------------------------------------------------

    reference_brand = reference["brand"]
    candidate_brand = candidate["brand"]

    if reference_brand and candidate_brand:
        if not reference_brand.intersection(candidate_brand):
            print("RESULT: DIFFERENT\n" "REASON: BRAND MISMATCH")
            return 0.0

        brand_score = 1.0

    else:
        brand_score = 0.5

    # --------------------------------------------------------
    # RAM
    # --------------------------------------------------------

    reference_ram = reference["ram"]
    candidate_ram = candidate["ram"]

    if reference_ram:
        if not candidate_ram:
            print("RESULT: DIFFERENT\n" "REASON: CANDIDATE RAM UNKNOWN")
            return 0.0

        if not reference_ram.intersection(candidate_ram):
            print("RESULT: DIFFERENT\n" "REASON: RAM MISMATCH")
            return 0.0

        ram_score = 1.0

    else:
        ram_score = 0.5

    # --------------------------------------------------------
    # STORAGE
    # --------------------------------------------------------

    reference_storage = reference["storage"]
    candidate_storage = candidate["storage"]

    if reference_storage:
        if not candidate_storage:
            print("RESULT: DIFFERENT\n" "REASON: CANDIDATE STORAGE UNKNOWN")
            return 0.0

        if not reference_storage.intersection(candidate_storage):
            print("RESULT: DIFFERENT\n" "REASON: STORAGE MISMATCH")
            return 0.0

        storage_score = 1.0

    else:
        storage_score = 0.5

    # --------------------------------------------------------
    # NETWORK
    # --------------------------------------------------------

    reference_network = reference["network"]
    candidate_network = candidate["network"]

    print("\nNETWORK CHECK:")
    print(f"REFERENCE NETWORK: {reference_network}")
    print(f"CANDIDATE NETWORK: {candidate_network}")

    if reference_network and candidate_network:
        if reference_network != candidate_network:
            print(
                "NETWORK RESULT: MISMATCH\n"
                "RESULT: DIFFERENT\n"
                "REASON: NETWORK MISMATCH"
            )
            return 0.0

        network_score = 1.0
        print("NETWORK RESULT: MATCH")

    elif reference_network is None:
        network_score = 0.5
        print("NETWORK RESULT: " "REFERENCE UNKNOWN - ALLOWED")

    else:
        network_score = 0.5
        print("NETWORK RESULT: " "CANDIDATE UNKNOWN - ALLOWED")

    # --------------------------------------------------------
    # VARIANT
    # --------------------------------------------------------

    reference_variant = reference["variant"]
    candidate_variant = candidate["variant"]

    if reference_variant != candidate_variant:
        return 0.0

    # --------------------------------------------------------
    # STRICT MODEL REQUIREMENT
    # --------------------------------------------------------

    # If both products contain meaningful model information,
    # require substantial overlap.
    if reference_model and candidate_model:
        if model_score < 0.60:
            print("RESULT: DIFFERENT\n" "REASON: DIFFERENT MODEL")
            return 0.0

    reference_numbers = {
        token for token in reference_model if any(char.isdigit() for char in token)
    }
    candidate_numbers = {
        token for token in candidate_model if any(char.isdigit() for char in token)
    }
    if (
        reference_numbers
        and candidate_numbers
        and reference_numbers != candidate_numbers
    ):
        return 0.0

    # --------------------------------------------------------
    # FINAL SCORE
    # --------------------------------------------------------

    score = (
        (model_score * 0.50)
        + (brand_score * 0.15)
        + (ram_score * 0.15)
        + (storage_score * 0.15)
        + (network_score * 0.05)
    )

    score = round(score, 3)

    print(f"\nFINAL SCORE: {score}")

    return score


# ============================================================
# SAME PRODUCT
# ============================================================


def is_same_product(
    reference_name: str,
    candidate_name: str,
    threshold: float = 0.70,
) -> bool:
    score = product_similarity(
        reference_name,
        candidate_name,
    )

    print("\nRESULT:")

    if score >= threshold:
        print("MATCHED")
        return True

    print("DIFFERENT")
    return False


# ============================================================
# COMPARE PRICES
# ============================================================


def compare_prices(
    products: list[dict[str, Any]],
) -> dict[str, Any]:
    if not products:
        return {
            "product": None,
            "offers": [],
            "cheapest": None,
            "highest": None,
            "difference": 0,
        }

    valid_products = []

    for product in products:
        raw_price = product.get("price")

        if raw_price is None:
            continue

        try:
            numeric_price = float(raw_price)
        except (ValueError, TypeError):
            continue

        if not math.isfinite(numeric_price) or numeric_price <= 0:
            continue

        valid_products.append(
            {
                **product,
                "price": numeric_price,
            }
        )

    if not valid_products:
        return {
            "product": None,
            "offers": [],
            "cheapest": None,
            "highest": None,
            "difference": 0,
        }

    offers = sorted(
        valid_products,
        key=lambda product: float(product["price"]),
    )

    cheapest = offers[0]
    highest = offers[-1]

    difference = float(highest["price"]) - float(cheapest["price"])

    return {
        "product": cheapest.get("name"),
        "offers": offers,
        "cheapest": cheapest,
        "highest": highest,
        "difference": round(difference, 2),
    }


# ============================================================
# ASYNC WORKER FOR URL SCRAPING
# ============================================================


async def _scrape_site_url(
    site: str,
    url: str | None,
) -> dict[str, Any]:
    if not url or not str(url).strip():
        return {
            "site": site,
            "status": "not_available",
            "name": None,
            "price": None,
            "url": None,
            "image_url": None,
        }

    clean_url = str(url).strip()

    # --------------------------------------------------------
    # SUPPORTED WEBSITE VALIDATION
    # --------------------------------------------------------

    if not is_supported_comparison_url(clean_url):
        return {
            "site": site,
            "status": "unsupported",
            "name": None,
            "price": None,
            "url": clean_url,
            "image_url": None,
        }

    # --------------------------------------------------------
    # SCRAPER VALIDATION
    # --------------------------------------------------------

    site_domain = {
        "Daraz": "daraz.com.np",
        "OnlineSaathi": "onlinesaathi.com",
        "HamroBazar": "hamrobazaar.com",
        "MyChoice": "my-choice-ecom.vercel.app",
    }.get(site)
    if site_domain and urlparse(clean_url).hostname.removeprefix("www.") != site_domain:
        return {
            "site": site,
            "status": "unsupported",
            "name": None,
            "price": None,
            "url": clean_url,
            "image_url": None,
        }
    try:
        get_scraper(clean_url)
    except ValueError:
        return {
            "site": site,
            "status": "unsupported",
            "name": None,
            "price": None,
            "url": clean_url,
            "image_url": None,
        }

    try:
        print("\n============================================================")
        print(f"COMPARING {site}")
        print("============================================================")
        print(f"URL: {clean_url}")

        scraped = await scrape_product(clean_url)

        if not scraped:
            print(f"{site}: NO PRODUCT FOUND")

            return {
                "site": site,
                "status": "not_found",
                "name": None,
                "price": None,
                "url": clean_url,
                "image_url": None,
            }

        name = scraped.get("name")
        price = scraped.get("price")
        image_url = scraped.get("image_url")

        # ----------------------------------------------------
        # PRODUCT NAME VALIDATION
        # ----------------------------------------------------

        if not name or not str(name).strip():
            return {
                "site": site,
                "status": "invalid",
                "name": None,
                "price": price,
                "url": clean_url,
                "image_url": image_url,
            }

        # ----------------------------------------------------
        # PRICE VALIDATION
        # ----------------------------------------------------

        if price is None:
            return {
                "site": site,
                "status": "price_unavailable",
                "name": name,
                "price": None,
                "url": clean_url,
                "image_url": image_url,
            }

        try:
            numeric_price = float(price)
        except (ValueError, TypeError):
            return {
                "site": site,
                "status": "invalid_price",
                "name": name,
                "price": None,
                "url": clean_url,
                "image_url": image_url,
            }

        if not math.isfinite(numeric_price) or numeric_price <= 0:
            return {
                "site": site,
                "status": "invalid_price",
                "name": name,
                "price": None,
                "url": clean_url,
                "image_url": image_url,
            }

        print(f"{site} PRODUCT: {name}")
        print(f"{site} PRICE: {numeric_price}")

        return {
            "site": site,
            "status": "found",
            "name": name,
            "price": numeric_price,
            "url": clean_url,
            "image_url": image_url,
        }

    except Exception as exc:
        print(f"\nCOMPARISON FAILED - {site}: " f"{clean_url}")
        print(f"ERROR: {exc}")

        return {
            "site": site,
            "status": "error",
            "name": None,
            "price": None,
            "url": clean_url,
            "image_url": None,
        }


# ============================================================
# COMPARE PRODUCT URLS
# ============================================================


async def compare_product_urls(
    urls: dict[str, str | None],
) -> dict[str, Any]:
    # Concurrent scraping is intentionally preserved.
    tasks = [_scrape_site_url(site, url) for site, url in urls.items()]

    site_results = await asyncio.gather(*tasks)

    scraped_products = [
        result for result in site_results if result.get("status") == "found"
    ]

    if not scraped_products:
        return {
            "product": None,
            "sites": list(site_results),
            "offers": [],
            "cheapest": None,
            "highest": None,
            "difference": 0,
        }

    # ========================================================
    # SELECT REFERENCE PRODUCT
    # ========================================================

    reference_product = None

    reference_order = [
        "daraz",
        "onlinesaathi",
        "hamrobazar",
        "mychoice",
    ]

    for reference_site in reference_order:
        for product in scraped_products:
            if product["site"].lower() == reference_site:
                reference_product = product
                break

        if reference_product:
            break

    if reference_product is None:
        reference_product = scraped_products[0]

    print("\n============================================================")
    print("REFERENCE PRODUCT")
    print("============================================================")
    print(f"SITE: {reference_product['site']}")
    print(f"NAME: {reference_product['name']}")
    print(f"PRICE: {reference_product['price']}")
    print("============================================================")

    # The reference product is always considered matched
    # with itself.
    reference_product["status"] = "matched"

    matched_products = [reference_product]

    # ========================================================
    # PRODUCT MATCHING
    # ========================================================

    for product in scraped_products:
        if product is reference_product:
            continue

        print("\n============================================================")
        print("PRODUCT MATCH CHECK")
        print("============================================================")

        print(f"REFERENCE: " f"{reference_product['name']}")

        print(f"CANDIDATE: " f"{product['name']}")

        print_product_comparison(
            reference_product["name"],
            product["name"],
        )

        matched = is_same_product(
            reference_product["name"],
            product["name"],
        )

        if matched:
            product["status"] = "matched"

            matched_products.append(product)

            print(f"{product['site']}: MATCHED")

        else:
            # IMPORTANT:
            # This product stays inside `sites` so the
            # frontend can display it, but it is NOT added
            # to matched_products.
            product["status"] = "different_product"

            print(f"{product['site']}: " "DIFFERENT PRODUCT")

    # ========================================================
    # PRICE COMPARISON
    # ========================================================
    #
    # IMPORTANT:
    # Only matched_products reach compare_prices().
    #
    # Therefore a cheaper but different product can NEVER
    # become the cheapest offer.
    # ========================================================

    result = compare_prices(matched_products)

    # Always use the selected reference product as the
    # displayed comparison product.
    result["product"] = reference_product["name"]

    # Keep ALL site results, including different products.
    result["sites"] = list(site_results)

    return result

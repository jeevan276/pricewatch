class ProductRemovedError(Exception):
    """The retailer explicitly reports a missing/removed listing."""


class ScrapeUnavailableError(Exception):
    """Timeout, blocking, or unparseable data: not proof of removal."""

from abc import ABC, abstractmethod
from urllib.parse import urljoin


class BaseScraper(ABC):

    @abstractmethod
    async def scrape_product(self, url: str) -> dict:
        """
        Scrape complete product information.
        """
        pass

    @abstractmethod
    async def scrape_price(self, url: str) -> float:
        """
        Scrape only the current product price.
        """
        pass

    async def scrape(self, url: str) -> dict:
        return await self.scrape_product(url)

    @staticmethod
    def normalize_url(
        base_url: str,
        relative_url: str | None,
    ) -> str | None:
        """
        Convert relative/protocol-relative URLs into absolute URLs.
        """
        if not relative_url:
            return None

        clean_relative = relative_url.strip()

        if not clean_relative:
            return None

        if clean_relative.startswith("//"):
            scheme = (
                "https:"
                if base_url.startswith("https:")
                else "http:"
            )

            return scheme + clean_relative

        return urljoin(
            base_url,
            clean_relative,
        )
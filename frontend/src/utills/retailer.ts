export function retailerLink(rawUrl: string): { name: string; url: string } | null {
  try {
    const url = new URL(rawUrl);
    const stores: Record<string, string> = {
      "daraz.com.np": "Daraz", "onlinesaathi.com": "OnlineSaathi", "hamrobazaar.com": "HamroBazar",
    };
    const name = stores[url.hostname.toLowerCase().replace(/^www\./, "")];
    if (!name || !["https:", "http:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) return null;
    url.protocol = "https:";
    url.port = "";
    return { name, url: url.href };
  } catch { return null; }
}

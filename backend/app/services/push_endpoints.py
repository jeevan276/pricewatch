"""Push destinations must be real browser push services, not arbitrary URLs."""
import os
from urllib.parse import urlparse

EXACT_HOSTS = {'fcm.googleapis.com', 'android.googleapis.com', 'updates-push.services.mozaws.net'}
SUFFIXES = {'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'}


def validate_push_endpoint(endpoint: str) -> str:
    parsed = urlparse(endpoint)
    host = (parsed.hostname or '').lower()
    additional = {h.strip().lower() for h in os.getenv('PUSH_SERVICE_HOSTS', '').split(',') if h.strip()}
    supported = host in EXACT_HOSTS | additional or any(host == suffix or host.endswith('.' + suffix) for suffix in SUFFIXES)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443) or not supported:
        raise ValueError('Push endpoint must use HTTPS and a supported browser push service.')
    return endpoint

# PriceWatch GPT 2 — additional bug fixes

This archive contains the complete source, including the first scraping/login/tracking reliability update and the additional fixes below. These changes have been validated locally; the live website has not been redeployed.

## Confirmed bugs and fixes

| Area | Bug | Fix |
|---|---|---|
| Comparison request | The frontend sent `onlinesathi_url`, which the backend ignored | Send `onlinesaathi_url`; accept the older spelling for compatibility |
| Comparison validation | Missing or mismatched store URLs could enter a comparison | Require at least two URLs and validate the correct storefront for each field |
| Comparison timeouts | The frontend timed out before the backend scrape deadline | Give comparison requests a 50-second client deadline |
| Product matching | Phone model numbers could be interpreted as RAM; base/Pro models could match in one direction | Preserve model numbers, compare variants symmetrically, and recognize explicit RAM/storage formats |
| Invalid prices | Nonfinite prices could enter comparison results | Reject nonfinite and nonpositive prices |
| Scrape cache | A scraper could return invalid data without raising, and that result would be cached | Validate the product name and price before caching; invalid data remains retryable |
| Product identity | Other retailers' identity-bearing query parameters were discarded | Preserve query parameters except known advertising/tracking parameters |
| Removed listings | OnlineSaathi and HamroBazar 404/410 responses were treated as generic failures | Record explicit removal using the existing availability workflow |
| Product edits | Editing the URL could attach an unrelated product to existing history | Allow URL normalization for the same identity; require separate tracking for a different product |
| Product details | Late responses could replace newer details or manual-check results | Reset details on route/account changes and ignore obsolete requests |
| Product IDs | Nonpositive, fractional or unsafe IDs reached the details workflow | Reject invalid IDs before requesting history |
| Authentication | Protected routes read a snapshot of local storage | Subscribe to auth changes so expiry/logout updates the route without reloading |
| Sign-in destination | Sign-in discarded the requested protected page | Return to the requested internal route after successful authentication |
| Registration | Password length validation did not reflect bcrypt's UTF-8 byte limit | Validate the 72-byte limit in both frontend and backend |
| Auth errors | Validation responses and network timeouts showed misleading messages | Display validation details and distinguish timeout/network failures |
| Unread alerts | API responses omitted the unread count; unread endpoint consumers expected the wrong response shape | Include unread counts and unwrap the response envelope |
| Notification bell | Overlapping polls/read actions could restore old unread state | Derive counts from current alerts and ignore superseded polling responses |
| Account changes | Old private page/notification state could remain visible | Remount private route content and the notification bell when the account changes |
| Push registration | A Pydantic URL object was passed into database operations | Serialize the endpoint before lookup/storage |
| Push ownership | A browser endpoint could be reassigned to another account | Enforce owner checks; return a conflict and rotate the browser subscription |
| Push toggle | A local browser subscription looked enabled even without a matching server subscription | Check the authenticated user's saved endpoints; allow local unsubscribe when a server row is missing or belongs to another account |
| Push destinations | User-supplied arbitrary URLs could become outbound push destinations | Accept only HTTPS browser push services at registration and before sending |
| Notification links | Price alerts opened the retailer and used a missing icon | Open the PriceWatch details page, use the bundled logo, and restrict service-worker navigation to this app's origin |

## Validation

- **55 backend tests passed**, including the earlier reliability/migration tests.
- **19 frontend tests passed**, including comparison payloads, reactive auth, password validation, push ownership recovery, and a delayed manual-check response after navigating to another product.
- Frontend ESLint passed.
- TypeScript checks and the Vite production build passed.

Backend tests use a temporary SQLite database and mock retailer requests, browser operations and notification sending. They do not send real emails/pushes or access the production database. FastAPI's test client emits one dependency deprecation warning; the tests pass.

Commands, from the corresponding directories:

```bash
# backend/
pip install -r requirements-dev.txt
python -m pytest -q

# frontend/
npm ci
npm test
npm run lint
npm run build
```

## Deployment

Replace your repository's source with this version and deploy the backend and frontend together. Keep your existing environment secrets. The ZIP omits dependencies, Git metadata, caches, build output and real environment files.

No new database columns or migrations were added in this second review. If you have not applied the first update, follow [PriceWatch_Fixes.md](PriceWatch_Fixes.md), including `python scripts/migrate.py`. If you already deployed the first update, the migration helper can still run safely during startup.

Push notifications need **both** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, plus `VAPID_CLAIMS_EMAIL`. Standard Google, Mozilla, Apple and Windows push service hosts are allowed. If your deployment uses another trusted browser push provider, set `PUSH_SERVICE_HOSTS` to its exact hostname, or comma-separated hostnames, after verifying the provider. Do not add arbitrary user-entered destinations.

After deployment, verify two retailer URLs in a comparison, unread/read notifications, push enable/disable, logout followed by another account's login, a product details page, and a known removed listing. Clear and re-enable an old push subscription if the browser retains outdated keys.

## Remaining practical limits

The first review's hosting and retailer limitations still apply. Real Daraz scraping and production performance have not been verified here: the earlier outbound request timed out and Chromium installation was unavailable. A sleeping backend cannot continuously monitor prices. Historical prices remain the observations saved since tracking began; this version does not invent earlier prices or introduce a public Daraz history API.

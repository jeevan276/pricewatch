# PriceWatch reliability fixes and deployment

The uploaded source has been updated. These changes are not yet deployed to the live website. Deploy the backend and frontend together to enable the new availability fields and manual checks.

## What changed

| Area | Change | Result |
|---|---|---|
| Daraz scraping | Read the public page's structured product/SKU data through HTTP first; use Chromium only when needed | Avoids a browser launch and rendering on pages with verified embedded data |
| Browser fallback | Reuse one Chromium process, isolate each request in a new context, allow at most two contexts, block images/fonts/media | Lower repeated startup cost and bounded resource use |
| Slow retailer requests | Enforce a 35-second scraping deadline, bounded HTTP/navigation/selector waits and client request deadlines | Failed operations finish and can be retried |
| Duplicate requests | Share an in-flight scrape, briefly cache successful data, normalize Daraz product/SKU identities, make tracking retries idempotent | A repeated submission does not create a duplicate product/history |
| Login and API responsiveness | Reuse database connections, check stale connections, perform synchronous database writes in worker threads, release read transactions before scraping | Scrapes and remote database waits do not block the application's event loop or occupy a database connection throughout the scrape |
| Frontend login | Warm the backend when the sign-in form opens; load other pages and charts lazily | Earlier backend wake-up and less JavaScript needed for sign-in |
| Authentication state | Use a subscribed authentication store; ignore late 401 responses from an older token; broadcast actual session expiry | New sign-ins cannot be erased by an old failed request; no page reload is needed to synchronize auth |
| Tracking form | Separate list loading from tracking; reset pending state after failures; protect newly added products from stale list responses | A slow list request cannot disable tracking, and retry works after failure |
| Changed prices | Repair the incompatible price-update call; save product and initial history atomically | Verified price changes can actually be stored |
| Price history | Save every successful observation, including unchanged prices; explicitly serialize legacy UTC timestamps | A continuous record since monitoring began, with correct timezone display |
| Monitoring job | Group identical URLs, check at most two groups concurrently, use independent short-lived write sessions | One failed product does not stop subsequent checks; the same URL is fetched once per group |
| Product availability | Persist availability, last check, last successful check, removal date and check failures | The details page distinguishes removal, stock status and transient check failures |
| Product details | Add availability notices and a “Check now” button; retain saved history on failed manual/background checks | Users can retry without losing the saved product details |
| Product list | Show removed/out-of-stock badges and provide a Retry button on load failure | Saved products remain navigable, with an explicit recovery action |

Passwords still use bcrypt; password verification has not been weakened to speed up login.

## Removal and recovery behavior

A Daraz HTTP 404/410 or a recognized explicit missing-product response marks a tracked listing as `removed`. Its details page states that it has been removed from Daraz and that the displayed price is the last recorded price. Existing price history remains available.

A CAPTCHA, timeout, HTTP 403/429/5xx, missing selling-price data or another unsuccessful check is a temporary check failure. It does not turn the product into a removed listing, erase history or record a zero price. The last confirmed availability and price are retained. Explicit stock information is recorded separately as `out_of_stock`.

A later successful check clears the error/removal status and resumes observations. Monitoring continues to check removed listings so restored listings can recover automatically. The “Check now” button can also verify a restoration.

The new authenticated endpoint is `POST /products/{product_id}/check`, returning the product and its price history. It checks ownership before fetching the retailer.

## Daraz API and older prices

Daraz Open Platform is an official API platform, not an anonymous public price-history feed. Its product interfaces require an application identity and seller authorization for seller business data. No documented free public endpoint for retrieving arbitrary Nepal listings' historical prices was found in the official documentation reviewed.

The update therefore uses verified public page data and the existing scraping method, without a paid scraping provider or new API key. Open-source scrapers are code you can run yourself; that does not make them a guaranteed free hosted API or supply historical data.

History covers observations already stored in your database and all successful future checks. This update does not fabricate or backfill prices from before tracking began. Structured selling prices are preferred over broad CSS price matches, and SKU identity is preserved when the URL specifies a variant. Aggregate price ranges and unrelated shipping/original-price text are not treated as a verified selling price.

Official documentation reviewed:

- [Daraz Open Platform API reference](https://open.daraz.com/doc/api.htm)
- [Daraz seller authorization](https://developer.alibaba.com/docs/doc.htm?articleId=120222&docType=1&treeId=754)
- [Daraz developer guide and API Explorer](https://open.daraz.com/doc/doc.htm)

## Deploy to the existing site

1. Copy the updated project files into your repository. The archive excludes Git metadata, dependencies, build output and real environment files. Keep your existing deployment secrets.
2. Deploy the backend first. The new `backend/start.sh` runs `python scripts/migrate.py` before Uvicorn starts. On an existing deployment, take a normal database backup before applying schema changes.
3. Deploy the frontend after the backend has started successfully. Keep `VITE_API_BASE_URL` pointed at that backend. For Vercel, use `frontend` as the root directory, `npm ci` as the install command, `npm run build` as the build command and `dist` as the output directory. The existing SPA rewrites are retained.
4. Sign in and test an active Daraz product, a repeat tracking submission, “Check now”, and its history chart. Test a known removed product to confirm removal detection for actual Daraz responses.

Backend commands for a Render-style deployment:

```bash
# Root directory: backend
# Build command:
bash build.sh
# Start command:
bash start.sh
```

The build installs Chromium. The start script no longer downloads a browser while a user waits for a sleeping service to start. Install the Chromium system dependencies required by your deployment image; the environment must be able to launch Playwright's browser.

Existing required environment variables:

```text
DATABASE_URL=<your PostgreSQL connection URL>
JWT_SECRET_KEY=<keep your existing strong secret>
CORS_URL=<optional additional frontend origin>
VAPID_PRIVATE_KEY=<existing setting if using push notifications>
VAPID_CLAIMS_EMAIL=<existing setting if using push notifications>
```

Frontend:

```text
VITE_API_BASE_URL=<your deployed backend URL>
```

Keep `JWT_SECRET_KEY` unchanged to preserve existing valid tokens. Do not commit real secrets.

The migration helper supports:

- A fresh database: create the complete schema and stamp the current migration.
- The original unversioned schema: recognize the existing base/notification tables and add the availability columns.
- An already versioned database: upgrade with Alembic normally.
- A partially missing original schema: stop with an actionable error instead of guessing or deleting data.

Repeated execution is supported. Migration tests confirm saved products and price observations remain intact. The new migration is `e8b90a12c401`, following `d263d2e07c43`. `AUTO_CREATE_TABLES=true` is a local-development convenience only; leave it unset in deployments using migrations.

## Continuous monitoring and hosting limits

The monitoring interval is five minutes while the backend process is running. A sleeping free backend cannot run background jobs or produce observations during its sleep. Frontend warm-up begins waking it earlier but cannot eliminate platform cold starts. Choose a continuously running backend if uninterrupted monitoring and consistently fast first login are required.

Run one scheduler-enabled backend process. If you later scale to multiple workers/replicas, enable `ENABLE_SCHEDULER=true` on only one process and set `ENABLE_SCHEDULER=false` on the others. Each process otherwise runs its own scheduler; this update does not introduce a distributed job coordinator.

Daraz can change its markup, throttle requests or require interactive verification. A blocked response cannot be made into a guaranteed valid scrape merely by changing client code. The scraper now fails within a deadline and preserves the last verified result, so these conditions do not require signing out and back in.

## Validation

Completed locally: **25 backend tests and 10 frontend tests passed**, frontend lint passed, and the production build passed.

Run backend regression checks from `backend/`:

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

Run frontend checks from `frontend/`:

```bash
npm ci
npm test
npm run lint
npm run build
```

Regression coverage includes: verified current selling prices, selected SKUs, stock status, removal versus blocking, HTTP-only success, scrape sharing/cache behavior, timeout recovery, browser reuse/context cleanup, atomic tracking and duplicate retries, changed and unchanged price observations, preservation on failed/removed checks, listing restoration, legacy URL matching, history timestamps, ownership enforcement, event-loop responsiveness, grouped scheduler checks, fresh and existing database migrations, authentication races, form retries, slow lists, account switching, removal notices and manual-check retry.

Live limitations: an outbound Daraz request timed out in this environment, and the Chromium download was unavailable. Browser-pool behavior was tested with mocked Playwright objects; real Daraz browser scraping and production speed must be checked after deployment. No measured production speedup or guarantee of uninterrupted Daraz access is claimed.

# PriceWatch final — target-price email alerts

This codebase includes both earlier reliability updates, plus a manual price threshold for each tracked product, email notifications and retailer buying links. The live website has not been redeployed.

## How to use it

1. Sign in, track a product and open its **Details** page.
2. Enter a **Target price (Rs.)** and click **Save target**. Each product has its own target; you can change it or click **Remove alert**.
3. When a successful retailer check verifies an available product at or below the target, PriceWatch queues an email to the email address of the account that owns that product. Exact equality triggers the alert too.
4. The email states that the product reached the target and you may want to buy it. It includes the target, observed price, **Buy on Daraz / OnlineSaathi / HamroBazar** button and a plain link. The same buying button is on the product details page.

Buying links open the specific retailer product page, including its product/SKU identity. Use the retailer's own Buy Now/purchase controls there. A portable direct checkout URL cannot safely bypass the retailer's login, cart and variant selection.

Saving a target does not send an email from a stale cached price. The **next successful check** evaluates it, including when the price is unchanged and is already below the new target. Use **Check now** to evaluate sooner. Price checks run every five minutes while the backend is active; email delivery checks its queue every minute and on startup.

An alert fires once per threshold crossing. Repeated checks at or below the target do not create repeated emails. A verified price above the target re-arms it. Changing the target also re-arms it; submitting the identical target does not. Timeouts, CAPTCHA/blocked responses, unverified prices, removed listings and out-of-stock observations do not trigger a buying email.

## Email configuration — required before real delivery

The existing app already uses Resend for its support form. Threshold alerts use the same provider and API key, with an explicit HTTP deadline and per-event idempotency key. Configure these backend environment variables in your hosting dashboard; keep them out of the frontend and Git:

```text
RESEND_API_KEY=<your Resend sending API key>
PRICE_ALERT_FROM_EMAIL=PriceWatch <alerts@your-verified-domain.com>
ENABLE_SCHEDULER=true
```

If `PRICE_ALERT_FROM_EMAIL` is unset, the app falls back to the existing `CONTACT_FROM_EMAIL`. The recipient comes from the signed-in account's database record; it cannot be selected by changing the threshold API payload. Keep the existing `CONTACT_EMAIL` and other support settings if using the contact form.

Use a sender on a domain you have verified in Resend and an API key with sending permission. Resend's default testing sender is restricted, so it is not a general production sender for all registered users. Follow the provider's [domain verification guide](https://resend.com/docs/dashboard/domains/introduction) and [testing-domain restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

If email settings are missing, the details page explains that email alerts are temporarily unavailable. Targets and queued emails remain saved. Queue failures are retried with increasing delays (up to six hours); adding/fixing configuration allows delivery on a later retry. The configured flag checks the presence of settings, not whether the provider will accept a sender or deliver to an inbox.

## Database upgrade and deployment

This version **requires a new migration**, `f4c2d890ab31`, after `e8b90a12c401`. It adds `target_price` and `threshold_reached` to products and creates the `threshold_emails` queue. Existing targets default to unset; existing users, products and price history remain intact.

From `backend/`, with the deployment's existing database settings:

```bash
pip install -r requirements.txt
python scripts/migrate.py
```

The existing `start.sh` already runs this migration helper. It handles a fresh database, the original unversioned schema, and a previously migrated deployment. Keep your existing `DATABASE_URL`, `JWT_SECRET_KEY`, frontend API URL and push settings. Take a normal database backup before deploying a schema upgrade. Deploy backend first, then frontend.

Frontend build, from `frontend/`:

```bash
npm ci
npm run build
```

No new dependencies were added. See [PriceWatch_Fixes.md](PriceWatch_Fixes.md) for the retained Playwright/browser and Vercel/Render deployment setup. See [CHANGELOG_GPT_2.md](CHANGELOG_GPT_2.md) for the second review's fixes. Test totals in those earlier documents describe those earlier versions.

Run a single scheduler-enabled backend process; use `ENABLE_SCHEDULER=false` for additional API workers. A sleeping free backend cannot monitor prices or send queued messages during sleep. Continuous operation is required for timely automatic alerts.

## Delivery reliability

The observed price, threshold state and queued email are committed in one database transaction. Product row locks serialize overlapping manual and scheduled checks on PostgreSQL. Email delivery happens in a separate background job, so provider latency does not slow down the manual check or threshold-save API.

The queue survives backend restarts. Workers claim a message with a short lease, release their database connection before calling Resend, and persist either provider acceptance or a retry. Expired leases recover after a stopped worker. HTML escapes product names; buying URLs are restricted to supported retailer domains. Editing/removing a threshold cancels unsent messages for the old target; deleting the product removes its queue entries. A message already handed to the email provider cannot be recalled.

Each event has a unique UUID and a stable Resend idempotency key for retries. Resend documents a **24-hour** idempotency window; this reduces duplicate sends after an uncertain response, rather than promising exactly-once delivery across arbitrarily long outages. See [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys). A `sent` queue status means the provider accepted the email, not proof of inbox delivery.

For server-side inspection, the `threshold_emails` table records `status`, `attempts`, `next_attempt_at`, a generic `last_error` and `sent_at`. There is no public API exposing other users' email queue data.

## Verification

Completed locally: **74 backend tests and 25 frontend tests passed**, frontend lint passed, and TypeScript/Vite production build passed. Database upgrade checks cover fresh, original and previous-review schemas, with existing products and history preserved. The backend test client emits one dependency deprecation warning; the tests pass.

Tests cover the earlier fixes plus threshold validation and ownership, equality/below-target triggers, re-arming, unchanged-price checks, availability failures, atomic queue creation, retry/restart recovery, cancellation/deletion, safe email HTML, all three retailers' links, signed-in email recipients, the Resend request and frontend save/remove/retry flows.

Run these checks:

```bash
# backend/
pip install -r requirements-dev.txt
python -m pytest -q

# frontend/
npm test
npm run lint
npm run build
```

Provider requests are mocked in tests; no real emails are sent and no production database is touched. Real inbox delivery still needs a smoke test after setting your own email credentials and deploying. Live Daraz/browser access and production speed retain the earlier environment limitations. Prices and stock can change after an observation; users should confirm the current offer on the retailer's page.

## API

Authenticated, owner-scoped endpoint:

```http
PATCH /products/{product_id}/threshold
Authorization: Bearer <token>
Content-Type: application/json

{"target_price": 2500.50}
```

Send `{"target_price": null}` to remove the target. Valid amounts range from Rs. 0.01 to Rs. 10,000,000, with at most two decimal places. The response is the updated product. Product responses now include `target_price`, `threshold_reached` and `email_alerts_available`.

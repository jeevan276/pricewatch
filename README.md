# PriceWatch

Price tracking for Daraz Nepal, OnlineSaathi and HamroBazar. React/TypeScript frontend; FastAPI, PostgreSQL and Playwright backend.

This is the final version, retaining both reliability reviews and adding target-price email alerts and retailer buying buttons.
Start with [FINAL_SETUP.md](FINAL_SETUP.md) for the new feature, email configuration and database upgrade.
See [CHANGELOG_GPT_2.md](CHANGELOG_GPT_2.md) for the second review's fixes and its test results.
See [PriceWatch_Fixes.md](PriceWatch_Fixes.md) for the first update, deployment commands, migration instructions and remaining hosting/retailer limitations.

## Quick start

Backend (run from `backend/`, with your own environment variables configured):

```bash
python -m venv .venv
# Activate the environment using your shell's activation command.
pip install -r requirements.txt
python -m playwright install chromium
python scripts/migrate.py
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend (run from `frontend/`):

```bash
npm ci
npm run dev
```

Required backend settings: `DATABASE_URL`, `JWT_SECRET_KEY`.
Frontend setting: `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000` for development).

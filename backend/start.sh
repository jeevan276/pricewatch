#!/usr/bin/env bash
set -euo pipefail

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/render/project/src/ms-playwright}"

# Install Chromium during build, not while a user waits for cold startup.
python scripts/migrate.py

uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

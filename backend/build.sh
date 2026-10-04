#!/usr/bin/env bash
set -euo pipefail

# Keep browsers inside the project so Render ships them with the deploy.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/render/project/src/ms-playwright}"

pip install -r requirements.txt
python -m playwright install chromium

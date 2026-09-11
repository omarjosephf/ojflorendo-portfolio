#!/bin/bash
# Project Zero session bootstrap.
#
# Installs dependencies and reports repository state so a fresh session does
# not spend its first turns rediscovering where the work actually is.
# Web/remote sessions only; local machines keep their own setup.

set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Dependencies. npm ci keeps lockfile fidelity (handbook 8.3); skipping the
# reinstall when node_modules is already populated keeps the hook idempotent
# and takes advantage of the cached container state.
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm ci --no-audit --no-fund
fi

# PDF tooling. Screenshots, reports and specifications arrive as PDFs, and this
# image ships neither poppler nor a working PDF library: the system
# `cryptography` has a Rust binding that panics on import, which takes pypdf down
# with it. Installing over it fixes that; pymupdf rasterises pages without
# poppler, so an image-only PDF (a screenshot) can be rendered and read rather
# than coming back as zero characters of text.
if ! python3 -c "import pymupdf, pypdf" >/dev/null 2>&1; then
  pip install --quiet --upgrade cryptography pypdf pymupdf >/dev/null 2>&1 \
    || echo "note: PDF tooling unavailable this session; PDFs may be unreadable"
fi

echo "--- Project Zero repository state ---"

git fetch origin --prune --quiet 2>/dev/null || echo "note: git fetch failed (offline or restricted egress)"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
head="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "branch: ${branch} @ ${head}"

if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  main="$(git rev-parse --short origin/main)"
  behind="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo '?')"
  ahead="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo '?')"
  echo "origin/main: ${main} (this checkout is ${behind} behind, ${ahead} ahead)"
  if [ "${behind}" != "0" ] && [ "${behind}" != "?" ]; then
    echo "WARNING: this checkout is behind origin/main. Verify the revision before running any gate."
  fi
fi

# The container's prebuilt Chromium can disagree with the version Playwright
# pins, which fails every browser test for an environment reason rather than a
# product one. Say so up front instead of mid-gate.
if [ -d /opt/pw-browsers ] && [ -f node_modules/@playwright/test/package.json ]; then
  pinned="$(node -p "require('./node_modules/@playwright/test/package.json').version" 2>/dev/null || echo unknown)"
  echo "playwright: ${pinned} pinned; available browsers: $(ls /opt/pw-browsers 2>/dev/null | tr '\n' ' ')"
  echo "note: if the prebuilt Chromium build does not match this Playwright version,"
  echo "      browser suites fail on launch. Rely on CI for browser evidence."
fi

echo "state doc: docs/state/CURRENT.md (if present) records open blockers"
echo "--- end repository state ---"

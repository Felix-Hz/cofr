#!/usr/bin/env bash
# Served at cofr.cash/install.sh — fetches and runs the canonical installer.
set -euo pipefail
exec bash <(curl -fsSL https://raw.githubusercontent.com/felix-hz/cofr/main/scripts/install.sh) "$@"

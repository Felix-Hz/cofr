# Served at cofr.cash/install.ps1 — fetches and runs the canonical installer.
$url = "https://raw.githubusercontent.com/felix-hz/cofr/main/scripts/install.ps1"
Invoke-Expression (Invoke-WebRequest -Uri $url -UseBasicParsing).Content

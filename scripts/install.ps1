#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$INSTALL_DIR = if ($env:COFR_DIR) { $env:COFR_DIR } else { "$env:USERPROFILE\.cofr" }

if ($env:COFR_VERSION) {
    $COFR_VERSION = $env:COFR_VERSION
} else {
    try {
        $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/felix-hz/cofr/releases/latest" -UseBasicParsing
        $COFR_VERSION = $rel.tag_name
    } catch {
        $COFR_VERSION = "main"
    }
}

$GIT_REF    = $COFR_VERSION
$GITHUB_RAW = "https://raw.githubusercontent.com/felix-hz/cofr/$GIT_REF"

function Write-Step  { param($msg) Write-Host "  $msg" -ForegroundColor DarkGray }
function Write-Ok    { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Fatal { param($msg) Write-Host "error: $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "cofr self-hosted installer" -ForegroundColor White
Write-Host ""

# --- prereq check ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fatal "Docker not found. Install Docker Desktop from https://docs.docker.com/get-docker/ and re-run."
}

# --- dirs ---
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\infra"        | Out-Null
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\apps\server"  | Out-Null
Set-Location $INSTALL_DIR

# --- secret helpers ---
# Use instance API — the static GetBytes overload requires .NET 6+ (PS 7.2+).
function New-RandomBytes { param([int]$count)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $count
    $rng.GetBytes($buf)
    $rng.Dispose()
    return $buf
}

function New-HexSecret { param([int]$bytes)
    return [System.BitConverter]::ToString((New-RandomBytes $bytes)).Replace('-', '').ToLower()
}

function New-FernetKey {
    $b64 = [Convert]::ToBase64String((New-RandomBytes 32))
    return $b64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

# --- env files (idempotent) ---
$infraEnv  = Join-Path $INSTALL_DIR "infra\.env"
$serverEnv = Join-Path $INSTALL_DIR "apps\server\.env"

if (-not (Test-Path $infraEnv)) {
    $pgPass = New-HexSecret 32
    @"
POSTGRES_USER=cofr
POSTGRES_DB=cofr
POSTGRES_PASSWORD=$pgPass
"@ | Set-Content $infraEnv -Encoding UTF8
    Write-Step "created infra\.env"
} else {
    Write-Step "infra\.env exists, skipping"
    $pgPass = (Get-Content $infraEnv | Where-Object { $_ -match '^POSTGRES_PASSWORD=' }) -replace '^POSTGRES_PASSWORD=', ''
}

if (-not (Test-Path $serverEnv)) {
    $jwtSecret = New-HexSecret 64
    $encKey    = New-FernetKey
    $domain    = if ($env:COFR_DOMAIN) { $env:COFR_DOMAIN } else { "localhost" }
    $baseUrl   = if ($domain -eq "localhost") { "http://localhost:8080" } else { "https://$domain" }
    @"
ENV=production
DATABASE_URL=postgresql://cofr:${pgPass}@postgres:5432/cofr
JWT_SECRET=$jwtSecret
ENCRYPTION_KEY=$encKey
FRONTEND_URL=$baseUrl
API_URL=$baseUrl/api
"@ | Set-Content $serverEnv -Encoding UTF8
    Write-Step "created apps\server\.env"
} else {
    Write-Step "apps\server\.env exists, skipping"
}

# --- fetch compose files ---
Write-Step "downloading compose files..."
$wc = New-Object System.Net.WebClient
$wc.DownloadFile("$GITHUB_RAW/infra/docker-compose.yml",          "$INSTALL_DIR\infra\docker-compose.yml")
$wc.DownloadFile("$GITHUB_RAW/infra/docker-compose.selfhost.yml", "$INSTALL_DIR\infra\docker-compose.selfhost.yml")
$wc.DownloadFile("$GITHUB_RAW/infra/Caddyfile.selfhost",          "$INSTALL_DIR\infra\Caddyfile.selfhost")

# --- start ---
Write-Step "pulling images and starting services..."
$domain = if ($env:COFR_DOMAIN) { $env:COFR_DOMAIN } else { "localhost" }
$env:COFR_DOMAIN  = $domain
$env:COFR_VERSION = $COFR_VERSION

Push-Location "$INSTALL_DIR\infra"
docker compose -p cofr -f docker-compose.yml -f docker-compose.selfhost.yml up -d
Pop-Location

# --- health check ---
Write-Step "waiting for cofr to be ready..."
$healthUrl = "http://localhost/health"
$ready = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 4
}
if (-not $ready) {
    Write-Fatal "cofr did not become healthy in time. Check logs: docker compose -p cofr logs"
}

# --- done ---
Write-Host ""
Write-Ok "cofr is running"
Write-Host ""
if ($domain -eq "localhost") {
    Write-Host "  -> http://localhost:8080"
} else {
    Write-Host "  -> https://$domain"
}
Write-Host ""
Write-Step "Logs:  docker compose -p cofr logs -f"
Write-Step "Stop:  docker compose -p cofr down"
Write-Step "Data:  $INSTALL_DIR"
Write-Host ""

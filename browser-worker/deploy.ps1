param(
  [Parameter(Mandatory)]
  [string]$CloudflareApiToken,
  [string]$WorkerName = "munch-scraper",
  [string]$AccountId
)

$ErrorActionPreference = "Stop"

Write-Host "=== Munch Scraper Cloudflare Worker Deploy ===" -ForegroundColor Cyan

# Validate token
if ($CloudflareApiToken.Length -lt 20) {
  Write-Error "API token looks invalid (too short)"
  exit 1
}

# If AccountId not provided, try to get it from the API token
if (-not $AccountId) {
  Write-Host "Fetching account ID from Cloudflare API..." -ForegroundColor Yellow
  try {
    $resp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" `
      -Headers @{ Authorization = "Bearer $CloudflareApiToken" } `
      -TimeoutSec 10
    if (-not $resp.success -or $resp.result.Count -eq 0) {
      Write-Error "Could not find any Cloudflare accounts. Check your API token."
      exit 1
    }
    $AccountId = $resp.result[0].id
    Write-Host "Found account: $($resp.result[0].name) (ID: $AccountId)" -ForegroundColor Green
  } catch {
    Write-Error "Failed to fetch accounts: $_"
    exit 1
  }
}

# Read the worker script
$workerDir = Split-Path -Parent $PSCommandPath
$workerScript = Get-Content -Path "$workerDir\worker.js" -Raw -Encoding UTF8

# Deploy the worker
Write-Host "Deploying worker '$WorkerName'..." -ForegroundColor Yellow

$body = @{
  name = $WorkerName
  main = @{ name = "worker.js"; content = $workerScript }
  compatibility_date = "2025-04-01"
} | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts/$WorkerName" `
    -Method Put `
    -Headers @{
      Authorization = "Bearer $CloudflareApiToken"
      "Content-Type" = "application/json"
    } `
    -Body $body `
    -TimeoutSec 30

  if ($resp.success) {
    Write-Host "Deployed!" -ForegroundColor Green
  } else {
    Write-Host "Deploy may have failed:" -ForegroundColor Red
    $resp | ConvertTo-Json -Depth 5
  }
} catch {
  Write-Error "Deployment failed: $_"
  exit 1
}

# Create a route/subdomain
Write-Host "Creating workers.dev route..." -ForegroundColor Yellow
try {
  $routeBody = @{
    pattern = "$WorkerName.$($AccountId.Substring(0,8)).workers.dev/*"
    script = $WorkerName
  } | ConvertTo-Json
  
  $resp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/domains/records" `
    -Method Post `
    -Headers @{
      Authorization = "Bearer $CloudflareApiToken"
      "Content-Type" = "application/json"
    } `
    -Body $routeBody `
    -TimeoutSec 15

  if ($resp.success) {
    Write-Host "Route created!" -ForegroundColor Green
  }
} catch {
  # Route creation might fail if already exists or not needed
  Write-Host "Route setup note: $_" -ForegroundColor Yellow
}

# Get the worker URL
Write-Host "`n=== Done! ===" -ForegroundColor Cyan
Write-Host "Your Cloudflare Worker is deployed!" -ForegroundColor Green
Write-Host "Worker URL: https://$WorkerName.workers.dev" -ForegroundColor Yellow
Write-Host "`nTo use with the MCP server, set this environment variable:" -ForegroundColor White
Write-Host "MUNCH_CF_WORKER_URL=https://$WorkerName.workers.dev/scrape" -ForegroundColor Cyan
Write-Host "`nTest it:" -ForegroundColor White
Write-Host "curl https://$WorkerName.workers.dev/scrape?url=https://example.com" -ForegroundColor Gray

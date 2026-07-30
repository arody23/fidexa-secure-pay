# Verifie PayPal local + Edge Function Supabase
# Usage:
#   $env:PAYPAL_CLIENT_ID = "votre_client_id"
#   $env:PAYPAL_CLIENT_SECRET = "votre_secret"
#   $env:VITE_SUPABASE_URL = "https://xxx.supabase.co"
#   $env:VITE_SUPABASE_PUBLISHABLE_KEY = "eyJ..."
#   .\scripts\verify-paypal-setup.ps1 -LinkId "pay_xxx"

param(
  [Parameter(Mandatory = $true)]
  [string]$LinkId
)

$ErrorActionPreference = "Stop"

$clientId = $env:PAYPAL_CLIENT_ID
$clientSecret = $env:PAYPAL_CLIENT_SECRET
$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_PUBLISHABLE_KEY

if (-not $clientId -or -not $clientSecret) {
  Write-Host "Definissez PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "[1/2] Test OAuth PayPal sandbox (local)..." -ForegroundColor Cyan
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${clientId}:${clientSecret}"))
try {
  $token = Invoke-RestMethod -Uri "https://api-m.sandbox.paypal.com/v1/oauth2/token" -Method POST `
    -Headers @{ Authorization = "Basic $cred"; "Content-Type" = "application/x-www-form-urlencoded" } `
    -Body "grant_type=client_credentials"
  Write-Host "  OK - token obtenu" -ForegroundColor Green
}
catch {
  Write-Host "  ECHEC - Client ID / Secret invalides cote PayPal." -ForegroundColor Red
  exit 1
}

if (-not $supabaseUrl -or -not $anonKey) {
  Write-Host "[2/2] Skip - definissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "[2/2] Test Edge Function avec linkId=$LinkId ..." -ForegroundColor Cyan
$headers = @{
  "Content-Type" = "application/json"
  Authorization  = "Bearer $anonKey"
  apikey         = $anonKey
}
$body = @{ linkId = $LinkId } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/paypal-create-order" -Method POST -Headers $headers -Body $body
  Write-Host "  OK - orderId=$($r.orderId)" -ForegroundColor Green
  exit 0
}
catch {
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $raw = $reader.ReadToEnd()
  try { $payload = $raw | ConvertFrom-Json } catch { $payload = @{ error = $raw } }
  $msg = [string]$payload.error

  if ($msg -match "invalid_client|PayPal auth failed") {
    Write-Host "  ECHEC - secrets Supabase incorrects." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Dashboard -> Edge Functions -> Secrets :" -ForegroundColor Yellow
    Write-Host "    PAYPAL_CLIENT_ID     = meme valeur que VITE_PAYPAL_CLIENT_ID"
    Write-Host "    PAYPAL_CLIENT_SECRET = Secret FidexaPay sandbox (sans guillemets)"
    Write-Host "    PAYPAL_ENV           = sandbox"
    Write-Host "    PAYPAL_WEBHOOK_ID    = 53482566LD191283K"
    exit 1
  }

  Write-Host "  Reponse : $msg" -ForegroundColor Yellow
  exit 1
}

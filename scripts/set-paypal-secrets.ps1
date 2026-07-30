# Configure les secrets PayPal sur Supabase (apres `npx supabase login`)
# Usage:
#   $env:PAYPAL_CLIENT_SECRET = "votre_secret"
#   .\scripts\set-paypal-secrets.ps1

$ErrorActionPreference = "Stop"
$projectRef = "dkmbtwczuheyyxvuypml"
$clientId = "BAA5mbCfF_565d3p_bPCeZbnleR1gDIRlfqokv-rZ10n40RlzGEAOf7DI4JTtuqaI543tlVUQUkzvtNrZQ"
$clientSecret = $env:PAYPAL_CLIENT_SECRET

if (-not $clientSecret) {
  Write-Host "Definissez PAYPAL_CLIENT_SECRET (developer.paypal.com -> FidexaPay -> Show secret)." -ForegroundColor Yellow
  exit 1
}

Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  npx supabase secrets set `
    PAYPAL_CLIENT_ID="$clientId" `
    PAYPAL_CLIENT_SECRET="$clientSecret" `
    PAYPAL_ENV="sandbox" `
    PAYPAL_WEBHOOK_ID="53482566LD191283K" `
    --project-ref $projectRef
  Write-Host "Secrets PayPal mis a jour sur Supabase." -ForegroundColor Green
}
finally {
  Pop-Location
}

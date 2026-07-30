# Génère un access token PayPal sandbox pour MCP local (@paypal/mcp).
# Usage: .\scripts\paypal-mcp-token.ps1
# Le token expire ~9 h — régénérez si le MCP PayPal ne répond plus.

$clientId = $env:PAYPAL_CLIENT_ID
$clientSecret = $env:PAYPAL_CLIENT_SECRET

if (-not $clientId -or -not $clientSecret) {
  Write-Error "Définissez PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET (ou copiez depuis Supabase secrets)."
  exit 1
}

$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${clientId}:${clientSecret}"))
$res = Invoke-RestMethod -Uri "https://api-m.sandbox.paypal.com/v1/oauth2/token" -Method POST `
  -Headers @{ Authorization = "Basic $cred"; "Content-Type" = "application/x-www-form-urlencoded" } `
  -Body "grant_type=client_credentials"

Write-Host "Token (copier dans mcp.json → paypal-local → PAYPAL_ACCESS_TOKEN):"
Write-Host $res.access_token
Write-Host "`nExpire dans $($res.expires_in) secondes."

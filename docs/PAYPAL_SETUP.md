# PayPal Fidexa — Configuration

## 1. Secrets Supabase (OBLIGATOIRE)

Dashboard → **Project Settings → Edge Functions → Secrets** :

| Secret | Valeur |
|--------|--------|
| `PAYPAL_CLIENT_ID` | Client ID FidexaPay sandbox |
| `PAYPAL_CLIENT_SECRET` | Secret key (ne jamais committer) |
| `PAYPAL_ENV` | `sandbox` (puis `live` en prod) |
| `PAYPAL_WEBHOOK_ID` | `53482566LD191283K` (webhook FidexaPay sandbox) |

Ou via CLI :

```bash
npx supabase secrets set PAYPAL_WEBHOOK_ID="53482566LD191283K" --project-ref dkmbtwczuheyyxvuypml
```

Les 4 secrets PayPal requis :

```bash
npx supabase secrets set PAYPAL_CLIENT_ID="..." PAYPAL_CLIENT_SECRET="..." PAYPAL_ENV=sandbox PAYPAL_WEBHOOK_ID="53482566LD191283K" --project-ref dkmbtwczuheyyxvuypml
```

Les Edge Functions utilisent aussi automatiquement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Frontend (.env local — déjà configuré)

```env
VITE_PAYPAL_ENABLED=true
VITE_PAYPAL_CLIENT_ID=...
VITE_PAYPAL_ENV=sandbox
```

Redémarrer `npm run dev` après modification.

## 3. Webhook PayPal Sandbox

1. [developer.paypal.com](https://developer.paypal.com) → App **FidexaPay** → **Webhooks**
2. URL : `https://dkmbtwczuheyyxvuypml.supabase.co/functions/v1/paypal-webhook`
3. Événements : `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.Capture.Denied`
4. Webhook ID FidexaPay sandbox : **`53482566LD191283K`** → secret Supabase `PAYPAL_WEBHOOK_ID`

## 4. Tester une carte sandbox

Sur `/pay/:linkId`, cliquez le bouton PayPal puis **« Payer par carte »** (guest checkout).

Cartes **officielles** PayPal Sandbox ([doc](https://developer.paypal.com/tools/sandbox/card-testing/)) :

| Type | Numéro | Expiration | CVV |
|------|--------|------------|-----|
| **Visa** (recommandé) | `4012888888881881` | `12/2028` (ou toute date future) | `123` |
| Visa | `4005519200000004` | `12/2028` | `123` |
| Mastercard | `2223000048400011` | `12/2028` | `123` |

Règles importantes :
- Pays de facturation : **France** si demandé (compte sandbox FR / EUR).
- Nom sur la carte : un nom normal (ne pas utiliser `CCREJECT-*` — triggers de refus test).
- Si « carte invalide » persiste : générez une carte liée à votre sandbox sur [PayPal Card Testing](https://developer.paypal.com/tools/sandbox/card-testing/) (pays **France**, type Visa).

**Alternative plus simple** : connectez-vous avec un **compte acheteur sandbox** PayPal (Personal) au lieu d’une carte — voir [Sandbox accounts](https://developer.paypal.com/tools/sandbox/accounts/).

## 5. MCP PayPal dans Cursor

Fichier : `%USERPROFILE%\.cursor\mcp.json` (Windows)

### Option A — Local (recommandé sandbox)

Générer un access token :

```powershell
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("CLIENT_ID:CLIENT_SECRET"))
Invoke-RestMethod -Uri "https://api-m.sandbox.paypal.com/v1/oauth2/token" -Method POST -Headers @{Authorization="Basic $cred"; "Content-Type"="application/x-www-form-urlencoded"} -Body "grant_type=client_credentials"
```

Puis dans `mcp.json` :

```json
{
  "mcpServers": {
    "paypal": {
      "command": "npx",
      "args": ["-y", "@paypal/mcp", "--tools=all"],
      "env": {
        "PAYPAL_ACCESS_TOKEN": "VOTRE_TOKEN_ICI",
        "PAYPAL_ENVIRONMENT": "SANDBOX"
      }
    }
  }
}
```

> Le token expire (~9 h). Régénérez-le ou utilisez l’option remote avec login PayPal.

### Option B — Remote (login OAuth PayPal)

```json
{
  "mcpServers": {
    "paypal-mcp-server": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.sandbox.paypal.com/sse"]
    }
  }
}
```

Redémarrer Cursor → se connecter à PayPal sandbox quand demandé.

## 6. Edge Functions déployées

| Function | Rôle | JWT |
|----------|------|-----|
| `paypal-create-order` | Crée order PayPal | off (client anonyme) |
| `paypal-capture-order` | Capture après approbation | off |
| `paypal-webhook` | Backup confirmation | off |

## 7. Flux paiement

1. Client ouvre lien `/pay/:linkId`
2. Boutons PayPal (Visa/MC/carte)
3. `paypal-create-order` → order ID
4. Client paie sur popup PayPal
5. `paypal-capture-order` → `is_paid=true`, escrow actif
6. Redirection `/order/:linkId`

## 8. Dépannage — `invalid_client` / `PayPal auth failed`

Si le paiement échoue avec `Client Authentication failed` :

1. **Testez vos clés localement** (sans les coller dans le chat) :
   ```powershell
   $env:PAYPAL_CLIENT_ID = "votre_client_id"
   $env:PAYPAL_CLIENT_SECRET = "votre_secret"
   cd fidexa-secure-pay
   .\scripts\verify-paypal-setup.ps1
   ```
2. Si **[1/2] OK** mais **[2/2] ECHEC** → les secrets **Supabase** sont faux (pas le code).
3. Dans **Supabase → Edge Functions → Secrets**, vérifiez :
   - `PAYPAL_CLIENT_ID` = **exactement** la même valeur que `VITE_PAYPAL_CLIENT_ID` dans `.env`
   - `PAYPAL_CLIENT_SECRET` = Secret de l’app **FidexaPay sandbox** (pas le Client ID)
   - `PAYPAL_ENV` = **`sandbox`** uniquement (pas une URL, pas de guillemets)
   - Pas d’espaces avant/après les valeurs
4. Supprimez et recréez un secret si doute (copier depuis PayPal Developer → Show).
5. Attendez ~1 minute, retestez un paiement.

Les erreurs `Unchecked runtime.lastError` / `useCache` viennent d’**extensions Chrome**, pas de Fidexa.

## 9. Passage Live

1. App Live sur developer.paypal.com
2. Secrets `PAYPAL_ENV=live` + clés Live
3. `VITE_PAYPAL_ENV=live` + Client ID Live
4. Webhook URL identique (fonctions Supabase)
5. Compte Business vérifié + Advanced Card Processing si requis

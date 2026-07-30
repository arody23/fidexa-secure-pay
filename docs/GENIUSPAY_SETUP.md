# GeniusPay — FidexaPay (Mobile Money)

## Secrets Supabase (Edge Functions)

| Secret | Description |
|--------|-------------|
| `GENIUSPAY_API_KEY` | Clé publique (`pk_live_...` ou sandbox) — header `X-API-Key` |
| `GENIUSPAY_API_SECRET` | Secret serveur (`sk_live_...`) — jamais côté client |
| `GENIUSPAY_BASE_URL` | `https://geniuspay.ci/api/v1/merchant` |
| `GENIUSPAY_ENV` | `sandbox` ou `live` |
| `GENIUSPAY_WEBHOOK_SECRET` | Secret webhook `whsec_...` |
| `GENIUSPAY_PAYOUT_WALLET_ID` | (optionnel) UUID wallet payout — sinon auto-détection via `GET /wallets` |

## Frontend (.env)

```
VITE_GENIUSPAY_ENABLED=true
VITE_GENIUSPAY_PAYOUT_ENABLED=true
VITE_PAYPAL_ENABLED=false
```

## Payout prestataires (retraits)

| Fonction | Rôle |
|----------|------|
| `geniuspay-create-payout` | Admin : approuve + déclenche payout Mobile Money |
| `geniuspay-webhook` | Met à jour le retrait sur `payout.completed` / `payout.failed` |

Webhook — cocher dans GeniusPay :
- `cashout.requested`, `cashout.approved`, `cashout.completed`, `cashout.failed`
- (legacy doc payout API : `payout.*` — géré aussi par notre webhook si activé un jour)

Flux admin FidexaPay : **Approuver et payer** → payout GeniusPay vers le numéro du prestataire.
Fallback manuel : **Approuver (manuel)** → payer hors app → **Marquer payé**.

## Webhook production

URL à configurer dans le dashboard GeniusPay (environnement **Production**) :

```
https://dkmbtwczuheyyxvuypml.supabase.co/functions/v1/geniuspay-webhook
```

Secrets Supabase déjà attendus en live :
- `GENIUSPAY_API_KEY` = `pk_live_...`
- `GENIUSPAY_API_SECRET` = `sk_live_...`
- `GENIUSPAY_WEBHOOK_SECRET` = `whsec_...`
- `GENIUSPAY_ENV` = `live`

Événements **encaissement** : `payment.success`, `payment.failed`, `payment.cancelled`

## Webhook sandbox

URL à configurer dans le dashboard GeniusPay :

```
https://dkmbtwczuheyyxvuypml.supabase.co/functions/v1/geniuspay-webhook
```

Événements **encaissement** : `payment.success`, `payment.failed`, `payment.cancelled`

Événements **retraits prestataires (cashout)** — pas `payout.*` dans le dashboard actuel :
`cashout.requested`, `cashout.approved`, `cashout.completed`, `cashout.failed`

> L’API `/payouts` + wallets (labpay) est une bêta séparée. Le dashboard marchand standard utilise **cashout.*** pour les webhooks de décaissement.

## Edge Functions

| Fonction | Rôle |
|----------|------|
| `geniuspay-create-payment` | Crée le paiement + renvoie `checkoutUrl` |
| `geniuspay-webhook` | Confirme `is_paid` + statuts payout retraits |
| `geniuspay-verify-payment` | Vérifie le statut au retour client |
| `geniuspay-create-payout` | Payout Mobile Money vers prestataire (admin) |

## Conversion devises

GeniusPay convertit **automatiquement** vers le solde marchand XOF.

FidexaPay envoie le montant **dans la devise du lien** :
- `FCFA` / `XAF` → `XOF` (1:1, même zone CFA)
- `CDF`, `USD`, `EUR` → envoyés tels quels (conversion GeniusPay)
- Autres devises → fallback USD puis conversion GeniusPay

Ne pas reconvertir côté Fidexa pour l’encaissement (évite les écarts de taux).

Taux indicatif marché (UI uniquement) : 1 USD ≈ 571,85 XOF.

## Test local

1. `npm run dev`
2. Ouvrir un lien `/pay/:linkId`
3. Saisir pays + téléphone Mobile Money
4. « Payer avec Mobile Money » → checkout GeniusPay sandbox
5. Après paiement → retour `/pay/:linkId?geniuspay=success` → `/order/:linkId`

## Déploiement

```powershell
npx supabase secrets set GENIUSPAY_API_KEY="..." GENIUSPAY_API_SECRET="..." GENIUSPAY_BASE_URL="https://geniuspay.ci/api/v1/merchant" GENIUSPAY_ENV=sandbox --project-ref dkmbtwczuheyyxvuypml

npx supabase functions deploy geniuspay-create-payment geniuspay-webhook geniuspay-verify-payment geniuspay-create-payout --no-verify-jwt --project-ref dkmbtwczuheyyxvuypml
```

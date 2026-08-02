# KPay — FidexaPay (Mobile Money)

Remplace GeniusPay. Sandbox d’abord (`kpay_test_` / `sk_test_`), puis live après KYC (`kpay_live_` / `sk_live_`).

## Secrets Supabase Edge Functions

| Secret | Description |
| --- | --- |
| `KPAY_API_KEY` | Clé publique (`kpay_test_...` ou `kpay_live_...`) — header `X-API-Key` |
| `KPAY_SECRET_KEY` | Secret serveur (header `X-Secret-Key`) — coller **exactement** la valeur du dashboard (souvent hex brut sans préfixe `sk_test_`) |
| `KPAY_BASE_URL` | Optionnel — défaut `https://admin.kpay.site` |
| `KPAY_WEBHOOK_SECRET` | Secret HMAC pour `X-KPAY-Signature` |

Frontend (`.env`) :

```env
VITE_KPAY_ENABLED=true
VITE_KPAY_PAYOUT_ENABLED=true
```

## Edge Functions

| Function | Rôle |
| --- | --- |
| `kpay-create-payment` | Init GATEWAY + `gatewayUrl` |
| `kpay-verify-payment` | Vérifie le statut au retour client |
| `kpay-create-payout` | Admin : approuve + withdraw Mobile Money |
| `kpay-webhook` | `payment.*` + `payout.*` |

Webhook URL (sandbox et live — l’env est choisi par le préfixe des clés) :

```text
https://dkmbtwczuheyyxvuypml.supabase.co/functions/v1/kpay-webhook
```

Dans le dashboard KPay, configurer les URLs dépôts / retraits (ou l’URL générique) vers cette endpoint.

## Sandbox — déploiement

```bash
npx supabase secrets set KPAY_API_KEY="kpay_test_..." KPAY_SECRET_KEY="sk_test_..." KPAY_WEBHOOK_SECRET="..." --project-ref dkmbtwczuheyyxvuypml

npx supabase functions deploy kpay-create-payment kpay-verify-payment kpay-create-payout kpay-webhook --no-verify-jwt --project-ref dkmbtwczuheyyxvuypml
```

Appliquer la migration :

```bash
npx supabase db push --project-ref dkmbtwczuheyyxvuypml
```

## Tests sandbox

Numéros RD Congo (payout) :

| MSISDN | Résultat |
| --- | --- |
| `243813456789` | COMPLETED |
| `243813456089` | FAILED (RECIPIENT_NOT_FOUND) |
| `243813456129` | SUBMITTED (polling) |

Numéros Cameroun (deposit GATEWAY — via page KPay) : utiliser les numéros de test du dashboard / doc (`237653456789` = COMPLETED).

Vérifier l’environnement :

```bash
curl -s https://admin.kpay.site/api/v1/payments/me \
  -H "X-API-Key: $KPAY_API_KEY" \
  -H "X-Secret-Key: $KPAY_SECRET_KEY"
# → "environment": "TEST"
```

## Passage live

1. KYC validé sur KPay
2. Remplacer les secrets par `kpay_live_` / `sk_live_`
3. Garder la même URL webhook
4. Tester un petit montant réel

## Flux

1. Client → `/pay/:linkId` → `kpay-create-payment` → redirect `gatewayUrl`
2. Retour → `/pay/:linkId?kpay=success` → `kpay-verify-payment` (+ webhook `payment.completed`)
3. Admin retraits → **Approuver et payer** → `kpay-create-payout` → webhook `payout.completed`

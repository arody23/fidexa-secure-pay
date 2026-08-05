# API KPay — référence FidexaPay

GeniusPay a été remplacé par **KPay**.

- Doc d’intégration FidexaPay : [`docs/KPAY_SETUP.md`](docs/KPAY_SETUP.md)
- Contexte API complet (sandbox, providers, webhooks) : voir le fichier `kpay-context-node.md` fourni par KPay
- OpenAPI live : `GET https://admin.kpay.site/api/docs/public-json`
- Base URL : `https://admin.kpay.site`
- Auth : `X-API-Key` + `X-Secret-Key`
- Sandbox : clés `kpay_test_` / `sk_test_`
- Live : clés `kpay_live_` / `sk_live_` (après KYC)

## Endpoints utilisés par FidexaPay

| Opération | Méthode | Chemin |
| --- | --- | --- |
| Encaissement GATEWAY | POST | `/api/v1/payments/init` |
| Statut paiement | GET | `/api/v1/payments/:id` |
| Retrait (payout) | POST | `/api/v1/payments/withdraw` |
| Statut retrait | GET | `/api/v1/payments/withdraw/:id` |
| Solde wallet | GET | `/api/v1/payments/balance` |
| Infos application | GET | `/api/v1/payments/me` |

Webhooks : header `X-KPAY-Signature` (HMAC-SHA256 du body brut). Events : `payment.completed|failed|cancelled`, `payout.completed|failed|cancelled`.

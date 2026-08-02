# FidexaPay — Notification Service

Service Node.js centralisé pour WhatsApp (`whatsapp-web.js`), OTP d’accès commande, et templates admin.

## Démarrage

```bash
cd notification-service
cp .env.example .env
# Remplir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SERVICE_SECRET
npm install
npm run dev
```

Au premier lancement, **scannez le QR** WhatsApp affiché dans le terminal (Appareils connectés).

## Secrets Supabase Edge

```text
NOTIFICATION_SERVICE_URL=https://votre-hote:3099
NOTIFICATION_SERVICE_SECRET=<même valeur que SERVICE_SECRET>
APP_PUBLIC_URL=https://fidexapay.com
```

En local, le service doit être joignable depuis les Edge Functions (tunnel ngrok / déployé).

## Déploiement Railway (recommandé)

`notification-service` **est** le backend WhatsApp. Ne pas en créer un second.
WhatsApp Web + Chromium est fragile en local Windows → Railway H24 est le bon chemin.

1. Railway → New Project → Deploy from GitHub → repo `fidexa-secure-pay`
2. **Obligatoire** Settings → **Root Directory** = `notification-service`  
   (sinon Railway build le frontend Vite avec Bun → erreur `frozen-lockfile`)
3. Settings → Build → **Builder = Dockerfile** (pas Railpack / pas Bun)
4. Ajouter un **Volume** monté sur `/data` (session QR persistante)
4. Variables :

```text
# Ne pas définir PORT : Railway l’injecte automatiquement.
SERVICE_SECRET=<secret long aléatoire>
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WHATSAPP_ENABLED=true
WWEBJS_AUTH_PATH=/data/.wwebjs_auth
APP_PUBLIC_URL=https://fidexapay.com
OTP_TTL_MINUTES=15
ORDER_SESSION_DAYS=7
```

5. Secrets Supabase Edge (même `SERVICE_SECRET`) :

```text
NOTIFICATION_SERVICE_URL=https://<ton-service>.up.railway.app
NOTIFICATION_SERVICE_SECRET=<même que SERVICE_SECRET>
```

6. Admin Fidexa → WhatsApp → scanner le QR une fois. La session reste sur le volume `/data`.

## Fiabilité de livraison

- Les routes paiement et OTP créent désormais des jobs persistants dans
  `notification_jobs`; elles ne bloquent jamais sur Chromium/WhatsApp.
- Le worker Railway traite un job à la fois, avec lease Postgres, idempotence et
  retries bornés. Un redeploy récupère les jobs dont la lease a expiré.
- `GET /health` vérifie Express; `GET /ready` vérifie aussi la queue et l’état
  WhatsApp. Utilisez `/ready` pour l’alerte opérationnelle, pas seulement `/health`.
- N’utilisez jamais le même `WWEBJS_AUTH_PATH` sur Windows et Railway. Tous les
  dossiers `.wwebjs_auth*` sont locaux, secrets et exclus de Git.

## API principale

```http
POST /v1/notify
X-Service-Secret: ...
{ "eventType": "payment.completed", "recipientPhone": "2438...", "variables": { ... } }

POST /v1/events/payment.completed
{ "recipientPhone": "...", "clientPhone": "...", "paymentLinkId": "...", "linkId": "...", "issueOrderOtp": true, "variables": {} }

POST /v1/otp/issue | /v1/otp/verify | /v1/otp/validate-session
```

Aucun texte de message n’est codé en dur : tout vient de `notification_templates`.

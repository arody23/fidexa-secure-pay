# FidexaPay — Passage en production & Live PayPal

## Réponse courte : faut-il mettre le site en prod avant le Live ?

**Oui.** PayPal Live exige :

- une **URL publique HTTPS** (ex. `https://fidexapay.com`) pour les pages de paiement ;
- un **webhook** enregistré sur cette URL / Supabase ;
- des **clés Live** (pas sandbox) côté frontend + Supabase Edge Functions.

Le sandbox peut tourner en local ; le **Live, non**.

---

## Phase 1 — Branding & build (fait / en cours)

- [x] Nom affiché : **FidexaPay** (titre, meta, textes UI)
- [x] `APP_NAME = 'FidexaPay'` dans `src/config.ts`
- [ ] Logo PNG mis à jour si le visuel contient encore « FIDEXA Secure Pay »
- [ ] Build prod : `npm run build` → dossier `dist/`

---

## Phase 2 — Hébergement frontend (prod)

Choisir une plateforme (Vercel, Netlify, Cloudflare Pages, Lovable Publish…).

### Variables d'environnement **production**

| Variable | Valeur prod |
|----------|-------------|
| `VITE_SUPABASE_URL` | `https://dkmbtwczuheyyxvuypml.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé anon Supabase |
| `VITE_PAYPAL_ENABLED` | `true` |
| `VITE_PAYPAL_CLIENT_ID` | **Client ID Live** PayPal |
| `VITE_PAYPAL_ENV` | `live` |
| `VITE_MONEYFUSION_ENABLED` | `false` |

### Domaine

1. Acheter / configurer le domaine (ex. `fidexapay.com`)
2. Pointer le DNS vers l'hébergeur
3. Activer HTTPS (automatique sur Vercel/Netlify)

### Supabase Auth (si connexion prestataire)

Dans **Supabase → Authentication → URL Configuration** :

- **Site URL** : `https://votre-domaine.com`
- **Redirect URLs** : `https://votre-domaine.com/**`

---

## Phase 3 — PayPal Live

### Côté PayPal Developer

1. [developer.paypal.com](https://developer.paypal.com) → basculer **Live** (pas Sandbox)
2. Créer ou activer l'app **FidexaPay Live**
3. Récupérer **Client ID** + **Secret Live**
4. Compte **Business** vérifié (KYC PayPal)
5. Activer **Advanced Card Processing** si vous acceptez Visa/Mastercard sans compte PayPal

### Webhook Live

URL (identique au sandbox, Supabase ne change pas) :

```
https://dkmbtwczuheyyxvuypml.supabase.co/functions/v1/paypal-webhook
```

Événements : `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

Copier le **Webhook ID Live** (différent du sandbox).

### Secrets Supabase Edge Functions

```powershell
npx supabase secrets set `
  PAYPAL_CLIENT_ID="CLIENT_ID_LIVE" `
  PAYPAL_CLIENT_SECRET="SECRET_LIVE" `
  PAYPAL_ENV=live `
  PAYPAL_WEBHOOK_ID="WEBHOOK_ID_LIVE" `
  --project-ref dkmbtwczuheyyxvuypml
```

Redéployer les fonctions :

```powershell
npx supabase functions deploy paypal-create-order paypal-capture-order paypal-webhook --project-ref dkmbtwczuheyyxvuypml
```

### Vérification

```powershell
.\scripts\verify-paypal-setup.ps1
```

(Avec variables Live, pas sandbox.)

---

## Phase 4 — Forfaits (commission)

**Déjà en place côté code :**

| Forfait | Commission |
|---------|------------|
| Basique | 15 % |
| Essentiel | 6 % |
| Standard | 4 % |
| Premium | 0 % |

La RPC `get_provider_commission_rate` lit `users.subscription_plan`.

**À finaliser avant Live :**

- [ ] Vérifier que chaque prestataire a un `subscription_plan` en base (`basic` par défaut)
- [ ] Page **Abonnements** : paiement réel du forfait payant (Essentiel / Standard / Premium) — aujourd'hui le changement de plan est surtout manuel en base
- [ ] Option : Stripe ou PayPal Subscription pour facturer les forfaits mensuels

---

## Phase 5 — Retraits prestataires

**Déjà en place :**

- Page **Retrait** : Mobile Money, virement bancaire
- KYC obligatoire (`kyc_status = verified`)
- Historique dans `transactions`

**À finaliser avant Live :**

- [ ] Process admin : traiter les demandes de retrait (24–48 h annoncées)
- [ ] Vérifier les opérateurs Mobile Money pour la RDC / pays cibles (`countriesData.ts`)
- [ ] Compte bancaire / wallet FidexaPay pour recevoir les fonds PayPal, puis payer les prestataires
- [ ] Option : intégration payout automatique (API opérateur ou virement batch)

---

## Phase 6 — Checklist sécurité & conformité

- [ ] KYC prestataires opérationnel (upload + validation admin)
- [ ] Politique de confidentialité & CGU sur le site
- [ ] Email support (ex. `support@fidexapay.com`)
- [ ] Rotation des secrets exposés pendant les tests (token Supabase, secrets PayPal)
- [ ] Cron Supabase pour `process_auto_escrow_releases()` (libération auto 72 h)

---

## Ordre recommandé

```
1. Branding FidexaPay          ✅
2. Déployer le site en prod    ← prochaine étape
3. Configurer domaine + Auth Supabase
4. Passer PayPal en Live (secrets + webhook)
5. Test paiement réel faible montant
6. Finaliser forfaits + retraits admin
7. Ouverture publique
```

---

## Ce dont j'ai besoin de toi pour la prod

1. **Nom de domaine** souhaité (ex. `fidexapay.com`)
2. **Hébergeur** préféré (Vercel, Netlify, Lovable, autre)
3. **Clés PayPal Live** (Client ID — le Secret reste dans Supabase uniquement)
4. **Pays cible** principal pour Mobile Money (RDC, CI, SN…)

Une fois le domaine et l'hébergeur choisis, on peut configurer le déploiement et basculer PayPal en Live.

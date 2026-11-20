# Plans FidexaPay

Source de vérité applicative : [`src/lib/plans.ts`](../src/lib/plans.ts).  
Migration DB : [`supabase/migrations/20261120_plans_subscriptions.sql`](../supabase/migrations/20261120_plans_subscriptions.sql).

## Plans

| Plan | Prix | Commission | Liens actifs | Validité lien | Max TX (USD) |
|------|------|------------|--------------|---------------|--------------|
| **Basique** (`basique`) | 0 $/mois | **9 %** | 5 | 7 j | 500 |
| **Essentiel** (`essentiel`) | 29 $/mois · 290 $/an | **6 %** | 25 | 30 j | 3 000 |
| **Premium** (`premium`) | 69 $/mois · 690 $/an | **4 %** | Illimité | 90 j | 15 000 |

UI : libellés « Basique / Essentiel / Premium ». DB : IDs FR `basique|essentiel|premium`.

## Règles commission

- Commission stockée en **pourcentage entier** (9 = 9 %), comme le SQL `amount * rate / 100`.
- À la création d’un lien (prompt suivant) : figer `commission_rate` + `plan_at_creation`.
- **Liens déjà ouverts** avant migrate : `commission_rate` forcé à **15 %** — inchangé à la libération escrow.
- **Nouveaux** liens après migrate : taux du plan (Basique **9 %**).
- `release_escrow_for_order` utilise `COALESCE(payment_links.commission_rate, get_provider_commission_rate(...))`.

## Colonnes prestataire (`users`)

| Colonne | Rôle |
|---------|------|
| `plan` | `basique` \| `essentiel` \| `premium` (défaut `basique`) |
| `plan_billing_cycle` | `monthly` \| `yearly` \| null |
| `plan_expires_at` | Fin de période payante |
| `plan_grace_until` | Grâce après expiration |
| `override_max_transaction_usd` | Plafond admin post-KYC (prioritaire sur le plan) |
| `commission_rate` | Taux courant du prestataire (fallback si pas de snapshot lien) |

`subscription_plan` / `subscription_type` restent synchronisés avec `plan` pour rétrocompat.

## Table `subscriptions` (historique)

Étend la table legacy déjà en prod (`provider_id`, `plan_name`, …) avec :

`user_id`, `plan`, `cycle`, `amount_usd`, `status`, `payment_ref`, `paid_at`, `period_start`, `period_end`, `source` (`direct|deducted_from_earnings`).

`user_id` est rétrofillé depuis `provider_id`. Lecture RLS : le prestataire voit ses lignes. Écriture : service role (Edge Functions).

## Colonnes lien (`payment_links`)

| Colonne | Rôle |
|---------|------|
| `commission_rate` | Snapshot à la création |
| `plan_at_creation` | Plan figé |
| `client_fee_rate` / `client_fee_amount` | Frais client (défaut 0 — Basique 0 $ inchangé) |
| `payment_method` | Historique libre ; cibles `mobile_money` \| `card` |

## Phase 2 (champs présents, UI incomplète)

- `maxMilestones` > 1, `teamMembers` > 1 — helpers `assertMilestonesAllowed` / `assertTeamMembersAllowed` dans `plans.ts`.

## TODO

- [ ] Brancher création de lien : limites actifs, validité, plafond, snapshot commission/plan.
- [ ] UI tarifs 3 colonnes + checkout Essentiel/Premium.
- [ ] Fee client si produit l’active (colonnes déjà là, taux 0).
- [ ] Carte Visa/MC KPay : interface + TODO API (ne pas inventer les champs KPay).

## Appliquer la migration

```bash
npx supabase db push --project-ref dkmbtwczuheyyxvuypml
# ou
npm run db:migrate
```

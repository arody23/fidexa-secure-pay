# PWA & Web Push — FidexaPay



## Icône application (écran d'accueil)



Placez vos PNG dans `public/assets/icons/` :



| Fichier | Taille | Usage |

|---------|--------|-------|

| `icon-192.png` | 192×192 | Android, Chrome |

| `icon-512.png` | 512×512 | Android splash, install |

| `apple-touch-icon.png` | 180×180 | iOS « Sur l'écran d'accueil » |



Vous pouvez les générer depuis `public/assets/logo/Logo.png` avec [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) ou Figma.



---



## Popup d'installation



- S'affiche **une fois par session** (2,5 s après ouverture) si l'app n'est pas déjà installée.

- « Plus tard » permanent : effacez `localStorage.fidexapay_pwa_prompt_dismissed` dans F12 pour retester.

- En **dev** (`npm run dev`), le service worker PWA est activé — testez aussi avec `npm run build && npm run preview`.



---



## Clés VAPID (Web Push)



### 1. Générer les clés



```bash

npx web-push generate-vapid-keys

```



### 2. Variables d'environnement



**.env** (frontend) :

```

VITE_VAPID_PUBLIC_KEY=BPxxxxxxxx...

```



**Supabase Edge Functions** (secrets) :

```

VAPID_PUBLIC_KEY=BPxxxxxxxx...

VAPID_PRIVATE_KEY=xxxxxxxx...

VAPID_SUBJECT=mailto:contact@fidexapay.com

```



### 3. Migration base



Appliquez `supabase/migrations/20260729_push_subscriptions.sql` (table `push_subscriptions`).



### 4. Test push (Node)



```javascript

import webpush from 'web-push';

webpush.setVapidDetails('mailto:contact@fidexapay.com', PUBLIC_KEY, PRIVATE_KEY);

webpush.sendNotification(subscription, JSON.stringify({

  title: 'FidexaPay',

  body: 'Nouveau paiement reçu !',

  url: '/dashboard/notifications',

}));

```



---



## Phase 2 — Envoi automatique



Edge Function `send-web-push` appelée quand une ligne est insérée dans `notifications` (trigger Postgres ou appel depuis le code existant).



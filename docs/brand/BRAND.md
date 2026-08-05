# FidexaPay — Brand System (Premium)

> Lecture design : fintech escrow B2B/B2C Afrique, langage **Stripe / Vercel** (plat, géométrique, respirant), ADN couleur **navy + menthe** conservé.

## Promesse

| | |
|---|---|
| **Nom** | FidexaPay |
| **Métaphore** | Cœur protégé — vault / escrow (fonds tenus jusqu’à livraison) |
| **Tagline** | Payer et livrer en toute sérénité. |
| **Ligne courte** | Trust before delivery. |
| **Audience** | Prestataires & clients Mobile Money (Afrique) |
| **Ton** | Calme, précis, digne de confiance — jamais « startup flashy » |

## Planches (références visuelles)

- [fidexapay-brandkit-overview.png](./fidexapay-brandkit-overview.png) — système 3×3
- [fidexapay-brandkit-system.png](./fidexapay-brandkit-system.png) — deck 2×3
- [fidexapay-logo-system.png](./fidexapay-logo-system.png) — lockups + clear space

## Logo

### Direction (évolution, pas rupture)

| Garder | Élever (niveau Stripe/Vercel) |
|---|---|
| Blason + cadenas (protection) | Plat, 2D, géométrie nette |
| Menthe en accent (arc / highlight) | Un seul accent, jamais dégradé 3D |
| Wordmark « FidexaPay » | Sans géométrique premium, tracking serré |
| Lockup horizontal | Clear space, monochrome, icône app |

### Interdits logo

- Biseaux / gloss / faux 3D
- Violet « AI glow », néons, ombres lourdes
- Clipart cadenas générique non géométrique
- Déformation, rotation libre, outlines colorés aléatoires

### Clear space

Minimum = hauteur du mark (`X`). Ne jamais coller le logo au bord d’un cadre.

### Variantes

1. **Couleur** — navy + menthe sur fond clair → `/assets/logo/lockup.png`
2. **Monochrome ink** — `#0B1220` sur paper
3. **Inverse** — blanc + menthe sur navy / charcoal → `/assets/logo/lockup-inverse.png`
4. **Mark seul** — `/assets/logo/mark.png`
5. **App icon** — carré radius 22%, fond navy, mark centré, accent menthe

### Fichiers raster (projet)

| Fichier | Usage |
|---------|--------|
| `public/assets/logo/lockup.png` | Nav + sections claires |
| `public/assets/logo/lockup-inverse.png` | Hero + CTA dark |
| `public/assets/logo/mark.png` | Icône seule (`wordmark={false}`) |

## Couleurs (ADN actuel, calibré premium)

| Token | Hex | HSL (proche actuel) | Usage |
|---|---|---|---|
| `navy` | `#1A3A5C` | `213 58% 23%` | Primary light, wordmark, surfaces dark |
| `navy-ink` | `#0B1220` | `213 58% 8%` | Texte fort, dark canvas |
| `mint` | `#2BB673` | `152 62% 44%` | Accent unique, CTA dark, succès |
| `mint-soft` | `#E8F8F0` | `152 62% 94%` | Chips, accents light |
| `paper` | `#F5F7FA` | `220 33% 98%` | Fond light |
| `white` | `#FFFFFF` | — | Cards |
| `coral` | `#E85A4F` | `5 76% 60%` | Erreurs / destructive uniquement |
| `muted` | `#6B7280` | — | Meta, secondary text |

### Règles

- **Un accent** : la menthe porte le système (comme le noir chez Vercel).  
- Pas de dégradé navy→mint sur de grandes surfaces marketing (garder pour états subtils seulement).  
- Dark mode : fond `navy-ink`, primary interactive = `mint`, texte `paper`.

## Typographie

| Rôle | Police cible | Remplace |
|---|---|---|
| Display / UI | **Geist Variable** | Inter |
| Body | Geist Variable | Lato |
| Montants / meta | **Geist Mono Variable** | — |
| Option éditoriale hero | Geist tracking-tight (plus de Georgia) | — |

### Échelle (réf. produit)

- Hero H1 : `clamp(2.75rem, 5vw, 4.5rem)`, max **2–3 lignes**, `tracking-tight`
- Section H2 : `1.75–2.5rem`
- Body : `1rem / 1.6`
- Meta / chips : `0.75rem`, `tracking-wide`, uppercase rare

### Interdits type

Inter, Roboto, Open Sans, Arial comme display. Pas de murs de texte hero > 3 lignes.

## UI / produit (goût Vercel–Stripe)

| Paramètre | Valeur |
|---|---|
| Radius | `8–12px` composants ; `16–20px` grandes surfaces |
| Borders | Hairline `rgba(0,0,0,0.08)` / `white/10` dark |
| Shadows | Quasi nulles ou ultra-diffuses (`0 1px 2px rgba(0,0,0,0.04)`) |
| Icons | Phosphor Light / Radix — un seul stroke ; éviter Lucide par défaut |
| Motion | Spring / `cubic-bezier(0.32, 0.72, 0, 1)` — pas de linear cheap |
| Densité | Spacieuse (`py-24+` sections marketing) |

### Composants signature

- CTA primary light : navy fill, blanc  
- CTA primary dark : mint fill, blanc  
- Chip statut : `Escrow` / `Mobile Money` / `Verified` — fond mint-soft, texte mint-dark  
- Pas de cards hero ; cards seulement pour interaction

## Voix & copy

**Oui** : clair, concret, français soigné — escrow, séquestre, livraison, Mobile Money.  
**Non** : « Elevate », « Seamless », « Next-Gen », « Unleash », buzzword AI.

Exemples :

- « Les fonds restent séquestrés jusqu’à validation. »
- « Le client paie. Vous livrez. FidexaPay libère. »

## Tokens CSS (cible)

```css
:root {
  --fidexa-navy: 213 58% 23%;
  --fidexa-mint: 152 62% 44%;
  --fidexa-paper: 220 33% 98%;
  --fidexa-ink: 213 58% 8%;
  --fidexa-coral: 5 76% 60%;
  --font-display: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --radius: 0.75rem;
}
```

## Roadmap d’implémentation

1. **Logo plat** — redessiner le mark (SVG) selon planches ; remplacer `/assets/logo/Logo.png`
2. **Fonts** — Geist (ou équivalent) à la place d’Inter/Lato
3. **Landing** — hero full-bleed navy, moins de chips/stats dans le 1er viewport, CTA groupé
4. **App shell** — hairlines, mint comme seul accent interactif dark
5. **Favicon / PWA** — icône app navy + mark plat

## Anti-slop (rappel)

Pas de purple mesh, pas de 3 feature cards égales par défaut, pas d’Inter, pas de glow néon, pas d’emoji décoratifs dans l’UI produit.

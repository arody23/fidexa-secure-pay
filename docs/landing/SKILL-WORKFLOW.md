# Landing FidexaPay — Skill workflow

Ce document installe dans le repo la même démarche que les skills Cursor utilisateur.

## Skills référencés (machine locale)

| Skill | Rôle |
|-------|------|
| `imagegen-frontend-web` | Étape 1 — 1 PNG / section |
| `design-taste-frontend` | Étape 3 — anti-slop, pre-flight |
| `redesign-existing-projects` | Étape 3 — audit + évolution ciblée |
| `docs/brand/BRAND.md` | Tokens, logo, voix |

Règle Cursor projet : `.cursor/rules/landing-refonte.mdc` (appliquée sur les fichiers landing).

## Ordre obligatoire

```
imagegen (8 maquettes)
    → EXTRACTION.md (spec par section)
        → composants Landing*Section.tsx (fidèles aux PNG)
            → pre-flight design-taste
```

## Assets brand

| Fichier | Usage |
|---------|--------|
| `public/assets/logo/lockup.png` | Logo horizontal fond clair |
| `public/assets/logo/lockup-inverse.png` | Logo horizontal fond dark |
| `public/assets/logo/mark.png` | Mark seul |
| `public/assets/landing-ref/landing-0*.png` | Référence visuelle par section |
| `public/assets/brand/africa-coverage.svg` | Carte couverture (base SVG) |

## Section 4 — critères d'acceptation carte

Référence : `landing-04-coverage.png`

1. Continent gris bleuté (`#D4DEE8` environ)
2. Mali, Burkina, CI, Togo, Bénin, Congo, RD Congo remplis **navy** `#1A3A5C`
3. Point mint `#2BB673` + glow sur chaque pays
4. Pill active centrée sous la carte
5. Sync avec la liste cliquable à gauche

## Ne jamais shipper

- Badges deck « Section X of 8 » en UI live
- Logo recomposé mark SVG + texte si lockup raster disponible
- Carte = blob + cercles verts sans pays navy

import { useEffect } from 'react';
import { APP_PUBLIC_URL, SITE } from '@/config/site';

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** SEO dynamique pour les pages publiques FidexaPay */
export default function Seo({
  title,
  description = SITE.description,
  path = '/',
  image = `${APP_PUBLIC_URL}/assets/icons/icon-512.png`,
  type = 'website',
  noIndex = false,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${SITE.name}`
      : `${SITE.name} — ${SITE.tagline}`;
    const url = `${APP_PUBLIC_URL}${path.startsWith('/') ? path : `/${path}`}`;

    document.title = fullTitle;
    document.documentElement.lang = 'fr';

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('name', 'keywords', [
      'FidexaPay',
      'paiement Mobile Money',
      'escrow Afrique',
      'paiement sécurisé freelance',
      'Orange Money',
      'MTN MoMo',
      'Airtel Money',
      'Wave',
      'séquestre paiement',
      'prestataire Afrique',
    ].join(', '));
    upsertMeta('name', 'author', SITE.name);
    upsertMeta('name', 'geo.region', 'CD');
    upsertMeta('name', 'geo.placename', 'Kinshasa');

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:locale', 'fr_FR');
    upsertMeta('property', 'og:site_name', SITE.name);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    upsertLink('canonical', url);
  }, [title, description, path, image, type, noIndex]);

  return null;
}

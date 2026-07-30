import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function CookiePolicy() {
  return (
    <LegalPageLayout title="Politique cookies">
      <p>{SITE.name} utilise des cookies pour assurer le fonctionnement du site et, avec votre consentement, analyser l&apos;usage.</p>
      <h2>Types de cookies</h2>
      <ul>
        <li><strong>Essentiels</strong> — session, authentification, sécurité (obligatoires)</li>
        <li><strong>Analyse</strong> — mesure d&apos;audience (optionnels)</li>
        <li><strong>Marketing</strong> — personnalisation (optionnels)</li>
      </ul>
      <h2>Gestion</h2>
      <p>
        Vous pouvez modifier vos préférences via la bannière cookies ou les paramètres de votre navigateur.
        Refuser les cookies non essentiels n&apos;empêche pas l&apos;utilisation du service.
      </p>
    </LegalPageLayout>
  );
}

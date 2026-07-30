import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Politique de confidentialité">
      <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
      <p>
        {SITE.name} (« nous ») s&apos;engage à protéger vos données personnelles conformément aux réglementations
        applicables en matière de protection des données.
      </p>
      <h2>Données collectées</h2>
      <ul>
        <li>Identité : nom, email, téléphone, pays</li>
        <li>Documents KYC (pièce d&apos;identité) pour les prestataires</li>
        <li>Données de transaction : montants, statuts de commande, historique escrow</li>
        <li>Données techniques : logs, adresse IP, cookies essentiels</li>
      </ul>
      <h2>Finalités</h2>
      <ul>
        <li>Fourniture du service de paiement séquestré</li>
        <li>Vérification d&apos;identité (KYC) et lutte contre la fraude</li>
        <li>Support client et notifications transactionnelles</li>
        <li>Amélioration du service (avec consentement cookies analytics)</li>
      </ul>
      <h2>Partage des données</h2>
      <p>
        Nous partageons les données strictement nécessaires avec nos prestataires de paiement (ex. GeniusPay) pour
        l&apos;exécution des transactions. Nous ne vendons pas vos données.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en contactant{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
      <h2>Contact</h2>
      <p>{SITE.address} · {SITE.phone} · {SITE.email}</p>
    </LegalPageLayout>
  );
}

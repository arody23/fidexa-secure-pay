import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Conditions d'utilisation">
      <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
      <p>
        En utilisant {SITE.name}, vous acceptez les présentes conditions. {SITE.name} est une plateforme d&apos;escrow
        facilitant les paiements entre prestataires et clients via Mobile Money.
      </p>
      <h2>Prestataires</h2>
      <ul>
        <li>Vous êtes responsable de l&apos;exactitude de vos informations et de votre KYC</li>
        <li>Commission plan Basique : {SITE.commissionBasic} % sur les transactions validées</li>
        <li>Les retraits sont soumis à vérification et délais de traitement</li>
      </ul>
      <h2>Clients</h2>
      <ul>
        <li>Le paiement est séquestré jusqu&apos;à validation de la livraison</li>
        <li>En cas de litige, contactez le support avant validation</li>
      </ul>
      <h2>Limitation de responsabilité</h2>
      <p>
        {SITE.name} agit comme intermédiaire technique. Nous ne sommes pas partie au contrat commercial entre prestataire
        et client final.
      </p>
      <h2>Contact</h2>
      <p>{SITE.supportEmail}</p>
    </LegalPageLayout>
  );
}

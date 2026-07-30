import { Link } from 'react-router-dom';
import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation (CGU)">
      <p>
        <strong>Dernière mise à jour :</strong> Juillet 2026
      </p>
      <p>
        En utilisant {SITE.name}, vous acceptez les présentes Conditions Générales d&apos;Utilisation. {SITE.name} est
        une plateforme de paiement sécurisé et de séquestration (Escrow) facilitant les transactions entre vendeurs /
        prestataires et acheteurs / clients, notamment via Mobile Money.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU régissent l&apos;accès et l&apos;utilisation de la plateforme {SITE.name}, de ses services de
        liens de paiement, de séquestration des fonds, de suivi de commande et de support.
      </p>

      <h2>2. Acceptation</h2>
      <p>
        L&apos;utilisation de la plateforme implique l&apos;acceptation des présentes CGU ainsi que des politiques
        associées :{' '}
        <Link to={SITE.legal.privacy}>Politique de Confidentialité</Link>,{' '}
        <Link to={SITE.legal.escrow}>Politique de Paiement Sécurisé et de Séquestration</Link>,{' '}
        <Link to={SITE.legal.refund}>Politique de Remboursement</Link>,{' '}
        <Link to={SITE.legal.disputes}>Politique de Gestion des Litiges</Link>, et{' '}
        <Link to={SITE.legal.kycAml}>Politique KYC/AML et Activités Interdites</Link>.
      </p>

      <h2>3. Comptes utilisateurs</h2>
      <ul>
        <li>Vous êtes responsable de l&apos;exactitude de vos informations et de la sécurité de votre compte.</li>
        <li>Les prestataires peuvent être soumis à une vérification d&apos;identité (KYC) avant certains retraits.</li>
        <li>FidexaPay peut suspendre ou fermer un compte en cas de non-respect des présentes conditions.</li>
      </ul>

      <h2>4. Prestataires / vendeurs</h2>
      <ul>
        <li>Vous êtes responsable de l&apos;exactitude de vos offres, descriptions et délais.</li>
        <li>
          Commission du plan Basique : {SITE.commissionBasic} % sur les transactions validées, sauf autre plan indiqué.
        </li>
        <li>Les retraits sont soumis à vérification, KYC le cas échéant, et délais de traitement.</li>
      </ul>

      <h2>5. Acheteurs / clients</h2>
      <ul>
        <li>Le paiement peut être séquestré jusqu&apos;à validation de la livraison ou de l&apos;exécution.</li>
        <li>Vous devez vérifier les informations affichées avant de payer.</li>
        <li>En cas de désaccord, vous pouvez ouvrir un litige selon la Politique de Gestion des Litiges.</li>
      </ul>

      <h2>6. Paiement sécurisé et escrow</h2>
      <p>
        Le fonctionnement détaillé du paiement sécurisé et de la séquestration est décrit dans la{' '}
        <Link to={SITE.legal.escrow}>Politique de Paiement Sécurisé et de Séquestration (Escrow)</Link>.
      </p>

      <h2>7. Activités interdites</h2>
      <p>
        Il est interdit d&apos;utiliser FidexaPay pour des activités illégales ou listées dans la{' '}
        <Link to={SITE.legal.kycAml}>Politique KYC/AML et Activités Interdites</Link>.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        {SITE.name} agit comme intermédiaire technique et tiers de confiance pour la séquestration. Nous ne sommes pas
        partie au contrat commercial entre prestataire et client final concernant la qualité ou la conformité des biens
        ou services.
      </p>

      <h2>9. Modification</h2>
      <p>
        FidexaPay peut modifier les présentes CGU. La version à jour est publiée sur la plateforme.
      </p>

      <h2>10. Contact</h2>
      <p>
        {SITE.supportEmail} · {SITE.address}
      </p>
    </LegalPageLayout>
  );
}

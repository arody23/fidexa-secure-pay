import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function EscrowPolicy() {
  return (
    <LegalPageLayout title="Politique de Paiement Sécurisé et de Séquestration (Escrow)">
      <p>
        <strong>Dernière mise à jour :</strong> Juillet 2026
      </p>

      <h2>1. Objet</h2>
      <p>
        La présente politique décrit le fonctionnement du paiement sécurisé et de la séquestration (Escrow) proposés par{' '}
        {SITE.name}. Elle s&apos;applique à toute transaction réalisée via la plateforme.
      </p>

      <h2>2. Rôle de FidexaPay</h2>
      <p>
        FidexaPay agit comme tiers de confiance. Les fonds payés par l&apos;acheteur sont sécurisés jusqu&apos;à la
        validation des conditions de la transaction, puis libérés au vendeur ou remboursés selon les règles applicables.
      </p>
      <p>
        FidexaPay n&apos;est pas le vendeur des biens ou services proposés et ne garantit ni leur qualité, ni leur
        conformité, ni leur disponibilité.
      </p>

      <h2>3. Paiement sécurisé</h2>
      <p>
        Le paiement est traité via le système de paiement sécurisé de FidexaPay et ses partenaires techniques. Selon la
        nature de la transaction, les fonds peuvent être placés en séquestration jusqu&apos;à validation.
      </p>

      <h2>4. Vérification avant paiement</h2>
      <p>Avant de payer, l&apos;acheteur est responsable de vérifier :</p>
      <ul>
        <li>le nom du vendeur ou du bénéficiaire ;</li>
        <li>le montant à payer ;</li>
        <li>la devise utilisée ;</li>
        <li>la description du produit ou du service ;</li>
        <li>toute information figurant sur la page de paiement.</li>
      </ul>
      <p>Une fois le paiement validé, certaines opérations ne peuvent plus être annulées automatiquement.</p>

      <h2>5. Séquestration des fonds</h2>
      <p>Pendant la période de séquestration :</p>
      <ul>
        <li>les fonds restent sécurisés ;</li>
        <li>le vendeur ne peut pas retirer les fonds concernés ;</li>
        <li>l&apos;acheteur ne peut pas récupérer automatiquement les fonds hors procédure prévue.</li>
      </ul>
      <p>
        Les fonds sont libérés au vendeur après validation de la livraison ou de l&apos;exécution du service, sauf litige
        ou décision contraire conformément aux politiques de remboursement et de gestion des litiges.
      </p>

      <h2>6. Exactitude des informations</h2>
      <p>
        L&apos;utilisateur confirme que les informations fournies lors du paiement sont exactes et qu&apos;il est
        autorisé à utiliser le moyen de paiement sélectionné. Toute utilisation frauduleuse est strictement interdite.
      </p>

      <h2>7. Paiements frauduleux et contrôles</h2>
      <p>FidexaPay peut suspendre une transaction lorsqu&apos;une activité suspecte est détectée, notamment en cas de :</p>
      <ul>
        <li>fraude présumée ;</li>
        <li>utilisation non autorisée d&apos;un moyen de paiement ;</li>
        <li>usurpation d&apos;identité ;</li>
        <li>informations inexactes ou incomplètes ;</li>
        <li>activité inhabituelle nécessitant une vérification.</li>
      </ul>

      <h2>8. Litiges et remboursements</h2>
      <p>
        En cas de désaccord, les parties peuvent ouvrir un litige conformément à la Politique de Gestion des Litiges.
        Pendant l&apos;examen, les fonds peuvent rester temporairement bloqués.
      </p>
      <p>
        Les remboursements ne sont pas automatiques et sont traités selon la Politique de Remboursement de FidexaPay.
      </p>

      <h2>9. Protection contre les abus</h2>
      <p>
        Toute tentative de fraude, de déclaration mensongère, de contestation abusive ou d&apos;utilisation illicite de
        la plateforme peut entraîner le refus de la transaction, le gel temporaire des fonds, la suspension ou la
        fermeture du compte, et le signalement aux autorités compétentes lorsque la loi l&apos;exige.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        En effectuant un paiement, vous acceptez que FidexaPay traite les informations nécessaires au traitement de votre
        transaction conformément à sa Politique de Confidentialité.
      </p>

      <h2>11. Modification</h2>
      <p>
        FidexaPay peut modifier la présente politique. La version la plus récente est publiée sur la plateforme.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question, contactez le support FidexaPay via les moyens disponibles sur la plateforme (
        {SITE.supportEmail}).
      </p>
    </LegalPageLayout>
  );
}

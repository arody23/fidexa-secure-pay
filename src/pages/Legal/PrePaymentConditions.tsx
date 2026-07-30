import { Link } from 'react-router-dom';
import { LegalPageLayout } from './LegalLayout';
import { SITE } from '@/config/site';

export default function PrePaymentConditions() {
  return (
    <LegalPageLayout title="Conditions applicables avant le paiement">
      <p>
        <strong>Dernière mise à jour :</strong> Juillet 2026
      </p>

      <h2>Avant de procéder au paiement</h2>
      <p>
        En cliquant sur <strong>« Payer maintenant »</strong> / <strong>« Payer en sécurité »</strong>, vous confirmez
        avoir lu, compris et accepté les présentes conditions ainsi que les politiques de FidexaPay.
      </p>
      <p>Vous reconnaissez notamment que :</p>

      <h3>1. Paiement sécurisé</h3>
      <p>
        Votre paiement est traité via le système de paiement sécurisé de FidexaPay. Selon la nature de la transaction, les
        fonds peuvent être placés en séquestration (Escrow) jusqu&apos;à la validation des conditions de la transaction.
      </p>

      <h3>2. Vérification des informations</h3>
      <p>Avant de payer, vous êtes responsable de vérifier :</p>
      <ul>
        <li>le nom du vendeur ou du bénéficiaire ;</li>
        <li>le montant à payer ;</li>
        <li>la devise utilisée ;</li>
        <li>la description du produit ou du service ;</li>
        <li>toute information figurant sur la page de paiement.</li>
      </ul>
      <p>Une fois le paiement validé, certaines opérations ne peuvent plus être annulées automatiquement.</p>

      <h3>3. Exactitude des informations</h3>
      <p>
        Vous confirmez que les informations fournies lors du paiement sont exactes et que vous êtes autorisé à utiliser
        le moyen de paiement sélectionné. Toute utilisation frauduleuse est strictement interdite.
      </p>

      <h3>4. Paiements frauduleux</h3>
      <p>FidexaPay peut suspendre une transaction lorsqu&apos;une activité suspecte est détectée, notamment en cas de :</p>
      <ul>
        <li>fraude présumée ;</li>
        <li>utilisation non autorisée d&apos;un moyen de paiement ;</li>
        <li>usurpation d&apos;identité ;</li>
        <li>informations inexactes ou incomplètes ;</li>
        <li>activité inhabituelle nécessitant une vérification.</li>
      </ul>

      <h3>5. Litiges</h3>
      <p>
        En cas de désaccord avec le vendeur, vous pouvez ouvrir un litige conformément à la{' '}
        <Link to={SITE.legal.disputes}>Politique de Gestion des Litiges</Link> de FidexaPay. Pendant l&apos;examen du
        dossier, les fonds peuvent rester temporairement bloqués.
      </p>

      <h3>6. Remboursements</h3>
      <p>
        Les remboursements ne sont pas automatiques. Toute demande est étudiée individuellement sur la base des preuves
        fournies par les parties. Selon les circonstances, un remboursement peut être intégral, partiel, ou refusé lorsque
        les conditions ne sont pas réunies. Les frais de traitement déjà engagés peuvent, selon le cas, être déduits du
        montant remboursé.
      </p>

      <h3>7. Responsabilité</h3>
      <p>
        FidexaPay fournit une infrastructure de paiement sécurisé et de séquestration. FidexaPay n&apos;est pas le
        vendeur des biens ou services proposés et ne garantit ni leur qualité, ni leur conformité, ni leur disponibilité.
        Chaque vendeur demeure seul responsable des produits ou services qu&apos;il propose.
      </p>

      <h3>8. Protection contre les abus</h3>
      <p>
        Toute tentative de fraude, de déclaration mensongère, de contestation abusive ou d&apos;utilisation illicite de
        la plateforme peut entraîner le refus de la transaction, le gel temporaire des fonds, la suspension ou la
        fermeture du compte, et le signalement aux autorités compétentes lorsque la loi l&apos;exige.
      </p>

      <h3>9. Données personnelles</h3>
      <p>
        En effectuant un paiement, vous acceptez que FidexaPay traite les informations nécessaires au traitement de votre
        transaction conformément à sa <Link to={SITE.legal.privacy}>Politique de Confidentialité</Link>.
      </p>

      <h3>10. Acceptation</h3>
      <p>
        En cochant la case d&apos;acceptation sur la page de paiement, vous confirmez avoir pris connaissance des
        documents listés, comprendre le fonctionnement du paiement sécurisé, accepter que les fonds puissent être
        temporairement placés en séquestration, et accepter les procédures de remboursement et de résolution des litiges
        applicables à votre transaction. Sans cette acceptation, le paiement ne pourra pas être effectué.
      </p>
    </LegalPageLayout>
  );
}

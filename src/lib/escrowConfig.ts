/** Règles métier escrow Fidexa */

export const AUTO_RELEASE_HOURS = 72;

export const COMMISSION_BY_PLAN: Record<string, number> = {
  basic: 15,
  essential: 6,
  standard: 4,
  premium: 0,
};

export const ORDER_STEPS = [
  { key: 'paid', label: 'Payée', description: 'Paiement sécurisé en escrow' },
  { key: 'started', label: 'En cours', description: 'Le prestataire a commencé' },
  { key: 'completed', label: 'Terminée', description: 'Travail livré, en attente de validation' },
  { key: 'validated', label: 'Validée', description: 'Fonds libérés au prestataire' },
] as const;

export function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: -1,
    paid: 0,
    started: 1,
    completed: 2,
    validated: 3,
    cancelled: -1,
    disputed: -1,
  };
  return map[status] ?? -1;
}

/** Fonds encore bloqués au bénéfice potentiel du prestataire (hors litige/annulation/remboursement). */
export function isActivelyInEscrow(link: {
  is_paid?: boolean | null;
  escrow_released?: boolean | null;
  refunded?: boolean | null;
  order_status?: string | null;
  status?: string | null;
}): boolean {
  if (!link.is_paid) return false;
  if (link.escrow_released) return false;
  if (link.refunded) return false;
  const orderStatus = String(link.order_status || '').toLowerCase();
  const status = String(link.status || '').toLowerCase();
  if (['cancelled', 'validated', 'refunded'].includes(orderStatus)) return false;
  if (status === 'cancelled') return false;
  // Litige : hors escrow « prestataire » (fonds gelés côté admin, pas un solde prestataire)
  if (orderStatus === 'disputed' || orderStatus === 'in_dispute') return false;
  return true;
}

export function escrowStatusLabel(link: {
  is_paid?: boolean | null;
  escrow_released?: boolean | null;
  refunded?: boolean | null;
  order_status?: string | null;
  status?: string | null;
}): string {
  if (!link.is_paid) return 'Ouvert';
  if (link.refunded) return 'Remboursé';
  const orderStatus = String(link.order_status || '').toLowerCase();
  if (orderStatus === 'disputed' || orderStatus === 'in_dispute') return 'Litige';
  if (orderStatus === 'cancelled' || String(link.status || '').toLowerCase() === 'cancelled') {
    return 'Annulé';
  }
  if (link.escrow_released || orderStatus === 'validated') return 'Libéré';
  return 'Escrow';
}

export function getAutoReleaseCountdown(autoReleaseAt?: string | null): string | null {
  if (!autoReleaseAt) return null;
  const target = new Date(autoReleaseAt).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 'Libération imminente';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h restantes`;
  }
  return `${hours}h ${minutes}min restantes`;
}

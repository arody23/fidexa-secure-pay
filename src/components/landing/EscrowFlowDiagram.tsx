import {
  CheckCircle2,
  Link2,
  MessageCircle,
  Shield,
  Smartphone,
  Unlock,
  Wallet,
} from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'Vous créez un lien',
    detail:
      'Montant, description et délai de livraison. Vous envoyez le lien au client (WhatsApp, SMS, e-mail).',
    icon: Link2,
    actor: 'Prestataire',
  },
  {
    n: '02',
    title: 'Le client paie en Mobile Money',
    detail:
      'Sans créer de compte. Il confirme via USSD sur son téléphone (Orange, MTN, Airtel…). Le paiement est immédiat.',
    icon: Smartphone,
    actor: 'Client',
  },
  {
    n: '03',
    title: 'Les fonds sont séquestrés',
    detail:
      'L’argent est bloqué chez l’agrégateur agréé (pas sur FidexaPay). Personne ne peut le retirer tant que la mission n’est pas validée.',
    icon: Shield,
    actor: 'Escrow',
  },
  {
    n: '04',
    title: 'Vous livrez, le client suit',
    detail:
      'Le client reçoit un accès WhatsApp pour suivre le statut. Vous marquez la mission comme livrée quand le travail est prêt.',
    icon: MessageCircle,
    actor: 'Les deux',
  },
  {
    n: '05',
    title: 'Validation → libération',
    detail:
      'Le client confirme la livraison. La commission FidexaPay est prélevée, le reste part sur votre solde, prêt au retrait Mobile Money.',
    icon: Unlock,
    actor: 'Client',
  },
] as const;

/** Flux escrow détaillé — timeline unique, lisible sur mobile et desktop */
export function EscrowFlowDiagram() {
  return (
    <div className="mt-10">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
          Du lien de paiement au retrait
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#5c7188] sm:text-base">
          Cinq étapes claires. Les fonds restent protégés jusqu’à ce que le client valide la livraison —
          ou ouvre un litige.
        </p>
      </div>

      <ol className="relative mx-auto mt-12 max-w-2xl">
        <div
          className="pointer-events-none absolute left-[1.35rem] top-3 bottom-3 w-px bg-gradient-to-b from-[#2bb673] via-[#0b3b78]/35 to-transparent sm:left-[1.6rem]"
          aria-hidden
        />

        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.n} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5 sm:pb-10">
              <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2bb673] bg-white text-[#0b2f63] shadow-sm sm:h-12 sm:w-12">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <article className="min-w-0 flex-1 rounded-2xl border border-[#e2eaf3] bg-[#F5F7FA] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#178c52]">
                    Étape {step.n}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#0b3b78] ring-1 ring-[#d7e3f0]">
                    {step.actor}
                  </span>
                </div>
                <h4 className="mt-2 text-base font-semibold text-[#0b2f63] sm:text-lg">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-[#5c7188]">{step.detail}</p>
              </article>
            </li>
          );
        })}
      </ol>

      <div className="mx-auto mt-2 flex max-w-2xl flex-col gap-3 rounded-2xl border border-[#2bb673]/25 bg-[#eef9f3] p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2bb673] text-white">
          <Wallet className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0b2f63]">Et en cas de problème ?</p>
          <p className="mt-1 text-sm leading-relaxed text-[#3d566f]">
            Avant validation, le client peut ouvrir un litige. Les fonds restent bloqués jusqu’à la
            décision FidexaPay. Après validation, vous retirez vers votre Mobile Money (KYC requis).
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#178c52]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Traçable de bout en bout
          </p>
        </div>
      </div>
    </div>
  );
}

import { ArrowRight, Link2, ShieldCheck, Smartphone } from 'lucide-react';

function PhoneMockup({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[min(280px,78vw)] rounded-[2.1rem] border-[7px] border-[#102946] bg-[#102946] p-[3px] shadow-[0_28px_70px_rgba(11,47,99,.22)] sm:w-[300px] sm:rounded-[2.35rem] sm:border-[8px] ${className}`}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[10px] z-20 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-[#102946]/90"
        aria-hidden
      />
      <div className="overflow-hidden rounded-[1.65rem] bg-[#f6f9fd] sm:rounded-[1.85rem]">
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

/** Remplace les faux screenshots client — parcours textuel clair */
const CLIENT_FLOW = [
  {
    title: 'Ouvre votre lien',
    text: 'Aucun compte à créer. Le client voit le montant et la mission.',
  },
  {
    title: 'Paie en Mobile Money',
    text: 'USSD sur son téléphone. Les fonds partent en escrow tout de suite.',
  },
  {
    title: 'Suit et valide',
    text: 'Code WhatsApp pour le suivi. Il confirme la livraison — vous êtes payé.',
  },
] as const;

export function LandingProductJourneySection() {
  return (
    <section id="product-journey" className="overflow-x-clip bg-[#eef5ff] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#178c52]">Encaissez sans stress</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            FidexaPay protège chaque mission, du devis au paiement.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#526d87] sm:text-lg">
            Créez un lien, faites payer votre client en Mobile Money, et ne libérez les fonds
            qu&apos;une fois le travail validé.
          </p>
        </div>

        <div className="mt-12 sm:mt-16">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-sm font-semibold text-[#0b2f63]">Votre activité, sous contrôle</p>
            <p className="mt-1 text-xs text-[#6b7f93]">Soldes, commandes et retraits au même endroit</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-10 lg:flex-row lg:items-end lg:gap-14">
            <div className="flex flex-col items-center">
              <PhoneMockup
                src="/assets/landing/journey/provider-dashboard.png"
                alt="Tableau de bord FidexaPay sur mobile"
              />
              <p className="mt-4 text-center text-xs font-medium text-[#5c7188]">Tableau de bord</p>
            </div>
            <div className="flex flex-col items-center lg:-translate-y-6">
              <PhoneMockup
                src="/assets/landing/journey/provider-withdraw.png"
                alt="Retraits FidexaPay sur mobile"
              />
              <p className="mt-4 text-center text-xs font-medium text-[#5c7188]">Retraits Mobile Money</p>
            </div>
          </div>
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 flex justify-center lg:order-1">
              <PhoneMockup
                src="/assets/landing/journey/provider-create-link.png"
                alt="Création d'un lien de paiement FidexaPay"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#178c52]">Création de lien</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">
                Un lien. Une mission sécurisée.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#617a93] sm:text-base">
                Montant, délai et infos client — prêts en moins d&apos;une minute. Vous envoyez le lien
                sur WhatsApp, le reste se fait tout seul.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#3d566f]">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#178c52]" />
                  Fonds bloqués en escrow dès le paiement
                </li>
                <li className="flex items-start gap-2.5">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#178c52]" />
                  Partage instantané par message ou QR
                </li>
                <li className="flex items-start gap-2.5">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#178c52]" />
                  Pensé pour Mobile Money africain
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Client sans compte — seulement un lien */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-[#d5e4f4] bg-white sm:mt-20">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#178c52]">
                Côté client
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">
                Pas de compte à créer. Juste votre lien.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#617a93] sm:text-base">
                Votre client ouvre le lien, paie en Mobile Money, puis suit la mission.
                Aucune inscription, aucun mot de passe — la friction reste chez vous, pas chez lui.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f4f8fd] px-4 py-4">
                  <p className="text-sm font-semibold text-[#0b2f63]">Vous</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#617a93]">
                    Compte prestataire, liens, retraits, litiges.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#eef9f3] px-4 py-4">
                  <p className="text-sm font-semibold text-[#0b2f63]">Votre client</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#617a93]">
                    Un lien. Un paiement. Un suivi.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative flex items-center justify-center bg-gradient-to-br from-[#0b3b78] to-[#0b2f63] px-6 py-12 sm:px-10">
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="relative max-w-sm text-center text-white">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Link2 className="h-7 w-7" />
                </div>
                <p className="mt-5 text-xl font-semibold leading-snug sm:text-2xl">
                  fidexapay.com/pay/…
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Un seul URL à envoyer. Le client paie et suit — sans jamais ouvrir un compte FidexaPay.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 sm:mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[#0b2f63]">Votre client paie. Vous êtes couvert.</p>
            <p className="mt-2 text-sm leading-relaxed text-[#617a93]">
              Trois gestes côté client — sans inscription, jusqu&apos;à la validation de livraison.
            </p>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
            {CLIENT_FLOW.map((step, i) => (
              <article
                key={step.title}
                className="rounded-2xl border border-[#d5e4f4] bg-white p-5 shadow-[0_8px_30px_rgba(11,47,99,.04)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b3b78] text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#0b2f63]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#617a93]">{step.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[#6b7f93]">
            Le détail escrow (séquestre, litige, libération) est expliqué juste après →{' '}
            <a href="#escrow" className="font-medium text-[#0b3b78] underline-offset-2 hover:underline">
              Comment ça marche
            </a>
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center rounded-2xl bg-[#0b3b78] px-5 py-8 text-center text-white sm:mt-16 sm:px-10">
          <p className="text-xl font-semibold sm:text-2xl">Vous créez le lien. Votre client suit le parcours.</p>
          <a
            href="/auth/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2bb673] px-5 py-3 text-sm font-semibold text-white"
          >
            Créer mon compte prestataire <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

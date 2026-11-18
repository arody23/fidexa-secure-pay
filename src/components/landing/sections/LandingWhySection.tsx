import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Handshake,
  Lock,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  TimerReset,
  Wallet,
} from 'lucide-react';

const REASONS = [
  {
    icon: Lock,
    title: 'Le client paie sans peur',
    desc: 'Ses fonds restent protégés jusqu’à validation de la livraison. Vous travaillez serein, il commande serein.',
  },
  {
    icon: Handshake,
    title: 'Vous livrez sans risque d’impayé',
    desc: 'Plus de “je te paie après”. L’argent est déjà sécurisé avant que vous commenciez.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Money, là où vos clients sont',
    desc: 'Orange, MTN, Airtel, Moov, Wave, M-Pesa, Vodafone Cash — selon le pays de couverture.',
  },
  {
    icon: MessageCircle,
    title: 'Un lien WhatsApp, zéro friction',
    desc: 'Vous envoyez le lien. Le client paie sans créer de compte. Le suivi se fait automatiquement.',
  },
];

const PROOF = [
  { icon: TimerReset, label: 'Mise en escrow', value: '~2 min' },
  { icon: ShieldCheck, label: 'Libération', value: 'Après validation' },
  { icon: Wallet, label: 'Retrait', value: 'Mobile Money' },
  { icon: BadgeCheck, label: 'Litiges', value: 'Arbitrage FidexaPay' },
];

/** Pourquoi FidexaPay — conversion prestataire */
export function LandingWhySection() {
  return (
    <section id="mission" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#178c52]">Pourquoi FidexaPay</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
              Parce que la confiance est le vrai frein à vos ventes
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5c7188]">
              En Afrique, beaucoup de missions s’arrêtent avant même de commencer : le client hésite à payer
              d’avance, le prestataire refuse de livrer à crédit. FidexaPay retire cette tension avec un
              escrow Mobile Money clair, traçable et professionnel.
            </p>

            <ul className="mt-10 space-y-6">
              {REASONS.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#0b3b78]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0b2f63]">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#5c7188]">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              to="/auth/signup"
              className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#0b3b78] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a3266]"
            >
              Créer mon compte prestataire <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[1.75rem] bg-[#0b2f63] p-6 text-white sm:p-8">
            <p className="text-sm font-semibold text-[#2BB673]">Ce que vous gagnez concrètement</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Moins de relances. Plus de missions signées.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              FidexaPay ne remplace pas votre talent — il sécurise la transaction pour que votre talent soit
              enfin payé.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {PROOF.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-[#2BB673]" strokeWidth={1.75} />
                  <p className="mt-3 text-lg font-semibold">{value}</p>
                  <p className="mt-1 text-[11px] text-white/55">{label}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/55">
              Compte prestataire gratuit. Commission uniquement sur les missions validées. Retrait vers votre
              Mobile Money après KYC.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

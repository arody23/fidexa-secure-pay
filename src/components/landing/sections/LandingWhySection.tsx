import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    desc: 'Ses fonds restent protégés jusqu’à validation de la livraison.',
  },
  {
    icon: Handshake,
    title: 'Vous livrez sans risque d’impayé',
    desc: 'L’argent est déjà sécurisé avant que vous commenciez.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Money, là où vos clients sont',
    desc: 'Orange, MTN, Airtel, Moov et plus — selon le pays.',
  },
  {
    icon: MessageCircle,
    title: 'Un lien WhatsApp, zéro friction',
    desc: 'Le client paie sans créer de compte. Le suivi part automatiquement.',
  },
];

const PROOF = [
  { icon: TimerReset, label: 'Mise en escrow', value: '~2 min' },
  { icon: ShieldCheck, label: 'Libération', value: 'Après validation' },
  { icon: Wallet, label: 'Retrait', value: 'Mobile Money' },
  { icon: BadgeCheck, label: 'Litiges', value: 'Arbitrage FidexaPay' },
];

/** Pourquoi FidexaPay — composition asymétrique, pas de grille de cards égales */
export function LandingWhySection() {
  return (
    <section id="mission" className="relative overflow-hidden bg-[#F5F7FA] py-20 sm:py-28">
      <div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#2bb673]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#0b3b78]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#178c52]">
            Pourquoi FidexaPay
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            La confiance débloque vos ventes
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#5c7188] sm:text-lg">
            Le client hésite à payer d’avance. Vous refusez de livrer à crédit. FidexaPay retire cette
            tension avec un escrow Mobile Money clair — et des plans qui évoluent avec votre volume.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {REASONS.map(({ icon: Icon, title, desc }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={
                i === 0
                  ? 'rounded-[1.75rem] bg-[#0b2f63] p-7 text-white lg:col-span-7'
                  : i === 1
                    ? 'rounded-[1.75rem] border border-[#e2eaf3] bg-white p-7 lg:col-span-5'
                    : i === 2
                      ? 'rounded-[1.75rem] border border-[#e2eaf3] bg-white p-7 lg:col-span-5'
                      : 'rounded-[1.75rem] bg-[#eef8f2] p-7 text-[#0b2f63] lg:col-span-7'
              }
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  i === 0
                    ? 'bg-white/10 text-[#6ce0a0]'
                    : i === 3
                      ? 'bg-[#2bb673]/20 text-[#178c52]'
                      : 'bg-[#eef5ff] text-[#0b3b78]'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className={`mt-5 text-xl font-semibold tracking-tight ${i === 0 ? 'text-white' : ''}`}>
                {title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${i === 0 ? 'text-white/70' : 'text-[#5c7188]'}`}>
                {desc}
              </p>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#d7e3f0] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-[#178c52]">Ce que vous gagnez</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">
                Moins de relances. Plus de missions signées.
              </h3>
            </div>
            <Link
              to="/auth/signup"
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#0b3b78] px-5 text-sm font-semibold text-white transition hover:bg-[#0a3266]"
            >
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PROOF.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-[#F5F7FA] px-4 py-4">
                <Icon className="h-4 w-4 text-[#0b3b78]" strokeWidth={1.75} />
                <p className="mt-3 text-lg font-semibold text-[#0b2f63]">{value}</p>
                <p className="mt-1 text-[11px] text-[#8a9bb0]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { CheckCircle, Lock, Smartphone } from 'lucide-react';
import { EscrowFlowDiagram } from '@/components/landing/EscrowFlowDiagram';
import { LandingSectionTitle } from '@/components/landing/LandingSectionTitle';

const STEPS = [
  {
    n: '1',
    title: 'Client paie',
    desc: 'Le client effectue le paiement via Mobile Money.',
    icon: Smartphone,
  },
  {
    n: '2',
    title: 'Fonds séquestrés',
    desc: 'Les fonds sont sécurisés sur FidexaPay et conservés en toute sécurité.',
    icon: Lock,
  },
  {
    n: '3',
    title: 'Livraison validée',
    desc: 'Une fois la livraison confirmée, les fonds sont libérés au vendeur.',
    icon: CheckCircle,
  },
];

/** Ref: landing-03-escrow-steps.png */
export function LandingEscrowSection() {
  return (
    <section id="escrow" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingSectionTitle className="mb-14">Comment fonctionne l&apos;escrow</LandingSectionTitle>

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-10 hidden h-px bg-[#1A3A5C]/15 md:block"
            aria-hidden
          />
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="relative flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <span className="absolute -right-0.5 -top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#2BB673] text-xs font-bold text-[#0B1220]">
                    {step.n}
                  </span>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#1A3A5C]/10 bg-[#F5F7FA]">
                    <Icon className="h-9 w-9 text-[#1A3A5C]" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-[#1A3A5C]">{step.title}</h3>
                <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-[#6B7280]">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <EscrowFlowDiagram />
      </div>
    </section>
  );
}

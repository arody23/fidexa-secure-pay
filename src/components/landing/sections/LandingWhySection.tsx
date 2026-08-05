import { CheckCircle, Clock, Lock, Smartphone, TrendingUp, Users } from 'lucide-react';

const WHY_ITEMS = [
  {
    icon: Lock,
    title: 'Fonds bloqués',
    desc: 'L’argent est sécurisé et libéré uniquement après validation.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Money local',
    desc: 'Paiements et retraits via Orange Money, MTN MoMo, etc.',
  },
  {
    icon: Users,
    title: 'Sans compte client',
    desc: 'Vos clients paient sans inscription ni création de compte.',
  },
  {
    icon: TrendingUp,
    title: 'Retraits prestataire',
    desc: 'Retirez vos fonds facilement, rapidement et à tout moment.',
  },
];

const BENTO = [
  { icon: Lock, title: 'Escrow', desc: 'Fonds bloqués et sécurisés jusqu’à validation.', accent: false },
  { icon: Clock, title: '2 min', desc: 'Mise en séquestre rapide et automatique.', accent: true },
  { icon: Smartphone, title: 'Mobile first', desc: 'Conçu pour le Mobile Money, pensé pour l’Afrique.', accent: false },
  { icon: CheckCircle, title: 'Transparent', desc: 'Suivi en temps réel et historique des transactions.', accent: false },
];

/** Ref: landing-05-why-fidexa.png */
export function LandingWhySection() {
  return (
    <section id="mission" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#1A3A5C] sm:text-4xl">
              La confiance qui débloque vos ventes
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-[#6B7280] sm:text-base">
              Le client craint de payer sans recevoir. Vous craignez de livrer sans être payé. FidexaPay
              sécurise chaque transaction via escrow et Mobile Money.
            </p>
            <ul className="mt-10 space-y-6">
              {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#2BB673]/40 bg-white">
                    <Icon className="h-5 w-5 text-[#1A3A5C]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A3A5C]">{title}</p>
                    <p className="mt-0.5 text-sm text-[#6B7280]">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {BENTO.map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-4 py-8 text-center shadow-sm"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F0]">
                  <item.icon className="h-7 w-7 text-[#1A3A5C]" strokeWidth={1.75} />
                </div>
                <h3
                  className={`text-lg font-semibold ${item.accent ? 'text-[#2BB673]' : 'text-[#1A3A5C]'}`}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Shield } from 'lucide-react';
import { MobileMoneyRow } from '@/components/brand/MobileMoneyIcons';
import { LandingSectionTitle } from '@/components/landing/LandingSectionTitle';

/** Ref: landing-02-mobile-money.png */
export function LandingMobileMoneySection() {
  return (
    <section id="payments" className="bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingSectionTitle className="mb-4">Réseaux Mobile Money</LandingSectionTitle>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-[#6B7280] sm:text-base">
          Encaissez et payez vos clients partout en Afrique grâce à notre intégration avec les
          principaux opérateurs.
        </p>
        <div className="mt-12">
          <MobileMoneyRow variant="grid" />
        </div>
        <p className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-2 text-center text-xs text-[#6B7280] sm:text-sm">
          <Shield className="h-4 w-4 shrink-0 text-[#2BB673]" strokeWidth={1.75} />
          Intégrations sécurisées et conformes aux standards des opérateurs.
        </p>
      </div>
    </section>
  );
}

import { MobileMoneyRow } from '@/components/brand/MobileMoneyIcons';
import { LandingSectionTitle } from '@/components/landing/LandingSectionTitle';

/** Ref: landing-02-mobile-money.png */
export function LandingMobileMoneySection() {
  return (
    <section id="payments" className="overflow-hidden bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingSectionTitle className="mb-4">Réseaux Mobile Money</LandingSectionTitle>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-[#6B7280] sm:text-base">
          Encaissez dans les pays couverts par FidexaPay grâce aux opérateurs Mobile Money locaux.
        </p>
      </div>
      <div className="mt-12">
        <MobileMoneyRow variant="marquee" />
      </div>
    </section>
  );
}

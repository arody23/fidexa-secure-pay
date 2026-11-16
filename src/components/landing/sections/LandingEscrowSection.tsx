import { EscrowFlowDiagram } from '@/components/landing/EscrowFlowDiagram';
import { LandingSectionTitle } from '@/components/landing/LandingSectionTitle';

/** Ref: landing-03-escrow-steps.png */
export function LandingEscrowSection() {
  return (
    <section id="escrow" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingSectionTitle className="mb-10 sm:mb-14">
          Comment fonctionne l&apos;escrow
        </LandingSectionTitle>
        <EscrowFlowDiagram />
      </div>
    </section>
  );
}

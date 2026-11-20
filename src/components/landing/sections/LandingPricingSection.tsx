import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlanCarousel } from '@/components/plans/PlanCarousel';
import { PLANS } from '@/lib/plans';

/** Pricing — carrousel 3 plans (style Meta One) */
export function LandingPricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-[#071a35] py-24 text-white sm:py-32 md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(43,182,115,0.22), transparent 55%), linear-gradient(160deg, #071a35 0%, #0b3b78 48%, #082848 100%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Des plans adaptés à votre volume
          </h2>
          <p className="mt-4 text-base text-white/70 sm:text-lg">
            Commencez gratuitement sur Basique ({PLANS.basique.commission}&nbsp;% de commission), puis
            passez à Essentiel ou Premium pour baisser la commission et débloquer plus de liens.
          </p>
        </div>

        <div className="mx-auto mt-12 w-full max-w-md overflow-x-clip sm:max-w-lg">
          <PlanCarousel
            variant="dark"
            initialPlanId="basique"
            renderAction={(plan) =>
              plan.id === 'basique' ? (
                <>
                  <Button
                    className="h-12 w-full rounded-xl bg-[#2bb673] text-base font-semibold text-white hover:bg-[#24a367]"
                    size="lg"
                    asChild
                  >
                    <Link to="/auth/signup">Commencer gratuitement</Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-white/45">
                    Aucune carte bancaire. Paiement des plans payants en Mobile Money.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    className="h-12 w-full rounded-xl bg-[#2bb673] text-base font-semibold text-white hover:bg-[#24a367]"
                    size="lg"
                    asChild
                  >
                    <Link to="/auth/signup">Choisir {plan.name}</Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-white/45">
                    Abonnement mensuel ou annuel, payé en Mobile Money (USSD).
                  </p>
                </>
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

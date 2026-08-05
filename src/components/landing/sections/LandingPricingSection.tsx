import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MVP_SUBSCRIPTION } from '@/config/site';
import { LandingSectionTitle } from '@/components/landing/LandingSectionTitle';

/** Ref: landing-07-pricing.png — commission = valeur produit réelle */
export function LandingPricingSection() {
  return (
    <section id="pricing" className="bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingSectionTitle className="mb-12">Abonnement</LandingSectionTitle>

        <div className="mx-auto max-w-md rounded-2xl border border-[#2BB673]/30 bg-white p-8 shadow-[0_0_0_1px_hsl(152_62%_44%/0.06),0_12px_40px_-12px_rgba(26,58,92,0.12)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2BB673]">Recommandé</p>
          <h3 className="mt-2 text-xl font-semibold text-[#1A3A5C]">{MVP_SUBSCRIPTION.name}</h3>
          <p className="mt-6 font-display text-5xl font-semibold tracking-tight text-[#1A3A5C]">Gratuit</p>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/[0.08]" />
            <span className="text-xs text-[#6B7280]">Commission sur transaction</span>
            <div className="h-px flex-1 bg-black/[0.08]" />
          </div>
          <div className="mb-8 flex justify-center">
            <span className="rounded-full bg-[#E8F8F0] px-6 py-2.5 font-mono text-2xl font-semibold text-[#2BB673]">
              {MVP_SUBSCRIPTION.commission} %
            </span>
          </div>

          <ul className="mb-8 divide-y divide-black/[0.06]">
            {MVP_SUBSCRIPTION.features.map((f) => (
              <li key={f} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2BB673]">
                  <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-sm text-[#1A3A5C]">{f}</span>
              </li>
            ))}
          </ul>

          <Button
            className="h-12 w-full rounded-xl bg-[#1A3A5C] text-white hover:bg-[#1A3A5C]/90"
            size="lg"
            asChild
          >
            <Link to="/auth/signup">Commencer gratuitement</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

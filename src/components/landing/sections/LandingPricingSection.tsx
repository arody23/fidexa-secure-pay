import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MVP_SUBSCRIPTION } from '@/config/site';

/** Pricing — plan style SaaS, fond bleu foncé dégradé */
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
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Un plan simple pour démarrer</h2>
          <p className="mt-4 text-base text-white/70 sm:text-lg">
            Pas d&apos;abonnement mensuel. Vous ne payez qu&apos;une commission quand une mission est validée.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6ce0a0]">
                  Plan {MVP_SUBSCRIPTION.name}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Pour prestataires</h3>
              </div>
              <span className="rounded-full bg-[#2bb673]/20 px-3 py-1 text-xs font-semibold text-[#6ce0a0]">
                Recommandé
              </span>
            </div>

            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-tight sm:text-6xl">$0</span>
              <span className="mb-2 text-sm text-white/55">USD / mois</span>
            </div>
            <p className="mt-2 text-sm text-white/65">
              Puis {MVP_SUBSCRIPTION.commission}&nbsp;% de commission sur chaque transaction validée.
            </p>

            <ul className="mt-8 space-y-3.5">
              {MVP_SUBSCRIPTION.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2bb673]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="mt-9 h-12 w-full rounded-xl bg-[#2bb673] text-base font-semibold text-white hover:bg-[#24a367]"
              size="lg"
              asChild
            >
              <Link to="/auth/signup">Commencer gratuitement</Link>
            </Button>
            <p className="mt-4 text-center text-xs text-white/45">
              Aucune carte bancaire requise pour créer votre compte.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

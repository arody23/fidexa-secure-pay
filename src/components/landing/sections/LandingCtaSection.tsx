import { Link } from 'react-router-dom';
import { ArrowRight, Headphones, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

/** Ref: landing-08-cta.png */
export function LandingCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0B1220] py-24 text-white sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 0%, hsl(152 62% 44% / 0.14), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Logo size="md" variant="white" className="mb-10 justify-center" />
        <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-tight">
          Sécurisez votre
          <br />
          prochaine vente
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm text-white/60 sm:text-base">
          Inscription gratuite · Mobile Money · Escrow · Support
        </p>
        <Button variant="hero" size="lg" className="mt-10 h-14 px-10 text-base" asChild>
          <Link to="/auth/signup">
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <div className="mt-16 border-t border-white/10 pt-8">
          <ul className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-0">
            {[
              { icon: Shield, text: 'Transactions sécurisées' },
              { icon: Lock, text: 'Vos fonds sont protégés' },
              { icon: Headphones, text: 'Support réactif 24/7' },
            ].map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className={`flex items-center gap-2 px-5 text-xs text-white/55 sm:text-sm ${
                  i > 0 ? 'sm:border-l sm:border-white/10' : ''
                }`}
              >
                <Icon className="h-4 w-4 text-[#2BB673]" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

/** Ref: landing-08-cta.png */
export function LandingCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0B1220] py-24 text-white sm:py-32 md:py-40">
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
          prochaine collaboration
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
          Créez votre compte, envoyez un lien de paiement, et laissez l&apos;escrow protéger la mission
          jusqu&apos;à validation.
        </p>
        <Button variant="hero" size="lg" className="mt-10 h-14 px-10 text-base" asChild>
          <Link to="/auth/signup">
            Créer mon compte prestataire
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { COVERED_COUNTRIES } from '@/components/brand/AfricaCoverageMap';

const ease = [0.32, 0.72, 0, 1] as const;

type Props = {
  user: boolean;
  onOpenMenu: () => void;
};

/** Ref: landing-01-hero.png */
export function LandingHeroSection({ user, onOpenMenu }: Props) {
  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden bg-[#071a35] text-white">
      <img
        src="/assets/landing/fidexapay-hero-clean.png"
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#061a38]/20" />

      <header className="relative z-10 mx-auto mt-3 flex h-14 max-w-7xl items-center justify-between rounded-2xl bg-white px-4 text-[#0b2f63] shadow-[0_10px_30px_rgba(0,0,0,.14)] sm:mt-4 sm:px-5 lg:h-16">
        <Logo size="sm" />
        <nav className="hidden items-center gap-7 text-xs font-medium text-[#526d87] lg:flex">
          <a href="#escrow" className="transition hover:text-[#0b3b78]">Comment ça marche</a>
          <a href="#payments" className="transition hover:text-[#0b3b78]">Mobile Money</a>
          <a href="#mission" className="transition hover:text-[#0b3b78]">Fonctionnalités</a>
          <a href="#coverage" className="transition hover:text-[#0b3b78]">Pays couverts</a>
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <Button size="sm" className="bg-[#0b3b78] text-white hover:bg-[#082e60]" asChild>
              <Link to="/dashboard">Mon espace</Link>
            </Button>
          ) : (
            <>
              <Link
                to="/auth/signin"
                className="hidden text-sm font-medium text-[#526d87] transition hover:text-[#0b3b78] sm:inline"
              >
                Connexion
              </Link>
              <Button size="sm" className="hidden bg-[#0b3b78] text-white hover:bg-[#082e60] sm:inline-flex" asChild>
                <Link to="/auth/signup">Compte prestataire</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#0b3b78] hover:bg-[#f1f6fc] sm:hidden"
            aria-label="Menu"
            onClick={onOpenMenu}
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-6xl items-center justify-center px-4 pb-20 pt-6 text-center sm:px-6 sm:pb-24 lg:min-h-[calc(100dvh-6rem)] lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex max-w-5xl flex-col items-center"
        >
          <img
            src="/assets/logo/fidexapay-mark.png"
            alt=""
            className="mb-4 h-36 w-36 object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,.3)] sm:h-48 sm:w-48"
          />
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#071a35]/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
            <ShieldCheck className="h-4 w-4 text-[#64db9a]" />
            Paiement sécurisé par escrow
          </div>
          <h1 className="max-w-5xl text-[clamp(2.65rem,6vw,5.75rem)] font-semibold leading-[.98] tracking-[-0.055em]">
            Payez et livrez en toute sérénité.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            FidexaPay conserve les fonds jusqu&apos;à la validation de la livraison, pour protéger
            chaque client et chaque prestataire.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="h-12 bg-[#2bb673] px-7 text-white hover:bg-[#24a367]" asChild>
              <Link to="/auth/signup">
                Créer mon compte prestataire
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 border-white/50 bg-white/10 px-7 text-white hover:bg-white hover:text-[#0b2f63]" asChild>
              <a href="#escrow">Découvrir le fonctionnement</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-white/75">
            <span>Disponible dans</span>
            <div className="flex -space-x-1.5" aria-label="Pays actuellement couverts">
              {COVERED_COUNTRIES.map((country) => (
                <span
                  key={country.id}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white"
                  title={country.name}
                >
                  <img src={country.flagSrc} alt="" className="h-full w-full object-cover" />
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

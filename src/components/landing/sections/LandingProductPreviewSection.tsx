import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LandingProductPreviewSection() {
  return (
    <section className="bg-[#eef5ff] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1354b8]">
            <ShieldCheck className="h-5 w-5 text-[#2bb673]" />
            Un espace conçu pour agir
          </div>
          <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#0b2f63] sm:text-5xl">
            Gardez chaque opération sous contrôle.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#43607d] sm:text-lg">
            Suivez les fonds en escrow, les commandes actives, les validations client et vos retraits au même endroit.
          </p>
          <Button className="mt-8 bg-[#0b3b78] text-white hover:bg-[#082e60]" asChild>
            <Link to="/auth/signup">
              Créer mon espace prestataire
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#cbdcf2] bg-white p-2 shadow-[0_22px_60px_rgba(11,47,99,.14)] sm:p-3">
          <img
            src="/assets/landing/fidexapay-dashboard-preview.png"
            alt="Aperçu du tableau de bord prestataire FidexaPay"
            className="w-full rounded-xl object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

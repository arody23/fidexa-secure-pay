import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import SiteFooter from '@/components/layout/SiteFooter';
import { LandingCtaSection } from '@/components/landing/sections/LandingCtaSection';
import { LandingCoverageSection } from '@/components/landing/sections/LandingCoverageSection';
import { LandingEscrowSection } from '@/components/landing/sections/LandingEscrowSection';
import { LandingHeroSection } from '@/components/landing/sections/LandingHeroSection';
import { LandingMobileMoneySection } from '@/components/landing/sections/LandingMobileMoneySection';
import { LandingProductJourneySection } from '@/components/landing/sections/LandingProductJourneySection';
import { LandingPricingSection } from '@/components/landing/sections/LandingPricingSection';
import {
  LandingTestimonialsSection,
  type TestimonialItem,
} from '@/components/landing/sections/LandingTestimonialsSection';
import { LandingWhySection } from '@/components/landing/sections/LandingWhySection';
import { LandingUseCasesSection } from '@/components/landing/sections/LandingUseCasesSection';
import { MVP_SUBSCRIPTION } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FICTIONAL_TESTIMONIALS: TestimonialItem[] = [
  {
    key: 'f1',
    name: 'Awa K.',
    subtitle: 'Graphiste · Abidjan',
    text: 'Avant, je livrais sans être payée. Avec FidexaPay, le client paie d’abord et je suis tranquille.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f2',
    name: 'Jean-Paul M.',
    subtitle: 'Développeur · Kinshasa',
    text: 'Le Mobile Money + escrow m’a fait gagner des clients qui avaient peur de payer en avance.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f3',
    name: 'Fatou D.',
    subtitle: 'Styliste · Cotonou',
    text: 'Simple à expliquer au client : il paie, je livre, les fonds sont libérés. Zéro stress.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f4',
    name: 'Ibrahim S.',
    subtitle: 'Formateur · Bamako',
    text: 'J’ai arrêté les litiges interminables. FidexaPay joue vraiment le rôle de tiers de confiance.',
    rating: 4,
    avatar: null,
  },
  {
    key: 'f5',
    name: 'Grace N.',
    subtitle: 'Consultante · Lomé',
    text: 'Créer un lien prend deux minutes. Mes clients paient sans créer de compte. Parfait.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f6',
    name: 'Kevin O.',
    subtitle: 'Photographe · Ouagadougou',
    text: 'La séquestration des fonds a changé ma façon de travailler. Je recommande à tous les freelances.',
    rating: 5,
    avatar: null,
  },
];

const FAQ = [
  {
    q: 'Le client doit-il créer un compte ?',
    a: 'Non. Il ouvre le lien, paie via Mobile Money, et suit la commande. Aucune inscription obligatoire côté acheteur.',
  },
  {
    q: 'Quand le prestataire reçoit-il l’argent ?',
    a: 'Après validation de la livraison (ou selon la procédure litige). Les fonds restent séquestrés jusque-là.',
  },
  {
    q: 'Quels moyens de paiement ?',
    a: 'Mobile Money via KPay (Orange, MTN, Airtel…). La conversion devises est gérée au checkout.',
  },
  {
    q: 'Combien coûte FidexaPay ?',
    a: `Inscription gratuite. Commission ${MVP_SUBSCRIPTION.commission} % sur les transactions validées (plan Basique).`,
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/[0.06] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="pr-2 text-sm font-medium text-[#1A3A5C] sm:text-base">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6B7280] transition duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-[#6B7280]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Landing — orchestrateur des 8 sections (image-to-code + design-taste + redesign).
 * Spec: docs/landing/EXTRACTION.md · refs: public/assets/landing-ref/
 */
const Landing = () => {
  const { user } = useAuth();
  const [approvedReviews, setApprovedReviews] = useState<TestimonialItem[]>([]);
  const [activeCountry, setActiveCountry] = useState(0);
  const [testimonialPage, setTestimonialPage] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: reviews } = await supabase.rpc('get_approved_testimonials');
      if (Array.isArray(reviews)) {
        setApprovedReviews(
          reviews.map((t) => ({
            key: t.id,
            name: t.full_name || 'Prestataire',
            subtitle: t.country || 'FidexaPay',
            text: t.content,
            rating: t.rating,
            avatar: t.avatar_url,
          }))
        );
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNav]);

  const testimonials = [...FICTIONAL_TESTIMONIALS, ...approvedReviews];
  const testimonialPageCount = Math.max(1, Math.ceil(testimonials.length / 3));

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#F5F7FA] font-body antialiased">
      <LandingHeroSection user={!!user} onOpenMenu={() => setMobileNav(true)} />

      {mobileNav && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/95 sm:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm font-semibold text-white">Menu</span>
            <button type="button" className="text-white" onClick={() => setMobileNav(false)}>
              Fermer
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4">
            {[
              { href: '#payments', label: 'Mobile Money' },
              { href: '#escrow', label: 'Escrow' },
              { href: '#coverage', label: 'Couverture' },
              { href: '#mission', label: 'Pourquoi' },
              { href: '#pricing', label: 'Tarifs' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileNav(false)}
                className="rounded-lg px-3 py-3 text-white hover:bg-white/10"
              >
                {l.label}
              </a>
            ))}
            {!user && (
              <>
                <Link to="/auth/signin" className="px-3 py-3 text-white/70" onClick={() => setMobileNav(false)}>
                  Connexion
                </Link>
                <Link to="/auth/signup" className="px-3 py-3 text-[#2BB673]" onClick={() => setMobileNav(false)}>
                  Commencer
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      <LandingProductJourneySection />
      <LandingMobileMoneySection />
      <LandingEscrowSection />
      <LandingCoverageSection activeCountry={activeCountry} onSelectCountry={setActiveCountry} />
      <LandingWhySection />
      <LandingUseCasesSection />
      <LandingTestimonialsSection
        items={testimonials}
        page={testimonialPage}
        pageCount={testimonialPageCount}
        onPageChange={setTestimonialPage}
      />
      <LandingPricingSection />

      <section id="faq" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-[#1A3A5C] sm:text-3xl">
            Questions fréquentes
          </h2>
          <p className="mb-8 mt-2 text-center text-sm text-[#6B7280]">Avant de démarrer</p>
          <div className="rounded-2xl border border-black/[0.06] bg-white px-4 shadow-sm sm:px-5">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <LandingCtaSection />
      <SiteFooter />
    </div>
  );
};

export default Landing;

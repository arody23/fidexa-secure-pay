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
import { LandingUseCasesSection } from '@/components/landing/sections/LandingUseCasesSection';
import { LandingWhySection } from '@/components/landing/sections/LandingWhySection';
import Seo from '@/components/Seo';
import { MVP_SUBSCRIPTION, SITE } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FICTIONAL_TESTIMONIALS: TestimonialItem[] = [
  {
    key: 'f1',
    name: 'Awa K.',
    subtitle: 'Graphiste · Abidjan',
    text: 'Honnêtement, j’en avais marre de relancer. Maintenant le client paie d’abord, je travaille, et je suis payée après validation. Simple.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f2',
    name: 'Jean-Paul M.',
    subtitle: 'Développeur · Kinshasa',
    text: 'Des clients me disaient “je te paie après”. Avec l’escrow, ils acceptent de payer sans peur — et moi aussi je livre plus sereinement.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f3',
    name: 'Fatou D.',
    subtitle: 'Community manager · Cotonou',
    text: 'J’envoie juste le lien WhatsApp. Pas besoin qu’ils s’inscrivent. En 2 minutes c’est réglé.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f4',
    name: 'Ibrahim S.',
    subtitle: 'Formateur · Bamako',
    text: 'Avant, un élève pouvait disparaître après 2 séances. Là, le paiement est déjà sécurisé. Ça change tout.',
    rating: 4,
    avatar: null,
  },
  {
    key: 'f5',
    name: 'Grace N.',
    subtitle: 'Consultante · Lomé',
    text: 'Ce que j’aime : je vois où en est la mission, le client aussi. Moins de messages “tu as reçu ?”.',
    rating: 5,
    avatar: null,
  },
  {
    key: 'f6',
    name: 'Kevin O.',
    subtitle: 'Photographe · Ouagadougou',
    text: 'Je l’utilise pour les shoots événementiels. Le client confirme, les fonds arrivent. Pas de mauvaise surprise.',
    rating: 5,
    avatar: null,
  },
];

const FAQ = [
  {
    q: 'Le client doit-il créer un compte ?',
    a: 'Non. Il ouvre votre lien, paie en Mobile Money, puis suit la mission. Aucune inscription côté client.',
  },
  {
    q: 'Quand est-ce que je reçois mon argent ?',
    a: 'Après validation de la livraison par le client. Jusque-là, les fonds restent séquestrés sur FidexaPay.',
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Les principaux réseaux Mobile Money (Orange, MTN, Airtel, etc.) selon le pays. La conversion de devise est gérée au paiement.',
  },
  {
    q: 'Combien coûte FidexaPay ?',
    a: `Le compte prestataire est gratuit. Commission ${MVP_SUBSCRIPTION.commission} % uniquement sur les transactions validées (plan Basique).`,
  },
  {
    q: 'Où est conservé l’argent en séquestre ?',
    a: 'Les fonds sont détenus par PawaPay, notre agrégateur de paiement agréé. FidexaPay ne conserve aucune somme : la plateforme orchestre uniquement le flux escrow, la validation et la libération vers le prestataire.',
  },
  {
    q: 'Que se passe-t-il en cas de litige ?',
    a: 'Le client peut signaler un problème avant la libération des fonds. Notre équipe suit une procédure claire pour trancher et protéger les deux parties.',
  },
  {
    q: 'Puis-je retirer mes fonds en Mobile Money ?',
    a: 'Oui. Une fois les fonds libérés sur votre solde, vous demandez un retrait vers votre numéro Mobile Money, sous réserve de vérification KYC.',
  },
  {
    q: 'FidexaPay convient-il aux freelances et agences ?',
    a: 'Oui. La plateforme est conçue pour les prestataires de service : design, développement, formation, conseil, création de contenu, etc.',
  },
  {
    q: 'Dans quels pays FidexaPay est-il disponible ?',
    a: 'Actuellement dans plusieurs pays d’Afrique de l’Ouest et d’Afrique centrale. La liste évolue au fur et à mesure des intégrations opérateurs.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[#0b3b78]"
      >
        <span className="pr-2 text-base font-medium text-[#0b2f63] sm:text-lg">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#6B7280] transition duration-300 ${open ? 'rotate-180 text-[#0b3b78]' : ''}`}
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
            <p className="max-w-2xl pb-5 text-sm leading-relaxed text-[#526d87] sm:text-base">{a}</p>
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
            subtitle:
              [t.profession, t.country].filter(Boolean).join(' · ') ||
              (t.author_type === 'client' ? 'Client FidexaPay' : 'Prestataire FidexaPay'),
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
      <Seo
        title="Paiements Mobile Money sécurisés par escrow"
        description={SITE.description}
        path="/"
      />
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
              { href: '#use-cases', label: 'Cas d’usage' },
              { href: '#pricing', label: 'Tarifs' },
              { href: '#faq', label: 'FAQ' },
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
      <LandingWhySection />
      <LandingEscrowSection />
      <LandingCoverageSection activeCountry={activeCountry} onSelectCountry={setActiveCountry} />
      <LandingUseCasesSection />
      <LandingTestimonialsSection
        items={testimonials}
        page={testimonialPage}
        pageCount={testimonialPageCount}
        onPageChange={setTestimonialPage}
      />
      <LandingPricingSection />

      <section id="faq" className="bg-[#F5F7FA] py-24 sm:py-32 md:py-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
              Questions fréquentes
            </h2>
            <p className="mt-4 text-base text-[#526d87]">
              Tout ce qu&apos;un prestataire veut savoir avant d&apos;envoyer son premier lien.
            </p>
          </div>
          <div className="mt-12 divide-y divide-[#d7e3f0] border-y border-[#d7e3f0]">
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
